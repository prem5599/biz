import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { storeUrl, consumerKey, consumerSecret } = await request.json()

    if (!storeUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json({ 
        success: false, 
        error: 'Store URL, consumer key, and consumer secret are required' 
      }, { status: 400 })
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/.+\..+/
    if (!urlPattern.test(storeUrl)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid store URL format' 
      }, { status: 400 })
    }

    // Validate key formats
    if (!consumerKey.startsWith('ck_')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Consumer key should start with "ck_"' 
      }, { status: 400 })
    }

    if (!consumerSecret.startsWith('cs_')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Consumer secret should start with "cs_"' 
      }, { status: 400 })
    }

    // Test connection to WooCommerce
    const apiUrl = `${storeUrl.replace(/\/$/, '')}/wp-json/wc/v3/system_status`
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid consumer key or secret' 
        }, { status: 400 })
      } else if (response.status === 404) {
        return NextResponse.json({ 
          success: false, 
          error: 'WooCommerce API not found. Make sure WooCommerce is installed and API is enabled.' 
        }, { status: 400 })
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to connect to WooCommerce store' 
        }, { status: 400 })
      }
    }

    const systemStatus = await response.json()
    
    return NextResponse.json({
      success: true,
      data: {
        storeUrl: storeUrl,
        wcVersion: systemStatus.environment?.version || 'Unknown',
        wpVersion: systemStatus.environment?.wp_version || 'Unknown'
      }
    })

  } catch (error) {
    console.error('WooCommerce test connection error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}