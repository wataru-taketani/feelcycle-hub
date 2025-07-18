import puppeteer from 'puppeteer';

async function debugFinalScraper() {
  console.log('🔧 最終デバッグ - DOM構造の詳細確認');
  console.log('='.repeat(60));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    timeout: 60000
  });

  const page = await browser.newPage();

  try {
    // サイトアクセス
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.goto('https://m.feelcycle.com/reserve', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });

    // 新宿スタジオ選択
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
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 現在のページの状態を詳細に確認
    const pageAnalysis = await page.evaluate(() => {
      // 複数のパターンでレッスン要素を探す
      const selectors = [
        '.lesson.overflow_hidden',
        '.lesson',
        '[class*="lesson"]',
        '[class*="overflow_hidden"]',
        '.time',
        '.lesson_name',
        '.instructor'
      ];

      const results: any = {};

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        results[selector] = {
          count: elements.length,
          samples: Array.from(elements).slice(0, 3).map(el => ({
            tagName: el.tagName,
            className: el.className,
            textContent: el.textContent?.trim().substring(0, 50) || ''
          }))
        };
      });

      // 特定の日付カラムを探す
      const dateColumns = document.querySelectorAll('.header-sc-list .content');
      const dateColumnInfo = Array.from(dateColumns).map((col, index) => ({
        index,
        text: col.textContent?.trim(),
        className: col.className
      }));

      // レッスン一覧のコンテナを探す
      const containers = document.querySelectorAll('.sc_list, .content, .content_inner');
      const containerInfo = Array.from(containers).map((container, index) => ({
        index,
        tagName: container.tagName,
        className: container.className,
        childCount: container.children.length,
        hasLessons: container.querySelectorAll('[class*="lesson"]').length > 0
      }));

      return {
        selectors: results,
        dateColumns: dateColumnInfo,
        containers: containerInfo,
        url: window.location.href
      };
    });

    console.log('\n📊 ページ分析結果:');
    console.log(`URL: ${pageAnalysis.url}`);
    
    console.log('\n🔍 セレクタ別要素数:');
    Object.entries(pageAnalysis.selectors).forEach(([selector, info]: [string, any]) => {
      console.log(`  ${selector}: ${info.count}件`);
      if (info.samples.length > 0) {
        info.samples.forEach((sample: any, index: number) => {
          console.log(`    ${index + 1}. ${sample.tagName}.${sample.className}: "${sample.textContent}"`);
        });
      }
    });

    console.log('\n📅 日付カラム情報:');
    pageAnalysis.dateColumns.forEach((col: any) => {
      console.log(`  ${col.index}: ${col.text} (${col.className})`);
    });

    console.log('\n📦 コンテナ情報:');
    pageAnalysis.containers.forEach((container: any) => {
      console.log(`  ${container.index}: ${container.tagName}.${container.className} (${container.childCount}子要素, レッスン: ${container.hasLessons})`);
    });

    // 最も可能性の高いセレクタでレッスンを取得
    const lessons = await page.evaluate(() => {
      // 複数のセレクタを試す
      const possibleSelectors = [
        '.lesson.overflow_hidden',
        '[class*="lesson"][class*="overflow_hidden"]',
        '.lesson',
        '[class*="lesson"]'
      ];

      let lessons: any[] = [];

      for (const selector of possibleSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Using selector: ${selector}, found ${elements.length} elements`);
          
          elements.forEach(element => {
            const timeEl = element.querySelector('.time') || element.querySelector('[class*="time"]');
            const nameEl = element.querySelector('.lesson_name') || element.querySelector('[class*="lesson_name"]');
            const instructorEl = element.querySelector('.instructor') || element.querySelector('[class*="instructor"]');
            
            if (timeEl && nameEl && instructorEl) {
              const timeText = timeEl.textContent?.trim();
              const nameText = nameEl.textContent?.trim();
              const instructorText = instructorEl.textContent?.trim();
              
              if (timeText && nameText && instructorText) {
                lessons.push({
                  time: timeText,
                  name: nameText,
                  instructor: instructorText,
                  selector: selector
                });
              }
            }
          });
          
          if (lessons.length > 0) {
            break; // 最初に成功したセレクタを使用
          }
        }
      }

      return lessons;
    });

    console.log(`\n🎯 取得されたレッスン数: ${lessons.length}`);
    
    if (lessons.length > 0) {
      console.log('\n📋 取得されたレッスン (最初の20件):');
      lessons.slice(0, 20).forEach((lesson: any, index: number) => {
        console.log(`  ${index + 1}. ${lesson.time} | ${lesson.name} (${lesson.instructor}) [${lesson.selector}]`);
      });

      // 07:00のレッスンを探す
      const lesson0700 = lessons.find((lesson: any) => lesson.time.includes('07:00'));
      if (lesson0700) {
        console.log(`\n🎯 07:00のレッスン発見: ${lesson0700.time} ${lesson0700.name} ${lesson0700.instructor}`);
        
        const isCorrect = lesson0700.name.includes('BB2 NOW 1') && lesson0700.instructor.includes('Fuka');
        console.log(`期待値との一致: ${isCorrect ? '✅' : '❌'}`);
      } else {
        console.log('\n❌ 07:00のレッスンが見つかりませんでした');
      }

    } else {
      console.log('\n❌ レッスンが一件も取得できませんでした');
      
      // さらに詳細なDOM確認
      const deepDomAnalysis = await page.evaluate(() => {
        const allElements = document.querySelectorAll('*');
        const elementsByTag: any = {};
        
        Array.from(allElements).forEach(el => {
          const tagName = el.tagName;
          if (!elementsByTag[tagName]) {
            elementsByTag[tagName] = 0;
          }
          elementsByTag[tagName]++;
        });

        // 時間らしいテキストを持つ要素を探す
        const timeElements = Array.from(allElements).filter(el => {
          const text = el.textContent?.trim();
          return text && text.match(/\\d{1,2}:\\d{2}\\s*-\\s*\\d{1,2}:\\d{2}/);
        });

        return {
          totalElements: allElements.length,
          elementsByTag: Object.entries(elementsByTag).sort(([,a], [,b]) => (b as number) - (a as number)).slice(0, 10),
          timeElements: timeElements.slice(0, 10).map(el => ({
            tagName: el.tagName,
            className: el.className,
            textContent: el.textContent?.trim()
          }))
        };
      });

      console.log('\n🔍 深度DOM分析:');
      console.log(`総要素数: ${deepDomAnalysis.totalElements}`);
      console.log('主要タグ:');
      deepDomAnalysis.elementsByTag.forEach(([tag, count]: [string, any]) => {
        console.log(`  ${tag}: ${count}個`);
      });
      
      console.log('\n⏰ 時間らしいテキストを持つ要素:');
      deepDomAnalysis.timeElements.forEach((el: any, index: number) => {
        console.log(`  ${index + 1}. ${el.tagName}.${el.className}: "${el.textContent}"`);
      });
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await browser.close();
  }
}

debugFinalScraper().catch(console.error);