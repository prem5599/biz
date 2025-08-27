import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId, shopDomain, accessToken } = await request.json()

    if (!organizationId || !shopDomain || !accessToken) {
      return NextResponse.json(
        { error: 'Organization ID, shop domain, and access token are required' },
        { status: 400 }
      )
    }

    // Validate shop domain format
    const domainPattern = /^[a-zA-Z0-9-]+$/
    if (!domainPattern.test(shopDomain)) {
      return NextResponse.json(
        { error: 'Invalid shop domain format' },
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

    // Test Shopify API connection
    const testUrl = `https://${shopDomain}.myshopify.com/admin/api/2023-10/shop.json`
    
    try {
      const testResponse = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      })

      if (!testResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to connect to Shopify store. Please check your credentials.' },
          { status: 400 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to connect to Shopify store. Please check your domain and access token.' },
        { status: 400 }
      )
    }

    // Create or update the integration
    const integration = await prisma.integration.upsert({
      where: {
        organizationId_platform: {
          organizationId,
          platform: 'SHOPIFY'
        }
      },
      update: {
        status: 'CONNECTED',
        accessToken: accessToken, // In production, encrypt this
        metadata: {
          shopDomain
        },
        lastSyncAt: new Date()
      },
      create: {
        organizationId,
        platform: 'SHOPIFY',
        status: 'CONNECTED',
        accessToken: accessToken, // In production, encrypt this
        metadata: {
          shopDomain
        },
        lastSyncAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        integrationId: integration.id,
        status: integration.status,
        message: 'Shopify store connected successfully!'
      }
    })
  } catch (error) {
    console.error('Error connecting Shopify:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}