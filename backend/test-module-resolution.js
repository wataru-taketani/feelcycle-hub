// Lambda Layer内のモジュール解決テスト
const fs = require('fs');
const path = require('path');

const testEvent = {
  httpMethod: 'POST',
  path: '/test-modules',
  headers: { 'Content-Type': 'application/json' },
  queryStringParameters: null,
  body: null
};

async function testModuleResolution() {
  console.log('🔍 Lambda Layer モジュール解決テスト');
  console.log('=' .repeat(60));
  
  try {
    // 1. 環境情報の確認
    console.log('\n📍 Step 1: 環境情報');
    console.log(`Node.js バージョン: ${process.version}`);
    console.log(`プラットフォーム: ${process.platform}`);
    console.log(`アーキテクチャ: ${process.arch}`);
    console.log(`作業ディレクトリ: ${process.cwd()}`);
    
    // 2. Lambda Layer パスの確認
    console.log('\n📍 Step 2: Lambda Layer パス確認');
    const layerPaths = [
      '/opt/nodejs/node_modules',
      '/opt/node_modules', 
      process.cwd() + '/node_modules'
    ];
    
    for (const layerPath of layerPaths) {
      try {
        const exists = fs.existsSync(layerPath);
        console.log(`${exists ? '✅' : '❌'} ${layerPath}: ${exists ? '存在' : '存在しない'}`);
        
        if (exists) {
          const contents = fs.readdirSync(layerPath);
          console.log(`  📁 内容: ${contents.slice(0, 10).join(', ')}${contents.length > 10 ? '...' : ''}`);
        }
      } catch (e) {
        console.log(`❌ ${layerPath}: アクセスエラー - ${e.message}`);
      }
    }
    
    // 3. NODE_PATH環境変数の確認
    console.log('\n📍 Step 3: NODE_PATH 環境変数');
    console.log(`NODE_PATH: ${process.env.NODE_PATH || '未設定'}`);
    
    // 4. require.resolve でのモジュール検索
    console.log('\n📍 Step 4: require.resolve テスト');
    const testModules = ['puppeteer-core', '@sparticuz/chromium', '@aws-sdk/client-dynamodb'];
    
    for (const moduleName of testModules) {
      try {
        const resolvedPath = require.resolve(moduleName);
        console.log(`✅ ${moduleName}: ${resolvedPath}`);
      } catch (e) {
        console.log(`❌ ${moduleName}: ${e.message}`);
        
        // 手動でパス探索
        for (const basePath of layerPaths) {
          const fullPath = path.join(basePath, moduleName);
          if (fs.existsSync(fullPath)) {
            console.log(`   🔍 手動発見: ${fullPath}`);
            try {
              const packageJson = fs.readFileSync(path.join(fullPath, 'package.json'), 'utf8');
              const pkg = JSON.parse(packageJson);
              console.log(`   📦 version: ${pkg.version}`);
            } catch (ex) {
              console.log(`   ❌ package.json読み取りエラー: ${ex.message}`);
            }
          }
        }
      }
    }
    
    // 5. 実際のモジュールロードテスト
    console.log('\n📍 Step 5: 実際のモジュールロードテスト');
    
    try {
      console.log('🔄 puppeteer-core のロードを試行...');
      const puppeteer = require('puppeteer-core');
      console.log('✅ puppeteer-core: ロード成功');
      console.log(`   📦 バージョン: ${puppeteer.version || 'unknown'}`);
    } catch (e) {
      console.log(`❌ puppeteer-core ロードエラー: ${e.message}`);
      console.log(`   📍 エラースタック: ${e.stack}`);
    }
    
    try {
      console.log('🔄 @sparticuz/chromium のロードを試行...');
      const chromium = require('@sparticuz/chromium');
      console.log('✅ @sparticuz/chromium: ロード成功');
      console.log(`   📦 利用可能メソッド: ${Object.keys(chromium).slice(0, 5).join(', ')}`);
    } catch (e) {
      console.log(`❌ @sparticuz/chromium ロードエラー: ${e.message}`);
      console.log(`   📍 エラースタック: ${e.stack}`);
    }
    
    console.log('\n🎯 モジュール解決テスト完了');
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Module resolution test completed',
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}

// ローカルテスト用
if (require.main === module) {
  testModuleResolution().then(result => {
    console.log('\n📊 最終結果:', result);
  }).catch(console.error);
}

module.exports = { testModuleResolution };