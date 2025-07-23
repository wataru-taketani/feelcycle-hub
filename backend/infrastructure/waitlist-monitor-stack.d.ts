import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
export interface WaitlistMonitorStackProps extends cdk.StackProps {
    waitlistTableName: string;
    lineApiSecretArn: string;
    userTableName: string;
    existingLambdaLayerArn?: string;
}
export declare class WaitlistMonitorStack extends cdk.Stack {
    readonly monitorFunction: lambda.Function;
    constructor(scope: Construct, id: string, props: WaitlistMonitorStackProps);
}
