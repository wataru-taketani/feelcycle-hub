import { RealFeelcycleScraper } from './src/services/real-scraper';
import { LessonsService } from './src/services/lessons-service';

async function testOptimizedRefresh() {
  console.log('🧪 Testing optimized refresh with 3 studios');
  console.log('='.repeat(60));
  
  const lessonService = new LessonsService();
  let totalLessons = 0;
  const startTime = Date.now();
  
  try {
    // Get all studios but only process first 3
    console.log('\n📍 Getting studio list...');
    const allStudios = await RealFeelcycleScraper.getRealStudios();
    const testStudios = allStudios.slice(0, 3); // Test with first 3 studios
    
    console.log(`✅ Testing with ${testStudios.length} studios: ${testStudios.map(s => s.name).join(', ')}`);
    
    // Process each studio
    for (const [index, studio] of testStudios.entries()) {
      const studioStartTime = Date.now();
      
      console.log(`\n[${index + 1}/${testStudios.length}] Processing ${studio.name} (${studio.code})...`);
      
      try {
        // Get ALL lessons for this studio in one request
        const allLessons = await RealFeelcycleScraper.searchAllLessons(studio.code);
        
        if (allLessons.length > 0) {
          const studioEndTime = Date.now();
          const studioDuration = (studioEndTime - studioStartTime) / 1000;
          
          // Group lessons by date for reporting
          const lessonsByDate = allLessons.reduce((acc, lesson) => {
            acc[lesson.lessonDate] = (acc[lesson.lessonDate] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          console.log(`  ✅ Retrieved ${allLessons.length} lessons in ${studioDuration.toFixed(2)}s`);
          console.log(`     Dates: ${Object.keys(lessonsByDate).length} (${Object.entries(lessonsByDate).map(([date, count]) => `${date}:${count}`).join(', ')})`);
          
          totalLessons += allLessons.length;
          
          // Show some sample lessons
          console.log(`     Sample lessons:`);
          allLessons.slice(0, 3).forEach(lesson => {
            console.log(`       - ${lesson.lessonDate} ${lesson.startTime} ${lesson.lessonName} (${lesson.instructor})`);
          });
          
          // Note: Not saving to database in this test, just validating data retrieval
          
        } else {
          console.log(`  ⚠️  No lessons found for ${studio.name}`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing ${studio.name}:`, error);
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000;
    const avgTimePerStudio = totalDuration / testStudios.length;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Test completed!');
    console.log(`📊 Results:`);
    console.log(`   • Studios tested: ${testStudios.length}`);
    console.log(`   • Total lessons: ${totalLessons}`);
    console.log(`   • Total time: ${totalDuration.toFixed(1)} seconds`);
    console.log(`   • Average time per studio: ${avgTimePerStudio.toFixed(1)} seconds`);
    console.log(`   • Projected time for all ${allStudios.length} studios: ${(avgTimePerStudio * allStudios.length / 60).toFixed(1)} minutes`);
    console.log(`   • Old approach would take: ${(avgTimePerStudio * 14 * allStudios.length / 60).toFixed(1)} minutes`);
    console.log(`   • Estimated time savings: ${(((avgTimePerStudio * 14 - avgTimePerStudio) / (avgTimePerStudio * 14)) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await RealFeelcycleScraper.cleanup();
  }
}

testOptimizedRefresh().catch(console.error);