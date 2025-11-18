import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encrypt, verifyShopifyHMAC } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const shop = searchParams.get('shop');
    const state = searchParams.get('state');
    const hmac = searchParams.get('hmac');

    if (!code || !shop || !state) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // ✅ SECURITY: Verify HMAC signature
    const shopifySecret = process.env.SHOPIFY_CLIENT_SECRET;
    if (!shopifySecret) {
      console.error('SHOPIFY_CLIENT_SECRET not configured');
      return NextResponse.json(
        { error: 'Shopify integration not configured' },
        { status: 500 }
      );
    }

    if (hmac) {
      // Build query string without HMAC for verification
      const params = new URLSearchParams(searchParams);
      params.delete('hmac');
      const queryString = params.toString();

      const isValid = verifyShopifyHMAC(queryString, hmac, shopifySecret);

      if (!isValid) {
        console.error('HMAC verification failed for Shopify OAuth callback');
        return NextResponse.json(
          { error: 'Invalid request signature' },
          { status: 403 }
        );
      }
    }

    // Verify state matches session
    const storedState = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        settings: {
          select: { settings: true }
        }
      }
    });

    const expectedState = (storedState?.settings?.settings as any)?.shopifyOAuthState;

    if (state !== expectedState) {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 403 }
      );
    }

    // Exchange code for access token
    const shopifyClientId = process.env.SHOPIFY_CLIENT_ID;

    if (!shopifyClientId) {
      return NextResponse.json(
        { error: 'Shopify client ID not configured' },
        { status: 500 }
      );
    }

    const tokenResponse = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: shopifyClientId,
          client_secret: shopifySecret,
          code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Shopify token exchange failed:', error);
      return NextResponse.json(
        { error: 'Failed to exchange authorization code' },
        { status: 500 }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token received' },
        { status: 500 }
      );
    }

    // ✅ SECURITY: Encrypt the access token before storing
    const encryptedToken = encrypt(accessToken);

    // Get organization from state or user's first organization
    const organizationId = (storedState?.settings?.settings as any)?.shopifyOrgId;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization not found in state' },
        { status: 400 }
      );
    }

    // Store or update integration
    await prisma.integration.upsert({
      where: {
        organizationId_platform: {
          organizationId,
          platform: 'SHOPIFY',
        },
      },
      create: {
        organizationId,
        platform: 'SHOPIFY',
        accessToken: encryptedToken,
        status: 'CONNECTED',
        metadata: {
          shopDomain: shop.replace('.myshopify.com', ''),
          scope: tokenData.scope,
          connectedAt: new Date().toISOString(),
        },
      },
      update: {
        accessToken: encryptedToken,
        status: 'CONNECTED',
        metadata: {
          shopDomain: shop.replace('.myshopify.com', ''),
          scope: tokenData.scope,
          reconnectedAt: new Date().toISOString(),
        },
      },
    });

    // Clear OAuth state from user settings
    await prisma.userSettings.update({
      where: { userId: session.user.id },
      data: {
        settings: {
          ...(storedState?.settings?.settings as any),
          shopifyOAuthState: null,
          shopifyOrgId: null,
        },
      },
    });

    // Redirect to integrations page with success message
    return NextResponse.redirect(
      new URL('/dashboard/integrations?success=shopify-connected', request.url)
    );
  } catch (error) {
    console.error('Shopify OAuth callback error:', error);
    return NextResponse.json(
      {
        error: 'OAuth callback failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
