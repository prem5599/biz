import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId } = await request.json()

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const { prisma } = await import('@/lib/prisma')

    // Check if user has access to the organization
    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id
      }
    })

    if (!membershipCheck) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Find the WooCommerce integration
    const integration = await prisma.integration.findUnique({
      where: {
        organizationId_platform: {
          organizationId,
          platform: 'WOOCOMMERCE'
        }
      }
    })

    if (!integration || integration.status !== 'CONNECTED') {
      return NextResponse.json(
        { error: 'WooCommerce integration not found or not connected' },
        { status: 404 }
      )
    }

    const config = integration.config as any
    const storeUrl = config?.storeUrl
    const authHeader = integration.accessToken

    if (!storeUrl || !authHeader) {
      return NextResponse.json(
        { error: 'Integration configuration is incomplete' },
        { status: 400 }
      )
    }

    // Fetch data from WooCommerce API
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const endpoints = [
      '/wp-json/wc/v3/orders',
      '/wp-json/wc/v3/customers',
      '/wp-json/wc/v3/products',
      '/wp-json/wc/v3/reports/sales'
    ]

    const results = await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        const url = `${storeUrl.replace(/\/$/, '')}${endpoint}?after=${thirtyDaysAgo.toISOString()}&per_page=100`
        const response = await fetch(url, {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`)
        }

        return response.json()
      })
    )

    let orders = []
    let customers = []
    let products = []
    let salesReports = []

    // Process results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        switch (index) {
          case 0: orders = result.value; break
          case 1: customers = result.value; break
          case 2: products = result.value; break
          case 3: salesReports = result.value; break
        }
      }
    })

    // Create data points from WooCommerce data
    const dataPoints = []

    // Revenue data from orders
    if (orders.length > 0) {
      const ordersByDate = new Map()
      
      orders.forEach((order: any) => {
        if (order.status === 'completed' || order.status === 'processing') {
          const date = new Date(order.date_created).toISOString().split('T')[0]
          if (!ordersByDate.has(date)) {
            ordersByDate.set(date, { revenue: 0, count: 0 })
          }
          const dayData = ordersByDate.get(date)
          dayData.revenue += parseFloat(order.total || 0)
          dayData.count += 1
        }
      })

      // Create revenue and order data points
      for (const [date, data] of ordersByDate.entries()) {
        dataPoints.push({
          organizationId,
          integrationId: integration.id,
          metricType: 'revenue',
          value: data.revenue,
          dateRecorded: new Date(date),
          source: 'woocommerce'
        })

        dataPoints.push({
          organizationId,
          integrationId: integration.id,
          metricType: 'orders',
          value: data.count,
          dateRecorded: new Date(date),
          source: 'woocommerce'
        })
      }
    }

    // Customer data
    if (customers.length > 0) {
      dataPoints.push({
        organizationId,
        integrationId: integration.id,
        metricType: 'customers',
        value: customers.length,
        dateRecorded: now,
        source: 'woocommerce'
      })
    }

    // Product data
    if (products.length > 0) {
      const totalProducts = products.length
      const inStockProducts = products.filter((product: any) => 
        product.stock_status === 'instock'
      ).length
      
      dataPoints.push({
        organizationId,
        integrationId: integration.id,
        metricType: 'total_products',
        value: totalProducts,
        dateRecorded: now,
        source: 'woocommerce'
      })

      dataPoints.push({
        organizationId,
        integrationId: integration.id,
        metricType: 'products_in_stock',
        value: inStockProducts,
        dateRecorded: now,
        source: 'woocommerce'
      })

      // Calculate average product price
      const totalValue = products.reduce((sum: number, product: any) => 
        sum + parseFloat(product.price || 0), 0
      )
      const avgPrice = totalProducts > 0 ? totalValue / totalProducts : 0
      
      dataPoints.push({
        organizationId,
        integrationId: integration.id,
        metricType: 'avg_product_price',
        value: avgPrice,
        dateRecorded: now,
        source: 'woocommerce'
      })
    }

    // Calculate conversion rate (simplified)
    if (orders.length > 0 && customers.length > 0) {
      const conversionRate = (orders.length / customers.length) * 100
      dataPoints.push({
        organizationId,
        integrationId: integration.id,
        metricType: 'conversion_rate',
        value: conversionRate,
        dateRecorded: now,
        source: 'woocommerce'
      })
    }

    // Save data points to database
    if (dataPoints.length > 0) {
      await prisma.dataPoint.createMany({
        data: dataPoints,
        skipDuplicates: true
      })
    }

    // Update integration sync time
    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastSyncAt: now }
    })

    return NextResponse.json({
      success: true,
      data: {
        synced: dataPoints.length,
        orders: orders.length,
        customers: customers.length,
        products: products.length,
        lastSyncAt: now
      }
    })
  } catch (error) {
    console.error('Error syncing WooCommerce:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}