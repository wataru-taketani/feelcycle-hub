/**
 * FEELCYCLE ログイン診断スクリプト
 * GeminiとWindserf提案の検証とサイト構造調査
 */

const puppeteer = require('puppeteer');

async function diagnoseFeelcycleLogin() {
  console.log('🔍 FEELCYCLE ログイン構造診断開始');
  console.log('='.repeat(60));
  
  let browser = null;
  
  try {
    // Step 1: ブラウザ起動（ローカル環境）
    console.log('\n📍 Phase 1: ローカル環境でのブラウザ起動テスト');
    const startTime = Date.now();
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 }
    });
    
    const browserInitTime = Date.now() - startTime;
    console.log(`✅ ブラウザ起動成功: ${browserInitTime}ms`);
    
    // Step 2: サイトアクセス
    console.log('\n📍 Phase 2: FEELCYCLE ログインページアクセス');
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const navigationStart = Date.now();
    await page.goto('https://m.feelcycle.com/mypage/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    const navigationTime = Date.now() - navigationStart;
    console.log(`✅ サイトアクセス成功: ${navigationTime}ms`);
    
    // Step 3: 基本情報確認
    console.log('\n📍 Phase 3: ページ基本情報確認');
    const pageTitle = await page.title();
    const pageUrl = await page.url();
    console.log(`タイトル: ${pageTitle}`);
    console.log(`URL: ${pageUrl}`);
    
    // Step 4: モーダル構造確認（Gemini提案検証）
    console.log('\n📍 Phase 4: モーダル構造確認（Gemini提案検証）');
    
    const modalTests = [
      '#login_modal',
      '.login-modal',
      '[class*="modal"]',
      '[id*="modal"]',
      '.modal',
      '#modal'
    ];
    
    let modalFound = false;
    for (const selector of modalTests) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`  ✅ モーダル要素発見: ${selector} (${elements.length}個)`);
          modalFound = true;
          
          // モーダル内の構造確認
          const modalContent = await page.$eval(selector, el => {
            return {
              visible: !!(el.offsetWidth && el.offsetHeight),
              display: window.getComputedStyle(el).display,
              innerHTML: el.innerHTML.substring(0, 500)
            };
          }).catch(() => null);
          
          if (modalContent) {
            console.log(`    表示状態: ${modalContent.visible ? '表示' : '非表示'}`);
            console.log(`    display: ${modalContent.display}`);
          }
        } else {
          console.log(`  ❌ モーダル要素なし: ${selector}`);
        }
      } catch (error) {
        console.log(`  ❌ モーダルセレクタエラー: ${selector}`);
      }
    }
    
    // Step 5: フォーム要素調査（Windserf指摘検証）
    console.log('\n📍 Phase 5: フォーム要素調査（現在の87個セレクタ検証）');
    
    // 全input要素の調査
    const allInputs = await page.$$eval('input', inputs => 
      inputs.map(input => ({
        type: input.type,
        name: input.name || null,
        id: input.id || null,
        placeholder: input.placeholder || null,
        className: input.className || null,
        visible: !!(input.offsetWidth && input.offsetHeight)
      }))
    );
    
    console.log(`全input要素: ${allInputs.length}個`);
    allInputs.forEach((input, index) => {
      console.log(`  ${index + 1}. type:${input.type}, name:${input.name}, id:${input.id}, visible:${input.visible}`);
    });
    
    // メール入力フィールド特定
    console.log('\n🔍 メール入力フィールド特定:');
    const emailCandidates = [
      'input[name="email"]',
      'input[type="email"]',
      'input[name="mail"]',
      '#email',
      '#login_modal input[name="email"]'
    ];
    
    let validEmailSelector = null;
    for (const selector of emailCandidates) {
      try {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await page.$eval(selector, el => !!(el.offsetWidth && el.offsetHeight));
          console.log(`  ✅ ${selector}: ${isVisible ? '表示' : '非表示'}`);
          if (isVisible && !validEmailSelector) {
            validEmailSelector = selector;
          }
        } else {
          console.log(`  ❌ ${selector}: 要素なし`);
        }
      } catch (error) {
        console.log(`  ❌ ${selector}: エラー`);
      }
    }
    
    // パスワード入力フィールド特定
    console.log('\n🔍 パスワード入力フィールド特定:');
    const passwordCandidates = [
      'input[name="password"]',
      'input[type="password"]',
      '#password',
      '#login_modal input[name="password"]'
    ];
    
    let validPasswordSelector = null;
    for (const selector of passwordCandidates) {
      try {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await page.$eval(selector, el => !!(el.offsetWidth && el.offsetHeight));
          console.log(`  ✅ ${selector}: ${isVisible ? '表示' : '非表示'}`);
          if (isVisible && !validPasswordSelector) {
            validPasswordSelector = selector;
          }
        } else {
          console.log(`  ❌ ${selector}: 要素なし`);
        }
      } catch (error) {
        console.log(`  ❌ ${selector}: エラー`);
      }
    }
    
    // ログインボタン特定
    console.log('\n🔍 ログインボタン特定:');
    const buttonCandidates = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button.btn1',
      'button.btn__primary',
      '#login_modal button.btn1',
      '#login_modal button.btn__primary',
      'button'
    ];
    
    let validButtonSelector = null;
    for (const selector of buttonCandidates) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`  ✅ ${selector}: ${elements.length}個`);
          
          for (let i = 0; i < Math.min(elements.length, 3); i++) {
            const buttonInfo = await page.$eval(selector, (el, index) => {
              const buttons = document.querySelectorAll(selector);
              const button = buttons[index];
              return {
                text: button.textContent?.trim(),
                visible: !!(button.offsetWidth && button.offsetHeight),
                className: button.className
              };
            }, i);
            
            console.log(`    ${i + 1}: "${buttonInfo.text}" (visible: ${buttonInfo.visible})`);
            
            if (buttonInfo.visible && buttonInfo.text?.includes('ログイン') && !validButtonSelector) {
              validButtonSelector = selector;
            }
          }
        } else {
          console.log(`  ❌ ${selector}: 要素なし`);
        }
      } catch (error) {
        console.log(`  ❌ ${selector}: エラー`);
      }
    }
    
    // Step 6: JavaScript動的要素確認
    console.log('\n📍 Phase 6: JavaScript動的読み込み確認');
    
    // Vue.js確認
    const hasVue = await page.evaluate(() => {
      return !!(window.Vue || document.querySelector('[data-v-]'));
    });
    console.log(`Vue.js検出: ${hasVue ? 'あり' : 'なし'}`);
    
    // React確認
    const hasReact = await page.evaluate(() => {
      return !!(window.React || document.querySelector('[data-reactroot]'));
    });
    console.log(`React検出: ${hasReact ? 'あり' : 'なし'}`);
    
    // 動的要素の待機が必要か確認
    console.log('\n⏳ 動的要素読み込み待機テスト...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 再度要素確認
    const inputsAfterWait = await page.$$eval('input', inputs => inputs.length);
    console.log(`3秒待機後のinput要素数: ${inputsAfterWait}個 (変化: ${inputsAfterWait !== allInputs.length ? 'あり' : 'なし'})`);
    
    // Step 7: 推奨セレクタ戦略
    console.log('\n📍 Phase 7: 推奨修正戦略');
    console.log('='.repeat(40));
    
    if (modalFound) {
      console.log('🎯 Gemini提案が正解: モーダルベースログイン');
      console.log('📝 推奨修正:');
      console.log('   - ログインモーダルの表示待機実装');
      console.log('   - モーダル内セレクタの使用');
    } else {
      console.log('🎯 通常フォームベースログイン');
    }
    
    if (validEmailSelector && validPasswordSelector && validButtonSelector) {
      console.log('\n✅ 推奨セレクタ（87個→3個に簡略化）:');
      console.log(`   メール: ${validEmailSelector}`);
      console.log(`   パスワード: ${validPasswordSelector}`);
      console.log(`   ログインボタン: ${validButtonSelector}`);
    } else {
      console.log('\n⚠️  一部セレクタが特定できません:');
      console.log(`   メール: ${validEmailSelector || '未特定'}`);
      console.log(`   パスワード: ${validPasswordSelector || '未特定'}`);
      console.log(`   ボタン: ${validButtonSelector || '未特定'}`);
    }
    
    console.log('\n🔧 Windserf提案対応:');
    console.log('   - 87個セレクタ → 3-5個に削減');
    console.log('   - setTimeout → waitForSelector使用');
    console.log('   - パスワード暗号化方式修正');
    
  } catch (error) {
    console.error('❌ 診断エラー:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🧹 ブラウザクリーンアップ完了');
    }
  }
}

// 診断実行
diagnoseFeelcycleLogin().catch(console.error);