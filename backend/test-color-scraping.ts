import { RealFeelcycleScraper } from './src/services/real-scraper';

async function testColorScraping() {
  console.log('🧪 Testing color scraping functionality...');
  
  try {
    // Test with Shibuya studio (usually has good data)
    console.log('Testing with Shibuya studio...');
    const lessons = await RealFeelcycleScraper.searchAllLessons('shibuya');
    
    console.log(`Found ${lessons.length} lessons`);
    
    // Check for color information in the first few lessons
    const lessonsWithColors = lessons.filter(lesson => 
      lesson.backgroundColor || lesson.textColor
    );
    
    console.log(`Lessons with color information: ${lessonsWithColors.length}/${lessons.length}`);
    
    if (lessonsWithColors.length > 0) {
      console.log('\n📊 Sample lessons with color data:');
      lessonsWithColors.slice(0, 5).forEach((lesson, index) => {
        console.log(`${index + 1}. ${lesson.lessonName} (${lesson.program})`);
        console.log(`   Background: ${lesson.backgroundColor || 'none'}`);
        console.log(`   Text Color: ${lesson.textColor || 'none'}`);
        console.log(`   Date/Time: ${lesson.lessonDate} ${lesson.startTime}`);
        console.log('');
      });
    } else {
      console.log('❌ No color information found in scraped data');
    }
    
    // Test with a smaller sample if too many lessons
    if (lessons.length > 10) {
      console.log('\n📝 Sample of first 10 lessons:');
      lessons.slice(0, 10).forEach((lesson, index) => {
        console.log(`${index + 1}. ${lesson.lessonName} - BG: ${lesson.backgroundColor || 'none'}, Text: ${lesson.textColor || 'none'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    try {
      await RealFeelcycleScraper.cleanup();
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
  }
}

// Run the test
testColorScraping().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed with error:', error);
  process.exit(1);
});