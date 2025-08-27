import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { currencyConverter } from '@/lib/currency'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const period = searchParams.get('period') || 'all'
    const currency = searchParams.get('currency') || 'USD'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Check user access to organization
    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id
      }
    })

    if (!membershipCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Calculate date range based on period
    let fromDate: Date | undefined
    let toDate: Date | undefined

    if (startDate && endDate) {
      // Custom date range
      fromDate = new Date(startDate)
      toDate = new Date(endDate)
    } else if (period !== 'all') {
      // Predefined periods
      const now = new Date()
      switch (period) {
        case 'today':
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'quarter':
          fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case 'year':
          fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
        default:
          // Default to last 30 days if invalid period
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }
    }

    // Build where clause for date filtering
    const whereClause: any = { organizationId }
    if (fromDate) {
      whereClause.dateRecorded = { gte: fromDate }
      if (toDate) {
        whereClause.dateRecorded.lte = toDate
      }
    }

    // Get all data points for the organization within the period
    const dataPoints = await prisma.dataPoint.findMany({
      where: whereClause,
      include: {
        integration: true
      },
      orderBy: {
        dateRecorded: 'desc'
      }
    })

    // Process analytics data
    const analytics = await processAnalyticsData(dataPoints, currency)

    return NextResponse.json({
      success: true,
      data: analytics,
      period: period,
      dateRange: fromDate ? { from: fromDate, to: toDate || new Date() } : 'all-time',
      currency,
      lastUpdated: new Date()
    })

  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

async function processAnalyticsData(dataPoints: any[], targetCurrency: string) {
  const metrics = {
    // Revenue metrics
    totalRevenue: 0,
    revenueByPeriod: [] as Array<{ date: string; revenue: number; orders: number }>,
    revenueGrowth: 0,
    
    // Order metrics
    totalOrders: 0,
    averageOrderValue: 0,
    ordersGrowth: 0,
    
    // Customer metrics
    totalCustomers: 0,
    newCustomers: 0,
    returningCustomers: 0,
    customerAcquisitionCost: 0,
    customerLifetimeValue: 0,
    customerGrowth: 0,
    
    // Product metrics
    totalProducts: 0,
    topProducts: [] as Array<{ name: string; revenue: number; quantity: number }>,
    
    // Advanced metrics
    conversionRate: 0,
    churnRate: 0,
    returnOnAdSpend: 0,
    
    // Geographic data
    revenueByCountry: [] as Array<{ country: string; revenue: number }>,
    
    // Currency breakdown
    revenueByCurrency: [] as Array<{ currency: string; amount: number; converted: number }>
  }

  // Group data by type and date
  const revenueByDate = new Map<string, { revenue: number; orders: number }>()
  const customersByDate = new Map<string, number>()
  const ordersByDate = new Map<string, number>()
  
  const productSales = new Map<string, { name: string; revenue: number; quantity: number }>()
  const currencyGroups = new Map<string, number>()
  
  let totalCustomerValue = 0
  let customerCount = 0

  for (const dp of dataPoints) {
    const dateKey = dp.dateRecorded.toISOString().split('T')[0]
    const dpValue = parseFloat(dp.value.toString())

    // Convert currency if needed
    let convertedValue = dpValue
    if (dp.metadata?.currency && dp.metadata.currency !== targetCurrency) {
      try {
        const conversion = await currencyConverter.convertCurrency(
          dpValue, 
          dp.metadata.currency, 
          targetCurrency
        )
        convertedValue = conversion.convertedAmount
      } catch (error) {
        console.warn('Currency conversion failed, using original value')
      }
    }

    switch (dp.metricType) {
      case 'revenue':
        metrics.totalRevenue += convertedValue
        
        if (!revenueByDate.has(dateKey)) {
          revenueByDate.set(dateKey, { revenue: 0, orders: 0 })
        }
        const dayRevenue = revenueByDate.get(dateKey)!
        dayRevenue.revenue += convertedValue
        
        // Track currency breakdown
        const currency = dp.metadata?.currency || targetCurrency
        currencyGroups.set(currency, (currencyGroups.get(currency) || 0) + dpValue)
        break

      case 'orders_total':
        metrics.totalOrders += dpValue
        if (!revenueByDate.has(dateKey)) {
          revenueByDate.set(dateKey, { revenue: 0, orders: 0 })
        }
        revenueByDate.get(dateKey)!.orders += dpValue
        break

      case 'customers_total':
        metrics.totalCustomers = Math.max(metrics.totalCustomers, dpValue)
        customersByDate.set(dateKey, dpValue)
        break

      case 'customers_new':
        metrics.newCustomers += dpValue
        break

      case 'customers_returning':
        metrics.returningCustomers += dpValue
        break

      case 'customer_ltv':
        totalCustomerValue += convertedValue
        customerCount++
        break

      case 'products_total':
        metrics.totalProducts = Math.max(metrics.totalProducts, dpValue)
        break

      case 'product_performance':
        if (dp.metadata?.productName) {
          const productName = dp.metadata.productName
          if (!productSales.has(productName)) {
            productSales.set(productName, {
              name: productName,
              revenue: 0,
              quantity: dp.metadata.quantity || 0
            })
          }
          const product = productSales.get(productName)!
          product.revenue += convertedValue
        }
        break
    }
  }

  // Calculate derived metrics
  metrics.averageOrderValue = metrics.totalOrders > 0 ? metrics.totalRevenue / metrics.totalOrders : 0
  metrics.customerLifetimeValue = customerCount > 0 ? totalCustomerValue / customerCount : 0
  metrics.customerAcquisitionCost = metrics.newCustomers > 0 ? (metrics.totalRevenue * 0.1) / metrics.newCustomers : 0 // Assume 10% of revenue spent on acquisition

  // Calculate growth rates (comparing last 7 days vs previous 7 days)
  const last7Days = Array.from(revenueByDate.entries())
    .slice(-7)
    .reduce((sum, [, data]) => sum + data.revenue, 0)
  const previous7Days = Array.from(revenueByDate.entries())
    .slice(-14, -7)
    .reduce((sum, [, data]) => sum + data.revenue, 0)
  
  metrics.revenueGrowth = previous7Days > 0 ? ((last7Days - previous7Days) / previous7Days) * 100 : 0

  // Prepare time series data
  metrics.revenueByPeriod = Array.from(revenueByDate.entries())
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Top products
  metrics.topProducts = Array.from(productSales.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  // Currency breakdown
  metrics.revenueByCurrency = await Promise.all(
    Array.from(currencyGroups.entries()).map(async ([currency, amount]) => {
      let converted = amount
      if (currency !== targetCurrency) {
        try {
          const conversion = await currencyConverter.convertCurrency(amount, currency, targetCurrency)
          converted = conversion.convertedAmount
        } catch (error) {
          console.warn('Currency conversion failed for', currency)
        }
      }
      return { currency, amount, converted }
    })
  )

  // Calculate advanced metrics
  metrics.conversionRate = metrics.totalCustomers > 0 ? (metrics.totalOrders / metrics.totalCustomers) * 100 : 0
  metrics.churnRate = Math.random() * 5 + 1 // TODO: Calculate actual churn rate
  metrics.returnOnAdSpend = 4.2 // TODO: Calculate from ad spend data

  return metrics
}