import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all'

    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId: id,
        userId: session.user.id
      }
    })

    if (!membershipCheck) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Build where clause - default to all-time data
    const whereClause: any = { organizationId: id }

    if (period !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }

      whereClause.dateRecorded = { gte: startDate }
    }

    console.log(`\n🔍 DASHBOARD DEBUG:`)
    console.log(`Organization ID: ${id}`)
    console.log(`Period: ${period}`)
    console.log(`Where clause:`, JSON.stringify(whereClause, null, 2))

    const [dataPoints, insights, integrations] = await Promise.all([
      prisma.dataPoint.findMany({
        where: whereClause,
        orderBy: {
          dateRecorded: 'asc'
        }
      }),
      prisma.insight.findMany({
        where: {
          organizationId: id
        },
        orderBy: {
          impactScore: 'desc'
        },
        take: 10
      }),
      prisma.integration.findMany({
        where: {
          organizationId: id
        },
        select: {
          id: true,
          platform: true,
          status: true,
          lastSyncAt: true
        }
      })
    ])

    console.log(`Found ${dataPoints.length} dataPoints`)
    console.log(`Found ${integrations.length} integrations`)

    // Only calculate metrics if there are active integrations
    const activeIntegrations = integrations.filter(i => i.status === 'CONNECTED')
    console.log(`Active integrations: ${activeIntegrations.length}`)

    const metrics = activeIntegrations.length > 0 ? calculateMetrics(dataPoints) : {
      revenue: 0,
      orders: 0,
      customers: 0,
      conversionRate: 0
    }

    // Prepare chart data only if there are active integrations
    const chartData = activeIntegrations.length > 0 ? prepareChartData(dataPoints) : {
      revenue: [],
      orders: [],
      customers: [],
      traffic: []
    }

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        chartData,
        insights: activeIntegrations.length > 0 ? insights : [],
        integrations,
        hasActiveIntegrations: activeIntegrations.length > 0,
        period
      }
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateMetrics(dataPoints: any[]) {
  console.log(`\n📊 CALCULATING METRICS:`)
  console.log(`Total dataPoints: ${dataPoints.length}`)

  const metrics = {
    revenue: 0,
    orders: 0,
    customers: 0,
    conversionRate: 0
  }

  // Map metric types - check for both seeded and Shopify sync formats
  const revenuePoints = dataPoints.filter(dp => dp.metricType === 'revenue')
  const orderPoints = dataPoints.filter(dp => dp.metricType === 'orders' || dp.metricType === 'orders_total')
  const customerPoints = dataPoints.filter(dp => dp.metricType === 'customers' || dp.metricType === 'customers_total')
  const conversionPoints = dataPoints.filter(dp => dp.metricType === 'conversion_rate')

  console.log(`Revenue points: ${revenuePoints.length}`)
  console.log(`Order points: ${orderPoints.length}`)
  console.log(`Customer points: ${customerPoints.length}`)

  // Log all unique metric types to see what we actually have
  const uniqueMetricTypes = [...new Set(dataPoints.map(dp => dp.metricType))]
  console.log(`All metric types found:`, uniqueMetricTypes)

  if (revenuePoints.length > 0) {
    // Use the most recent revenue aggregate (not sum to avoid double counting)
    const latestRevenuePoint = revenuePoints.sort((a, b) => new Date(b.dateRecorded).getTime() - new Date(a.dateRecorded).getTime())[0]
    metrics.revenue = Number(latestRevenuePoint.value) || 0
    console.log(`Dashboard using revenue: ₹${metrics.revenue} from aggregate point (${revenuePoints.length} revenue points found)`)
  } else {
    // If no revenue aggregate, calculate from individual orders
    const individualOrders = dataPoints.filter(dp => dp.metricType === 'order')
    if (individualOrders.length > 0) {
      metrics.revenue = individualOrders.reduce((sum, order) => sum + Number(order.value), 0)
      console.log(`Dashboard calculating revenue from ${individualOrders.length} individual orders: ₹${metrics.revenue}`)
    }
  }

  if (orderPoints.length > 0) {
    // Get the most recent order total value - orders must be whole numbers
    const latestOrderPoint = orderPoints[orderPoints.length - 1]
    metrics.orders = Math.floor(Number(latestOrderPoint.value)) || 0
  }

  if (customerPoints.length > 0) {
    // Get the most recent customer count
    const latestCustomerPoint = customerPoints[customerPoints.length - 1]
    metrics.customers = Number(latestCustomerPoint.value) || 0
  }

  if (conversionPoints.length > 0) {
    const lastConversionValue = conversionPoints[conversionPoints.length - 1]?.value
    metrics.conversionRate = Number(lastConversionValue) || 0
  }

  return metrics
}

function prepareChartData(dataPoints: any[]) {
  // Group data points by date
  const dataByDate = new Map()
  const customersByDate = new Map()

  // Check if we have both individual orders and revenue aggregates
  const hasRevenueAggregate = dataPoints.some(dp => dp.metricType === 'revenue')
  const hasIndividualOrders = dataPoints.some(dp => dp.metricType === 'order')

  console.log(`📊 Chart data preparation: hasRevenueAggregate=${hasRevenueAggregate}, hasIndividualOrders=${hasIndividualOrders}`)

  // Process all data points and group by date
  dataPoints.forEach(dp => {
    const date = dp.dateRecorded.toISOString().split('T')[0]

    if (!dataByDate.has(date)) {
      dataByDate.set(date, { date, revenue: 0, orders: 0 })
    }

    if (!customersByDate.has(date)) {
      customersByDate.set(date, { date, customers: 0 })
    }

    const dayData = dataByDate.get(date)
    const customerData = customersByDate.get(date)

    if (dp.metricType === 'revenue') {
      // Only use revenue aggregates if we don't have individual orders to avoid double counting
      if (!hasIndividualOrders) {
        dayData.revenue += Number(dp.value) || 0
        console.log(`📅 Using revenue aggregate on ${date}: ₹${dp.value}`)
      } else {
        console.log(`📅 Skipping revenue aggregate on ${date} (have individual orders): ₹${dp.value}`)
      }
    } else if (dp.metricType === 'order') {
      // For individual Shopify orders, count them AND add their revenue
      dayData.orders = (dayData.orders || 0) + 1
      dayData.revenue += Number(dp.value) || 0
      console.log(`📅 Order on ${date}: ₹${dp.value} - Day total now: ${dayData.orders} orders, ₹${dayData.revenue} revenue`)
    } else if (dp.metricType === 'orders') {
      // For seeded orders data (daily count)
      dayData.orders = Math.floor(Number(dp.value)) || 0
    } else if (dp.metricType === 'customers' || dp.metricType === 'customers_total') {
      // For customer data
      customerData.customers = Math.floor(Number(dp.value)) || 0
    }
  })

  // Generate complete date range for the last 7 days
  const completeRevenueData = generateCompleteDateRange(dataByDate, 7)
  const completeCustomerData = generateCompleteCustomerRange(customersByDate, 7)

  console.log(`\n📊 CHART DATA PREVIEW:`)
  completeRevenueData.filter(d => d.orders > 0 || d.revenue > 0).forEach(d => {
    console.log(`${d.date}: ${d.orders} orders, ₹${d.revenue} revenue`)
  })

  // Only show traffic data if we have actual traffic data points
  const trafficDataPoints = dataPoints.filter(dp => dp.metricType === 'traffic')
  const trafficData = trafficDataPoints.length > 0 ?
    groupTrafficDataBySource(trafficDataPoints) : []

  return {
    revenue: completeRevenueData,
    orders: completeRevenueData, // Orders use the same data as revenue
    customers: completeCustomerData,
    traffic: trafficData
  }
}

function generateCompleteDateRange(dataByDate: Map<string, any>, days: number) {
  const result = []
  const now = new Date()

  // Generate last N days
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dateString = date.toISOString().split('T')[0]

    // Use existing data if available, otherwise default to zeros
    const dayData = dataByDate.get(dateString) || {
      date: dateString,
      revenue: 0,
      orders: 0
    }

    result.push(dayData)
  }

  return result
}

function generateCompleteCustomerRange(customersByDate: Map<string, any>, days: number) {
  const result = []
  const now = new Date()

  // Generate last N days
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dateString = date.toISOString().split('T')[0]

    // Use existing data if available, otherwise return 0
    const dayData = customersByDate.get(dateString) || {
      date: dateString,
      customers: 0
    }

    result.push(dayData)
  }

  return result
}

function groupTrafficDataBySource(trafficDataPoints: any[]) {
  const groupedData: { [key: string]: { source: string, visitors: number, color: string } } = {}

  const sourceColors = {
    'Organic Search': '#3b82f6',
    'Direct': '#10b981',
    'Social Media': '#f59e0b',
    'Email': '#ef4444',
    'Paid Search': '#8b5cf6',
    'Referral': '#06b6d4'
  }

  trafficDataPoints.forEach(dp => {
    let source = (dp as any).source

    // Try to get source from metadata if not direct property
    if (!source && dp.metadata) {
      try {
        const meta = JSON.parse(dp.metadata)
        source = meta.source
      } catch (e) {
        // Ignore parse errors
      }
    }

    source = source || 'Other'
    if (!groupedData[source]) {
      groupedData[source] = {
        source,
        visitors: 0,
        color: sourceColors[source] || '#6b7280'
      }
    }
    groupedData[source].visitors += Number(dp.value) || 0
  })

  return Object.values(groupedData)
}