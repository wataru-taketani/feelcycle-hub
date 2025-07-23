import puppeteer from 'puppeteer-core';
const chromium = require('@sparticuz/chromium').default;

async function debugDetailedSteps() {
  console.log('🔍 FEELCYCLE 詳細ステップ確認');
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
    
    console.log('✅ サイトアクセス完了');

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

    console.log('✅ 新宿スタジオクリック実行');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: 現在表示されているスタジオタブの確認
    console.log('\n📍 Step 3: 現在のスタジオタブ確認');
    
    const currentStudioInfo = await page.evaluate(() => {
      // アクティブなタブを探す
      const activeTabs = document.querySelectorAll('.tab-content.active, .studio-tab.active, .selected, .current');
      const tabsInfo: any[] = [];
      
      activeTabs.forEach(tab => {
        tabsInfo.push({
          className: tab.className,
          textContent: tab.textContent?.trim().substring(0, 50) || '',
          tagName: tab.tagName
        });
      });

      // スタジオ名が表示されている場所を探す
      const studioNameElements = document.querySelectorAll('h1, h2, h3, .studio-name, .title, .header');
      const studioNames: any[] = [];
      
      studioNameElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.includes('新宿')) {
          studioNames.push({
            text: text.substring(0, 50),
            tagName: el.tagName,
            className: el.className
          });
        }
      });

      return {
        activeTabs: tabsInfo,
        studioNames: studioNames,
        url: window.location.href
      };
    });

    console.log('現在のページ情報:');
    console.log(`  URL: ${currentStudioInfo.url}`);
    console.log(`  アクティブタブ: ${currentStudioInfo.activeTabs.length}件`);
    currentStudioInfo.activeTabs.forEach((tab, index) => {
      console.log(`    ${index + 1}. ${tab.tagName}.${tab.className}: ${tab.textContent}`);
    });
    console.log(`  スタジオ名表示: ${currentStudioInfo.studioNames.length}件`);
    currentStudioInfo.studioNames.forEach((name, index) => {
      console.log(`    ${index + 1}. ${name.tagName}.${name.className}: ${name.text}`);
    });

    // Step 4: 利用可能なスタジオタブの確認
    console.log('\n📍 Step 4: 利用可能なスタジオタブの確認');
    
    const studioTabs = await page.evaluate(() => {
      // 一般的なタブセレクタを試す
      const tabSelectors = [
        '.tab', '.studio-tab', '.nav-tab', '.tab-item', 
        '[role="tab"]', '.tab-button', '.studio-button',
        '.tabs .tab', '.studio-tabs .tab', '.tab-list .tab'
      ];
      
      const foundTabs: any[] = [];
      
      tabSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          foundTabs.push({
            selector: selector,
            count: elements.length,
            samples: Array.from(elements).slice(0, 3).map(el => ({
              text: el.textContent?.trim().substring(0, 30) || '',
              className: el.className
            }))
          });
        }
      });

      return foundTabs;
    });

    console.log('利用可能なタブ:');
    studioTabs.forEach((tabInfo, index) => {
      console.log(`  ${index + 1}. ${tabInfo.selector}: ${tabInfo.count}件`);
      tabInfo.samples.forEach((sample: any, sIndex: number) => {
        console.log(`     ${sIndex + 1}. "${sample.text}" (${sample.className})`);
      });
    });

    // Step 5: 日付選択前の状態確認
    console.log('\n📍 Step 5: 日付選択前の状態確認');
    
    await page.waitForSelector('.header-sc-list .content .days', { timeout: 30000 });
    
    const dateSelectionInfo = await page.evaluate(() => {
      const dateElements = document.querySelectorAll('.header-sc-list .content .days');
      const dates = Array.from(dateElements).map(el => ({
        text: el.textContent?.trim() || '',
        className: el.className,
        isActive: el.classList.contains('active') || el.classList.contains('selected')
      }));

      return {
        totalDates: dates.length,
        dates: dates.slice(0, 7),
        currentSelection: dates.find(d => d.isActive)
      };
    });

    console.log(`日付選択状態:`);
    console.log(`  総日付数: ${dateSelectionInfo.totalDates}`);
    console.log(`  現在選択: ${dateSelectionInfo.currentSelection ? dateSelectionInfo.currentSelection.text : 'なし'}`);
    console.log(`  利用可能日付:`);
    dateSelectionInfo.dates.forEach((date, index) => {
      const status = date.isActive ? '(選択中)' : '';
      console.log(`    ${index + 1}. ${date.text} ${status}`);
    });

    // Step 6: 7/24選択
    console.log('\n📍 Step 6: 7/24選択');
    
    const dateClickResult = await page.evaluate(() => {
      const dateElements = document.querySelectorAll('.header-sc-list .content .days');
      for (const element of dateElements) {
        const dateText = element.textContent?.trim();
        if (dateText && (dateText.includes('7/24') || dateText.includes('24'))) {
          (element as HTMLElement).click();
          return { success: true, clickedDate: dateText };
        }
      }
      return { success: false, clickedDate: null };
    });

    console.log(`7/24選択結果: ${dateClickResult.success ? '成功' : '失敗'}`);
    if (dateClickResult.success) {
      console.log(`  クリックした日付: ${dateClickResult.clickedDate}`);
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 7: 選択後の状態確認
    console.log('\n📍 Step 7: 選択後の状態確認');
    
    const afterSelectionInfo = await page.evaluate(() => {
      const dateElements = document.querySelectorAll('.header-sc-list .content .days');
      const currentSelection = Array.from(dateElements).find(el => 
        el.classList.contains('active') || el.classList.contains('selected')
      );

      return {
        currentSelection: currentSelection ? {
          text: currentSelection.textContent?.trim(),
          className: currentSelection.className
        } : null,
        url: window.location.href
      };
    });

    console.log(`選択後の状態:`);
    console.log(`  現在選択されている日付: ${afterSelectionInfo.currentSelection ? afterSelectionInfo.currentSelection.text : 'なし'}`);
    console.log(`  URL: ${afterSelectionInfo.url}`);

    // Step 8: レッスン一覧の詳細確認
    console.log('\n📍 Step 8: レッスン一覧の詳細確認');
    
    await page.waitForSelector('.lesson.overflow_hidden', { timeout: 30000 });
    
    const lessonDetailInfo = await page.evaluate(() => {
      const lessonElements = document.querySelectorAll('.lesson.overflow_hidden');
      
      const lessons = Array.from(lessonElements).slice(0, 20).map((element, index) => {
        const timeEl = element.querySelector('.time');
        const nameEl = element.querySelector('.lesson_name');
        const instructorEl = element.querySelector('.instructor');
        const statusEl = element.querySelector('.status');
        
        return {
          index: index + 1,
          time: timeEl?.textContent?.trim() || '',
          name: nameEl?.textContent?.trim() || '',
          instructor: instructorEl?.textContent?.trim() || '',
          status: statusEl?.textContent?.trim() || '',
          classList: element.className
        };
      });

      // 時間でソート
      const sortedLessons = lessons.sort((a, b) => {
        const timeA = a.time.split(' - ')[0] || '';
        const timeB = b.time.split(' - ')[0] || '';
        return timeA.localeCompare(timeB);
      });

      return {
        totalLessons: lessonElements.length,
        lessons: lessons,
        sortedLessons: sortedLessons.slice(0, 10)
      };
    });

    console.log(`レッスン一覧詳細:`);
    console.log(`  総レッスン数: ${lessonDetailInfo.totalLessons}`);
    console.log(`  取得順序 (最初の10件):`);
    lessonDetailInfo.lessons.slice(0, 10).forEach(lesson => {
      console.log(`    ${lesson.index}. ${lesson.time} | ${lesson.name} (${lesson.instructor})`);
    });

    console.log(`  時間順ソート (最初の10件):`);
    lessonDetailInfo.sortedLessons.forEach((lesson, index) => {
      console.log(`    ${index + 1}. ${lesson.time} | ${lesson.name} (${lesson.instructor})`);
    });

    // Step 9: 期待値との比較
    console.log('\n📍 Step 9: 期待値との比較');
    
    const expectedFirst = '07:00 - 07:45 BB2 NOW 1 Fuka';
    const actualFirst = lessonDetailInfo.sortedLessons[0];
    
    console.log(`期待値: ${expectedFirst}`);
    console.log(`実際値: ${actualFirst ? `${actualFirst.time} ${actualFirst.name} ${actualFirst.instructor}` : 'データなし'}`);
    
    const isMatch = actualFirst && 
      actualFirst.time.includes('07:00') && 
      actualFirst.name.includes('BB2 NOW 1') && 
      actualFirst.instructor.includes('Fuka');
    
    console.log(`一致判定: ${isMatch ? '✅ 一致' : '❌ 不一致'}`);

    if (!isMatch) {
      console.log('\n🔍 不一致の原因分析:');
      console.log('  - スタジオ選択が正しくない可能性');
      console.log('  - 日付選択が正しくない可能性');
      console.log('  - レッスン一覧の読み込みが不完全な可能性');
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await browser.close();
  }
}

debugDetailedSteps().catch(console.error);