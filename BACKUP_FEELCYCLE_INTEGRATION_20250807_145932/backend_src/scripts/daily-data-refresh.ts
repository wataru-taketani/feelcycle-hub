import { RealFeelcycleScraper } from '../services/real-scraper';
import { LessonsService } from '../services/lessons-service';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const LESSONS_TABLE_NAME = process.env.LESSONS_TABLE_NAME || 'feelcycle-hub-lessons-dev';

/**
 * 全データの日次更新処理
 */
export class DailyDataRefresh {
  protected lessonsService: LessonsService;

  constructor() {
    this.lessonsService = new LessonsService();
  }

  /**
   * 全スタジオのデータを取得
   */
  async getAllStudios(): Promise<Array<{code: string, name: string}>> {
    console.log('📍 Step 1: 全スタジオ情報の取得...');
    
    try {
      const studios = await RealFeelcycleScraper.getRealStudios();
      console.log(`✅ ${studios.length}件のスタジオを取得しました`);
      
      studios.forEach((studio, index) => {
        console.log(`  ${index + 1}. ${studio.name} (${studio.code})`);
      });
      
      return studios.map(s => ({ code: s.code, name: s.name }));
    } catch (error) {
      console.error('❌ スタジオ取得エラー:', error);
      throw error;
    }
  }

  /**
   * 既存の全レッスンデータを削除
   */
  async clearAllLessons(): Promise<void> {
    console.log('📍 Step 2: 既存データの削除...');
    
    try {
      let deletedCount = 0;
      let lastEvaluatedKey = undefined;
      
      do {
        const scanResult: any = await docClient.send(new ScanCommand({
          TableName: LESSONS_TABLE_NAME,
          ExclusiveStartKey: lastEvaluatedKey,
          ProjectionExpression: 'studioCode, lessonDateTime'
        }));
        
        if (scanResult.Items && scanResult.Items.length > 0) {
          // バッチ削除
          const deletePromises = scanResult.Items.map((item: any) => 
            docClient.send(new DeleteCommand({
              TableName: LESSONS_TABLE_NAME,
              Key: {
                studioCode: item.studioCode,
                lessonDateTime: item.lessonDateTime
              }
            }))
          );
          
          await Promise.all(deletePromises);
          deletedCount += scanResult.Items.length;
          console.log(`  削除進捗: ${deletedCount}件`);
        }
        
        lastEvaluatedKey = scanResult.LastEvaluatedKey;
      } while (lastEvaluatedKey);
      
      console.log(`✅ 既存データ削除完了: ${deletedCount}件`);
    } catch (error) {
      console.error('❌ データ削除エラー:', error);
      throw error;
    }
  }

  /**
   * 指定された日付の文字列を生成（YYYY-MM-DD形式）
   */
  private generateDateString(daysFromToday: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * 全スタジオの全日程データを取得・保存
   */
  async refreshAllData(): Promise<void> {
    console.log('📍 Step 3: 全データの取得・保存...');
    
    try {
      // 全スタジオを取得
      const studios = await this.getAllStudios();
      
      // 取得対象日程（今日から14日間）
      const targetDays = 14;
      const dates = Array.from({ length: targetDays }, (_, i) => this.generateDateString(i));
      
      console.log(`\n📅 対象日程: ${dates[0]} 〜 ${dates[dates.length - 1]} (${targetDays}日間)`);
      
      let totalLessons = 0;
      let successCount = 0;
      let errorCount = 0;
      
      // 各スタジオの各日程データを取得
      for (const studio of studios) {
        console.log(`\n🏢 ${studio.name} (${studio.code}) の処理開始...`);
        
        for (const date of dates) {
          try {
            console.log(`  📅 ${date} のデータ取得中...`);
            
            const lessons = await RealFeelcycleScraper.searchRealLessons(studio.code, date);
            
            if (lessons.length > 0) {
              // DynamoDBに保存
              for (const lesson of lessons) {
                await this.lessonsService.storeLessonData(lesson);
              }
              
              console.log(`    ✅ ${lessons.length}件のレッスンを保存`);
              totalLessons += lessons.length;
              successCount++;
            } else {
              console.log(`    ℹ️  レッスンなし`);
              successCount++;
            }
            
            // レート制限対策（1秒待機）
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (error) {
            console.error(`    ❌ ${date} のデータ取得エラー:`, error);
            errorCount++;
            
            // エラーが続く場合は少し長めに待機
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
      
      console.log(`\n📊 処理完了サマリー:`);
      console.log(`  総レッスン数: ${totalLessons}件`);
      console.log(`  成功: ${successCount}件`);
      console.log(`  エラー: ${errorCount}件`);
      console.log(`  成功率: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
      
    } catch (error) {
      console.error('❌ データ更新エラー:', error);
      throw error;
    }
  }

  /**
   * 完全な日次更新処理を実行
   */
  async runDailyRefresh(): Promise<void> {
    const startTime = Date.now();
    
    console.log('🔄 FEELCYCLE データ日次更新開始');
    console.log('='.repeat(60));
    console.log(`開始時刻: ${new Date().toLocaleString('ja-JP')}`);
    
    try {
      // Step 1: 既存データの削除
      await this.clearAllLessons();
      
      // Step 2: 全データの取得・保存
      await this.refreshAllData();
      
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);
      
      console.log('\n🎉 日次更新完了');
      console.log(`完了時刻: ${new Date().toLocaleString('ja-JP')}`);
      console.log(`処理時間: ${duration}秒`);
      
    } catch (error) {
      console.error('❌ 日次更新失敗:', error);
      throw error;
    } finally {
      await RealFeelcycleScraper.cleanup();
    }
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  const refresh = new DailyDataRefresh();
  refresh.runDailyRefresh().catch(console.error);
}