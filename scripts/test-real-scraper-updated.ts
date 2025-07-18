#!/usr/bin/env node

import { RealFeelcycleScraper } from '../backend/src/services/real-scraper';

async function testUpdatedRealScraper() {
  console.log('🚴‍♀️ Testing Updated Real FEELCYCLE Data Scraper');
  console.log('='.repeat(60));

  try {
    // Test 1: Get real studios from reservation site
    console.log('\n📍 Step 1: Fetching real studio list from reservation site...');
    const studios = await RealFeelcycleScraper.getRealStudios();
    console.log(`✅ Found ${studios.length} studios`);
    
    // Show first few studios
    console.log('\n📋 First 10 studios:');
    studios.slice(0, 10).forEach((studio, index) => {
      console.log(`  ${index + 1}. ${studio.name} (${studio.code.toUpperCase()})`);
    });

    // Check if Koshigaya exists
    const koshigaya = studios.find(s => s.code === 'ksg');
    if (koshigaya) {
      console.log(`\n✅ Koshigaya studio found: ${JSON.stringify(koshigaya)}`);
    } else {
      console.log('\n❌ Koshigaya studio not found in studio list');
      return;
    }

    // Test 2: Get real lesson data for Koshigaya using 3-step process
    console.log('\n📋 Step 2: Fetching Koshigaya lessons for 2025-07-20 using 3-step process...');
    const lessons = await RealFeelcycleScraper.searchRealLessons('ksg', '2025-07-20');
    console.log(`✅ Found ${lessons.length} lessons`);
    
    if (lessons.length > 0) {
      console.log('\n📋 Real lesson details:');
      lessons.forEach((lesson, index) => {
        const status = lesson.isAvailable === 'true' ? '✅ Available' : '❌ Full';
        console.log(`  ${index + 1}. ${lesson.startTime}-${lesson.endTime} ${lesson.lessonName} (${lesson.instructor})`);
        console.log(`     💺 ${lesson.availableSlots} slots available ${status}`);
        console.log(`     🏷️ Program: ${lesson.program}`);
      });
    } else {
      console.log('\n❌ No lessons found');
    }

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    // Cleanup
    await RealFeelcycleScraper.cleanup();
    console.log('\n✅ Test completed and browser cleaned up');
  }
}

testUpdatedRealScraper().catch(console.error);