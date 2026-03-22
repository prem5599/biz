import {
  InsightData,
  BusinessMetrics,
  TimeContext,
  ImpactComponents,
  BusinessContext
} from './types'
import { differenceInDays, isWeekend, getMonth } from 'date-fns'

export class ImpactScorer {
  private businessContext: BusinessContext

  constructor(businessContext: BusinessContext) {
    this.businessContext = businessContext
  }

  calculateRevenueImpact(insight: InsightData, businessMetrics: BusinessMetrics): number {
    const { type, affectedMetrics, metadata } = insight
    const { monthlyRevenue, averageOrderValue, conversionRate } = businessMetrics

    let baseImpact = 0

    // Calculate potential revenue impact based on insight type
    switch (type) {
      case 'trend':
        baseImpact = this.calculateTrendRevenueImpact(insight, businessMetrics)
        break
      case 'anomaly':
        baseImpact = this.calculateAnomalyRevenueImpact(insight, businessMetrics)
        break
      case 'performance':
        baseImpact = this.calculatePerformanceRevenueImpact(insight, businessMetrics)
        break
      case 'recommendation':
        baseImpact = this.calculateRecommendationRevenueImpact(insight, businessMetrics)
        break
      case 'alert':
        baseImpact = this.calculateAlertRevenueImpact(insight, businessMetrics)
        break
      default:
        baseImpact = monthlyRevenue * 0.02 // 2% default baseline
    }

    // Apply business size multipliers
    const sizeMultiplier = this.getBusinessSizeMultiplier(this.businessContext.businessSize)
    
    // Apply metric importance weights
    const metricWeight = this.calculateMetricWeight(affectedMetrics)
    
    // Apply confidence adjustment
    const confidenceAdjustment = Math.pow(insight.confidence, 0.5)

    const finalImpact = baseImpact * sizeMultiplier * metricWeight * confidenceAdjustment

    // Normalize to 1-10 scale
    return Math.min(10, Math.max(1, this.normalizeToScale(finalImpact, monthlyRevenue)))
  }

  calculateUrgencyScore(insight: InsightData, timeContext: TimeContext): number {
    const { type, createdAt, metadata } = insight
    const { currentDate, businessCycle, seasonalContext } = timeContext

    let urgencyScore = 5 // Base urgency

    // Type-based urgency
    const typeUrgency = {
      alert: 9,
      anomaly: 8,
      trend: 6,
      performance: 5,
      recommendation: 4
    }
    urgencyScore = typeUrgency[type] || 5

    // Time sensitivity adjustments
    const hoursSinceCreated = (currentDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
    
    if (type === 'alert' || type === 'anomaly') {
      // Alerts and anomalies become less urgent over time
      if (hoursSinceCreated > 24) urgencyScore -= 2
      if (hoursSinceCreated > 72) urgencyScore -= 2
    }

    // Business cycle adjustments
    const cycleAdjustments = {
      peak: 1.3,
      growth: 1.1,
      decline: 1.2,
      recovery: 1.0
    }
    urgencyScore *= cycleAdjustments[businessCycle]

    // Seasonal context adjustments
    const seasonalAdjustments = {
      high_season: 1.2,
      shoulder_season: 1.0,
      low_season: 0.9
    }
    urgencyScore *= seasonalAdjustments[seasonalContext]

    // Competitive events increase urgency
    if (timeContext.competitiveEvents && timeContext.competitiveEvents.length > 0) {
      urgencyScore *= 1.1
    }

    // Market conditions
    const marketAdjustments = {
      favorable: 1.0,
      neutral: 1.0,
      challenging: 1.3
    }
    if (timeContext.marketConditions) {
      urgencyScore *= marketAdjustments[timeContext.marketConditions]
    }

    // Weekend/holiday adjustments for certain types
    if (type === 'alert' && isWeekend(currentDate)) {
      urgencyScore *= 0.8 // Slightly less urgent on weekends
    }

    return Math.min(10, Math.max(1, Math.round(urgencyScore)))
  }

  calculateImplementationScore(recommendation: string, businessContext: BusinessContext): number {
    const { businessSize, monthlyRevenue, primaryChannels } = businessContext
    
    let implementationScore = 5 // Base score

    // Analyze recommendation text for complexity indicators
    const complexityIndicators = this.analyzeRecommendationComplexity(recommendation)
    
    // Technical complexity
    if (complexityIndicators.requiresTechnicalIntegration) {
      implementationScore -= 2
    }
    if (complexityIndicators.requiresNewTools) {
      implementationScore -= 1
    }
    if (complexityIndicators.requiresTeamTraining) {
      implementationScore -= 1
    }

    // Resource requirements
    if (complexityIndicators.requiresHighBudget) {
      const budgetAdjustment = this.getBudgetAdjustment(businessSize, monthlyRevenue)
      implementationScore += budgetAdjustment
    }

    // Time requirements
    if (complexityIndicators.isLongTerm) {
      implementationScore -= 1
    }
    if (complexityIndicators.isImmediate) {
      implementationScore += 2
    }

    // Business size adjustments
    const sizeAdjustments = {
      micro: -1, // Fewer resources available
      small: 0,
      medium: 1  // More resources available
    }
    implementationScore += sizeAdjustments[businessSize]

    // Channel complexity
    if (primaryChannels.length > 3) {
      implementationScore -= 1 // More channels = more complexity
    }

    return Math.min(10, Math.max(1, implementationScore))
  }

  calculateOverallImpact(components: ImpactComponents): number {
    const { revenueImpact, urgencyScore, implementationScore, confidenceLevel } = components
    
    // Weighted combination
    const weights = {
      revenue: 0.40,
      urgency: 0.30,
      implementation: 0.20,
      confidence: 0.10
    }

    const weightedScore = (
      revenueImpact * weights.revenue +
      urgencyScore * weights.urgency +
      implementationScore * weights.implementation +
      (confidenceLevel * 10) * weights.confidence
    )

    // Apply diminishing returns for very high scores
    const adjustedScore = this.applyDiminishingReturns(weightedScore)
    
    return Math.min(10, Math.max(1, Math.round(adjustedScore * 10) / 10))
  }

  calculateInsightPriority(insight: InsightData, businessMetrics: BusinessMetrics, timeContext: TimeContext): {
    overallScore: number
    components: ImpactComponents
    priority: 'critical' | 'high' | 'medium' | 'low'
    reasoning: string
  } {
    const revenueImpact = this.calculateRevenueImpact(insight, businessMetrics)
    const urgencyScore = this.calculateUrgencyScore(insight, timeContext)
    const implementationScore = this.calculateImplementationScore(insight.recommendation, this.businessContext)
    const confidenceLevel = insight.confidence

    const components: ImpactComponents = {
      revenueImpact,
      urgencyScore,
      implementationScore,
      confidenceLevel
    }

    const overallScore = this.calculateOverallImpact(components)
    const priority = this.determinePriority(overallScore, components)
    const reasoning = this.generatePriorityReasoning(insight, components, priority)

    return {
      overallScore,
      components,
      priority,
      reasoning
    }
  }

  private calculateTrendRevenueImpact(insight: InsightData, businessMetrics: BusinessMetrics): number {
    const { monthlyRevenue } = businessMetrics
    const { metadata } = insight
    
    // Extract trend data from metadata
    const trendStrength = metadata?.trendStrength || 'moderate'
    const changePercent = Math.abs(metadata?.changePercent || 10)
    
    let impactMultiplier = 0.05 // 5% baseline
    
    switch (trendStrength) {
      case 'strong':
        impactMultiplier = 0.15
        break
      case 'moderate':
        impactMultiplier = 0.10
        break
      case 'weak':
        impactMultiplier = 0.05
        break
    }
    
    // Scale by change percentage
    const changeAdjustment = Math.min(2, changePercent / 20) // Cap at 2x for 40%+ changes
    
    return monthlyRevenue * impactMultiplier * changeAdjustment
  }

  private calculateAnomalyRevenueImpact(insight: InsightData, businessMetrics: BusinessMetrics): number {
    const { monthlyRevenue } = businessMetrics
    const { metadata } = insight
    
    const severity = metadata?.severity || 'medium'
    const deviationPercent = Math.abs(metadata?.deviationPercent || 20)
    
    const severityMultipliers = {
      critical: 0.25,
      high: 0.15,
      medium: 0.10,
      low: 0.05
    }
    
    const multiplier = severityMultipliers[severity as keyof typeof severityMultipliers] || 0.10
    const deviationAdjustment = Math.min(3, deviationPercent / 30)
    
    return monthlyRevenue * multiplier * deviationAdjustment
  }

  private calculatePerformanceRevenueImpact(insight: InsightData, businessMetrics: BusinessMetrics): number {
    const { monthlyRevenue } = businessMetrics
    const { metadata } = insight
    
    // Performance insights typically involve channel optimization
    const performanceGap = metadata?.performanceGap || 20 // percentage difference
    const channelRevenue = metadata?.channelRevenue || monthlyRevenue * 0.3
    
    // Potential improvement based on closing performance gap
    return channelRevenue * (performanceGap / 100) * 0.5 // 50% success rate assumption
  }

  private calculateRecommendationRevenueImpact(insight: InsightData, businessMetrics: BusinessMetrics): number {
    const { monthlyRevenue, conversionRate } = businessMetrics
    const { metadata } = insight
    
    const expectedImpact = metadata?.expectedImpact || monthlyRevenue * 0.05
    const successProbability = metadata?.successProbability || 0.6
    
    return expectedImpact * successProbability
  }

  private calculateAlertRevenueImpact(insight: InsightData, businessMetrics: BusinessMetrics): number {
    const { monthlyRevenue } = businessMetrics
    const { metadata } = insight
    
    // Alerts typically represent risks or immediate opportunities
    const riskAmount = metadata?.riskAmount || monthlyRevenue * 0.1
    const opportunityAmount = metadata?.opportunityAmount || 0
    
    return Math.max(riskAmount, opportunityAmount)
  }

  private getBusinessSizeMultiplier(businessSize: string): number {
    const multipliers = {
      micro: 1.3,   // Higher relative impact for small businesses
      small: 1.0,
      medium: 0.8   // Lower relative impact for larger businesses
    }
    
    return multipliers[businessSize as keyof typeof multipliers] || 1.0
  }

  private calculateMetricWeight(affectedMetrics: string[]): number {
    const metricWeights = {
      revenue: 1.0,
      orders: 0.8,
      customers: 0.9,
      sessions: 0.6,
      conversions: 0.8,
      traffic: 0.5
    }
    
    if (affectedMetrics.length === 0) return 0.7
    
    const totalWeight = affectedMetrics.reduce((sum, metric) => {
      return sum + (metricWeights[metric as keyof typeof metricWeights] || 0.5)
    }, 0)
    
    return totalWeight / affectedMetrics.length
  }

  private normalizeToScale(impact: number, monthlyRevenue: number): number {
    // Normalize impact to 1-10 scale based on monthly revenue
    const impactPercentage = (impact / monthlyRevenue) * 100
    
    if (impactPercentage >= 50) return 10
    if (impactPercentage >= 25) return 9
    if (impactPercentage >= 15) return 8
    if (impactPercentage >= 10) return 7
    if (impactPercentage >= 7) return 6
    if (impactPercentage >= 5) return 5
    if (impactPercentage >= 3) return 4
    if (impactPercentage >= 2) return 3
    if (impactPercentage >= 1) return 2
    return 1
  }

  private analyzeRecommendationComplexity(recommendation: string): {
    requiresTechnicalIntegration: boolean
    requiresNewTools: boolean
    requiresTeamTraining: boolean
    requiresHighBudget: boolean
    isLongTerm: boolean
    isImmediate: boolean
  } {
    const lowerRec = recommendation.toLowerCase()
    
    return {
      requiresTechnicalIntegration: /integrate|api|technical|system|platform|code/.test(lowerRec),
      requiresNewTools: /new tool|software|platform|service|subscription/.test(lowerRec),
      requiresTeamTraining: /train|learn|skill|educate|workshop/.test(lowerRec),
      requiresHighBudget: /increase.*budget|invest.*\$|spend.*more|hire|purchase/.test(lowerRec),
      isLongTerm: /month|quarter|year|long.term|gradual/.test(lowerRec),
      isImmediate: /immediate|now|today|urgent|quickly|asap/.test(lowerRec)
    }
  }

  private getBudgetAdjustment(businessSize: string, monthlyRevenue: number): number {
    // Adjust implementation difficulty based on budget availability
    const budgetThresholds = {
      micro: 5000,   // $5K monthly revenue
      small: 25000,  // $25K monthly revenue
      medium: 100000 // $100K monthly revenue
    }
    
    const threshold = budgetThresholds[businessSize as keyof typeof budgetThresholds] || 25000
    
    if (monthlyRevenue > threshold * 2) return 2   // Easy to implement with good budget
    if (monthlyRevenue > threshold) return 1       // Manageable
    if (monthlyRevenue > threshold * 0.5) return 0 // Neutral
    return -1 // Difficult with limited budget
  }

  private applyDiminishingReturns(score: number): number {
    // Apply diminishing returns to prevent scores from being too extreme
    if (score <= 7) return score
    
    const excess = score - 7
    const diminishedExcess = excess * 0.7 // Reduce excess by 30%
    
    return 7 + diminishedExcess
  }

  private determinePriority(overallScore: number, components: ImpactComponents): 'critical' | 'high' | 'medium' | 'low' {
    const { urgencyScore, revenueImpact } = components
    
    // Critical: High urgency + high revenue impact, or very high overall score
    if ((urgencyScore >= 8 && revenueImpact >= 7) || overallScore >= 9) {
      return 'critical'
    }
    
    // High: Good overall score or high in key areas
    if (overallScore >= 7 || (urgencyScore >= 7 && revenueImpact >= 6)) {
      return 'high'
    }
    
    // Medium: Moderate scores
    if (overallScore >= 5) {
      return 'medium'
    }
    
    // Low: Everything else
    return 'low'
  }

  private generatePriorityReasoning(
    insight: InsightData,
    components: ImpactComponents,
    priority: 'critical' | 'high' | 'medium' | 'low'
  ): string {
    const { revenueImpact, urgencyScore, implementationScore, confidenceLevel } = components
    
    const reasons: string[] = []
    
    // Revenue impact reasoning
    if (revenueImpact >= 8) {
      reasons.push('high revenue potential')
    } else if (revenueImpact >= 6) {
      reasons.push('significant revenue impact')
    } else if (revenueImpact <= 3) {
      reasons.push('limited revenue impact')
    }
    
    // Urgency reasoning
    if (urgencyScore >= 8) {
      reasons.push('time-sensitive')
    } else if (urgencyScore >= 6) {
      reasons.push('moderately urgent')
    } else if (urgencyScore <= 3) {
      reasons.push('low urgency')
    }
    
    // Implementation reasoning
    if (implementationScore >= 7) {
      reasons.push('easy to implement')
    } else if (implementationScore <= 4) {
      reasons.push('complex implementation')
    }
    
    // Confidence reasoning
    if (confidenceLevel >= 0.8) {
      reasons.push('high confidence')
    } else if (confidenceLevel <= 0.5) {
      reasons.push('uncertain outcome')
    }
    
    // Type-specific reasoning
    if (insight.type === 'alert') {
      reasons.push('requires immediate attention')
    } else if (insight.type === 'anomaly') {
      reasons.push('unusual pattern detected')
    } else if (insight.type === 'trend') {
      reasons.push('trend-based opportunity')
    }
    
    const reasonText = reasons.length > 0 ? reasons.join(', ') : 'balanced factors'
    
    return `Rated ${priority} priority due to ${reasonText}.`
  }

  // Utility method to recalculate impact when business context changes
  recalculateWithNewContext(
    insight: InsightData,
    businessMetrics: BusinessMetrics,
    timeContext: TimeContext,
    newBusinessContext: BusinessContext
  ): {
    overallScore: number
    components: ImpactComponents
    priority: 'critical' | 'high' | 'medium' | 'low'
    reasoning: string
  } {
    const oldContext = this.businessContext
    this.businessContext = newBusinessContext
    
    const result = this.calculateInsightPriority(insight, businessMetrics, timeContext)
    
    // Restore original context
    this.businessContext = oldContext
    
    return result
  }

  // Batch scoring for multiple insights
  scoreInsightsBatch(
    insights: InsightData[],
    businessMetrics: BusinessMetrics,
    timeContext: TimeContext
  ): Array<InsightData & {
    overallScore: number
    components: ImpactComponents
    priority: 'critical' | 'high' | 'medium' | 'low'
    reasoning: string
  }> {
    return insights.map(insight => {
      const scoring = this.calculateInsightPriority(insight, businessMetrics, timeContext)
      
      return {
        ...insight,
        ...scoring
      }
    }).sort((a, b) => b.overallScore - a.overallScore)
  }
}