import puppeteer from 'puppeteer-core';
const chromium = require('@sparticuz/chromium').default;

async function testCorrectScraper() {
  console.log('✅ 正しいスクレイピング実装 - 日付位置特定方式');
  console.log('='.repeat(70));

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

    // Step 2: 新宿スタジオ選択
    console.log('\n📍 Step 2: 新宿スタジオ選択');
    await page.waitForSelector('li.address_item.handle', { timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

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

    console.log('✅ 新宿スタジオ選択完了');

    // Step 3: レッスン一覧の完全読み込み待ち
    console.log('\n📍 Step 3: レッスン一覧の読み込み待ち');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await page.waitForSelector('.sc_list.active', { timeout: 30000 });

    // Step 4: 日付配列の取得と7/24の位置特定
    console.log('\n📍 Step 4: 日付配列の取得');
    
    const dateInfo = await page.evaluate(() => {
      const dateElements = document.querySelectorAll('.header-sc-list .content .days');
      const dates = Array.from(dateElements).map((el, index) => ({
        index,
        text: el.textContent?.trim() || '',
        isTarget: el.textContent?.includes('7/24') || el.textContent?.includes('24')
      }));
      
      return dates;
    });

    console.log('日付配列:');
    dateInfo.forEach(date => {
      const marker = date.isTarget ? ' ← 7/24' : '';
      console.log(`  ${date.index}: ${date.text}${marker}`);
    });

    const target724Index = dateInfo.findIndex(date => date.isTarget);
    if (target724Index === -1) {
      console.log('❌ 7/24が見つかりません');
      return;
    }

    console.log(`✅ 7/24の位置: ${target724Index}番目`);

    // Step 5: 7/24の列のレッスンを取得
    console.log('\n📍 Step 5: 7/24のレッスン取得');
    
    const lessons724 = await page.evaluate((targetIndex: number) => {
      const lessonColumns = document.querySelectorAll('.sc_list.active > .content');
      const lessons: any[] = [];
      
      if (lessonColumns[targetIndex]) {
        const targetColumn = lessonColumns[targetIndex];
        const lessonElements = targetColumn.querySelectorAll('.lesson.overflow_hidden');
        
        lessonElements.forEach(element => {
          const timeEl = element.querySelector('.time');
          const nameEl = element.querySelector('.lesson_name');
          const instructorEl = element.querySelector('.instructor');
          const statusEl = element.querySelector('.status');
          
          if (timeEl && nameEl && instructorEl) {
            const timeText = timeEl.textContent?.trim();
            const nameText = nameEl.textContent?.trim();
            const instructorText = instructorEl.textContent?.trim();
            const statusText = statusEl?.textContent?.trim();
            
            // 時間からstart/endを抽出
            const timeMatch = timeText?.match(/(\\d{1,2}:\\d{2})\\s*-\\s*(\\d{1,2}:\\d{2})/);
            if (timeMatch && nameText && instructorText) {
              const startTime = timeMatch[1];
              const endTime = timeMatch[2];
              
              // プログラムタイプを抽出
              const programMatch = nameText.match(/^(BSL|BB1|BB2|BB3|BSB|BSW|BSWi)/);
              const program = programMatch ? programMatch[1] : 'OTHER';
              
              // 空席判定
              const isAvailable = element.classList.contains('seat-available');
              
              lessons.push({
                time: timeText,
                startTime,
                endTime,
                name: nameText,
                instructor: instructorText,
                program,
                isAvailable,
                status: statusText || ''
              });
            }
          }
        });
      }
      
      return lessons;
    }, target724Index);

    console.log(`✅ 7/24のレッスン取得完了: ${lessons724.length}件`);

    // Step 6: 結果の表示と検証
    console.log('\n📍 Step 6: 新宿 7/24 レッスン一覧');
    console.log('='.repeat(80));
    
    if (lessons724.length > 0) {
      // 時間順にソート
      const sortedLessons = lessons724.sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      sortedLessons.forEach((lesson, index) => {
        const status = lesson.isAvailable ? '🟢 空きあり' : '🔴 満席';
        console.log(`  ${index + 1}. ${lesson.time} | ${lesson.name} (${lesson.instructor}) ${status}`);
        console.log(`     プログラム: ${lesson.program}`);
      });

      // 期待値との検証
      const firstLesson = sortedLessons[0];
      console.log('\n🎯 検証結果:');
      console.log(`最初のレッスン: ${firstLesson.time} ${firstLesson.name} ${firstLesson.instructor}`);
      
      const isCorrect = firstLesson.time.includes('07:00') && 
                       firstLesson.name.includes('BB2 NOW 1') && 
                       firstLesson.instructor.includes('Fuka');
      
      console.log(`期待値(07:00 BB2 NOW 1 Fuka)との一致: ${isCorrect ? '✅ 正しい' : '❌ 不正'}`);
      
      if (isCorrect) {
        console.log('\n🎉 SUCCESS: 正しい7/24新宿のレッスンデータを取得しました！');
        
        // サマリー
        const availableCount = sortedLessons.filter(l => l.isAvailable).length;
        const programCounts = sortedLessons.reduce((acc, lesson) => {
          acc[lesson.program] = (acc[lesson.program] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('\n📊 サマリー:');
        console.log(`  総レッスン数: ${sortedLessons.length}件`);
        console.log(`  空きあり: ${availableCount}件`);
        console.log(`  満席: ${sortedLessons.length - availableCount}件`);
        console.log(`  プログラム別: ${Object.entries(programCounts).map(([p, c]) => `${p}:${c}件`).join(', ')}`);
        
      } else {
        console.log('\n❌ 期待値と一致しませんでした。データを再確認してください。');
      }
      
    } else {
      console.log('❌ 7/24のレッスンが見つかりませんでした');
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await browser.close();
  }
}

testCorrectScraper().catch(console.error);