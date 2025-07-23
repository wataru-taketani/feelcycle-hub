"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const waitlist_service_1 = require("../services/waitlist-service");
/**
 * Waitlist API handler
 */
async function handler(event) {
    try {
        const { httpMethod, path, body, pathParameters, queryStringParameters } = event;
        const userId = event.headers['x-user-id']; // Assuming user ID is passed in header
        if (!userId) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Unauthorized: User ID required',
                }),
            };
        }
        switch (httpMethod) {
            case 'POST':
                return await createWaitlist(userId, body);
            case 'GET':
                if (path.includes('/user/')) {
                    return await getUserWaitlists(userId, queryStringParameters?.status);
                }
                break;
            case 'PUT':
                if (pathParameters?.waitlistId) {
                    return await updateWaitlist(userId, pathParameters.waitlistId, body);
                }
                break;
            case 'DELETE':
                if (pathParameters?.waitlistId) {
                    return await deleteWaitlist(userId, pathParameters.waitlistId);
                }
                break;
        }
        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Endpoint not found',
            }),
        };
    }
    catch (error) {
        console.error('Waitlist handler error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
            }),
        };
    }
}
async function createWaitlist(userId, body) {
    if (!body) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Request body required',
            }),
        };
    }
    const request = JSON.parse(body);
    // Validate request
    if (!request.studioCode || !request.lessonDate || !request.startTime || !request.lessonName || !request.instructor) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Missing required fields: studioCode, lessonDate, startTime, lessonName, instructor',
            }),
        };
    }
    try {
        const waitlist = await waitlist_service_1.waitlistService.createWaitlist(userId, request);
        return {
            statusCode: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                data: waitlist,
                message: 'Waitlist created successfully',
            }),
        };
    }
    catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            return {
                statusCode: 409,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Waitlist already exists for this lesson',
                }),
            };
        }
        throw error;
    }
}
async function getUserWaitlists(userId, status) {
    const waitlists = await waitlist_service_1.waitlistService.getUserWaitlists(userId, status);
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
            success: true,
            data: waitlists,
        }),
    };
}
async function updateWaitlist(userId, waitlistId, body) {
    if (!body) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Request body required',
            }),
        };
    }
    const request = JSON.parse(body);
    try {
        switch (request.action) {
            case 'resume':
                await waitlist_service_1.waitlistService.resumeWaitlist(userId, waitlistId);
                break;
            case 'cancel':
                await waitlist_service_1.waitlistService.cancelWaitlist(userId, waitlistId);
                break;
            default:
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Invalid action. Must be "resume" or "cancel"',
                    }),
                };
        }
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                message: `Waitlist ${request.action}d successfully`,
            }),
        };
    }
    catch (error) {
        console.error('Update waitlist error:', error);
        throw error;
    }
}
async function deleteWaitlist(userId, waitlistId) {
    await waitlist_service_1.waitlistService.deleteWaitlist(userId, waitlistId);
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
            success: true,
            message: 'Waitlist deleted successfully',
        }),
    };
}
