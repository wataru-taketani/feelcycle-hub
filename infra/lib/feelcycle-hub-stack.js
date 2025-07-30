"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeelcycleHubStack = void 0;
const cdk = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const events = require("aws-cdk-lib/aws-events");
const targets = require("aws-cdk-lib/aws-events-targets");
const secretsmanager = require("aws-cdk-lib/aws-secretsmanager");
const logs = require("aws-cdk-lib/aws-logs");
const budgets = require("aws-cdk-lib/aws-budgets");
class FeelcycleHubStack extends cdk.Stack {
    constructor(scope, id, props) {
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
        waitlist.addMethod('GET', lambdaIntegration); // Get user waitlists
        const waitlistItem = waitlist.addResource('{waitlistId}');
        waitlistItem.addMethod('PUT', lambdaIntegration); // Update waitlist (resume/cancel)
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
exports.FeelcycleHubStack = FeelcycleHubStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmVlbGN5Y2xlLWh1Yi1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZlZWxjeWNsZS1odWItc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLGlEQUFpRDtBQUNqRCx5REFBeUQ7QUFDekQscURBQXFEO0FBQ3JELGlEQUFpRDtBQUNqRCwwREFBMEQ7QUFDMUQsaUVBQWlFO0FBQ2pFLDZDQUE2QztBQUM3QyxtREFBbUQ7QUFHbkQsTUFBYSxpQkFBa0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUM5QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLGNBQWM7UUFDZCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUM7UUFDcEUsTUFBTSxZQUFZLEdBQUcsV0FBVyxLQUFLLE1BQU0sQ0FBQztRQUU1QyxrQkFBa0I7UUFDbEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDeEQsU0FBUyxFQUFFLHVCQUF1QixXQUFXLEVBQUU7WUFDL0MsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDakUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDNUQsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxVQUFVLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXO1lBQ2hELG1CQUFtQixFQUFFLFlBQVk7WUFDakMsYUFBYSxFQUFFLFlBQVksQ0FBQyxD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QUk7d0JBQ1osSUFBSSxFQUFFLEtBQUs7cUJBQ1o7b0JBQ0QsUUFBUSxFQUFFLFNBQVM7b0JBQ25CLFVBQVUsRUFBRSxNQUFNO2lCQUNuQjtnQkFDRCw0QkFBNEIsRUFBRSxDQUFDO3dCQUM3QixZQUFZLEVBQUU7NEJBQ1osZ0JBQWdCLEVBQUUsUUFBUTs0QkFDMUIsa0JBQWtCLEVBQUUsY0FBYzs0QkFDbEMsU0FBUyxFQUFFLEVBQUU7NEJBQ2IsYUFBYSxFQUFFLFlBQVk7eUJBQzVCO3dCQUNELFdBQVcsRUFBRSxDQUFDO2dDQUNaLGdCQUFnQixFQUFFLE9BQU87Z0NBQ3pCLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSw0QkFBNEI7NkJBQ2hFLENBQUM7cUJBQ0gsQ0FBQzthQUNILENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxVQUFVO1FBQ1YsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDdkMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxHQUFHO1lBQ2QsV0FBVyxFQUFFLDBCQUEwQjtTQUN4QyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3hDLEtBQUssRUFBRSxVQUFVLENBQUMsU0FBUztZQUMzQixXQUFXLEVBQUUsMkJBQTJCO1NBQ3pDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsMEJBQTBCLEVBQUU7WUFDbEQsS0FBSyxFQUFFLHFCQUFxQixDQUFDLFNBQVM7WUFDdEMsV0FBVyxFQUFFLDZCQUE2QjtTQUMzQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFwYkQsOENBb2JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIGV2ZW50cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzJztcbmltcG9ydCAqIGFzIHRhcmdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWV2ZW50cy10YXJnZXRzJztcbmltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcic7XG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcbmltcG9ydCAqIGFzIGJ1ZGdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWJ1ZGdldHMnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBjbGFzcyBGZWVsY3ljbGVIdWJTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIEVudmlyb25tZW50XG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSB0aGlzLm5vZGUudHJ5R2V0Q29udGV4dCgnZW52aXJvbm1lbnQnKSB8fCAnZGV2JztcbiAgICBjb25zdCBpc1Byb2R1Y3Rpb24gPSBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnO1xuXG4gICAgLy8gRHluYW1vREIgVGFibGVzXG4gICAgY29uc3QgdXNlcnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVXNlcnNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogYGZlZWxjeWNsZS1odWItdXNlcnMtJHtlbnZpcm9ubWVudH1gLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdQSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdTSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogaXNQcm9kdWN0aW9uLFxuICAgICAgcmVtb3ZhbFBvbGljeTogaXNQcm9kdWN0aW9uID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIEFkZCBHU0kgZm9yIExJTkUgdXNlciBJRCBsb29rdXAgKG1vc3QgY3JpdGljYWwgZm9yIGN1cnJlbnQgZXJyb3IpXG4gICAgdXNlcnNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdMaW5lVXNlckluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnR1NJMlBLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlc2VydmF0aW9uc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdSZXNlcnZhdGlvbnNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogYGZlZWxjeWNsZS1odWItcmVzZXJ2YXRpb25zLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnUEsnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnU0snLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcbiAgICAgIHRpbWVUb0xpdmVBdHRyaWJ1dGU6ICd0dGwnLFxuICAgICAgcmVtb3ZhbFBvbGljeTogaXNQcm9kdWN0aW9uID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIEFkZCBHU0kgZm9yIGVmZmljaWVudCBxdWVyeWluZ1xuICAgIHJlc2VydmF0aW9uc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ0RhdGVTdHVkaW9JbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ0dTSTFQSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdHU0kxU0snLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgbGVzc29uSGlzdG9yeVRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdMZXNzb25IaXN0b3J5VGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGBmZWVsY3ljbGUtaHViLWxlc3Nvbi1oaXN0b3J5LSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnUEsnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnU0snLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGlzUHJvZHVjdGlvbiA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBXYWl0bGlzdCB0YWJsZSBmb3IgY2FuY2VsbGF0aW9uIHdhaXRsaXN0IGZlYXR1cmVcbiAgICBjb25zdCB3YWl0bGlzdFRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdXYWl0bGlzdFRhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiBgZmVlbGN5Y2xlLWh1Yi13YWl0bGlzdC0ke2Vudmlyb25tZW50fWAsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd3YWl0bGlzdElkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXG4gICAgICB0aW1lVG9MaXZlQXR0cmlidXRlOiAndHRsJyxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IGlzUHJvZHVjdGlvbixcbiAgICAgIHJlbW92YWxQb2xpY3k6IGlzUHJvZHVjdGlvbiA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBHU0kgZm9yIGVmZmljaWVudCBtb25pdG9yaW5nIHRhcmdldCBleHRyYWN0aW9uXG4gICAgd2FpdGxpc3RUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdTdGF0dXNMZXNzb25EYXRlVGltZUluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnc3RhdHVzJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2xlc3NvbkRhdGVUaW1lJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICB9KTtcblxuICAgIC8vIEdTSSBmb3Igc3R1ZGlvLWJhc2VkIHF1ZXJpZXNcbiAgICB3YWl0bGlzdFRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ1N0dWRpb0RhdGVJbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3N0dWRpb0NvZGUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnbGVzc29uRGF0ZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSk7XG5cbiAgICAvLyBTdHVkaW9zIHRhYmxlIGZvciBzdG9yaW5nIHN0dWRpbyBpbmZvcm1hdGlvblxuICAgIGNvbnN0IHN0dWRpb3NUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnU3R1ZGlvc1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiBgZmVlbGN5Y2xlLWh1Yi1zdHVkaW9zLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnc3R1ZGlvQ29kZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ3R0bCcsXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiBpc1Byb2R1Y3Rpb24sXG4gICAgICByZW1vdmFsUG9saWN5OiBpc1Byb2R1Y3Rpb24gPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gR1NJIGZvciByZWdpb24tYmFzZWQgcXVlcmllc1xuICAgIHN0dWRpb3NUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdSZWdpb25JbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3JlZ2lvbicsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdzdHVkaW9OYW1lJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICB9KTtcblxuICAgIC8vIExlc3NvbnMgdGFibGUgZm9yIHN0b3JpbmcgYWN0dWFsIGxlc3NvbiBkYXRhXG4gICAgY29uc3QgbGVzc29uc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdMZXNzb25zVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGBmZWVsY3ljbGUtaHViLWxlc3NvbnMtJHtlbnZpcm9ubWVudH1gLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdzdHVkaW9Db2RlJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2xlc3NvbkRhdGVUaW1lJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXG4gICAgICB0aW1lVG9MaXZlQXR0cmlidXRlOiAndHRsJyxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IGlzUHJvZHVjdGlvbixcbiAgICAgIHJlbW92YWxQb2xpY3k6IGlzUHJvZHVjdGlvbiA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBHU0kgZm9yIGRhdGUtYmFzZWQgcXVlcmllcyAoYWxsIHN0dWRpb3MgZm9yIGEgc3BlY2lmaWMgZGF0ZSlcbiAgICBsZXNzb25zVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnRGF0ZVN0dWRpb0luZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnbGVzc29uRGF0ZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdzdHVkaW9Db2RlJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICB9KTtcblxuICAgIC8vIEdTSSBmb3IgYXZhaWxhYmlsaXR5LWJhc2VkIHF1ZXJpZXNcbiAgICBsZXNzb25zVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnQXZhaWxhYmlsaXR5RGF0ZUluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnaXNBdmFpbGFibGUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnbGVzc29uRGF0ZVRpbWUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pO1xuXG4gICAgLy8gUHJvZ3JhbXMgdGFibGUgZm9yIHN0b3JpbmcgRkVFTENZQ0xFIHByb2dyYW0gaW5mb3JtYXRpb24gYW5kIGNvbG9yc1xuICAgIGNvbnN0IHByb2dyYW1zVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1Byb2dyYW1zVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGBmZWVsY3ljbGUtaHViLXByb2dyYW1zLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAncHJvZ3JhbUNvZGUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IGlzUHJvZHVjdGlvbixcbiAgICAgIHJlbW92YWxQb2xpY3k6IGlzUHJvZHVjdGlvbiA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBHU0kgZm9yIGdlbnJlLWJhc2VkIHF1ZXJpZXNcbiAgICBwcm9ncmFtc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ0dlbnJlSW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdnZW5yZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdwcm9ncmFtTmFtZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSk7XG5cbiAgICAvLyBVc2VyIExlc3NvbnMgdGFibGUgZm9yIHVuaWZpZWQgdXNlci1sZXNzb24gcmVsYXRpb25zaGlwc1xuICAgIGNvbnN0IHVzZXJMZXNzb25zVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1VzZXJMZXNzb25zVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGBmZWVsY3ljbGUtaHViLXVzZXItbGVzc29ucy0ke2Vudmlyb25tZW50fWAsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ1BLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ1NLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXG4gICAgICB0aW1lVG9MaXZlQXR0cmlidXRlOiAndHRsJyxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IGlzUHJvZHVjdGlvbixcbiAgICAgIHJlbW92YWxQb2xpY3k6IGlzUHJvZHVjdGlvbiA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBHU0kgZm9yIHR5cGUtYmFzZWQgcXVlcmllcyAoZmF2b3JpdGVzLCB3YWl0bGlzdHMsIGV0Yy4pXG4gICAgdXNlckxlc3NvbnNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdUeXBlRGF0ZUluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndHlwZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdsZXNzb25EYXRlJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICB9KTtcblxuICAgIC8vIEdTSSBmb3Igc3R1ZGlvLWJhc2VkIHF1ZXJpZXNcbiAgICB1c2VyTGVzc29uc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ1N0dWRpb0RhdGVJbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3N0dWRpb0NvZGUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnbGVzc29uRGF0ZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSk7XG5cbiAgICAvLyBHU0kgZm9yIHN0YXR1cy1iYXNlZCBtb25pdG9yaW5nIGFuZCBwcm9jZXNzaW5nXG4gICAgdXNlckxlc3NvbnNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdTdGF0dXNEYXRlVGltZUluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnc3RhdHVzJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2xlc3NvbkRhdGVUaW1lJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICB9KTtcblxuICAgIC8vIFNlY3JldHMgTWFuYWdlciBmb3Igc3RvcmluZyB1c2VyIGNyZWRlbnRpYWxzXG4gICAgY29uc3QgdXNlckNyZWRlbnRpYWxzU2VjcmV0ID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCAnVXNlckNyZWRlbnRpYWxzJywge1xuICAgICAgc2VjcmV0TmFtZTogYGZlZWxjeWNsZS1odWIvdXNlci1jcmVkZW50aWFscy8ke2Vudmlyb25tZW50fWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0VuY3J5cHRlZCBGRUVMQ1lDTEUgdXNlciBjcmVkZW50aWFscycsXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xuICAgICAgICBzZWNyZXRTdHJpbmdUZW1wbGF0ZTogSlNPTi5zdHJpbmdpZnkoe30pLFxuICAgICAgICBnZW5lcmF0ZVN0cmluZ0tleTogJ3BsYWNlaG9sZGVyJyxcbiAgICAgICAgZXhjbHVkZUNoYXJhY3RlcnM6ICdcIkAvXFxcXCcsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gTElORSBBUEkgY3JlZGVudGlhbHNcbiAgICBjb25zdCBsaW5lQXBpU2VjcmV0ID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCAnTGluZUFwaUNyZWRlbnRpYWxzJywge1xuICAgICAgc2VjcmV0TmFtZTogYGZlZWxjeWNsZS1odWIvbGluZS1hcGkvJHtlbnZpcm9ubWVudH1gLFxuICAgICAgZGVzY3JpcHRpb246ICdMSU5FIEFQSSBjcmVkZW50aWFscyBmb3IgbWVzc2FnaW5nJyxcbiAgICAgIGdlbmVyYXRlU2VjcmV0U3RyaW5nOiB7XG4gICAgICAgIHNlY3JldFN0cmluZ1RlbXBsYXRlOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgY2hhbm5lbEFjY2Vzc1Rva2VuOiAnJyxcbiAgICAgICAgICBjaGFubmVsU2VjcmV0OiAnJyxcbiAgICAgICAgfSksXG4gICAgICAgIGdlbmVyYXRlU3RyaW5nS2V5OiAncGxhY2Vob2xkZXInLFxuICAgICAgICBleGNsdWRlQ2hhcmFjdGVyczogJ1wiQC9cXFxcJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBMYW1iZGEgTGF5ZXIgZm9yIHNoYXJlZCBkZXBlbmRlbmNpZXMgKOW+qeaXpzog5YuV5L2c44GX44Gm44GE44Gfdjnmp4vmiJApXG4gICAgY29uc3Qgc2hhcmVkTGF5ZXIgPSBuZXcgbGFtYmRhLkxheWVyVmVyc2lvbih0aGlzLCAnU2hhcmVkTGF5ZXInLCB7XG4gICAgICBsYXllclZlcnNpb25OYW1lOiBgZmVlbGN5Y2xlLWh1Yi1zaGFyZWQtJHtlbnZpcm9ubWVudH1gLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2xheWVycy9zaGFyZWQnKSxcbiAgICAgIGNvbXBhdGlibGVSdW50aW1lczogW2xhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YXSxcbiAgICAgIGNvbXBhdGlibGVBcmNoaXRlY3R1cmVzOiBbbGFtYmRhLkFyY2hpdGVjdHVyZS5BUk1fNjRdLCAvLyDlvqnml6c6IOWFg+OBruWLleS9nOeSsOWig1xuICAgICAgZGVzY3JpcHRpb246ICdSZXN0b3JlZCB3b3JraW5nIHY5IGNvbmZpZ3VyYXRpb24gd2l0aCBwdXBwZXRlZXItY29yZScsXG4gICAgfSk7XG5cbiAgICAvLyBNYWluIExhbWJkYSBmdW5jdGlvblxuICAgIGNvbnN0IG1haW5MYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdNYWluRnVuY3Rpb24nLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6IGBmZWVsY3ljbGUtaHViLW1haW4tJHtlbnZpcm9ubWVudH1gLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICBhcmNoaXRlY3R1cmU6IGxhbWJkYS5BcmNoaXRlY3R1cmUuQVJNXzY0LCAvLyDlvqnml6c6IOWFg+OBruWLleS9nOeSsOWig1xuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Rpc3QnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVycy9tYWluLmhhbmRsZXInLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoaXNQcm9kdWN0aW9uID8gMTAgOiAxNSksIC8vIERhdGEgcmVmcmVzaCBuZWVkcyBtb3JlIHRpbWVcbiAgICAgIG1lbW9yeVNpemU6IDUxMiwgLy8gSW5jcmVhc2VkIG1lbW9yeSBmb3Igd2ViIHNjcmFwaW5nXG4gICAgICBsYXllcnM6IFtzaGFyZWRMYXllcl0sXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSU19UQUJMRV9OQU1FOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUkVTRVJWQVRJT05TX1RBQkxFX05BTUU6IHJlc2VydmF0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgTEVTU09OX0hJU1RPUllfVEFCTEVfTkFNRTogbGVzc29uSGlzdG9yeVRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgV0FJVExJU1RfVEFCTEVfTkFNRTogd2FpdGxpc3RUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFNUVURJT1NfVEFCTEVfTkFNRTogc3R1ZGlvc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgTEVTU09OU19UQUJMRV9OQU1FOiBsZXNzb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUk9HUkFNU19UQUJMRV9OQU1FOiBwcm9ncmFtc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9MRVNTT05TX1RBQkxFX05BTUU6IHVzZXJMZXNzb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX0NSRURFTlRJQUxTX1NFQ1JFVF9BUk46IHVzZXJDcmVkZW50aWFsc1NlY3JldC5zZWNyZXRBcm4sXG4gICAgICAgIExJTkVfQVBJX1NFQ1JFVF9BUk46IGxpbmVBcGlTZWNyZXQuc2VjcmV0QXJuLFxuICAgICAgICBFTlZJUk9OTUVOVDogZW52aXJvbm1lbnQsXG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgICAvLyByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiBpc1Byb2R1Y3Rpb24gPyB1bmRlZmluZWQgOiAyLCAvLyBSZW1vdmVkIGZvciBkZXBsb3ltZW50XG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBwZXJtaXNzaW9uc1xuICAgIHVzZXJzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKG1haW5MYW1iZGEpO1xuICAgIHJlc2VydmF0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShtYWluTGFtYmRhKTtcbiAgICBsZXNzb25IaXN0b3J5VGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKG1haW5MYW1iZGEpO1xuICAgIHdhaXRsaXN0VGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKG1haW5MYW1iZGEpO1xuICAgIHN0dWRpb3NUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobWFpbkxhbWJkYSk7XG4gICAgbGVzc29uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShtYWluTGFtYmRhKTtcbiAgICBwcm9ncmFtc1RhYmxlLmdyYW50UmVhZERhdGEobWFpbkxhbWJkYSk7IC8vIFByb2dyYW1zIHRhYmxlIC0gcmVhZCBvbmx5XG4gICAgdXNlckxlc3NvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobWFpbkxhbWJkYSk7XG4gICAgdXNlckNyZWRlbnRpYWxzU2VjcmV0LmdyYW50UmVhZChtYWluTGFtYmRhKTtcbiAgICBsaW5lQXBpU2VjcmV0LmdyYW50UmVhZChtYWluTGFtYmRhKTtcblxuICAgIC8vIEdyYW50IHBlcm1pc3Npb24gdG8gcXVlcnkgR1NJc1xuICAgIG1haW5MYW1iZGEuYWRkVG9Sb2xlUG9saWN5KG5ldyBjZGsuYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBjZGsuYXdzX2lhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbJ2R5bmFtb2RiOlF1ZXJ5J10sXG4gICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgYCR7dXNlcnNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXG4gICAgICAgIGAke3Jlc2VydmF0aW9uc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgICAgYCR7d2FpdGxpc3RUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXG4gICAgICAgIGAke3N0dWRpb3NUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXG4gICAgICAgIGAke2xlc3NvbnNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXG4gICAgICAgIGAke3Byb2dyYW1zVGFibGUudGFibGVBcm59L2luZGV4LypgLFxuICAgICAgXSxcbiAgICB9KSk7XG5cbiAgICAvLyBHcmFudCBwZXJtaXNzaW9uIHRvIHdyaXRlIHRvIHVzZXIgY3JlZGVudGlhbHMgc2VjcmV0XG4gICAgbWFpbkxhbWJkYS5hZGRUb1JvbGVQb2xpY3kobmV3IGNkay5hd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGNkay5hd3NfaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFsnc2VjcmV0c21hbmFnZXI6UHV0U2VjcmV0VmFsdWUnXSxcbiAgICAgIHJlc291cmNlczogW3VzZXJDcmVkZW50aWFsc1NlY3JldC5zZWNyZXRBcm5dLFxuICAgIH0pKTtcblxuICAgIC8vIEFQSSBHYXRld2F5XG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnRmVlbGN5Y2xlSHViQXBpJywge1xuICAgICAgcmVzdEFwaU5hbWU6IGBmZWVsY3ljbGUtaHViLWFwaS0ke2Vudmlyb25tZW50fWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0ZFRUxDWUNMRSBIdWIgQVBJIEdhdGV3YXknLFxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxuICAgICAgICBhbGxvd01ldGhvZHM6IGFwaWdhdGV3YXkuQ29ycy5BTExfTUVUSE9EUyxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdBdXRob3JpemF0aW9uJ10sXG4gICAgICB9LFxuICAgICAgZGVwbG95T3B0aW9uczoge1xuICAgICAgICBzdGFnZU5hbWU6IGVudmlyb25tZW50LFxuICAgICAgICB0aHJvdHRsaW5nUmF0ZUxpbWl0OiAxMDAsXG4gICAgICAgIHRocm90dGxpbmdCdXJzdExpbWl0OiAyMDAsXG4gICAgICAgIGRhdGFUcmFjZUVuYWJsZWQ6ICFpc1Byb2R1Y3Rpb24sXG4gICAgICAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBMYW1iZGEgaW50ZWdyYXRpb25cbiAgICBjb25zdCBsYW1iZGFJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKG1haW5MYW1iZGEsIHtcbiAgICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHsgJ2FwcGxpY2F0aW9uL2pzb24nOiAneyBcInN0YXR1c0NvZGVcIjogXCIyMDBcIiB9JyB9LFxuICAgIH0pO1xuXG4gICAgLy8gQVBJIHJvdXRlc1xuICAgIGNvbnN0IGF1dGggPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnYXV0aCcpO1xuICAgIGF1dGguYWRkUmVzb3VyY2UoJ2NyZWRlbnRpYWxzJykuYWRkTWV0aG9kKCdQT1NUJywgbGFtYmRhSW50ZWdyYXRpb24pO1xuICAgIGF1dGguYWRkUmVzb3VyY2UoJ3VzZXInKS5hZGRNZXRob2QoJ0dFVCcsIGxhbWJkYUludGVncmF0aW9uKTtcbiAgICBcbiAgICBjb25zdCBsaW5lQXV0aCA9IGF1dGguYWRkUmVzb3VyY2UoJ2xpbmUnKTtcbiAgICBsaW5lQXV0aC5hZGRSZXNvdXJjZSgnY2FsbGJhY2snKS5hZGRNZXRob2QoJ0dFVCcsIGxhbWJkYUludGVncmF0aW9uKTtcbiAgICBsaW5lQXV0aC5hZGRSZXNvdXJjZSgncmVnaXN0ZXInKS5hZGRNZXRob2QoJ1BPU1QnLCBsYW1iZGFJbnRlZ3JhdGlvbik7XG5cbiAgICBhcGkucm9vdC5hZGRSZXNvdXJjZSgnd2F0Y2gnKS5hZGRNZXRob2QoJ1BPU1QnLCBsYW1iZGFJbnRlZ3JhdGlvbik7XG4gICAgXG4gICAgLy8gV2FpdGxpc3QgQVBJIHJvdXRlc1xuICAgIGNvbnN0IHdhaXRsaXN0ID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3dhaXRsaXN0Jyk7XG4gICAgd2FpdGxpc3QuYWRkTWV0aG9kKCdQT1NUJywgbGFtYmRhSW50ZWdyYXRpb24pOyAvLyBDcmVhdGUgd2FpdGxpc3RcbiAgICB3YWl0bGlzdC5hZGRNZXRob2QoJ0dFVCcsIGxhbWJkYUludGVncmF0aW9uKTsgIC8vIEdldCB1c2VyIHdhaXRsaXN0c1xuICAgIFxuICAgIGNvbnN0IHdhaXRsaXN0SXRlbSA9IHdhaXRsaXN0LmFkZFJlc291cmNlKCd7d2FpdGxpc3RJZH0nKTtcbiAgICB3YWl0bGlzdEl0ZW0uYWRkTWV0aG9kKCdQVVQnLCBsYW1iZGFJbnRlZ3JhdGlvbik7ICAgIC8vIFVwZGF0ZSB3YWl0bGlzdCAocmVzdW1lL2NhbmNlbClcbiAgICB3YWl0bGlzdEl0ZW0uYWRkTWV0aG9kKCdERUxFVEUnLCBsYW1iZGFJbnRlZ3JhdGlvbik7IC8vIERlbGV0ZSB3YWl0bGlzdFxuICAgIFxuICAgIC8vIFN0dWRpb3MgYW5kIExlc3NvbnMgQVBJIHJvdXRlc1xuICAgIGNvbnN0IHN0dWRpb3MgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnc3R1ZGlvcycpO1xuICAgIHN0dWRpb3MuYWRkTWV0aG9kKCdHRVQnLCBsYW1iZGFJbnRlZ3JhdGlvbik7IC8vIEdldCBhbGwgc3R1ZGlvc1xuICAgIFxuICAgIGNvbnN0IHN0dWRpb0l0ZW0gPSBzdHVkaW9zLmFkZFJlc291cmNlKCd7c3R1ZGlvQ29kZX0nKTtcbiAgICBjb25zdCBzdHVkaW9EYXRlcyA9IHN0dWRpb0l0ZW0uYWRkUmVzb3VyY2UoJ2RhdGVzJyk7XG4gICAgc3R1ZGlvRGF0ZXMuYWRkTWV0aG9kKCdHRVQnLCBsYW1iZGFJbnRlZ3JhdGlvbik7IC8vIEdldCBhdmFpbGFibGUgZGF0ZXMgZm9yIHN0dWRpb1xuICAgIFxuICAgIGNvbnN0IGxlc3NvbnMgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnbGVzc29ucycpO1xuICAgIGxlc3NvbnMuYWRkTWV0aG9kKCdHRVQnLCBsYW1iZGFJbnRlZ3JhdGlvbik7IC8vIFNlYXJjaCBsZXNzb25zXG4gICAgXG4gICAgY29uc3QgbGVzc29uc1JhbmdlID0gbGVzc29ucy5hZGRSZXNvdXJjZSgncmFuZ2UnKTtcbiAgICBsZXNzb25zUmFuZ2UuYWRkTWV0aG9kKCdHRVQnLCBsYW1iZGFJbnRlZ3JhdGlvbik7IC8vIFNlYXJjaCBsZXNzb25zIGFjcm9zcyBkYXRlIHJhbmdlXG4gICAgXG4gICAgY29uc3Qgc2FtcGxlRGF0YSA9IGxlc3NvbnMuYWRkUmVzb3VyY2UoJ3NhbXBsZS1kYXRhJyk7XG4gICAgc2FtcGxlRGF0YS5hZGRNZXRob2QoJ0dFVCcsIGxhbWJkYUludGVncmF0aW9uKTsgLy8gQ3JlYXRlIHNhbXBsZSBsZXNzb24gZGF0YVxuICAgIFxuICAgIGNvbnN0IHJlYWxTY3JhcGUgPSBsZXNzb25zLmFkZFJlc291cmNlKCdyZWFsLXNjcmFwZScpO1xuICAgIHJlYWxTY3JhcGUuYWRkTWV0aG9kKCdHRVQnLCBsYW1iZGFJbnRlZ3JhdGlvbik7IC8vIEV4ZWN1dGUgcmVhbCBzY3JhcGluZ1xuICAgIFxuICAgIGNvbnN0IGxpbmUgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnbGluZScpO1xuICAgIGxpbmUuYWRkUmVzb3VyY2UoJ3dlYmhvb2snKS5hZGRNZXRob2QoJ1BPU1QnLCBsYW1iZGFJbnRlZ3JhdGlvbik7XG5cbiAgICBjb25zdCBoaXN0b3J5ID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2hpc3RvcnknKTtcbiAgICBoaXN0b3J5LmFkZFJlc291cmNlKCdzdW1tYXJ5JykuYWRkTWV0aG9kKCdHRVQnLCBsYW1iZGFJbnRlZ3JhdGlvbik7XG5cbiAgICAvLyBQcm9ncmFtcyBBUEkgcm91dGVzXG4gICAgY29uc3QgcHJvZ3JhbXMgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgncHJvZ3JhbXMnKTtcbiAgICBwcm9ncmFtcy5hZGRNZXRob2QoJ0dFVCcsIGxhbWJkYUludGVncmF0aW9uKTsgLy8gR2V0IGFsbCBwcm9ncmFtc1xuICAgIFxuICAgIGNvbnN0IHByb2dyYW1JdGVtID0gcHJvZ3JhbXMuYWRkUmVzb3VyY2UoJ3twcm9ncmFtQ29kZX0nKTtcbiAgICBwcm9ncmFtSXRlbS5hZGRNZXRob2QoJ0dFVCcsIGxhbWJkYUludGVncmF0aW9uKTsgLy8gR2V0IHNwZWNpZmljIHByb2dyYW1cbiAgICBcbiAgICBjb25zdCBwcm9ncmFtR2VucmUgPSBwcm9ncmFtcy5hZGRSZXNvdXJjZSgnZ2VucmUnKTtcbiAgICBjb25zdCBwcm9ncmFtR2VucmVJdGVtID0gcHJvZ3JhbUdlbnJlLmFkZFJlc291cmNlKCd7Z2VucmV9Jyk7XG4gICAgcHJvZ3JhbUdlbnJlSXRlbS5hZGRNZXRob2QoJ0dFVCcsIGxhbWJkYUludGVncmF0aW9uKTsgLy8gR2V0IHByb2dyYW1zIGJ5IGdlbnJlXG5cbiAgICAvLyBFdmVudEJyaWRnZSBydWxlIGZvciBwZXJpb2RpYyBtb25pdG9yaW5nXG4gICAgY29uc3QgbW9uaXRvcmluZ1J1bGUgPSBuZXcgZXZlbnRzLlJ1bGUodGhpcywgJ01vbml0b3JpbmdSdWxlJywge1xuICAgICAgcnVsZU5hbWU6IGBmZWVsY3ljbGUtaHViLW1vbml0b3JpbmctJHtlbnZpcm9ubWVudH1gLFxuICAgICAgZGVzY3JpcHRpb246ICdUcmlnZ2VyIGxlc3NvbiBtb25pdG9yaW5nIGV2ZXJ5IG1pbnV0ZScsXG4gICAgICBzY2hlZHVsZTogZXZlbnRzLlNjaGVkdWxlLnJhdGUoY2RrLkR1cmF0aW9uLm1pbnV0ZXMoaXNQcm9kdWN0aW9uID8gMSA6IDUpKSxcbiAgICB9KTtcblxuICAgIG1vbml0b3JpbmdSdWxlLmFkZFRhcmdldChuZXcgdGFyZ2V0cy5MYW1iZGFGdW5jdGlvbihtYWluTGFtYmRhLCB7XG4gICAgICBldmVudDogZXZlbnRzLlJ1bGVUYXJnZXRJbnB1dC5mcm9tT2JqZWN0KHtcbiAgICAgICAgc291cmNlOiAnZXZlbnRicmlkZ2UubW9uaXRvcmluZycsXG4gICAgICAgIGFjdGlvbjogJ2NoZWNrQXZhaWxhYmlsaXR5JyxcbiAgICAgIH0pLFxuICAgIH0pKTtcblxuICAgIC8vIEV2ZW50QnJpZGdlIHJ1bGUgZm9yIGRhaWx5IGNsZWFudXBcbiAgICBjb25zdCBjbGVhbnVwUnVsZSA9IG5ldyBldmVudHMuUnVsZSh0aGlzLCAnQ2xlYW51cFJ1bGUnLCB7XG4gICAgICBydWxlTmFtZTogYGZlZWxjeWNsZS1odWItY2xlYW51cC0ke2Vudmlyb25tZW50fWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0RhaWx5IGNsZWFudXAgb2YgZXhwaXJlZCB3YWl0bGlzdHMnLFxuICAgICAgc2NoZWR1bGU6IGV2ZW50cy5TY2hlZHVsZS5jcm9uKHsgXG4gICAgICAgIGhvdXI6ICcyJywgXG4gICAgICAgIG1pbnV0ZTogJzAnLFxuICAgICAgfSksXG4gICAgfSk7XG5cbiAgICBjbGVhbnVwUnVsZS5hZGRUYXJnZXQobmV3IHRhcmdldHMuTGFtYmRhRnVuY3Rpb24obWFpbkxhbWJkYSwge1xuICAgICAgZXZlbnQ6IGV2ZW50cy5SdWxlVGFyZ2V0SW5wdXQuZnJvbU9iamVjdCh7XG4gICAgICAgIHNvdXJjZTogJ2V2ZW50YnJpZGdlLmNsZWFudXAnLFxuICAgICAgICBhY3Rpb246ICdjbGVhbnVwRXhwaXJlZCcsXG4gICAgICB9KSxcbiAgICB9KSk7XG5cbiAgICAvLyBFdmVudEJyaWRnZSBydWxlIGZvciBkYWlseSBsZXNzb24gZGF0YSByZWZyZXNoXG4gICAgY29uc3QgZGF0YVJlZnJlc2hSdWxlID0gbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdEYXRhUmVmcmVzaFJ1bGUnLCB7XG4gICAgICBydWxlTmFtZTogYGZlZWxjeWNsZS1odWItZGF0YS1yZWZyZXNoLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRGFpbHkgcmVmcmVzaCBvZiBsZXNzb24gZGF0YSBhdCAzOjAwIEFNIEpTVCcsXG4gICAgICBzY2hlZHVsZTogZXZlbnRzLlNjaGVkdWxlLmNyb24oeyBcbiAgICAgICAgaG91cjogJzMnLCBcbiAgICAgICAgbWludXRlOiAnMCcsXG4gICAgICB9KSxcbiAgICB9KTtcblxuICAgIGRhdGFSZWZyZXNoUnVsZS5hZGRUYXJnZXQobmV3IHRhcmdldHMuTGFtYmRhRnVuY3Rpb24obWFpbkxhbWJkYSwge1xuICAgICAgZXZlbnQ6IGV2ZW50cy5SdWxlVGFyZ2V0SW5wdXQuZnJvbU9iamVjdCh7XG4gICAgICAgIHNvdXJjZTogJ2V2ZW50YnJpZGdlLmRhdGFSZWZyZXNoJyxcbiAgICAgICAgYWN0aW9uOiAncmVmcmVzaExlc3NvbkRhdGEnLFxuICAgICAgfSksXG4gICAgfSkpO1xuXG4gICAgLy8gQnVkZ2V0IGFsYXJtXG4gICAgaWYgKGlzUHJvZHVjdGlvbikge1xuICAgICAgbmV3IGJ1ZGdldHMuQ2ZuQnVkZ2V0KHRoaXMsICdDb3N0QnVkZ2V0Jywge1xuICAgICAgICBidWRnZXQ6IHtcbiAgICAgICAgICBidWRnZXROYW1lOiAnZmVlbGN5Y2xlLWh1Yi1tb250aGx5LWJ1ZGdldCcsXG4gICAgICAgICAgYnVkZ2V0TGltaXQ6IHtcbiAgICAgICAgICAgIGFtb3VudDogMTAwMCxcbiAgICAgICAgICAgIHVuaXQ6ICdKUFknLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgdGltZVVuaXQ6ICdNT05USExZJyxcbiAgICAgICAgICBidWRnZXRUeXBlOiAnQ09TVCcsXG4gICAgICAgIH0sXG4gICAgICAgIG5vdGlmaWNhdGlvbnNXaXRoU3Vic2NyaWJlcnM6IFt7XG4gICAgICAgICAgbm90aWZpY2F0aW9uOiB7XG4gICAgICAgICAgICBub3RpZmljYXRpb25UeXBlOiAnQUNUVUFMJyxcbiAgICAgICAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogJ0dSRUFURVJfVEhBTicsXG4gICAgICAgICAgICB0aHJlc2hvbGQ6IDgwLFxuICAgICAgICAgICAgdGhyZXNob2xkVHlwZTogJ1BFUkNFTlRBR0UnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgc3Vic2NyaWJlcnM6IFt7XG4gICAgICAgICAgICBzdWJzY3JpcHRpb25UeXBlOiAnRU1BSUwnLFxuICAgICAgICAgICAgYWRkcmVzczogJ3lvdXItZW1haWxAZXhhbXBsZS5jb20nLCAvLyBSZXBsYWNlIHdpdGggYWN0dWFsIGVtYWlsXG4gICAgICAgICAgfV0sXG4gICAgICAgIH1dLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlHYXRld2F5VXJsJywge1xuICAgICAgdmFsdWU6IGFwaS51cmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IGVuZHBvaW50IFVSTCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlcnNUYWJsZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIFVzZXJzIHRhYmxlIG5hbWUnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJDcmVkZW50aWFsc1NlY3JldEFybicsIHtcbiAgICAgIHZhbHVlOiB1c2VyQ3JlZGVudGlhbHNTZWNyZXQuc2VjcmV0QXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdVc2VyIGNyZWRlbnRpYWxzIHNlY3JldCBBUk4nLFxuICAgIH0pO1xuICB9XG59Il19