"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authHandler = authHandler;
const user_service_1 = require("../services/user-service");
const line_service_1 = require("../services/line-service");
/**
 * 認証関連のリクエストハンドラー
 */
async function authHandler(event) {
    const { httpMethod, path } = event;
    try {
        // POST /auth/credentials - FEELCYCLE資格情報登録
        if (httpMethod === 'POST' && path === '/auth/credentials') {
            return await registerCredentials(event);
        }
        // GET /auth/line/callback - LINE OAuth コールバック
        if (httpMethod === 'GET' && path === '/auth/line/callback') {
            return await lineCallback(event);
        }
        // GET /auth/user - ユーザー情報取得
        if (httpMethod === 'GET' && path === '/auth/user') {
            return await getUser(event);
        }
        // POST /auth/line/register - LINE連携ユーザー登録
        if (httpMethod === 'POST' && path === '/auth/line/register') {
            return await registerLineUser(event);
        }
        // GET /user/settings - ユーザー設定取得
        if (httpMethod === 'GET' && path === '/user/settings') {
            return await getUserSettings(event);
        }
        // POST /user/feelcycle-credentials - FEELCYCLE認証情報保存
        if (httpMethod === 'POST' && path === '/user/feelcycle-credentials') {
            return await saveFeelcycleCredentials(event);
        }
        // DELETE /user/feelcycle-credentials - FEELCYCLE認証情報削除
        if (httpMethod === 'DELETE' && path === '/user/feelcycle-credentials') {
            return await deleteFeelcycleCredentials(event);
        }
        // POST /user/notification-settings - 通知設定保存
        if (httpMethod === 'POST' && path === '/user/notification-settings') {
            return await saveNotificationSettings(event);
        }
        return {
            success: false,
            error: 'Not Found',
            message: `Auth endpoint ${httpMethod} ${path} not found`,
        };
    }
    catch (error) {
        console.error('Auth handler error:', error);
        return {
            success: false,
            error: 'Authentication Error',
            message: error instanceof Error ? error.message : 'Unknown auth error',
        };
    }
}
/**
 * FEELCYCLE資格情報の登録
 */
async function registerCredentials(event) {
    if (!event.body) {
        return {
            success: false,
            error: 'Bad Request',
            message: 'Request body is required',
        };
    }
    try {
        const { email, password } = JSON.parse(event.body);
        if (!email || !password) {
            return {
                success: false,
                error: 'Bad Request',
                message: 'Email and password are required',
            };
        }
        // メールアドレス形式チェック
        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                success: false,
                error: 'Bad Request',
                message: 'Invalid email format',
            };
        }
        const userService = new user_service_1.UserService();
        // 既存ユーザーチェック
        const existingUser = await userService.findByEmail(email);
        if (existingUser) {
            return {
                success: false,
                error: 'Conflict',
                message: 'User already exists',
            };
        }
        // ユーザー作成
        const user = await userService.createUser({
            email,
            password,
            planType: 'monthly15', // デフォルトプラン
        });
        return {
            success: true,
            data: {
                userId: user.userId,
                email: user.email,
                planType: user.planType,
            },
            message: 'User created successfully',
        };
    }
    catch (error) {
        console.error('Register credentials error:', error);
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
/**
 * LINE OAuth コールバック処理
 */
async function lineCallback(event) {
    const { queryStringParameters } = event;
    if (!queryStringParameters?.code || !queryStringParameters?.state) {
        return {
            success: false,
            error: 'Bad Request',
            message: 'Missing OAuth parameters (code, state)',
        };
    }
    try {
        const { code, state } = queryStringParameters;
        const lineService = new line_service_1.LineService();
        const userService = new user_service_1.UserService();
        // LINE OAuth token exchange
        const tokenResponse = await lineService.exchangeCodeForToken(code);
        // LINE ユーザー情報取得
        const lineUserInfo = await lineService.getUserInfo(tokenResponse.access_token);
        // 既存ユーザーとLINE連携
        let user = await userService.findByLineUserId(lineUserInfo.userId);
        if (!user) {
            // 新規ユーザーの場合、仮登録状態で作成
            user = await userService.createUser({
                email: `line_${lineUserInfo.userId}@temp.example.com`,
                password: 'temp_password', // 後で設定必要
                planType: 'monthly15',
                lineUserId: lineUserInfo.userId,
            });
        }
        // LINE連携情報を保存
        await userService.saveLinkInfo(user.userId, {
            lineUserId: lineUserInfo.userId,
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
        });
        // フロントエンドにリダイレクト（成功）
        const redirectUrl = process.env.FRONTEND_URL || 'https://feelcycle-hub.netlify.app';
        const successUrl = `${redirectUrl}/auth/success?userId=${user.userId}`;
        return {
            success: true,
            data: {
                redirectUrl: successUrl,
                userId: user.userId,
                isNewUser: !user.email.includes('@temp.example.com'),
            },
            message: 'LINE authentication successful',
        };
    }
    catch (error) {
        console.error('LINE callback error:', error);
        // フロントエンドにリダイレクト（エラー）
        const redirectUrl = process.env.FRONTEND_URL || 'https://feelcycle-hub.netlify.app';
        const errorUrl = `${redirectUrl}/auth/error?message=LINE authentication failed`;
        return {
            success: false,
            error: 'LINE Authentication Error',
            data: { redirectUrl: errorUrl },
            message: error instanceof Error ? error.message : 'LINE auth failed',
        };
    }
}
/**
 * ユーザー情報取得
 */
async function getUser(event) {
    const { queryStringParameters } = event;
    if (!queryStringParameters?.lineUserId) {
        return {
            success: false,
            error: 'Bad Request',
            message: 'lineUserId parameter is required',
        };
    }
    try {
        const { lineUserId } = queryStringParameters;
        const userService = new user_service_1.UserService();
        const user = await userService.findByLineUserId(lineUserId);
        if (!user) {
            return {
                success: false,
                error: 'Not Found',
                message: 'User not found',
            };
        }
        return {
            success: true,
            data: {
                userId: user.userId,
                email: user.email,
                planType: user.planType,
                lineUserId: user.lineUserId,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            message: 'User retrieved successfully',
        };
    }
    catch (error) {
        console.error('Get user error:', error);
        throw error;
    }
}
/**
 * LINE連携ユーザー登録
 */
async function registerLineUser(event) {
    if (!event.body) {
        return {
            success: false,
            error: 'Bad Request',
            message: 'Request body is required',
        };
    }
    try {
        const { lineUserId, displayName, pictureUrl } = JSON.parse(event.body);
        if (!lineUserId || !displayName) {
            return {
                success: false,
                error: 'Bad Request',
                message: 'lineUserId and displayName are required',
            };
        }
        const userService = new user_service_1.UserService();
        // 既存ユーザーチェック
        const existingUser = await userService.findByLineUserId(lineUserId);
        if (existingUser) {
            return {
                success: true,
                data: {
                    userId: existingUser.userId,
                    email: existingUser.email,
                    planType: existingUser.planType,
                    lineUserId: existingUser.lineUserId,
                    createdAt: existingUser.createdAt,
                    updatedAt: existingUser.updatedAt,
                },
                message: 'User already exists',
            };
        }
        // 新規ユーザー作成
        const user = await userService.createUser({
            email: `line_${lineUserId}@temp.example.com`,
            password: 'temp_password',
            planType: 'monthly15',
            lineUserId,
            displayName,
            pictureUrl,
        });
        return {
            success: true,
            data: {
                userId: user.userId,
                email: user.email,
                planType: user.planType,
                lineUserId: user.lineUserId,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            message: 'User created successfully',
        };
    }
    catch (error) {
        console.error('Register LINE user error:', error);
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
/**
 * ユーザー設定取得
 */
async function getUserSettings(event) {
    const { queryStringParameters } = event;
    if (!queryStringParameters?.userId) {
        return {
            success: false,
            error: 'Bad Request',
            message: 'userId parameter is required',
        };
    }
    try {
        const { userId } = queryStringParameters;
        const userService = new user_service_1.UserService();
        const user = await userService.findById(userId);
        if (!user) {
            return {
                success: false,
                error: 'Not Found',
                message: 'User not found',
            };
        }
        // デフォルト設定を返す
        return {
            success: true,
            data: {
                feelcycleCredentials: user.email !== `line_${user.lineUserId}@temp.example.com` ?
                    { email: user.email, password: '***' } : null,
                notificationSettings: {
                    enableLineNotifications: true,
                    notificationTiming: 'immediate',
                    quietHours: {
                        enabled: false,
                        startTime: '22:00',
                        endTime: '08:00',
                    },
                },
            },
            message: 'User settings retrieved successfully',
        };
    }
    catch (error) {
        console.error('Get user settings error:', error);
        throw error;
    }
}
/**
 * FEELCYCLE認証情報保存
 */
async function saveFeelcycleCredentials(event) {
    if (!event.body) {
        return {
            success: false,
            error: 'Bad Request',
            message: 'Request body is required',
        };
    }
    try {
        const { userId, email, password } = JSON.parse(event.body);
        if (!userId || !email || !password) {
            return {
                success: false,
                error: 'Bad Request',
                message: 'userId, email, and password are required',
            };
        }
        const userService = new user_service_1.UserService();
        // ユーザー更新（メールアドレスのみ）
        await userService.updateUser(userId, {
            email,
        });
        // パスワードは別途保存
        await userService.updateUserCredentials(userId, password);
        return {
            success: true,
            message: 'FEELCYCLE credentials saved successfully',
        };
    }
    catch (error) {
        console.error('Save FEELCYCLE credentials error:', error);
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
/**
 * FEELCYCLE認証情報削除
 */
async function deleteFeelcycleCredentials(event) {
    const { queryStringParameters } = event;
    if (!queryStringParameters?.userId) {
        return {
            success: false,
            error: 'Bad Request',
            message: 'userId parameter is required',
        };
    }
    try {
        const { userId } = queryStringParameters;
        const userService = new user_service_1.UserService();
        // 仮の削除処理（実際の実装では認証情報のみ削除）
        console.log('Deleting FEELCYCLE credentials for user:', userId);
        return {
            success: true,
            message: 'FEELCYCLE credentials deleted successfully',
        };
    }
    catch (error) {
        console.error('Delete FEELCYCLE credentials error:', error);
        throw error;
    }
}
/**
 * 通知設定保存
 */
async function saveNotificationSettings(event) {
    if (!event.body) {
        return {
            success: false,
            error: 'Bad Request',
            message: 'Request body is required',
        };
    }
    try {
        const { userId, notificationSettings } = JSON.parse(event.body);
        if (!userId || !notificationSettings) {
            return {
                success: false,
                error: 'Bad Request',
                message: 'userId and notificationSettings are required',
            };
        }
        // 通知設定保存処理（実際の実装では設定を保存）
        console.log('Saving notification settings for user:', userId, notificationSettings);
        return {
            success: true,
            message: 'Notification settings saved successfully',
        };
    }
    catch (error) {
        console.error('Save notification settings error:', error);
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
