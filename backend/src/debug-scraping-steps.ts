import { RealFeelcycleScraper } from './services/real-scraper';
import puppeteer from 'puppeteer';

async function debugScrapingSteps() {
  console.log('🔍 FEELCYCLEスクレイピング ステップバイステップ確認');
  console.log('='.repeat(70));

  const browser = await puppeteer.launch({
    headless: false, // ブラウザを表示して確認
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-extensions'
    ],
    timeout: 60000
  });

  const page = await browser.newPage();

  try {
    // Step 1: サイトアクセス確認
    console.log('\n📍 Step 1: FEELCYCLEサイトへのアクセス確認');
    console.log('URL: https://m.feelcycle.com/reserve');
    
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.goto('https://m.feelcycle.com/reserve', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    const title = await page.title();
    console.log(`✅ ページタイトル: ${title}`);
    
    // Step 2: スタジオ一覧の確認
    console.log('\n📍 Step 2: スタジオ一覧の確認');
    
    await page.waitForSelector('li.address_item.handle', { timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const studioCount = await page.evaluate(() => {
      return document.querySelectorAll('li.address_item.handle').length;
    });
    console.log(`✅ スタジオ数: ${studioCount}件`);

    // 最初の5スタジオを表示
    const firstFiveStudios = await page.evaluate(() => {
      const studioElements = document.querySelectorAll('li.address_item.handle');
      const studios: Array<{name: string, code: string}> = [];
      
      for (let i = 0; i < Math.min(5, studioElements.length); i++) {
        const element = studioElements[i];
        const nameElement = element.querySelector('.main');
        const codeElement = element.querySelector('.sub');
        
        if (nameElement && codeElement) {
          const name = nameElement.textContent?.trim() || '';
          const codeText = codeElement.textContent?.trim() || '';
          const codeMatch = codeText.match(/\(([^)]+)\)/);
          const code = codeMatch ? codeMatch[1] : '';
          
          studios.push({ name, code });
        }
      }
      
      return studios;
    });

    console.log('最初の5スタジオ:');
    firstFiveStudios.forEach((studio, index) => {
      console.log(`  ${index + 1}. ${studio.name} (${studio.code})`);
    });

    // Step 3: 新宿スタジオの特定と選択
    console.log('\n📍 Step 3: 新宿スタジオの選択');
    
    const shinjukuFound = await page.evaluate(() => {
      const studioElements = document.querySelectorAll('li.address_item.handle');
      for (const element of studioElements) {
        const nameElement = element.querySelector('.main');
        const codeElement = element.querySelector('.sub');
        
        if (nameElement && codeElement) {
          const name = nameElement.textContent?.trim();
          const codeText = codeElement.textContent?.trim();
          
          if (name?.includes('新宿')) {
            const codeMatch = codeText?.match(/\(([^)]+)\)/);
            const code = codeMatch ? codeMatch[1] : '';
            return { name, code, found: true };
          }
        }
      }
      return { found: false };
    });

    if (shinjukuFound.found) {
      console.log(`✅ 新宿スタジオ発見: ${shinjukuFound.name} (${shinjukuFound.code})`);
      
      // 新宿スタジオをクリック
      const clickResult = await page.evaluate(() => {
        const studioElements = document.querySelectorAll('li.address_item.handle');
        for (const element of studioElements) {
          const nameElement = element.querySelector('.main');
          if (nameElement?.textContent?.includes('新宿')) {
            (element as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      
      console.log(`✅ 新宿スタジオクリック: ${clickResult ? '成功' : '失敗'}`);
      
      // 画面遷移を待つ
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } else {
      console.log('❌ 新宿スタジオが見つかりません');
      return;
    }

    // Step 4: 日付一覧の確認
    console.log('\n📍 Step 4: 日付一覧の確認');
    
    try {
      await page.waitForSelector('.header-sc-list .content', { timeout: 30000 });
      
      const dateInfo = await page.evaluate(() => {
        const dateElements = document.querySelectorAll('.header-sc-list .content .days');
        const dates: string[] = [];
        
        dateElements.forEach((element, index) => {
          const dateText = element.textContent?.trim();
          if (dateText && index < 7) { // 最初の7日分
            dates.push(dateText);
          }
        });
        
        return dates;
      });
      
      console.log(`✅ 日付リスト取得: ${dateInfo.length}件`);
      console.log('利用可能な日付:');
      dateInfo.forEach((date, index) => {
        console.log(`  ${index + 1}. ${date}`);
      });
      
      // 7/24を探す
      const target724 = dateInfo.find(date => date.includes('7/24') || date.includes('24'));
      if (target724) {
        console.log(`✅ 7/24発見: ${target724}`);
        
        // 7/24をクリック
        const dateClickResult = await page.evaluate(() => {
          const dateElements = document.querySelectorAll('.header-sc-list .content .days');
          for (const element of dateElements) {
            const dateText = element.textContent?.trim();
            if (dateText && (dateText.includes('7/24') || dateText.includes('24'))) {
              (element as HTMLElement).click();
              return true;
            }
          }
          return false;
        });
        
        console.log(`✅ 7/24クリック: ${dateClickResult ? '成功' : '失敗'}`);
        
        // レッスン一覧の読み込み待ち
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } else {
        console.log('❌ 7/24が見つかりません');
        return;
      }
      
    } catch (error) {
      console.log('❌ 日付一覧の取得に失敗:', error);
      return;
    }

    // Step 5: レッスン一覧の確認
    console.log('\n📍 Step 5: レッスン一覧の確認');
    
    try {
      await page.waitForSelector('.lesson.overflow_hidden', { timeout: 30000 });
      
      const lessonInfo = await page.evaluate(() => {
        const lessonElements = document.querySelectorAll('.lesson.overflow_hidden');
        const lessons: Array<{time: string, name: string, instructor: string, status: string}> = [];
        
        lessonElements.forEach((element, index) => {
          if (index < 10) { // 最初の10件
            const timeElement = element.querySelector('.time');
            const nameElement = element.querySelector('.lesson_name');
            const instructorElement = element.querySelector('.instructor');
            const statusElement = element.querySelector('.status');
            
            const time = timeElement?.textContent?.trim() || '';
            const name = nameElement?.textContent?.trim() || '';
            const instructor = instructorElement?.textContent?.trim() || '';
            const status = statusElement?.textContent?.trim() || '';
            
            lessons.push({ time, name, instructor, status });
          }
        });
        
        return lessons;
      });
      
      console.log(`✅ レッスン一覧取得: ${lessonInfo.length}件`);
      console.log('\n新宿 7/24 レッスン詳細（最初の10件）:');
      lessonInfo.forEach((lesson, index) => {
        console.log(`  ${index + 1}. ${lesson.time} | ${lesson.name} (${lesson.instructor})`);
        console.log(`     ステータス: ${lesson.status}`);
      });
      
    } catch (error) {
      console.log('❌ レッスン一覧の取得に失敗:', error);
    }

    console.log('\n🎯 ステップバイステップ確認完了');
    console.log('ブラウザは開いたままにしています。手動で確認してください。');
    console.log('確認が終わったらEnterキーを押してください...');
    
    // ユーザーの入力を待つ
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {
      process.exit();
    });

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

debugScrapingSteps().catch(console.error);