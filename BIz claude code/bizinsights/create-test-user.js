const fetch = require('node-fetch');

async function createTestUser() {
  console.log('👤 Creating a fresh test user via API...\n')

  try {
    const response = await fetch('http://localhost:3002/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Demo User',
        email: 'demo@bizinsights.com',
        password: 'demo123456'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Successfully created demo user!')
      console.log('📧 Email:', data.data.user.email)
      console.log('👤 Name:', data.data.user.name)
      console.log('🏢 Organization:', data.data.organization.name)
      
      console.log('\n🔐 New Login Credentials:')
      console.log('Email: demo@bizinsights.com')
      console.log('Password: demo123456')
      
    } else {
      console.log('❌ Failed to create user:', data.error)
      if (data.error?.includes('already exists')) {
        console.log('ℹ️  Demo user already exists, you can use the existing credentials')
      }
    }

    console.log('\n📋 All Working Login Options:')
    console.log('1. Email: test@example.com | Password: password123')
    console.log('2. Email: demo@bizinsights.com | Password: demo123456')
    console.log('3. Email: john@example.com | Password: password123')

  } catch (error) {
    console.error('❌ Error creating test user:', error.message)
  }
}

createTestUser()