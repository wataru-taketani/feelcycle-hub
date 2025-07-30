import { RealFeelcycleScraper } from '../services/real-scraper';
import { LessonsService } from '../services/lessons-service';
import { studiosService } from '../services/studios-service';
import { autoRecoveryService, RecoveryContext } from '../services/auto-recovery-service';

/**
 * Progressive daily refresh: Process one studio at a time
 * This approach avoids Lambda timeout and provides better error recovery
 */
async function progressiveDailyRefresh() {
  console.log('🔄 Starting progressive daily data refresh');
  console.log('Strategy: Process one studio per execution to avoid timeout');
  console.log('='.repeat(60));
  
  const lessonService = new LessonsService();
  const startTime = Date.now();
  
  try {
    // Step 1: Get processing progress
    console.log('\n📍 Step 1: Checking batch progress...');
    const progress = await studiosService.getBatchProgress();
    console.log(`Current progress: ${progress.completed}/${progress.total} completed`);
    console.log(`Remaining: ${progress.remaining}, Processing: ${progress.processing}, Failed: ${progress.failed}`);
    
    // Step 2: If this is a new daily run (all completed), reset and clear lessons
    if (progress.remaining === 0 && progress.processing === 0) {
      console.log('\n📍 Step 2: New daily run detected - resetting batch statuses...');
      await studiosService.resetAllBatchStatuses();
      
      console.log('📍 Step 2.1: Skipping data clearing (SAFE MODE)...');
      // DISABLED: 危険な全削除処理を無効化 (2025-07-30)
      // 理由: スクレイピング失敗時のデータ全消失を防止
      // try {
      //   const clearResult = await lessonService.clearAllLessons();
      //   console.log(`✅ 既存データクリア完了: ${clearResult.deletedCount}件削除`);
      // } catch (error) {
      //   console.log('⚠️  データクリアでエラーが発生しましたが、処理を続行します:', error);
      // }
      console.log('✅ データ保護モード: 既存データを保持します');
      
      console.log('📍 Step 2.2: Safely updating studio information...');
      try {
        const studios = await RealFeelcycleScraper.getRealStudios();
        console.log(`🔍 Scraped ${studios.length} studios from FEELCYCLE site`);
        
        // 安全な更新メソッドを使用
        const studioUpdateResult = await studiosService.safeRefreshStudiosFromScraping(studios);
        
        console.log(`✅ Safe studio update completed:`);
        console.log(`   • Created: ${studioUpdateResult.created} studios`);
        console.log(`   • Updated: ${studioUpdateResult.updated} studios`);
        console.log(`   • Removed: ${studioUpdateResult.removed} studios`);
        console.log(`   • Total active: ${studioUpdateResult.total} studios`);
        console.log(`   • Backup created: ${studioUpdateResult.backupCreated ? 'Yes' : 'No'}`);
        
        if (studioUpdateResult.errors.length > 0) {
          console.warn(`⚠️  ${studioUpdateResult.errors.length} errors during studio update:`);
          studioUpdateResult.errors.forEach((error, index) => {
            console.warn(`   ${index + 1}. ${error}`);
          });
        }
        
        // エラーが多すぎる場合は処理を中断
        if (studioUpdateResult.errors.length > studios.length * 0.2) { // 20%以上エラー
          throw new Error(`Too many errors during studio update: ${studioUpdateResult.errors.length}/${studios.length}`);
        }
        
      } catch (error) {
        console.error('❌ Critical error during studio update:', error);
        
        // 自動復旧を試行
        const recoveryContext: RecoveryContext = {
          errorType: 'studio_update_failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          failedOperation: 'studio_list_update',
          retryCount: 0,
          systemState: 'degraded',
        };
        
        console.log('🚨 Attempting auto-recovery for studio update failure...');
        const recoveryResult = await autoRecoveryService.attemptRecovery(recoveryContext);
        
        if (recoveryResult.success) {
          console.log(`✅ Auto-recovery successful: ${recoveryResult.action}`);
          console.log(`📝 Details: ${recoveryResult.details}`);
          
          if (recoveryResult.fallbackUsed) {
            console.log('⚠️  System running in fallback mode');
            // フォールバックモードでも処理を継続
          }
        } else {
          console.error(`❌ Auto-recovery failed: ${recoveryResult.details}`);
          throw new Error(`Studio update failed and recovery unsuccessful: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    // Step 3: Get next unprocessed studio
    console.log('\n📍 Step 3: Getting next unprocessed studio...');
    const studioToProcess = await studiosService.getNextUnprocessedStudio();
    
    if (!studioToProcess) {
      console.log('🎉 All studios have been processed today!');
      
      // Get final progress for reporting
      const finalProgress = await studiosService.getBatchProgress();
      console.log('\n📊 Daily refresh complete!');
      console.log(`   • Total studios: ${finalProgress.total}`);
      console.log(`   • Completed: ${finalProgress.completed}`);
      console.log(`   • Failed: ${finalProgress.failed}`);
      
      return;
    }
    
    // Step 4: Process the selected studio
    console.log(`\n📍 Step 4: Processing ${studioToProcess.studioName} (${studioToProcess.studioCode})...`);
    
    // Mark as processing
    await studiosService.markStudioAsProcessed(studioToProcess.studioCode, 'processing');
    
    const studioStartTime = Date.now();
    
    try {
      // Get ALL lessons for this studio in one request
      console.log(`Fetching all lesson data for ${studioToProcess.studioCode} (all dates at once)...`);
      const allLessons = await RealFeelcycleScraper.searchAllLessons(studioToProcess.studioCode);
      
      if (allLessons.length > 0) {
        // Save all lessons to DynamoDB
        await lessonService.storeLessonsData(allLessons);
        
        const studioEndTime = Date.now();
        const studioDuration = (studioEndTime - studioStartTime) / 1000;
        
        // Group lessons by date for reporting
        const lessonsByDate = allLessons.reduce((acc, lesson) => {
          acc[lesson.lessonDate] = (acc[lesson.lessonDate] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log(`✅ Saved ${allLessons.length} lessons in ${studioDuration.toFixed(2)}s`);
        console.log(`   Dates: ${Object.keys(lessonsByDate).length} (${Object.entries(lessonsByDate).map(([date, count]) => `${date}:${count}`).join(', ')})`);
        
        // Mark as completed
        await studiosService.markStudioAsProcessed(studioToProcess.studioCode, 'completed');
        console.log(`✅ ${studioToProcess.studioName} processing completed successfully`);
        
      } else {
        console.log(`⚠️  No lessons found for ${studioToProcess.studioName}`);
        // Still mark as completed even if no lessons found
        await studiosService.markStudioAsProcessed(studioToProcess.studioCode, 'completed');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error processing ${studioToProcess.studioName}:`, errorMessage);
      
      // 自動復旧を試行
      const recoveryContext: RecoveryContext = {
        errorType: 'studio_scraping_failed',
        errorMessage: errorMessage,
        failedOperation: `scrape_studio_${studioToProcess.studioCode}`,
        retryCount: (studioToProcess as any).retryCount || 0,
        systemState: 'normal',
      };
      
      console.log(`🚨 Attempting auto-recovery for studio ${studioToProcess.studioCode}...`);
      const recoveryResult = await autoRecoveryService.attemptRecovery(recoveryContext);
      
      if (recoveryResult.success && !recoveryResult.fallbackUsed) {
        console.log(`✅ Auto-recovery successful for ${studioToProcess.studioCode}: ${recoveryResult.action}`);
        
        // 復旧成功時は完了マーク
        await studiosService.markStudioAsProcessed(studioToProcess.studioCode, 'completed');
        console.log(`📝 ${studioToProcess.studioName} marked as completed after recovery`);
        
      } else if (recoveryResult.success && recoveryResult.fallbackUsed) {
        console.log(`⚠️  Auto-recovery used fallback for ${studioToProcess.studioCode}: ${recoveryResult.action}`);
        
        // フォールバック使用時は後で再試行するため失敗マーク
        await studiosService.markStudioAsProcessed(studioToProcess.studioCode, 'failed', `Fallback used: ${recoveryResult.details}`);
        
      } else {
        console.error(`❌ Auto-recovery failed for ${studioToProcess.studioCode}: ${recoveryResult.details}`);
        
        // 復旧失敗時は失敗マーク
        await studiosService.markStudioAsProcessed(studioToProcess.studioCode, 'failed', errorMessage);
      }
      
      // Don't throw error - continue to check for more studios
      console.log('⚠️  Continuing to check for other studios to process...');
    }
    
    // Step 5: Check if more studios need processing
    const updatedProgress = await studiosService.getBatchProgress();
    console.log(`\n📊 Progress update: ${updatedProgress.completed}/${updatedProgress.total} completed`);
    
    if (updatedProgress.remaining > 0) {
      console.log(`🔄 ${updatedProgress.remaining} studios remaining - triggering next execution...`);
      
      // Self-trigger for next studio (using EventBridge or direct Lambda invoke)
      // This creates a chain of executions until all studios are processed
      return {
        triggerNext: true,
        progress: updatedProgress,
      };
    } else {
      console.log('🎉 All studios processing completed!');
      return {
        triggerNext: false,
        progress: updatedProgress,
      };
    }
    
  } catch (error) {
    console.error('❌ Progressive daily refresh failed:', error);
    throw error;
  } finally {
    // Cleanup resources and force garbage collection
    await RealFeelcycleScraper.cleanup();
    
    // Clear any large variables from memory
    if (typeof global !== 'undefined' && global.gc) {
      console.log('🗑️  Running final garbage collection...');
      global.gc();
    }
    
    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000;
    console.log(`\n⏱️  Execution time: ${totalDuration.toFixed(2)} seconds`);
    
    // Report memory usage
    const memUsage = process.memoryUsage();
    console.log(`💾 Memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB used, ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB total`);
  }
}

// Export for use in other scripts
export { progressiveDailyRefresh };

// Run if called directly
if (require.main === module) {
  progressiveDailyRefresh().catch(console.error);
}