/**
 * Facebook Ads OAuth Callback
 *
 * Handles OAuth callback from Facebook and exchanges code for access token
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const organizationId = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Check for OAuth errors
    if (error) {
      console.error('Facebook OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${process.env.APP_URL}/dashboard/integrations?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !organizationId) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/dashboard/integrations?error=missing_parameters`
      );
    }

    // Exchange authorization code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    tokenUrl.searchParams.append('client_id', process.env.FACEBOOK_APP_ID!);
    tokenUrl.searchParams.append('client_secret', process.env.FACEBOOK_APP_SECRET!);
    tokenUrl.searchParams.append('redirect_uri', `${process.env.APP_URL}/api/integrations/facebook-ads/oauth/callback`);
    tokenUrl.searchParams.append('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());
    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    const shortLivedToken = tokenData.access_token;

    // Exchange short-lived token for long-lived token
    const longLivedUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    longLivedUrl.searchParams.append('grant_type', 'fb_exchange_token');
    longLivedUrl.searchParams.append('client_id', process.env.FACEBOOK_APP_ID!);
    longLivedUrl.searchParams.append('client_secret', process.env.FACEBOOK_APP_SECRET!);
    longLivedUrl.searchParams.append('fb_exchange_token', shortLivedToken);

    const longLivedResponse = await fetch(longLivedUrl.toString());
    if (!longLivedResponse.ok) {
      throw new Error('Failed to get long-lived token');
    }

    const longLivedData = await longLivedResponse.json();
    const accessToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in; // Usually 60 days

    // Get user's ad accounts
    const adAccountsUrl = new URL('https://graph.facebook.com/v19.0/me/adaccounts');
    adAccountsUrl.searchParams.append('access_token', accessToken);
    adAccountsUrl.searchParams.append('fields', 'account_id,name,currency');

    const adAccountsResponse = await fetch(adAccountsUrl.toString());
    if (!adAccountsResponse.ok) {
      throw new Error('Failed to fetch ad accounts');
    }

    const adAccountsData = await adAccountsResponse.json();
    const adAccounts = adAccountsData.data || [];

    if (adAccounts.length === 0) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/dashboard/integrations?error=no_ad_accounts`
      );
    }

    // Use the first ad account (or let user select later)
    const selectedAccount = adAccounts[0];

    // Calculate token expiration date
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    // Store integration in database
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        organizationId,
        platform: 'FACEBOOK_ADS',
      },
    });

    if (existingIntegration) {
      // Update existing integration
      await prisma.integration.update({
        where: { id: existingIntegration.id },
        data: {
          config: JSON.stringify({
            accessToken: Buffer.from(accessToken).toString('base64'),
            adAccountId: selectedAccount.account_id,
            adAccountName: selectedAccount.name,
            currency: selectedAccount.currency,
            expiresAt: expiresAt.toISOString(),
            adAccounts: adAccounts.map((acc: any) => ({
              id: acc.account_id,
              name: acc.name,
              currency: acc.currency,
            })),
          }),
          status: 'CONNECTED',
          lastSyncAt: new Date(),
        },
      });
    } else {
      // Create new integration
      await prisma.integration.create({
        data: {
          organizationId,
          platform: 'FACEBOOK_ADS',
          config: JSON.stringify({
            accessToken: Buffer.from(accessToken).toString('base64'),
            adAccountId: selectedAccount.account_id,
            adAccountName: selectedAccount.name,
            currency: selectedAccount.currency,
            expiresAt: expiresAt.toISOString(),
            adAccounts: adAccounts.map((acc: any) => ({
              id: acc.account_id,
              name: acc.name,
              currency: acc.currency,
            })),
          }),
          status: 'CONNECTED',
          lastSyncAt: new Date(),
        },
      });
    }

    // Redirect back to integrations page with success
    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/integrations?success=facebook_ads_connected`
    );
  } catch (error: any) {
    console.error('Facebook OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/integrations?error=${encodeURIComponent(error.message)}`
    );
  }
}
