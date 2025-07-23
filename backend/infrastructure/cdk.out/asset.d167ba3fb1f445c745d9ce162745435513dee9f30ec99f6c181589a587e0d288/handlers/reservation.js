"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reservationHandler = reservationHandler;
/**
 * 予約関連のリクエストハンドラー（スタブ実装）
 */
async function reservationHandler(event) {
    const { httpMethod, path } = event;
    try {
        // POST /watch - レッスン監視枠登録
        if (httpMethod === 'POST' && path === '/watch') {
            return await registerWatch(event);
        }
        return {
            success: false,
            error: 'Not Found',
            message: `Reservation endpoint ${httpMethod} ${path} not found`,
        };
    }
    catch (error) {
        console.error('Reservation handler error:', error);
        return {
            success: false,
            error: 'Reservation Error',
            message: error instanceof Error ? error.message : 'Unknown reservation error',
        };
    }
}
/**
 * レッスン監視枠の登録（スタブ実装）
 */
async function registerWatch(event) {
    if (!event.body) {
        return {
            success: false,
            error: 'Bad Request',
            message: 'Request body is required',
        };
    }
    try {
        const { studio, date, time, instructor, autoReserve } = JSON.parse(event.body);
        if (!studio || !date || !time || !instructor) {
            return {
                success: false,
                error: 'Bad Request',
                message: 'Missing required fields: studio, date, time, instructor',
            };
        }
        // TODO: 実際の監視枠登録処理を実装
        console.log('Watch registration request:', { studio, date, time, instructor, autoReserve });
        return {
            success: true,
            data: {
                watchId: `watch_${Date.now()}`,
                studio,
                date,
                time,
                instructor,
                autoReserve: autoReserve || false,
                status: 'watching',
            },
            message: 'Watch registered successfully',
        };
    }
    catch (error) {
        console.error('Register watch error:', error);
        if (error instanceof SyntaxError) {
            return {
                success: false,
                error: 'Bad Request',
                message: 'Invalid JSON in request body',
            };
        }
        throw error;
    }
}
