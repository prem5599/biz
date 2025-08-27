const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testMetrics() {
  console.log('🔍 Testing metrics calculation...\n')

  try {
    // Get organization
    const org = await prisma.organization.findFirst({
      where: { slug: 'test-org' }
    })

    if (!org) {
      console.log('❌ Test organization not found')
      return
    }

    console.log(`✅ Found organization: ${org.name}`)

    // Get data points
    const dataPoints = await prisma.dataPoint.findMany({
      where: {
        organizationId: org.id,
        dateRecorded: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    })

    console.log(`📊 Found ${dataPoints.length} data points`)

    // Test metrics calculation
    const metrics = {
      revenue: 0,
      orders: 0,
      customers: 0,
      conversionRate: 0
    }

    const revenuePoints = dataPoints.filter(dp => dp.metricType === 'revenue')
    const orderPoints = dataPoints.filter(dp => dp.metricType === 'orders')
    const customerPoints = dataPoints.filter(dp => dp.metricType === 'customers')
    const conversionPoints = dataPoints.filter(dp => dp.metricType === 'conversion_rate')

    console.log(`\n📈 Data breakdown:`)
    console.log(`   Revenue points: ${revenuePoints.length}`)
    console.log(`   Order points: ${orderPoints.length}`)
    console.log(`   Customer points: ${customerPoints.length}`)
    console.log(`   Conversion points: ${conversionPoints.length}`)

    if (revenuePoints.length > 0) {
      metrics.revenue = revenuePoints.reduce((sum, dp) => sum + Number(dp.value), 0)
    }

    if (orderPoints.length > 0) {
      metrics.orders = orderPoints.reduce((sum, dp) => sum + Number(dp.value), 0)
    }

    if (customerPoints.length > 0) {
      metrics.customers = Math.max(...customerPoints.map(dp => Number(dp.value)))
    }

    if (conversionPoints.length > 0) {
      const lastConversionValue = conversionPoints[conversionPoints.length - 1]?.value
      metrics.conversionRate = Number(lastConversionValue) || 0
    }

    console.log(`\n💼 Calculated metrics:`)
    console.log(`   Revenue: $${metrics.revenue.toLocaleString()}`)
    console.log(`   Orders: ${metrics.orders.toLocaleString()}`)
    console.log(`   Customers: ${metrics.customers.toLocaleString()}`)
    console.log(`   Conversion Rate: ${metrics.conversionRate.toFixed(1)}%`)

    console.log(`\n🔧 Type checks:`)
    console.log(`   Revenue type: ${typeof metrics.revenue}`)
    console.log(`   Orders type: ${typeof metrics.orders}`)
    console.log(`   Customers type: ${typeof metrics.customers}`)
    console.log(`   Conversion Rate type: ${typeof metrics.conversionRate}`)

    // Test the toFixed method
    console.log(`\n✅ toFixed test: ${metrics.conversionRate.toFixed(1)}`)

  } catch (error) {
    console.log('❌ Error testing metrics:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testMetrics()