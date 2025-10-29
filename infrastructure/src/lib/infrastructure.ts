#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack, DatabaseStack, EcsStack, MonitoringStack } from './stacks';

const app = new cdk.App();

// Get configuration from environment or context
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const emailAddress = process.env.ALERT_EMAIL; // Optional: for SNS notifications

// Stack 1: VPC and Security Groups
// Creates the network foundation with isolated subnets
const vpcStack = new VpcStack(app, 'CardHiveVpcStack', {
  env,
  description: 'VPC with public, private, and isolated subnets for Card Hive',
  tags: {
    Project: 'CardHive',
    Component: 'Network',
  },
});

// Stack 2: Database
// Depends on VPC for networking
const databaseStack = new DatabaseStack(app, 'CardHiveDatabaseStack', {
  env,
  vpc: vpcStack.vpc,
  dbSecurityGroup: vpcStack.dbSecurityGroup,
  description: 'RDS PostgreSQL database with encryption and Secrets Manager',
  tags: {
    Project: 'CardHive',
    Component: 'Database',
  },
});
databaseStack.addDependency(vpcStack);

// Stack 3: ECS and Load Balancer
// Depends on VPC and Database
const ecsStack = new EcsStack(app, 'CardHiveEcsStack', {
  env,
  vpc: vpcStack.vpc,
  ecsSecurityGroup: vpcStack.ecsSecurityGroup,
  albSecurityGroup: vpcStack.albSecurityGroup,
  databaseSecret: databaseStack.databaseSecret,
  description: 'ECS Fargate service with Application Load Balancer',
  tags: {
    Project: 'CardHive',
    Component: 'Compute',
  },
});
ecsStack.addDependency(vpcStack);
ecsStack.addDependency(databaseStack);

// Stack 4: Monitoring
// Depends on ECS stack for metrics
const monitoringStack = new MonitoringStack(app, 'CardHiveMonitoringStack', {
  env,
  cluster: ecsStack.cluster,
  service: ecsStack.service,
  loadBalancer: ecsStack.loadBalancer,
  database: databaseStack.database,
  emailAddress: emailAddress,
  description: 'CloudWatch monitoring, alarms, and GuardDuty',
  tags: {
    Project: 'CardHive',
    Component: 'Monitoring',
  },
});
monitoringStack.addDependency(ecsStack);

// Add tags to all stacks
cdk.Tags.of(app).add('ManagedBy', 'CDK');
cdk.Tags.of(app).add('Environment', 'Production');

app.synth();
