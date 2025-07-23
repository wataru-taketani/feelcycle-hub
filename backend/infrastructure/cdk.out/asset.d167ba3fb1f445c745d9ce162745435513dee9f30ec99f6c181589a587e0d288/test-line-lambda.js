"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const test_line_direct_1 = require("./test-line-direct");
const handler = async (event, context) => {
    console.log('🧪 Lambda LINE test handler started');
    console.log('📝 Event:', JSON.stringify(event, null, 2));
    try {
        await (0, test_line_direct_1.testLineDirect)();
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: 'LINE test completed successfully'
            })
        };
    }
    catch (error) {
        console.error('❌ Lambda LINE test failed:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                details: error instanceof Error ? error.stack : undefined
            })
        };
    }
};
exports.handler = handler;
