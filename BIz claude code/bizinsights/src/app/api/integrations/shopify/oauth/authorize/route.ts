import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const organizationId = searchParams.get('organization_id')
  
  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
  }

  // In a real app, you'd:
  // 1. Generate a secure state parameter
  // 2. Store it in session/database
  // 3. Redirect to Shopify OAuth URL

  const shopifyAuthUrl = new URL('https://accounts.shopify.com/oauth/authorize')
  shopifyAuthUrl.searchParams.set('client_id', process.env.SHOPIFY_CLIENT_ID || 'demo_client_id')
  shopifyAuthUrl.searchParams.set('scope', 'read_orders,read_customers,read_products,read_analytics')
  shopifyAuthUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/shopify/oauth/callback`)
  shopifyAuthUrl.searchParams.set('state', organizationId)
  shopifyAuthUrl.searchParams.set('response_type', 'code')

  return NextResponse.redirect(shopifyAuthUrl.toString())
}

export async function POST(request: NextRequest) {
  const { organizationId } = await request.json()
  
  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
  }

  // Return the OAuth URL for frontend to use
  const shopifyAuthUrl = new URL('https://accounts.shopify.com/oauth/authorize')
  shopifyAuthUrl.searchParams.set('client_id', process.env.SHOPIFY_CLIENT_ID || 'demo_client_id')
  shopifyAuthUrl.searchParams.set('scope', 'read_orders,read_customers,read_products,read_analytics')
  shopifyAuthUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/shopify/oauth/callback`)
  shopifyAuthUrl.searchParams.set('state', organizationId)
  shopifyAuthUrl.searchParams.set('response_type', 'code')

  return NextResponse.json({
    success: true,
    authUrl: shopifyAuthUrl.toString()
  })
}