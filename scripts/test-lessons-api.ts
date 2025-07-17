#!/usr/bin/env node

import axios from 'axios';

// API Gateway URL (CDK output から取得)
const API_BASE_URL = 'https://cscrz3qax3.execute-api.ap-northeast-1.amazonaws.com/dev';

async function testStudiosAPI() {
  console.log('\n🏢 Testing Studios API');
  console.log('='.repeat(50));

  try {
    const response = await axios.get(`${API_BASE_URL}/studios`);
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('❌ Error:', error.response?.data || error.message);
    console.log(`🔗 URL: ${API_BASE_URL}/studios`);
  }
}

async function testStudioDatesAPI() {
  console.log('\n📅 Testing Studio Dates API');
  console.log('='.repeat(50));

  const testStudios = ['omotesando', 'ginza', 'sapporo'];
  
  for (const studioCode of testStudios) {
    try {
      const response = await axios.get(`${API_BASE_URL}/studios/${studioCode}/dates`);
      console.log(`\n✅ ${studioCode} - Status: ${response.status}`);
      console.log(`📊 Available dates:`, response.data.data?.availableDates || 'No dates');
    } catch (error: any) {
      console.log(`\n❌ ${studioCode} - Error:`, error.response?.data || error.message);
    }
  }
}

async function testLessonsSearchAPI() {
  console.log('\n🔍 Testing Lessons Search API');
  console.log('='.repeat(50));

  const testCases = [
    { studioCode: 'omotesando', date: '2025-07-18' },
    { studioCode: 'ginza', date: '2025-07-19' },
    { studioCode: 'sapporo', date: '2025-07-20' },
  ];

  for (const testCase of testCases) {
    try {
      const response = await axios.get(`${API_BASE_URL}/lessons`, {
        params: testCase
      });
      
      console.log(`\n✅ ${testCase.studioCode} ${testCase.date} - Status: ${response.status}`);
      const data = response.data.data;
      console.log(`📊 Studio: ${data?.studio?.name || 'Unknown'}`);
      console.log(`📅 Date: ${data?.date || 'Unknown'}`);
      console.log(`🎵 Lessons found: ${data?.total || 0}`);
      console.log(`💺 Available lessons: ${data?.available || 0}`);
      
      if (data?.lessons && data.lessons.length > 0) {
        console.log('\n📋 Sample lessons:');
        data.lessons.slice(0, 3).forEach((lesson: any, index: number) => {
          console.log(`  ${index + 1}. ${lesson.time} - ${lesson.program} (${lesson.instructor})`);
          console.log(`     💺 ${lesson.availableSlots}/${lesson.totalSlots} slots ${lesson.isAvailable ? '✅' : '❌'}`);
        });
      }
      
    } catch (error: any) {
      console.log(`\n❌ ${testCase.studioCode} ${testCase.date} - Error:`, error.response?.data || error.message);
    }
  }
}

async function testLessonsWithFilters() {
  console.log('\n🔍 Testing Lessons Search with Filters');
  console.log('='.repeat(50));

  const testCases = [
    { 
      studioCode: 'omotesando', 
      date: '2025-07-18', 
      program: 'BSL',
      description: 'BSL program filter'
    },
    { 
      studioCode: 'ginza', 
      date: '2025-07-19', 
      instructor: 'YUKI',
      description: 'YUKI instructor filter'
    },
    { 
      studioCode: 'sapporo', 
      date: '2025-07-20', 
      startTime: '18:00',
      endTime: '21:00',
      description: 'Evening time range filter'
    },
  ];

  for (const testCase of testCases) {
    try {
      const { description, ...params } = testCase;
      const response = await axios.get(`${API_BASE_URL}/lessons`, { params });
      
      console.log(`\n✅ ${description} - Status: ${response.status}`);
      const data = response.data.data;
      console.log(`🎵 Filtered lessons: ${data?.total || 0}`);
      
      if (data?.lessons && data.lessons.length > 0) {
        data.lessons.forEach((lesson: any, index: number) => {
          console.log(`  ${index + 1}. ${lesson.time} - ${lesson.program} (${lesson.instructor})`);
        });
      }
      
    } catch (error: any) {
      console.log(`\n❌ ${testCase.description} - Error:`, error.response?.data || error.message);
    }
  }
}

async function testAPIWithInvalidData() {
  console.log('\n❌ Testing Error Cases');
  console.log('='.repeat(50));

  const errorCases = [
    {
      description: 'Invalid studio code',
      url: `${API_BASE_URL}/studios/invalid-studio/dates`
    },
    {
      description: 'Missing required params',
      url: `${API_BASE_URL}/lessons`
    },
    {
      description: 'Invalid date format',
      url: `${API_BASE_URL}/lessons?studioCode=omotesando&date=invalid-date`
    },
  ];

  for (const errorCase of errorCases) {
    try {
      const response = await axios.get(errorCase.url);
      console.log(`\n⚠️ ${errorCase.description} - Unexpected success: ${response.status}`);
    } catch (error: any) {
      console.log(`\n✅ ${errorCase.description} - Expected error: ${error.response?.status || 'Network error'}`);
      console.log(`   Error message: ${error.response?.data?.error || error.message}`);
    }
  }
}

async function main() {
  console.log('🚴‍♀️ FEELCYCLE Hub - Lessons API Test');
  console.log(`🔗 API Base URL: ${API_BASE_URL}`);
  console.log(`🕐 Test time: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  // Test all API endpoints
  await testStudiosAPI();
  await testStudioDatesAPI();
  await testLessonsSearchAPI();
  await testLessonsWithFilters();
  await testAPIWithInvalidData();

  console.log('\n✅ API testing completed!');
  console.log('\n📝 Summary:');
  console.log('  - Studios API: Get all studios with regional grouping');
  console.log('  - Studio Dates API: Get available dates for specific studios');
  console.log('  - Lessons Search API: Search lessons with various filters');
  console.log('  - Error Handling: Test invalid inputs and edge cases');
}

// Run the tests
main().catch(console.error);