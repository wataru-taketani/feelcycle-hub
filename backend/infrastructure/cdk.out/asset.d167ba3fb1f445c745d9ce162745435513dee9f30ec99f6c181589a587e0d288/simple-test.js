"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleTest = simpleTest;
async function simpleTest(event) {
    console.log('✅ Simple test function called');
    console.log('Event:', JSON.stringify(event, null, 2));
    const testData = {
        success: true,
        message: 'Lambda function is working correctly',
        timestamp: new Date().toISOString(),
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            cwd: process.cwd()
        },
        event: {
            httpMethod: event.httpMethod,
            path: event.path,
            headers: event.headers
        }
    };
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        body: JSON.stringify(testData, null, 2)
    };
}
