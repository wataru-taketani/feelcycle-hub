// Lambda Layerの依存関係を使用したテストスクリプト
const path = require('path');

// Lambda Layerのnode_modulesを参照
const layerPath = path.join(__dirname, 'layers/shared/nodejs/node_modules');
process.env.NODE_PATH = layerPath;
require('module').Module._initPaths();

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

async function testLayerScraper() {
  console.log('🔍 Lambda Layer依存関係テスト');
  console.log('='.repeat(50));
  
  try {
    console.log('📦 Chromium executablePath取得中...');
    const executablePath = await chromium.executablePath();
    console.log('✅ Chromium executablePath:', executablePath);
    
    console.log('🌐 ブラウザ起動中...');
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: executablePath,
      headless: true,
      timeout: 60000
    });
    
    console.log('✅ ブラウザ起動成功');
    
    const page = await browser.newPage();
    console.log('📄 新しいページ作成成功');
    
    // 簡単なテスト
    await page.goto('https://m.feelcycle.com/reserve', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    console.log('✅ FEELCYCLEサイトアクセス成功');
    
    // スタジオリストの確認
    await page.waitForSelector('li.address_item.handle', { timeout: 30000 });
    console.log('✅ スタジオリスト読み込み成功');
    
    const studioCount = await page.evaluate(() => {
      return document.querySelectorAll('li.address_item.handle').length;
    });
    
    console.log(`📊 発見されたスタジオ数: ${studioCount}`);
    
    await browser.close();
    console.log('✅ テスト完了 - puppeteer + @sparticuz/chromium が正常動作');
    
  } catch (error) {
    console.error('❌ エラー発生:', error.message);
    console.error('Stack:', error.stack);
  }
}

testLayerScraper();