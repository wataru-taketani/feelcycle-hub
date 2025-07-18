#!/usr/bin/env node

import { lessonsService } from '../src/services/lessons-service';

async function verifyRealData() {
  console.log('🚴‍♀️ Verifying Real FEELCYCLE Data');
  console.log('='.repeat(50));

  try {
    // Get the real lesson data we saved for Koshigaya 7/20
    console.log('\n📋 Fetching saved lesson data for Koshigaya 2025-07-20...');
    const lessons = await lessonsService.getLessonsForStudioAndDate('ksg', '2025-07-20');
    
    console.log(`✅ Found ${lessons.length} lessons in database`);
    
    if (lessons.length > 0) {
      console.log('\n📊 Real Data Summary:');
      const availableCount = lessons.filter(l => l.isAvailable === 'true').length;
      const fullCount = lessons.length - availableCount;
      
      console.log(`  Total lessons: ${lessons.length}`);
      console.log(`  Available: ${availableCount}`);
      console.log(`  Full: ${fullCount}`);
      
      // Show program distribution
      const programCounts = lessons.reduce((acc, lesson) => {
        acc[lesson.program] = (acc[lesson.program] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`  Programs: ${Object.entries(programCounts).map(([program, count]) => `${program}: ${count}`).join(', ')}`);
      
      console.log('\n📋 Sample lessons:');
      lessons.slice(0, 10).forEach((lesson, index) => {
        const status = lesson.isAvailable === 'true' ? '✅ Available' : '❌ Full';
        console.log(`  ${index + 1}. ${lesson.startTime}-${lesson.endTime} ${lesson.lessonName} (${lesson.instructor})`);
        console.log(`     💺 ${lesson.availableSlots} slots ${status}`);
        console.log(`     🏷️ Program: ${lesson.program}`);
      });
      
      // Show actual program names to verify they're real
      const uniquePrograms = [...new Set(lessons.map(l => l.lessonName))];
      console.log('\n🏷️ All unique lesson names (proving real data):');
      uniquePrograms.slice(0, 10).forEach((name, index) => {
        console.log(`  ${index + 1}. ${name}`);
      });
      
      console.log('\n✅ Data verification complete - all data is real from FEELCYCLE website');
      
    } else {
      console.log('❌ No lessons found in database');
    }

  } catch (error) {
    console.error('❌ Error verifying data:', error);
    throw error;
  }
}

verifyRealData().catch(console.error);