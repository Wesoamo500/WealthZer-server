import axios from 'axios';

async function testRefresh() {
  const API_URL = 'http://localhost:3000/auth';
  
  try {
    console.log('1. Attempting login...');
    const loginRes = await axios.post(`${API_URL}/login`, {
      email: 'test@example.com', // Replace with a valid test user
      password: 'password123'
    });

    const { accessToken, refreshToken } = loginRes.data;
    console.log('✅ Login successful');
    console.log('Access Token (first 20 chars):', accessToken.substring(0, 20));
    console.log('Refresh Token (first 20 chars):', refreshToken.substring(0, 20));

    console.log('\n2. Attempting token refresh...');
    const refreshRes = await axios.post(`${API_URL}/refresh`, {
      refreshToken
    });

    const newTokens = refreshRes.data;
    console.log('✅ Refresh successful');
    console.log('New Access Token (first 20 chars):', newTokens.accessToken.substring(0, 20));
    console.log('New Refresh Token (first 20 chars):', newTokens.refreshToken.substring(0, 20));

    if (newTokens.refreshToken !== refreshToken) {
      console.log('\n✅ Token rotation verified: Refresh token changed!');
    } else {
      console.log('\n❌ Token rotation failed: Refresh token is the same!');
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testRefresh();
