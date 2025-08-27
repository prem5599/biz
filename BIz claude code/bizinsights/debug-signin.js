const fetch = require('node-fetch');

async function testSignIn() {
  console.log('🔍 Testing Sign-In Process...\n')

  // Test 1: Check if the sign-in page loads
  try {
    console.log('1️⃣ Testing sign-in page...')
    const pageResponse = await fetch('http://localhost:3002/auth/signin')
    console.log(`   Status: ${pageResponse.status}`)
    console.log(`   Content-Type: ${pageResponse.headers.get('content-type')}`)
    
    if (pageResponse.status === 200) {
      console.log('   ✅ Sign-in page loads correctly')
    } else {
      console.log('   ❌ Sign-in page has issues')
    }
  } catch (error) {
    console.log('   ❌ Error loading sign-in page:', error.message)
  }

  console.log('\n2️⃣ Testing NextAuth API...')
  
  // Test 2: Check NextAuth providers
  try {
    const providersResponse = await fetch('http://localhost:3002/api/auth/providers')
    const providers = await providersResponse.json()
    console.log('   Available providers:', Object.keys(providers))
    console.log('   ✅ NextAuth API working')
  } catch (error) {
    console.log('   ❌ NextAuth API error:', error.message)
  }

  console.log('\n3️⃣ Testing credentials authentication...')
  
  // Test 3: Try credential-based sign-in
  try {
    const signinResponse = await fetch('http://localhost:3002/api/auth/signin/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'test@example.com',
        password: 'password123',
        callbackUrl: 'http://localhost:3002/dashboard',
        json: 'true'
      }),
      redirect: 'manual'
    })
    
    console.log(`   Status: ${signinResponse.status}`)
    console.log(`   Headers:`, Object.fromEntries(signinResponse.headers.entries()))
    
    if (signinResponse.status === 200) {
      const result = await signinResponse.json()
      console.log('   Response:', result)
    } else {
      const text = await signinResponse.text()
      console.log('   Response text:', text.substring(0, 200))
    }
    
  } catch (error) {
    console.log('   ❌ Credentials test error:', error.message)
  }

  console.log('\n4️⃣ Testing user lookup directly...')
  
  // Test 4: Check user in database
  const { PrismaClient } = require('@prisma/client')
  const bcrypt = require('bcryptjs')
  const prisma = new PrismaClient()
  
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
      select: {
        id: true,
        email: true,
        name: true,
        password: true
      }
    })
    
    if (user) {
      console.log('   ✅ User found in database')
      console.log(`   User ID: ${user.id}`)
      console.log(`   Email: ${user.email}`)
      
      if (user.password) {
        const passwordValid = await bcrypt.compare('password123', user.password)
        console.log(`   Password valid: ${passwordValid ? '✅' : '❌'}`)
      }
    } else {
      console.log('   ❌ User not found in database')
    }
    
  } catch (error) {
    console.log('   ❌ Database error:', error.message)
  } finally {
    await prisma.$disconnect()
  }

  console.log('\n📋 Summary:')
  console.log('If all tests pass, try these steps:')
  console.log('1. Go to http://localhost:3002/auth/signin')
  console.log('2. Enter: test@example.com / password123')
  console.log('3. Check browser console for JavaScript errors')
  console.log('4. Check Network tab in DevTools for failed requests')
}

testSignIn()