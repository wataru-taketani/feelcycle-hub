const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Enhanced FEELCYCLEログイン機能
 * ログイン後のマイページ情報取得・保存機能付き
 */
async function enhancedFeelcycleLogin(email, password, options = {}) {
  console.log('🚀 Enhanced FEELCYCLEログイン開始');
  
  const {
    saveHtml = true,
    saveScreenshot = true,
    extractUserInfo = true,
    outputDir = './mypage-data'
  } = options;
  
  let browser;
  try {
    // 出力ディレクトリ作成
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 出力ディレクトリ作成: ${outputDir}`);
    }
    
    // 1. ブラウザ起動
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 2. ログインページアクセス
    console.log('📱 ログインページアクセス中...');
    await page.goto('https://m.feelcycle.com/mypage/login', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // 3. JavaScript実行完了待機
    console.log('⏳ JavaScript読み込み待機中...');
    await page.waitForFunction(() => {
      return document.readyState === 'complete' && 
             document.querySelector('input[name="email"]') !== null;
    }, { timeout: 30000 });
    
    // 4. フォーム入力
    console.log('📝 ログイン情報入力中...');
    await page.waitForSelector('input[name="email"]', { visible: true });
    await page.type('input[name="email"]', email);
    
    await page.waitForSelector('input[name="password"]', { visible: true });
    await page.type('input[name="password"]', password);
    
    // 5. ログインボタンクリック
    console.log('🔐 ログイン実行中...');
    await page.click('button.btn1');
    
    // 6. マイページ遷移待機
    console.log('⏳ マイページ遷移待機中...');
    await page.waitForNavigation({ 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const currentUrl = page.url();
    const isSuccess = currentUrl.includes('/mypage') && !currentUrl.includes('/login');
    
    if (!isSuccess) {
      throw new Error(`ログイン失敗: ${currentUrl}`);
    }
    
    console.log('✅ ログイン成功、マイページ到達');
    console.log('📍 現在のURL:', currentUrl);
    
    // 7. マイページ情報取得・保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const results = {
      success: true,
      url: currentUrl,
      timestamp: timestamp,
      data: {}
    };
    
    // HTML保存
    if (saveHtml) {
      console.log('💾 マイページHTML保存中...');
      const html = await page.content();
      const htmlPath = path.join(outputDir, `mypage-${timestamp}.html`);
      fs.writeFileSync(htmlPath, html, 'utf8');
      console.log(`✅ HTML保存完了: ${htmlPath}`);
      results.data.htmlPath = htmlPath;
      results.data.htmlSize = html.length;
    }
    
    // スクリーンショット保存
    if (saveScreenshot) {
      console.log('📸 マイページスクリーンショット保存中...');
      const screenshotPath = path.join(outputDir, `mypage-${timestamp}.png`);
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });
      console.log(`✅ スクリーンショット保存完了: ${screenshotPath}`);
      results.data.screenshotPath = screenshotPath;
    }
    
    // ユーザー情報抽出
    if (extractUserInfo) {
      console.log('👤 ユーザー情報抽出中...');
      
      const userInfo = await page.evaluate(() => {
        const info = {};
        
        // ユーザー名取得
        const nameSelectors = [
          '.user-name',
          '.member-name', 
          '[class*="name"]',
          'h1', 'h2', 'h3'
        ];
        
        for (const selector of nameSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            info.name = element.textContent.trim();
            break;
          }
        }
        
        // 残レッスン数取得
        const lessonSelectors = [
          '.lesson-count',
          '.remaining-lessons',
          '[class*="lesson"]',
          '[class*="count"]'
        ];
        
        for (const selector of lessonSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.includes('レッスン')) {
            info.remainingLessons = element.textContent.trim();
            break;
          }
        }
        
        // メニュー項目取得
        const menuItems = Array.from(document.querySelectorAll('a, button')).map(el => ({
          text: el.textContent.trim(),
          href: el.href || null,
          className: el.className
        })).filter(item => item.text.length > 0 && item.text.length < 50);
        
        info.menuItems = menuItems;
        
        // ページタイトル
        info.pageTitle = document.title;
        
        // 全テキスト内容（デバッグ用）
        info.allText = document.body.textContent.replace(/\s+/g, ' ').trim().substring(0, 1000);
        
        return info;
      });
      
      console.log('✅ ユーザー情報抽出完了');
      console.log('👤 ユーザー名:', userInfo.name || '未取得');
      console.log('📚 残レッスン:', userInfo.remainingLessons || '未取得');
      console.log('📋 メニュー項目数:', userInfo.menuItems?.length || 0);
      
      results.data.userInfo = userInfo;
      
      // ユーザー情報をJSONファイルとして保存
      const jsonPath = path.join(outputDir, `userinfo-${timestamp}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(userInfo, null, 2), 'utf8');
      console.log(`✅ ユーザー情報JSON保存: ${jsonPath}`);
      results.data.jsonPath = jsonPath;
    }
    
    // 8. 追加ページ探索（オプション）
    console.log('🔍 利用可能なページリンク探索中...');
    const availableLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="/mypage"]')).map(link => ({
        text: link.textContent.trim(),
        href: link.href,
        fullPath: link.getAttribute('href')
      })).filter(link => link.text.length > 0);
    });
    
    console.log('🔗 発見されたマイページリンク:', availableLinks.length);
    availableLinks.forEach(link => {
      console.log(`  - ${link.text}: ${link.href}`);
    });
    
    results.data.availableLinks = availableLinks;
    
    return results;
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { enhancedFeelcycleLogin };
