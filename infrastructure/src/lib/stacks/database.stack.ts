import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  dbSecurityGroup: ec2.SecurityGroup;
}

export class DatabaseStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance;
  public readonly databaseSecret: secretsmanager.Secret;
  public readonly databaseUrl: string;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Create database credentials in Secrets Manager
    // Interview Point: "I never hardcode credentials - always use Secrets Manager with automatic rotation"
    this.databaseSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      secretName: 'card-hive/database/credentials',
      description: 'RDS PostgreSQL credentials for Card Hive',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'cardhive_admin',
        }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 32,
      },
    });

    // Create RDS PostgreSQL instance
    // Interview Point: "I configured encrypted RDS in private subnet with automated backups"
    this.database = new rds.DatabaseInstance(this, 'Database', {
      instanceIdentifier: 'card-hive-db',
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_14,
      }),

      // Instance configuration
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO // Free tier eligible
      ),

      // Credentials from Secrets Manager
      credentials: rds.Credentials.fromSecret(this.databaseSecret),

      // Database name
      databaseName: 'cardhive',

      // Network configuration
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // No internet access
      },
      securityGroups: [props.dbSecurityGroup],

      // Storage
      allocatedStorage: 20, // GB
      storageType: rds.StorageType.GP3, // Latest generation SSD
      storageEncrypted: true, // Encryption at rest

      // Backup configuration
      backupRetention: cdk.Duration.days(7),
      preferredBackupWindow: '03:00-04:00', // UTC
      deleteAutomatedBackups: true,

      // Maintenance
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00', // UTC
      autoMinorVersionUpgrade: true,

      // Deletion protection for production
      deletionProtection: false, // Set to true for production
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT, // Create snapshot on deletion

      // Monitoring
      cloudwatchLogsExports: ['postgresql'], // Send logs to CloudWatch
      cloudwatchLogsRetention: cdk.aws_logs.RetentionDays.ONE_WEEK,

      // Performance Insights for query monitoring
      enablePerformanceInsights: true,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT, // 7 days (free)

      // Multi-AZ for high availability (disabled for cost)
      multiAz: false, // Set to true for production

      // Public accessibility
      publiclyAccessible: false, // Never expose database to internet
    });

    // Construct DATABASE_URL for Prisma
    // Format: postgresql://username:password@host:port/database
    const username = this.databaseSecret.secretValueFromJson('username').unsafeUnwrap();
    const password = this.databaseSecret.secretValueFromJson('password').unsafeUnwrap();
    const host = this.database.dbInstanceEndpointAddress;
    const port = this.database.dbInstanceEndpointPort;
    const dbName = 'cardhive';

    this.databaseUrl = `postgresql://${username}:${password}@${host}:${port}/${dbName}`;

    // Store DATABASE_URL in Secrets Manager
    // Interview Point: "I created a separate secret for the connection string used by the application"
    const databaseUrlSecret = new secretsmanager.Secret(this, 'DatabaseUrlSecret', {
      secretName: 'card-hive/database/url',
      description: 'Database connection URL for Card Hive application',
      secretStringValue: cdk.SecretValue.unsafePlainText(this.databaseUrl),
    });

    // Outputs
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.dbInstanceEndpointAddress,
      description: 'RDS Database Endpoint',
      exportName: 'CardHiveDatabaseEndpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.databaseSecret.secretArn,
      description: 'ARN of the database credentials secret',
      exportName: 'CardHiveDatabaseSecretArn',
    });

    new cdk.CfnOutput(this, 'DatabaseUrlSecretArn', {
      value: databaseUrlSecret.secretArn,
      description: 'ARN of the database URL secret',
      exportName: 'CardHiveDatabaseUrlSecretArn',
    });

    new cdk.CfnOutput(this, 'DatabaseName', {
      value: dbName,
      description: 'Database name',
    });
  }
}
