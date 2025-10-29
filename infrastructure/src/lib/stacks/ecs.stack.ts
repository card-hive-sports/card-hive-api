import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface EcsStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  ecsSecurityGroup: ec2.SecurityGroup;
  albSecurityGroup: ec2.SecurityGroup;
  databaseSecret: secretsmanager.Secret;
}

export class EcsStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  public readonly service: ecs.FargateService;
  public readonly repository: ecr.Repository;
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    // Create ECR repository for Docker images
    // Interview Point: "I set up ECR with image scanning to detect vulnerabilities"
    this.repository = new ecr.Repository(this, 'AuthServiceRepository', {
      repositoryName: 'card-hive/auth-service',
      imageScanOnPush: true, // Automatically scan images for vulnerabilities
      imageTagMutability: ecr.TagMutability.MUTABLE,
      lifecycleRules: [
        {
          description: 'Keep only last 10 images',
          maxImageCount: 10,
          rulePriority: 1,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev/testing
    });

    // Create ECS Cluster
    // Interview Point: "I created an ECS cluster with CloudWatch Container Insights for monitoring"
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: 'card-hive-cluster',
      vpc: props.vpc,
      containerInsights: true, // Enable CloudWatch Container Insights
    });

    // Create CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, 'AuthServiceLogs', {
      logGroupName: '/ecs/card-hive/auth-service',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Task Execution Role - Used by ECS to pull images and get secrets
    // Interview Point: "I created separate IAM roles for task execution vs task runtime"
    const executionRole = new iam.Role(this, 'TaskExecutionRole', {
      roleName: 'card-hive-ecs-execution-role',
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role for ECS to pull images and access secrets',
    });

    // Allow pulling from ECR
    executionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ecr:GetAuthorizationToken',
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
      ],
      resources: ['*'],
    }));

    // Allow writing logs
    executionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: [logGroup.logGroupArn],
    }));

    // Task Role - Used by the running container
    // Interview Point: "I implemented least privilege - task only has permission to read its specific secrets"
    const taskRole = new iam.Role(this, 'TaskRole', {
      roleName: 'card-hive-ecs-task-role',
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role for the running container',
    });

    // Allow reading database secret only
    taskRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [
        props.databaseSecret.secretArn,
        `${props.databaseSecret.secretArn}-*`, // For version suffixes
      ],
    }));

    // Create Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      family: 'card-hive-auth-service',
      cpu: 256, // 0.25 vCPU
      memoryLimitMiB: 512, // 512 MB
      executionRole: executionRole,
      taskRole: taskRole,
    });

    // Retrieve JWT secret (you'll need to create this manually or add to stack)
    const jwtSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'JwtSecret',
      'card-hive/jwt/secret'
    );

    // Add container to task definition
    const container = taskDefinition.addContainer('AuthServiceContainer', {
      containerName: 'auth-service',
      image: ecs.ContainerImage.fromEcrRepository(this.repository, 'latest'),

      // Environment variables (non-sensitive)
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
        JWT_EXPIRES_IN: '24h',
        REFRESH_TOKEN_EXPIRES_IN: '7d',
      },

      // Secrets from Secrets Manager
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(
          props.databaseSecret,
          'DATABASE_URL'
        ),
        JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
      },

      // Logging
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'auth-service',
        logGroup: logGroup,
      }),

      // Health check
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000/api/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // Expose port 3000
    container.addPortMappings({
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    });

    // Create Application Load Balancer
    // Interview Point: "I configured ALB with health checks and proper security groups"
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      loadBalancerName: 'card-hive-alb',
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: props.albSecurityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    // Create Target Group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      targetGroupName: 'card-hive-tg',
      vpc: props.vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,

      // Health check configuration
      healthCheck: {
        path: '/api/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        healthyHttpCodes: '200',
      },

      // Deregistration delay
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // Add HTTP listener (will redirect to HTTPS in production)
    this.loadBalancer.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.forward([targetGroup]),
    });

    // Create ECS Fargate Service
    // Interview Point: "I configured ECS with auto-scaling and health checks"
    this.service = new ecs.FargateService(this, 'Service', {
      serviceName: 'card-hive-auth-service',
      cluster: this.cluster,
      taskDefinition: taskDefinition,

      // Desired count
      desiredCount: 2, // Run 2 tasks for high availability

      // Network configuration
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [props.ecsSecurityGroup],

      // Load balancer configuration
      assignPublicIp: false, // Private subnet doesn't need public IP

      // Health check grace period
      healthCheckGracePeriod: cdk.Duration.seconds(60),

      // Deployment configuration
      minHealthyPercent: 100, // Keep all tasks healthy during deployment
      maxHealthyPercent: 200, // Allow double capacity during deployment (blue-green)

      // Circuit breaker for failed deployments
      circuitBreaker: {
        rollback: true, // Automatically rollback on failure
      },
    });

    // Attach service to target group
    this.service.attachToApplicationTargetGroup(targetGroup);

    // Auto-scaling configuration
    // Interview Point: "I set up auto-scaling based on CPU and memory utilization"
    const scaling = this.service.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 10,
    });

    // Scale on CPU utilization
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Scale on memory utilization
    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.loadBalancer.loadBalancerDnsName,
      description: 'Application Load Balancer DNS',
      exportName: 'CardHiveLoadBalancerDNS',
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: this.service.serviceName,
      description: 'ECS Service Name',
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS Cluster Name',
      exportName: 'CardHiveClusterName',
    });

    new cdk.CfnOutput(this, 'RepositoryUri', {
      value: this.repository.repositoryUri,
      description: 'ECR Repository URI',
      exportName: 'CardHiveRepositoryUri',
    });
  }
}
