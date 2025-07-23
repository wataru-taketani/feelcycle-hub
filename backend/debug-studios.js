const puppeteer = require('puppeteer');

async function debugStudios() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('🌐 Navigating to FEELCYCLE reservation site...');
    await page.goto('https://m.feelcycle.com/reserve', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for studio list to load
    await page.waitForSelector('li.address_item.handle', { timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get all available studios
    const studios = await page.evaluate(() => {
      const studioElements = document.querySelectorAll('li.address_item.handle');
      const studios = [];
      
      studioElements.forEach((element, index) => {
        const nameElement = element.querySelector('.main');
        const codeElement = element.querySelector('.sub');
        
        if (nameElement && codeElement) {
          const name = nameElement.textContent?.trim();
          const codeText = codeElement.textContent?.trim();
          
          studios.push({
            index,
            name,
            codeText,
            fullHTML: element.innerHTML.substring(0, 200)
          });
        }
      });
      
      return studios;
    });
    
    console.log('📍 Found studios:');
    studios.forEach(studio => {
      console.log(`  ${studio.index}: ${studio.name} - ${studio.codeText}`);
    });
    
    // Wait for manual inspection
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugStudios().catch(console.error);