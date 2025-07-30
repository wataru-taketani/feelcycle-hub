const { RealFeelcycleScraper } = require('./dist/services/real-scraper.js');
const { LessonsService } = require('./dist/services/lessons-service.js');

async function saveColorDataToProduction() {
  console.log('🎨 Saving color data to production database...');
  
  try {
    // Test with Shibuya studio (渋谷)
    const studioCode = 'sby';
    console.log(`Scraping lessons for studio: ${studioCode}`);
    
    const lessons = await RealFeelcycleScraper.searchAllLessons(studioCode);
    console.log(`Found ${lessons.length} lessons`);
    
    // Show color info summary
    const lessonsWithColors = lessons.filter(lesson => 
      lesson.backgroundColor || lesson.textColor
    );
    console.log(`Lessons with color information: ${lessonsWithColors.length}/${lessons.length}`);
    
    if (lessonsWithColors.length > 0) {
      console.log('\n📊 Sample color data:');
      lessonsWithColors.slice(0, 5).forEach((lesson, index) => {
        console.log(`${index + 1}. ${lesson.lessonName} (${lesson.program})`);
        console.log(`   Background: ${lesson.backgroundColor}`);
        console.log(`   Text Color: ${lesson.textColor}`);
      });
    }
    
    // Save to DynamoDB
    console.log('\n💾 Saving to DynamoDB...');
    const lessonsService = new LessonsService();
    await lessonsService.storeLessonsData(lessons);
    console.log(`✅ Saved ${lessons.length} lessons to production database`);
    
    console.log('\n🌐 You can now check the colors at:');
    console.log('https://feelcycle-hub.netlify.app/search/');
    console.log('Select 渋谷 studio to see the color data');
    
  } catch (error) {
    console.error('❌ Failed to save color data:', error);
  } finally {
    try {
      await RealFeelcycleScraper.cleanup();
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
  }
}

// Run
saveColorDataToProduction().then(() => {
  console.log('🏁 Completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Failed:', error);
  process.exit(1);
});