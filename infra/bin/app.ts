#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FeelcycleHubStack } from '../lib/feelcycle-hub-stack';

const app = new cdk.App();

new FeelcycleHubStack(app, 'FeelcycleHubStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
  },
  
  // Stack tags for cost tracking
  tags: {
    Project: 'feelcycle-hub',
    Environment: app.node.tryGetContext('environment') || 'dev',
    Owner: 'feelcycle-hub-team'
  }
});