import { RealFeelcycleScraper } from '../services/real-scraper';
import { LessonsService } from '../services/lessons-service';
import { studiosService } from '../services/studios-service';

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
      
      console.log('📍 Step 2.1: Clearing existing lessons...');
      try {
        const clearResult = await lessonService.clearAllLessons();
        console.log(`✅ 既存データクリア完了: ${clearResult.deletedCount}件削除`);
      } catch (error) {
        console.log('⚠️  データクリアでエラーが発生しましたが、処理を続行します:', error);
      }
      
      console.log('📍 Step 2.2: Updating studio information...');
      const studios = await RealFeelcycleScraper.getRealStudios();
      const studioUpdateResult = await studiosService.refreshStudiosFromScraping(studios);
      console.log(`✅ Studio update completed: ${studioUpdateResult.created} created, ${studioUpdateResult.updated} updated, ${studioUpdateResult.total} total`);
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
      
      // Mark as failed with error message
      await studiosService.markStudioAsProcessed(studioToProcess.studioCode, 'failed', errorMessage);
      
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