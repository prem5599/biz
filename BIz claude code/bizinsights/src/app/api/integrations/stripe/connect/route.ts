import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId, secretKey, publishableKey } = await request.json()

    if (!organizationId || !secretKey || !publishableKey) {
      return NextResponse.json(
        { error: 'Organization ID, secret key, and publishable key are required' },
        { status: 400 }
      )
    }

    // Validate Stripe key formats
    if (!secretKey.startsWith('sk_')) {
      return NextResponse.json(
        { error: 'Invalid secret key format' },
        { status: 400 }
      )
    }

    if (!publishableKey.startsWith('pk_')) {
      return NextResponse.json(
        { error: 'Invalid publishable key format' },
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

    // Test Stripe API connection
    try {
      const testResponse = await fetch('https://api.stripe.com/v1/account', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      if (!testResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to connect to Stripe. Please check your secret key.' },
          { status: 400 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to connect to Stripe. Please check your credentials.' },
        { status: 400 }
      )
    }

    // Create or update the integration
    const integration = await prisma.integration.upsert({
      where: {
        organizationId_platform: {
          organizationId,
          platform: 'STRIPE'
        }
      },
      update: {
        status: 'CONNECTED',
        accessToken: secretKey, // In production, encrypt this
        config: {
          publishableKey: publishableKey.substring(0, 20) + '...' // Only store partial key for security
        },
        lastSyncAt: new Date()
      },
      create: {
        organizationId,
        platform: 'STRIPE',
        status: 'CONNECTED',
        accessToken: secretKey, // In production, encrypt this
        config: {
          publishableKey: publishableKey.substring(0, 20) + '...'
        },
        lastSyncAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        integrationId: integration.id,
        status: integration.status,
        message: 'Stripe connected successfully!'
      }
    })
  } catch (error) {
    console.error('Error connecting Stripe:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}