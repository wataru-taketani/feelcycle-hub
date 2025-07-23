"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const auth_1 = require("./auth");
const reservation_1 = require("./reservation");
const line_1 = require("./line");
const history_1 = require("./history");
const monitoring_1 = require("./monitoring");
const waitlist_1 = require("./waitlist");
const lessons_1 = require("./lessons");
const optimized_daily_refresh_1 = require("../scripts/optimized-daily-refresh");
const debug_lambda_modules_1 = require("../debug-lambda-modules");
const simple_test_1 = require("../simple-test");
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
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
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
            },
            body: JSON.stringify(errorResponse),
        };
    }
}
/**
 * 毎日3時に実行されるデータ更新処理
 */
async function handleDataRefresh(event) {
    console.log('🔄 Daily lesson data refresh started at:', new Date().toISOString());
    try {
        const startTime = Date.now();
        await (0, optimized_daily_refresh_1.optimizedDailyRefresh)();
        const duration = (Date.now() - startTime) / 1000;
        console.log('✅ Daily lesson data refresh completed successfully');
        console.log('INFO: DAILY_REFRESH_SUCCESS', {
            timestamp: new Date().toISOString(),
            duration: `${duration.toFixed(1)} seconds`,
            nextScheduled: '3:00 AM JST tomorrow'
        });
    }
    catch (error) {
        console.error('❌ Daily lesson data refresh failed:', error);
        // CloudWatch Logs に ERROR レベルでログを出力（アラート設定で通知可能）
        console.error('ALERT: DAILY_REFRESH_FAILED', {
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
    }
}
