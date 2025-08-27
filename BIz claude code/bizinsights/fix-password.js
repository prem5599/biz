const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function fixPassword() {
  console.log('🔧 Fixing test user password...\n')

  try {
    // Hash the correct password
    const hashedPassword = await bcrypt.hash('password123', 12)
    
    // Update the test user
    const updatedUser = await prisma.user.update({
      where: { email: 'test@example.com' },
      data: { password: hashedPassword },
      select: {
        email: true,
        name: true
      }
    })

    console.log('✅ Successfully updated password for:', updatedUser.email)
    
    // Test the password
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    })
    
    if (user && user.password) {
      const isValid = await bcrypt.compare('password123', user.password)
      console.log(`🔐 Password verification test: ${isValid ? '✅ PASS' : '❌ FAIL'}`)
    }

    console.log('\n📋 Login credentials:')
    console.log('Email: test@example.com')
    console.log('Password: password123')
    console.log('URL: http://localhost:3002/auth/signin')

  } catch (error) {
    console.error('❌ Error fixing password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixPassword()