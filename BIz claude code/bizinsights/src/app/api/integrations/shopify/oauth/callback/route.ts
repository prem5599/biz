import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // This is the organization ID
  const error = searchParams.get('error')

  if (error) {
    // Redirect to frontend with error
    const errorUrl = new URL('/dashboard/integrations/oauth', process.env.NEXT_PUBLIC_APP_URL!)
    errorUrl.searchParams.set('error', error)
    return NextResponse.redirect(errorUrl.toString())
  }

  if (!code || !state) {
    const errorUrl = new URL('/dashboard/integrations/oauth', process.env.NEXT_PUBLIC_APP_URL!)
    errorUrl.searchParams.set('error', 'missing_code_or_state')
    return NextResponse.redirect(errorUrl.toString())
  }

  try {
    // In a real app, you would:
    // 1. Exchange the code for an access token with Shopify
    // 2. Get shop information
    // 3. Store the integration in your database

    // For demo purposes, we'll simulate this:
    const mockShopData = {
      shop: 'demo-shop',
      accessToken: 'demo_access_token',
      scopes: 'read_orders,read_customers,read_products,read_analytics'
    }

    // Store the integration
    await prisma.integration.upsert({
      where: {
        organizationId_platform: {
          organizationId: state,
          platform: 'SHOPIFY'
        }
      },
      update: {
        status: 'CONNECTED',
        credentials: {
          shop: mockShopData.shop,
          accessToken: mockShopData.accessToken,
          scopes: mockShopData.scopes
        },
        lastSyncAt: new Date(),
        connectedAt: new Date()
      },
      create: {
        organizationId: state,
        platform: 'SHOPIFY',
        status: 'CONNECTED',
        credentials: {
          shop: mockShopData.shop,
          accessToken: mockShopData.accessToken,
          scopes: mockShopData.scopes
        },
        lastSyncAt: new Date(),
        connectedAt: new Date()
      }
    })

    // Redirect to success page
    const successUrl = new URL('/dashboard/integrations/oauth', process.env.NEXT_PUBLIC_APP_URL!)
    successUrl.searchParams.set('success', 'shopify_connected')
    return NextResponse.redirect(successUrl.toString())

  } catch (error) {
    console.error('Shopify OAuth callback error:', error)
    const errorUrl = new URL('/dashboard/integrations/oauth', process.env.NEXT_PUBLIC_APP_URL!)
    errorUrl.searchParams.set('error', 'callback_error')
    return NextResponse.redirect(errorUrl.toString())
  }
}