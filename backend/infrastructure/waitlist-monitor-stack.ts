import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface WaitlistMonitorStackProps extends cdk.StackProps {
  waitlistTableName: string;
  lineApiSecretArn: string;
  userTableName: string;
  existingLambdaLayerArn?: string;
}

export class WaitlistMonitorStack extends cdk.Stack {
  public readonly monitorFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: WaitlistMonitorStackProps) {
    super(scope, id, props);

    // Lambda Layer (既存のものを使用するか新規作成)
    let lambdaLayer: lambda.ILayerVersion;
    if (props.existingLambdaLayerArn) {
      lambdaLayer = lambda.LayerVersion.fromLayerVersionArn(
        this,
        'ExistingLayer',
        props.existingLambdaLayerArn
      );
    } else {
      // 既存のLayerを使用（Layerの作成は一時的に無効化）
      throw new Error('Lambda Layer ARN is required. Create a layer first.');
    }

    // Lambda Function
    this.monitorFunction = new lambda.Function(this, 'WaitlistMonitorFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/waitlist-monitor.handler',
      code: lambda.Code.fromAsset('../dist'),
      layers: [lambdaLayer],
      environment: {
        WAITLIST_TABLE_NAME: props.waitlistTableName,
        USER_TABLE_NAME: props.userTableName,
        LINE_API_SECRET_ARN: props.lineApiSecretArn,
        USERS_TABLE_NAME: props.userTableName,
        STUDIOS_TABLE_NAME: 'feelcycle-hub-studios-dev',
        LESSONS_TABLE_NAME: 'feelcycle-hub-lessons-dev',
        USER_CREDENTIALS_SECRET_ARN: 'arn:aws:secretsmanager:ap-northeast-1:234156130688:secret:feelcycle-hub/user-credentials/dev-0U0tmB',
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      description: 'Monitor active waitlists and send notifications when seats become available',
    });

    // IAM permissions for DynamoDB access
    this.monitorFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:Query',
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Scan',
      ],
      resources: [
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${props.waitlistTableName}`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${props.waitlistTableName}/index/*`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${props.userTableName}`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${props.userTableName}/index/*`,
      ],
    }));

    // IAM permissions for Secrets Manager (LINE API credentials)
    this.monitorFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue',
      ],
      resources: [
        props.lineApiSecretArn,
        'arn:aws:secretsmanager:ap-northeast-1:234156130688:secret:feelcycle-hub/user-credentials/dev-0U0tmB'
      ],
    }));

    // EventBridge Rule - 毎分実行
    const monitoringRule = new events.Rule(this, 'WaitlistMonitoringRule', {
      description: 'Trigger waitlist monitoring every minute',
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      enabled: true,
    });

    // EventBridge Target
    monitoringRule.addTarget(new targets.LambdaFunction(this.monitorFunction, {
      event: events.RuleTargetInput.fromObject({
        source: 'eventbridge.scheduler',
        'detail-type': 'Scheduled Event',
        detail: {
          taskType: 'waitlist-monitoring',
          scheduledTime: events.Schedule.rate(cdk.Duration.minutes(1)).expressionString,
        },
      }),
    }));

    // CloudWatch Logs retention
    new cdk.CfnOutput(this, 'MonitorFunctionName', {
      value: this.monitorFunction.functionName,
      description: 'Name of the waitlist monitor Lambda function',
    });

    new cdk.CfnOutput(this, 'MonitorFunctionArn', {
      value: this.monitorFunction.functionArn,
      description: 'ARN of the waitlist monitor Lambda function',
    });

    new cdk.CfnOutput(this, 'MonitoringRuleArn', {
      value: monitoringRule.ruleArn,
      description: 'ARN of the EventBridge rule for waitlist monitoring',
    });
  }
}