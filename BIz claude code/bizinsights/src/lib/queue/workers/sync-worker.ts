/**
 * Integration Sync Worker
 * Processes data synchronization jobs for all integration platforms
 */

import { Job } from 'bull';
import { integrationSyncQueue } from '../queues';
import { prisma } from '@/lib/prisma';

export interface SyncJobData {
  integrationId: string;
  organizationId: string;
  platform: 'SHOPIFY' | 'STRIPE' | 'GOOGLE_ANALYTICS' | 'FACEBOOK_ADS' | 'WOOCOMMERCE';
  force?: boolean; // Force sync even if recently synced
}

// Process integration sync jobs
integrationSyncQueue.process(async (job: Job<SyncJobData>) => {
  const { data } = job;

  console.log(`[Sync Worker] Processing sync job ${job.id}:`, {
    integrationId: data.integrationId,
    platform: data.platform,
    organizationId: data.organizationId,
  });

  try {
    await job.progress(5);

    // Get integration details
    const integration = await prisma.integration.findUnique({
      where: { id: data.integrationId },
    });

    if (!integration) {
      throw new Error(`Integration ${data.integrationId} not found`);
    }

    if (integration.status !== 'CONNECTED' && integration.status !== 'SYNCING') {
      throw new Error(`Integration is not connected (status: ${integration.status})`);
    }

    await job.progress(10);

    // Update status to SYNCING
    await prisma.integration.update({
      where: { id: data.integrationId },
      data: { status: 'SYNCING' },
    });

    await job.progress(20);

    // Perform platform-specific sync
    let result;
    switch (data.platform) {
      case 'SHOPIFY':
        result = await syncShopify(integration, job);
        break;
      case 'STRIPE':
        result = await syncStripe(integration, job);
        break;
      case 'GOOGLE_ANALYTICS':
        result = await syncGoogleAnalytics(integration, job);
        break;
      case 'FACEBOOK_ADS':
        result = await syncFacebookAds(integration, job);
        break;
      case 'WOOCOMMERCE':
        result = await syncWooCommerce(integration, job);
        break;
      default:
        throw new Error(`Unsupported platform: ${data.platform}`);
    }

    await job.progress(90);

    // Update integration status
    await prisma.integration.update({
      where: { id: data.integrationId },
      data: {
        status: 'CONNECTED',
        lastSyncAt: new Date(),
        metadata: {
          ...(integration.metadata as any),
          lastSyncResult: result,
        },
      },
    });

    await job.progress(100);

    console.log(`[Sync Worker] Successfully synced ${data.platform} integration ${data.integrationId}`);

    return {
      success: true,
      platform: data.platform,
      result,
    };
  } catch (error) {
    console.error(`[Sync Worker] Error syncing integration ${data.integrationId}:`, error);

    // Update integration status to ERROR
    await prisma.integration.update({
      where: { id: data.integrationId },
      data: {
        status: 'ERROR',
        metadata: {
          lastError: error instanceof Error ? error.message : 'Unknown error',
          lastErrorAt: new Date().toISOString(),
        },
      },
    });

    throw error; // Bull will handle retries
  }
});

// Platform-specific sync functions
async function syncShopify(integration: any, job: Job) {
  // Import sync logic from existing route
  const { syncShopifyData } = await import('@/lib/integrations/shopify-sync');

  const shopDomain = integration.metadata?.shopDomain as string;
  const accessToken = decryptToken(integration.accessToken);

  await job.progress(40);

  const result = await syncShopifyData(
    integration.organizationId,
    integration.id,
    shopDomain,
    accessToken
  );

  await job.progress(80);

  return result;
}

async function syncStripe(integration: any, job: Job) {
  // Import sync logic
  const { syncStripeData } = await import('@/lib/integrations/stripe-sync');

  const apiKey = decryptToken(integration.accessToken);

  await job.progress(40);

  const result = await syncStripeData(
    integration.organizationId,
    integration.id,
    apiKey
  );

  await job.progress(80);

  return result;
}

async function syncGoogleAnalytics(integration: any, job: Job) {
  // Import sync logic
  const { syncGoogleAnalyticsData } = await import('@/lib/integrations/google-analytics-sync');

  const credentials = integration.metadata?.credentials;
  const propertyId = integration.metadata?.propertyId as string;

  await job.progress(40);

  const result = await syncGoogleAnalyticsData(
    integration.organizationId,
    integration.id,
    propertyId,
    credentials
  );

  await job.progress(80);

  return result;
}

async function syncFacebookAds(integration: any, job: Job) {
  // Import sync logic
  const { syncFacebookAdsData } = await import('@/lib/integrations/facebook-ads-sync');

  const accessToken = decryptToken(integration.accessToken);
  const adAccountId = integration.metadata?.adAccountId as string;

  await job.progress(40);

  const result = await syncFacebookAdsData(
    integration.organizationId,
    integration.id,
    adAccountId,
    accessToken
  );

  await job.progress(80);

  return result;
}

async function syncWooCommerce(integration: any, job: Job) {
  // Import sync logic
  const { syncWooCommerceData } = await import('@/lib/integrations/woocommerce-sync');

  const siteUrl = integration.metadata?.siteUrl as string;
  const consumerKey = integration.metadata?.consumerKey as string;
  const consumerSecret = decryptToken(integration.accessToken);

  await job.progress(40);

  const result = await syncWooCommerceData(
    integration.organizationId,
    integration.id,
    siteUrl,
    consumerKey,
    consumerSecret
  );

  await job.progress(80);

  return result;
}

function decryptToken(encryptedToken: string): string {
  // For now, return the token as-is
  // TODO: Implement proper encryption/decryption
  return encryptedToken;
}

console.log('[Sync Worker] Worker initialized and ready');

export default integrationSyncQueue;
