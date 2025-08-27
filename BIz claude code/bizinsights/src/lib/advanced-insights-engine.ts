import { prisma } from './prisma'

// Core Interfaces
export interface MetricData {
  id: string
  value: number
  timestamp: Date
  source: string
  metadata?: any
}

export interface InsightData {
  id: string
  type: 'trend' | 'performance' | 'opportunity' | 'alert'
  title: string
  description: string
  recommendation: string
  impactScore: number // 1-10
  confidence: number // 0-1
  affectedMetrics: string[]
  timeframe: string
  businessContext: string
  metadata: {
    dataPoints: number
    analysisMethod: string
    statisticalSignificance: number
  }
}

export interface MultiChannelData {
  source: string
  metrics: Record<string, number>
  timeframe: string
}

export interface BusinessProfile {
  industry?: string
  businessType?: 'ecommerce' | 'saas' | 'services'
  size?: 'startup' | 'small' | 'medium' | 'large'
  geographicMarkets?: string[]
  seasonality?: Record<string, number>
}

// Statistical Analysis Classes
export class StatisticalAnalyzer {
  /**
   * Calculate Z-score for anomaly detection
   */
  static calculateZScore(value: number, mean: number, standardDeviation: number): number {
    if (standardDeviation === 0) return 0
    return (value - mean) / standardDeviation
  }

  /**
   * Calculate standard deviation
   */
  static calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length
    return Math.sqrt(avgSquaredDiff)
  }

  /**
   * Calculate moving average
   */
  static calculateMovingAverage(values: number[], windowSize: number): number[] {
    const result: number[] = []
    for (let i = windowSize - 1; i < values.length; i++) {
      const window = values.slice(i - windowSize + 1, i + 1)
      const average = window.reduce((sum, val) => sum + val, 0) / windowSize
      result.push(average)
    }
    return result
  }

  /**
   * Perform linear regression to detect trends
   */
  static linearRegression(dataPoints: { x: number; y: number }[]): {
    slope: number
    intercept: number
    rSquared: number
  } {
    const n = dataPoints.length
    if (n === 0) return { slope: 0, intercept: 0, rSquared: 0 }

    const sumX = dataPoints.reduce((sum, point) => sum + point.x, 0)
    const sumY = dataPoints.reduce((sum, point) => sum + point.y, 0)
    const sumXY = dataPoints.reduce((sum, point) => sum + point.x * point.y, 0)
    const sumXX = dataPoints.reduce((sum, point) => sum + point.x * point.x, 0)
    const sumYY = dataPoints.reduce((sum, point) => sum + point.y * point.y, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Calculate R-squared
    const yMean = sumY / n
    const totalSumSquares = dataPoints.reduce((sum, point) => sum + Math.pow(point.y - yMean, 2), 0)
    const residualSumSquares = dataPoints.reduce((sum, point) => {
      const predicted = slope * point.x + intercept
      return sum + Math.pow(point.y - predicted, 2)
    }, 0)
    const rSquared = 1 - (residualSumSquares / totalSumSquares)

    return { slope, intercept, rSquared }
  }

  /**
   * Calculate correlation coefficient between two datasets
   */
  static calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0

    const n = x.length
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    const sumYY = y.reduce((sum, val) => sum + val * val, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))

    return denominator === 0 ? 0 : numerator / denominator
  }
}

// Natural Language Generation Engine
export class NaturalLanguageGenerator {
  private static readonly TREND_TEMPLATES = {
    positive: {
      significant: "Your {metric} has increased by {percentage}% {timeframe}. This significant growth suggests {business_implication}. Recommended action: {recommendation}",
      moderate: "Your {metric} grew by {percentage}% {timeframe}. This steady improvement indicates {business_implication}. Consider: {recommendation}",
      slight: "Your {metric} increased by {percentage}% {timeframe}. While modest, this positive trend {business_implication}. Next step: {recommendation}"
    },
    negative: {
      significant: "Your {metric} has decreased by {percentage}% {timeframe}. This concerning decline suggests {business_implication}. Immediate action needed: {recommendation}",
      moderate: "Your {metric} dropped by {percentage}% {timeframe}. This downward trend indicates {business_implication}. Recommended action: {recommendation}",
      slight: "Your {metric} declined by {percentage}% {timeframe}. This minor decrease {business_implication}. Consider: {recommendation}"
    }
  }

  static generateTrendInsight(
    metric: string,
    percentage: number,
    timeframe: string,
    businessImplication: string,
    recommendation: string
  ): string {
    const isPositive = percentage > 0
    const absPercentage = Math.abs(percentage)
    
    let magnitude: 'slight' | 'moderate' | 'significant'
    if (absPercentage >= 30) magnitude = 'significant'
    else if (absPercentage >= 15) magnitude = 'moderate'
    else magnitude = 'slight'

    const template = this.TREND_TEMPLATES[isPositive ? 'positive' : 'negative'][magnitude]
    
    return template
      .replace('{metric}', this.humanizeMetric(metric))
      .replace('{percentage}', absPercentage.toFixed(1))
      .replace('{timeframe}', timeframe)
      .replace('{business_implication}', businessImplication)
      .replace('{recommendation}', recommendation)
  }

  static generateAnomalyDescription(
    metric: string,
    anomalyType: 'spike' | 'drop' | 'unusual_pattern',
    severity: 'low' | 'medium' | 'high',
    context: string
  ): string {
    const metricHuman = this.humanizeMetric(metric)
    
    const templates = {
      spike: {
        high: `We detected an unusual spike in your ${metricHuman}. This dramatic increase is ${context}`,
        medium: `Your ${metricHuman} showed an unexpected increase. This pattern ${context}`,
        low: `There was a notable uptick in your ${metricHuman}. This change ${context}`
      },
      drop: {
        high: `We identified a significant drop in your ${metricHuman}. This concerning decline ${context}`,
        medium: `Your ${metricHuman} experienced an unexpected decrease. This pattern ${context}`,
        low: `There was a noticeable dip in your ${metricHuman}. This change ${context}`
      },
      unusual_pattern: {
        high: `Your ${metricHuman} is showing an irregular pattern that deviates significantly from normal behavior. ${context}`,
        medium: `We noticed an unusual pattern in your ${metricHuman} that warrants attention. ${context}`,
        low: `Your ${metricHuman} showed some irregular activity. ${context}`
      }
    }

    return templates[anomalyType][severity]
  }

  static generateOpportunityDescription(
    opportunity: string,
    potential: number,
    difficulty: 'easy' | 'moderate' | 'complex',
    timeline: string
  ): string {
    const difficultyMap = {
      easy: 'quick and simple to implement',
      moderate: 'requires some effort but is achievable',
      complex: 'needs careful planning and resources'
    }

    return `We identified an opportunity to ${opportunity}. This could potentially increase your revenue by ${potential}% and is ${difficultyMap[difficulty]}. Expected timeline: ${timeline}.`
  }

  private static humanizeMetric(metric: string): string {
    const humanMap: Record<string, string> = {
      'revenue': 'revenue',
      'orders': 'order count',
      'customers': 'customer count',
      'sessions': 'website visitors',
      'conversions': 'sales conversions',
      'bounce_rate': 'visitor engagement',
      'avg_order_value': 'average order value',
      'customer_acquisition_cost': 'customer acquisition cost',
      'lifetime_value': 'customer lifetime value',
      'cart_abandonment': 'shopping cart abandonment',
      'page_views': 'page views',
      'click_through_rate': 'ad click rate',
      'cost_per_click': 'advertising cost per click',
      'return_on_ad_spend': 'advertising return'
    }

    return humanMap[metric] || metric.replace(/_/g, ' ')
  }
}

// Impact Scoring Engine
export class ImpactScorer {
  static calculateImpactScore(
    revenueImpact: number,
    urgency: number,
    feasibility: number,
    confidence: number
  ): number {
    // Weighted scoring: Revenue (40%), Urgency (30%), Feasibility (20%), Confidence (10%)
    const revenueScore = Math.min(revenueImpact * 0.4, 4) // Max 4 points
    const urgencyScore = Math.min(urgency * 0.3, 3) // Max 3 points
    const feasibilityScore = Math.min(feasibility * 0.2, 2) // Max 2 points
    const confidenceScore = Math.min(confidence * 0.1, 1) // Max 1 point

    const totalScore = revenueScore + urgencyScore + feasibilityScore + confidenceScore
    return Math.round(Math.max(1, Math.min(10, totalScore)))
  }

  static assessRevenueImpact(
    metric: string,
    changeAmount: number,
    businessSize: 'startup' | 'small' | 'medium' | 'large'
  ): number {
    const sizeMultipliers = {
      startup: { revenue: 1000, orders: 50 },
      small: { revenue: 5000, orders: 200 },
      medium: { revenue: 25000, orders: 1000 },
      large: { revenue: 100000, orders: 5000 }
    }

    const thresholds = sizeMultipliers[businessSize]
    
    if (metric === 'revenue') {
      if (changeAmount >= thresholds.revenue) return 10
      if (changeAmount >= thresholds.revenue * 0.5) return 7
      if (changeAmount >= thresholds.revenue * 0.2) return 5
      return 3
    }

    if (metric === 'orders') {
      if (changeAmount >= thresholds.orders) return 8
      if (changeAmount >= thresholds.orders * 0.5) return 6
      if (changeAmount >= thresholds.orders * 0.2) return 4
      return 2
    }

    return 5 // Default for other metrics
  }

  static assessUrgency(
    trendDirection: 'increasing' | 'decreasing' | 'stable',
    changeRate: number,
    isNegativeTrend: boolean
  ): number {
    if (isNegativeTrend && Math.abs(changeRate) > 30) return 10
    if (isNegativeTrend && Math.abs(changeRate) > 15) return 8
    if (!isNegativeTrend && changeRate > 50) return 7 // High growth opportunity
    if (Math.abs(changeRate) > 10) return 5
    return 3
  }

  static assessFeasibility(
    recommendationType: 'immediate' | 'short_term' | 'long_term',
    resourceRequirement: 'low' | 'medium' | 'high',
    technicalComplexity: 'simple' | 'moderate' | 'complex'
  ): number {
    let score = 10

    // Reduce score based on time requirement
    if (recommendationType === 'long_term') score -= 3
    else if (recommendationType === 'short_term') score -= 1

    // Reduce score based on resource requirement
    if (resourceRequirement === 'high') score -= 3
    else if (resourceRequirement === 'medium') score -= 1

    // Reduce score based on technical complexity
    if (technicalComplexity === 'complex') score -= 2
    else if (technicalComplexity === 'moderate') score -= 1

    return Math.max(1, score)
  }
}

// Main Advanced Insights Engine
export class AdvancedInsightsEngine {
  private organizationId: string
  private businessProfile: BusinessProfile

  constructor(organizationId: string, businessProfile: BusinessProfile = {}) {
    this.organizationId = organizationId
    this.businessProfile = businessProfile
  }

  async generateInsights(): Promise<InsightData[]> {
    try {
      const insights: InsightData[] = []

      // Phase 1: Core analysis
      const [trendInsights, anomalyInsights, performanceInsights] = await Promise.all([
        this.analyzeRevenueTrends(),
        this.detectAnomalies(),
        this.analyzeChannelPerformance()
      ])

      insights.push(...trendInsights, ...anomalyInsights, ...performanceInsights)

      // Phase 2: Cross-platform correlation
      const correlationInsights = await this.analyzeCrossPlatformCorrelations()
      insights.push(...correlationInsights)

      // Phase 3: Generate business recommendations
      const opportunityInsights = await this.generateRecommendations(insights)
      insights.push(...opportunityInsights)

      // Sort by impact score and return
      return insights
        .sort((a, b) => b.impactScore - a.impactScore)
        .slice(0, 20) // Limit to top 20 insights
    } catch (error) {
      console.error('Error generating advanced insights:', error)
      return []
    }
  }

  async analyzeRevenueTrends(): Promise<InsightData[]> {
    const insights: InsightData[] = []
    
    try {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      // Get revenue data for trend analysis
      const revenueData = await prisma.dataPoint.findMany({
        where: {
          organizationId: this.organizationId,
          metricType: 'revenue',
          dateRecorded: { gte: ninetyDaysAgo }
        },
        orderBy: { dateRecorded: 'asc' }
      })

      if (revenueData.length < 10) return insights

      // Prepare data for regression analysis
      const dataPoints = revenueData.map((point, index) => ({
        x: index,
        y: Number(point.value)
      }))

      const regression = StatisticalAnalyzer.linearRegression(dataPoints)
      
      // Calculate period comparisons
      const currentPeriod = revenueData.filter(d => d.dateRecorded >= thirtyDaysAgo)
      const previousPeriod = revenueData.filter(d => 
        d.dateRecorded >= sixtyDaysAgo && d.dateRecorded < thirtyDaysAgo
      )

      const currentRevenue = currentPeriod.reduce((sum, d) => sum + Number(d.value), 0)
      const previousRevenue = previousPeriod.reduce((sum, d) => sum + Number(d.value), 0)

      if (previousRevenue > 0) {
        const changePercent = ((currentRevenue - previousRevenue) / previousRevenue) * 100
        
        // Generate trend insight
        const businessImplication = this.getBusinessImplication('revenue', changePercent, regression.slope)
        const recommendation = this.getRecommendation('revenue', changePercent, regression.slope)
        
        const description = NaturalLanguageGenerator.generateTrendInsight(
          'revenue',
          changePercent,
          'this month compared to last month',
          businessImplication,
          recommendation
        )

        const impactScore = ImpactScorer.calculateImpactScore(
          ImpactScorer.assessRevenueImpact('revenue', Math.abs(currentRevenue - previousRevenue), this.businessProfile.size || 'small'),
          ImpactScorer.assessUrgency(
            changePercent > 0 ? 'increasing' : 'decreasing',
            changePercent,
            changePercent < 0
          ),
          ImpactScorer.assessFeasibility('immediate', 'low', 'simple'),
          regression.rSquared
        )

        insights.push({
          id: `revenue-trend-${Date.now()}`,
          type: Math.abs(changePercent) > 15 ? 'trend' : 'performance',
          title: `Revenue ${changePercent > 0 ? 'Growth' : 'Decline'} Detected`,
          description,
          recommendation,
          impactScore,
          confidence: regression.rSquared,
          affectedMetrics: ['revenue', 'growth_rate'],
          timeframe: '30 days',
          businessContext: this.getBusinessContext(),
          metadata: {
            dataPoints: revenueData.length,
            analysisMethod: 'linear_regression',
            statisticalSignificance: regression.rSquared
          }
        })
      }

    } catch (error) {
      console.error('Error analyzing revenue trends:', error)
    }

    return insights
  }

  async detectAnomalies(): Promise<InsightData[]> {
    const insights: InsightData[] = []

    try {
      const metrics = ['revenue', 'orders', 'customers', 'sessions']
      
      for (const metric of metrics) {
        const anomalies = await this.detectMetricAnomalies(metric)
        insights.push(...anomalies)
      }
    } catch (error) {
      console.error('Error detecting anomalies:', error)
    }

    return insights
  }

  private async detectMetricAnomalies(metric: string): Promise<InsightData[]> {
    const insights: InsightData[] = []

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const data = await prisma.dataPoint.findMany({
        where: {
          organizationId: this.organizationId,
          metricType: metric,
          dateRecorded: { gte: thirtyDaysAgo }
        },
        orderBy: { dateRecorded: 'asc' }
      })

      if (data.length < 10) return insights

      const values = data.map(d => Number(d.value))
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length
      const stdDev = StatisticalAnalyzer.calculateStandardDeviation(values)

      // Check last 7 days for anomalies
      const recentData = data.filter(d => d.dateRecorded >= sevenDaysAgo)
      
      for (const point of recentData) {
        const zScore = StatisticalAnalyzer.calculateZScore(Number(point.value), mean, stdDev)
        
        if (Math.abs(zScore) >= 2) { // 2 standard deviations
          const severity = Math.abs(zScore) >= 3 ? 'high' : Math.abs(zScore) >= 2.5 ? 'medium' : 'low'
          const anomalyType = zScore > 0 ? 'spike' : 'drop'
          
          const context = this.getAnomalyContext(metric, zScore, point.value)
          const description = NaturalLanguageGenerator.generateAnomalyDescription(
            metric,
            anomalyType,
            severity,
            context
          )

          insights.push({
            id: `anomaly-${metric}-${point.id}`,
            type: 'alert',
            title: `Unusual ${anomalyType} in ${NaturalLanguageGenerator['humanizeMetric'](metric)}`,
            description,
            recommendation: this.getAnomalyRecommendation(metric, anomalyType, severity),
            impactScore: severity === 'high' ? 9 : severity === 'medium' ? 7 : 5,
            confidence: Math.min(0.95, Math.abs(zScore) / 3),
            affectedMetrics: [metric],
            timeframe: '7 days',
            businessContext: this.getBusinessContext(),
            metadata: {
              dataPoints: data.length,
              analysisMethod: 'z_score_analysis',
              statisticalSignificance: Math.abs(zScore)
            }
          })
        }
      }
    } catch (error) {
      console.error(`Error detecting anomalies for ${metric}:`, error)
    }

    return insights
  }

  async analyzeChannelPerformance(): Promise<InsightData[]> {
    const insights: InsightData[] = []

    try {
      // Analyze performance across different data sources by integration
      const integrationData = await prisma.dataPoint.findMany({
        where: {
          organizationId: this.organizationId,
          dateRecorded: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          integration: true
        }
      })

      // Group by integration platform
      const platformSums = integrationData.reduce((acc, point) => {
        const platform = point.integration?.platform || 'unknown'
        if (!acc[platform]) {
          acc[platform] = { totalValue: 0, count: 0 }
        }
        acc[platform].totalValue += Number(point.value)
        acc[platform].count += 1
        return acc
      }, {} as Record<string, { totalValue: number; count: number }>)

      const sources = Object.entries(platformSums).map(([platform, data]) => ({
        source: platform,
        _sum: { value: data.totalValue },
        _count: { id: data.count }
      }))

      if (sources.length > 1) {
        // Find best and worst performing channels
        const channelPerformance = sources.map(source => ({
          source: source.source,
          totalValue: Number(source._sum.value || 0),
          dataPoints: source._count.id
        })).sort((a, b) => b.totalValue - a.totalValue)

        const bestChannel = channelPerformance[0]
        const worstChannel = channelPerformance[channelPerformance.length - 1]

        if (bestChannel.totalValue > worstChannel.totalValue * 2) {
          insights.push({
            id: `channel-performance-${Date.now()}`,
            type: 'opportunity',
            title: `${bestChannel.source} significantly outperforms other channels`,
            description: `Your ${bestChannel.source} integration is generating ${(bestChannel.totalValue / worstChannel.totalValue).toFixed(1)}x more value than ${worstChannel.source}. This suggests a major opportunity for optimization.`,
            recommendation: `Focus more resources on ${bestChannel.source} and analyze why ${worstChannel.source} is underperforming. Consider reallocating budget to the more effective channel.`,
            impactScore: 8,
            confidence: 0.85,
            affectedMetrics: ['channel_performance', 'roi'],
            timeframe: '30 days',
            businessContext: this.getBusinessContext(),
            metadata: {
              dataPoints: sources.reduce((sum, s) => sum + s._count.id, 0),
              analysisMethod: 'channel_comparison',
              statisticalSignificance: 0.85
            }
          })
        }
      }
    } catch (error) {
      console.error('Error analyzing channel performance:', error)
    }

    return insights
  }

  async analyzeCrossPlatformCorrelations(): Promise<InsightData[]> {
    const insights: InsightData[] = []

    try {
      // Analyze correlation between website traffic and sales
      const trafficData = await this.getMetricData('sessions', 30)
      const salesData = await this.getMetricData('revenue', 30)

      if (trafficData.length > 10 && salesData.length > 10) {
        const trafficValues = trafficData.map(d => d.value)
        const salesValues = salesData.map(d => d.value)

        const correlation = StatisticalAnalyzer.calculateCorrelation(trafficValues, salesValues)

        if (Math.abs(correlation) > 0.7) {
          const conversionRate = salesValues.reduce((sum, val) => sum + val, 0) / 
                                trafficValues.reduce((sum, val) => sum + val, 0) * 100

          insights.push({
            id: `correlation-traffic-sales-${Date.now()}`,
            type: 'performance',
            title: `Strong correlation between website traffic and sales`,
            description: `We found a ${correlation > 0 ? 'positive' : 'negative'} correlation (${(correlation * 100).toFixed(1)}%) between your website visitors and sales. Your current conversion rate is ${conversionRate.toFixed(2)}%.`,
            recommendation: correlation > 0 
              ? `Focus on driving more quality traffic to increase sales. Consider investing in SEO, content marketing, or targeted advertising.`
              : `Investigate why increased traffic isn't converting to sales. Review your website user experience, pricing, or product positioning.`,
            impactScore: 7,
            confidence: Math.abs(correlation),
            affectedMetrics: ['traffic', 'conversions', 'revenue'],
            timeframe: '30 days',
            businessContext: this.getBusinessContext(),
            metadata: {
              dataPoints: trafficData.length + salesData.length,
              analysisMethod: 'correlation_analysis',
              statisticalSignificance: Math.abs(correlation)
            }
          })
        }
      }
    } catch (error) {
      console.error('Error analyzing cross-platform correlations:', error)
    }

    return insights
  }

  async generateRecommendations(existingInsights: InsightData[]): Promise<InsightData[]> {
    const recommendations: InsightData[] = []

    try {
      // Analyze patterns in existing insights to generate meta-recommendations
      const trendInsights = existingInsights.filter(i => i.type === 'trend')
      const alertInsights = existingInsights.filter(i => i.type === 'alert')

      // If multiple positive trends, suggest scaling
      if (trendInsights.filter(i => i.title.includes('Growth')).length >= 2) {
        recommendations.push({
          id: `meta-recommendation-scale-${Date.now()}`,
          type: 'opportunity',
          title: 'Multiple growth trends detected - time to scale',
          description: 'You have positive trends across multiple metrics, indicating strong business momentum. This is an optimal time to invest in growth.',
          recommendation: 'Consider increasing marketing spend, expanding product lines, or hiring additional team members to capitalize on this growth momentum.',
          impactScore: 9,
          confidence: 0.8,
          affectedMetrics: ['overall_growth'],
          timeframe: 'Next 3 months',
          businessContext: this.getBusinessContext(),
          metadata: {
            dataPoints: trendInsights.length,
            analysisMethod: 'pattern_recognition',
            statisticalSignificance: 0.8
          }
        })
      }

      // If multiple alerts, suggest comprehensive review
      if (alertInsights.length >= 2) {
        recommendations.push({
          id: `meta-recommendation-review-${Date.now()}`,
          type: 'alert',
          title: 'Multiple performance issues require attention',
          description: 'Several metrics are showing concerning patterns. A comprehensive business review is recommended.',
          recommendation: 'Conduct a thorough analysis of your business operations, customer feedback, and market conditions to identify root causes and develop an action plan.',
          impactScore: 8,
          confidence: 0.9,
          affectedMetrics: ['business_health'],
          timeframe: 'Immediate',
          businessContext: this.getBusinessContext(),
          metadata: {
            dataPoints: alertInsights.length,
            analysisMethod: 'risk_assessment',
            statisticalSignificance: 0.9
          }
        })
      }
    } catch (error) {
      console.error('Error generating recommendations:', error)
    }

    return recommendations
  }

  private async getMetricData(metricType: string, days: number): Promise<MetricData[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    const data = await prisma.dataPoint.findMany({
      where: {
        organizationId: this.organizationId,
        metricType,
        dateRecorded: { gte: startDate }
      },
      include: {
        integration: true
      },
      orderBy: { dateRecorded: 'asc' }
    })

    return data.map(d => ({
      id: d.id,
      value: Number(d.value),
      timestamp: d.dateRecorded,
      source: d.integration?.platform || 'unknown',
      metadata: d.metadata
    }))
  }

  private getBusinessImplication(metric: string, changePercent: number, slope: number): string {
    const implications = {
      revenue: {
        positive: 'your business strategies are working effectively and market demand is strong',
        negative: 'there may be market challenges or internal issues affecting performance'
      },
      orders: {
        positive: 'customer demand is increasing and your products are resonating with the market',
        negative: 'customer acquisition may be declining or product appeal may be waning'
      },
      customers: {
        positive: 'your brand is attracting new customers and market reach is expanding',
        negative: 'customer acquisition efforts may need improvement or market saturation is occurring'
      }
    }

    const direction = changePercent > 0 ? 'positive' : 'negative'
    return implications[metric as keyof typeof implications]?.[direction] || 'requires further investigation'
  }

  private getRecommendation(metric: string, changePercent: number, slope: number): string {
    const recommendations = {
      revenue: {
        positive: 'Increase inventory levels and consider expanding your product line or entering new markets',
        negative: 'Review pricing strategy, analyze customer feedback, and evaluate marketing effectiveness'
      },
      orders: {
        positive: 'Optimize fulfillment processes and consider upselling strategies to maximize this demand',
        negative: 'Improve product positioning, enhance website conversion, and review customer acquisition channels'
      },
      customers: {
        positive: 'Implement retention strategies and loyalty programs to maximize customer lifetime value',
        negative: 'Invest in customer acquisition marketing and review your value proposition'
      }
    }

    const direction = changePercent > 0 ? 'positive' : 'negative'
    return recommendations[metric as keyof typeof recommendations]?.[direction] || 'Monitor closely and gather more data'
  }

  private getAnomalyContext(metric: string, zScore: number, value: any): string {
    if (Math.abs(zScore) >= 3) {
      return 'represents a statistically significant deviation that requires immediate investigation'
    } else if (Math.abs(zScore) >= 2.5) {
      return 'indicates an unusual pattern that should be monitored closely'
    } else {
      return 'suggests a notable variation from normal patterns'
    }
  }

  private getAnomalyRecommendation(metric: string, type: 'spike' | 'drop', severity: 'low' | 'medium' | 'high'): string {
    if (type === 'spike') {
      return severity === 'high' 
        ? 'Investigate the cause immediately - this could indicate data errors, viral content, or exceptional events'
        : 'Monitor closely and try to identify what drove this increase to potentially replicate it'
    } else {
      return severity === 'high'
        ? 'Take immediate action to investigate and address the cause of this significant decline'
        : 'Review recent changes in operations, marketing, or external factors that might explain this decrease'
    }
  }

  private getBusinessContext(): string {
    const industry = this.businessProfile.industry || 'general business'
    const size = this.businessProfile.size || 'small business'
    return `Analysis context: ${size} in ${industry} industry`
  }
}