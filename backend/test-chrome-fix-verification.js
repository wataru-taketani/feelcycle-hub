/**
 * Chrome拡張エラー修正確認スクリプト
 * 本番デプロイ前の動作確認用
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function testChromeLaunchFix() {
  console.log('🔧 Chrome起動修正確認テスト開始');
  console.log('='.repeat(60));

  // Phase 1: Chrome実行パス検出テスト
  console.log('\n📍 Phase 1: Chrome実行パス検出');
  console.log('-'.repeat(40));

  let executablePath = null;
  const possiblePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];

  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      executablePath = path;
      console.log(`✅ Chrome実行パス発見: ${path}`);
      break;
    }
  }

  if (!executablePath) {
    console.log('❌ Chrome実行パスが見つかりません');
    return false;
  }

  // Phase 2: 修正前の起動テスト（従来版）
  console.log('\n📍 Phase 2: 修正前Chrome起動テスト');
  console.log('-'.repeat(40));

  try {
    console.log('従来版Chrome起動中...');
    const browserOld = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // 修正前
    });

    const pageOld = await browserOld.newPage();
    console.log('✅ 従来版起動成功');

    // 簡単なページアクセステスト
    await pageOld.goto('https://www.google.com', { timeout: 10000 });
    console.log('✅ 従来版ページアクセス成功');

    await browserOld.close();

  } catch (error) {
    console.log('❌ 従来版起動失敗:', error.message);
  }

  // Phase 3: 修正後の起動テスト（改善版）
  console.log('\n📍 Phase 3: 修正後Chrome起動テスト');
  console.log('-'.repeat(40));

  try {
    console.log('改善版Chrome起動中...');
    const browserNew = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-extensions',      // 🆕 Chrome拡張エラー対策
        '--disable-plugins',        // 🆕 プラグインエラー対策  
        '--disable-images',         // 🆕 高速化
        '--disable-gpu',           // 🆕 GPU問題対策
        '--disable-dev-shm-usage', // 🆕 メモリ問題対策
        '--single-process'         // 🆕 安定性向上
      ]
    });

    const pageNew = await browserNew.newPage();
    console.log('✅ 改善版起動成功');

    // ログ監視開始
    const logs = [];
    pageNew.on('console', msg => {
      logs.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // FEELCYCLEサイトアクセステスト
    console.log('FEELCYCLEサイトアクセステスト中...');
    await pageNew.goto('https://m.feelcycle.com/mypage/login', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    console.log('✅ FEELCYCLE サイトアクセス成功');

    // エラーログ確認
    const errorLogs = logs.filter(log => 
      log.text.includes('chrome-extension://') || 
      log.text.includes('ERR_FILE_NOT_FOUND')
    );

    console.log(`\n📊 エラーログ確認結果:`);
    console.log(`   総ログ数: ${logs.length}`);
    console.log(`   拡張エラー数: ${errorLogs.length}`);

    if (errorLogs.length === 0) {
      console.log('🎉 Chrome拡張エラー完全解消！');
    } else {
      console.log('⚠️  まだ拡張エラーが残存:');
      errorLogs.slice(0, 3).forEach(log => {
        console.log(`     ${log.text}`);
      });
    }

    await browserNew.close();
    return errorLogs.length === 0;

  } catch (error) {
    console.log('❌ 改善版起動失敗:', error.message);
    return false;
  }
}

// Phase 4: セレクタ検出テスト
async function testSelectorDetection() {
  console.log('\n📍 Phase 4: セレクタ検出テスト');
  console.log('-'.repeat(40));
  console.log('修正されたセレクタの動作確認');

  const fs = require('fs');
  let executablePath = null;
  const possiblePaths = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  
  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      executablePath = path;
      break;
    }
  }

  if (!executablePath) return false;

  try {
    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox',
        '--disable-extensions', '--disable-plugins',
        '--disable-images', '--disable-gpu',
        '--disable-dev-shm-usage', '--single-process'
      ]
    });

    const page = await browser.newPage();
    await page.goto('https://m.feelcycle.com/mypage/login', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    // 修正されたセレクタのテスト
    console.log('修正されたセレクタの検出テスト:');
    
    const selectors = [
      { name: 'メール入力', selector: 'input[name="email"]' },
      { name: 'パスワード入力', selector: 'input[name="password"]' },
      { name: 'ログインボタン', selector: 'button.btn1' }
    ];

    let successCount = 0;
    for (const { name, selector } of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        console.log(`✅ ${name}: ${selector} 検出成功`);
        successCount++;
      } catch {
        console.log(`❌ ${name}: ${selector} 検出失敗`);
      }
    }

    await browser.close();
    
    console.log(`\n📊 セレクタ検出結果: ${successCount}/3 成功`);
    return successCount === 3;

  } catch (error) {
    console.log('❌ セレクタテスト失敗:', error.message);
    return false;
  }
}

// メイン実行
async function runVerificationTest() {
  console.log('🚀 Chrome修正確認テスト実行');
  
  const chromeFixResult = await testChromeLaunchFix();
  const selectorResult = await testSelectorDetection();
  
  console.log('\n📋 総合結果');
  console.log('='.repeat(60));
  console.log(`Chrome拡張エラー修正: ${chromeFixResult ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`セレクタ検出機能: ${selectorResult ? '✅ 成功' : '❌ 失敗'}`);
  
  const overallSuccess = chromeFixResult && selectorResult;
  console.log(`\n🎯 総合判定: ${overallSuccess ? '✅ 本番デプロイ可能' : '❌ 追加修正必要'}`);
  
  if (overallSuccess) {
    console.log('');
    console.log('🚀 次のステップ:');
    console.log('1. git add . && git commit -m "fix: Chrome拡張エラー完全修正"');
    console.log('2. git push origin main');
    console.log('3. Netlifyで自動デプロイ確認');
  }
}

runVerificationTest().catch(error => {
  console.error('テスト実行エラー:', error);
  process.exit(1);
});