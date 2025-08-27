import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId } = await request.json()

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
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

    // Find the Stripe integration
    const integration = await prisma.integration.findUnique({
      where: {
        organizationId_platform: {
          organizationId,
          platform: 'STRIPE'
        }
      }
    })

    if (!integration || integration.status !== 'CONNECTED') {
      return NextResponse.json(
        { error: 'Stripe integration not found or not connected' },
        { status: 404 }
      )
    }

    const secretKey = integration.accessToken

    if (!secretKey) {
      return NextResponse.json(
        { error: 'Integration configuration is incomplete' },
        { status: 400 }
      )
    }

    // Fetch data from Stripe API
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const endpoints = [
      'charges',
      'customers',
      'payment_intents'
    ]

    const results = await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        const url = `https://api.stripe.com/v1/${endpoint}?created[gte]=${Math.floor(thirtyDaysAgo.getTime() / 1000)}&limit=100`
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`)
        }

        return response.json()
      })
    )

    let charges = []
    let customers = []
    let paymentIntents = []

    // Process results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        switch (index) {
          case 0: charges = result.value.data || []; break
          case 1: customers = result.value.data || []; break
          case 2: paymentIntents = result.value.data || []; break
        }
      }
    })

    // Create data points from Stripe data
    const dataPoints = []

    // Revenue data from charges
    if (charges.length > 0) {
      const chargesByDate = new Map()
      
      charges.forEach((charge: any) => {
        if (charge.status === 'succeeded') {
          const date = new Date(charge.created * 1000).toISOString().split('T')[0]
          if (!chargesByDate.has(date)) {
            chargesByDate.set(date, { revenue: 0, count: 0 })
          }
          const dayData = chargesByDate.get(date)
          dayData.revenue += (charge.amount || 0) / 100 // Convert from cents
          dayData.count += 1
        }
      })

      // Create revenue and transaction data points
      for (const [date, data] of chargesByDate.entries()) {
        dataPoints.push({
          organizationId,
          integrationId: integration.id,
          metricType: 'revenue',
          value: data.revenue,
          dateRecorded: new Date(date),
          source: 'stripe'
        })

        dataPoints.push({
          organizationId,
          integrationId: integration.id,
          metricType: 'orders',
          value: data.count,
          dateRecorded: new Date(date),
          source: 'stripe'
        })
      }
    }

    // Customer data
    if (customers.length > 0) {
      dataPoints.push({
        organizationId,
        integrationId: integration.id,
        metricType: 'customers',
        value: customers.length,
        dateRecorded: now,
        source: 'stripe'
      })
    }

    // Save data points to database
    if (dataPoints.length > 0) {
      await prisma.dataPoint.createMany({
        data: dataPoints,
        skipDuplicates: true
      })
    }

    // Update integration sync time
    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastSyncAt: now }
    })

    return NextResponse.json({
      success: true,
      data: {
        synced: dataPoints.length,
        charges: charges.length,
        customers: customers.length,
        lastSyncAt: now
      }
    })
  } catch (error) {
    console.error('Error syncing Stripe:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}