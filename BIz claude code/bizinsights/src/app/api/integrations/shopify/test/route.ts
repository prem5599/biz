import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { shopDomain, accessToken } = await request.json()

    if (!shopDomain || !accessToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Shop domain and access token are required' 
      }, { status: 400 })
    }

    // Validate domain format
    const domainPattern = /^[a-zA-Z0-9-]+$/
    if (!domainPattern.test(shopDomain)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid shop domain format' 
      }, { status: 400 })
    }

    // Test connection to Shopify
    const shopifyUrl = `https://${shopDomain}.myshopify.com/admin/api/2023-10/shop.json`
    
    const response = await fetch(shopifyUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid access token' 
        }, { status: 400 })
      } else if (response.status === 404) {
        return NextResponse.json({ 
          success: false, 
          error: 'Shop not found. Please check your shop domain.' 
        }, { status: 400 })
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to connect to Shopify' 
        }, { status: 400 })
      }
    }

    const shopData = await response.json()
    
    return NextResponse.json({
      success: true,
      data: {
        shopName: shopData.shop?.name,
        domain: shopData.shop?.domain,
        currency: shopData.shop?.currency
      }
    })

  } catch (error) {
    console.error('Shopify test connection error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}