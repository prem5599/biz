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

    // Get user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: {
        userSettings: true
      }
    });

    if (!user) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // Parse stored settings (it's a JSON string)
    const storedSettings = user.userSettings?.settings
      ? JSON.parse(user.userSettings.settings as string)
      : {};

    const expectedState = storedSettings?.shopifyOAuthState;

    if (!expectedState || state !== expectedState) {
      console.error('State mismatch:', { received: state, expected: expectedState });
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

    // Get organization from stored state
    const organizationId = storedSettings?.shopifyOrgId;

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
        metadata: JSON.stringify({
          shopDomain: shop.replace('.myshopify.com', ''),
          scope: tokenData.scope,
          connectedAt: new Date().toISOString(),
        }),
      },
      update: {
        accessToken: encryptedToken,
        status: 'CONNECTED',
        metadata: JSON.stringify({
          shopDomain: shop.replace('.myshopify.com', ''),
          scope: tokenData.scope,
          reconnectedAt: new Date().toISOString(),
        }),
      },
    });

    // Clear OAuth state from user settings
    const clearedSettings = {
      ...storedSettings,
      shopifyOAuthState: null,
      shopifyOrgId: null,
    };

    await prisma.userSettings.update({
      where: { userId: user.id },
      data: {
        settings: JSON.stringify(clearedSettings),
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
