const AWS = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const puppeteer = require('puppeteer');

// DynamoDB設定
const client = new AWS.DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STUDIOS_TABLE = 'feelcycle-hub-studios-dev';
const LESSONS_TABLE = 'feelcycle-hub-lessons-dev';

class CorrectRealScraper {
  static async searchAllLessons(studioCode) {
    console.log(`🔍 Scraping lessons for studio: ${studioCode}`);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Step 1: Go to reservation site (correct URL)
      await page.goto('https://m.feelcycle.com/reserve', { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });
      
      // Wait for studio list to load
      await page.waitForSelector('li.address_item.handle', { timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Select studio
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

      // Wait for schedule to load
      await new Promise(resolve => setTimeout(resolve, 6000));
      await page.waitForSelector('.header-sc-list .content .days', { timeout: 30000 });

      // Step 3: Extract all lessons
      console.log(`Extracting all lessons for all dates...`);
      
      const allLessonsData = await page.evaluate(() => {
        // Get date mapping
        const dateElements = document.querySelectorAll('.header-sc-list .content .days');
        const dateMapping = Array.from(dateElements).map((el, index) => ({
          index,
          text: el.textContent?.trim() || ''
        }));

        // Get lesson container
        const scList = document.querySelector('.sc_list.active');
        if (!scList) {
          return [];
        }

        const contentElements = scList.querySelectorAll(':scope > .content');
        const allLessons = [];

        // Extract lessons from each date column
        contentElements.forEach((column, columnIndex) => {
          const dateInfo = dateMapping[columnIndex];
          if (!dateInfo) return;

          // Parse date text
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

async function refreshTodaysLessons() {
  console.log('🚀 Starting manual lessons refresh for today (7/20)...');
  
  try {
    // Test with one studio first (correct studio code: SBY)
    const testStudio = { studioCode: 'SBY', studioName: 'FEELCYCLE 渋谷' };
    console.log(`\\n🏢 Testing with studio: ${testStudio.studioCode}`);
    
    const lessons = await CorrectRealScraper.searchAllLessons(testStudio.studioCode);
    
    let savedCount = 0;
    // Save to DynamoDB
    for (const lesson of lessons) {
      const ttl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
      
      try {
        // Create lessonDateTime for DynamoDB key
        const lessonDateTime = `${lesson.date}T${lesson.time}`;
        
        await docClient.send(new PutCommand({
          TableName: LESSONS_TABLE,
          Item: {
            studioCode: testStudio.studioCode,
            lessonDateTime: lessonDateTime,
            lessonDate: lesson.date,
            time: lesson.time,
            lessonName: lesson.lessonName,
            instructor: lesson.instructor,
            lastUpdated: lesson.lastUpdated,
            ttl: ttl
          }
        }));
        savedCount++;
      } catch (error) {
        console.error(`❌ Failed to save lesson:`, error.message);
      }
    }
    
    console.log(`\\n🎉 Test completed! Saved ${savedCount} lessons for ${testStudio.studioCode}`);
    
  } catch (error) {
    console.error('❌ Manual refresh failed:', error);
  }
}

refreshTodaysLessons().catch(console.error);