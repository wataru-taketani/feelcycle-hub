#!/usr/bin/env node

import axios from 'axios';

const API_BASE_URL = 'https://cscrz3qax3.execute-api.ap-northeast-1.amazonaws.com/dev';

async function testSingleAPI() {
  console.log('🔍 Testing Studios API with debug info');
  console.log('='.repeat(50));

  try {
    console.log(`📍 Making request to: ${API_BASE_URL}/studios`);
    
    const response = await axios.get(`${API_BASE_URL}/studios`, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
    
  } catch (error: any) {
    console.log(`❌ Error Status: ${error.response?.status}`);
    console.log(`❌ Error Data:`, JSON.stringify(error.response?.data, null, 2));
    console.log(`❌ Error Headers:`, error.response?.headers);
    
    if (error.response?.status === 500) {
      console.log('\n🐛 Internal Server Error - Check Lambda logs');
    }
  }
}

// Run test
testSingleAPI().catch(console.error);