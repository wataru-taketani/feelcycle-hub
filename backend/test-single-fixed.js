const AWS = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const puppeteer = require('puppeteer');

const client = new AWS.DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STUDIOS_TABLE = 'feelcycle-hub-studios-dev';
const LESSONS_TABLE = 'feelcycle-hub-lessons-dev';

// 実際のスクレイピング処理（修正済み）
class CorrectRealScraper {
  static async searchAllLessons(studioCode) {
    console.log(`🔍 Testing scraping for studio: ${studioCode}`);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto('https://m.feelcycle.com/reserve', { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });
      
      await page.waitForSelector('li.address_item.handle', { timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log(`Selecting studio ${studioCode}...`);
      const studioSelected = await page.evaluate((targetCode) => {
        const studioElements = document.querySelectorAll('li.address_item.handle');
        for (const element of studioElements) {
          const codeElement = element.querySelector('.sub');
          if (codeElement) {
            const codeText = codeElement.textContent?.trim();
            if (codeText) {
              const codeMatch = codeText.match(/\(([^)]+)\)/);
              if (codeMatch && codeMatch[1] === targetCode) {
                element.click();
                return true;
              }
            }
          }
        }
        return false;
      }, studioCode);

      if (!studioSelected) {
        console.log(`❌ Studio ${studioCode} not found`);
        return [];
      }

      await new Promise(resolve => setTimeout(resolve, 6000));
      await page.waitForSelector('.header-sc-list .content .days', { timeout: 30000 });

      console.log(`Extracting lessons...`);
      
      const allLessonsData = await page.evaluate(() => {
        const dateElements = document.querySelectorAll('.header-sc-list .content .days');
        const dateMapping = Array.from(dateElements).map((el, index) => ({
          index,
          text: el.textContent?.trim() || ''
        }));

        const scList = document.querySelector('.sc_list.active');
        if (!scList) return [];

        const contentElements = scList.querySelectorAll(':scope > .content');
        const allLessons = [];

        contentElements.forEach((column, columnIndex) => {
          const dateInfo = dateMapping[columnIndex];
          if (!dateInfo) return;

          const dateText = dateInfo.text;
          let actualDate = '';
          
          const dateMatch = dateText.match(/(\d{1,2})\/(\d{1,2})/);
          if (dateMatch) {
            const month = parseInt(dateMatch[1]);
            const day = parseInt(dateMatch[2]);
            const currentYear = new Date().getFullYear();
            actualDate = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }

          const lessonElements = column.querySelectorAll('.lesson.overflow_hidden');
          
          lessonElements.forEach((element) => {
            const timeElement = element.querySelector('.time');
            const nameElement = element.querySelector('.lesson_name');
            const instructorElement = element.querySelector('.instructor');
            
            if (timeElement && nameElement && instructorElement) {
              const timeText = timeElement.textContent?.trim();
              const nameText = nameElement.textContent?.trim();
              const instructorText = instructorElement.textContent?.trim();
              
              if (timeText && nameText && actualDate) {
                allLessons.push({
                  date: actualDate,
                  time: timeText,
                  lessonName: nameText,
                  instructor: instructorText,
                  lastUpdated: new Date().toISOString()
                });
              }
            }
          });
        });
        
        return allLessons;
      });
      
      console.log(`✅ Found ${allLessonsData.length} lessons for ${studioCode}`);
      return allLessonsData;
      
    } catch (error) {
      console.error(`❌ Error scraping ${studioCode}:`, error.message);
      return [];
    } finally {
      await browser.close();
    }
  }
}

async function testSingleStudio() {
  console.log('🧪 Testing single studio with fixed data...');
  
  try {
    // SBY（渋谷）でテスト
    const testStudioCode = 'SBY';
    console.log(`Testing with studio: ${testStudioCode}`);
    
    const lessons = await CorrectRealScraper.searchAllLessons(testStudioCode);
    
    if (lessons.length > 0) {
      console.log(`✅ Success! Found ${lessons.length} lessons`);
      console.log('Sample lesson:', lessons[0]);
    } else {
      console.log('❌ No lessons found - possible issue remains');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSingleStudio().catch(console.error);