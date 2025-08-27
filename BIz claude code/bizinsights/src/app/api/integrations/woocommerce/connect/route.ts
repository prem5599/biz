import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId, storeUrl, consumerKey, consumerSecret } = await request.json()

    if (!organizationId || !storeUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: 'Organization ID, store URL, consumer key, and consumer secret are required' },
        { status: 400 }
      )
    }

    // Validate WooCommerce store URL format
    const urlPattern = /^https?:\/\/.+\..+/
    if (!urlPattern.test(storeUrl)) {
      return NextResponse.json(
        { error: 'Invalid store URL format' },
        { status: 400 }
      )
    }

    const { prisma } = await import('@/lib/prisma')

    // Check if user has access to the organization
    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id
      }
    })

    if (!membershipCheck) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Test WooCommerce API connection
    const testUrl = `${storeUrl.replace(/\/$/, '')}/wp-json/wc/v3/system_status`
    
    try {
      const testResponse = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      })

      if (!testResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to connect to WooCommerce store. Please check your credentials.' },
          { status: 400 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to connect to WooCommerce store. Please check your store URL and credentials.' },
        { status: 400 }
      )
    }

    // Create or update the integration
    const integration = await prisma.integration.upsert({
      where: {
        organizationId_platform: {
          organizationId,
          platform: 'WOOCOMMERCE'
        }
      },
      update: {
        status: 'CONNECTED',
        accessToken: Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64'),
        config: {
          storeUrl,
          consumerKey: consumerKey.substring(0, 8) + '...' // Only store partial key for security
        },
        lastSyncAt: new Date()
      },
      create: {
        organizationId,
        platform: 'WOOCOMMERCE',
        status: 'CONNECTED',
        accessToken: Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64'),
        config: {
          storeUrl,
          consumerKey: consumerKey.substring(0, 8) + '...'
        },
        lastSyncAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        integrationId: integration.id,
        status: integration.status,
        message: 'WooCommerce store connected successfully!'
      }
    })
  } catch (error) {
    console.error('Error connecting WooCommerce:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}