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
                WAITLIST_TABLE_NAME: waitlistTable.tableName,
                LESSONS_TABLE_NAME: lessonsTable.tableName,
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
        lessonsTable.grantReadWriteData(mainLambda);
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
                `${lessonsTable.tableArn}/index/*`,
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
        const sampleData = lessons.addResource('sample-data');
        sampleData.addMethod('GET', lambdaIntegration); // Create sample lesson data
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
        // EventBridge rule for daily cleanup
        const cleanupRule = new events.Rule(this, 'CleanupRule', {
            ruleName: `feelcycle-hub-cleanup-${environment}`,
            description: 'Daily cleanup of expired waitlists',
            schedule: events.Schedule.cron({
                hour: '2',
                minute: '0',
                timeZone: 'Asia/Tokyo',
            }),
        });
        cleanupRule.addTarget(new targets.LambdaFunction(mainLambda, {
            event: events.RuleTargetInput.fromObject({
                source: 'eventbridge.cleanup',
                action: 'cleanupExpired',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmVlbGN5Y2xlLWh1Yi1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZlZWxjeWNsZS1odWItc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLGlEQUFpRDtBQUNqRCx5REFBeUQ7QUFDekQscURBQXFEO0FBQ3JELGlEQUFpRDtBQUNqRCwwREFBMEQ7QUFDMUQsaUVBQWlFO0FBQ2pFLDZDQUE2QztBQUM3QyxtREFBbUQ7QUFHbkQsTUFBYSxpQkFBa0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUM5QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLGNBQWM7UUFDZCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUM7UUFDcEUsTUFBTSxZQUFZLEdBQUcsV0FBVyxLQUFLLE1BQU0sQ0FBQztRQUU1QyxrQkFBa0I7UUFDbEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDeEQsU0FBUyxFQUFFLHVCQUF1QixXQUFXLEVBQUU7WUFDL0MsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDakUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDNUQsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxVQUFVLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXO1lBQ2hELG1CQUFtQixFQUFFLFlBQVk7WUFDakMsYUFBYSxFQUFFLFlBQVksQ0FBQyxD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QUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDeEMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxTQUFTO1lBQzNCLFdBQVcsRUFBRSwyQkFBMkI7U0FDekMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUNsRCxLQUFLLEVBQUUscUJBQXFCLENBQUMsU0FBUztZQUN0QyxXQUFXLEVBQUUsNkJBQTZCO1NBQzNDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXZVRCw4Q0F1VUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMnO1xuaW1wb3J0ICogYXMgdGFyZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzLXRhcmdldHMnO1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuaW1wb3J0ICogYXMgYnVkZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYnVkZ2V0cyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGNsYXNzIEZlZWxjeWNsZUh1YlN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gRW52aXJvbm1lbnRcbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IHRoaXMubm9kZS50cnlHZXRDb250ZXh0KCdlbnZpcm9ubWVudCcpIHx8ICdkZXYnO1xuICAgIGNvbnN0IGlzUHJvZHVjdGlvbiA9IGVudmlyb25tZW50ID09PSAncHJvZCc7XG5cbiAgICAvLyBEeW5hbW9EQiBUYWJsZXNcbiAgICBjb25zdCB1c2Vyc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdVc2Vyc1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiBgZmVlbGN5Y2xlLWh1Yi11c2Vycy0ke2Vudmlyb25tZW50fWAsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ1BLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ1NLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiBpc1Byb2R1Y3Rpb24sXG4gICAgICByZW1vdmFsUG9saWN5OiBpc1Byb2R1Y3Rpb24gPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIEdTSSBmb3IgTElORSB1c2VyIElEIGxvb2t1cCAobW9zdCBjcml0aWNhbCBmb3IgY3VycmVudCBlcnJvcilcbiAgICB1c2Vyc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ0xpbmVVc2VySW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdHU0kyUEsnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgcmVzZXJ2YXRpb25zVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1Jlc2VydmF0aW9uc1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiBgZmVlbGN5Y2xlLWh1Yi1yZXNlcnZhdGlvbnMtJHtlbnZpcm9ubWVudH1gLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdQSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdTSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ3R0bCcsXG4gICAgICByZW1vdmFsUG9saWN5OiBpc1Byb2R1Y3Rpb24gPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIEdTSSBmb3IgZWZmaWNpZW50IHF1ZXJ5aW5nXG4gICAgcmVzZXJ2YXRpb25zVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnRGF0ZVN0dWRpb0luZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnR1NJMVBLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ0dTSTFTSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBsZXNzb25IaXN0b3J5VGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0xlc3Nvbkhpc3RvcnlUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogYGZlZWxjeWNsZS1odWItbGVzc29uLWhpc3RvcnktJHtlbnZpcm9ubWVudH1gLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdQSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdTSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxuICAgICAgcmVtb3ZhbFBvbGljeTogaXNQcm9kdWN0aW9uID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIFdhaXRsaXN0IHRhYmxlIGZvciBjYW5jZWxsYXRpb24gd2FpdGxpc3QgZmVhdHVyZVxuICAgIGNvbnN0IHdhaXRsaXN0VGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1dhaXRsaXN0VGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGBmZWVsY3ljbGUtaHViLXdhaXRsaXN0LSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3dhaXRsaXN0SWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcbiAgICAgIHRpbWVUb0xpdmVBdHRyaWJ1dGU6ICd0dGwnLFxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogaXNQcm9kdWN0aW9uLFxuICAgICAgcmVtb3ZhbFBvbGljeTogaXNQcm9kdWN0aW9uID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIEdTSSBmb3IgZWZmaWNpZW50IG1vbml0b3JpbmcgdGFyZ2V0IGV4dHJhY3Rpb25cbiAgICB3YWl0bGlzdFRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ1N0YXR1c0xlc3NvbkRhdGVUaW1lSW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdzdGF0dXMnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnbGVzc29uRGF0ZVRpbWUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pO1xuXG4gICAgLy8gR1NJIGZvciBzdHVkaW8tYmFzZWQgcXVlcmllc1xuICAgIHdhaXRsaXN0VGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnU3R1ZGlvRGF0ZUluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnc3R1ZGlvQ29kZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdsZXNzb25EYXRlJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICB9KTtcblxuICAgIC8vIExlc3NvbnMgdGFibGUgZm9yIHN0b3JpbmcgYWN0dWFsIGxlc3NvbiBkYXRhXG4gICAgY29uc3QgbGVzc29uc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdMZXNzb25zVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGBmZWVsY3ljbGUtaHViLWxlc3NvbnMtJHtlbnZpcm9ubWVudH1gLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdzdHVkaW9Db2RlJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2xlc3NvbkRhdGVUaW1lJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXG4gICAgICB0aW1lVG9MaXZlQXR0cmlidXRlOiAndHRsJyxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IGlzUHJvZHVjdGlvbixcbiAgICAgIHJlbW92YWxQb2xpY3k6IGlzUHJvZHVjdGlvbiA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBHU0kgZm9yIGRhdGUtYmFzZWQgcXVlcmllcyAoYWxsIHN0dWRpb3MgZm9yIGEgc3BlY2lmaWMgZGF0ZSlcbiAgICBsZXNzb25zVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnRGF0ZVN0dWRpb0luZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnbGVzc29uRGF0ZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdzdHVkaW9Db2RlJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICB9KTtcblxuICAgIC8vIEdTSSBmb3IgYXZhaWxhYmlsaXR5LWJhc2VkIHF1ZXJpZXNcbiAgICBsZXNzb25zVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnQXZhaWxhYmlsaXR5RGF0ZUluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnaXNBdmFpbGFibGUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnbGVzc29uRGF0ZVRpbWUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pO1xuXG4gICAgLy8gU2VjcmV0cyBNYW5hZ2VyIGZvciBzdG9yaW5nIHVzZXIgY3JlZGVudGlhbHNcbiAgICBjb25zdCB1c2VyQ3JlZGVudGlhbHNTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdVc2VyQ3JlZGVudGlhbHMnLCB7XG4gICAgICBzZWNyZXROYW1lOiBgZmVlbGN5Y2xlLWh1Yi91c2VyLWNyZWRlbnRpYWxzLyR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRW5jcnlwdGVkIEZFRUxDWUNMRSB1c2VyIGNyZWRlbnRpYWxzJyxcbiAgICAgIGdlbmVyYXRlU2VjcmV0U3RyaW5nOiB7XG4gICAgICAgIHNlY3JldFN0cmluZ1RlbXBsYXRlOiBKU09OLnN0cmluZ2lmeSh7fSksXG4gICAgICAgIGdlbmVyYXRlU3RyaW5nS2V5OiAncGxhY2Vob2xkZXInLFxuICAgICAgICBleGNsdWRlQ2hhcmFjdGVyczogJ1wiQC9cXFxcJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBMSU5FIEFQSSBjcmVkZW50aWFsc1xuICAgIGNvbnN0IGxpbmVBcGlTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdMaW5lQXBpQ3JlZGVudGlhbHMnLCB7XG4gICAgICBzZWNyZXROYW1lOiBgZmVlbGN5Y2xlLWh1Yi9saW5lLWFwaS8ke2Vudmlyb25tZW50fWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0xJTkUgQVBJIGNyZWRlbnRpYWxzIGZvciBtZXNzYWdpbmcnLFxuICAgICAgZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcbiAgICAgICAgc2VjcmV0U3RyaW5nVGVtcGxhdGU6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBjaGFubmVsQWNjZXNzVG9rZW46ICcnLFxuICAgICAgICAgIGNoYW5uZWxTZWNyZXQ6ICcnLFxuICAgICAgICB9KSxcbiAgICAgICAgZ2VuZXJhdGVTdHJpbmdLZXk6ICdwbGFjZWhvbGRlcicsXG4gICAgICAgIGV4Y2x1ZGVDaGFyYWN0ZXJzOiAnXCJAL1xcXFwnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYSBMYXllciBmb3Igc2hhcmVkIGRlcGVuZGVuY2llc1xuICAgIGNvbnN0IHNoYXJlZExheWVyID0gbmV3IGxhbWJkYS5MYXllclZlcnNpb24odGhpcywgJ1NoYXJlZExheWVyJywge1xuICAgICAgbGF5ZXJWZXJzaW9uTmFtZTogYGZlZWxjeWNsZS1odWItc2hhcmVkLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9sYXllcnMvc2hhcmVkJyksXG4gICAgICBjb21wYXRpYmxlUnVudGltZXM6IFtsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWF0sXG4gICAgICBjb21wYXRpYmxlQXJjaGl0ZWN0dXJlczogW2xhbWJkYS5BcmNoaXRlY3R1cmUuQVJNXzY0XSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2hhcmVkIGRlcGVuZGVuY2llcyBmb3IgRkVFTENZQ0xFIEh1YicsXG4gICAgfSk7XG5cbiAgICAvLyBNYWluIExhbWJkYSBmdW5jdGlvblxuICAgIGNvbnN0IG1haW5MYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdNYWluRnVuY3Rpb24nLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6IGBmZWVsY3ljbGUtaHViLW1haW4tJHtlbnZpcm9ubWVudH1gLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICBhcmNoaXRlY3R1cmU6IGxhbWJkYS5BcmNoaXRlY3R1cmUuQVJNXzY0LFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Rpc3QnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVycy9tYWluLmhhbmRsZXInLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgICAgbGF5ZXJzOiBbc2hhcmVkTGF5ZXJdLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUlNfVEFCTEVfTkFNRTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFJFU0VSVkFUSU9OU19UQUJMRV9OQU1FOiByZXNlcnZhdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIExFU1NPTl9ISVNUT1JZX1RBQkxFX05BTUU6IGxlc3Nvbkhpc3RvcnlUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFdBSVRMSVNUX1RBQkxFX05BTUU6IHdhaXRsaXN0VGFibGUudGFibGVOYW1lLFxuICAgICAgICBMRVNTT05TX1RBQkxFX05BTUU6IGxlc3NvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfQ1JFREVOVElBTFNfU0VDUkVUX0FSTjogdXNlckNyZWRlbnRpYWxzU2VjcmV0LnNlY3JldEFybixcbiAgICAgICAgTElORV9BUElfU0VDUkVUX0FSTjogbGluZUFwaVNlY3JldC5zZWNyZXRBcm4sXG4gICAgICAgIEVOVklST05NRU5UOiBlbnZpcm9ubWVudCxcbiAgICAgIH0sXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICAgIC8vIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IGlzUHJvZHVjdGlvbiA/IHVuZGVmaW5lZCA6IDIsIC8vIFJlbW92ZWQgZm9yIGRlcGxveW1lbnRcbiAgICB9KTtcblxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zXG4gICAgdXNlcnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobWFpbkxhbWJkYSk7XG4gICAgcmVzZXJ2YXRpb25zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKG1haW5MYW1iZGEpO1xuICAgIGxlc3Nvbkhpc3RvcnlUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobWFpbkxhbWJkYSk7XG4gICAgd2FpdGxpc3RUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobWFpbkxhbWJkYSk7XG4gICAgbGVzc29uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShtYWluTGFtYmRhKTtcbiAgICB1c2VyQ3JlZGVudGlhbHNTZWNyZXQuZ3JhbnRSZWFkKG1haW5MYW1iZGEpO1xuICAgIGxpbmVBcGlTZWNyZXQuZ3JhbnRSZWFkKG1haW5MYW1iZGEpO1xuXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbiB0byBxdWVyeSBHU0lzXG4gICAgbWFpbkxhbWJkYS5hZGRUb1JvbGVQb2xpY3kobmV3IGNkay5hd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGNkay5hd3NfaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFsnZHluYW1vZGI6UXVlcnknXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgJHt1c2Vyc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgICAgYCR7cmVzZXJ2YXRpb25zVGFibGUudGFibGVBcm59L2luZGV4LypgLFxuICAgICAgICBgJHt3YWl0bGlzdFRhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgICAgYCR7bGVzc29uc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgIF0sXG4gICAgfSkpO1xuXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbiB0byB3cml0ZSB0byB1c2VyIGNyZWRlbnRpYWxzIHNlY3JldFxuICAgIG1haW5MYW1iZGEuYWRkVG9Sb2xlUG9saWN5KG5ldyBjZGsuYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBjZGsuYXdzX2lhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbJ3NlY3JldHNtYW5hZ2VyOlB1dFNlY3JldFZhbHVlJ10sXG4gICAgICByZXNvdXJjZXM6IFt1c2VyQ3JlZGVudGlhbHNTZWNyZXQuc2VjcmV0QXJuXSxcbiAgICB9KSk7XG5cbiAgICAvLyBBUEkgR2F0ZXdheVxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ0ZlZWxjeWNsZUh1YkFwaScsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiBgZmVlbGN5Y2xlLWh1Yi1hcGktJHtlbnZpcm9ubWVudH1gLFxuICAgICAgZGVzY3JpcHRpb246ICdGRUVMQ1lDTEUgSHViIEFQSSBHYXRld2F5JyxcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IGFwaWdhdGV3YXkuQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXG4gICAgICAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCAnQXV0aG9yaXphdGlvbiddLFxuICAgICAgfSxcbiAgICAgIGRlcGxveU9wdGlvbnM6IHtcbiAgICAgICAgc3RhZ2VOYW1lOiBlbnZpcm9ubWVudCxcbiAgICAgICAgdGhyb3R0bGluZ1JhdGVMaW1pdDogMTAwLFxuICAgICAgICB0aHJvdHRsaW5nQnVyc3RMaW1pdDogMjAwLFxuICAgICAgICBkYXRhVHJhY2VFbmFibGVkOiAhaXNQcm9kdWN0aW9uLFxuICAgICAgICBsb2dnaW5nTGV2ZWw6IGFwaWdhdGV3YXkuTWV0aG9kTG9nZ2luZ0xldmVsLklORk8sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gTGFtYmRhIGludGVncmF0aW9uXG4gICAgY29uc3QgbGFtYmRhSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihtYWluTGFtYmRhLCB7XG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7ICdhcHBsaWNhdGlvbi9qc29uJzogJ3sgXCJzdGF0dXNDb2RlXCI6IFwiMjAwXCIgfScgfSxcbiAgICB9KTtcblxuICAgIC8vIEFQSSByb3V0ZXNcbiAgICBjb25zdCBhdXRoID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2F1dGgnKTtcbiAgICBhdXRoLmFkZFJlc291cmNlKCdjcmVkZW50aWFscycpLmFkZE1ldGhvZCgnUE9TVCcsIGxhbWJkYUludGVncmF0aW9uKTtcbiAgICBhdXRoLmFkZFJlc291cmNlKCd1c2VyJykuYWRkTWV0aG9kKCdHRVQnLCBsYW1iZGFJbnRlZ3JhdGlvbik7XG4gICAgXG4gICAgY29uc3QgbGluZUF1dGggPSBhdXRoLmFkZFJlc291cmNlKCdsaW5lJyk7XG4gICAgbGluZUF1dGguYWRkUmVzb3VyY2UoJ2NhbGxiYWNrJykuYWRkTWV0aG9kKCdHRVQnLCBsYW1iZGFJbnRlZ3JhdGlvbik7XG4gICAgbGluZUF1dGguYWRkUmVzb3VyY2UoJ3JlZ2lzdGVyJykuYWRkTWV0aG9kKCdQT1NUJywgbGFtYmRhSW50ZWdyYXRpb24pO1xuXG4gICAgYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3dhdGNoJykuYWRkTWV0aG9kKCdQT1NUJywgbGFtYmRhSW50ZWdyYXRpb24pO1xuICAgIFxuICAgIC8vIFdhaXRsaXN0IEFQSSByb3V0ZXNcbiAgICBjb25zdCB3YWl0bGlzdCA9IGFwaS5yb290LmFkZFJlc291cmNlKCd3YWl0bGlzdCcpO1xuICAgIHdhaXRsaXN0LmFkZE1ldGhvZCgnUE9TVCcsIGxhbWJkYUludGVncmF0aW9uKTsgLy8gQ3JlYXRlIHdhaXRsaXN0XG4gICAgd2FpdGxpc3QuYWRkTWV0aG9kKCdHRVQnLCBsYW1iZGFJbnRlZ3JhdGlvbik7ICAvLyBHZXQgdXNlciB3YWl0bGlzdHNcbiAgICBcbiAgICBjb25zdCB3YWl0bGlzdEl0ZW0gPSB3YWl0bGlzdC5hZGRSZXNvdXJjZSgne3dhaXRsaXN0SWR9Jyk7XG4gICAgd2FpdGxpc3RJdGVtLmFkZE1ldGhvZCgnUFVUJywgbGFtYmRhSW50ZWdyYXRpb24pOyAgICAvLyBVcGRhdGUgd2FpdGxpc3QgKHJlc3VtZS9jYW5jZWwpXG4gICAgd2FpdGxpc3RJdGVtLmFkZE1ldGhvZCgnREVMRVRFJywgbGFtYmRhSW50ZWdyYXRpb24pOyAvLyBEZWxldGUgd2FpdGxpc3RcbiAgICBcbiAgICAvLyBTdHVkaW9zIGFuZCBMZXNzb25zIEFQSSByb3V0ZXNcbiAgICBjb25zdCBzdHVkaW9zID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3N0dWRpb3MnKTtcbiAgICBzdHVkaW9zLmFkZE1ldGhvZCgnR0VUJywgbGFtYmRhSW50ZWdyYXRpb24pOyAvLyBHZXQgYWxsIHN0dWRpb3NcbiAgICBcbiAgICBjb25zdCBzdHVkaW9JdGVtID0gc3R1ZGlvcy5hZGRSZXNvdXJjZSgne3N0dWRpb0NvZGV9Jyk7XG4gICAgY29uc3Qgc3R1ZGlvRGF0ZXMgPSBzdHVkaW9JdGVtLmFkZFJlc291cmNlKCdkYXRlcycpO1xuICAgIHN0dWRpb0RhdGVzLmFkZE1ldGhvZCgnR0VUJywgbGFtYmRhSW50ZWdyYXRpb24pOyAvLyBHZXQgYXZhaWxhYmxlIGRhdGVzIGZvciBzdHVkaW9cbiAgICBcbiAgICBjb25zdCBsZXNzb25zID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2xlc3NvbnMnKTtcbiAgICBsZXNzb25zLmFkZE1ldGhvZCgnR0VUJywgbGFtYmRhSW50ZWdyYXRpb24pOyAvLyBTZWFyY2ggbGVzc29uc1xuICAgIFxuICAgIGNvbnN0IHNhbXBsZURhdGEgPSBsZXNzb25zLmFkZFJlc291cmNlKCdzYW1wbGUtZGF0YScpO1xuICAgIHNhbXBsZURhdGEuYWRkTWV0aG9kKCdHRVQnLCBsYW1iZGFJbnRlZ3JhdGlvbik7IC8vIENyZWF0ZSBzYW1wbGUgbGVzc29uIGRhdGFcbiAgICBcbiAgICBjb25zdCBsaW5lID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2xpbmUnKTtcbiAgICBsaW5lLmFkZFJlc291cmNlKCd3ZWJob29rJykuYWRkTWV0aG9kKCdQT1NUJywgbGFtYmRhSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3QgaGlzdG9yeSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdoaXN0b3J5Jyk7XG4gICAgaGlzdG9yeS5hZGRSZXNvdXJjZSgnc3VtbWFyeScpLmFkZE1ldGhvZCgnR0VUJywgbGFtYmRhSW50ZWdyYXRpb24pO1xuXG4gICAgLy8gRXZlbnRCcmlkZ2UgcnVsZSBmb3IgcGVyaW9kaWMgbW9uaXRvcmluZ1xuICAgIGNvbnN0IG1vbml0b3JpbmdSdWxlID0gbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdNb25pdG9yaW5nUnVsZScsIHtcbiAgICAgIHJ1bGVOYW1lOiBgZmVlbGN5Y2xlLWh1Yi1tb25pdG9yaW5nLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVHJpZ2dlciBsZXNzb24gbW9uaXRvcmluZyBldmVyeSBtaW51dGUnLFxuICAgICAgc2NoZWR1bGU6IGV2ZW50cy5TY2hlZHVsZS5yYXRlKGNkay5EdXJhdGlvbi5taW51dGVzKGlzUHJvZHVjdGlvbiA/IDEgOiA1KSksXG4gICAgfSk7XG5cbiAgICBtb25pdG9yaW5nUnVsZS5hZGRUYXJnZXQobmV3IHRhcmdldHMuTGFtYmRhRnVuY3Rpb24obWFpbkxhbWJkYSwge1xuICAgICAgZXZlbnQ6IGV2ZW50cy5SdWxlVGFyZ2V0SW5wdXQuZnJvbU9iamVjdCh7XG4gICAgICAgIHNvdXJjZTogJ2V2ZW50YnJpZGdlLm1vbml0b3JpbmcnLFxuICAgICAgICBhY3Rpb246ICdjaGVja0F2YWlsYWJpbGl0eScsXG4gICAgICB9KSxcbiAgICB9KSk7XG5cbiAgICAvLyBFdmVudEJyaWRnZSBydWxlIGZvciBkYWlseSBjbGVhbnVwXG4gICAgY29uc3QgY2xlYW51cFJ1bGUgPSBuZXcgZXZlbnRzLlJ1bGUodGhpcywgJ0NsZWFudXBSdWxlJywge1xuICAgICAgcnVsZU5hbWU6IGBmZWVsY3ljbGUtaHViLWNsZWFudXAtJHtlbnZpcm9ubWVudH1gLFxuICAgICAgZGVzY3JpcHRpb246ICdEYWlseSBjbGVhbnVwIG9mIGV4cGlyZWQgd2FpdGxpc3RzJyxcbiAgICAgIHNjaGVkdWxlOiBldmVudHMuU2NoZWR1bGUuY3Jvbih7IFxuICAgICAgICBob3VyOiAnMicsIFxuICAgICAgICBtaW51dGU6ICcwJyxcbiAgICAgICAgdGltZVpvbmU6ICdBc2lhL1Rva3lvJyxcbiAgICAgIH0pLFxuICAgIH0pO1xuXG4gICAgY2xlYW51cFJ1bGUuYWRkVGFyZ2V0KG5ldyB0YXJnZXRzLkxhbWJkYUZ1bmN0aW9uKG1haW5MYW1iZGEsIHtcbiAgICAgIGV2ZW50OiBldmVudHMuUnVsZVRhcmdldElucHV0LmZyb21PYmplY3Qoe1xuICAgICAgICBzb3VyY2U6ICdldmVudGJyaWRnZS5jbGVhbnVwJyxcbiAgICAgICAgYWN0aW9uOiAnY2xlYW51cEV4cGlyZWQnLFxuICAgICAgfSksXG4gICAgfSkpO1xuXG4gICAgLy8gQnVkZ2V0IGFsYXJtXG4gICAgaWYgKGlzUHJvZHVjdGlvbikge1xuICAgICAgbmV3IGJ1ZGdldHMuQ2ZuQnVkZ2V0KHRoaXMsICdDb3N0QnVkZ2V0Jywge1xuICAgICAgICBidWRnZXQ6IHtcbiAgICAgICAgICBidWRnZXROYW1lOiAnZmVlbGN5Y2xlLWh1Yi1tb250aGx5LWJ1ZGdldCcsXG4gICAgICAgICAgYnVkZ2V0TGltaXQ6IHtcbiAgICAgICAgICAgIGFtb3VudDogMTAwMCxcbiAgICAgICAgICAgIHVuaXQ6ICdKUFknLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgdGltZVVuaXQ6ICdNT05USExZJyxcbiAgICAgICAgICBidWRnZXRUeXBlOiAnQ09TVCcsXG4gICAgICAgIH0sXG4gICAgICAgIG5vdGlmaWNhdGlvbnNXaXRoU3Vic2NyaWJlcnM6IFt7XG4gICAgICAgICAgbm90aWZpY2F0aW9uOiB7XG4gICAgICAgICAgICBub3RpZmljYXRpb25UeXBlOiAnQUNUVUFMJyxcbiAgICAgICAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogJ0dSRUFURVJfVEhBTicsXG4gICAgICAgICAgICB0aHJlc2hvbGQ6IDgwLFxuICAgICAgICAgICAgdGhyZXNob2xkVHlwZTogJ1BFUkNFTlRBR0UnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgc3Vic2NyaWJlcnM6IFt7XG4gICAgICAgICAgICBzdWJzY3JpcHRpb25UeXBlOiAnRU1BSUwnLFxuICAgICAgICAgICAgYWRkcmVzczogJ3lvdXItZW1haWxAZXhhbXBsZS5jb20nLCAvLyBSZXBsYWNlIHdpdGggYWN0dWFsIGVtYWlsXG4gICAgICAgICAgfV0sXG4gICAgICAgIH1dLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlHYXRld2F5VXJsJywge1xuICAgICAgdmFsdWU6IGFwaS51cmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IGVuZHBvaW50IFVSTCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlcnNUYWJsZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIFVzZXJzIHRhYmxlIG5hbWUnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJDcmVkZW50aWFsc1NlY3JldEFybicsIHtcbiAgICAgIHZhbHVlOiB1c2VyQ3JlZGVudGlhbHNTZWNyZXQuc2VjcmV0QXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdVc2VyIGNyZWRlbnRpYWxzIHNlY3JldCBBUk4nLFxuICAgIH0pO1xuICB9XG59Il19