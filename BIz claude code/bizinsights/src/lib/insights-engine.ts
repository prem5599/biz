import { prisma } from './prisma'

interface MetricAnalysis {
  current: number
  previous: number
  change: number
  changePercent: number
}

interface InsightData {
  type: 'TREND' | 'ANOMALY' | 'RECOMMENDATION' | 'ALERT'
  title: string
  description: string
  impactScore: number
  metadata?: any
}

export class InsightsEngine {
  private organizationId: string

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  async generateInsights(): Promise<InsightData[]> {
    const insights: InsightData[] = []

    try {
      const [revenueAnalysis, ordersAnalysis, customersAnalysis] = await Promise.all([
        this.analyzeMetric('revenue'),
        this.analyzeMetric('orders'),
        this.analyzeMetric('customers')
      ])

      if (revenueAnalysis) {
        insights.push(...this.generateRevenueInsights(revenueAnalysis))
      }

      if (ordersAnalysis) {
        insights.push(...this.generateOrdersInsights(ordersAnalysis))
      }

      if (customersAnalysis) {
        insights.push(...this.generateCustomersInsights(customersAnalysis))
      }

      const crossMetricInsights = this.generateCrossMetricInsights(
        revenueAnalysis,
        ordersAnalysis,
        customersAnalysis
      )
      insights.push(...crossMetricInsights)

      return insights.sort((a, b) => b.impactScore - a.impactScore)
    } catch (error) {
      console.error('Error generating insights:', error)
      return []
    }
  }

  private async analyzeMetric(metricType: string): Promise<MetricAnalysis | null> {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    const [currentPeriod, previousPeriod] = await Promise.all([
      prisma.dataPoint.aggregate({
        where: {
          organizationId: this.organizationId,
          metricType,
          dateRecorded: {
            gte: thirtyDaysAgo,
            lte: now
          }
        },
        _sum: { value: true }
      }),
      prisma.dataPoint.aggregate({
        where: {
          organizationId: this.organizationId,
          metricType,
          dateRecorded: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo
          }
        },
        _sum: { value: true }
      })
    ])

    const current = Number(currentPeriod._sum.value || 0)
    const previous = Number(previousPeriod._sum.value || 0)

    if (previous === 0) return null

    const change = current - previous
    const changePercent = (change / previous) * 100

    return {
      current,
      previous,
      change,
      changePercent
    }
  }

  private generateRevenueInsights(analysis: MetricAnalysis): InsightData[] {
    const insights: InsightData[] = []

    if (Math.abs(analysis.changePercent) > 20) {
      const isPositive = analysis.changePercent > 0
      insights.push({
        type: isPositive ? 'TREND' : 'ANOMALY',
        title: `Revenue ${isPositive ? 'increased' : 'decreased'} ${Math.abs(analysis.changePercent).toFixed(1)}% this month`,
        description: isPositive
          ? `Your revenue growth is accelerating. This trend suggests strong business momentum. Consider increasing inventory levels to meet growing demand.`
          : `There has been a significant revenue decline. Review your marketing channels, product pricing, and customer feedback to identify potential causes.`,
        impactScore: isPositive ? 9 : 8,
        metadata: { metric: 'revenue', change: analysis.changePercent }
      })
    }

    if (analysis.changePercent > 50) {
      insights.push({
        type: 'RECOMMENDATION',
        title: 'Scale your successful strategies',
        description: 'With exceptional revenue growth, now is the time to double down on what\'s working. Consider increasing marketing spend and expanding your team.',
        impactScore: 7,
        metadata: { metric: 'revenue', action: 'scale' }
      })
    }

    return insights
  }

  private generateOrdersInsights(analysis: MetricAnalysis): InsightData[] {
    const insights: InsightData[] = []

    if (Math.abs(analysis.changePercent) > 15) {
      const isPositive = analysis.changePercent > 0
      insights.push({
        type: isPositive ? 'TREND' : 'ANOMALY',
        title: `Order volume ${isPositive ? 'increased' : 'decreased'} ${Math.abs(analysis.changePercent).toFixed(1)}% this month`,
        description: isPositive
          ? `Higher order volume indicates growing customer demand. Ensure your fulfillment processes can handle the increased load.`
          : `Declining order volume needs attention. Review your product offerings, pricing, and customer acquisition channels.`,
        impactScore: isPositive ? 7 : 8,
        metadata: { metric: 'orders', change: analysis.changePercent }
      })
    }

    return insights
  }

  private generateCustomersInsights(analysis: MetricAnalysis): InsightData[] {
    const insights: InsightData[] = []

    if (Math.abs(analysis.changePercent) > 10) {
      const isPositive = analysis.changePercent > 0
      insights.push({
        type: isPositive ? 'TREND' : 'ALERT',
        title: `Customer count ${isPositive ? 'grew' : 'declined'} ${Math.abs(analysis.changePercent).toFixed(1)}% this month`,
        description: isPositive
          ? `Growing customer base is a healthy sign. Focus on retention strategies to maximize customer lifetime value.`
          : `Customer count decline is concerning. Review your customer acquisition strategies and identify any retention issues.`,
        impactScore: isPositive ? 6 : 8,
        metadata: { metric: 'customers', change: analysis.changePercent }
      })
    }

    return insights
  }

  private generateCrossMetricInsights(
    revenue: MetricAnalysis | null,
    orders: MetricAnalysis | null,
    customers: MetricAnalysis | null
  ): InsightData[] {
    const insights: InsightData[] = []

    if (revenue && orders && revenue.current > 0 && orders.current > 0) {
      const averageOrderValue = revenue.current / orders.current
      const previousAOV = revenue.previous / orders.previous

      if (previousAOV > 0) {
        const aovChange = ((averageOrderValue - previousAOV) / previousAOV) * 100

        if (Math.abs(aovChange) > 10) {
          insights.push({
            type: aovChange > 0 ? 'TREND' : 'RECOMMENDATION',
            title: `Average order value ${aovChange > 0 ? 'increased' : 'decreased'} ${Math.abs(aovChange).toFixed(1)}%`,
            description: aovChange > 0
              ? `Customers are spending more per order. Consider promoting higher-value products or bundles to maintain this trend.`
              : `Average order value is declining. Consider implementing upselling strategies, product bundles, or free shipping thresholds.`,
            impactScore: 6,
            metadata: { 
              metric: 'aov', 
              currentAOV: averageOrderValue,
              previousAOV,
              change: aovChange 
            }
          })
        }
      }
    }

    return insights
  }

  async saveInsights(insights: InsightData[]): Promise<void> {
    const insightsToCreate = insights.map(insight => ({
      organizationId: this.organizationId,
      type: insight.type,
      title: insight.title,
      description: insight.description,
      impactScore: insight.impactScore,
      metadata: insight.metadata || {}
    }))

    await prisma.insight.createMany({
      data: insightsToCreate
    })
  }
}