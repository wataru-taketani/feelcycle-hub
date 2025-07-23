#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WaitlistMonitorStack } from './waitlist-monitor-stack';

const app = new cdk.App();

// Environment configuration
const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
};

// Stack configuration
const stackProps = {
  env,
  waitlistTableName: process.env.WAITLIST_TABLE_NAME || 'feelcycle-hub-waitlist-dev',
  userTableName: process.env.USER_TABLE_NAME || 'feelcycle-hub-users-dev',
  lineApiSecretArn: process.env.LINE_API_SECRET_ARN || 'arn:aws:secretsmanager:ap-northeast-1:234156130688:secret:feelcycle-hub/line-api/dev-OKkt0x',
  existingLambdaLayerArn: process.env.EXISTING_LAYER_ARN, // Optional: use existing layer
};

new WaitlistMonitorStack(app, 'FeelcycleWaitlistMonitorStack', stackProps);