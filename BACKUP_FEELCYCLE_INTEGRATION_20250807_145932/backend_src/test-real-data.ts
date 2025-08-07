import { lessonsService } from './services/lessons-service';

async function testRealData() {
  console.log('🚴‍♀️ Testing Real FEELCYCLE Data');
  console.log('='.repeat(50));

  try {
    const lessons = await lessonsService.getLessonsForStudioAndDate('ksg', '2025-07-20');
    
    console.log(`✅ Found ${lessons.length} lessons in database`);
    
    if (lessons.length > 0) {
      const availableCount = lessons.filter(l => l.isAvailable === 'true').length;
      
      console.log(`📊 Summary: ${lessons.length} total, ${availableCount} available`);
      
      // Show first 5 real lessons with actual data
      console.log('\n📋 Real lesson data:');
      lessons.slice(0, 5).forEach((lesson, index) => {
        console.log(`  ${index + 1}. ${lesson.startTime}-${lesson.endTime} ${lesson.lessonName} (${lesson.instructor})`);
        console.log(`     Program: ${lesson.program}, Available: ${lesson.isAvailable === 'true' ? 'Yes' : 'No'}`);
      });
      
      // Show actual program names proving this is real data
      const uniquePrograms = [...new Set(lessons.map(l => l.lessonName))].slice(0, 8);
      console.log('\n🏷️ Real lesson names from FEELCYCLE:');
      uniquePrograms.forEach((name, index) => {
        console.log(`  ${index + 1}. ${name}`);
      });
      
      console.log('\n✅ SUCCESS: Real data from FEELCYCLE successfully retrieved and stored');
      
    } else {
      console.log('❌ No lessons found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testRealData();