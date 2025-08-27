import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj70v7HZ.G7i', // password123
    },
  })

  // Create a test organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'test-org' },
    update: {},
    create: {
      name: 'Test Organization',
      slug: 'test-org',
      subscriptionTier: 'PRO',
      members: {
        create: {
          userId: user.id,
          role: 'OWNER'
        }
      }
    },
  })

  // Create sample data points for the last 30 days
  const dataPoints = []
  const now = new Date()
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    
    // Generate realistic sample data with some growth trend
    const baseRevenue = 1000 + Math.sin(i * 0.1) * 200 + (30 - i) * 50
    const baseOrders = 20 + Math.sin(i * 0.15) * 5 + (30 - i) * 2
    const baseCustomers = 500 + (30 - i) * 10
    
    // Add some randomness
    const revenue = Math.max(0, baseRevenue + (Math.random() - 0.5) * 400)
    const orders = Math.max(0, Math.floor(baseOrders + (Math.random() - 0.5) * 10))
    const customers = Math.max(0, Math.floor(baseCustomers + (Math.random() - 0.5) * 50))
    const conversionRate = Math.max(0, Math.min(10, 3.2 + (Math.random() - 0.5) * 2))

    dataPoints.push(
      {
        organizationId: organization.id,
        integrationId: 'mock-integration',
        metricType: 'revenue',
        value: revenue,
        metadata: { source: 'mock_data' },
        dateRecorded: date,
      },
      {
        organizationId: organization.id,
        integrationId: 'mock-integration',
        metricType: 'orders',
        value: orders,
        metadata: { source: 'mock_data' },
        dateRecorded: date,
      },
      {
        organizationId: organization.id,
        integrationId: 'mock-integration',
        metricType: 'customers',
        value: customers,
        metadata: { source: 'mock_data' },
        dateRecorded: date,
      },
      {
        organizationId: organization.id,
        integrationId: 'mock-integration',
        metricType: 'conversion_rate',
        value: conversionRate,
        metadata: { source: 'mock_data' },
        dateRecorded: date,
      }
    )
  }

  // Create mock integration first
  await prisma.integration.upsert({
    where: {
      organizationId_platform: {
        organizationId: organization.id,
        platform: 'SHOPIFY'
      }
    },
    update: {},
    create: {
      id: 'mock-integration',
      organizationId: organization.id,
      platform: 'SHOPIFY',
      accessToken: 'mock-token',
      status: 'CONNECTED',
      metadata: { shopDomain: 'test-shop' },
      lastSyncAt: new Date()
    }
  })

  // Clear existing data points for this organization first
  await prisma.dataPoint.deleteMany({
    where: {
      organizationId: organization.id
    }
  })

  // Insert data points
  await prisma.dataPoint.createMany({
    data: dataPoints
  })

  // Clear existing insights for this organization first
  await prisma.insight.deleteMany({
    where: {
      organizationId: organization.id
    }
  })

  // Create some sample insights
  await prisma.insight.createMany({
    data: [
      {
        organizationId: organization.id,
        type: 'TREND',
        title: 'Revenue growth is accelerating',
        description: 'Your revenue has increased by 23% this month compared to last month. This upward trend suggests strong business momentum.',
        impactScore: 9,
        isRead: false,
        metadata: { metric: 'revenue', change: 23 }
      },
      {
        organizationId: organization.id,
        type: 'RECOMMENDATION',
        title: 'Optimize your checkout process',
        description: 'Your conversion rate could be improved. Consider A/B testing different checkout flows to increase conversions.',
        impactScore: 7,
        isRead: false,
        metadata: { metric: 'conversion_rate', current: 3.2 }
      },
      {
        organizationId: organization.id,
        type: 'ANOMALY',
        title: 'Unusual spike in new customers',
        description: 'Customer acquisition increased by 15% yesterday. Investigate what drove this growth to replicate it.',
        impactScore: 8,
        isRead: true,
        metadata: { metric: 'customers', change: 15 }
      }
    ]
  })

  console.log('Database seeded successfully!')
  console.log(`Created user: ${user.email}`)
  console.log(`Created organization: ${organization.name}`)
  console.log(`Created ${dataPoints.length} data points`)
  console.log(`Created insights and integration`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })