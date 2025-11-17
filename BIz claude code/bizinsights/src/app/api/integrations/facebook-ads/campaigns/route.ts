/**
 * Facebook Ads - Get Campaigns
 *
 * Fetches campaigns for the connected ad account
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FacebookAdsClient } from '@/lib/facebook-ads-client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');
    const status = searchParams.get('status')?.split(',') || ['ACTIVE', 'PAUSED'];

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

    // Get campaigns
    const fbClient = new FacebookAdsClient(accessToken);
    const campaigns = await fbClient.getCampaigns(adAccountId, {
      status: status as any,
      limit: 100,
    });

    return NextResponse.json({
      success: true,
      data: {
        campaigns: campaigns.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          createdTime: campaign.created_time,
          startTime: campaign.start_time,
          stopTime: campaign.stop_time,
          dailyBudget: campaign.daily_budget,
          lifetimeBudget: campaign.lifetime_budget,
        })),
        total: campaigns.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching Facebook campaigns:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch campaigns',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
