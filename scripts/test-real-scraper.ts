#!/usr/bin/env node

import { RealFeelcycleScraper } from '../backend/src/services/real-scraper';

async function testRealScraper() {
  console.log('🚴‍♀️ Testing Real FEELCYCLE Data Scraper');
  console.log('='.repeat(50));

  try {
    // Test 1: Get real studios
    console.log('\n📍 Step 1: Fetching real studio list...');
    const studios = await RealFeelcycleScraper.getRealStudios();
    console.log(`✅ Found ${studios.length} studios`);
    
    // Check if Koshigaya exists
    const koshigaya = studios.find(s => s.code === 'ksg' || s.name.includes('越谷'));
    if (koshigaya) {
      console.log(`✅ Koshigaya studio found: ${JSON.stringify(koshigaya)}`);
    } else {
      console.log('❌ Koshigaya studio not found in studio list');
    }

    // Test 2: Get real lesson data for Koshigaya
    console.log('\n📋 Step 2: Fetching Koshigaya lessons for 2025-07-20...');
    const lessons = await RealFeelcycleScraper.searchRealLessons('ksg', '2025-07-20');
    console.log(`✅ Found ${lessons.length} lessons`);
    
    if (lessons.length > 0) {
      console.log('\n📋 Lesson details:');
      lessons.forEach((lesson, index) => {
        const status = lesson.isAvailable === 'true' ? '✅' : '❌';
        console.log(`  ${index + 1}. ${lesson.startTime} - ${lesson.lessonName} (${lesson.instructor})`);
        console.log(`     💺 ${lesson.availableSlots}/${lesson.totalSlots} slots ${status}`);
      });
    }

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    // Cleanup
    await RealFeelcycleScraper.cleanup();
    console.log('\n✅ Test completed and browser cleaned up');
  }
}

testRealScraper().catch(console.error);