#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EcsStack, RdsStack, VpcStack } from './stacks';
import * as process from 'node:process';

const app = new cdk.App();

const awsEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const appName = process.env.CDK_DEFAULT_APP_NAME || 'CardHive';

const vpcStack = new VpcStack(app, `${appName}VPCStack`, {
  appName,
  env: awsEnv,
  description: `${appName} VPC Infrastructure`,
});

const rdsStack = new RdsStack(app, `${appName}RDSStack`, {
  appName,
  env: awsEnv,
  vpc: vpcStack.vpc,
  dbSecurityGroup: vpcStack.dbSecurityGroup,
  description: `${appName} RDS PostgreSQL`,
});
rdsStack.addDependency(vpcStack);

const ecsStack = new EcsStack(app, `${appName}ECSStack`, {
  appName,
  env: awsEnv,
  vpc: vpcStack.vpc,
  albSecurityGroup: vpcStack.albSecurityGroup,
  ecsSecurityGroup: vpcStack.ecsSecurityGroup,
  dbSecret: rdsStack.dbSecret,
  dbEndpoint: rdsStack.dbInstance.dbInstanceEndpointAddress,
  dbPort: rdsStack.dbInstance.dbInstanceEndpointPort,
  description: `${appName} ECS Fargate for Auth Service`,
});
ecsStack.addDependency(vpcStack);
ecsStack.addDependency(rdsStack);

app.synth();
