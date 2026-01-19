import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = params.id

    // Verify user has access to organization
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

    // Query actual data to calculate real data quality metrics
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Get data point counts by metric type
    const dataCounts = await prisma.dataPoint.groupBy({
      by: ['metricType'],
      where: {
        organizationId,
        dateRecorded: { gte: thirtyDaysAgo }
      },
      _count: { _all: true }
    })

    // Get integrations status
    const integrations = await prisma.integration.findMany({
      where: { organizationId },
      select: { platform: true, status: true, lastSyncAt: true }
    })

    // Build real data quality metrics
    const metricNames = ['revenue', 'orders', 'customers', 'sessions']
    const metrics = metricNames.map(metric => {
      const dataCount = dataCounts.find(d => d.metricType === metric)?._count?._all || 0
      const hasData = dataCount > 0

      // Calculate quality based on data availability
      let quality = 0
      let status = 'no_data'
      const issues: string[] = []

      if (dataCount === 0) {
        quality = 0
        status = 'no_data'
        issues.push('No data available - connect an integration to sync data')
      } else if (dataCount < 10) {
        quality = 40
        status = 'warning'
        issues.push('Insufficient data points for reliable analysis')
      } else if (dataCount < 30) {
        quality = 70
        status = 'warning'
        issues.push('Limited data history')
      } else {
        quality = 90
        status = 'good'
      }

      return {
        metric,
        quality,
        status,
        lastUpdated: new Date().toISOString(),
        recordCount: dataCount,
        issues
      }
    })

    // Calculate overall score
    const metricsWithData = metrics.filter(m => m.recordCount > 0)
    const overallScore = metricsWithData.length > 0
      ? Math.round(metricsWithData.reduce((sum, m) => sum + m.quality, 0) / metricsWithData.length)
      : 0

    // Build recommendations based on actual issues
    const recommendations: string[] = []
    if (integrations.length === 0) {
      recommendations.push('Connect at least one data integration to start receiving insights')
    }
    if (metrics.every(m => m.recordCount === 0)) {
      recommendations.push('No data has been synced yet - check your integration settings')
    }
    metricsWithData.filter(m => m.status === 'warning').forEach(m => {
      recommendations.push(`Collect more ${m.metric} data for improved analysis accuracy`)
    })

    const dataQuality = {
      overallScore,
      metrics,
      recommendations,
      lastAssessment: new Date().toISOString(),
      integrationCount: integrations.length,
      activeIntegrations: integrations.filter(i => i.status === 'CONNECTED').length
    }

    return NextResponse.json({
      success: true,
      data: dataQuality
    })

  } catch (error) {
    console.error('Error fetching data quality report:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch data quality report',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    )
  }
}

