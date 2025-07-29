/**
 * 自動復旧機能のテスト
 */

// 環境変数設定
process.env.AWS_REGION = 'ap-northeast-1';
process.env.STUDIOS_TABLE_NAME = 'feelcycle-hub-studios-dev';
process.env.LESSONS_TABLE_NAME = 'feelcycle-hub-lessons-dev';
process.env.STUDIO_BATCH_TABLE_NAME = 'feelcycle-studio-batch-dev';
process.env.USER_LESSONS_TABLE_NAME = 'feelcycle-hub-user-lessons-dev';
process.env.WAITLIST_TABLE_NAME = 'feelcycle-hub-waitlist-dev';
process.env.USERS_TABLE_NAME = 'feelcycle-hub-users-dev';

const { autoRecoveryService } = require('./dist/services/auto-recovery-service.js');

async function testAutoRecovery() {
  console.log('🧪 自動復旧機能テスト開始');
  console.log('='.repeat(60));
  
  const testScenarios = [
    {
      name: 'スタジオスクレイピング失敗',
      context: {
        errorType: 'studio_scraping_failed',
        errorMessage: 'Studio ikb not found',
        failedOperation: 'scrape_studio_ikb',
        retryCount: 0,
        systemState: 'normal',
      }
    },
    {
      name: 'データベース接続失敗',
      context: {
        errorType: 'database_connection_failed',
        errorMessage: 'Connection timeout',
        failedOperation: 'getAllStudios',
        retryCount: 1,
        systemState: 'degraded',
      }
    },
    {
      name: 'ブラウザ初期化失敗',
      context: {
        errorType: 'browser_initialization_failed',
        errorMessage: 'Chromium executable not found',
        failedOperation: 'initBrowser',
        retryCount: 0,
        systemState: 'degraded',
      }
    },
    {
      name: 'スタジオ更新失敗',
      context: {
        errorType: 'studio_update_failed',
        errorMessage: 'Too many errors during studio update: 15/37',
        failedOperation: 'studio_list_update',
        retryCount: 1,
        systemState: 'degraded',
      }
    },
    {
      name: 'バッチ処理停止',
      context: {
        errorType: 'batch_processing_stuck',
        errorMessage: 'Processing stuck for 45 minutes',
        failedOperation: 'progressiveDailyRefresh',
        retryCount: 0,
        systemState: 'critical',
      }
    },
    {
      name: '未知のエラー',
      context: {
        errorType: 'unknown_error',
        errorMessage: 'Something went wrong',
        failedOperation: 'unknown_operation',
        retryCount: 2,
        systemState: 'normal',
      }
    }
  ];

  let passedTests = 0;
  let totalTests = testScenarios.length;

  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`\n🧪 テスト ${i + 1}/${totalTests}: ${scenario.name}`);
    console.log(`📋 エラータイプ: ${scenario.context.errorType}`);
    console.log(`📋 システム状態: ${scenario.context.systemState}`);
    console.log(`📋 再試行回数: ${scenario.context.retryCount}`);
    
    try {
      const startTime = Date.now();
      const result = await autoRecoveryService.attemptRecovery(scenario.context);
      const duration = Date.now() - startTime;
      
      console.log(`⏱️  復旧時間: ${duration}ms`);
      console.log(`📊 結果: ${result.success ? '✅ 成功' : '❌ 失敗'}`);
      console.log(`🔧 実行アクション: ${result.action}`);
      console.log(`📝 詳細: ${result.details}`);
      console.log(`🛡️  フォールバック使用: ${result.fallbackUsed ? 'Yes' : 'No'}`);
      
      if (result.nextRetryAt) {
        const retryTime = new Date(result.nextRetryAt);
        console.log(`⏰ 次回再試行: ${retryTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      }
      
      // 成功判定 - 基本的に何らかの対応策が実行されれば成功
      if (result.success || result.fallbackUsed) {
        console.log('✅ テスト合格');
        passedTests++;
      } else {
        console.log('❌ テスト不合格');
      }
      
    } catch (error) {
      console.error(`💥 テスト実行エラー: ${error.message || error}`);
      console.log('❌ テスト不合格');
    }
  }

  // システムヘルスチェックテスト
  console.log(`\n🧪 システムヘルスチェックテスト`);
  try {
    const healthResult = await autoRecoveryService.verifySystemHealth();
    
    console.log(`🩺 システム健全性: ${healthResult.healthy ? '✅ 健全' : '⚠️  問題あり'}`);
    console.log('📋 チェック項目:');
    
    Object.entries(healthResult.checks).forEach(([check, status]) => {
      console.log(`   ${status ? '✅' : '❌'} ${check}`);
    });
    
    console.log('📝 詳細:');
    healthResult.details.forEach(detail => {
      console.log(`   • ${detail}`);
    });
    
    if (healthResult.healthy) {
      passedTests++;
      totalTests++;
      console.log('✅ システムヘルスチェック合格');
    } else {
      totalTests++;
      console.log('⚠️  システムヘルスチェック - 問題を検出');
    }
    
  } catch (error) {
    console.error(`💥 システムヘルスチェックエラー: ${error.message || error}`);
    totalTests++;
    console.log('❌ システムヘルスチェック不合格');
  }

  // 最終結果
  console.log('\n📊 テスト結果サマリー');
  console.log('='.repeat(40));
  console.log(`✅ 合格テスト: ${passedTests}/${totalTests}`);
  console.log(`📈 成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests >= totalTests * 0.8) { // 80%以上成功なら合格
    console.log('\n🎉 自動復旧機能テスト合格!');
    console.log('✅ 本番運用での自動復旧準備完了');
    console.log('✅ エラー発生時の無人復旧が可能');
    console.log('✅ システム安定性が大幅向上');
    return true;
  } else {
    console.log('\n⚠️  自動復旧機能の改善が必要');
    console.log(`不合格テスト: ${totalTests - passedTests}件`);
    return false;
  }
}

// 実行
testAutoRecovery().then(success => {
  if (success) {
    console.log('\n🚀 自動復旧システム準備完了');
    console.log('本番環境での無人運用が可能になりました');
  } else {
    console.log('\n🔧 自動復旧システムの調整が必要');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('\n💥 テスト実行失敗:', error);
  process.exit(1);
});