/**
 * Facebook Ads Integration Helper Functions
 *
 * Provides functions for syncing data from Facebook Ads.
 * These are called by the data sync job processor.
 */

import { FacebookAdsClient, getDateRange } from '@/lib/facebook-ads-client';
import { prisma } from '@/lib/prisma';

export async function syncFacebookAdsData(
  integration: any,
  startDate?: string,
  endDate?: string
): Promise<{ campaignsSynced: number }> {
  console.log('Syncing Facebook Ads data...', { integrationId: integration.id, startDate, endDate });

  try {
    // Parse integration config
    const config = JSON.parse(integration.config);
    const accessToken = Buffer.from(config.accessToken, 'base64').toString('utf-8');
    const adAccountId = config.adAccountId;

    if (!accessToken || !adAccountId) {
      throw new Error('Missing Facebook Ads credentials');
    }

    // Initialize Facebook Ads client
    const fbClient = new FacebookAdsClient(accessToken);

    // Validate access token
    const validation = await fbClient.validateAccessToken();
    if (!validation.isValid) {
      throw new Error('Facebook access token is invalid or expired');
    }

    // Determine date range
    let dateRange;
    if (startDate && endDate) {
      dateRange = { startDate, endDate };
    } else {
      // Default to last 30 days
      dateRange = getDateRange(30);
    }

    console.log('Fetching campaigns for ad account:', adAccountId);

    // Get all campaigns
    const campaigns = await fbClient.getCampaigns(adAccountId, {
      status: ['ACTIVE', 'PAUSED', 'ARCHIVED'],
      limit: 500,
    });

    console.log(`Found ${campaigns.length} campaigns`);

    // Get insights for the ad account (aggregated)
    const accountInsights = await fbClient.getAdAccountInsights(
      adAccountId,
      dateRange.startDate,
      dateRange.endDate,
      {
        level: 'campaign',
      }
    );

    console.log(`Fetched insights for ${accountInsights.length} campaigns`);

    let dataPointsCreated = 0;

    // Process insights and create data points
    for (const insight of accountInsights) {
      const spend = parseFloat(insight.spend || '0');
      const impressions = parseInt(insight.impressions || '0');
      const clicks = parseInt(insight.clicks || '0');
      const reach = parseInt(insight.reach || '0');

      // Calculate metrics
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const roas = fbClient.calculateROAS(insight);

      // Get conversion counts
      const purchases = fbClient.getConversionCount(insight, 'purchase') ||
                       fbClient.getConversionCount(insight, 'omni_purchase');
      const leads = fbClient.getConversionCount(insight, 'lead');
      const addToCart = fbClient.getConversionCount(insight, 'add_to_cart');

      // Create data points for spend (main metric)
      await prisma.dataPoint.upsert({
        where: {
          integrationId_metricType_dateRecorded: {
            integrationId: integration.id,
            metricType: 'ad_spend',
            dateRecorded: new Date(insight.date_start),
          },
        },
        create: {
          integrationId: integration.id,
          metricType: 'ad_spend',
          value: spend,
          currency: config.currency || 'USD',
          dateRecorded: new Date(insight.date_start),
          metadata: {
            campaignId: insight.campaign_id,
            campaignName: insight.campaign_name,
            impressions,
            clicks,
            reach,
            cpm,
            cpc,
            ctr,
            roas,
            purchases,
            leads,
            addToCart,
            source: 'facebook_ads',
          },
        },
        update: {
          value: spend,
          metadata: {
            campaignId: insight.campaign_id,
            campaignName: insight.campaign_name,
            impressions,
            clicks,
            reach,
            cpm,
            cpc,
            ctr,
            roas,
            purchases,
            leads,
            addToCart,
            source: 'facebook_ads',
          },
        },
      });

      dataPointsCreated++;

      // Create data points for impressions
      if (impressions > 0) {
        await prisma.dataPoint.upsert({
          where: {
            integrationId_metricType_dateRecorded: {
              integrationId: integration.id,
              metricType: 'impressions',
              dateRecorded: new Date(insight.date_start),
            },
          },
          create: {
            integrationId: integration.id,
            metricType: 'impressions',
            value: impressions,
            dateRecorded: new Date(insight.date_start),
            metadata: {
              campaignId: insight.campaign_id,
              campaignName: insight.campaign_name,
              source: 'facebook_ads',
            },
          },
          update: {
            value: impressions,
            metadata: {
              campaignId: insight.campaign_id,
              campaignName: insight.campaign_name,
              source: 'facebook_ads',
            },
          },
        });

        dataPointsCreated++;
      }

      // Create data points for conversions (purchases)
      if (purchases > 0) {
        await prisma.dataPoint.upsert({
          where: {
            integrationId_metricType_dateRecorded: {
              integrationId: integration.id,
              metricType: 'conversions',
              dateRecorded: new Date(insight.date_start),
            },
          },
          create: {
            integrationId: integration.id,
            metricType: 'conversions',
            value: purchases,
            dateRecorded: new Date(insight.date_start),
            metadata: {
              campaignId: insight.campaign_id,
              campaignName: insight.campaign_name,
              conversionType: 'purchase',
              roas,
              source: 'facebook_ads',
            },
          },
          update: {
            value: purchases,
            metadata: {
              campaignId: insight.campaign_id,
              campaignName: insight.campaign_name,
              conversionType: 'purchase',
              roas,
              source: 'facebook_ads',
            },
          },
        });

        dataPointsCreated++;
      }
    }

    console.log(`Created/updated ${dataPointsCreated} data points for Facebook Ads`);

    return {
      campaignsSynced: campaigns.length,
    };
  } catch (error: any) {
    console.error('Facebook Ads sync error:', error);
    throw error;
  }
}

/**
 * Get Facebook ad account details
 */
export async function getFacebookAdAccount(integration: any): Promise<any> {
  const config = JSON.parse(integration.config);
  const accessToken = Buffer.from(config.accessToken, 'base64').toString('utf-8');
  const adAccountId = config.adAccountId;

  const fbClient = new FacebookAdsClient(accessToken);
  return await fbClient.getAdAccount(adAccountId);
}

/**
 * Get available ad accounts
 */
export async function getFacebookAdAccounts(accessToken: string): Promise<any[]> {
  const fbClient = new FacebookAdsClient(accessToken);
  return await fbClient.getAdAccounts();
}
