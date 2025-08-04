const { RealFeelcycleScraper } = require('./dist/services/real-scraper');

async function testYokohama() {
  console.log('🔍 Testing Yokohama scraping directly...');
  
  try {
    const lessons = await RealFeelcycleScraper.searchAllLessons('ykh');
    console.log(`✅ Success: Found ${lessons.length} lessons for Yokohama`);
    
    if (lessons.length > 0) {
      console.log('📝 Sample lesson:', JSON.stringify(lessons[0], null, 2));
    } else {
      console.log('⚠️ No lessons found for Yokohama');
    }
    
    return lessons;
  } catch (error) {
    console.error('❌ Error scraping Yokohama:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    // Cleanup
    await RealFeelcycleScraper.cleanup();
  }
}

// Run the test
testYokohama()
  .then(lessons => {
    console.log(`\n🎉 Test completed. Found ${lessons.length} lessons.`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });