/**
 * LINE通知の直接テスト（Lambda環境向け）
 */
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import axios from 'axios';

interface LineCredentials {
  channelAccessToken: string;
  channelSecret: string;
  botUserId: string;
}

async function testLineDirect() {
  console.log('🧪 Starting direct LINE test...');
  
  const secretsManager = new SecretsManagerClient({ 
    region: process.env.AWS_REGION || 'ap-northeast-1' 
  });
  const secretArn = process.env.LINE_API_SECRET_ARN || '';
  
  console.log('🔗 Secret ARN:', secretArn);
  
  try {
    // 1. Secrets Managerからの認証情報取得テスト
    console.log('🔐 Testing Secrets Manager access...');
    const result = await secretsManager.send(new GetSecretValueCommand({
      SecretId: secretArn,
    }));
    
    if (!result.SecretString) {
      throw new Error('No secret string found');
    }
    
    console.log('📄 Secret string length:', result.SecretString.length);
    const credentials: LineCredentials = JSON.parse(result.SecretString);
    
    console.log('🔍 Retrieved credentials keys:', Object.keys(credentials));
    console.log('🔑 Channel Access Token (first 20 chars):', credentials.channelAccessToken?.substring(0, 20) || 'NOT_FOUND');
    console.log('🔐 Channel Secret (first 10 chars):', credentials.channelSecret?.substring(0, 10) || 'NOT_FOUND');
    console.log('🤖 Bot User ID:', credentials.botUserId || 'NOT_FOUND');
    
    // 2. LINE API テスト
    console.log('📱 Testing LINE push message...');
    // ユーザーのLINE User IDを使用（システムユーザーIDではない）
    const testLineUserId = 'Ud1382f998e1fa87c37b4f916600ff962';
    const testMessage = '🧪 LINE通知テスト\n\n📍 FEELCYCLE SHIBUYA\n📅 2025年7月24日(木)\n⏰ 20:30-21:15\n🎵 BB1 BRIT 2024\n👤 TARO\n\n空きが出ました！';
    
    console.log('📤 Sending message to LINE user:', testLineUserId);
    console.log('💬 Message:', testMessage);
    console.log('🔑 Using token (first 20 chars):', credentials.channelAccessToken.substring(0, 20));
    
    const response = await axios.post('https://api.line.me/v2/bot/message/push', {
      to: testLineUserId,
      messages: [{
        type: 'text',
        text: testMessage,
      }],
    }, {
      headers: {
        'Authorization': `Bearer ${credentials.channelAccessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📬 LINE API response status:', response.status);
    console.log('📊 LINE API response data:', response.data);
    console.log('✅ LINE notification test completed successfully!');
    
  } catch (error) {
    console.error('❌ LINE test failed:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('🔍 Axios error details:');
      console.error('- Status:', error.response?.status);
      console.error('- Status Text:', error.response?.statusText);
      console.error('- Headers:', error.response?.headers);
      console.error('- Data:', error.response?.data);
    }
    
    throw error;
  }
}

export { testLineDirect };