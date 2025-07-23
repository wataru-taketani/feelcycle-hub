"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
const chromium = require('@sparticuz/chromium').default;
async function testFixedScraper() {
    console.log('🔧 修正版スクレイピング - 日付選択なし');
    console.log('='.repeat(60));
    const browser = await puppeteer_core_1.default.launch({
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
        // 新宿スタジオをクリック
        await page.evaluate(() => {
            const studioElements = document.querySelectorAll('li.address_item.handle');
            for (const element of studioElements) {
                const nameEl = element.querySelector('.main');
                if (nameEl?.textContent?.includes('新宿')) {
                    element.click();
                    return;
                }
            }
        });
        console.log('✅ 新宿スタジオクリック実行');
        // Step 3: スタジオ選択後のレッスン一覧読み込み待ち
        console.log('\n📍 Step 3: レッスン一覧の読み込み待ち');
        await new Promise(resolve => setTimeout(resolve, 4000));
        // レッスン一覧が表示されるまで待つ
        await page.waitForSelector('.lesson.overflow_hidden', { timeout: 30000 });
        // Step 4: 全レッスンを取得
        console.log('\n📍 Step 4: 全レッスンの取得');
        const allLessons = await page.evaluate(() => {
            const lessonElements = document.querySelectorAll('.lesson.overflow_hidden');
            const lessons = [];
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
                        lessons.push({
                            time: timeText,
                            startTime,
                            endTime,
                            name: nameText,
                            instructor: instructorText,
                            status: statusText || ''
                        });
                    }
                }
            });
            return lessons;
        });
        console.log(`✅ 全レッスン取得完了: ${allLessons.length}件`);
        // Step 5: 日付別にグループ化
        console.log('\n📍 Step 5: 日付別レッスンの分析');
        // HTMLから日付とレッスンのマッピングを取得
        const dateColumnMapping = await page.evaluate(() => {
            const dateElements = document.querySelectorAll('.header-sc-list .content .days');
            const dates = [];
            dateElements.forEach(element => {
                const dateText = element.textContent?.trim();
                if (dateText) {
                    dates.push(dateText);
                }
            });
            return dates;
        });
        console.log(`日付一覧: ${dateColumnMapping.join(', ')}`);
        // Step 6: 7/24のレッスンを特定
        console.log('\n📍 Step 6: 7/24のレッスンを特定');
        // 7/24のレッスンを探す
        const date724Index = dateColumnMapping.findIndex(date => date.includes('7/24') || date.includes('24'));
        console.log(`7/24の位置: ${date724Index}`);
        if (date724Index === -1) {
            console.log('❌ 7/24が見つかりません');
            return;
        }
        // HTMLの構造から7/24のレッスンを抽出
        const lessons724 = await page.evaluate((targetDateIndex) => {
            const contentColumns = document.querySelectorAll('.sc_list.active .content');
            const lessons = [];
            if (contentColumns[targetDateIndex]) {
                const targetColumn = contentColumns[targetDateIndex];
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
                            lessons.push({
                                time: timeText,
                                startTime,
                                endTime,
                                name: nameText,
                                instructor: instructorText,
                                status: statusText || '',
                                isAvailable: !element.classList.contains('seat-disabled')
                            });
                        }
                    }
                });
            }
            return lessons;
        }, date724Index);
        console.log(`✅ 7/24のレッスン取得: ${lessons724.length}件`);
        // Step 7: 結果表示
        console.log('\n📍 Step 7: 新宿 7/24 レッスン一覧');
        console.log('='.repeat(70));
        if (lessons724.length > 0) {
            // 時間順にソート
            const sortedLessons = lessons724.sort((a, b) => a.startTime.localeCompare(b.startTime));
            sortedLessons.forEach((lesson, index) => {
                const status = lesson.isAvailable ? '🟢' : '🔴';
                console.log(`  ${index + 1}. ${lesson.time} | ${lesson.name} (${lesson.instructor}) ${status}`);
            });
            // 期待値との比較
            const expectedFirst = sortedLessons[0];
            console.log('\n🎯 検証結果:');
            console.log(`最初のレッスン: ${expectedFirst.time} ${expectedFirst.name} ${expectedFirst.instructor}`);
            const isCorrect = expectedFirst.time.includes('07:00') &&
                expectedFirst.name.includes('BB2 NOW 1') &&
                expectedFirst.instructor.includes('Fuka');
            console.log(`期待値との一致: ${isCorrect ? '✅ 正しい' : '❌ 不正'}`);
            if (isCorrect) {
                console.log('\n🎉 SUCCESS: 正しいスクレイピングが完了しました！');
            }
        }
        else {
            console.log('❌ 7/24のレッスンが見つかりませんでした');
        }
    }
    catch (error) {
        console.error('❌ エラー:', error);
    }
    finally {
        await browser.close();
    }
}
testFixedScraper().catch(console.error);
