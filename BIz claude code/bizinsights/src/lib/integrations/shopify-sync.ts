/**
 * Shopify Data Sync Module
 * Extracted from API route for use in background workers
 */

import { prisma } from '@/lib/prisma';

export async function syncShopifyData(
  organizationId: string,
  integrationId: string,
  shopDomain: string,
  accessToken: string
) {
  const baseUrl = `https://${shopDomain}.myshopify.com/admin/api/2023-10`;

  const headers = {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json',
  };

  try {
    // Clear existing DataPoints for fresh sync
    console.log('[Shopify Sync] Clearing existing DataPoints...');
    await prisma.dataPoint.deleteMany({
      where: { integrationId, organizationId },
    });

    // Fetch data from Shopify
    const [ordersResponse, productsResponse, customersResponse, shopResponse] = await Promise.all([
      fetch(`${baseUrl}/orders.json?status=any&limit=250&financial_status=paid,partially_paid`, { headers }),
      fetch(`${baseUrl}/products.json?limit=250`, { headers }),
      fetch(`${baseUrl}/customers.json?limit=250&created_at_min=${getDateDaysAgo(30)}`, { headers }),
      fetch(`${baseUrl}/shop.json`, { headers }),
    ]);

    const [ordersData, productsData, customersData, shopData] = await Promise.all([
      ordersResponse.json(),
      productsResponse.json(),
      customersResponse.json(),
      shopResponse.json(),
    ]);

    const dataPoints = [];
    const now = new Date();
    const shopInfo = shopData.shop;

    let totalRevenue = 0;
    let orderCount = 0;

    // Process orders
    if (ordersData.orders) {
      for (const order of ordersData.orders) {
        const orderValue = parseFloat(order.subtotal_price || order.total_price || '0');
        const currency = order.currency || shopInfo?.currency || 'USD';

        if (order.financial_status === 'paid' || order.financial_status === 'partially_paid') {
          totalRevenue += orderValue;
          orderCount++;

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
            },
            dateRecorded: new Date(order.created_at),
          });
        }
      }

      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'revenue',
        value: totalRevenue,
        metadata: { source: 'shopify_orders_sync', orderCount },
        dateRecorded: now,
      });
    }

    // Process products
    if (productsData.products) {
      let totalInventory = 0;

      for (const product of productsData.products) {
        if (product.variants) {
          for (const variant of product.variants) {
            totalInventory += parseInt(variant.inventory_quantity || '0');
          }
        }
      }

      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'products_total',
        value: productsData.products.length,
        metadata: { source: 'shopify_products_sync' },
        dateRecorded: now,
      });

      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'inventory_total',
        value: totalInventory,
        metadata: { source: 'shopify_products_sync' },
        dateRecorded: now,
      });
    }

    // Process customers
    if (customersData.customers) {
      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'customers_total',
        value: customersData.customers.length,
        metadata: { source: 'shopify_customers_sync' },
        dateRecorded: now,
      });
    }

    // Save all data points
    if (dataPoints.length > 0) {
      await prisma.dataPoint.createMany({ data: dataPoints });
      console.log(`[Shopify Sync] Created ${dataPoints.length} DataPoints`);
    }

    return {
      ordersProcessed: ordersData.orders?.length || 0,
      productsProcessed: productsData.products?.length || 0,
      customersProcessed: customersData.customers?.length || 0,
      dataPointsCreated: dataPoints.length,
      totalRevenue,
      orderCount,
    };
  } catch (error) {
    console.error('[Shopify Sync] Error:', error);
    throw error;
  }
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}
