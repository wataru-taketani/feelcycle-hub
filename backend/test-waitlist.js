const axios = require('axios');

const API_BASE_URL = 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';

async function testWaitlistRegistration() {
  console.log('🔍 Testing waitlist registration functionality...');
  
  try {
    // Test 1: Get available studios
    console.log('\n1. Fetching studios...');
    const studiosResponse = await axios.get(`${API_BASE_URL}/studios`);
    console.log('✅ Studios fetched:', studiosResponse.data.success);
    
    if (studiosResponse.data.success && studiosResponse.data.data.studios.length > 0) {
      const firstStudio = studiosResponse.data.data.studios[0];
      console.log(`   First studio: ${firstStudio.name} (${firstStudio.code})`);
      
      // Test 2: Get lessons for this studio and today's date
      const today = new Date().toISOString().split('T')[0];
      console.log(`\n2. Fetching lessons for ${firstStudio.code} on ${today}...`);
      
      const lessonsResponse = await axios.get(`${API_BASE_URL}/lessons`, {
        params: {
          studioCode: firstStudio.code,
          date: today
        }
      });
      
      console.log('✅ Lessons fetched:', lessonsResponse.data.success);
      console.log(`   Found ${lessonsResponse.data.data?.lessons?.length || 0} lessons`);
      
      if (lessonsResponse.data.success && lessonsResponse.data.data.lessons.length > 0) {
        const firstLesson = lessonsResponse.data.data.lessons[0];
        console.log(`   First lesson: ${firstLesson.lessonName} at ${firstLesson.startTime} with ${firstLesson.instructor}`);
        
        // Test 3: Try to register for waitlist (this will fail without a real user)
        console.log('\n3. Testing waitlist registration...');
        
        try {
          const waitlistResponse = await axios.post(`${API_BASE_URL}/waitlist`, {
            userId: 'test-user-id', // This is a test user ID
            studioCode: firstStudio.code,
            lessonDate: today,
            startTime: firstLesson.startTime,
            lessonName: firstLesson.lessonName,
            instructor: firstLesson.instructor
          }, {
            headers: {
              'x-user-id': 'test-user-id'
            }
          });
          
          console.log('✅ Waitlist registration result:', waitlistResponse.data);
        } catch (waitlistError) {
          console.log('⚠️  Waitlist registration failed (expected with test user):', waitlistError.response?.data?.message || waitlistError.message);
        }
      } else {
        console.log('⚠️  No lessons found for today, trying tomorrow...');
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toISOString().split('T')[0];
        
        const tomorrowLessonsResponse = await axios.get(`${API_BASE_URL}/lessons`, {
          params: {
            studioCode: firstStudio.code,
            date: tomorrowDate
          }
        });
        
        console.log('✅ Tomorrow lessons fetched:', tomorrowLessonsResponse.data.success);
        console.log(`   Found ${tomorrowLessonsResponse.data.data?.lessons?.length || 0} lessons for tomorrow`);
      }
    } else {
      console.log('❌ No studios found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

// Run the test
testWaitlistRegistration();