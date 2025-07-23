import puppeteer from 'puppeteer-core';
const chromium = require('@sparticuz/chromium').default;

async function debugSimpleSteps() {
  console.log('🔍 FEELCYCLE ステップ確認（シンプル版）');
  console.log('='.repeat(60));

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
    executablePath: await chromium.executablePath(),
    headless: true,
    timeout: 60000
  });

  const page = await browser.newPage();

  try {
    // Step 1: サイトアクセス
    console.log('\n📍 Step 1: サイトアクセス');
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.goto('https://m.feelcycle.com/reserve', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    const title = await page.title();
    console.log(`✅ ページタイトル: ${title}`);

    // Step 2: スタジオ一覧確認
    console.log('\n📍 Step 2: スタジオ一覧確認');
    
    await page.waitForSelector('li.address_item.handle', { timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const studios = await page.$$eval('li.address_item.handle', elements => {
      return elements.slice(0, 10).map(element => {
        const nameEl = element.querySelector('.main');
        const codeEl = element.querySelector('.sub');
        
        const name = nameEl?.textContent?.trim() || '';
        const codeText = codeEl?.textContent?.trim() || '';
        const codeMatch = codeText.match(/\(([^)]+)\)/);
        const code = codeMatch ? codeMatch[1] : '';
        
        return { name, code };
      });
    });

    console.log(`✅ スタジオ数確認完了`);
    studios.forEach((studio, index) => {
      console.log(`  ${index + 1}. ${studio.name} (${studio.code})`);
    });

    // 新宿スタジオ確認
    const shinjukuStudio = studios.find(s => s.name.includes('新宿'));
    if (shinjukuStudio) {
      console.log(`✅ 新宿スタジオ発見: ${shinjukuStudio.name} (${shinjukuStudio.code})`);
    } else {
      console.log('❌ 新宿スタジオが見つかりません');
      await browser.close();
      return;
    }

    // Step 3: 新宿スタジオ選択
    console.log('\n📍 Step 3: 新宿スタジオ選択');
    
    await page.evaluate(() => {
      const studioElements = document.querySelectorAll('li.address_item.handle');
      for (const element of studioElements) {
        const nameEl = element.querySelector('.main');
        if (nameEl?.textContent?.includes('新宿')) {
          (element as HTMLElement).click();
          return;
        }
      }
    });

    console.log('✅ 新宿スタジオクリック実行');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 4: 日付一覧確認
    console.log('\n📍 Step 4: 日付一覧確認');
    
    await page.waitForSelector('.header-sc-list .content .days', { timeout: 30000 });
    
    const dates = await page.$$eval('.header-sc-list .content .days', elements => {
      return elements.slice(0, 7).map(el => el.textContent?.trim() || '');
    });

    console.log(`✅ 日付一覧取得: ${dates.length}件`);
    dates.forEach((date, index) => {
      console.log(`  ${index + 1}. ${date}`);
    });

    // 7/24を探す
    const target724 = dates.find(date => date.includes('24') || date.includes('7/24'));
    if (!target724) {
      console.log('❌ 7/24が見つかりません');
      await browser.close();
      return;
    }

    console.log(`✅ 7/24発見: ${target724}`);

    // Step 5: 7/24選択
    console.log('\n📍 Step 5: 7/24選択');
    
    await page.evaluate(() => {
      const dateElements = document.querySelectorAll('.header-sc-list .content .days');
      for (const element of dateElements) {
        const dateText = element.textContent?.trim();
        if (dateText && (dateText.includes('24') || dateText.includes('7/24'))) {
          (element as HTMLElement).click();
          return;
        }
      }
    });

    console.log('✅ 7/24クリック実行');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 6: レッスン一覧確認
    console.log('\n📍 Step 6: レッスン一覧確認');
    
    await page.waitForSelector('.lesson.overflow_hidden', { timeout: 30000 });
    
    const lessons = await page.$$eval('.lesson.overflow_hidden', elements => {
      return elements.slice(0, 15).map(element => {
        const timeEl = element.querySelector('.time');
        const nameEl = element.querySelector('.lesson_name');
        const instructorEl = element.querySelector('.instructor');
        
        return {
          time: timeEl?.textContent?.trim() || '',
          name: nameEl?.textContent?.trim() || '',
          instructor: instructorEl?.textContent?.trim() || ''
        };
      });
    });

    console.log(`✅ レッスン一覧取得: ${lessons.length}件`);
    console.log('\n新宿 7/24 実際のレッスン:');
    lessons.forEach((lesson, index) => {
      console.log(`  ${index + 1}. ${lesson.time} | ${lesson.name} (${lesson.instructor})`);
    });

    // 期待値との比較
    const expected = '07:00 - 07:45 BB2 NOW 1 Fuka';
    const actual = lessons[0] ? `${lessons[0].time} ${lessons[0].name} ${lessons[0].instructor}` : 'データなし';
    
    console.log('\n🎯 検証結果:');
    console.log(`期待値: ${expected}`);
    console.log(`実際値: ${actual}`);
    console.log(`一致: ${actual.includes('BB2 NOW 1') && actual.includes('Fuka') ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await browser.close();
  }
}

debugSimpleSteps().catch(console.error);