import { prisma } from '@/lib/prisma'

export interface ProductData {
  id: string
  name: string
  price: number
  inventory: number
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
  sales: number
  revenue: number
  category?: string
  platform: 'shopify' | 'woocommerce'
}

export interface InventoryAlert {
  productId: string
  productName: string
  issue: 'low_stock' | 'out_of_stock'
  stockLevel: number
  platform: 'shopify' | 'woocommerce'
}

export async function fetchShopifyProducts(
  organizationId: string,
  integration: any
): Promise<{ products: ProductData[], alerts: InventoryAlert[] }> {
  try {
    const shopDomain = integration.metadata?.shopDomain as string
    const accessToken = integration.accessToken
    
    if (!shopDomain || !accessToken) {
      throw new Error('Shopify integration configuration incomplete')
    }

    const baseUrl = `https://${shopDomain}.myshopify.com/admin/api/2023-10`
    const headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    }

    // Fetch products and their sales data
    const [productsResponse, ordersResponse] = await Promise.all([
      fetch(`${baseUrl}/products.json?limit=250`, { headers }),
      fetch(`${baseUrl}/orders.json?status=any&limit=250&financial_status=paid,partially_paid`, { headers })
    ])

    if (!productsResponse.ok || !ordersResponse.ok) {
      throw new Error('Failed to fetch Shopify data')
    }

    const [productsData, ordersData] = await Promise.all([
      productsResponse.json(),
      ordersResponse.json()
    ])

    console.log(`Shopify API returned ${productsData.products?.length || 0} products and ${ordersData.orders?.length || 0} orders`)

    // Calculate sales data for each product
    const productSales = new Map<string, { quantity: number, revenue: number }>()
    
    if (ordersData.orders) {
      for (const order of ordersData.orders) {
        if (order.line_items) {
          for (const item of order.line_items) {
            const productId = item.product_id?.toString()
            if (productId) {
              if (!productSales.has(productId)) {
                productSales.set(productId, { quantity: 0, revenue: 0 })
              }
              const sales = productSales.get(productId)!
              sales.quantity += parseInt(item.quantity || '0')
              sales.revenue += parseFloat(item.price || '0') * parseInt(item.quantity || '0')
            }
          }
        }
      }
    }

    const products: ProductData[] = []
    const alerts: InventoryAlert[] = []

    if (productsData.products) {
      for (const product of productsData.products) {
        const productId = product.id.toString()
        const salesData = productSales.get(productId) || { quantity: 0, revenue: 0 }
        console.log(`Processing Shopify product: ID=${productId}, Title="${product.title}", Variants=${product.variants?.length || 0}`)
        
        // Calculate total inventory and average price across all variants
        const variants = product.variants || []
        const totalInventory = variants.reduce((sum, variant) => 
          sum + parseInt(variant.inventory_quantity || '0'), 0)
        const avgPrice = variants.length > 0 ? 
          variants.reduce((sum, variant) => sum + parseFloat(variant.price || '0'), 0) / variants.length : 0
        
        // Determine overall product status
        let status: 'in_stock' | 'low_stock' | 'out_of_stock'
        if (totalInventory === 0) {
          status = 'out_of_stock'
          alerts.push({
            productId,
            productName: product.title,
            issue: 'out_of_stock',
            stockLevel: totalInventory,
            platform: 'shopify'
          })
        } else if (totalInventory <= 10) {
          status = 'low_stock'
          alerts.push({
            productId,
            productName: product.title,
            issue: 'low_stock',
            stockLevel: totalInventory,
            platform: 'shopify'
          })
        } else {
          status = 'in_stock'
        }

        products.push({
          id: productId,
          name: product.title,
          price: avgPrice,
          inventory: totalInventory,
          status,
          sales: salesData.quantity,
          revenue: salesData.revenue,
          category: product.product_type,
          platform: 'shopify'
        })
      }
    }

    return { products, alerts }
  } catch (error) {
    console.error('Error fetching Shopify products:', error)
    return { products: [], alerts: [] }
  }
}

export async function fetchWooCommerceProducts(
  organizationId: string,
  integration: any
): Promise<{ products: ProductData[], alerts: InventoryAlert[] }> {
  try {
    const config = integration.config as any
    const storeUrl = config?.storeUrl
    const authHeader = integration.accessToken

    if (!storeUrl || !authHeader) {
      throw new Error('WooCommerce integration configuration incomplete')
    }

    // Fetch products and orders
    const [productsResponse, ordersResponse] = await Promise.all([
      fetch(`${storeUrl.replace(/\/$/, '')}/wp-json/wc/v3/products?per_page=100`, {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch(`${storeUrl.replace(/\/$/, '')}/wp-json/wc/v3/orders?per_page=100&status=completed,processing`, {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      })
    ])

    if (!productsResponse.ok || !ordersResponse.ok) {
      throw new Error('Failed to fetch WooCommerce data')
    }

    const [productsData, ordersData] = await Promise.all([
      productsResponse.json(),
      ordersResponse.json()
    ])

    console.log(`WooCommerce API returned ${productsData.length || 0} products and ${ordersData.length || 0} orders`)

    // Calculate sales data
    const productSales = new Map<string, { quantity: number, revenue: number }>()
    
    for (const order of ordersData) {
      if (order.line_items) {
        for (const item of order.line_items) {
          const productId = item.product_id?.toString()
          if (productId) {
            if (!productSales.has(productId)) {
              productSales.set(productId, { quantity: 0, revenue: 0 })
            }
            const sales = productSales.get(productId)!
            sales.quantity += parseInt(item.quantity || '0')
            sales.revenue += parseFloat(item.total || '0')
          }
        }
      }
    }

    const products: ProductData[] = []
    const alerts: InventoryAlert[] = []

    for (const product of productsData) {
      const inventory = parseInt(product.stock_quantity || '0')
      const price = parseFloat(product.price || '0')
      const productId = product.id.toString()
      
      const salesData = productSales.get(productId) || { quantity: 0, revenue: 0 }
      console.log(`Processing WooCommerce product: ID=${productId}, Name="${product.name}", Stock=${inventory}`)
      
      let status: 'in_stock' | 'low_stock' | 'out_of_stock'
      if (product.stock_status === 'outofstock' || inventory === 0) {
        status = 'out_of_stock'
        alerts.push({
          productId,
          productName: product.name,
          issue: 'out_of_stock',
          stockLevel: inventory,
          platform: 'woocommerce'
        })
      } else if (inventory <= 10) {
        status = 'low_stock'
        alerts.push({
          productId,
          productName: product.name,
          issue: 'low_stock',
          stockLevel: inventory,
          platform: 'woocommerce'
        })
      } else {
        status = 'in_stock'
      }

      products.push({
        id: productId,
        name: product.name,
        price,
        inventory,
        status,
        sales: salesData.quantity,
        revenue: salesData.revenue,
        category: product.categories?.[0]?.name,
        platform: 'woocommerce'
      })
    }

    return { products, alerts }
  } catch (error) {
    console.error('Error fetching WooCommerce products:', error)
    return { products: [], alerts: [] }
  }
}

export async function fetchIntegratedProductData(organizationId: string) {
  try {
    // Get all connected integrations for the organization
    const integrations = await prisma.integration.findMany({
      where: {
        organizationId,
        platform: { in: ['SHOPIFY', 'WOOCOMMERCE'] },
        status: 'CONNECTED'
      }
    })

    console.log(`Found ${integrations.length} connected integrations for org ${organizationId}`)

    const allProducts: ProductData[] = []
    const allAlerts: InventoryAlert[] = []

    // Fetch data from each connected platform
    for (const integration of integrations) {
      console.log(`Fetching data from ${integration.platform} integration...`)
      if (integration.platform === 'SHOPIFY') {
        const { products, alerts } = await fetchShopifyProducts(organizationId, integration)
        console.log(`Shopify returned ${products.length} products`)
        if (products.length > 0) {
          console.log('Sample Shopify product:', JSON.stringify(products[0], null, 2))
        }
        allProducts.push(...products)
        allAlerts.push(...alerts)
      } else if (integration.platform === 'WOOCOMMERCE') {
        const { products, alerts } = await fetchWooCommerceProducts(organizationId, integration)
        console.log(`WooCommerce returned ${products.length} products`)
        if (products.length > 0) {
          console.log('Sample WooCommerce product:', JSON.stringify(products[0], null, 2))
        }
        allProducts.push(...products)
        allAlerts.push(...alerts)
      }
    }

    return {
      products: allProducts,
      inventoryAlerts: allAlerts,
      totalProducts: allProducts.length,
      platformBreakdown: {
        shopify: allProducts.filter(p => p.platform === 'shopify').length,
        woocommerce: allProducts.filter(p => p.platform === 'woocommerce').length
      }
    }
  } catch (error) {
    console.error('Error fetching integrated product data:', error)
    
    // Return fallback data if real API fails
    return {
      products: [],
      inventoryAlerts: [],
      totalProducts: 0,
      platformBreakdown: { shopify: 0, woocommerce: 0 }
    }
  }
}