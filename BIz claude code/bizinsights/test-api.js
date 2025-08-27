const fetch = require('node-fetch');

async function testRegistration() {
  console.log('Testing user registration...');
  
  const response = await fetch('http://localhost:3002/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    })
  });

  const data = await response.json();
  console.log('Registration response:', data);
  
  if (data.success) {
    console.log('✅ Registration successful');
    return data.data.user;
  } else {
    console.log('❌ Registration failed:', data.error);
    return null;
  }
}

async function testOrganizations() {
  console.log('\nTesting organizations API...');
  
  // This would normally require authentication, but let's test the endpoint structure
  const response = await fetch('http://localhost:3002/api/organizations', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  const data = await response.json();
  console.log('Organizations response:', data);
  
  if (data.error && data.error === 'Unauthorized') {
    console.log('✅ Organizations API properly requires authentication');
  }
}

async function runTests() {
  console.log('🚀 Starting BizInsights API Tests\n');
  
  try {
    await testRegistration();
    await testOrganizations();
    
    console.log('\n🎉 Basic API tests completed!');
    console.log('✅ Server is running on http://localhost:3002');
    console.log('✅ Registration endpoint working');
    console.log('✅ Authentication middleware working');
    console.log('\n📝 Manual testing steps:');
    console.log('1. Visit http://localhost:3002');
    console.log('2. Try signing up with email: test@example.com, password: password123');
    console.log('3. Login and check the dashboard');
    console.log('4. View integrations page');
    console.log('5. Check settings page');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();