import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { ContainerInsights } from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export interface EcsStackProps extends cdk.StackProps {
  readonly appName: string;
  readonly vpc: ec2.IVpc;
  readonly ecsSecurityGroup: ec2.ISecurityGroup;
  readonly albSecurityGroup: ec2.ISecurityGroup;
  readonly dbSecret: secretsmanager.ISecret;
  readonly dbEndpoint: string;
  readonly dbPort: string;
}

export class EcsStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  public readonly service: ecs.FargateService;
  public readonly alb: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    // ECS Cluster
    this.cluster = new ecs.Cluster(this, `${props.appName}AuthCluster`, {
      clusterName: `card-hive-auth`,
      vpc: props.vpc,
      containerInsightsV2: ContainerInsights.ENABLED,
    });

    // ECR Repository for auth service
    const ecrRepo = new ecr.Repository(this, `${props.appName}AuthServiceRepo`, {
      repositoryName: `card-hive/auth-service`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      imageScanOnPush: true,
      lifecycleRules: [
        {
          maxImageCount: 10,
          description: 'Keep last 10 images',
        },
      ],
    });

    // Application secrets (JWT_SECRET, etc)
    const appSecret = new secretsmanager.Secret(this, `${props.appName}AppSecret`, {
      secretName: `card-hive-app-secrets`,
      description: 'Application secrets (JWT, etc)',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          JWT_EXPIRES_IN: '15m',
          REFRESH_TOKEN_EXPIRES_IN: '7d',
        }),
        generateStringKey: 'JWT_SECRET',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 64,
      },
    });

    // Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, `${props.appName}AuthTaskDef`, {
      family: `card-hive-auth`,
      memoryLimitMiB: 512,
      cpu: 256,
    });

    // CloudWatch Logs
    const logGroup = new logs.LogGroup(this, `${props.appName}AuthServiceLogs`, {
      logGroupName: `/ecs/card-hive/auth-service`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Container Definition
    const container = taskDefinition.addContainer(`${props.appName}AuthServiceContainer`, {
      containerName: 'auth-service',
      image: ecs.ContainerImage.fromEcrRepository(ecrRepo, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'auth-service',
        logGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
        DB_HOST: props.dbEndpoint,
        DB_PORT: props.dbPort,
        DB_NAME: 'cardhive_dev',
      },
      secrets: {
        DB_USER: ecs.Secret.fromSecretsManager(props.dbSecret, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(props.dbSecret, 'password'),
        JWT_SECRET: ecs.Secret.fromSecretsManager(appSecret, 'JWT_SECRET'),
        JWT_EXPIRES_IN: ecs.Secret.fromSecretsManager(appSecret, 'JWT_EXPIRES_IN'),
        REFRESH_TOKEN_EXPIRES_IN: ecs.Secret.fromSecretsManager(appSecret, 'REFRESH_TOKEN_EXPIRES_IN'),
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000/api/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    container.addPortMappings({
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    });

    // Fargate Service
    this.service = new ecs.FargateService(this, `${props.appName}AuthService`, {
      serviceName: `card-hive-auth`,
      cluster: this.cluster,
      taskDefinition,
      desiredCount: 1, // Start with 1, scale later
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [props.ecsSecurityGroup],
      enableExecuteCommand: true, // For debugging
      circuitBreaker: {
        rollback: true,
      },
    });

    // Application Load Balancer
    this.alb = new elbv2.ApplicationLoadBalancer(this, `${props.appName}AuthServiceALB`, {
      loadBalancerName: `card-hive-auth-alb`,
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: props.albSecurityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    // ALB Target Group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, `${props.appName}AuthServiceTG`, {
      targetGroupName: `card-hive-auth-tg`,
      vpc: props.vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/api',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // Attach Fargate service to target group
    this.service.attachToApplicationTargetGroup(targetGroup);

    // HTTP Listener (port 80)
    this.alb.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.forward([targetGroup]),
    });

    // Auto Scaling
    const scaling = this.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 4,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.alb.loadBalancerDnsName,
      description: 'Load Balancer DNS Name',
      exportName: `${props.appName}LoadBalancerDNS`,
    });

    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: ecrRepo.repositoryUri,
      description: 'ECR Repository URI',
      exportName: `${props.appName}EcrRepositoryUri`,
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS Cluster Name',
      exportName: `${props.appName}ClusterName`,
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: this.service.serviceName,
      description: 'ECS Service Name',
      exportName: `${props.appName}ServiceName`,
    });

    // Tags
    cdk.Tags.of(this).add('Environment', 'Production');
    cdk.Tags.of(this).add('Project', 'CardHive');
  }
}
