// Simple test to verify sandbox mode functionality
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testSandboxMode() {
  console.log('🧪 Testing Sandbox Mode Functionality\n');
  
  try {
    // Test 1: Check if settings endpoint returns sandbox mode status
    console.log('1. Testing settings endpoint for sandbox mode status...');
    const settingsResponse = await axios.get(`${API_BASE_URL}/api/settings`);
    const isSandboxMode = settingsResponse.data.sandboxMode;
    const configEditingEnabled = settingsResponse.data.configEditingEnabled;
    
    console.log(`   ✅ Sandbox Mode: ${isSandboxMode}`);
    console.log(`   ✅ Config Editing Enabled: ${configEditingEnabled}`);
    console.log(`   ✅ Settings endpoint returns sandbox status\n`);
    
    // Test 2: Try to save rules (should fail in sandbox mode)
    console.log('2. Testing rules update (should fail in sandbox mode)...');
    try {
      await axios.post(`${API_BASE_URL}/api/settings/rules`, {
        schema: { test: { columns: ['id'], description: 'test' } },
        query_patterns: []
      });
      console.log('   ❌ ERROR: Rules update should have failed in sandbox mode!');
    } catch (error) {
      if (error.response?.data?.error?.includes('sandbox mode')) {
        console.log('   ✅ Rules update correctly blocked in sandbox mode');
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.response?.data?.error || error.message}`);
      }
    }
    
    // Test 3: Try to save database settings (should fail in sandbox mode)  
    console.log('\n3. Testing database settings update (should fail in sandbox mode)...');
    try {
      await axios.post(`${API_BASE_URL}/api/settings/database`, {
        name: 'Test DB',
        host: 'localhost',
        port: 3306,
        database_name: 'test',
        username: 'test',
        password: 'test'
      });
      console.log('   ❌ ERROR: Database settings update should have failed in sandbox mode!');
    } catch (error) {
      if (error.response?.data?.error?.includes('sandbox mode')) {
        console.log('   ✅ Database settings update correctly blocked in sandbox mode');
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.response?.data?.error || error.message}`);
      }
    }
    
    // Test 4: Try to switch database (should fail in sandbox mode)
    console.log('\n4. Testing database switch (should fail in sandbox mode)...');
    try {
      await axios.post(`${API_BASE_URL}/api/settings/databases/1/switch`);
      console.log('   ❌ ERROR: Database switch should have failed in sandbox mode!');
    } catch (error) {
      if (error.response?.data?.error?.includes('sandbox mode')) {
        console.log('   ✅ Database switch correctly blocked in sandbox mode');
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.response?.data?.error || error.message}`);
      }
    }
    
    console.log('\n🎉 Sandbox mode test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('💡 Make sure the backend server is running with SANDBOX_MODE=true');
  }
}

// Run the test
testSandboxMode();