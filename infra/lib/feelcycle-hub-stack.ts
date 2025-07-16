import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import { Construct } from 'constructs';

export class FeelcycleHubStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Environment
    const environment = this.node.tryGetContext('environment') || 'dev';
    const isProduction = environment === 'prod';

    // DynamoDB Tables
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `feelcycle-hub-users-${environment}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: isProduction,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const reservationsTable = new dynamodb.Table(this, 'ReservationsTable', {
      tableName: `feelcycle-hub-reservations-${environment}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for efficient querying
    reservationsTable.addGlobalSecondaryIndex({
      indexName: 'DateStudioIndex',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    const lessonHistoryTable = new dynamodb.Table(this, 'LessonHistoryTable', {
      tableName: `feelcycle-hub-lesson-history-${environment}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Secrets Manager for storing user credentials
    const userCredentialsSecret = new secretsmanager.Secret(this, 'UserCredentials', {
      secretName: `feelcycle-hub/user-credentials/${environment}`,
      description: 'Encrypted FEELCYCLE user credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'placeholder',
        excludeCharacters: '"@/\\',
      },
    });

    // LINE API credentials
    const lineApiSecret = new secretsmanager.Secret(this, 'LineApiCredentials', {
      secretName: `feelcycle-hub/line-api/${environment}`,
      description: 'LINE API credentials for messaging',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          channelAccessToken: '',
          channelSecret: '',
        }),
        generateStringKey: 'placeholder',
        excludeCharacters: '"@/\\',
      },
    });

    // Lambda Layer for shared dependencies
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      layerVersionName: `feelcycle-hub-shared-${environment}`,
      code: lambda.Code.fromAsset('../backend/layers/shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      compatibleArchitectures: [lambda.Architecture.ARM_64],
      description: 'Shared dependencies for FEELCYCLE Hub',
    });

    // Main Lambda function
    const mainLambda = new lambda.Function(this, 'MainFunction', {
      functionName: `feelcycle-hub-main-${environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'handlers/main.handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      layers: [sharedLayer],
      environment: {
        USERS_TABLE_NAME: usersTable.tableName,
        RESERVATIONS_TABLE_NAME: reservationsTable.tableName,
        LESSON_HISTORY_TABLE_NAME: lessonHistoryTable.tableName,
        USER_CREDENTIALS_SECRET_ARN: userCredentialsSecret.secretArn,
        LINE_API_SECRET_ARN: lineApiSecret.secretArn,
        ENVIRONMENT: environment,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      // reservedConcurrentExecutions: isProduction ? undefined : 2, // Removed for deployment
    });

    // Grant permissions
    usersTable.grantReadWriteData(mainLambda);
    reservationsTable.grantReadWriteData(mainLambda);
    lessonHistoryTable.grantReadWriteData(mainLambda);
    userCredentialsSecret.grantRead(mainLambda);
    lineApiSecret.grantRead(mainLambda);

    // API Gateway
    const api = new apigateway.RestApi(this, 'FeelcycleHubApi', {
      restApiName: `feelcycle-hub-api-${environment}`,
      description: 'FEELCYCLE Hub API Gateway',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
      deployOptions: {
        stageName: environment,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        dataTraceEnabled: !isProduction,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
    });

    // Lambda integration
    const lambdaIntegration = new apigateway.LambdaIntegration(mainLambda, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    // API routes
    const auth = api.root.addResource('auth');
    auth.addResource('credentials').addMethod('POST', lambdaIntegration);
    
    const lineAuth = auth.addResource('line');
    lineAuth.addResource('callback').addMethod('GET', lambdaIntegration);

    api.root.addResource('watch').addMethod('POST', lambdaIntegration);
    
    const line = api.root.addResource('line');
    line.addResource('webhook').addMethod('POST', lambdaIntegration);

    const history = api.root.addResource('history');
    history.addResource('summary').addMethod('GET', lambdaIntegration);

    // EventBridge rule for periodic monitoring
    const monitoringRule = new events.Rule(this, 'MonitoringRule', {
      ruleName: `feelcycle-hub-monitoring-${environment}`,
      description: 'Trigger lesson monitoring every minute',
      schedule: events.Schedule.rate(cdk.Duration.minutes(isProduction ? 1 : 5)),
    });

    monitoringRule.addTarget(new targets.LambdaFunction(mainLambda, {
      event: events.RuleTargetInput.fromObject({
        source: 'eventbridge.monitoring',
        action: 'checkAvailability',
      }),
    }));

    // Budget alarm
    if (isProduction) {
      new budgets.CfnBudget(this, 'CostBudget', {
        budget: {
          budgetName: 'feelcycle-hub-monthly-budget',
          budgetLimit: {
            amount: 1000,
            unit: 'JPY',
          },
          timeUnit: 'MONTHLY',
          budgetType: 'COST',
        },
        notificationsWithSubscribers: [{
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 80,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [{
            subscriptionType: 'EMAIL',
            address: 'your-email@example.com', // Replace with actual email
          }],
        }],
      });
    }

    // Outputs
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: usersTable.tableName,
      description: 'DynamoDB Users table name',
    });

    new cdk.CfnOutput(this, 'UserCredentialsSecretArn', {
      value: userCredentialsSecret.secretArn,
      description: 'User credentials secret ARN',
    });
  }
}