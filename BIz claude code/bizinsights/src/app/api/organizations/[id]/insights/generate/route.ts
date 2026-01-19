import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { InsightsEngine } from '@/lib/insights/InsightsEngine'
import { InsightData, InsightGenerationOptions } from '@/lib/insights/types'

export async function POST(
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

    // Parse request body for options
    let options: InsightGenerationOptions = {}
    try {
      const body = await request.json()
      options = {
        timeframe: body.timeframe ? {
          start: new Date(body.timeframe.start),
          end: new Date(body.timeframe.end)
        } : undefined,
        metrics: body.metrics || ['revenue', 'orders', 'customers', 'sessions'],
        includeForecasts: body.includeForecasts !== false,
        includeRecommendations: body.includeRecommendations !== false,
        minConfidence: body.minConfidence || 0.6,
        maxInsights: body.maxInsights || 15,
        priorityMetrics: body.priorityMetrics || ['revenue']
      }
    } catch (error) {
      // Use default options if body parsing fails
      console.warn('Failed to parse request body, using defaults:', error)
    }

    // Use real InsightsEngine to generate insights from actual data
    const engine = new InsightsEngine(organizationId, {
      cacheEnabled: true,
      enableForecasting: options.includeForecasts !== false,
      confidenceThreshold: options.minConfidence || 0.6
    })

    let insights: InsightData[] = []
    let forecastInsights: InsightData[] = []

    try {
      // generateInsights returns InsightData[] directly
      insights = await engine.generateInsights('30d', options)
      // forecastInsights would be separate if forecasting was implemented
    } catch (error) {
      console.warn('Error generating insights from engine, returning empty:', error)
      // Return empty insights when no data available
      insights = []
      forecastInsights = []
    }

    // Get business profile from organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true }
    })

    const businessProfile = {
      industry: 'e-commerce',
      businessType: 'small business',
      size: 'small'
    }

    // Sort by impact score and limit to top insights
    const finalInsights = insights
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, options.maxInsights || 15)

    // Save insights to database (simplified)
    try {
      await saveInsightsToDatabase(organizationId, finalInsights)
    } catch (error) {
      console.warn('Failed to save insights to database:', error)
    }

    // Generate executive summary
    const executiveSummary = generateExecutiveSummary(finalInsights, businessProfile)

    return NextResponse.json({
      success: true,
      data: {
        insights: finalInsights,
        summary: executiveSummary,
        businessProfile: {
          industry: businessProfile.industry,
          businessType: businessProfile.businessType,
          size: businessProfile.size
        },
        metadata: {
          totalInsights: finalInsights.length,
          highImpactInsights: finalInsights.filter(i => i.impactScore >= 8).length,
          forecastingEnabled: forecastInsights.length > 0,
          generatedAt: new Date().toISOString()
        }
      }
    })

  } catch (error) {
    console.error('Error generating insights:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate insights',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}



// Simplified helper functions

async function saveInsightsToDatabase(
  organizationId: string,
  insights: InsightData[]
): Promise<void> {
  try {
    // Delete old insights (keep only last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    await prisma.insight.deleteMany({
      where: {
        organizationId,
        createdAt: { lt: thirtyDaysAgo }
      }
    })

    // Create new insights
    const insightsToCreate = insights.map(insight => ({
      organizationId,
      type: insight.type.toUpperCase() as any,
      title: insight.title,
      description: insight.description,
      impactScore: insight.impactScore,
      metadata: {
        recommendation: insight.recommendation,
        confidence: insight.confidence,
        affectedMetrics: insight.affectedMetrics,
        timeframe: insight.timeframe,
        businessContext: insight.businessContext,
        analysisMetadata: insight.metadata
      }
    }))

    await prisma.insight.createMany({
      data: insightsToCreate,
      skipDuplicates: true
    })
  } catch (error) {
    console.error('Error saving insights to database:', error)
  }
}

async function updateUserInsightHistory(
  userId: string,
  insightIds: string[]
): Promise<void> {
  // Simplified - just log for now
  console.log(`User ${userId} viewed insights:`, insightIds.length)
}

function generateExecutiveSummary(
  insights: InsightData[],
  businessProfile: any
): string {
  const highImpactInsights = insights.filter(i => i.impactScore >= 8)
  const trendInsights = insights.filter(i => i.type === 'trend')
  const alertInsights = insights.filter(i => i.type === 'alert' || i.type === 'anomaly')
  const recommendationInsights = insights.filter(i => i.type === 'recommendation')

  let summary = `AI Business Intelligence Summary: `

  if (highImpactInsights.length > 0) {
    summary += `${highImpactInsights.length} high-impact insight${highImpactInsights.length > 1 ? 's' : ''} identified requiring immediate attention. `
  }

  if (trendInsights.length > 0) {
    summary += `${trendInsights.length} trend analysis completed. `
  }

  if (alertInsights.length > 0) {
    summary += `${alertInsights.length} anomaly${alertInsights.length > 1 ? 'ies' : ''} detected requiring investigation. `
  }

  if (recommendationInsights.length > 0) {
    summary += `${recommendationInsights.length} actionable recommendation${recommendationInsights.length > 1 ? 's' : ''} provided for business optimization.`
  }

  if (insights.length === 0) {
    summary = 'Your business metrics are being analyzed. AI insights will be generated based on available data patterns and trends.'
  }

  return summary
}

// Optional: GET endpoint to retrieve existing insights
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

    // Get recent insights
    const insights = await prisma.insight.findMany({
      where: { organizationId },
      orderBy: [
        { impactScore: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 20
    })

    return NextResponse.json({
      success: true,
      data: insights
    })

  } catch (error) {
    console.error('Error fetching insights:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    )
  }
}