const AWS = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const puppeteer = require('puppeteer');
const fs = require('fs');

// DynamoDB設定
const client = new AWS.DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STUDIOS_TABLE = 'feelcycle-hub-studios-dev';
const LESSONS_TABLE = 'feelcycle-hub-lessons-dev';

// 実行結果ログ
const executionLog = {
  startTime: new Date().toISOString(),
  studios: {},
  totalProcessed: 0,
  totalLessonsSaved: 0,
  errors: [],
  endTime: null,
  duration: null
};

class CorrectRealScraper {
  static async searchAllLessons(studioCode) {
    const studioStartTime = Date.now();
    console.log(`🔍 [${new Date().toISOString()}] Scraping lessons for studio: ${studioCode}`);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Step 1: Go to reservation site
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
        const error = `Studio ${studioCode} not found in site`;
        console.log(`❌ ${error}`);
        return { lessons: [], error };
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
      
      const duration = (Date.now() - studioStartTime) / 1000;
      console.log(`✅ Found ${allLessonsData.length} lessons for ${studioCode} (${duration.toFixed(1)}s)`);
      
      return { lessons: allLessonsData, error: null, duration };
      
    } catch (error) {
      const duration = (Date.now() - studioStartTime) / 1000;
      console.error(`❌ Error scraping ${studioCode} (${duration.toFixed(1)}s):`, error.message);
      return { lessons: [], error: error.message, duration };
    } finally {
      await browser.close();
    }
  }
}

async function refreshAllStudiosLessons() {
  console.log('🚀 Starting ALL STUDIOS lessons data refresh...');
  console.log(`📅 Start Time: ${executionLog.startTime}`);
  
  try {
    // スタジオ一覧を取得
    const studiosResult = await docClient.send(new ScanCommand({
      TableName: STUDIOS_TABLE
    }));
    
    const studios = studiosResult.Items || [];
    console.log(`📍 Found ${studios.length} studios to process`);
    
    // 各スタジオを順次処理（並列処理はサイトに負荷をかけるため避ける）
    for (let i = 0; i < studios.length; i++) {
      const studio = studios[i];
      const studioLog = {
        startTime: new Date().toISOString(),
        lessonsFound: 0,
        lessonsSaved: 0,
        errors: [],
        duration: null
      };
      
      console.log(`\n🏢 [${i + 1}/${studios.length}] Processing: ${studio.studioCode} (${studio.studioName})`);
      
      const scrapingResult = await CorrectRealScraper.searchAllLessons(studio.studioCode);
      studioLog.lessonsFound = scrapingResult.lessons.length;
      
      if (scrapingResult.error) {
        studioLog.errors.push(scrapingResult.error);
        executionLog.errors.push({
          studio: studio.studioCode,
          phase: 'scraping',
          error: scrapingResult.error
        });
      }
      
      // DynamoDBに保存
      for (const lesson of scrapingResult.lessons) {
        const ttl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
        
        try {
          const lessonDateTime = `${lesson.date}T${lesson.time}`;
          
          await docClient.send(new PutCommand({
            TableName: LESSONS_TABLE,
            Item: {
              studioCode: studio.studioCode,
              lessonDateTime: lessonDateTime,
              lessonDate: lesson.date,
              time: lesson.time,
              lessonName: lesson.lessonName,
              instructor: lesson.instructor,
              lastUpdated: lesson.lastUpdated,
              ttl: ttl
            }
          }));
          studioLog.lessonsSaved++;
          executionLog.totalLessonsSaved++;
        } catch (error) {
          const dbError = `Failed to save lesson: ${error.message}`;
          studioLog.errors.push(dbError);
          executionLog.errors.push({
            studio: studio.studioCode,
            phase: 'database',
            error: dbError
          });
        }
      }
      
      studioLog.duration = scrapingResult.duration;
      executionLog.studios[studio.studioCode] = studioLog;
      executionLog.totalProcessed++;
      
      console.log(`✅ Completed ${studio.studioCode}: ${studioLog.lessonsSaved}/${studioLog.lessonsFound} lessons saved`);
      
      // レート制限回避（サイトに負荷をかけない）
      if (i < studios.length - 1) {
        console.log('⏳ Waiting 3 seconds before next studio...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    executionLog.endTime = new Date().toISOString();
    executionLog.duration = (new Date(executionLog.endTime) - new Date(executionLog.startTime)) / 1000;
    
    console.log(`\n🎉 ALL STUDIOS refresh completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Studios processed: ${executionLog.totalProcessed}/${studios.length}`);
    console.log(`   - Total lessons saved: ${executionLog.totalLessonsSaved}`);
    console.log(`   - Total errors: ${executionLog.errors.length}`);
    console.log(`   - Total duration: ${(executionLog.duration / 60).toFixed(1)} minutes`);
    
    // 詳細ログをファイルに保存
    fs.writeFileSync(
      `all-studios-refresh-log-${Date.now()}.json`, 
      JSON.stringify(executionLog, null, 2)
    );
    
    if (executionLog.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      executionLog.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.studio} (${error.phase}): ${error.error}`);
      });
    }
    
  } catch (error) {
    executionLog.endTime = new Date().toISOString();
    executionLog.duration = (new Date(executionLog.endTime) - new Date(executionLog.startTime)) / 1000;
    console.error('❌ Critical error in all studios refresh:', error);
    
    // エラーログも保存
    fs.writeFileSync(
      `all-studios-refresh-error-${Date.now()}.json`, 
      JSON.stringify({ ...executionLog, criticalError: error.message }, null, 2)
    );
  }
}

refreshAllStudiosLessons().catch(console.error);