import puppeteer from 'puppeteer';

async function debugTabStructure() {
  console.log('🔍 スタジオタブ構造の詳細調査');
  console.log('='.repeat(60));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    timeout: 60000
  });

  const page = await browser.newPage();

  try {
    // サイトアクセス
    console.log('\n📍 Step 1: サイトアクセス');
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.goto('https://m.feelcycle.com/reserve', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });

    // 新宿スタジオ選択
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

    await new Promise(resolve => setTimeout(resolve, 4000));

    // 全体のHTML構造を調査
    console.log('\n📍 Step 3: 全体のHTML構造調査');
    
    const htmlStructure = await page.evaluate(() => {
      // 様々な可能性のあるタブ構造を探す
      const possibleTabSelectors = [
        // 一般的なタブ
        '.tab', '.tabs', '.tab-container', '.tab-wrapper',
        '.nav-tabs', '.nav-tab', '.navigation-tabs',
        '.studio-tab', '.studio-tabs', '.studio-nav',
        // Bootstrap系
        '.nav.nav-tabs', '.nav.nav-pills', '.nav-tabs .nav-item',
        // 特定のクラス
        '.header-sc-list', '.sc-list', '.studio-list',
        // 汎用的なナビゲーション
        'nav', '.navigation', '.nav', '.menu',
        // ul/li構造
        'ul.tabs', 'ul.nav-tabs', 'ul.studio-tabs'
      ];

      const foundStructures: any[] = [];

      possibleTabSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach((element, index) => {
            const children = element.children;
            if (children.length > 0) {
              foundStructures.push({
                selector: selector,
                index: index,
                tagName: element.tagName,
                className: element.className,
                childCount: children.length,
                children: Array.from(children).slice(0, 5).map(child => ({
                  tagName: child.tagName,
                  className: child.className,
                  text: child.textContent?.trim().substring(0, 30) || ''
                }))
              });
            }
          });
        }
      });

      return foundStructures;
    });

    console.log('発見されたタブ構造候補:');
    htmlStructure.forEach((structure, index) => {
      console.log(`  ${index + 1}. ${structure.selector} (${structure.tagName}.${structure.className})`);
      console.log(`     子要素: ${structure.childCount}個`);
      structure.children.forEach((child: any, childIndex: number) => {
        console.log(`       ${childIndex + 1}. ${child.tagName}.${child.className}: "${child.text}"`);
      });
    });

    // 日付選択後のタブ構造を確認
    console.log('\n📍 Step 4: 日付選択してタブ構造確認');
    
    await page.waitForSelector('.header-sc-list .content .days', { timeout: 30000 });
    
    // 7/24選択
    await page.evaluate(() => {
      const dateElements = document.querySelectorAll('.header-sc-list .content .days');
      for (const element of dateElements) {
        const dateText = element.textContent?.trim();
        if (dateText && (dateText.includes('7/24') || dateText.includes('24'))) {
          (element as HTMLElement).click();
          return;
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    // 日付選択後のタブ構造を再調査
    const tabStructureAfterDate = await page.evaluate(() => {
      // 日付選択後に現れるタブ構造を探す
      const tabContainers = document.querySelectorAll('.header-sc-list, .tabs, .tab-container, .studio-tabs');
      
      const structures: any[] = [];
      
      tabContainers.forEach((container, containerIndex) => {
        const allChildren = container.querySelectorAll('*');
        const studioElements: any[] = [];
        
        // 新宿、渋谷、池袋などのスタジオ名を含む要素を探す
        allChildren.forEach(element => {
          const text = element.textContent?.trim();
          if (text && (
            text.includes('新宿') || text.includes('渋谷') || text.includes('池袋') ||
            text.includes('銀座') || text.includes('六本木') || text.includes('恵比寿') ||
            text.includes('SJK') || text.includes('SBY') || text.includes('IKB')
          )) {
            studioElements.push({
              tagName: element.tagName,
              className: element.className,
              text: text.substring(0, 20),
              isClickable: element.tagName === 'BUTTON' || element.tagName === 'A' || element.classList.contains('clickable'),
              hasClickHandler: element.tagName === 'BUTTON' || element.tagName === 'A'
            });
          }
        });

        if (studioElements.length > 0) {
          structures.push({
            containerIndex: containerIndex,
            containerClass: container.className,
            containerTag: container.tagName,
            studioElements: studioElements
          });
        }
      });

      return structures;
    });

    console.log('日付選択後のスタジオタブ構造:');
    tabStructureAfterDate.forEach((structure, index) => {
      console.log(`  ${index + 1}. ${structure.containerTag}.${structure.containerClass}`);
      console.log(`     スタジオ要素: ${structure.studioElements.length}個`);
      structure.studioElements.forEach((element: any, elementIndex: number) => {
        const clickable = element.isClickable ? ' (クリック可能)' : '';
        console.log(`       ${elementIndex + 1}. ${element.tagName}.${element.className}: "${element.text}"${clickable}`);
      });
    });

    // 実際のDOM構造をより詳しく見る
    console.log('\n📍 Step 5: DOM構造の詳細確認');
    
    const domStructure = await page.evaluate(() => {
      // .header-sc-listの詳細構造を確認
      const headerScList = document.querySelector('.header-sc-list');
      if (headerScList) {
        const getElementInfo = (element: Element): any => {
          return {
            tagName: element.tagName,
            className: element.className,
            id: element.id,
            text: element.textContent?.trim().substring(0, 30) || '',
            childCount: element.children.length,
            children: Array.from(element.children).slice(0, 10).map(child => getElementInfo(child))
          };
        };

        return {
          found: true,
          structure: getElementInfo(headerScList)
        };
      }
      
      return { found: false };
    });

    if (domStructure.found) {
      console.log('header-sc-listの構造:');
      
      const printStructure = (element: any, depth: number = 0) => {
        const indent = '  '.repeat(depth);
        console.log(`${indent}${element.tagName}.${element.className}${element.id ? '#' + element.id : ''}: "${element.text}"`);
        
        if (element.children && element.children.length > 0 && depth < 3) {
          element.children.forEach((child: any) => {
            printStructure(child, depth + 1);
          });
        }
      };

      printStructure(domStructure.structure);
    }

    // 現在のレッスン一覧を確認
    console.log('\n📍 Step 6: 現在のレッスン一覧確認');
    
    const currentLessons = await page.evaluate(() => {
      const lessonElements = document.querySelectorAll('.lesson.overflow_hidden');
      return {
        total: lessonElements.length,
        first10: Array.from(lessonElements).slice(0, 10).map((element, index) => {
          const timeEl = element.querySelector('.time');
          const nameEl = element.querySelector('.lesson_name');
          const instructorEl = element.querySelector('.instructor');
          
          return {
            index: index + 1,
            time: timeEl?.textContent?.trim() || '',
            name: nameEl?.textContent?.trim() || '',
            instructor: instructorEl?.textContent?.trim() || ''
          };
        })
      };
    });

    console.log(`現在のレッスン一覧: ${currentLessons.total}件`);
    console.log('最初の10件:');
    currentLessons.first10.forEach(lesson => {
      console.log(`  ${lesson.index}. ${lesson.time} | ${lesson.name} (${lesson.instructor})`);
    });

    // 期待される07:00のレッスンが存在するかチェック
    const hasExpectedLesson = currentLessons.first10.some(lesson => 
      lesson.time.includes('07:00') && lesson.name.includes('BB2 NOW 1') && lesson.instructor.includes('Fuka')
    );

    console.log(`\n🎯 期待されるレッスン(07:00 BB2 NOW 1 Fuka)の存在: ${hasExpectedLesson ? '✅ あり' : '❌ なし'}`);

    if (!hasExpectedLesson) {
      console.log('\n📝 次のステップの提案:');
      console.log('1. スタジオタブの正確なセレクタを特定する');
      console.log('2. 新宿タブが正しく選択されているかを確認する');
      console.log('3. タブ切り替え後のレッスン一覧を再取得する');
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await browser.close();
  }
}

debugTabStructure().catch(console.error);