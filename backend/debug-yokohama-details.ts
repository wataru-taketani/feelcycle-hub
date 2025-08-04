import { RealFeelcycleScraper } from './src/services/real-scraper';
import puppeteer from 'puppeteer';

/**
 * 横浜スタジオのスクレイピング詳細デバッグ - URL構造とページ状態の確認
 */
async function debugYokohamaDetails() {
    console.log('=== FEELCYCLE 横浜スタジオ詳細デバッグ開始 ===\n');
    
    let browser = null;
    let page = null;

    try {
        // ブラウザー初期化
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            defaultViewport: { width: 1280, height: 720 },
            headless: false, // デバッグのため一時的にヘッドレスOFF
            timeout: 30000
        });
        page = await browser.newPage();
        
        // ユーザーエージェント設定
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        console.log('🌐 Step 1: 初期ページ（スタジオ選択ページ）にアクセス');
        console.log('URL: https://m.feelcycle.com/reserve');
        
        await page.goto('https://m.feelcycle.com/reserve', { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
        });
        
        // 現在のページURL確認
        const initialUrl = page.url();
        console.log(`実際のURL: ${initialUrl}`);
        
        // タイトル確認
        const title = await page.title();
        console.log(`ページタイトル: ${title}`);
        
        // スタジオリスト待機
        await page.waitForSelector('li.address_item.handle', { timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n📍 Step 2: 利用可能なスタジオリスト確認');
        const studios = await page.evaluate(() => {
            const studioElements = document.querySelectorAll('li.address_item.handle');
            return Array.from(studioElements).map(element => {
                const nameElement = element.querySelector('.main');
                const codeElement = element.querySelector('.sub');
                return {
                    name: nameElement?.textContent?.trim(),
                    codeText: codeElement?.textContent?.trim()
                };
            });
        });
        
        studios.forEach((studio, index) => {
            console.log(`${index + 1}. ${studio.name} - ${studio.codeText}`);
        });
        
        console.log('\n🎯 Step 3: 横浜スタジオを選択');
        const yokohamaSelected = await page.evaluate(() => {
            const studioElements = document.querySelectorAll('li.address_item.handle');
            for (const element of Array.from(studioElements)) {
                const codeElement = element.querySelector('.sub');
                if (codeElement) {
                    const codeText = codeElement.textContent?.trim();
                    if (codeText) {
                        const codeMatch = codeText.match(/\(([^)]+)\)/);
                        if (codeMatch && codeMatch[1].toLowerCase() === 'ykh') {
                            (element as HTMLElement).click();
                            return true;
                        }
                    }
                }
            }
            return false;
        });
        
        if (!yokohamaSelected) {
            throw new Error('横浜スタジオが見つかりません');
        }
        
        console.log('✅ 横浜スタジオ選択完了');
        
        // ページ遷移を待機
        await new Promise(resolve => setTimeout(resolve, 6000));
        
        // 遷移後のURL確認
        const afterSelectionUrl = page.url();
        console.log(`スタジオ選択後のURL: ${afterSelectionUrl}`);
        
        // スケジュール要素の待機
        console.log('\n📅 Step 4: スケジュール表示確認');
        try {
            await page.waitForSelector('.header-sc-list .content .days', { timeout: 30000 });
            console.log('✅ スケジュールセレクター発見');
        } catch (error) {
            console.log('❌ スケジュールセレクター待機失敗');
            
            // 現在のページの構造を調査
            const pageStructure = await page.evaluate(() => {
                const selectors = [
                    '.header-sc-list',
                    '.header-sc-list .content',
                    '.header-sc-list .content .days',
                    '.sc_list',
                    '.sc_list.active',
                    '.content'
                ];
                
                return selectors.map(selector => ({
                    selector,
                    exists: !!document.querySelector(selector),
                    count: document.querySelectorAll(selector).length
                }));
            });
            
            console.log('📊 ページ構造調査:');
            pageStructure.forEach(item => {
                console.log(`  ${item.selector}: 存在=${item.exists}, 数=${item.count}`);
            });
            
            throw error;
        }
        
        // 日付一覧取得
        const dates = await page.evaluate(() => {
            const dateElements = document.querySelectorAll('.header-sc-list .content .days');
            return Array.from(dateElements).map((el, index) => ({
                index,
                text: el.textContent?.trim() || ''
            }));
        });
        
        console.log(`利用可能な日付数: ${dates.length}`);
        dates.slice(0, 5).forEach(date => {
            console.log(`  ${date.index}: ${date.text}`);
        });
        
        // レッスンデータ構造確認
        console.log('\n🎵 Step 5: レッスンデータ構造確認');
        const lessonStructure = await page.evaluate(() => {
            const scList = document.querySelector('.sc_list.active');
            if (!scList) {
                return { scListExists: false };
            }
            
            const contentElements = scList.querySelectorAll(':scope > .content');
            const firstColumn = contentElements[0];
            
            if (!firstColumn) {
                return { scListExists: true, contentColumnsCount: 0 };
            }
            
            const lessonElements = firstColumn.querySelectorAll('.lesson.overflow_hidden');
            const firstLesson = lessonElements[0];
            
            if (!firstLesson) {
                return { 
                    scListExists: true, 
                    contentColumnsCount: contentElements.length,
                    lessonsInFirstColumn: 0 
                };
            }
            
            // 第1レッスンの詳細構造
            const timeElement = firstLesson.querySelector('.time');
            const nameElement = firstLesson.querySelector('.lesson_name');
            const instructorElement = firstLesson.querySelector('.instructor');
            const statusElement = firstLesson.querySelector('.status');
            
            return {
                scListExists: true,
                contentColumnsCount: contentElements.length,
                lessonsInFirstColumn: lessonElements.length,
                firstLessonStructure: {
                    hasTime: !!timeElement,
                    hasName: !!nameElement,
                    hasInstructor: !!instructorElement,
                    hasStatus: !!statusElement,
                    timeText: timeElement?.textContent?.trim(),
                    nameText: nameElement?.textContent?.trim(),
                    instructorText: instructorElement?.textContent?.trim(),
                    statusText: statusElement?.textContent?.trim(),
                    nameStyle: {
                        backgroundColor: (nameElement as HTMLElement)?.style?.backgroundColor,
                        color: (nameElement as HTMLElement)?.style?.color
                    },
                    isDisabled: firstLesson.classList.contains('seat-disabled')
                }
            };
        });
        
        console.log('レッスン構造詳細:');
        console.log(JSON.stringify(lessonStructure, null, 2));
        
        console.log('\n✅ 詳細デバッグ完了');
        
    } catch (error) {
        console.error('❌ デバッグ中にエラーが発生:', error);
        
        if (page) {
            // エラー時のスクリーンショット保存
            try {
                await page.screenshot({ path: 'debug-yokohama-error.png' });
                console.log('📸 エラー時のスクリーンショットを debug-yokohama-error.png に保存');
            } catch (screenshotError) {
                console.log('スクリーンショット保存失敗:', screenshotError);
            }
        }
        
        throw error;
    } finally {
        // クリーンアップ
        if (page) {
            await page.close();
        }
        if (browser) {
            await browser.close();
        }
        console.log('🧹 ブラウザクリーンアップ完了');
    }
}

// メイン実行
debugYokohamaDetails()
    .then(() => {
        console.log('\n=== デバッグ完了 ===');
        process.exit(0);
    })
    .catch((error) => {
        console.error('デバッグ実行中に予期しないエラー:', error);
        process.exit(1);
    });