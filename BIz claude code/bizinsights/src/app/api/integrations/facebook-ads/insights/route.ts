/**
 * Facebook Ads - Get Insights
 *
 * Fetches performance insights for campaigns
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FacebookAdsClient, getDateRange } from '@/lib/facebook-ads-client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');
    const days = parseInt(searchParams.get('days') || '30');
    const level = searchParams.get('level') || 'campaign';

    if (!integrationId) {
      return NextResponse.json(
        { success: false, error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    // Get integration
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Parse config
    const config = JSON.parse(integration.config);
    const accessToken = Buffer.from(config.accessToken, 'base64').toString('utf-8');
    const adAccountId = config.adAccountId;

    // Get date range
    const dateRange = getDateRange(days);

    // Get insights
    const fbClient = new FacebookAdsClient(accessToken);
    const insights = await fbClient.getAdAccountInsights(
      adAccountId,
      dateRange.startDate,
      dateRange.endDate,
      {
        level: level as any,
      }
    );

    // Calculate aggregate metrics
    const aggregateMetrics = {
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalReach: 0,
      averageCPM: 0,
      averageCPC: 0,
      averageCTR: 0,
      averageROAS: 0,
      totalConversions: 0,
    };

    insights.forEach((insight) => {
      aggregateMetrics.totalSpend += parseFloat(insight.spend || '0');
      aggregateMetrics.totalImpressions += parseInt(insight.impressions || '0');
      aggregateMetrics.totalClicks += parseInt(insight.clicks || '0');
      aggregateMetrics.totalReach += parseInt(insight.reach || '0');

      const roas = fbClient.calculateROAS(insight);
      aggregateMetrics.averageROAS += roas;

      const purchases =
        fbClient.getConversionCount(insight, 'purchase') ||
        fbClient.getConversionCount(insight, 'omni_purchase');
      aggregateMetrics.totalConversions += purchases;
    });

    if (insights.length > 0) {
      aggregateMetrics.averageCPM = fbClient.calculateCPM(
        aggregateMetrics.totalSpend,
        aggregateMetrics.totalImpressions
      );
      aggregateMetrics.averageCPC = fbClient.calculateCPC(
        aggregateMetrics.totalSpend,
        aggregateMetrics.totalClicks
      );
      aggregateMetrics.averageCTR = fbClient.calculateCTR(
        aggregateMetrics.totalClicks,
        aggregateMetrics.totalImpressions
      );
      aggregateMetrics.averageROAS = aggregateMetrics.averageROAS / insights.length;
    }

    return NextResponse.json({
      success: true,
      data: {
        insights: insights.map((insight) => ({
          campaignId: insight.campaign_id,
          campaignName: insight.campaign_name,
          dateStart: insight.date_start,
          dateStop: insight.date_stop,
          spend: parseFloat(insight.spend || '0'),
          impressions: parseInt(insight.impressions || '0'),
          clicks: parseInt(insight.clicks || '0'),
          reach: parseInt(insight.reach || '0'),
          cpm: parseFloat(insight.cpm || '0'),
          cpc: parseFloat(insight.cpc || '0'),
          ctr: parseFloat(insight.ctr || '0'),
          roas: fbClient.calculateROAS(insight),
          conversions:
            fbClient.getConversionCount(insight, 'purchase') ||
            fbClient.getConversionCount(insight, 'omni_purchase'),
        })),
        aggregateMetrics,
        period: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          days,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching Facebook insights:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch insights',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
