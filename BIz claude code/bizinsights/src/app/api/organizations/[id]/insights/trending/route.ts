import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { InsightsEngine } from '@/lib/insights/InsightsEngine'
import { InsightGenerationOptions } from '@/lib/insights/types'

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

    // Parse URL parameters
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30d'
    const maxInsights = parseInt(searchParams.get('maxInsights') || '10')

    // Initialize insights engine
    const insightsEngine = new InsightsEngine(organizationId, {
      enableForecasting: true,
      enableAnomalyDetection: false, // Focus on trends only
      enableSeasonalityDetection: true,
      minDataPoints: 7,
      confidenceThreshold: 0.7, // Higher confidence for trends
      cacheEnabled: true,
      parallelProcessing: true
    })

    // Generate trend-focused insights
    const options: InsightGenerationOptions = {
      metrics: ['revenue', 'orders', 'customers', 'sessions'],
      includeForecasts: true,
      includeRecommendations: false,
      minConfidence: 0.7,
      maxInsights,
      priorityMetrics: ['revenue']
    }

    const allInsights = await insightsEngine.generateInsights(timeframe, options)
    
    // Filter for trend insights only
    const trendInsights = allInsights.filter(insight => insight.type === 'trend')

    return NextResponse.json({
      success: true,
      data: {
        insights: trendInsights,
        metadata: {
          totalInsights: trendInsights.length,
          timeframe,
          generatedAt: new Date().toISOString(),
          type: 'trending'
        }
      }
    })

  } catch (error) {
    console.error('Error fetching trend insights:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch trend insights',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}