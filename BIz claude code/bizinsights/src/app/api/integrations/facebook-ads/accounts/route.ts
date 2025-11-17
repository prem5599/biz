/**
 * Facebook Ads - Get Ad Accounts
 *
 * Fetches available ad accounts for the connected integration
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

    // Get ad accounts
    const fbClient = new FacebookAdsClient(accessToken);
    const adAccounts = await fbClient.getAdAccounts();

    return NextResponse.json({
      success: true,
      data: {
        adAccounts: adAccounts.map((account) => ({
          id: account.account_id,
          name: account.name,
          currency: account.currency,
          status: account.account_status,
          isSelected: account.account_id === config.adAccountId,
        })),
        currentAccount: config.adAccountId,
      },
    });
  } catch (error: any) {
    console.error('Error fetching Facebook ad accounts:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch ad accounts',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Update selected ad account
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { integrationId, adAccountId } = body;

    if (!integrationId || !adAccountId) {
      return NextResponse.json(
        { success: false, error: 'Integration ID and Ad Account ID are required' },
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

    // Get ad account details
    const fbClient = new FacebookAdsClient(accessToken);
    const adAccount = await fbClient.getAdAccount(adAccountId);

    // Update integration config
    config.adAccountId = adAccount.account_id;
    config.adAccountName = adAccount.name;
    config.currency = adAccount.currency;

    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        config: JSON.stringify(config),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Ad account updated successfully',
        adAccount: {
          id: adAccount.account_id,
          name: adAccount.name,
          currency: adAccount.currency,
        },
      },
    });
  } catch (error: any) {
    console.error('Error updating Facebook ad account:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update ad account',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
