import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getShopifyConfig,
  validateHmac,
  exchangeCodeForToken,
  fetchShopData,
  encryptToken,
  sanitizeShopDomain,
} from '@/lib/shopify-oauth'

/**
 * Shopify OAuth Callback Endpoint
 *
 * Handles the OAuth callback from Shopify after user authorizes the app
 * Exchanges the authorization code for an access token and stores it securely
 *
 * Shopify redirects here with:
 * - code: Authorization code to exchange for access token
 * - hmac: Security signature to validate the request
 * - shop: The shop domain
 * - state: CSRF protection token we generated earlier
 * - timestamp: Request timestamp
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Extract OAuth callback parameters
    const code = searchParams.get('code')
    const hmac = searchParams.get('hmac')
    const shop = searchParams.get('shop')
    const state = searchParams.get('state')
    const timestamp = searchParams.get('timestamp')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    console.log('[Shopify OAuth Callback] Received callback from Shopify', {
      shop,
      hasCode: !!code,
      hasHmac: !!hmac,
      hasState: !!state,
      error,
    })

    // Handle OAuth errors from Shopify
    if (error) {
      console.error('[Shopify OAuth Callback] OAuth error from Shopify:', error, errorDescription)
      return redirectToFrontend({
        success: false,
        error: error,
        message: errorDescription || 'Authorization was denied or failed',
      })
    }

    // Validate required parameters
    if (!code || !hmac || !shop || !state) {
      console.error('[Shopify OAuth Callback] Missing required parameters')
      return redirectToFrontend({
        success: false,
        error: 'missing_parameters',
        message: 'Invalid OAuth callback - missing required parameters',
      })
    }

    // Get Shopify configuration
    const config = getShopifyConfig()

    // SECURITY CHECK 1: Validate HMAC signature
    // This ensures the request actually came from Shopify and wasn't tampered with
    const queryParams: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      queryParams[key] = value
    })

    const isValidHmac = validateHmac(queryParams, config.apiSecret)

    if (!isValidHmac) {
      console.error('[Shopify OAuth Callback] HMAC validation failed - potential security threat')
      return redirectToFrontend({
        success: false,
        error: 'invalid_hmac',
        message: 'Security validation failed. This request may not be from Shopify.',
      })
    }

    console.log('[Shopify OAuth Callback] HMAC validation passed ✓')

    // Sanitize shop domain
    const sanitizedShop = sanitizeShopDomain(shop)

    // SECURITY CHECK 2: Validate state parameter (CSRF protection)
    // Find the integration record with matching state
    const integration = await prisma.integration.findFirst({
      where: {
        platform: 'SHOPIFY',
        metadata: {
          path: ['oauth_state'],
          equals: state,
        },
      },
    })

    if (!integration) {
      console.error('[Shopify OAuth Callback] State validation failed - no matching OAuth session found')
      return redirectToFrontend({
        success: false,
        error: 'invalid_state',
        message: 'OAuth session not found or expired. Please try connecting again.',
      })
    }

    console.log('[Shopify OAuth Callback] State validation passed ✓')

    // SECURITY CHECK 3: Validate shop matches the one we stored
    const metadata = integration.metadata as any
    if (metadata.oauth_shop !== sanitizedShop) {
      console.error('[Shopify OAuth Callback] Shop mismatch - potential attack')
      return redirectToFrontend({
        success: false,
        error: 'shop_mismatch',
        message: 'Shop domain mismatch. Security validation failed.',
      })
    }

    // SECURITY CHECK 4: Check timestamp to prevent replay attacks (optional but recommended)
    if (timestamp) {
      const requestTime = parseInt(timestamp, 10) * 1000 // Convert to milliseconds
      const currentTime = Date.now()
      const timeDifference = currentTime - requestTime

      // Reject requests older than 5 minutes
      if (timeDifference > 5 * 60 * 1000) {
        console.error('[Shopify OAuth Callback] Request too old - potential replay attack')
        return redirectToFrontend({
          success: false,
          error: 'expired_request',
          message: 'OAuth request expired. Please try again.',
        })
      }
    }

    console.log('[Shopify OAuth Callback] All security checks passed ✓')

    // STEP 1: Exchange authorization code for access token
    console.log('[Shopify OAuth Callback] Exchanging code for access token...')

    let tokenResponse
    try {
      tokenResponse = await exchangeCodeForToken(sanitizedShop, code, config)
    } catch (error) {
      console.error('[Shopify OAuth Callback] Token exchange failed:', error)
      return redirectToFrontend({
        success: false,
        error: 'token_exchange_failed',
        message: 'Failed to obtain access token from Shopify',
      })
    }

    console.log('[Shopify OAuth Callback] Access token obtained ✓')

    // STEP 2: Fetch shop information using the access token
    console.log('[Shopify OAuth Callback] Fetching shop data...')

    let shopData
    try {
      shopData = await fetchShopData(sanitizedShop, tokenResponse.access_token)
    } catch (error) {
      console.error('[Shopify OAuth Callback] Failed to fetch shop data:', error)
      // Continue anyway - we have the token, shop data is nice-to-have
      shopData = null
    }

    console.log('[Shopify OAuth Callback] Shop data fetched ✓')

    // STEP 3: Encrypt access token before storing
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production'
    const encryptedToken = encryptToken(tokenResponse.access_token, encryptionKey)

    // STEP 4: Store the integration in database
    console.log('[Shopify OAuth Callback] Saving integration to database...')

    await prisma.integration.update({
      where: {
        id: integration.id,
      },
      data: {
        status: 'CONNECTED',
        accessToken: encryptedToken,
        tokenExpiresAt: null, // Shopify offline tokens don't expire
        metadata: {
          shop: sanitizedShop,
          shopDomain: `${sanitizedShop}.myshopify.com`,
          scopes: tokenResponse.scope,
          shopData: shopData?.shop || null,
          connectedAt: new Date().toISOString(),
          // Clear OAuth temporary data
          oauth_state: null,
          oauth_nonce: null,
          oauth_shop: null,
          oauth_initiated_at: null,
          oauth_user_id: null,
        },
        lastSyncAt: new Date(),
        connectedAt: new Date(),
      },
    })

    console.log('[Shopify OAuth Callback] Integration saved successfully ✓')

    // Log successful connection
    console.log(`[Shopify OAuth Callback] Successfully connected shop: ${sanitizedShop}`)

    // Redirect user back to integrations page with success message
    return redirectToFrontend({
      success: true,
      platform: 'shopify',
      shop: sanitizedShop,
      message: 'Shopify store connected successfully!',
    })
  } catch (error) {
    console.error('[Shopify OAuth Callback] Unexpected error:', error)

    return redirectToFrontend({
      success: false,
      error: 'unexpected_error',
      message: 'An unexpected error occurred during OAuth callback',
    })
  }
}

/**
 * Helper function to redirect to frontend with callback results
 */
function redirectToFrontend(params: {
  success: boolean
  platform?: string
  shop?: string
  error?: string
  message?: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3002'
  const callbackUrl = new URL('/dashboard/integrations', appUrl)

  // Add result parameters
  callbackUrl.searchParams.set('oauth_result', params.success ? 'success' : 'error')

  if (params.platform) {
    callbackUrl.searchParams.set('platform', params.platform)
  }

  if (params.shop) {
    callbackUrl.searchParams.set('shop', params.shop)
  }

  if (params.error) {
    callbackUrl.searchParams.set('error', params.error)
  }

  if (params.message) {
    callbackUrl.searchParams.set('message', params.message)
  }

  return NextResponse.redirect(callbackUrl.toString())
}
