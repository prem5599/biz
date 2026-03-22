import {
  TrendResult,
  OutlierResult,
  ChannelData,
  ChannelComparison,
  InsightData,
  BusinessContext,
  MetricData,
  SeasonalityResult,
  ForecastData
} from './types'
import { format, differenceInDays } from 'date-fns'

export class LanguageGenerator {
  private businessContext: BusinessContext

  constructor(businessContext: BusinessContext) {
    this.businessContext = businessContext
  }

  generateTrendNarrative(trendData: TrendResult, metricName: string = 'revenue'): string {
    const { direction, strength, changePercent, timeframe, significance } = trendData
    
    // Calculate percentage change
    const percentChange = Math.abs(trendData.slope * 100)
    const isPositive = direction === 'increasing'
    
    // Base narrative components
    const metricDisplay = this.formatMetricName(metricName)
    const directionText = isPositive ? 'increased' : 'decreased'
    const strengthText = this.getStrengthDescription(strength, significance)
    const contextText = this.getBusinessContext(metricName, percentChange, isPositive)
    const actionText = this.generateTrendAction(metricName, isPositive, strength, percentChange)

    // Construct narrative with variation
    const narratives = [
      `Your ${metricDisplay} has ${directionText} by ${percentChange.toFixed(1)}% over the past ${timeframe}. ${strengthText} ${contextText} ${actionText}`,
      
      `There's been a ${strengthText.toLowerCase()} ${directionText.slice(0, -1)}ing trend in ${metricDisplay} - up ${percentChange.toFixed(1)}% in the last ${timeframe}. ${contextText} ${actionText}`,
      
      `${metricDisplay} is ${direction === 'increasing' ? 'climbing' : 'declining'} at a ${strength} pace, with a ${percentChange.toFixed(1)}% change over ${timeframe}. ${contextText} ${actionText}`
    ]

    return this.selectVariation(narratives, metricName)
  }

  generateAnomalyAlert(anomaly: OutlierResult, historicalContext: MetricData[], metricName: string = 'revenue'): string {
    const { severity, value, expectedValue, date, method, confidence } = anomaly
    
    const metricDisplay = this.formatMetricName(metricName)
    const dateText = format(date, 'MMMM d, yyyy')
    const isPositive = value > expectedValue
    const percentDiff = Math.abs(((value - expectedValue) / expectedValue) * 100)
    
    // Severity-based language
    const severityTexts = {
      low: 'notable',
      medium: 'significant',
      high: 'major',
      critical: 'critical'
    }

    const urgencyTexts = {
      low: 'worth monitoring',
      medium: 'requires attention',
      high: 'needs immediate review',
      critical: 'demands urgent action'
    }

    const severityText = severityTexts[severity]
    const urgencyText = urgencyTexts[severity]
    
    // Context from historical data
    const historicalAverage = historicalContext.length > 0 
      ? historicalContext.reduce((sum, d) => sum + d.value, 0) / historicalContext.length
      : expectedValue

    const contextText = this.getAnomalyContext(value, historicalAverage, isPositive, metricName)
    const explanationText = this.getAnomalyExplanation(severity, isPositive, metricName)
    const actionText = this.generateAnomalyAction(severity, isPositive, metricName)

    const narratives = [
      `We detected a ${severityText} ${isPositive ? 'spike' : 'drop'} in ${metricDisplay} on ${dateText}. The value was ${percentDiff.toFixed(1)}% ${isPositive ? 'above' : 'below'} expected levels (${confidence > 0.8 ? 'high confidence' : 'medium confidence'}). ${contextText} ${explanationText} ${actionText}`,
      
      `${metricDisplay} showed an unusual pattern on ${dateText} - ${percentDiff.toFixed(1)}% ${isPositive ? 'higher' : 'lower'} than normal. This ${severityText} anomaly ${urgencyText}. ${contextText} ${actionText}`,
      
      `Alert: ${metricDisplay} on ${dateText} was ${percentDiff.toFixed(1)}% ${isPositive ? 'above' : 'below'} expected (${this.formatCurrency(value)} vs expected ${this.formatCurrency(expectedValue)}). ${explanationText} ${actionText}`
    ]

    return this.selectVariation(narratives, `anomaly_${severity}`)
  }

  generateComparison(channelA: ChannelData, channelB: ChannelData, metric: 'revenue' | 'roi' | 'conversionRate' | 'averageOrderValue' = 'revenue'): string {
    const metricA = channelA[metric] as number
    const metricB = channelB[metric] as number
    
    if (metricA === 0 && metricB === 0) {
      return `Both ${channelA.name} and ${channelB.name} show no ${this.formatMetricName(metric)} data for this period.`
    }

    const winner = metricA > metricB ? channelA : channelB
    const loser = metricA > metricB ? channelB : channelA
    const winnerValue = Math.max(metricA, metricB)
    const loserValue = Math.min(metricA, metricB)
    
    const difference = winnerValue - loserValue
    const percentDifference = loserValue > 0 ? (difference / loserValue) * 100 : 100
    const multiplier = loserValue > 0 ? winnerValue / loserValue : 1

    const metricDisplay = this.formatMetricName(metric)
    const contextText = this.getChannelComparisonContext(winner, loser, metric, percentDifference)
    const recommendationText = this.generateChannelRecommendation(winner, loser, metric, multiplier)

    const narratives = [
      `${winner.name} outperforms ${loser.name} in ${metricDisplay}, generating ${multiplier > 2 ? `${multiplier.toFixed(1)}x more` : `${percentDifference.toFixed(1)}% more`} results. ${contextText} ${recommendationText}`,
      
      `Your ${winner.name} channel is your ${metricDisplay} champion, beating ${loser.name} by ${percentDifference.toFixed(1)}%. ${contextText} ${recommendationText}`,
      
      `${metricDisplay} comparison: ${winner.name} leads with ${this.formatMetricValue(metric, winnerValue)} vs ${loser.name}'s ${this.formatMetricValue(metric, loserValue)} - a ${percentDifference.toFixed(1)}% advantage. ${recommendationText}`
    ]

    return this.selectVariation(narratives, `comparison_${metric}`)
  }

  generateRecommendation(insight: InsightData, businessContext: BusinessContext): string {
    const { type, title, impactScore, confidence, affectedMetrics } = insight
    
    // Impact-based language
    const impactTexts = {
      high: impactScore >= 8 ? 'game-changing' : 'high-impact',
      medium: 'meaningful',
      low: 'incremental'
    }
    
    const impactLevel = impactScore >= 7 ? 'high' : impactScore >= 4 ? 'medium' : 'low'
    const impactText = impactTexts[impactLevel]
    
    // Confidence-based language
    const confidenceText = confidence > 0.8 ? 'highly confident' : confidence > 0.6 ? 'confident' : 'moderately confident'
    
    // Business size appropriate language
    const scaleText = this.getScaleAppropriateLanguage(businessContext.businessSize, impactScore)
    const timeframeText = this.getRecommendationTimeframe(type, impactScore)
    
    const actionText = this.generateActionableSteps(insight, businessContext)
    const expectedOutcome = this.generateExpectedOutcome(insight, businessContext)

    const narratives = [
      `Here's a ${impactText} opportunity: ${title.toLowerCase()}. We're ${confidenceText} this could ${expectedOutcome}. ${scaleText} ${timeframeText} ${actionText}`,
      
      `Recommendation (${impactLevel} impact): ${title}. Based on your data patterns, we ${confidenceText.replace('highly ', '').replace(' confident', '')} expect this to ${expectedOutcome}. ${actionText}`,
      
      `💡 ${title} - This ${impactText} move could ${expectedOutcome}. ${timeframeText} ${actionText}`
    ]

    return this.selectVariation(narratives, `recommendation_${impactLevel}`)
  }

  generateSeasonalNarrative(seasonalData: SeasonalityResult, metricName: string): string {
    const { strength, period, isDetected, nextPeak, nextTrough } = seasonalData
    
    if (!isDetected) {
      return `No clear seasonal patterns detected in your ${this.formatMetricName(metricName)} data. This suggests stable, predictable performance throughout the year.`
    }

    const strengthText = strength > 0.7 ? 'strong' : strength > 0.4 ? 'moderate' : 'weak'
    const periodText = this.formatPeriod(period)
    const metricDisplay = this.formatMetricName(metricName)
    
    let peakText = ''
    if (nextPeak) {
      const daysUntilPeak = differenceInDays(nextPeak, new Date())
      peakText = daysUntilPeak > 0 
        ? `Your next peak is expected around ${format(nextPeak, 'MMMM d')}`
        : `You're currently in a peak period`
    }

    let preparationText = ''
    if (nextPeak && differenceInDays(nextPeak, new Date()) > 0 && differenceInDays(nextPeak, new Date()) < 60) {
      preparationText = this.generateSeasonalPreparation(metricName, nextPeak)
    }

    const narratives = [
      `Your ${metricDisplay} shows ${strengthText} ${periodText} seasonal patterns. ${peakText}. ${preparationText}`,
      
      `We've identified ${strengthText} seasonal trends in your ${metricDisplay} with ${periodText} cycles. ${peakText} ${preparationText}`,
      
      `${metricDisplay} follows predictable seasonal patterns (${strengthText} ${periodText} cycles). ${peakText}. ${preparationText}`
    ]

    return this.selectVariation(narratives, `seasonal_${strengthText}`)
  }

  generateForecastNarrative(forecastData: ForecastData, metricName: string): string {
    const { predictions, method, accuracy, confidence } = forecastData
    
    if (predictions.length === 0) {
      return `Unable to generate reliable forecasts for ${this.formatMetricName(metricName)} based on current data patterns.`
    }

    const nextWeek = predictions.slice(0, 7)
    const avgPrediction = nextWeek.reduce((sum, p) => sum + p.predicted, 0) / nextWeek.length
    const current = predictions[0]?.predicted || 0
    const trend = avgPrediction > current ? 'upward' : avgPrediction < current ? 'downward' : 'stable'
    
    const confidenceText = confidence > 0.8 ? 'high confidence' : confidence > 0.6 ? 'good confidence' : 'moderate confidence'
    const accuracyText = accuracy > 0.8 ? 'highly accurate' : accuracy > 0.6 ? 'reliable' : 'indicative'
    
    const methodText = {
      linear: 'trend analysis',
      seasonal: 'seasonal modeling',
      exponential: 'growth curve analysis',
      arima: 'advanced time series analysis'
    }[method]

    const businessAdvice = this.generateForecastAdvice(trend, avgPrediction, this.businessContext, metricName)

    const narratives = [
      `Based on ${methodText}, we forecast a ${trend} trend in ${this.formatMetricName(metricName)} over the next week (${confidenceText}). ${businessAdvice}`,
      
      `Our ${accuracyText} forecast using ${methodText} predicts ${this.formatMetricName(metricName)} will trend ${trend} in the coming week. ${businessAdvice}`,
      
      `Next 7 days outlook: ${this.formatMetricName(metricName)} expected to ${trend === 'stable' ? 'remain steady' : `trend ${trend}`}. Forecast based on ${methodText} with ${confidenceText}. ${businessAdvice}`
    ]

    return this.selectVariation(narratives, `forecast_${trend}`)
  }

  private formatMetricName(metric: string): string {
    const metricMap: Record<string, string> = {
      revenue: 'revenue',
      orders: 'order volume',
      sessions: 'website visitors',
      conversions: 'conversions',
      customers: 'customer count',
      traffic: 'website traffic',
      roi: 'return on investment',
      conversionRate: 'conversion rate',
      averageOrderValue: 'average order value'
    }
    
    return metricMap[metric] || metric
  }

  private formatCurrency(value: number): string {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(0)}`
  }

  private formatMetricValue(metric: string, value: number): string {
    switch (metric) {
      case 'revenue':
        return this.formatCurrency(value)
      case 'roi':
        return `${value.toFixed(1)}%`
      case 'conversionRate':
        return `${value.toFixed(2)}%`
      case 'averageOrderValue':
        return this.formatCurrency(value)
      default:
        return value.toLocaleString()
    }
  }

  private formatPeriod(days: number): string {
    if (days === 1) return 'daily'
    if (days === 7) return 'weekly'
    if (days === 30 || days === 31) return 'monthly'
    if (days === 90) return 'quarterly'
    if (days === 365) return 'yearly'
    return `${days}-day`
  }

  private getStrengthDescription(strength: string, significance: string): string {
    const combinations = {
      'strong_high': 'This is a robust and statistically significant trend.',
      'strong_medium': 'This represents a strong, reliable pattern.',
      'strong_low': 'While strong, this trend has moderate statistical confidence.',
      'moderate_high': 'This is a statistically significant moderate trend.',
      'moderate_medium': 'This shows a moderate but reliable pattern.',
      'moderate_low': 'This indicates a moderate trend worth monitoring.',
      'weak_high': 'While statistically significant, this trend is relatively weak.',
      'weak_medium': 'This shows a weak but noticeable pattern.',
      'weak_low': 'This represents a weak trend with limited confidence.'
    }
    
    return combinations[`${strength}_${significance}`] || 'This shows an interesting pattern in your data.'
  }

  private getBusinessContext(metricName: string, percentChange: number, isPositive: boolean): string {
    const { businessSize, monthlyRevenue, industry } = this.businessContext
    
    const sizeContext = {
      micro: percentChange > 50 ? 'This kind of growth can be transformational for a business your size.' : 'Even small improvements compound quickly at your stage.',
      small: percentChange > 30 ? 'This level of change can significantly impact your monthly performance.' : 'Steady improvements like this build long-term success.',
      medium: percentChange > 20 ? 'This represents meaningful progress for an established business.' : 'Consistent performance improvements are key to scaling.'
    }

    const industryContext = industry ? ` For ${industry} businesses, ` : ' '
    const baseContext = sizeContext[businessSize]
    
    if (isPositive) {
      return `${industryContext}${baseContext}`
    } else {
      return `${industryContext}${baseContext.replace('growth', 'decline').replace('improvements', 'challenges')}`
    }
  }

  private generateTrendAction(metricName: string, isPositive: boolean, strength: string, percentChange: number): string {
    if (!isPositive) {
      const urgencyActions = {
        revenue: 'Review your marketing channels and consider adjusting your strategy.',
        orders: 'Analyze your conversion funnel and identify potential barriers.',
        sessions: 'Check your SEO performance and marketing campaign effectiveness.',
        customers: 'Focus on customer retention and acquisition strategies.'
      }
      return urgencyActions[metricName as keyof typeof urgencyActions] || 'Monitor this trend closely and consider corrective actions.'
    }

    if (strength === 'strong' && percentChange > 20) {
      const scaleActions = {
        revenue: 'Consider increasing inventory and scaling successful marketing campaigns.',
        orders: 'Ensure your fulfillment capacity can handle increased demand.',
        sessions: 'This is an excellent time to optimize your conversion funnel.',
        customers: 'Focus on retention strategies to maximize customer lifetime value.'
      }
      return scaleActions[metricName as keyof typeof scaleActions] || 'This is an excellent time to scale your successful strategies.'
    }

    return 'Continue monitoring this positive trend and maintain current strategies.'
  }

  private getAnomalyContext(value: number, historicalAverage: number, isPositive: boolean, metricName: string): string {
    const comparison = value / historicalAverage
    
    if (isPositive) {
      if (comparison > 3) return `This is ${comparison.toFixed(1)}x your typical ${metricName}.`
      if (comparison > 2) return `This is more than double your usual ${metricName}.`
      if (comparison > 1.5) return `This is significantly above your normal range.`
      return `This exceeds your usual ${metricName} patterns.`
    } else {
      if (comparison < 0.3) return `This is less than a third of your typical ${metricName}.`
      if (comparison < 0.5) return `This is less than half your usual ${metricName}.`
      if (comparison < 0.7) return `This is notably below your normal range.`
      return `This falls short of your usual ${metricName} patterns.`
    }
  }

  private getAnomalyExplanation(severity: string, isPositive: boolean, metricName: string): string {
    const explanations = {
      critical: isPositive 
        ? 'This could indicate a viral moment, major press coverage, or system error.'
        : 'This might signal a serious issue requiring immediate investigation.',
      high: isPositive
        ? 'This could be due to successful marketing, seasonal factors, or trending content.'
        : 'This may indicate technical issues, market changes, or competitive factors.',
      medium: isPositive
        ? 'This might reflect successful campaigns or positive market conditions.'
        : 'This could be due to temporary factors or changing market conditions.',
      low: 'This variation is within normal business fluctuations but worth noting.'
    }
    
    return explanations[severity] || 'This represents an unusual pattern worth investigating.'
  }

  private generateAnomalyAction(severity: string, isPositive: boolean, metricName: string): string {
    if (isPositive) {
      const positiveActions = {
        critical: 'Verify data accuracy, then capitalize on this momentum if genuine.',
        high: 'Investigate the cause and consider scaling successful elements.',
        medium: 'Monitor closely and try to replicate successful factors.',
        low: 'Keep an eye on this positive deviation.'
      }
      return positiveActions[severity] || 'Monitor this positive change.'
    } else {
      const negativeActions = {
        critical: 'Immediate action required - check systems and investigate causes.',
        high: 'Urgent review needed - identify and address root causes quickly.',
        medium: 'Schedule a review to identify and address contributing factors.',
        low: 'Monitor the situation and track for recurring patterns.'
      }
      return negativeActions[severity] || 'Monitor this negative change.'
    }
  }

  private getChannelComparisonContext(winner: ChannelData, loser: ChannelData, metric: string, percentDifference: number): string {
    if (percentDifference > 200) {
      return `${winner.name} is dramatically outperforming across this metric.`
    }
    if (percentDifference > 100) {
      return `${winner.name} shows substantially better results.`
    }
    if (percentDifference > 50) {
      return `${winner.name} has a clear performance advantage.`
    }
    return `${winner.name} shows moderately better performance.`
  }

  private generateChannelRecommendation(winner: ChannelData, loser: ChannelData, metric: string, multiplier: number): string {
    const { businessSize, monthlyRevenue } = this.businessContext
    
    if (multiplier > 3) {
      return `Consider reallocating significant budget from ${loser.name} to ${winner.name}.`
    }
    if (multiplier > 2) {
      return `Shift 20-30% of your ${loser.name} budget to ${winner.name} for better results.`
    }
    if (multiplier > 1.5) {
      return `Gradually increase investment in ${winner.name} while optimizing ${loser.name}.`
    }
    return `Fine-tune both channels, with slight preference for ${winner.name}.`
  }

  private getScaleAppropriateLanguage(businessSize: string, impactScore: number): string {
    const scaleLanguage = {
      micro: {
        high: 'For a business your size, this could be transformational.',
        medium: 'This represents a meaningful opportunity for growth.',
        low: 'Even small improvements can make a big difference.'
      },
      small: {
        high: 'This could significantly accelerate your growth trajectory.',
        medium: 'This aligns well with your current growth stage.',
        low: 'This incremental improvement supports steady growth.'
      },
      medium: {
        high: 'This strategic move could unlock substantial growth.',
        medium: 'This fits well with scaling your established operations.',
        low: 'This optimization supports continued expansion.'
      }
    }

    const impactLevel = impactScore >= 7 ? 'high' : impactScore >= 4 ? 'medium' : 'low'
    return scaleLanguage[businessSize as keyof typeof scaleLanguage]?.[impactLevel] || 'This recommendation fits your business context.'
  }

  private getRecommendationTimeframe(type: string, impactScore: number): string {
    if (impactScore >= 8) return 'We recommend implementing this within the next 1-2 weeks.'
    if (impactScore >= 6) return 'Plan to implement this within the next 2-4 weeks.'
    if (impactScore >= 4) return 'Consider implementing this within the next month.'
    return 'This can be part of your longer-term optimization efforts.'
  }

  private generateActionableSteps(insight: InsightData, businessContext: BusinessContext): string {
    // This would be enhanced with more specific action templates based on insight type
    const { type, affectedMetrics } = insight
    
    const genericActions = {
      trend: 'Monitor this trend closely and prepare to scale successful strategies.',
      anomaly: 'Investigate the root cause and take appropriate corrective action.',
      performance: 'Focus resources on your best-performing channels.',
      recommendation: 'Start with a small test before full implementation.'
    }

    return genericActions[type] || 'Take action based on this insight to improve performance.'
  }

  private generateExpectedOutcome(insight: InsightData, businessContext: BusinessContext): string {
    const { impactScore, affectedMetrics } = insight
    const primaryMetric = affectedMetrics[0] || 'revenue'
    
    if (impactScore >= 8) {
      return `significantly boost your ${this.formatMetricName(primaryMetric)}`
    }
    if (impactScore >= 6) {
      return `meaningfully improve your ${this.formatMetricName(primaryMetric)}`
    }
    if (impactScore >= 4) {
      return `positively impact your ${this.formatMetricName(primaryMetric)}`
    }
    return `contribute to better ${this.formatMetricName(primaryMetric)}`
  }

  private generateSeasonalPreparation(metricName: string, nextPeak: Date): string {
    const daysUntil = differenceInDays(nextPeak, new Date())
    
    if (daysUntil < 14) {
      return `Start preparing now - increase inventory and marketing spend.`
    }
    if (daysUntil < 30) {
      return `Begin preparation in the next 1-2 weeks to capitalize on the upcoming peak.`
    }
    if (daysUntil < 60) {
      return `Plan your peak season strategy - inventory, staffing, and marketing.`
    }
    return `Use this lead time to optimize your strategy for the coming peak.`
  }

  private generateForecastAdvice(trend: string, avgPrediction: number, businessContext: BusinessContext, metricName: string): string {
    const { businessSize, monthlyRevenue } = businessContext
    
    if (trend === 'upward') {
      return `Prepare for increased demand - consider scaling operations and marketing.`
    }
    if (trend === 'downward') {
      return `Plan for lower volume - focus on efficiency and customer retention.`
    }
    return `Stable outlook allows for strategic planning and optimization.`
  }

  private selectVariation(narratives: string[], context: string): string {
    // Simple hash-based selection for consistency
    const hash = context.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    
    return narratives[Math.abs(hash) % narratives.length]
  }
}