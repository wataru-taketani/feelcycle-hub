#!/usr/bin/env node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const LESSONS_TABLE_NAME = 'feelcycle-hub-lessons-dev';

interface LessonData {
  studioCode: string;
  lessonDateTime: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  lessonName: string;
  instructor: string;
  availableSlots: number;
  totalSlots: number;
  isAvailable: string;
  program: string;
  lastUpdated: string;
  ttl: number;
}

async function createSampleLessons() {
  console.log('🚴‍♀️ Creating sample lesson data in DynamoDB');
  console.log('='.repeat(50));

  const studioCode = 'omotesando';
  const date = '2025-07-18';

  const sampleLessons: LessonData[] = [
    {
      studioCode,
      lessonDateTime: `${date}T07:00:00+09:00`,
      lessonDate: date,
      startTime: '07:00',
      endTime: '07:45',
      lessonName: 'BSL House 1',
      instructor: 'YUKI',
      availableSlots: 0,
      totalSlots: 20,
      isAvailable: 'false',
      program: 'BSL',
      lastUpdated: new Date().toISOString(),
      ttl: Math.floor((new Date(date + 'T08:00:00+09:00').getTime()) / 1000) + 86400,
    },
    {
      studioCode,
      lessonDateTime: `${date}T10:30:00+09:00`,
      lessonDate: date,
      startTime: '10:30',
      endTime: '11:15',
      lessonName: 'BB1 Beat',
      instructor: 'MIKI',
      availableSlots: 3,
      totalSlots: 20,
      isAvailable: 'true',
      program: 'BB1',
      lastUpdated: new Date().toISOString(),
      ttl: Math.floor((new Date(date + 'T11:30:00+09:00').getTime()) / 1000) + 86400,
    },
    {
      studioCode,
      lessonDateTime: `${date}T12:00:00+09:00`,
      lessonDate: date,
      startTime: '12:00',
      endTime: '12:45',
      lessonName: 'BSB Beats',
      instructor: 'NANA',
      availableSlots: 0,
      totalSlots: 20,
      isAvailable: 'false',
      program: 'BSB',
      lastUpdated: new Date().toISOString(),
      ttl: Math.floor((new Date(date + 'T13:00:00+09:00').getTime()) / 1000) + 86400,
    },
    {
      studioCode,
      lessonDateTime: `${date}T19:30:00+09:00`,
      lessonDate: date,
      startTime: '19:30',
      endTime: '20:15',
      lessonName: 'BSL House 1',
      instructor: 'Shiori.I',
      availableSlots: 1,
      totalSlots: 20,
      isAvailable: 'true',
      program: 'BSL',
      lastUpdated: new Date().toISOString(),
      ttl: Math.floor((new Date(date + 'T20:30:00+09:00').getTime()) / 1000) + 86400,
    },
    {
      studioCode,
      lessonDateTime: `${date}T21:00:00+09:00`,
      lessonDate: date,
      startTime: '21:00',
      endTime: '21:45',
      lessonName: 'BSW Hip Hop',
      instructor: 'RYO',
      availableSlots: 5,
      totalSlots: 20,
      isAvailable: 'true',
      program: 'BSW',
      lastUpdated: new Date().toISOString(),
      ttl: Math.floor((new Date(date + 'T22:00:00+09:00').getTime()) / 1000) + 86400,
    },
  ];

  try {
    for (const lesson of sampleLessons) {
      await docClient.send(new PutCommand({
        TableName: LESSONS_TABLE_NAME,
        Item: lesson,
      }));
      console.log(`✅ Created: ${lesson.startTime} - ${lesson.lessonName} (${lesson.instructor})`);
    }

    console.log(`\n🎉 Successfully created ${sampleLessons.length} sample lessons!`);
    console.log(`📅 Date: ${date}`);
    console.log(`🏢 Studio: ${studioCode} (表参道)`);
    console.log(`💺 Available lessons: ${sampleLessons.filter(l => l.isAvailable === 'true').length}/${sampleLessons.length}`);

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  }
}

createSampleLessons().catch(console.error);