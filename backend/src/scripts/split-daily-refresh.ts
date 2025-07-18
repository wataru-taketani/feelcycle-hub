import { RealFeelcycleScraper } from '../services/real-scraper';
import { LessonsService } from '../services/lessons-service';
import { StudioBatchService } from '../services/studio-batch-service';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const LESSONS_TABLE_NAME = process.env.LESSONS_TABLE_NAME || 'feelcycle-hub-lessons-dev';

/**
 * 分割処理による日次データ更新システム
 */
export class SplitDailyRefresh {
  private lessonsService: LessonsService;
  private studioBatchService: StudioBatchService;

  constructor() {
    this.lessonsService = new LessonsService();
    this.studioBatchService = new StudioBatchService();
  }

  /**
   * Step 1: スタジオ一覧を取得してバッチを作成
   */
  async initializeBatch(): Promise<string> {
    console.log('🚀 Step 1: スタジオ一覧の取得とバッチ作成');
    console.log('='.repeat(60));
    
    try {
      // 全スタジオ一覧を取得
      console.log('📍 全スタジオ情報の取得...');
      const studios = await RealFeelcycleScraper.getRealStudios();
      console.log(`✅ ${studios.length}件のスタジオを取得しました`);
      
      // バッチを作成
      const batchId = await this.studioBatchService.createBatch(studios);
      
      console.log(`\n📦 バッチ作成完了:`);
      console.log(`  バッチID: ${batchId}`);
      console.log(`  対象スタジオ数: ${studios.length}件`);
      console.log(`\n📋 次のステップ:`);
      console.log(`  npm run process-batch ${batchId}`);
      
      return batchId;
      
    } catch (error: any) {
      console.error('❌ バッチ作成エラー:', error);
      throw error;
    } finally {
      await RealFeelcycleScraper.cleanup();
    }
  }

  /**
   * Step 2: 既存レッスンデータを削除
   */
  async clearLessonsData(): Promise<void> {
    console.log('🗑️  Step 2: 既存レッスンデータの削除');
    console.log('='.repeat(60));
    
    try {
      let deletedCount = 0;
      let lastEvaluatedKey = undefined;
      
      do {
        const scanResult: any = await docClient.send(new ScanCommand({
          TableName: LESSONS_TABLE_NAME,
          ExclusiveStartKey: lastEvaluatedKey,
          ProjectionExpression: 'studioCode, lessonDateTime',
          Limit: 100 // バッチサイズを制限
        }));
        
        if (scanResult.Items && scanResult.Items.length > 0) {
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
      
    } catch (error: any) {
      console.error('❌ データ削除エラー:', error);
      throw error;
    }
  }

  /**
   * Step 3: 次の処理待ちスタジオを1つ処理
   */
  async processNextStudio(batchId: string): Promise<boolean> {
    try {
      // 次の処理待ちスタジオを取得
      const nextStudio = await this.studioBatchService.getNextPendingStudio(batchId);
      
      if (!nextStudio) {
        console.log('✅ 全スタジオの処理が完了しました');
        return false;
      }
      
      console.log(`🏢 処理開始: ${nextStudio.studioName} (${nextStudio.studioCode})`);
      
      // 処理状態を更新
      await this.studioBatchService.updateStudioStatus(batchId, nextStudio.studioCode, 'processing');
      
      const startTime = Date.now();
      let totalLessons = 0;
      
      // 14日間のデータを取得
      const targetDays = 14;
      const dates = Array.from({ length: targetDays }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
      });
      
      console.log(`  📅 対象日程: ${dates[0]} 〜 ${dates[dates.length - 1]} (${targetDays}日間)`);
      
      // 各日程のデータを取得
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        console.log(`    [${i + 1}/${dates.length}] ${date} 処理中...`);
        
        try {
          const lessons = await RealFeelcycleScraper.searchRealLessons(nextStudio.studioCode, date);
          
          if (lessons.length > 0) {
            // DynamoDBに保存
            for (const lesson of lessons) {
              await this.lessonsService.storeLessonData(lesson);
            }
            
            console.log(`      ✅ ${lessons.length}件保存`);
            totalLessons += lessons.length;
          } else {
            console.log(`      ℹ️  レッスンなし`);
          }
          
          // レート制限対策
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error: any) {
          console.error(`      ❌ ${date} エラー: ${error.message}`);
          // 個別の日付エラーは継続
        }
      }
      
      const processingDuration = Math.round((Date.now() - startTime) / 1000);
      
      // 処理完了状態を更新
      await this.studioBatchService.updateStudioStatus(
        batchId, 
        nextStudio.studioCode, 
        'completed',
        { 
          lessonCount: totalLessons, 
          processingDuration 
        }
      );
      
      console.log(`  ✅ 処理完了: ${totalLessons}件 (${processingDuration}秒)`);
      
      return true;
      
    } catch (error: any) {
      console.error('❌ スタジオ処理エラー:', error);
      
      // エラー状態を更新
      const nextStudio = await this.studioBatchService.getNextPendingStudio(batchId);
      if (nextStudio) {
        await this.studioBatchService.updateStudioStatus(
          batchId, 
          nextStudio.studioCode, 
          'failed',
          { errorMessage: error.message }
        );
      }
      
      return true; // エラーでも次の処理を継続
    }
  }

  /**
   * Step 4: バッチの処理状況を表示
   */
  async showBatchStatus(batchId: string): Promise<void> {
    console.log(`📊 バッチ処理状況: ${batchId}`);
    console.log('='.repeat(60));
    
    try {
      const summary = await this.studioBatchService.getBatchSummary(batchId);
      
      console.log(`📈 進捗状況:`);
      console.log(`  全体: ${summary.status.progress}% (${summary.status.completed + summary.status.failed}/${summary.status.total})`);
      console.log(`  完了: ${summary.status.completed}件`);
      console.log(`  処理中: ${summary.status.processing}件`);
      console.log(`  待機中: ${summary.status.pending}件`);
      console.log(`  失敗: ${summary.status.failed}件`);
      
      console.log(`\n📋 処理結果:`);
      console.log(`  総レッスン数: ${summary.totalLessons}件`);
      console.log(`  総処理時間: ${summary.totalDuration}秒`);
      
      if (summary.errors.length > 0) {
        console.log(`\n❌ エラー詳細:`);
        summary.errors.forEach(error => {
          console.log(`  ${error}`);
        });
      }
      
      // 処理中/待機中のスタジオを表示
      const pendingStudios = summary.items.filter(item => item.status === 'pending');
      if (pendingStudios.length > 0) {
        console.log(`\n⏳ 処理待ちスタジオ:`);
        pendingStudios.slice(0, 5).forEach(studio => {
          console.log(`  ${studio.studioName} (${studio.studioCode})`);
        });
        if (pendingStudios.length > 5) {
          console.log(`  ... 他 ${pendingStudios.length - 5}件`);
        }
      }
      
    } catch (error: any) {
      console.error('❌ 状況表示エラー:', error);
    }
  }

  /**
   * クリーンアップ
   */
  async cleanup(): Promise<void> {
    await RealFeelcycleScraper.cleanup();
  }
}