const puppeteer = require('puppeteer');

async function debugScraping() {
  const browser = await puppeteer.launch({
    headless: false, // ブラウザを表示してデバッグ
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    const url = 'https://www.feelcycle.com/reserve/shibuya/';
    console.log(`🌐 Navigating to: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // ページの基本情報を取得
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyHTML: document.body.innerHTML.substring(0, 1000) + '...' // 最初の1000文字のみ
      };
    });
    
    console.log('📄 Page Info:', {
      title: pageInfo.title,
      url: pageInfo.url
    });
    
    // 利用可能なクラス名を探す
    const availableClasses = await page.evaluate(() => {
      const elements = document.querySelectorAll('*[class]');
      const classes = new Set();
      elements.forEach(el => {
        el.classList.forEach(cls => classes.add(cls));
      });
      return Array.from(classes).filter(cls => 
        cls.includes('lesson') || 
        cls.includes('day') || 
        cls.includes('time') ||
        cls.includes('schedule') ||
        cls.includes('class')
      ).sort();
    });
    
    console.log('🎯 Found relevant CSS classes:', availableClasses);
    
    // スケジュール関連の要素を探す
    const scheduleElements = await page.evaluate(() => {
      const selectors = [
        '.schedule',
        '.lesson',
        '.class',
        '.day',
        '.time',
        '[class*="lesson"]',
        '[class*="schedule"]',
        '[class*="day"]',
        '[class*="time"]'
      ];
      
      const results = {};
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          results[selector] = {
            count: elements.length,
            samples: Array.from(elements).slice(0, 3).map(el => ({
              tagName: el.tagName,
              className: el.className,
              textContent: el.textContent?.trim().substring(0, 100)
            }))
          };
        }
      });
      
      return results;
    });
    
    console.log('📊 Schedule elements found:', JSON.stringify(scheduleElements, null, 2));
    
    // 5秒待機してページを確認
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('❌ Debug scraping failed:', error);
  } finally {
    await browser.close();
  }
}

debugScraping().catch(console.error);