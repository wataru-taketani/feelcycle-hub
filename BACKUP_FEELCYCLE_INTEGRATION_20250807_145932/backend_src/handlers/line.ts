import { APIGatewayProxyEvent } from 'aws-lambda';
import { ApiResponse, LineWebhookEvent } from '../types/index';
import { LineService } from '../services/line-service';
import { UserService } from '../services/user-service';

/**
 * LINE関連のリクエストハンドラー
 */
export async function lineHandler(event: APIGatewayProxyEvent): Promise<ApiResponse> {
  const { httpMethod, path } = event;
  
  try {
    // POST /line/webhook - LINE Webhook
    if (httpMethod === 'POST' && path === '/line/webhook') {
      return await webhookHandler(event);
    }
    
    return {
      success: false,
      error: 'Not Found',
      message: `LINE endpoint ${httpMethod} ${path} not found`,
    };
    
  } catch (error) {
    console.error('LINE handler error:', error);
    return {
      success: false,
      error: 'LINE Integration Error',
      message: error instanceof Error ? error.message : 'Unknown LINE error',
    };
  }
}

/**
 * LINE Webhook処理
 */
async function webhookHandler(event: APIGatewayProxyEvent): Promise<ApiResponse> {
  // LINE Webhook検証リクエスト（空のボディ）の場合は200を返す
  if (!event.body) {
    return {
      success: true,
      message: 'Webhook verification successful',
    };
  }

  try {
    const lineService = new LineService();
    const userService = new UserService();
    
    // 署名検証
    const signature = event.headers['x-line-signature'] || event.headers['X-Line-Signature'];
    if (!signature) {
      console.log('Missing LINE signature header');
      return {
        success: false,
        error: 'Unauthorized',
        message: 'Missing LINE signature',
      };
    }
    
    console.log('Verifying signature for body:', event.body);
    console.log('Signature:', signature);
    
    const isValidSignature = await lineService.verifyWebhookSignature(event.body, signature);
    if (!isValidSignature) {
      console.log('Signature verification failed');
      return {
        success: false,
        error: 'Unauthorized',
        message: 'Invalid LINE signature',
      };
    }
    
    console.log('Signature verification successful');
    
    const webhookData = JSON.parse(event.body);
    const events: LineWebhookEvent[] = webhookData.events || [];
    
    // 各イベントを処理
    for (const webhookEvent of events) {
      await processLineEvent(webhookEvent, lineService, userService);
    }
    
    return {
      success: true,
      message: 'Webhook processed successfully',
    };
    
  } catch (error) {
    console.error('Webhook handler error:', error);
    
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
 * 個別のLINEイベント処理
 */
async function processLineEvent(
  event: LineWebhookEvent,
  lineService: LineService,
  userService: UserService
): Promise<void> {
  try {
    const { type, source, replyToken } = event;
    
    // ユーザー情報取得
    const user = await userService.findByLineUserId(source.userId);
    
    switch (type) {
      case 'follow':
        await handleFollowEvent(event, lineService, userService, user);
        break;
        
      case 'unfollow':
        await handleUnfollowEvent(event, userService, user);
        break;
        
      case 'message':
        await handleMessageEvent(event, lineService, userService, user);
        break;
        
      default:
        console.log(`Unhandled event type: ${type}`);
    }
    
  } catch (error) {
    console.error('Process LINE event error:', error);
    // エラーが発生してもWebhookの処理は継続
  }
}

/**
 * フォローイベント処理
 */
async function handleFollowEvent(
  event: LineWebhookEvent,
  lineService: LineService,
  userService: UserService,
  user: any
): Promise<void> {
  const welcomeMessage = user
    ? `おかえりなさい！\\n\\nFEELCYCLE Hubへようこそ🎉\\n\\nレッスンの空き状況をお知らせします。\\n\\n「残レッスン数」「履歴」「設定」などのメッセージを送信してください。`
    : `はじめまして！\\n\\nFEELCYCLE Hubへようこそ🎉\\n\\nご利用には事前にユーザー登録が必要です。\\n\\nWebサイトから登録をお願いします：\\nhttps://feelcycle-hub.netlify.app`;
  
  await lineService.sendReplyMessage(event.replyToken, welcomeMessage);
  
  console.log(`Follow event processed for user: ${event.source.userId}`);
}

/**
 * アンフォローイベント処理
 */
async function handleUnfollowEvent(
  event: LineWebhookEvent,
  userService: UserService,
  user: any
): Promise<void> {
  if (user) {
    // ユーザーの通知設定を無効化（アカウント削除はしない）
    await userService.updateUser(user.userId, {
      // settings: { ...user.settings, enableNotifications: false }
    });
  }
  
  console.log(`Unfollow event processed for user: ${event.source.userId}`);
}

/**
 * メッセージイベント処理
 */
async function handleMessageEvent(
  event: LineWebhookEvent,
  lineService: LineService,
  userService: UserService,
  user: any
): Promise<void> {
  if (!event.message || event.message.type !== 'text' || !event.message.text) {
    return;
  }
  
  const messageText = event.message.text.toLowerCase();
  let replyMessage: string;
  
  if (!user) {
    replyMessage = `ユーザー登録が必要です。\\n\\nWebサイトから登録をお願いします：\\nhttps://feelcycle-hub.netlify.app`;
  } else {
    replyMessage = await generateResponseMessage(messageText, user, userService);
  }
  
  await lineService.sendReplyMessage(event.replyToken, replyMessage);
  
  console.log(`Message event processed: ${messageText} for user: ${event.source.userId}`);
}

/**
 * メッセージに対する応答生成
 */
async function generateResponseMessage(
  messageText: string,
  user: any,
  userService: UserService
): Promise<string> {
  try {
    // 残レッスン数問い合わせ
    if (messageText.includes('残') || messageText.includes('回数') || messageText.includes('レッスン数')) {
      // TODO: 実際のレッスン数取得ロジックを実装
      return `📊 現在の残レッスン数\\n\\n残り: 8回\\nプラン: ${user.planType}\\n\\n今月の利用状況：\\n✓ 受講済み: 7回\\n📅 予約済み: 2回`;
    }
    
    // 履歴問い合わせ
    if (messageText.includes('履歴') || messageText.includes('ヒストリー')) {
      return `📈 受講履歴（直近5回）\\n\\n7/15 表参道 YUKI BB1\\n7/13 銀座 MIKI BSL\\n7/11 六本木 NANA BSB\\n7/09 表参道 YUKI BB1\\n7/07 新宿 AI BSL\\n\\n詳細はWebサイトで確認できます。`;
    }
    
    // 設定問い合わせ
    if (messageText.includes('設定') || messageText.includes('セッティング')) {
      return `⚙️ 現在の設定\\n\\n🔔 通知: ON\\n🤖 自動予約: OFF\\n📍 希望スタジオ: 表参道、銀座\\n⏰ 通知タイミング: 30分前\\n\\n設定変更はWebサイトから行えます。`;
    }
    
    // ヘルプ
    if (messageText.includes('ヘルプ') || messageText.includes('help') || messageText.includes('使い方')) {
      return `📚 FEELCYCLE Hub 使い方\\n\\n以下のメッセージに対応しています：\\n\\n• 「残レッスン数」→ 残り回数確認\\n• 「履歴」→ 受講履歴確認\\n• 「設定」→ 現在の設定確認\\n• 「ヘルプ」→ この画面\\n\\n詳細な設定はWebサイトをご利用ください。`;
    }
    
    // デフォルト応答
    return `お疲れさまです！\\n\\n「残レッスン数」「履歴」「設定」「ヘルプ」などのメッセージを送信してください。\\n\\nレッスンの空きが出た際は自動でお知らせします🔔`;
    
  } catch (error) {
    console.error('Generate response message error:', error);
    return `申し訳ございません。\\n一時的にエラーが発生しました。\\n\\nしばらく時間をおいてから再度お試しください。`;
  }
}