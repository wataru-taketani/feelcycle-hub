import { RealFeelcycleScraper } from './src/services/real-scraper';

async function testOptimizedScraper() {
  console.log('🧪 Testing optimized scraper approach');
  console.log('='.repeat(60));
  
  try {
    const studioCode = 'sjk'; // 新宿
    
    console.log(`\n📍 Test 1: Get all lessons for ${studioCode} (optimized approach)`);
    const startTime = Date.now();
    
    const allLessons = await RealFeelcycleScraper.searchAllLessons(studioCode);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ Retrieved ${allLessons.length} total lessons in ${duration.toFixed(2)} seconds`);
    
    // Group lessons by date
    const lessonsByDate = allLessons.reduce((acc, lesson) => {
      if (!acc[lesson.lessonDate]) {
        acc[lesson.lessonDate] = [];
      }
      acc[lesson.lessonDate].push(lesson);
      return acc;
    }, {} as Record<string, any[]>);
    
    console.log(`\n📊 Lessons grouped by date:`);
    Object.entries(lessonsByDate).forEach(([date, lessons]) => {
      console.log(`  ${date}: ${lessons.length} lessons`);
    });
    
    // Test specific date filtering (7/24)
    console.log(`\n📍 Test 2: Filter lessons for specific date (2025-07-24)`);
    const targetDate = '2025-07-24';
    const lessonsFor724 = allLessons.filter(lesson => lesson.lessonDate === targetDate);
    
    console.log(`✅ Found ${lessonsFor724.length} lessons for ${targetDate}`);
    
    if (lessonsFor724.length > 0) {
      console.log(`\nFirst few lessons for ${targetDate}:`);
      lessonsFor724.slice(0, 5).forEach((lesson, index) => {
        console.log(`  ${index + 1}. ${lesson.startTime}-${lesson.endTime} ${lesson.lessonName} (${lesson.instructor})`);
      });
      
      // Check for the expected lesson: 07:00-07:45 BB2 NOW 1 Fuka
      const expectedLesson = lessonsFor724.find(lesson => 
        lesson.startTime === '07:00' && 
        lesson.lessonName.includes('BB2 NOW 1') && 
        lesson.instructor.includes('Fuka')
      );
      
      if (expectedLesson) {
        console.log(`\n🎯 Found expected lesson: ${expectedLesson.startTime}-${expectedLesson.endTime} ${expectedLesson.lessonName} (${expectedLesson.instructor})`);
      } else {
        console.log(`\n❌ Expected lesson (07:00 BB2 NOW 1 Fuka) not found`);
        console.log('Available 07:00 lessons:');
        lessonsFor724.filter(l => l.startTime === '07:00').forEach(lesson => {
          console.log(`  - ${lesson.startTime}-${lesson.endTime} ${lesson.lessonName} (${lesson.instructor})`);
        });
      }
    }
    
    // Test compatibility method
    console.log(`\n📍 Test 3: Compatibility method (searchRealLessons)`);
    const compatStartTime = Date.now();
    
    const compatLessons = await RealFeelcycleScraper.searchRealLessons(studioCode, targetDate);
    
    const compatEndTime = Date.now();
    const compatDuration = (compatEndTime - compatStartTime) / 1000;
    
    console.log(`✅ Compatibility method returned ${compatLessons.length} lessons in ${compatDuration.toFixed(2)} seconds`);
    
    // Verify results match
    const resultsMatch = compatLessons.length === lessonsFor724.length;
    console.log(`Results match between methods: ${resultsMatch ? '✅' : '❌'}`);
    
    console.log(`\n📊 Performance comparison:`);
    console.log(`  Optimized approach: ${duration.toFixed(2)}s for ALL dates`);
    console.log(`  Old approach would take: ~${(duration * 14).toFixed(2)}s for 14 dates`);
    console.log(`  Time savings: ~${((duration * 14 - duration) / (duration * 14) * 100).toFixed(1)}% faster`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await RealFeelcycleScraper.cleanup();
  }
}

testOptimizedScraper().catch(console.error);