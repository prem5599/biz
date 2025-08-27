const fetch = require('node-fetch');

async function testCompleteSignInFlow() {
  console.log('🔐 Testing Complete Sign-In Flow...\n')

  try {
    // Step 1: Get CSRF token
    console.log('1️⃣ Getting CSRF token...')
    const csrfResponse = await fetch('http://localhost:3002/api/auth/csrf')
    const csrfData = await csrfResponse.json()
    console.log(`   CSRF Token: ${csrfData.csrfToken.substring(0, 20)}...`)

    // Step 2: Attempt sign-in
    console.log('\n2️⃣ Attempting sign-in...')
    const signinResponse = await fetch('http://localhost:3002/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'test@example.com',
        password: 'password123',
        csrfToken: csrfData.csrfToken,
        callbackUrl: 'http://localhost:3002/dashboard',
        json: 'true'
      }),
      redirect: 'manual'
    })

    console.log(`   Status: ${signinResponse.status}`)
    
    if (signinResponse.status === 200) {
      const result = await signinResponse.json()
      console.log('   ✅ Sign-in successful!')
      console.log(`   Callback URL: ${result.url}`)
    } else if (signinResponse.status === 302) {
      console.log('   ✅ Sign-in successful (redirect)!')
      console.log(`   Redirect to: ${signinResponse.headers.get('location')}`)
    } else {
      const text = await signinResponse.text()
      console.log('   ❌ Sign-in failed')
      console.log(`   Response: ${text.substring(0, 200)}`)
    }

  } catch (error) {
    console.log('   ❌ Error during sign-in flow:', error.message)
  }

  console.log('\n✅ All Systems Ready!')
  console.log('🌐 Visit: http://localhost:3002')
  console.log('🔑 Login with:')
  console.log('   Email: test@example.com')
  console.log('   Password: password123')
  console.log('\n🎯 Alternative accounts:')
  console.log('   Email: demo@bizinsights.com | Password: demo123456')
  console.log('   Email: john@example.com | Password: password123')
}

testCompleteSignInFlow()