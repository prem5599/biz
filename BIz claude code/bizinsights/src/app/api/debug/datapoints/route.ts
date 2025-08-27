import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Get all DataPoints for this organization
    const dataPoints = await prisma.dataPoint.findMany({
      where: { organizationId },
      orderBy: { dateRecorded: 'desc' },
      take: 20,
      include: {
        integration: {
          select: {
            id: true,
            platform: true,
            status: true
          }
        }
      }
    })

    // Get all integrations for this organization
    const integrations = await prisma.integration.findMany({
      where: { organizationId },
      select: {
        id: true,
        platform: true,
        status: true,
        createdAt: true,
        lastSyncAt: true
      }
    })

    // Group dataPoints by metricType
    const metricTypes = dataPoints.reduce((acc, dp) => {
      if (!acc[dp.metricType]) {
        acc[dp.metricType] = []
      }
      acc[dp.metricType].push({
        value: dp.value,
        dateRecorded: dp.dateRecorded,
        metadata: dp.metadata
      })
      return acc
    }, {} as any)

    // Calculate total revenue from our data
    const revenuePoints = dataPoints.filter(dp => dp.metricType === 'revenue')
    const totalRevenue = revenuePoints.reduce((sum, dp) => sum + Number(dp.value), 0)
    
    // Get individual order values for comparison
    const orderPoints = dataPoints.filter(dp => dp.metricType === 'order')
    const orderTotal = orderPoints.reduce((sum, dp) => sum + Number(dp.value), 0)

    return NextResponse.json({
      success: true,
      data: {
        totalDataPoints: dataPoints.length,
        integrations,
        metricTypes,
        calculations: {
          totalRevenueFromAggregates: totalRevenue,
          totalRevenueFromOrders: orderTotal,
          revenuePointsCount: revenuePoints.length,
          orderPointsCount: orderPoints.length,
          difference: Math.abs(totalRevenue - orderTotal)
        },
        recentDataPoints: dataPoints.slice(0, 10).map(dp => ({
          id: dp.id,
          metricType: dp.metricType,
          value: Number(dp.value),
          dateRecorded: dp.dateRecorded,
          metadata: dp.metadata,
          integration: dp.integration
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching debug data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debug data' },
      { status: 500 }
    )
  }
}