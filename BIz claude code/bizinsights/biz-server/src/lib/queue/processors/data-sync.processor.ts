/**
 * Data Sync Job Processor
 *
 * Handles background synchronization of data from integrated platforms.
 * Supports Shopify, Stripe, Google Analytics, Facebook Ads, and WooCommerce.
 */

import { Job } from 'bull';
import { DataSyncJob } from '../queue-service';
import { prisma } from '@/lib/prisma';

export async function processDataSync(job: Job<DataSyncJob>): Promise<any> {
  const { integrationId, organizationId, platform, syncType, startDate, endDate } = job.data;

  console.log(`Starting ${syncType} data sync for ${platform} (Integration: ${integrationId})`);

  try {
    // Update job progress
    await job.progress(10);

    // Get integration details from database
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
      include: { organization: true },
    });

    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    if (integration.status !== 'CONNECTED') {
      throw new Error(`Integration ${integrationId} is not connected`);
    }

    await job.progress(20);

    // Route to appropriate platform sync handler
    let result;
    switch (platform.toLowerCase()) {
      case 'shopify':
        result = await syncShopifyData(integration, syncType, startDate, endDate, job);
        break;

      case 'stripe':
        result = await syncStripeData(integration, syncType, startDate, endDate, job);
        break;

      case 'google-analytics':
      case 'google_analytics':
        result = await syncGoogleAnalyticsData(integration, syncType, startDate, endDate, job);
        break;

      case 'facebook-ads':
      case 'facebook_ads':
        result = await syncFacebookAdsData(integration, syncType, startDate, endDate, job);
        break;

      case 'woocommerce':
        result = await syncWooCommerceData(integration, syncType, startDate, endDate, job);
        break;

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Update last sync time
    await prisma.integration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    await job.progress(100);

    console.log(`Data sync completed for ${platform}:`, result);

    return {
      success: true,
      platform,
      syncType,
      recordsSynced: result.recordsSynced,
      duration: Date.now() - job.timestamp,
    };
  } catch (error: any) {
    console.error(`Data sync failed for ${platform}:`, error);

    // Update integration status if critical error
    if (error.message.includes('authentication') || error.message.includes('token')) {
      await prisma.integration.update({
        where: { id: integrationId },
        data: { status: 'ERROR' },
      });
    }

    throw error;
  }
}

/**
 * Sync Shopify data
 */
async function syncShopifyData(
  integration: any,
  syncType: string,
  startDate?: string,
  endDate?: string,
  job?: Job
): Promise<{ recordsSynced: number }> {
  // Import Shopify API client dynamically to avoid circular dependencies
  const { syncShopifyOrders, syncShopifyProducts, syncShopifyCustomers } = await import(
    '@/lib/integrations/shopify'
  );

  let recordsSynced = 0;

  try {
    if (job) await job.progress(30);

    // Sync orders
    const ordersResult = await syncShopifyOrders(integration, startDate, endDate);
    recordsSynced += ordersResult.count;

    if (job) await job.progress(50);

    // Sync products
    const productsResult = await syncShopifyProducts(integration);
    recordsSynced += productsResult.count;

    if (job) await job.progress(70);

    // Sync customers
    const customersResult = await syncShopifyCustomers(integration);
    recordsSynced += customersResult.count;

    if (job) await job.progress(90);

    return { recordsSynced };
  } catch (error) {
    console.error('Shopify sync error:', error);
    throw error;
  }
}

/**
 * Sync Stripe data
 */
async function syncStripeData(
  integration: any,
  syncType: string,
  startDate?: string,
  endDate?: string,
  job?: Job
): Promise<{ recordsSynced: number }> {
  // Import Stripe sync functions
  const { syncStripeCharges, syncStripeCustomers } = await import('@/lib/integrations/stripe');

  let recordsSynced = 0;

  try {
    if (job) await job.progress(40);

    // Sync charges
    const chargesResult = await syncStripeCharges(integration, startDate, endDate);
    recordsSynced += chargesResult.count;

    if (job) await job.progress(70);

    // Sync customers
    const customersResult = await syncStripeCustomers(integration);
    recordsSynced += customersResult.count;

    if (job) await job.progress(90);

    return { recordsSynced };
  } catch (error) {
    console.error('Stripe sync error:', error);
    throw error;
  }
}

/**
 * Sync Google Analytics data
 */
async function syncGoogleAnalyticsData(
  integration: any,
  syncType: string,
  startDate?: string,
  endDate?: string,
  job?: Job
): Promise<{ recordsSynced: number }> {
  // Import GA sync functions
  const { syncGoogleAnalyticsData: syncGA } = await import(
    '@/lib/integrations/google-analytics'
  );

  try {
    if (job) await job.progress(50);

    const result = await syncGA(integration, startDate, endDate);

    if (job) await job.progress(90);

    return { recordsSynced: result.dataPointsCreated };
  } catch (error) {
    console.error('Google Analytics sync error:', error);
    throw error;
  }
}

/**
 * Sync Facebook Ads data
 */
async function syncFacebookAdsData(
  integration: any,
  syncType: string,
  startDate?: string,
  endDate?: string,
  job?: Job
): Promise<{ recordsSynced: number }> {
  // Import Facebook Ads sync functions
  const { syncFacebookAdsData: syncFB } = await import('@/lib/integrations/facebook-ads');

  try {
    if (job) await job.progress(50);

    const result = await syncFB(integration, startDate, endDate);

    if (job) await job.progress(90);

    return { recordsSynced: result.campaignsSynced };
  } catch (error) {
    console.error('Facebook Ads sync error:', error);
    throw error;
  }
}

/**
 * Sync WooCommerce data
 */
async function syncWooCommerceData(
  integration: any,
  syncType: string,
  startDate?: string,
  endDate?: string,
  job?: Job
): Promise<{ recordsSynced: number }> {
  // Import WooCommerce sync functions
  const { syncWooCommerceData: syncWoo } = await import('@/lib/integrations/woocommerce');

  try {
    if (job) await job.progress(50);

    const result = await syncWoo(integration, startDate, endDate);

    if (job) await job.progress(90);

    return { recordsSynced: result.ordersSynced };
  } catch (error) {
    console.error('WooCommerce sync error:', error);
    throw error;
  }
}

/**
 * Helper function to determine date range for incremental sync
 */
export function getIncrementalSyncDates(lastSyncAt: Date | null): {
  startDate: string;
  endDate: string;
} {
  const endDate = new Date().toISOString();
  const startDate = lastSyncAt
    ? new Date(lastSyncAt).toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // Last 30 days

  return { startDate, endDate };
}
