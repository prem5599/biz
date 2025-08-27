const fetch = require('node-fetch');

async function testDashboardAPI() {
  console.log('🎯 Testing Dashboard API...\n')

  try {
    // Get organization ID first
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    const org = await prisma.organization.findFirst({
      where: { slug: 'test-org' }
    })

    if (!org) {
      console.log('❌ Test organization not found')
      return
    }

    console.log(`✅ Found organization: ${org.name} (${org.id})`)

    // Test dashboard API endpoint
    console.log('\n📊 Testing dashboard API...')
    const response = await fetch(`http://localhost:3002/api/organizations/${org.id}/dashboard?period=30d`)
    
    console.log(`Status: ${response.status}`)
    
    if (response.status === 401) {
      console.log('⚠️  API requires authentication (expected)')
      console.log('ℹ️  This is normal - the dashboard will work when you\'re signed in')
    } else if (response.status === 200) {
      const data = await response.json()
      console.log('✅ Dashboard API working!')
      console.log('📈 Metrics:', data.data.metrics)
      
      // Test metric types
      const metrics = data.data.metrics
      console.log('\n🔧 Type validation:')
      console.log(`Revenue: ${typeof metrics.revenue} (${metrics.revenue})`)
      console.log(`Orders: ${typeof metrics.orders} (${metrics.orders})`)
      console.log(`Customers: ${typeof metrics.customers} (${metrics.customers})`)
      console.log(`Conversion Rate: ${typeof metrics.conversionRate} (${metrics.conversionRate})`)
      
      // Test toFixed method
      if (typeof metrics.conversionRate === 'number') {
        console.log(`✅ toFixed test: ${metrics.conversionRate.toFixed(1)}%`)
      } else {
        console.log(`❌ conversionRate is not a number: ${typeof metrics.conversionRate}`)
      }
    } else {
      const text = await response.text()
      console.log(`❌ Unexpected status: ${response.status}`)
      console.log(`Response: ${text.substring(0, 200)}`)
    }

    await prisma.$disconnect()

  } catch (error) {
    console.log('❌ Error testing dashboard API:', error.message)
  }
}

testDashboardAPI()