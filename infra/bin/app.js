#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = require("aws-cdk-lib");
const feelcycle_hub_stack_1 = require("../lib/feelcycle-hub-stack");
const app = new cdk.App();
new feelcycle_hub_stack_1.FeelcycleHubStack(app, 'FeelcycleHubStack', {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHVDQUFxQztBQUNyQyxtQ0FBbUM7QUFDbkMsb0VBQStEO0FBRS9ELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLElBQUksdUNBQWlCLENBQUMsR0FBRyxFQUFFLG1CQUFtQixFQUFFO0lBQzlDLEdBQUcsRUFBRTtRQUNILE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtRQUN4QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxnQkFBZ0I7S0FDM0Q7SUFFRCwrQkFBK0I7SUFDL0IsSUFBSSxFQUFFO1FBQ0osT0FBTyxFQUFFLGVBQWU7UUFDeEIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUs7UUFDM0QsS0FBSyxFQUFFLG9CQUFvQjtLQUM1QjtDQUNGLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbmltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBGZWVsY3ljbGVIdWJTdGFjayB9IGZyb20gJy4uL2xpYi9mZWVsY3ljbGUtaHViLXN0YWNrJztcblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcblxubmV3IEZlZWxjeWNsZUh1YlN0YWNrKGFwcCwgJ0ZlZWxjeWNsZUh1YlN0YWNrJywge1xuICBlbnY6IHtcbiAgICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxuICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OIHx8ICdhcC1ub3J0aGVhc3QtMScsXG4gIH0sXG4gIFxuICAvLyBTdGFjayB0YWdzIGZvciBjb3N0IHRyYWNraW5nXG4gIHRhZ3M6IHtcbiAgICBQcm9qZWN0OiAnZmVlbGN5Y2xlLWh1YicsXG4gICAgRW52aXJvbm1lbnQ6IGFwcC5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50JykgfHwgJ2RldicsXG4gICAgT3duZXI6ICdmZWVsY3ljbGUtaHViLXRlYW0nXG4gIH1cbn0pOyJdfQ==