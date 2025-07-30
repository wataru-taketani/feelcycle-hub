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

    // Add GSI for LINE user ID lookup (most critical for current error)
    usersTable.addGlobalSecondaryIndex({
      indexName: 'LineUserIndex',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
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

    // Waitlist table for cancellation waitlist feature
    const waitlistTable = new dynamodb.Table(this, 'WaitlistTable', {
      tableName: `feelcycle-hub-waitlist-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'waitlistId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
      pointInTimeRecovery: isProduction,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // GSI for efficient monitoring target extraction
    waitlistTable.addGlobalSecondaryIndex({
      indexName: 'StatusLessonDateTimeIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lessonDateTime', type: dynamodb.AttributeType.STRING },
    });

    // GSI for studio-based queries
    waitlistTable.addGlobalSecondaryIndex({
      indexName: 'StudioDateIndex',
      partitionKey: { name: 'studioCode', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lessonDate', type: dynamodb.AttributeType.STRING },
    });

    // Studios table for storing studio information
    const studiosTable = new dynamodb.Table(this, 'StudiosTable', {
      tableName: `feelcycle-hub-studios-${environment}`,
      partitionKey: { name: 'studioCode', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
      pointInTimeRecovery: isProduction,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // GSI for region-based queries
    studiosTable.addGlobalSecondaryIndex({
      indexName: 'RegionIndex',
      partitionKey: { name: 'region', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'studioName', type: dynamodb.AttributeType.STRING },
    });

    // Lessons table for storing actual lesson data
    const lessonsTable = new dynamodb.Table(this, 'LessonsTable', {
      tableName: `feelcycle-hub-lessons-${environment}`,
      partitionKey: { name: 'studioCode', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lessonDateTime', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
      pointInTimeRecovery: isProduction,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // GSI for date-based queries (all studios for a specific date)
    lessonsTable.addGlobalSecondaryIndex({
      indexName: 'DateStudioIndex',
      partitionKey: { name: 'lessonDate', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'studioCode', type: dynamodb.AttributeType.STRING },
    });

    // GSI for availability-based queries
    lessonsTable.addGlobalSecondaryIndex({
      indexName: 'AvailabilityDateIndex',
      partitionKey: { name: 'isAvailable', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lessonDateTime', type: dynamodb.AttributeType.STRING },
    });

    // Programs table for storing FEELCYCLE program information and colors
    const programsTable = new dynamodb.Table(this, 'ProgramsTable', {
      tableName: `feelcycle-hub-programs-${environment}`,
      partitionKey: { name: 'programCode', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: isProduction,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // GSI for genre-based queries
    programsTable.addGlobalSecondaryIndex({
      indexName: 'GenreIndex',
      partitionKey: { name: 'genre', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'programName', type: dynamodb.AttributeType.STRING },
    });

    // User Lessons table for unified user-lesson relationships
    const userLessonsTable = new dynamodb.Table(this, 'UserLessonsTable', {
      tableName: `feelcycle-hub-user-lessons-${environment}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
      pointInTimeRecovery: isProduction,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // GSI for type-based queries (favorites, waitlists, etc.)
    userLessonsTable.addGlobalSecondaryIndex({
      indexName: 'TypeDateIndex',
      partitionKey: { name: 'type', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lessonDate', type: dynamodb.AttributeType.STRING },
    });

    // GSI for studio-based queries
    userLessonsTable.addGlobalSecondaryIndex({
      indexName: 'StudioDateIndex',
      partitionKey: { name: 'studioCode', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lessonDate', type: dynamodb.AttributeType.STRING },
    });

    // GSI for status-based monitoring and processing
    userLessonsTable.addGlobalSecondaryIndex({
      indexName: 'StatusDateTimeIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lessonDateTime', type: dynamodb.AttributeType.STRING },
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

    // Lambda Layer for shared dependencies (復旧: 動作していたv9構成)
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      layerVersionName: `feelcycle-hub-shared-${environment}`,
      code: lambda.Code.fromAsset('../backend/layers/shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      compatibleArchitectures: [lambda.Architecture.ARM_64], // 復旧: 元の動作環境
      description: 'Restored working v9 configuration with puppeteer-core',
    });

    // Main Lambda function
    const mainLambda = new lambda.Function(this, 'MainFunction', {
      functionName: `feelcycle-hub-main-${environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64, // 復旧: 元の動作環境
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'handlers/main.handler',
      timeout: cdk.Duration.minutes(isProduction ? 10 : 15), // Data refresh needs more time
      memorySize: 512, // Increased memory for web scraping
      layers: [sharedLayer],
      environment: {
        USERS_TABLE_NAME: usersTable.tableName,
        RESERVATIONS_TABLE_NAME: reservationsTable.tableName,
        LESSON_HISTORY_TABLE_NAME: lessonHistoryTable.tableName,
        WAITLIST_TABLE_NAME: waitlistTable.tableName,
        STUDIOS_TABLE_NAME: studiosTable.tableName,
        LESSONS_TABLE_NAME: lessonsTable.tableName,
        PROGRAMS_TABLE_NAME: programsTable.tableName,
        USER_LESSONS_TABLE_NAME: userLessonsTable.tableName,
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
    waitlistTable.grantReadWriteData(mainLambda);
    studiosTable.grantReadWriteData(mainLambda);
    lessonsTable.grantReadWriteData(mainLambda);
    programsTable.grantReadData(mainLambda); // Programs table - read only
    userLessonsTable.grantReadWriteData(mainLambda);
    userCredentialsSecret.grantRead(mainLambda);
    lineApiSecret.grantRead(mainLambda);

    // Grant permission to query GSIs
    mainLambda.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      effect: cdk.aws_iam.Effect.ALLOW,
      actions: ['dynamodb:Query'],
      resources: [
        `${usersTable.tableArn}/index/*`,
        `${reservationsTable.tableArn}/index/*`,
        `${waitlistTable.tableArn}/index/*`,
        `${studiosTable.tableArn}/index/*`,
        `${lessonsTable.tableArn}/index/*`,
        `${programsTable.tableArn}/index/*`,
      ],
    }));

    // Grant permission to write to user credentials secret
    mainLambda.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      effect: cdk.aws_iam.Effect.ALLOW,
      actions: ['secretsmanager:PutSecretValue'],
      resources: [userCredentialsSecret.secretArn],
    }));

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
    auth.addResource('user').addMethod('GET', lambdaIntegration);
    
    const lineAuth = auth.addResource('line');
    lineAuth.addResource('callback').addMethod('GET', lambdaIntegration);
    lineAuth.addResource('register').addMethod('POST', lambdaIntegration);

    api.root.addResource('watch').addMethod('POST', lambdaIntegration);
    
    // Waitlist API routes
    const waitlist = api.root.addResource('waitlist');
    waitlist.addMethod('POST', lambdaIntegration); // Create waitlist
    waitlist.addMethod('GET', lambdaIntegration);  // Get user waitlists
    
    const waitlistItem = waitlist.addResource('{waitlistId}');
    waitlistItem.addMethod('PUT', lambdaIntegration);    // Update waitlist (resume/cancel)
    waitlistItem.addMethod('DELETE', lambdaIntegration); // Delete waitlist
    
    // Studios and Lessons API routes
    const studios = api.root.addResource('studios');
    studios.addMethod('GET', lambdaIntegration); // Get all studios
    
    const studioItem = studios.addResource('{studioCode}');
    const studioDates = studioItem.addResource('dates');
    studioDates.addMethod('GET', lambdaIntegration); // Get available dates for studio
    
    const lessons = api.root.addResource('lessons');
    lessons.addMethod('GET', lambdaIntegration); // Search lessons
    
    const lessonsRange = lessons.addResource('range');
    lessonsRange.addMethod('GET', lambdaIntegration); // Search lessons across date range
    
    const sampleData = lessons.addResource('sample-data');
    sampleData.addMethod('GET', lambdaIntegration); // Create sample lesson data
    
    const realScrape = lessons.addResource('real-scrape');
    realScrape.addMethod('GET', lambdaIntegration); // Execute real scraping
    
    const line = api.root.addResource('line');
    line.addResource('webhook').addMethod('POST', lambdaIntegration);

    const history = api.root.addResource('history');
    history.addResource('summary').addMethod('GET', lambdaIntegration);

    // Programs API routes
    const programs = api.root.addResource('programs');
    programs.addMethod('GET', lambdaIntegration); // Get all programs
    
    const programItem = programs.addResource('{programCode}');
    programItem.addMethod('GET', lambdaIntegration); // Get specific program
    
    const programGenre = programs.addResource('genre');
    const programGenreItem = programGenre.addResource('{genre}');
    programGenreItem.addMethod('GET', lambdaIntegration); // Get programs by genre

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

    // EventBridge rule for daily cleanup
    const cleanupRule = new events.Rule(this, 'CleanupRule', {
      ruleName: `feelcycle-hub-cleanup-${environment}`,
      description: 'Daily cleanup of expired waitlists',
      schedule: events.Schedule.cron({ 
        hour: '2', 
        minute: '0',
      }),
    });

    cleanupRule.addTarget(new targets.LambdaFunction(mainLambda, {
      event: events.RuleTargetInput.fromObject({
        source: 'eventbridge.cleanup',
        action: 'cleanupExpired',
      }),
    }));

    // EventBridge rule for daily lesson data refresh
    const dataRefreshRule = new events.Rule(this, 'DataRefreshRule', {
      ruleName: `feelcycle-hub-data-refresh-${environment}`,
      description: 'Daily refresh of lesson data at 3:00 AM JST',
      schedule: events.Schedule.cron({ 
        hour: '3', 
        minute: '0',
      }),
    });

    dataRefreshRule.addTarget(new targets.LambdaFunction(mainLambda, {
      event: events.RuleTargetInput.fromObject({
        source: 'eventbridge.dataRefresh',
        action: 'refreshLessonData',
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