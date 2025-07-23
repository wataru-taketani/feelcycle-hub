const AWS = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const puppeteer = require('puppeteer');

// DynamoDB設定
const client = new AWS.DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STUDIOS_TABLE = 'feelcycle-hub-studios-dev';
const LESSONS_TABLE = 'feelcycle-hub-lessons-dev';

// 簡単な実スクレイパー
class SimpleRealScraper {
  static async searchAllLessons(studioCode) {
    console.log(`🔍 Scraping lessons for studio: ${studioCode}`);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const url = `https://www.feelcycle.com/reserve/${studioCode}/`;
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // レッスンデータを取得
      const lessons = await page.evaluate(() => {
        const lessons = [];
        const dateElements = document.querySelectorAll('.header-sc-list .content .days');
        
        dateElements.forEach((dateEl) => {
          const dateText = dateEl.querySelector('.day')?.textContent?.trim();
          if (!dateText) return;
          
          const lessonElements = dateEl.querySelectorAll('.lesson-item');
          lessonElements.forEach((lessonEl) => {
            const timeText = lessonEl.querySelector('.time')?.textContent?.trim();
            const nameText = lessonEl.querySelector('.name')?.textContent?.trim();
            const instructorText = lessonEl.querySelector('.instructor')?.textContent?.trim();
            
            if (timeText && nameText) {
              lessons.push({
                date: dateText,
                time: timeText,
                lessonName: nameText,
                instructor: instructorText || '',
                lastUpdated: new Date().toISOString()
              });
            }
          });
        });
        
        return lessons;
      });
      
      console.log(`✅ Found ${lessons.length} lessons for ${studioCode}`);
      return lessons;
      
    } catch (error) {
      console.error(`❌ Error scraping ${studioCode}:`, error.message);
      return [];
    } finally {
      await browser.close();
    }
  }
}

async function refreshLessonsData() {
  console.log('🚀 Starting manual lessons data refresh...');
  
  try {
    // スタジオ一覧を取得
    const studiosResult = await docClient.send(new ScanCommand({
      TableName: STUDIOS_TABLE
    }));
    
    const studios = studiosResult.Items || [];
    console.log(`📍 Found ${studios.length} studios to process`);
    
    let totalLessons = 0;
    
    // 各スタジオのレッスンデータを取得
    for (const studio of studios.slice(0, 2)) { // 最初の2スタジオのみテスト
      console.log(`\n🏢 Processing studio: ${studio.studioCode} (${studio.studioName})`);
      
      const lessons = await SimpleRealScraper.searchAllLessons(studio.studioCode);
      
      // DynamoDBに保存
      for (const lesson of lessons) {
        const ttl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30日後
        
        try {
          await docClient.send(new PutCommand({
            TableName: LESSONS_TABLE,
            Item: {
              studioCode: studio.studioCode,
              lessonId: `${studio.studioCode}-${lesson.date}-${lesson.time}`,
              date: lesson.date,
              time: lesson.time,
              lessonName: lesson.lessonName,
              instructor: lesson.instructor,
              lastUpdated: lesson.lastUpdated,
              ttl: ttl
            }
          }));
          totalLessons++;
        } catch (error) {
          console.error(`❌ Failed to save lesson:`, error.message);
        }
      }
      
      console.log(`✅ Saved ${lessons.length} lessons for ${studio.studioCode}`);
      
      // レート制限回避
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n🎉 Manual refresh completed! Total lessons saved: ${totalLessons}`);
    
  } catch (error) {
    console.error('❌ Manual refresh failed:', error);
  }
}

refreshLessonsData().catch(console.error);