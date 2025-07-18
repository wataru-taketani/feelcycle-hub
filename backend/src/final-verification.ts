import puppeteer from 'puppeteer';

async function finalVerification() {
  console.log('🔍 最終検証 - 7/24新宿レッスンの正確な取得');
  console.log('='.repeat(70));

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
    await new Promise(resolve => setTimeout(resolve, 6000));

    // 詳細なDOM構造確認
    const detailedAnalysis = await page.evaluate(() => {
      // 1. 日付ヘッダーの確認
      const dateElements = document.querySelectorAll('.header-sc-list .content .days');
      const dateMapping = Array.from(dateElements).map((el, index) => ({
        index,
        text: el.textContent?.trim() || '',
        is724: el.textContent?.includes('7/24')
      }));

      // 2. レッスン列の確認
      const scList = document.querySelector('.sc_list.active');
      if (!scList) {
        return { error: 'sc_list.active not found' };
      }

      const contentElements = scList.querySelectorAll(':scope > .content');
      const columns = Array.from(contentElements).map((col, index) => {
        const lessons = col.querySelectorAll('.lesson.overflow_hidden');
        const firstLesson = lessons[0];
        let lessonInfo = null;
        
        if (firstLesson) {
          const timeEl = firstLesson.querySelector('.time');
          const nameEl = firstLesson.querySelector('.lesson_name');
          const instructorEl = firstLesson.querySelector('.instructor');
          
          lessonInfo = {
            time: timeEl?.textContent?.trim(),
            name: nameEl?.textContent?.trim(),
            instructor: instructorEl?.textContent?.trim()
          };
        }

        return {
          index,
          className: col.className,
          lessonCount: lessons.length,
          firstLesson: lessonInfo
        };
      });

      // 3. 7/24の位置特定
      const date724Index = dateMapping.findIndex(d => d.is724);
      
      return {
        dateMapping,
        columns,
        date724Index,
        totalColumns: columns.length
      };
    });

    if (detailedAnalysis.error) {
      console.log(`❌ エラー: ${detailedAnalysis.error}`);
      return;
    }

    console.log('\n📅 日付マッピング:');
    detailedAnalysis.dateMapping?.forEach(date => {
      const marker = date.is724 ? ' ← 7/24' : '';
      console.log(`  ${date.index}: ${date.text}${marker}`);
    });

    console.log('\n📦 レッスン列情報:');
    detailedAnalysis.columns?.forEach(col => {
      const first = col.firstLesson;
      const firstInfo = first ? `${first.time} ${first.name} (${first.instructor})` : 'なし';
      console.log(`  ${col.index}: ${col.className} - ${col.lessonCount}件 - 最初: ${firstInfo}`);
    });

    console.log(`\n🎯 7/24の位置: ${detailedAnalysis.date724Index}`);

    // 実際に7/24のレッスンを取得
    if (detailedAnalysis.date724Index !== undefined && detailedAnalysis.date724Index >= 0 && detailedAnalysis.date724Index < (detailedAnalysis.totalColumns || 0)) {
      const lessons724 = await page.evaluate((targetIndex: number) => {
        const scList = document.querySelector('.sc_list.active');
        if (!scList) return [];

        const contentElements = scList.querySelectorAll(':scope > .content');
        const targetColumn = contentElements[targetIndex];
        
        if (!targetColumn) return [];

        const lessons = targetColumn.querySelectorAll('.lesson.overflow_hidden');
        const result: any[] = [];

        lessons.forEach(lesson => {
          const timeEl = lesson.querySelector('.time');
          const nameEl = lesson.querySelector('.lesson_name');
          const instructorEl = lesson.querySelector('.instructor');

          if (timeEl && nameEl && instructorEl) {
            const timeText = timeEl.textContent?.trim();
            const nameText = nameEl.textContent?.trim();
            const instructorText = instructorEl.textContent?.trim();

            if (timeText && nameText && instructorText) {
              result.push({
                time: timeText,
                name: nameText,
                instructor: instructorText
              });
            }
          }
        });

        return result;
      }, detailedAnalysis.date724Index);

      console.log(`\n📋 7/24の取得結果: ${(lessons724 as any[]).length}件`);
      
      if ((lessons724 as any[]).length > 0) {
        (lessons724 as any[]).forEach((lesson: any, index: number) => {
          console.log(`  ${index + 1}. ${lesson.time} | ${lesson.name} (${lesson.instructor})`);
        });

        // 07:00のレッスンを確認
        const lesson0700 = (lessons724 as any[]).find((l: any) => l.time.includes('07:00'));
        if (lesson0700) {
          console.log(`\n🎯 07:00のレッスン: ${lesson0700.time} ${lesson0700.name} ${lesson0700.instructor}`);
          
          const isCorrect = lesson0700.name.includes('BB2 NOW 1') && lesson0700.instructor.includes('Fuka');
          console.log(`期待値との一致: ${isCorrect ? '✅ 正しい' : '❌ 不正'}`);
          
          if (isCorrect) {
            console.log('\n🎉 SUCCESS: 7/24新宿のレッスンデータが正しく取得できました！');
          } else {
            console.log('\n⚠️  期待値と異なります。実際のサイトのデータと比較してください。');
          }
        } else {
          console.log('\n❌ 07:00のレッスンが見つかりませんでした');
        }
      } else {
        console.log('\n❌ 7/24のレッスンが取得できませんでした');
      }
    } else {
      console.log('\n❌ 7/24の位置が無効です');
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await browser.close();
  }
}

finalVerification().catch(console.error);