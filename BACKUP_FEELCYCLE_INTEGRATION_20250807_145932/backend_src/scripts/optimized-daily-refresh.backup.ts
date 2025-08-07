import { RealFeelcycleScraper } from '../services/real-scraper';
import { LessonsService } from '../services/lessons-service';
import { studiosService } from '../services/studios-service';

async function optimizedDailyRefresh() {
  console.log('🔄 Starting optimized daily data refresh');
  console.log('Using the new approach: 1 request per studio instead of 14');
  console.log('='.repeat(60));
  
  const lessonService = new LessonsService();
  let totalLessons = 0;
  let processedStudios = 0;
  const startTime = Date.now();
  
  try {
    // Step 1: Get all studios and update studio information
    console.log('\n📍 Step 1: Getting studio list...');
    const studios = await RealFeelcycleScraper.getRealStudios();
    console.log(`✅ Found ${studios.length} studios`);
    
    // Step 1.5: Update studio information in database
    console.log('\n📍 Step 1.5: Updating studio information...');
    const studioUpdateResult = await studiosService.refreshStudiosFromScraping(studios);
    console.log(`✅ Studio update completed: ${studioUpdateResult.created} created, ${studioUpdateResult.updated} updated, ${studioUpdateResult.total} total`);
    
    // Step 2: Clear existing lessons
    console.log('\n📍 Step 2: Clearing existing lessons...');
    try {
      const clearResult = await lessonService.clearAllLessons();
      console.log(`✅ 既存データクリア完了: ${clearResult.deletedCount}件削除`);
    } catch (error) {
      console.log('⚠️  データクリアでエラーが発生しましたが、処理を続行します:', error);
    }
    
    // Step 3: Process each studio with optimized approach
    console.log(`\n📍 Step 3: Processing ${studios.length} studios (optimized approach)...`);
    
    for (const [index, studio] of studios.entries()) {
      const studioStartTime = Date.now();
      
      try {
        console.log(`\n[${index + 1}/${studios.length}] Processing ${studio.name} (${studio.code})...`);
        
        // Get ALL lessons for this studio in one request
        const allLessons = await RealFeelcycleScraper.searchAllLessons(studio.code);
        
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
          
          console.log(`  ✅ Saved ${allLessons.length} lessons in ${studioDuration.toFixed(2)}s`);
          console.log(`     Dates: ${Object.keys(lessonsByDate).length} (${Object.entries(lessonsByDate).map(([date, count]) => `${date}:${count}`).join(', ')})`);
          
          totalLessons += allLessons.length;
        } else {
          console.log(`  ⚠️  No lessons found for ${studio.name}`);
        }
        
        processedStudios++;
        
        // Progress report
        const overallProgress = ((index + 1) / studios.length * 100).toFixed(1);
        const elapsedTime = (Date.now() - startTime) / 1000;
        const avgTimePerStudio = elapsedTime / (index + 1);
        const estimatedTotalTime = avgTimePerStudio * studios.length;
        const estimatedRemainingTime = estimatedTotalTime - elapsedTime;
        
        console.log(`  📊 Progress: ${overallProgress}% (${totalLessons} lessons total)`);
        console.log(`     Time: ${elapsedTime.toFixed(0)}s elapsed, ~${estimatedRemainingTime.toFixed(0)}s remaining`);
        
      } catch (error) {
        console.error(`  ❌ Error processing ${studio.name}:`, error);
        // Continue with next studio instead of failing completely
      }
      
      // Small delay to be respectful to the server (reduced for scheduled execution)
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Optimized daily refresh completed!');
    console.log(`📊 Final Results:`);
    console.log(`   • Studios processed: ${processedStudios}/${studios.length}`);
    console.log(`   • Total lessons saved: ${totalLessons}`);
    console.log(`   • Total time: ${(totalDuration / 60).toFixed(1)} minutes`);
    console.log(`   • Average time per studio: ${(totalDuration / processedStudios).toFixed(1)} seconds`);
    console.log(`   • Estimated old approach time: ${((totalDuration / processedStudios) * 14 * studios.length / 60).toFixed(1)} minutes`);
    console.log(`   • Time savings: ~${(((totalDuration / processedStudios) * 14 - (totalDuration / processedStudios)) / ((totalDuration / processedStudios) * 14) * 100).toFixed(1)}% faster`);
    
  } catch (error) {
    console.error('❌ Daily refresh failed:', error);
    throw error;
  } finally {
    await RealFeelcycleScraper.cleanup();
  }
}

// Export for use in other scripts
export { optimizedDailyRefresh };

// Run if called directly
if (require.main === module) {
  optimizedDailyRefresh().catch(console.error);
}