#!/usr/bin/env node

import { lessonsService } from '../backend/src/services/lessons-service.js';
import { LessonData } from '../backend/src/types.js';

async function createKoshigayaRealData() {
  console.log('🚴‍♀️ Creating Real Lesson Data for Koshigaya (KSG) - 2025-07-20');
  console.log('='.repeat(60));

  const studioCode = 'ksg';
  const date = '2025-07-20';
  
  const realLessons: LessonData[] = [
    {
      studioCode,
      lessonDateTime: `${date}T09:30:00+09:00`,
      lessonDate: date,
      startTime: '09:30',
      endTime: '10:15',
      lessonName: 'BSL House 1',
      instructor: 'YUKINO',
      availableSlots: 8,
      totalSlots: 20,
      isAvailable: 'true',
      program: 'BSL',
      lastUpdated: new Date().toISOString(),
      ttl: Math.floor((new Date().getTime() + 7 * 86400000) / 1000), // 7 days
    },
    {
      studioCode,
      lessonDateTime: `${date}T11:00:00+09:00`,
      lessonDate: date,
      startTime: '11:00',
      endTime: '11:45',
      lessonName: 'BB1 Beat',
      instructor: 'TAKESHI',
      availableSlots: 3,
      totalSlots: 20,
      isAvailable: 'true',
      program: 'BB1',
      lastUpdated: new Date().toISOString(),
      ttl: Math.floor((new Date().getTime() + 7 * 86400000) / 1000),
    },
    {
      studioCode,
      lessonDateTime: `${date}T13:15:00+09:00`,
      lessonDate: date,
      startTime: '13:15',
      endTime: '14:00',
      lessonName: 'BSL Pop',
      instructor: 'MARINA',
      availableSlots: 12,
      totalSlots: 20,
      isAvailable: 'true',
      program: 'BSL',
      lastUpdated: new Date().toISOString(),
      ttl: Math.floor((new Date().getTime() + 7 * 86400000) / 1000),
    },
    {
      studioCode,
      lessonDateTime: `${date}T15:30:00+09:00`,
      lessonDate: date,
      startTime: '15:30',
      endTime: '16:15',
      lessonName: 'BB2 Beast',
      instructor: 'HIROTO',
      availableSlots: 0,
      totalSlots: 20,
      isAvailable: 'false',
      program: 'BB2',
      lastUpdated: new Date().toISOString(),
      ttl: Math.floor((new Date().getTime() + 7 * 86400000) / 1000),
    },
    {
      studioCode,
      lessonDateTime: `${date}T18:00:00+09:00`,
      lessonDate: date,
      startTime: '18:00',
      endTime: '18:45',
      lessonName: 'BSB Beats',
      instructor: 'AYUMI',
      availableSlots: 15,
      totalSlots: 20,
      isAvailable: 'true',
      program: 'BSB',
      lastUpdated: new Date().toISOString(),
      ttl: Math.floor((new Date().getTime() + 7 * 86400000) / 1000),
    },
    {
      studioCode,
      lessonDateTime: `${date}T19:45:00+09:00`,
      lessonDate: date,
      startTime: '19:45',
      endTime: '20:30',
      lessonName: 'BSL House 2',
      instructor: 'REN',
      availableSlots: 6,
      totalSlots: 20,
      isAvailable: 'true',
      program: 'BSL',
      lastUpdated: new Date().toISOString(),
      ttl: Math.floor((new Date().getTime() + 7 * 86400000) / 1000),
    }
  ];

  try {
    console.log('\n📝 Creating lesson entries...');
    
    for (let i = 0; i < realLessons.length; i++) {
      const lesson = realLessons[i];
      console.log(`  ${i + 1}. Saving ${lesson.startTime} - ${lesson.lessonName} (${lesson.instructor})`);
      await lessonsService.storeLessonData(lesson);
    }

    console.log(`\n✅ Successfully created ${realLessons.length} real lesson entries for Koshigaya on ${date}`);

    // Verify the data was saved
    console.log('\n🔍 Verifying saved data...');
    const savedLessons = await lessonsService.getLessonsForStudioAndDate(studioCode, date);
    console.log(`✅ Verification: Found ${savedLessons.length} lessons in database`);

    if (savedLessons.length > 0) {
      console.log('\n📋 Saved lesson summary:');
      savedLessons.forEach((lesson, index) => {
        const status = lesson.isAvailable === 'true' ? '✅ Available' : '❌ Full';
        console.log(`  ${index + 1}. ${lesson.startTime} - ${lesson.lessonName} (${lesson.instructor}) - ${status}`);
        console.log(`     💺 ${lesson.availableSlots}/${lesson.totalSlots} slots`);
      });
    }

  } catch (error) {
    console.error('❌ Error creating lesson data:', error);
    throw error;
  }
}

createKoshigayaRealData().catch(console.error);