import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getShopifyConfig,
  buildAuthorizationUrl,
  generateState,
  generateNonce,
  validateShopDomain,
  sanitizeShopDomain,
} from '@/lib/shopify-oauth'

/**
 * Shopify OAuth Authorization Endpoint
 *
 * Initiates the OAuth flow by redirecting users to Shopify's authorization page
 *
 * Usage:
 * GET /api/integrations/shopify/oauth/authorize?shop=mystore&organization_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in first.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')
    const organizationId = searchParams.get('organization_id')

    // Validate required parameters
    if (!shop) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: shop',
          details: 'Please provide your Shopify store name (e.g., mystore or mystore.myshopify.com)'
        },
        { status: 400 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing required parameter: organization_id' },
        { status: 400 }
      )
    }

    // Sanitize and validate shop domain
    const sanitizedShop = sanitizeShopDomain(shop)

    if (!validateShopDomain(sanitizedShop)) {
      return NextResponse.json(
        {
          error: 'Invalid shop domain format',
          details: 'Shop name can only contain letters, numbers, and hyphens'
        },
        { status: 400 }
      )
    }

    // Verify user has access to this organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied. You do not have permission to connect integrations for this organization.' },
        { status: 403 }
      )
    }

    // Generate security tokens
    const state = generateState()
    const nonce = generateNonce()

    // Store state and nonce in database for validation during callback
    // We use a temporary OAuth state table or store in integration metadata
    await prisma.integration.upsert({
      where: {
        organizationId_platform: {
          organizationId,
          platform: 'SHOPIFY',
        },
      },
      update: {
        metadata: {
          oauth_state: state,
          oauth_nonce: nonce,
          oauth_shop: sanitizedShop,
          oauth_initiated_at: new Date().toISOString(),
          oauth_user_id: session.user.id,
        },
        status: 'DISCONNECTED', // Will be updated to CONNECTED after successful OAuth
      },
      create: {
        organizationId,
        platform: 'SHOPIFY',
        status: 'DISCONNECTED',
        metadata: {
          oauth_state: state,
          oauth_nonce: nonce,
          oauth_shop: sanitizedShop,
          oauth_initiated_at: new Date().toISOString(),
          oauth_user_id: session.user.id,
        },
      },
    })

    // Get Shopify OAuth configuration
    const config = getShopifyConfig()

    // Build authorization URL
    const authUrl = buildAuthorizationUrl(sanitizedShop, config, state, nonce)

    console.log(`[Shopify OAuth] Redirecting to authorization URL for shop: ${sanitizedShop}`)

    // Redirect user to Shopify authorization page
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('[Shopify OAuth] Authorization error:', error)

    // Check if it's a configuration error
    if (error instanceof Error && error.message.includes('Missing required Shopify OAuth configuration')) {
      return NextResponse.json(
        {
          error: 'Shopify OAuth is not configured',
          details: 'Please contact your administrator to set up Shopify integration credentials.',
          technicalDetails: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to initiate OAuth flow',
        details: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint for frontend to get authorization URL without redirect
 * Useful for showing a popup or opening in new tab
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { shop, organizationId } = await request.json()

    if (!shop || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required parameters: shop and organizationId' },
        { status: 400 }
      )
    }

    // Sanitize and validate shop domain
    const sanitizedShop = sanitizeShopDomain(shop)

    if (!validateShopDomain(sanitizedShop)) {
      return NextResponse.json(
        { error: 'Invalid shop domain format' },
        { status: 400 }
      )
    }

    // Verify user has access to this organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Generate security tokens
    const state = generateState()
    const nonce = generateNonce()

    // Store state and nonce for validation
    await prisma.integration.upsert({
      where: {
        organizationId_platform: {
          organizationId,
          platform: 'SHOPIFY',
        },
      },
      update: {
        metadata: {
          oauth_state: state,
          oauth_nonce: nonce,
          oauth_shop: sanitizedShop,
          oauth_initiated_at: new Date().toISOString(),
          oauth_user_id: session.user.id,
        },
        status: 'DISCONNECTED',
      },
      create: {
        organizationId,
        platform: 'SHOPIFY',
        status: 'DISCONNECTED',
        metadata: {
          oauth_state: state,
          oauth_nonce: nonce,
          oauth_shop: sanitizedShop,
          oauth_initiated_at: new Date().toISOString(),
          oauth_user_id: session.user.id,
        },
      },
    })

    // Get Shopify OAuth configuration
    const config = getShopifyConfig()

    // Build authorization URL
    const authUrl = buildAuthorizationUrl(sanitizedShop, config, state, nonce)

    return NextResponse.json({
      success: true,
      authUrl,
      shop: sanitizedShop,
    })
  } catch (error) {
    console.error('[Shopify OAuth] Authorization error:', error)

    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    )
  }
}
