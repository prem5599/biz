import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { secretKey, publishableKey } = await request.json()

    if (!secretKey || !publishableKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Secret key and publishable key are required' 
      }, { status: 400 })
    }

    // Validate key formats
    if (!secretKey.startsWith('sk_')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Secret key should start with "sk_"' 
      }, { status: 400 })
    }

    if (!publishableKey.startsWith('pk_')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Publishable key should start with "pk_"' 
      }, { status: 400 })
    }

    // Test connection to Stripe
    const response = await fetch('https://api.stripe.com/v1/account', {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid secret key' 
        }, { status: 400 })
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to connect to Stripe' 
        }, { status: 400 })
      }
    }

    const accountData = await response.json()
    
    return NextResponse.json({
      success: true,
      data: {
        accountId: accountData.id,
        country: accountData.country,
        currency: accountData.default_currency,
        businessProfile: accountData.business_profile?.name
      }
    })

  } catch (error) {
    console.error('Stripe test connection error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}