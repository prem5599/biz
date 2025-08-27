import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
// import crypto from 'crypto' // Not used currently

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

    console.log('Syncing Shopify data for organization:', organizationId)

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

    const integration = await prisma.integration.findUnique({
      where: {
        organizationId_platform: {
          organizationId,
          platform: 'SHOPIFY'
        }
      }
    })

    if (!integration || integration.status !== 'CONNECTED') {
      return NextResponse.json(
        { error: 'Shopify integration not found or not connected' },
        { status: 404 }
      )
    }

    await prisma.integration.update({
      where: { id: integration.id },
      data: { status: 'SYNCING' }
    })

    // Clear existing DataPoints for this integration to avoid duplication
    console.log('Clearing existing DataPoints for fresh sync...')
    await prisma.dataPoint.deleteMany({
      where: {
        integrationId: integration.id,
        organizationId
      }
    })

    const accessToken = decryptToken(integration.accessToken)
    const shopDomain = integration.metadata?.shopDomain as string

    const syncResults = await syncShopifyData(
      organizationId,
      integration.id,
      shopDomain,
      accessToken
    )

    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        status: 'CONNECTED',
        lastSyncAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: syncResults
    })
  } catch (error) {
    console.error('Error syncing Shopify data:', error)
    
    // Set integration status back to CONNECTED if it was SYNCING
    try {
      await prisma.integration.updateMany({
        where: {
          organizationId,
          platform: 'SHOPIFY',
          status: 'SYNCING'
        },
        data: {
          status: 'CONNECTED'
        }
      })
    } catch (updateError) {
      console.error('Error updating integration status:', updateError)
    }
    
    return NextResponse.json(
      { 
        error: 'Sync failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

function decryptToken(encryptedToken: string): string {
  // For now, return the token as-is (assuming it's stored unencrypted)
  // In production, implement proper encryption/decryption
  return encryptedToken
}

async function syncShopifyData(
  organizationId: string,
  integrationId: string,
  shopDomain: string,
  accessToken: string
) {
  const baseUrl = `https://${shopDomain}.myshopify.com/admin/api/2023-10`
  
  const headers = {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json'
  }

  try {
    // Fetch comprehensive data from Shopify
    const [
      ordersResponse, 
      productsResponse, 
      customersResponse,
      shopResponse
    ] = await Promise.all([
      fetch(`${baseUrl}/orders.json?status=any&limit=250&financial_status=paid,partially_paid`, { headers }),
      fetch(`${baseUrl}/products.json?limit=250`, { headers }),
      fetch(`${baseUrl}/customers.json?limit=250&created_at_min=${getDateDaysAgo(30)}`, { headers }),
      fetch(`${baseUrl}/shop.json`, { headers })
    ])

    const [ordersData, productsData, customersData, shopData] = await Promise.all([
      ordersResponse.json(),
      productsResponse.json(),
      customersResponse.json(),
      shopResponse.json()
    ])

    console.log(`\n🛒 SHOPIFY API RESPONSE:`)
    console.log(`Orders response status: ${ordersResponse.status}`)
    console.log(`Orders data:`, ordersData?.orders ? `${ordersData.orders.length} orders` : 'No orders')
    console.log(`Shop data:`, shopData?.shop ? 'Shop info received' : 'No shop info')
    
    // Check for errors in Shopify responses
    if (ordersData?.errors) {
      console.error('Shopify Orders API Error:', ordersData.errors)
    }
    if (shopData?.errors) {
      console.error('Shopify Shop API Error:', shopData.errors)
    }

    const dataPoints = []
    const now = new Date()
    const shopInfo = shopData.shop

    // Initialize variables outside the if block
    let totalRevenue = 0
    let orderCount = 0
    const currencyGroups = new Map()
    const productSales = new Map()
    let totalTax = 0
    let totalShipping = 0

    // Process orders with enhanced analytics
    if (ordersData.orders) {
      const fromDate = getDateDaysAgo(30)
      console.log(`Processing ${ordersData.orders.length} orders from Shopify (from ${fromDate} to now)...`)

      for (const order of ordersData.orders) {
        // Use subtotal_price (excluding tax and shipping) to match Shopify dashboard
        const orderValue = parseFloat(order.subtotal_price || order.total_price || '0')
        const currency = order.currency || shopInfo?.currency || 'USD'
        
        // Count paid orders (API already filters for paid/partially_paid)
        if (order.financial_status === 'paid' || order.financial_status === 'partially_paid') {
          console.log(`✅ Order #${order.order_number}: ₹${orderValue} | Status: ${order.financial_status} | Created: ${new Date(order.created_at).toLocaleDateString()} | Subtotal: ₹${order.subtotal_price}`)
          totalRevenue += orderValue
          orderCount++
        } else {
          console.log(`❌ Skipped Order #${order.order_number}: ₹${orderValue} | Status: ${order.financial_status}`)
        }
        
        totalTax += parseFloat(order.total_tax || '0')
        totalShipping += parseFloat(order.total_shipping_price_set?.shop_money?.amount || '0')

        // Group by currency for paid orders
        if (order.financial_status === 'paid' || order.financial_status === 'partially_paid') {
          if (!currencyGroups.has(currency)) {
            currencyGroups.set(currency, { count: 0, total: 0 })
          }
          const currencyGroup = currencyGroups.get(currency)
          currencyGroup.count++
          currencyGroup.total += orderValue
        }

        // Track product sales
        if (order.line_items) {
          for (const item of order.line_items) {
            const productId = item.product_id?.toString()
            if (productId) {
              if (!productSales.has(productId)) {
                productSales.set(productId, {
                  name: item.name,
                  quantity: 0,
                  revenue: 0
                })
              }
              const product = productSales.get(productId)
              product.quantity += parseInt(item.quantity || '0')
              product.revenue += parseFloat(item.price || '0') * parseInt(item.quantity || '0')
            }
          }
        }

        // Individual order data point (for paid orders)
        if (order.financial_status === 'paid' || order.financial_status === 'partially_paid') {
          dataPoints.push({
            integrationId,
            organizationId,
            metricType: 'order',
            value: orderValue,
            metadata: {
              orderId: order.id,
              orderNumber: order.order_number,
              currency,
              customerEmail: order.email,
              financialStatus: order.financial_status,
              fulfillmentStatus: order.fulfillment_status,
              subtotalPrice: order.subtotal_price,
              totalPrice: order.total_price,
              totalTax: order.total_tax,
              totalShipping: order.total_shipping_price_set?.shop_money?.amount,
              itemCount: order.line_items?.length || 0,
              customerInfo: {
                isFirstTime: order.customer?.orders_count === 1,
                totalOrders: order.customer?.orders_count
              }
            },
            dateRecorded: new Date(order.created_at)
          })
        }
      }

      console.log(`\n📊 SYNC SUMMARY:`)
      console.log(`Total Orders Fetched: ${ordersData.orders.length}`)
      console.log(`Paid Orders: ${orderCount}`)
      console.log(`Total Revenue Calculated: ₹${totalRevenue}`)
      console.log(`Date Range: All-time (no date filter)`)
      console.log(`Using: subtotal_price (excludes tax & shipping)`)
      console.log(`\n🎯 This should match your Shopify total revenue`)

      // Aggregate revenue data points by currency
      for (const [currency, data] of currencyGroups.entries()) {
        dataPoints.push({
          integrationId,
          organizationId,
          metricType: 'revenue',
          value: data.total,
          metadata: { 
            source: 'shopify_orders_sync',
            currency,
            orderCount: data.count,
            period: '30_days'
          },
          dateRecorded: now
        })
      }

      // Total orders metric
      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'orders_total',
        value: orderCount,
        metadata: { 
          source: 'shopify_orders_sync',
          period: '30_days',
          totalRevenue,
          avgOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0
        },
        dateRecorded: now
      })

      // Tax and shipping metrics
      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'tax_collected',
        value: totalTax,
        metadata: { source: 'shopify_orders_sync', period: '30_days' },
        dateRecorded: now
      })

      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'shipping_revenue',
        value: totalShipping,
        metadata: { source: 'shopify_orders_sync', period: '30_days' },
        dateRecorded: now
      })

      // Top products
      const topProducts = Array.from(productSales.entries())
        .sort(([,a], [,b]) => b.revenue - a.revenue)
        .slice(0, 10)

      for (const [productId, product] of topProducts) {
        dataPoints.push({
          integrationId,
          organizationId,
          metricType: 'product_performance',
          value: product.revenue,
          metadata: {
            productId,
            productName: product.name,
            quantity: product.quantity,
            source: 'shopify_products_sync'
          },
          dateRecorded: now
        })
      }
    }

    // Process customers with segmentation
    if (customersData.customers) {
      let newCustomers = 0
      let returningCustomers = 0
      let totalCustomerValue = 0

      for (const customer of customersData.customers) {
        const ordersCount = parseInt(customer.orders_count || '0')
        const totalSpent = parseFloat(customer.total_spent || '0')
        
        if (ordersCount === 1) {
          newCustomers++
        } else if (ordersCount > 1) {
          returningCustomers++
        }
        
        totalCustomerValue += totalSpent

        // Customer lifetime value tracking
        dataPoints.push({
          integrationId,
          organizationId,
          metricType: 'customer_ltv',
          value: totalSpent,
          metadata: {
            customerId: customer.id,
            email: customer.email,
            ordersCount,
            isNew: ordersCount === 1,
            firstOrderDate: customer.created_at,
            lastOrderDate: customer.updated_at
          },
          dateRecorded: new Date(customer.updated_at)
        })
      }

      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'customers_total',
        value: customersData.customers.length,
        metadata: { source: 'shopify_customers_sync', period: '30_days' },
        dateRecorded: now
      })

      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'customers_new',
        value: newCustomers,
        metadata: { source: 'shopify_customers_sync', period: '30_days' },
        dateRecorded: now
      })

      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'customers_returning',
        value: returningCustomers,
        metadata: { source: 'shopify_customers_sync', period: '30_days' },
        dateRecorded: now
      })

      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'customer_avg_value',
        value: customersData.customers.length > 0 ? totalCustomerValue / customersData.customers.length : 0,
        metadata: { source: 'shopify_customers_sync' },
        dateRecorded: now
      })
    }

    // Process products with inventory and performance metrics
    if (productsData.products) {
      let totalProducts = 0
      let publishedProducts = 0
      let totalInventory = 0
      const productCategories = new Map()

      for (const product of productsData.products) {
        totalProducts++
        if (product.status === 'active') publishedProducts++

        // Inventory tracking
        if (product.variants) {
          for (const variant of product.variants) {
            totalInventory += parseInt(variant.inventory_quantity || '0')
          }
        }

        // Category tracking
        if (product.product_type) {
          const category = product.product_type
          productCategories.set(category, (productCategories.get(category) || 0) + 1)
        }
      }

      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'products_total',
        value: totalProducts,
        metadata: { 
          source: 'shopify_products_sync',
          published: publishedProducts,
          categories: Array.from(productCategories.entries())
        },
        dateRecorded: now
      })

      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'inventory_total',
        value: totalInventory,
        metadata: { source: 'shopify_products_sync' },
        dateRecorded: now
      })
    }

    // Store shop information
    if (shopInfo) {
      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'shop_info',
        value: 1,
        metadata: {
          shopName: shopInfo.name,
          domain: shopInfo.domain,
          currency: shopInfo.currency,
          timezone: shopInfo.iana_timezone,
          country: shopInfo.country,
          planName: shopInfo.plan_name,
          createdAt: shopInfo.created_at
        },
        dateRecorded: now
      })
    }

    // Save all data points
    console.log(`\n💾 SAVING DATA:`)
    console.log(`Total DataPoints to create: ${dataPoints.length}`)
    
    if (dataPoints.length > 0) {
      // Log first few dataPoints for debugging
      console.log('Sample DataPoints:', JSON.stringify(dataPoints.slice(0, 2), null, 2))
      
      const result = await prisma.dataPoint.createMany({
        data: dataPoints
      })
      console.log(`✅ Successfully created ${result.count} DataPoints`)
    } else {
      console.log('❌ No DataPoints to save!')
    }

    return {
      ordersProcessed: ordersData.orders?.length || 0,
      productsProcessed: productsData.products?.length || 0,
      customersProcessed: customersData.customers?.length || 0,
      dataPointsCreated: dataPoints.length,
      totalRevenue: totalRevenue,
      orderCount: orderCount,
      shopInfo: shopInfo ? {
        name: shopInfo.name,
        currency: shopInfo.currency,
        domain: shopInfo.domain
      } : null,
      debug: {
        fetchedOrdersCount: ordersData.orders?.length || 0,
        paidOrdersCount: orderCount,
        calculatedRevenue: totalRevenue,
        currencyBreakdown: Array.from(currencyGroups.entries())
      }
    }
  } catch (error) {
    console.error('Error syncing Shopify data:', error)
    
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    throw error
  }
}

function getDateDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}