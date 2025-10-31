import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface RdsStackProps extends cdk.StackProps {
  readonly appName: string;
  readonly vpc: ec2.IVpc;
  readonly dbSecurityGroup: ec2.SecurityGroup;
}

export class RdsStack extends cdk.Stack {
  public readonly dbInstance: rds.DatabaseInstance;
  public readonly dbSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: RdsStackProps) {
    super(scope, id, props);

    this.dbSecret = new secretsmanager.Secret(this, `${props.appName}DbSecret`, {
      secretName: `card-hive-db-credentials`,
      description: `${props.appName} database credentials`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'cardhive' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 32,
      },
    });

    this.dbInstance = new rds.DatabaseInstance(this, `${props.appName}PostgresInstance`, {
      instanceIdentifier: `card-hive-db`,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_14,
      }),

      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),

      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },

      securityGroups: [props.dbSecurityGroup],

      allocatedStorage: 20,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,

      credentials: rds.Credentials.fromSecret(this.dbSecret),
      databaseName: 'cardhive_dev',

      backupRetention: cdk.Duration.days(1),

      deleteAutomatedBackups: true,

      preferredBackupWindow: '03:00-04:00',
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',

      multiAz: false,

      enablePerformanceInsights: true,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,

      monitoringInterval: cdk.Duration.seconds(60),

      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,

      publiclyAccessible: false,
    });

    this.dbInstance.metricCPUUtilization().createAlarm(this, `${props.appName}DbCpuAlarm`, {
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'Database CPU utilization is too high',
    });

    this.dbInstance.metricFreeStorageSpace().createAlarm(this, `${props.appName}DbStorageAlarm`, {
      threshold: 2 * 1024 * 1024 * 1024,
      evaluationPeriods: 1,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      alarmDescription: 'Database free storage space is low',
    });

    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: this.dbInstance.dbInstanceEndpointAddress,
      description: 'Database endpoint',
      exportName: `${props.appName}DbEndpoint`,
    });

    new cdk.CfnOutput(this, 'DbPort', {
      value: this.dbInstance.dbInstanceEndpointPort,
      description: 'Database port',
      exportName: `${props.appName}DbPort`,
    });

    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: this.dbSecret.secretArn,
      description: 'Database credentials secret ARN',
      exportName: `${props.appName}DbSecretArn`,
    });

    new cdk.CfnOutput(this, 'DbSecurityGroupID', {
      value: props.dbSecurityGroup.securityGroupId,
      description: 'Database security group ID',
      exportName: `${props.appName}DbSecurityGroupID`,
    });

    cdk.Tags.of(this).add('Environment', 'Production');
    cdk.Tags.of(this).add('Project', `${props.appName}`);
  }
}
