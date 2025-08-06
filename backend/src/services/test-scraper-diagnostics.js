/**
 * スクレイピング診断テストスクリプト
 * セレクタ変更 vs Chromium問題を特定
 */

// 環境変数設定
process.env.AWS_REGION = 'ap-northeast-1';
process.env.STUDIOS_TABLE_NAME = 'feelcycle-hub-studios-dev';
process.env.LESSONS_TABLE_NAME = 'feelcycle-hub-lessons-dev';

const puppeteer = require('puppeteer');

async function diagnosePrimaryFailure() {
  console.log('🔍 スクレイピング診断テスト開始');
  console.log('=' .repeat(50));
  
  let browser = null;
  
  try {
    // Step 1: ブラウザ初期化テスト
    console.log('\n📍 Phase 1: ブラウザ初期化テスト');
    const startTime = Date.now();
    
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ],
      defaultViewport: { width: 1280, height: 720 },
      headless: true,
      timeout: 30000
    });
    
    const browserInitTime = Date.now() - startTime;
    console.log(`✅ ブラウザ初期化成功: ${browserInitTime}ms`);
    
    // Step 2: サイトアクセステスト
    console.log('\n📍 Phase 2: FEELCYCLEサイトアクセステスト');
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    const navigationStart = Date.now();
    await page.goto('https://m.feelcycle.com/reserve', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    const navigationTime = Date.now() - navigationStart;
    console.log(`✅ サイトアクセス成功: ${navigationTime}ms`);
    
    // Step 3: 基本セレクタテスト
    console.log('\n📍 Phase 3: 基本セレクタ存在確認');
    
    const selectorTests = [
      // 現在使用中のセレクタ
      { name: 'Studio List (現在)', selector: 'li.address_item.handle', type: 'current' },
      
      // Gemini提案の新セレクタ
      { name: 'Schedule Header (Gemini提案)', selector: '.schedule-header__date-item', type: 'gemini' },
      { name: 'Schedule Body (Gemini提案)', selector: '.schedule-body', type: 'gemini' },
      { name: 'Lesson Item (Gemini提案)', selector: '.lesson-item', type: 'gemini' },
      
      // 現在のスケジュールセレクタ
      { name: 'Header SC List (現在)', selector: '.header-sc-list .content .days', type: 'current' },
      { name: 'SC List Active (現在)', selector: '.sc_list.active', type: 'current' },
      { name: 'Lesson Overflow (現在)', selector: '.lesson.overflow_hidden', type: 'current' },
    ];
    
    const results = {};
    
    for (const test of selectorTests) {
      try {
        const elements = await page.$$(test.selector);
        const count = elements.length;
        results[test.name] = { found: count > 0, count, status: count > 0 ? '✅' : '❌' };
        console.log(`  ${results[test.name].status} ${test.name}: ${count}個の要素`);
      } catch (error) {
        results[test.name] = { found: false, count: 0, status: '❌', error: error.message };
        console.log(`  ❌ ${test.name}: エラー - ${error.message}`);
      }
    }
    
    // Step 4: スタジオ選択テスト
    console.log('\n📍 Phase 4: スタジオ選択テスト');
    const testStudioCode = 'ikb'; // 池袋で実験
    
    const studioFound = await page.evaluate((targetCode) => {
      const studioElements = document.querySelectorAll('li.address_item.handle');
      let found = false;
      for (const element of Array.from(studioElements)) {
        const codeElement = element.querySelector('.sub');
        if (codeElement) {
          const codeText = codeElement.textContent?.trim();
          if (codeText) {
            const codeMatch = codeText.match(/\(([^)]+)\)/);
            if (codeMatch && codeMatch[1].toLowerCase() === targetCode) {
              found = true;
              break;
            }
          }
        }
      }
      return found;
    }, testStudioCode);
    
    console.log(`  ${studioFound ? '✅' : '❌'} テストスタジオ(${testStudioCode})検出: ${studioFound}`);
    
    // Step 5: スケジュール画面へのナビゲーションテスト
    if (studioFound) {
      console.log('\n📍 Phase 5: スケジュール画面ナビゲーションテスト');
      
      const clicked = await page.evaluate((targetCode) => {
        const studioElements = document.querySelectorAll('li.address_item.handle');
        for (const element of Array.from(studioElements)) {
          const codeElement = element.querySelector('.sub');
          if (codeElement) {
            const codeText = codeElement.textContent?.trim();
            if (codeText) {
              const codeMatch = codeText.match(/\(([^)]+)\)/);
              if (codeMatch && codeMatch[1].toLowerCase() === targetCode) {
                element.click();
                return true;
              }
            }
          }
        }
        return false;
      }, testStudioCode);
      
      if (clicked) {
        console.log('  ✅ スタジオクリック成功');
        
        // スケジュール画面の読み込み待機
        await new Promise(resolve => setTimeout(resolve, 6000));
        
        // スケジュール画面のセレクタテスト
        const scheduleSelectors = [
          { name: 'Header SC List (現在)', selector: '.header-sc-list .content .days' },
          { name: 'SC List Active (現在)', selector: '.sc_list.active' },
          { name: 'Lesson Elements (現在)', selector: '.lesson.overflow_hidden' },
          { name: 'Schedule Header (Gemini)', selector: '.schedule-header__date-item' },
          { name: 'Schedule Body (Gemini)', selector: '.schedule-body' },
          { name: 'Lesson Items (Gemini)', selector: '.lesson-item' }
        ];
        
        for (const test of scheduleSelectors) {
          try {
            const elements = await page.$$(test.selector);
            const count = elements.length;
            console.log(`    ${count > 0 ? '✅' : '❌'} ${test.name}: ${count}個の要素`);
          } catch (error) {
            console.log(`    ❌ ${test.name}: エラー - ${error.message}`);
          }
        }
      }
    }
    
    // Step 6: HTML構造スナップショット
    console.log('\n📍 Phase 6: HTML構造調査');
    const bodyHTML = await page.evaluate(() => {
      // スケジュール関連の要素のみ抽出
      const relevantSelectors = [
        'div[class*="header"]',
        'div[class*="schedule"]', 
        'div[class*="lesson"]',
        'ul[class*="sc"]',
        '.header-sc-list',
        '.sc_list'
      ];
      
      let html = '';
      relevantSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, index) => {
          html += `\n<!-- ${selector}[${index}] -->\n`;
          html += el.outerHTML.substring(0, 200) + '...\n';
        });
      });
      
      return html || '<no relevant elements found>';
    });
    
    console.log('HTML構造サンプル:');
    console.log(bodyHTML.substring(0, 1000) + '...');
    
    // 診断結果サマリー
    console.log('\n' + '='.repeat(50));
    console.log('🎯 診断結果サマリー');
    console.log('='.repeat(50));
    
    const currentSelectorsWorking = results['Studio List (現在)']?.found;
    const geminiSelectorsWorking = results['Schedule Header (Gemini提案)']?.found;
    
    if (!currentSelectorsWorking && !geminiSelectorsWorking) {
      console.log('❌ 結論: ブラウザ・ネットワーク問題が主原因');
      console.log('   → Windserf提案のChromium最適化が有効');
    } else if (!currentSelectorsWorking && geminiSelectorsWorking) {
      console.log('✅ 結論: セレクタ変更が主原因');  
      console.log('   → Gemini提案のセレクタ更新が有効');
    } else if (currentSelectorsWorking && !geminiSelectorsWorking) {
      console.log('❌ 結論: Gemini提案セレクタが不正確');
      console.log('   → 現在のセレクタ継続、Chromium最適化実行');
    } else {
      console.log('⚠️ 結論: 複合的問題');
      console.log('   → 段階的なセレクタフォールバック実装が必要');
    }
    
  } catch (error) {
    console.error('❌ 診断テストエラー:', error);
    
    if (error.message.includes('timeout')) {
      console.log('\n🎯 エラー分析: タイムアウト系');
      console.log('   → Chromium起動・ネットワーク最適化が最優先');
    } else if (error.message.includes('selector')) {
      console.log('\n🎯 エラー分析: セレクタ系');
      console.log('   → HTML構造変更、Geminiセレクタ更新が有効');
    } else {
      console.log('\n🎯 エラー分析: その他システム系');
      console.log('   → 包括的デバッグが必要');
    }
    
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🧹 ブラウザクリーンアップ完了');
    }
  }
}

// テスト実行
diagnosePrimaryFailure().catch(console.error);