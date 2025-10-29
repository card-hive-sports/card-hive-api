import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly ecsSecurityGroup: ec2.SecurityGroup;
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly dbSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC with public and private subnets
    // Interview Point: "I designed a VPC with isolated subnets for different security zones"
    this.vpc = new ec2.Vpc(this, 'CardHiveVpc', {
      vpcName: 'card-hive-vpc',
      maxAzs: 2, // High availability across 2 availability zones
      natGateways: 1, // Cost optimization: 1 NAT gateway (production would use 2)

      // IP addressing
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),

      // Subnet configuration
      subnetConfiguration: [
        {
          // Public subnets for Load Balancer
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          // Private subnets for ECS tasks
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          // Isolated subnets for database (no internet access)
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],

      // Enable DNS
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // Tag all VPC resources for cost tracking
    cdk.Tags.of(this.vpc).add('Project', 'CardHive');
    cdk.Tags.of(this.vpc).add('Environment', 'Production');

    // Security Group for Application Load Balancer
    // Interview Point: "Only allow HTTPS traffic from the internet"
    this.albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: 'card-hive-alb-sg',
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: true,
    });

    // Allow HTTPS from anywhere (production traffic)
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS from internet'
    );

    // Allow HTTP (will redirect to HTTPS)
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP from internet (redirects to HTTPS)'
    );

    // Security Group for ECS Tasks
    // Interview Point: "I implemented least privilege - only ALB can reach the application"
    this.ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: 'card-hive-ecs-sg',
      description: 'Security group for ECS tasks',
      allowAllOutbound: true, // Needs to call AWS services (Secrets Manager, etc.)
    });

    // Only allow traffic from Load Balancer
    this.ecsSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(3000),
      'Allow traffic from ALB only'
    );

    // Security Group for RDS Database
    // Interview Point: "Database is completely isolated, only ECS tasks can connect"
    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: 'card-hive-db-sg',
      description: 'Security group for RDS database',
      allowAllOutbound: false, // Database doesn't need outbound
    });

    // Only allow PostgreSQL traffic from ECS tasks
    this.dbSecurityGroup.addIngressRule(
      this.ecsSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL from ECS tasks only'
    );

    // Output VPC ID for reference
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: 'CardHiveVpcId',
    });

    new cdk.CfnOutput(this, 'VpcCidr', {
      value: this.vpc.vpcCidrBlock,
      description: 'VPC CIDR Block',
    });
  }
}
