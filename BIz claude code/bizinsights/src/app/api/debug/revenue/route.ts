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

    // Get revenue and order datapoints with details
    const revenuePoints = await prisma.dataPoint.findMany({
      where: { 
        organizationId,
        metricType: 'revenue'
      },
      orderBy: { dateRecorded: 'desc' }
    })

    const orderPoints = await prisma.dataPoint.findMany({
      where: { 
        organizationId,
        metricType: 'order'
      },
      orderBy: { dateRecorded: 'desc' },
      take: 20
    })

    // Calculate totals
    const totalFromRevenue = revenuePoints.reduce((sum, dp) => sum + Number(dp.value), 0)
    const totalFromOrders = orderPoints.reduce((sum, dp) => sum + Number(dp.value), 0)

    // Analyze order details
    const orderAnalysis = orderPoints.map(dp => ({
      orderNumber: dp.metadata?.orderNumber,
      value: Number(dp.value),
      subtotalPrice: dp.metadata?.subtotalPrice,
      totalPrice: dp.metadata?.totalPrice,
      totalTax: dp.metadata?.totalTax,
      financialStatus: dp.metadata?.financialStatus,
      dateRecorded: dp.dateRecorded
    }))

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          revenuePoints: revenuePoints.length,
          orderPoints: orderPoints.length,
          totalFromRevenue: totalFromRevenue,
          totalFromOrders: totalFromOrders,
          difference: Math.abs(totalFromRevenue - totalFromOrders)
        },
        revenueDetails: revenuePoints.map(dp => ({
          value: Number(dp.value),
          metadata: dp.metadata,
          dateRecorded: dp.dateRecorded
        })),
        orderAnalysis: orderAnalysis,
        possibleIssues: {
          usingTotalInsteadOfSubtotal: orderAnalysis.some(o => o.value > o.subtotalPrice),
          taxIncluded: orderAnalysis.some(o => o.totalTax > 0),
          multipleOrderSources: orderAnalysis.length > 1
        }
      }
    })

  } catch (error) {
    console.error('Error fetching revenue debug data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue debug data' },
      { status: 500 }
    )
  }
}