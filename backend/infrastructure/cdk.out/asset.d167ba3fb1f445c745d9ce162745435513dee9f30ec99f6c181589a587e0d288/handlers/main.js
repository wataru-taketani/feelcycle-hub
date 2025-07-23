"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const auth_1 = require("./auth");
const reservation_1 = require("./reservation");
const line_1 = require("./line");
const history_1 = require("./history");
const monitoring_1 = require("./monitoring");
const waitlist_1 = require("./waitlist");
const lessons_1 = require("./lessons");
const waitlist_monitor_1 = require("./waitlist-monitor");
const progressive_daily_refresh_1 = require("../scripts/progressive-daily-refresh");
const debug_lambda_modules_1 = require("../debug-lambda-modules");
const simple_test_1 = require("../simple-test");
const client_lambda_1 = require("@aws-sdk/client-lambda");
/**
 * メインLambda関数ハンドラー
 * 全てのAPIリクエストとEventBridgeイベントを処理
 */
async function handler(event, context) {
    console.log('Event received:', JSON.stringify(event, null, 2));
    try {
        // EventBridge からの定期実行
        if ('source' in event) {
            if (event.source === 'eventbridge.monitoring' || event.source === 'eventbridge.cleanup') {
                await (0, monitoring_1.monitoringHandler)(event);
                return;
            }
            else if (event.source === 'eventbridge.dataRefresh') {
                await handleDataRefresh(event);
                return;
            }
            else if (event.source === 'eventbridge.scheduler' &&
                event['detail-type'] === 'Scheduled Event' &&
                event.detail?.taskType === 'waitlist-monitoring') {
                console.log('🔍 Starting waitlist monitoring...');
                const result = await (0, waitlist_monitor_1.handler)(event, context);
                console.log('📊 Waitlist monitoring result:', result);
                return;
            }
        }
        // Lambda直接呼び出しかAPI Gatewayかを判定
        if ('action' in event) {
            // Lambda直接呼び出し
            return await (0, lessons_1.handler)(event);
        }
        // API Gateway からのHTTPリクエスト
        const apiEvent = event;
        const { httpMethod, path } = apiEvent;
        // CORS ヘッダー
        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        };
        // OPTIONS リクエスト（CORS プリフライト）
        if (httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: '',
            };
        }
        let result;
        // ルーティング
        if (path.startsWith('/auth/')) {
            result = await (0, auth_1.authHandler)(apiEvent);
        }
        else if (path.startsWith('/user/')) {
            result = await (0, auth_1.authHandler)(apiEvent); // User settings handled in auth handler
        }
        else if (path.startsWith('/watch')) {
            result = await (0, reservation_1.reservationHandler)(apiEvent);
        }
        else if (path.startsWith('/waitlist')) {
            return await (0, waitlist_1.handler)(apiEvent);
        }
        else if (path.startsWith('/studios') || path.startsWith('/lessons')) {
            return await (0, lessons_1.handler)(apiEvent);
        }
        else if (path.startsWith('/line/')) {
            result = await (0, line_1.lineHandler)(apiEvent);
        }
        else if (path.startsWith('/history/')) {
            result = await (0, history_1.historyHandler)(apiEvent);
        }
        else if (path === '/debug-modules') {
            return await (0, debug_lambda_modules_1.debugLambdaModules)(apiEvent);
        }
        else if (path === '/simple-test') {
            return await (0, simple_test_1.simpleTest)(apiEvent);
        }
        else if (path === '/test-line') {
            // LINE通知テスト用エンドポイント
            const { handler: lineTestHandler } = await Promise.resolve().then(() => __importStar(require('../test-line-lambda')));
            return await lineTestHandler(apiEvent, context);
        }
        else {
            result = {
                success: false,
                error: 'Not Found',
                message: `Path ${path} not found`,
            };
        }
        return {
            statusCode: result.success ? 200 : 400,
            headers,
            body: JSON.stringify(result),
        };
    }
    catch (error) {
        console.error('Handler error:', error);
        const errorResponse = {
            success: false,
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error',
        };
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            },
            body: JSON.stringify(errorResponse),
        };
    }
}
/**
 * Progressive daily data refresh - processes one studio at a time
 */
async function handleDataRefresh(event) {
    console.log('🔄 Progressive daily lesson data refresh started at:', new Date().toISOString());
    try {
        const startTime = Date.now();
        const result = await (0, progressive_daily_refresh_1.progressiveDailyRefresh)();
        const duration = (Date.now() - startTime) / 1000;
        if (result?.triggerNext) {
            console.log('🔄 Triggering next studio processing...');
            console.log('INFO: PROGRESSIVE_REFRESH_CONTINUE', {
                timestamp: new Date().toISOString(),
                duration: `${duration.toFixed(1)} seconds`,
                progress: result.progress,
            });
            // Self-trigger for next studio processing
            await triggerNextExecution();
        }
        else {
            console.log('✅ Progressive daily lesson data refresh completed successfully');
            console.log('INFO: PROGRESSIVE_REFRESH_SUCCESS', {
                timestamp: new Date().toISOString(),
                duration: `${duration.toFixed(1)} seconds`,
                progress: result?.progress,
                nextScheduled: '3:00 AM JST tomorrow'
            });
        }
    }
    catch (error) {
        console.error('❌ Progressive daily lesson data refresh failed:', error);
        // CloudWatch Logs に ERROR レベルでログを出力（アラート設定で通知可能）
        console.error('ALERT: PROGRESSIVE_REFRESH_FAILED', {
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
    }
}
/**
 * Trigger next Lambda execution for continuing progressive batch
 */
async function triggerNextExecution() {
    try {
        const lambdaClient = new client_lambda_1.LambdaClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
        const payload = {
            source: 'eventbridge.dataRefresh',
            time: new Date().toISOString(),
            trigger: 'auto-continue'
        };
        const command = new client_lambda_1.InvokeCommand({
            FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME || 'feelcycle-hub-main-dev',
            InvocationType: 'Event', // Asynchronous invocation
            Payload: JSON.stringify(payload),
        });
        await lambdaClient.send(command);
        console.log('✅ Next execution triggered successfully');
        // Add a small delay to prevent rapid successive invocations
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    catch (error) {
        console.error('❌ Failed to trigger next execution:', error);
        // Don't throw - let the current execution complete successfully
        // The EventBridge schedule will eventually trigger the next run
    }
}
