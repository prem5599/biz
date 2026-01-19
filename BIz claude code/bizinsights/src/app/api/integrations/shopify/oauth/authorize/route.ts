import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')
    const shop = searchParams.get('shop') // Optional: pre-filled shop domain

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Check if SHOPIFY credentials are configured
    const clientId = process.env.SHOPIFY_CLIENT_ID
    if (!clientId) {
      return NextResponse.json({
        error: 'Shopify integration not configured. Add SHOPIFY_CLIENT_ID to environment.'
      }, { status: 500 })
    }

    // Generate secure state token
    const stateToken = crypto.randomBytes(32).toString('hex')

    // Get user by email since session.user.id may not exist
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    // Get current settings if they exist
    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id }
    })

    const currentSettings = existingSettings?.settings
      ? JSON.parse(existingSettings.settings as string)
      : {}

    // Store state in UserSettings for verification in callback
    const newSettings = {
      ...currentSettings,
      shopifyOAuthState: stateToken,
      shopifyOrgId: organizationId
    }

    await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        settings: JSON.stringify(newSettings)
      },
      update: {
        settings: JSON.stringify(newSettings)
      }
    })

    // If shop domain provided, use Shopify's per-store OAuth
    // Otherwise, use Shopify's managed OAuth (accounts.shopify.com)
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/api/integrations/shopify/oauth/callback`

    let authUrl: URL
    if (shop) {
      // Per-store OAuth (when shop domain is known)
      const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`
      authUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`)
    } else {
      // Shopify managed OAuth (for any store)
      authUrl = new URL('https://accounts.shopify.com/oauth/authorize')
    }

    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('scope', 'read_orders,read_customers,read_products,read_analytics')
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', stateToken)
    authUrl.searchParams.set('response_type', 'code')

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('Shopify OAuth authorize error:', error)
    return NextResponse.json({
      error: 'Failed to start OAuth flow',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId, shop } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const clientId = process.env.SHOPIFY_CLIENT_ID
    if (!clientId) {
      return NextResponse.json({
        error: 'Shopify integration not configured',
        configured: false
      }, { status: 500 })
    }

    // Return the authorize URL for frontend to redirect
    const authorizeUrl = new URL('/api/integrations/shopify/oauth/authorize', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002')
    authorizeUrl.searchParams.set('organization_id', organizationId)
    if (shop) {
      authorizeUrl.searchParams.set('shop', shop)
    }

    return NextResponse.json({
      success: true,
      authUrl: authorizeUrl.toString(),
      configured: true
    })
  } catch (error) {
    console.error('Shopify OAuth POST error:', error)
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 })
  }
}