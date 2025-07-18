import { DailyDataRefresh } from './scripts/daily-data-refresh';

/**
 * 限定的な日次更新テスト（最初の3スタジオのみ）
 */
class LimitedDailyRefresh extends DailyDataRefresh {
  /**
   * テスト用に制限されたスタジオリストを返す
   */
  async getAllStudios(): Promise<Array<{code: string, name: string}>> {
    console.log('📍 限定スタジオ情報の取得...');
    
    // 最初の3スタジオのみでテスト
    const testStudios = [
      { code: 'spr', name: '札幌' },
      { code: 'omy', name: '大宮' },
      { code: 'ksg', name: '越谷' }
    ];
    
    console.log(`✅ テスト用に${testStudios.length}件のスタジオを設定`);
    testStudios.forEach((studio, index) => {
      console.log(`  ${index + 1}. ${studio.name} (${studio.code})`);
    });
    
    return testStudios;
  }

  /**
   * 制限された日程でデータ取得
   */
  async refreshAllData(): Promise<void> {
    console.log('📍 限定データの取得・保存...');
    
    try {
      // 限定スタジオを取得
      const studios = await this.getAllStudios();
      
      // 取得対象日程（今日から2日間のみ）
      const targetDays = 2;
      const dates = Array.from({ length: targetDays }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
      });
      
      console.log(`\n📅 限定対象日程: ${dates[0]} 〜 ${dates[dates.length - 1]} (${targetDays}日間)`);
      
      let totalLessons = 0;
      let successCount = 0;
      let errorCount = 0;
      
      // 各スタジオの各日程データを取得
      for (let studioIndex = 0; studioIndex < studios.length; studioIndex++) {
        const studio = studios[studioIndex];
        console.log(`\n🏢 [${studioIndex + 1}/${studios.length}] ${studio.name} (${studio.code}) の処理開始...`);
        
        for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
          const date = dates[dateIndex];
          console.log(`  📅 [${dateIndex + 1}/${dates.length}] ${date} のデータ取得中...`);
          
          try {
            const { RealFeelcycleScraper } = await import('./services/real-scraper');
            const lessons = await RealFeelcycleScraper.searchRealLessons(studio.code, date);
            
            if (lessons.length > 0) {
              console.log(`    📊 ${lessons.length}件のレッスンを取得`);
              
              // DynamoDBに保存
              let saveCount = 0;
              for (const lesson of lessons) {
                try {
                  await this.lessonsService.storeLessonData(lesson);
                  saveCount++;
                } catch (saveError: any) {
                  console.error(`    ❌ 保存エラー: ${lesson.startTime} ${lesson.lessonName} - ${saveError.message}`);
                }
              }
              
              console.log(`    ✅ ${saveCount}件のレッスンを保存`);
              totalLessons += saveCount;
              successCount++;
            } else {
              console.log(`    ℹ️  レッスンなし`);
              successCount++;
            }
            
            // レート制限対策（2秒待機）
            console.log(`    ⏰ 2秒待機...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
          } catch (error: any) {
            console.error(`    ❌ ${date} のデータ取得エラー: ${error.message}`);
            errorCount++;
            
            // 詳細なエラー情報
            if (error.stack) {
              console.log(`    📋 スタックトレース:\n${error.stack}`);
            }
            
            // エラーが続く場合は少し長めに待機
            console.log(`    ⏰ エラー回復待機 5秒...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
        
        console.log(`  ✅ ${studio.name} の処理完了`);
      }
      
      console.log(`\n📊 限定処理完了サマリー:`);
      console.log(`  総レッスン数: ${totalLessons}件`);
      console.log(`  成功: ${successCount}件`);
      console.log(`  エラー: ${errorCount}件`);
      console.log(`  成功率: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
      
    } catch (error: any) {
      console.error('❌ 限定データ更新エラー:', error);
      throw error;
    }
  }
}

// 限定テスト実行
async function runLimitedTest() {
  console.log('🧪 限定日次データ更新テスト開始');
  console.log('='.repeat(60));
  
  const limitedRefresh = new LimitedDailyRefresh();
  
  try {
    await limitedRefresh.runDailyRefresh();
    console.log('\n✅ 限定テスト完了');
  } catch (error: any) {
    console.error('\n❌ 限定テスト失敗:', error);
  }
}

if (require.main === module) {
  runLimitedTest().catch(console.error);
}