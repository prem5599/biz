import { StatisticalAnalyzer } from './advanced-insights-engine'
import { BusinessProfile } from './business-intelligence'

export interface ForecastData {
  metric: string
  currentValue: number
  predictedValue: number
  confidence: number
  timeframe: string
  trend: 'increasing' | 'decreasing' | 'stable'
  seasonalAdjustment: number
  scenario: {
    optimistic: number
    realistic: number
    pessimistic: number
  }
}

export interface ForecastInsight {
  id: string
  type: 'forecast' | 'prediction' | 'scenario'
  title: string
  description: string
  recommendation: string
  impactScore: number
  confidence: number
  timeframe: string
  forecastData: ForecastData
}

export class ForecastingEngine {
  /**
   * Generate revenue forecast using multiple methods
   */
  static generateRevenueForecast(
    historicalData: { value: number; timestamp: Date }[],
    businessProfile: BusinessProfile,
    timeframeMonths: number = 3
  ): ForecastData {
    if (historicalData.length < 12) {
      throw new Error('Insufficient data for reliable forecasting (minimum 12 data points required)')
    }

    // Prepare data for analysis
    const values = historicalData.map(d => d.value)
    const timePoints = historicalData.map((d, index) => ({ x: index, y: d.value }))

    // Method 1: Linear regression trend
    const regression = StatisticalAnalyzer.linearRegression(timePoints)
    const linearForecast = regression.slope * (historicalData.length + timeframeMonths * 30) + regression.intercept

    // Method 2: Moving average
    const movingAverage = StatisticalAnalyzer.calculateMovingAverage(values, Math.min(6, values.length))
    const avgForecast = movingAverage[movingAverage.length - 1]

    // Method 3: Exponential smoothing
    const exponentialForecast = this.exponentialSmoothing(values, 0.3, timeframeMonths)

    // Method 4: Seasonal adjustment
    const seasonalForecast = this.applySeasonalAdjustment(
      avgForecast,
      new Date(Date.now() + timeframeMonths * 30 * 24 * 60 * 60 * 1000),
      businessProfile
    )

    // Combine forecasts with weighting
    const combinedForecast = (
      linearForecast * 0.3 +
      avgForecast * 0.25 +
      exponentialForecast * 0.25 +
      seasonalForecast.value * 0.2
    )

    // Calculate confidence based on data consistency and trend strength
    const confidence = Math.min(0.95, Math.max(0.3, 
      regression.rSquared * 0.7 + seasonalForecast.confidence * 0.3
    ))

    // Determine trend
    const recentValues = values.slice(-6)
    const earlyValues = values.slice(0, 6)
    const recentAvg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length
    const earlyAvg = earlyValues.reduce((sum, val) => sum + val, 0) / earlyValues.length
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    const changePercent = ((recentAvg - earlyAvg) / earlyAvg) * 100
    
    if (changePercent > 5) trend = 'increasing'
    else if (changePercent < -5) trend = 'decreasing'

    // Generate scenarios
    const stdDev = StatisticalAnalyzer.calculateStandardDeviation(values)
    const currentValue = values[values.length - 1]

    return {
      metric: 'revenue',
      currentValue,
      predictedValue: combinedForecast,
      confidence,
      timeframe: `${timeframeMonths} months`,
      trend,
      seasonalAdjustment: seasonalForecast.adjustment,
      scenario: {
        optimistic: combinedForecast + stdDev,
        realistic: combinedForecast,
        pessimistic: Math.max(0, combinedForecast - stdDev)
      }
    }
  }

  /**
   * Generate customer growth forecast
   */
  static generateCustomerGrowthForecast(
    historicalData: { value: number; timestamp: Date }[],
    businessProfile: BusinessProfile
  ): ForecastData {
    const values = historicalData.map(d => d.value)
    const currentValue = values[values.length - 1]

    // Calculate growth rate
    const growthRates = []
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] > 0) {
        growthRates.push((values[i] - values[i - 1]) / values[i - 1])
      }
    }

    const avgGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length

    // Apply compound growth
    const predictedValue = currentValue * Math.pow(1 + avgGrowthRate, 3) // 3 months ahead

    // Calculate confidence based on growth consistency
    const growthStdDev = StatisticalAnalyzer.calculateStandardDeviation(growthRates)
    const confidence = Math.max(0.4, 1 - (growthStdDev / Math.abs(avgGrowthRate)))

    const trend = avgGrowthRate > 0.02 ? 'increasing' : avgGrowthRate < -0.02 ? 'decreasing' : 'stable'

    return {
      metric: 'customers',
      currentValue,
      predictedValue,
      confidence,
      timeframe: '3 months',
      trend,
      seasonalAdjustment: 1,
      scenario: {
        optimistic: predictedValue * 1.2,
        realistic: predictedValue,
        pessimistic: predictedValue * 0.8
      }
    }
  }

  /**
   * Generate market opportunity forecast
   */
  static generateMarketOpportunityForecast(
    currentMetrics: Record<string, number>,
    businessProfile: BusinessProfile,
    marketGrowthRate: number = 0.15 // 15% annual growth default
  ): ForecastInsight[] {
    const insights: ForecastInsight[] = []

    // Market size opportunity
    const currentRevenue = currentMetrics.revenue || 0
    const marketOpportunity = currentRevenue * (1 + marketGrowthRate)

    if (marketOpportunity > currentRevenue * 1.1) {
      insights.push({
        id: `market-opportunity-${Date.now()}`,
        type: 'prediction',
        title: 'Market growth opportunity identified',
        description: `Based on current market trends, your addressable market is expected to grow by ${(marketGrowthRate * 100).toFixed(0)}% over the next year, presenting a ${((marketOpportunity - currentRevenue) / 1000).toFixed(0)}K revenue opportunity.`,
        recommendation: 'Prepare for market expansion by improving product capabilities, increasing marketing reach, and optimizing customer acquisition channels.',
        impactScore: 8,
        confidence: 0.7,
        timeframe: '12 months',
        forecastData: {
          metric: 'market_opportunity',
          currentValue: currentRevenue,
          predictedValue: marketOpportunity,
          confidence: 0.7,
          timeframe: '12 months',
          trend: 'increasing',
          seasonalAdjustment: 1,
          scenario: {
            optimistic: marketOpportunity * 1.3,
            realistic: marketOpportunity,
            pessimistic: marketOpportunity * 0.7
          }
        }
      })
    }

    // Customer acquisition scaling opportunity
    const currentCustomers = currentMetrics.customers || 0
    const customerAcquisitionRate = currentMetrics.customer_acquisition_rate || 0.05

    if (customerAcquisitionRate > 0) {
      const scaledCustomers = currentCustomers * (1 + customerAcquisitionRate * 2) // Doubled acquisition
      const additionalRevenue = (scaledCustomers - currentCustomers) * (currentMetrics.avg_order_value || 100)

      insights.push({
        id: `customer-scaling-${Date.now()}`,
        type: 'scenario',
        title: 'Customer acquisition scaling potential',
        description: `If you double your current customer acquisition rate, you could potentially gain ${(scaledCustomers - currentCustomers).toFixed(0)} additional customers, resulting in $${(additionalRevenue / 1000).toFixed(0)}K additional revenue.`,
        recommendation: 'Analyze your most successful acquisition channels and allocate additional budget to scale them effectively.',
        impactScore: 7,
        confidence: 0.6,
        timeframe: '6 months',
        forecastData: {
          metric: 'customer_acquisition',
          currentValue: currentCustomers,
          predictedValue: scaledCustomers,
          confidence: 0.6,
          timeframe: '6 months',
          trend: 'increasing',
          seasonalAdjustment: 1,
          scenario: {
            optimistic: scaledCustomers * 1.2,
            realistic: scaledCustomers,
            pessimistic: scaledCustomers * 0.8
          }
        }
      })
    }

    return insights
  }

  /**
   * Generate risk assessment forecast
   */
  static generateRiskForecast(
    historicalData: Record<string, { value: number; timestamp: Date }[]>,
    businessProfile: BusinessProfile
  ): ForecastInsight[] {
    const risks: ForecastInsight[] = []

    // Revenue concentration risk
    if (historicalData.revenue) {
      const revenueData = historicalData.revenue.map(d => d.value)
      const revenueVolatility = StatisticalAnalyzer.calculateStandardDeviation(revenueData) / 
                               (revenueData.reduce((sum, val) => sum + val, 0) / revenueData.length)

      if (revenueVolatility > 0.3) {
        risks.push({
          id: `revenue-volatility-risk-${Date.now()}`,
          type: 'prediction',
          title: 'High revenue volatility detected',
          description: `Your revenue shows high volatility (${(revenueVolatility * 100).toFixed(0)}% coefficient of variation), which could indicate dependency on a few large customers or seasonal factors.`,
          recommendation: 'Diversify revenue sources, implement customer retention programs, and build more predictable recurring revenue streams.',
          impactScore: 6,
          confidence: 0.8,
          timeframe: 'Ongoing risk',
          forecastData: {
            metric: 'revenue_stability',
            currentValue: revenueVolatility,
            predictedValue: revenueVolatility * 1.1, // Risk may increase
            confidence: 0.8,
            timeframe: '6 months',
            trend: 'increasing',
            seasonalAdjustment: 1,
            scenario: {
              optimistic: revenueVolatility * 0.7,
              realistic: revenueVolatility,
              pessimistic: revenueVolatility * 1.5
            }
          }
        })
      }
    }

    // Customer churn risk (for SaaS businesses)
    if (businessProfile.businessType === 'saas' && historicalData.customers) {
      const customerData = historicalData.customers.map(d => d.value)
      const customerGrowthRates = []
      
      for (let i = 1; i < customerData.length; i++) {
        if (customerData[i - 1] > 0) {
          customerGrowthRates.push((customerData[i] - customerData[i - 1]) / customerData[i - 1])
        }
      }

      const avgGrowthRate = customerGrowthRates.reduce((sum, rate) => sum + rate, 0) / customerGrowthRates.length

      if (avgGrowthRate < -0.02) { // Declining by more than 2% on average
        risks.push({
          id: `customer-churn-risk-${Date.now()}`,
          type: 'prediction',
          title: 'Customer base decline trend detected',
          description: `Your customer base is declining at an average rate of ${(Math.abs(avgGrowthRate) * 100).toFixed(1)}% per period, indicating potential churn issues.`,
          recommendation: 'Implement immediate customer retention initiatives, improve product value proposition, and conduct customer satisfaction surveys.',
          impactScore: 9,
          confidence: 0.85,
          timeframe: 'Immediate attention required',
          forecastData: {
            metric: 'customer_retention_risk',
            currentValue: customerData[customerData.length - 1],
            predictedValue: customerData[customerData.length - 1] * (1 + avgGrowthRate * 3),
            confidence: 0.85,
            timeframe: '3 months',
            trend: 'decreasing',
            seasonalAdjustment: 1,
            scenario: {
              optimistic: customerData[customerData.length - 1] * 1.05,
              realistic: customerData[customerData.length - 1] * (1 + avgGrowthRate * 3),
              pessimistic: customerData[customerData.length - 1] * (1 + avgGrowthRate * 6)
            }
          }
        })
      }
    }

    return risks
  }

  /**
   * Exponential smoothing forecast
   */
  private static exponentialSmoothing(data: number[], alpha: number, periods: number): number {
    let smoothedValue = data[0]
    
    for (let i = 1; i < data.length; i++) {
      smoothedValue = alpha * data[i] + (1 - alpha) * smoothedValue
    }

    // Project forward
    return smoothedValue
  }

  /**
   * Apply seasonal adjustment to forecast
   */
  private static applySeasonalAdjustment(
    baseValue: number,
    targetDate: Date,
    businessProfile: BusinessProfile
  ): { value: number; adjustment: number; confidence: number } {
    const seasonalFactors = businessProfile.seasonalityFactors
    
    if (!seasonalFactors || seasonalFactors.length === 0) {
      return { value: baseValue, adjustment: 1, confidence: 0.5 }
    }

    const targetMonth = targetDate.getMonth() + 1
    const seasonalPattern = seasonalFactors.find(p => p.month === targetMonth)

    if (!seasonalPattern) {
      return { value: baseValue, adjustment: 1, confidence: 0.5 }
    }

    return {
      value: baseValue * seasonalPattern.multiplier,
      adjustment: seasonalPattern.multiplier,
      confidence: seasonalPattern.confidence
    }
  }

  /**
   * Generate comprehensive forecast report
   */
  static async generateForecastReport(
    organizationId: string,
    businessProfile: BusinessProfile
  ): Promise<{
    revenue: ForecastData
    customers: ForecastData
    opportunities: ForecastInsight[]
    risks: ForecastInsight[]
    summary: string
  }> {
    // This would fetch real data in a production environment
    // For now, we'll use mock data structure
    
    const mockRevenueData = Array.from({ length: 24 }, (_, i) => ({
      value: 10000 + Math.random() * 5000 + i * 500,
      timestamp: new Date(Date.now() - (24 - i) * 30 * 24 * 60 * 60 * 1000)
    }))

    const mockCustomerData = Array.from({ length: 24 }, (_, i) => ({
      value: 100 + Math.random() * 50 + i * 5,
      timestamp: new Date(Date.now() - (24 - i) * 30 * 24 * 60 * 60 * 1000)
    }))

    const revenue = this.generateRevenueForecast(mockRevenueData, businessProfile)
    const customers = this.generateCustomerGrowthForecast(mockCustomerData, businessProfile)
    
    const currentMetrics = {
      revenue: mockRevenueData[mockRevenueData.length - 1].value,
      customers: mockCustomerData[mockCustomerData.length - 1].value,
      customer_acquisition_rate: 0.08,
      avg_order_value: 150
    }

    const opportunities = this.generateMarketOpportunityForecast(currentMetrics, businessProfile)
    const risks = this.generateRiskForecast(
      { revenue: mockRevenueData, customers: mockCustomerData },
      businessProfile
    )

    const summary = this.generateForecastSummary(revenue, customers, opportunities, risks)

    return {
      revenue,
      customers,
      opportunities,
      risks,
      summary
    }
  }

  private static generateForecastSummary(
    revenue: ForecastData,
    customers: ForecastData,
    opportunities: ForecastInsight[],
    risks: ForecastInsight[]
  ): string {
    const revenueChange = ((revenue.predictedValue - revenue.currentValue) / revenue.currentValue) * 100
    const customerChange = ((customers.predictedValue - customers.currentValue) / customers.currentValue) * 100

    let summary = `Forecast Summary: `

    if (revenueChange > 10) {
      summary += `Strong revenue growth expected (${revenueChange.toFixed(0)}% increase). `
    } else if (revenueChange < -10) {
      summary += `Revenue decline forecasted (${Math.abs(revenueChange).toFixed(0)}% decrease). `
    } else {
      summary += `Stable revenue trajectory expected. `
    }

    if (customerChange > 5) {
      summary += `Customer base growth anticipated (${customerChange.toFixed(0)}% increase). `
    } else if (customerChange < -5) {
      summary += `Customer base contraction expected (${Math.abs(customerChange).toFixed(0)}% decrease). `
    }

    if (opportunities.length > 0) {
      summary += `${opportunities.length} growth opportunity identified. `
    }

    if (risks.length > 0) {
      summary += `${risks.length} risk factor requiring attention.`
    }

    return summary
  }
}