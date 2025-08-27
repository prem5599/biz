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

    // Get recent alert insights from database
    const alertInsights = await prisma.insight.findMany({
      where: { 
        organizationId,
        type: { in: ['ALERT', 'ANOMALY'] }
      },
      orderBy: [
        { impactScore: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 10
    })

    // Convert database format to expected format
    const alerts = alertInsights.map(insight => ({
      id: insight.id,
      type: insight.impactScore >= 9 ? 'critical' : insight.impactScore >= 7 ? 'high' : 'medium',
      title: insight.title,
      description: insight.description,
      metric: insight.metadata?.affectedMetrics?.[0] || 'unknown',
      value: insight.metadata?.currentValue || 0,
      threshold: insight.metadata?.threshold,
      trend: insight.metadata?.trendDirection || 'stable',
      createdAt: insight.createdAt.toISOString(),
      acknowledged: false,
      severity: insight.impactScore >= 9 ? 'critical' : insight.impactScore >= 7 ? 'high' : insight.impactScore >= 5 ? 'medium' : 'low'
    }))

    // Generate summary stats
    const summary = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      unacknowledged: alerts.length, // All are unacknowledged by default
      last24h: alerts.filter(a => {
        const alertDate = new Date(a.createdAt)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        return alertDate > yesterday
      }).length
    }

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        summary,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching alert insights:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch alert insights',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

