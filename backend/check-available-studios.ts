import { RealFeelcycleScraper } from './src/services/real-scraper';

async function checkAvailableStudios() {
  console.log('🏢 Checking available studios...');
  
  try {
    const studios = await RealFeelcycleScraper.getRealStudios();
    
    console.log(`Found ${studios.length} studios:`);
    studios.forEach((studio, index) => {
      console.log(`${index + 1}. ${studio.name} (${studio.code})`);
    });
    
    // Now test color scraping with the first available studio
    if (studios.length > 0) {
      const testStudio = studios[0];
      console.log(`\n🧪 Testing color scraping with ${testStudio.name} (${testStudio.code})...`);
      
      try {
        const lessons = await RealFeelcycleScraper.searchAllLessons(testStudio.code);
        
        console.log(`Found ${lessons.length} lessons for ${testStudio.name}`);
        
        // Check for color information
        const lessonsWithColors = lessons.filter(lesson => 
          lesson.backgroundColor || lesson.textColor
        );
        
        console.log(`Lessons with color information: ${lessonsWithColors.length}/${lessons.length}`);
        
        if (lessonsWithColors.length > 0) {
          console.log('\n📊 Sample lessons with color data:');
          lessonsWithColors.slice(0, 3).forEach((lesson, index) => {
            console.log(`${index + 1}. ${lesson.lessonName} (${lesson.program})`);
            console.log(`   Background: ${lesson.backgroundColor || 'none'}`);
            console.log(`   Text Color: ${lesson.textColor || 'none'}`);
            console.log('');
          });
        } else {
          console.log('❌ No color information found in scraped data');
          
          // Show sample without color info for debugging
          console.log('\n📝 Sample lessons (first 3):');
          lessons.slice(0, 3).forEach((lesson, index) => {
            console.log(`${index + 1}. ${lesson.lessonName} (${lesson.program})`);
            console.log(`   Date/Time: ${lesson.lessonDate} ${lesson.startTime}`);
            console.log(`   Background: ${lesson.backgroundColor || 'none'}`);
            console.log(`   Text Color: ${lesson.textColor || 'none'}`);
            console.log('');
          });
        }
        
      } catch (lessonError) {
        console.error(`❌ Failed to get lessons for ${testStudio.name}:`, lessonError);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    try {
      await RealFeelcycleScraper.cleanup();
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
  }
}

// Run the test
checkAvailableStudios().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed with error:', error);
  process.exit(1);
});