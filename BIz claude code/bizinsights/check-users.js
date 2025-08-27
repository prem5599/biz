const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function checkUsers() {
  console.log('🔍 Checking users in database...\n')

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        createdAt: true
      }
    })

    console.log(`Found ${users.length} users:`)
    console.log('=' .repeat(50))

    for (const user of users) {
      console.log(`📧 Email: ${user.email}`)
      console.log(`👤 Name: ${user.name}`)
      console.log(`🔑 Has Password: ${user.password ? 'Yes' : 'No'}`)
      console.log(`📅 Created: ${user.createdAt}`)
      
      // Test password verification for test@example.com
      if (user.email === 'test@example.com' && user.password) {
        const isValidPassword = await bcrypt.compare('password123', user.password)
        console.log(`🔐 Password 'password123' valid: ${isValidPassword ? '✅' : '❌'}`)
      }
      
      console.log('-'.repeat(50))
    }

    // Check organizations
    const organizations = await prisma.organization.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                email: true,
                name: true
              }
            }
          }
        }
      }
    })

    console.log(`\n🏢 Found ${organizations.length} organizations:`)
    for (const org of organizations) {
      console.log(`  • ${org.name} (${org.slug})`)
      console.log(`    Members: ${org.members.map(m => m.user.email).join(', ')}`)
    }

  } catch (error) {
    console.error('❌ Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()