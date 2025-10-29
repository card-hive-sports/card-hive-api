import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as guardduty from 'aws-cdk-lib/aws-guardduty';
import { Construct } from 'constructs';

import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';

export interface MonitoringStackProps extends cdk.StackProps {
  cluster: ecs.Cluster;
  service: ecs.FargateService;
  loadBalancer: elbv2.ApplicationLoadBalancer;
  database: rds.DatabaseInstance;
  emailAddress?: string; // Optional: for SNS notifications
}

export class MonitoringStack extends cdk.Stack {
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // Create SNS topic for alerts (optional)
    let alertTopic: sns.Topic | undefined;
    if (props.emailAddress) {
      alertTopic = new sns.Topic(this, 'AlertTopic', {
        topicName: 'card-hive-alerts',
        displayName: 'Card Hive Application Alerts',
      });

      // Subscribe email to topic
      alertTopic.addSubscription(
        new EmailSubscription(
          props.emailAddress
        )
      );
    }

    // CloudWatch Dashboard
    // Interview Point: "I created a unified dashboard to monitor all application metrics"
    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: 'CardHive-Monitoring',
    });

    // ECS Service Metrics
    const cpuMetric = props.service.metricCpuUtilization({
      period: cdk.Duration.minutes(5),
      statistic: 'Average',
    });

    const memoryMetric = props.service.metricMemoryUtilization({
      period: cdk.Duration.minutes(5),
      statistic: 'Average',
    });

    const desiredTaskCountMetric = new cloudwatch.Metric({
      namespace: 'AWS/ECS',
      metricName: 'DesiredTaskCount',
      dimensionsMap: {
        ClusterName: props.cluster.clusterName,
        ServiceName: props.service.serviceName,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    const runningTaskCountMetric = new cloudwatch.Metric({
      namespace: 'AWS/ECS',
      metricName: 'RunningTaskCount',
      dimensionsMap: {
        ClusterName: props.cluster.clusterName,
        ServiceName: props.service.serviceName,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    // ALB Metrics
    const targetResponseTimeMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'TargetResponseTime',
      dimensionsMap: {
        LoadBalancer: props.loadBalancer.loadBalancerFullName,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    const requestCountMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'RequestCount',
      dimensionsMap: {
        LoadBalancer: props.loadBalancer.loadBalancerFullName,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const target5xxMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'HTTPCode_Target_5XX_Count',
      dimensionsMap: {
        LoadBalancer: props.loadBalancer.loadBalancerFullName,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    // RDS Metrics
    const dbCpuMetric = props.database.metricCPUUtilization({
      period: cdk.Duration.minutes(5),
      statistic: 'Average',
    });

    const dbConnectionsMetric = props.database.metricDatabaseConnections({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    // Add widgets to dashboard
    this.dashboard.addWidgets(
      // Row 1: ECS Metrics
      new cloudwatch.GraphWidget({
        title: 'ECS CPU & Memory Utilization',
        left: [cpuMetric, memoryMetric],
        leftYAxis: {
          label: 'Percentage',
          max: 100,
        },
        width: 12,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Running Tasks',
        metrics: [
          desiredTaskCountMetric,
          runningTaskCountMetric,
        ],
        width: 6,
      }),
    );

    this.dashboard.addWidgets(
      // Row 2: ALB Metrics
      new cloudwatch.GraphWidget({
        title: 'Request Count & Response Time',
        left: [requestCountMetric],
        right: [targetResponseTimeMetric],
        leftYAxis: { label: 'Count' },
        rightYAxis: { label: 'Seconds' },
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: '5XX Errors',
        left: [target5xxMetric],
        leftYAxis: { label: 'Count' },
        width: 6,
      }),
    );

    this.dashboard.addWidgets(
      // Row 3: Database Metrics
      new cloudwatch.GraphWidget({
        title: 'Database CPU Utilization',
        left: [dbCpuMetric],
        leftYAxis: {
          label: 'Percentage',
          max: 100,
        },
        width: 9,
      }),
      new cloudwatch.GraphWidget({
        title: 'Database Connections',
        left: [dbConnectionsMetric],
        leftYAxis: { label: 'Count' },
        width: 9,
      }),
    );

    // CloudWatch Alarms
    // Interview Point: "I set up proactive alerts for critical metrics"

    // High CPU alarm
    const highCpuAlarm = new cloudwatch.Alarm(this, 'HighCpuAlarm', {
      alarmName: 'CardHive-ECS-HighCPU',
      alarmDescription: 'Alert when CPU utilization > 80%',
      metric: cpuMetric,
      threshold: 80,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // High memory alarm
    const highMemoryAlarm = new cloudwatch.Alarm(this, 'HighMemoryAlarm', {
      alarmName: 'CardHive-ECS-HighMemory',
      alarmDescription: 'Alert when memory utilization > 85%',
      metric: memoryMetric,
      threshold: 85,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // High error rate alarm
    const highErrorRateAlarm = new cloudwatch.Alarm(this, 'HighErrorRateAlarm', {
      alarmName: 'CardHive-ALB-High5xxErrors',
      alarmDescription: 'Alert when 5xx errors > 10 in 5 minutes',
      metric: target5xxMetric,
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // High response time alarm
    const highResponseTimeAlarm = new cloudwatch.Alarm(this, 'HighResponseTimeAlarm', {
      alarmName: 'CardHive-ALB-HighLatency',
      alarmDescription: 'Alert when response time > 2 seconds',
      metric: targetResponseTimeMetric,
      threshold: 2, // 2 seconds
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Database CPU alarm
    const dbHighCpuAlarm = new cloudwatch.Alarm(this, 'DatabaseHighCpuAlarm', {
      alarmName: 'CardHive-RDS-HighCPU',
      alarmDescription: 'Alert when database CPU > 80%',
      metric: dbCpuMetric,
      threshold: 80,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Add alarms to SNS topic if provided
    if (alertTopic) {
      const snsAction = new cloudwatch_actions.SnsAction(alertTopic);
      highCpuAlarm.addAlarmAction(snsAction);
      highMemoryAlarm.addAlarmAction(snsAction);
      highErrorRateAlarm.addAlarmAction(snsAction);
      highResponseTimeAlarm.addAlarmAction(snsAction);
      dbHighCpuAlarm.addAlarmAction(snsAction);
    }

    // Enable GuardDuty for threat detection
    // Interview Point: "I enabled GuardDuty for continuous security monitoring"
    const detector = new guardduty.CfnDetector(this, 'GuardDutyDetector', {
      enable: true,
      findingPublishingFrequency: 'FIFTEEN_MINUTES',
    });

    // Outputs
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    new cdk.CfnOutput(this, 'GuardDutyDetectorId', {
      value: detector.ref,
      description: 'GuardDuty Detector ID',
    });

    if (alertTopic) {
      new cdk.CfnOutput(this, 'AlertTopicArn', {
        value: alertTopic.topicArn,
        description: 'SNS Topic ARN for alerts',
      });
    }
  }
}
