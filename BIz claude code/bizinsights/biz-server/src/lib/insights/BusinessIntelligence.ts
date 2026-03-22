import {
  ChannelData,
  ChannelRecommendation,
  MetricData,
  CustomerData,
  OrderData,
  OpportunityInsight,
  CustomerInsight,
  SeasonalInsight,
  SeasonalityResult,
  BusinessContext,
  CustomerBehavior,
  DateRange
} from './types'
import { differenceInDays, format, addDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { mean, quantile } from 'd3-array'
import { v4 as uuidv4 } from 'uuid'

export class BusinessIntelligence {
  private businessContext: BusinessContext

  constructor(businessContext: BusinessContext) {
    this.businessContext = businessContext
  }

  analyzeChannelROI(channels: ChannelData[]): ChannelRecommendation[] {
    const recommendations: ChannelRecommendation[] = []
    
    // Filter channels with sufficient data
    const activeChannels = channels.filter(c => c.revenue > 0 && c.sessions > 0)
    
    if (activeChannels.length === 0) return recommendations

    // Calculate performance scores for each channel
    const channelScores = activeChannels.map(channel => ({
      channel: channel.name,
      data: channel,
      roiScore: this.calculateROIScore(channel),
      volumeScore: this.calculateVolumeScore(channel, activeChannels),
      efficiencyScore: this.calculateEfficiencyScore(channel),
      overallScore: 0
    }))

    // Calculate overall scores
    channelScores.forEach(score => {
      score.overallScore = (score.roiScore * 0.4) + (score.volumeScore * 0.3) + (score.efficiencyScore * 0.3)
    })

    // Sort by overall performance
    channelScores.sort((a, b) => b.overallScore - a.overallScore)

    // Generate recommendations based on performance and business context
    channelScores.forEach((score, index) => {
      const recommendation = this.generateChannelRecommendation(
        score,
        index,
        channelScores.length,
        this.businessContext
      )
      if (recommendation) {
        recommendations.push(recommendation)
      }
    })

    return recommendations
  }

  detectGrowthOpportunities(revenueData: MetricData[], customerData: CustomerData[]): OpportunityInsight[] {
    const opportunities: OpportunityInsight[] = []
    
    // Cross-sell opportunities
    const crossSellOpportunity = this.identifyCrossSellOpportunity(customerData)
    if (crossSellOpportunity) opportunities.push(crossSellOpportunity)

    // Upsell opportunities
    const upsellOpportunity = this.identifyUpsellOpportunity(customerData)
    if (upsellOpportunity) opportunities.push(upsellOpportunity)

    // Customer retention opportunities
    const retentionOpportunity = this.identifyRetentionOpportunity(customerData)
    if (retentionOpportunity) opportunities.push(retentionOpportunity)

    // Market expansion opportunities
    const expansionOpportunity = this.identifyExpansionOpportunity(revenueData, customerData)
    if (expansionOpportunity) opportunities.push(expansionOpportunity)

    // Pricing optimization opportunities
    const pricingOpportunity = this.identifyPricingOpportunity(customerData)
    if (pricingOpportunity) opportunities.push(pricingOpportunity)

    return opportunities.sort((a, b) => b.impactScore - a.impactScore)
  }

  analyzeCustomerBehavior(orderData: OrderData[]): CustomerInsight {
    const customerMap = new Map<string, OrderData[]>()
    
    // Group orders by customer
    orderData.forEach(order => {
      if (!customerMap.has(order.customerId)) {
        customerMap.set(order.customerId, [])
      }
      customerMap.get(order.customerId)!.push(order)
    })

    const behaviors: CustomerBehavior[] = []
    const customers = Array.from(customerMap.entries())

    // Analyze purchase frequency
    const purchaseFrequency = this.analyzePurchaseFrequency(customers)
    if (purchaseFrequency) behaviors.push(purchaseFrequency)

    // Analyze seasonal purchasing
    const seasonalBehavior = this.analyzeSeasonalPurchasing(customers)
    if (seasonalBehavior) behaviors.push(seasonalBehavior)

    // Analyze cart abandonment (if data available)
    const cartBehavior = this.analyzeCartBehavior(customers)
    if (cartBehavior) behaviors.push(cartBehavior)

    // Analyze payment preferences
    const paymentBehavior = this.analyzePaymentBehavior(customers)
    if (paymentBehavior) behaviors.push(paymentBehavior)

    // Calculate overall metrics
    const totalRevenue = orderData.reduce((sum, order) => sum + order.totalValue, 0)
    const totalCustomers = customers.length
    const averageOrderValue = totalRevenue / orderData.length
    const repeatCustomers = customers.filter(([_, orders]) => orders.length > 1).length
    const retentionRate = (repeatCustomers / totalCustomers) * 100
    const lifetimeValue = totalRevenue / totalCustomers

    return {
      id: uuidv4(),
      organizationId: this.businessContext.businessSize, // Using as placeholder
      type: 'performance',
      title: 'Customer Behavior Analysis',
      description: this.generateCustomerInsightDescription(behaviors, retentionRate, lifetimeValue),
      recommendation: this.generateCustomerRecommendations(behaviors, retentionRate),
      impactScore: this.calculateCustomerImpactScore(behaviors, retentionRate),
      confidence: 0.8,
      affectedMetrics: ['customers', 'revenue', 'orders'],
      timeframe: '30d',
      dataPoints: orderData.length,
      createdAt: new Date(),
      metadata: {
        source: 'customer_behavior_analysis',
        algorithm: 'behavioral_segmentation',
        version: '1.0',
        parameters: { totalCustomers, totalOrders: orderData.length },
        dataQuality: 0.9
      },
      segment: 'all_customers',
      behaviors,
      retentionRate,
      lifetimeValue,
      recommendations: this.generateDetailedCustomerRecommendations(behaviors, retentionRate)
    }
  }

  generateSeasonalRecommendations(seasonalData: SeasonalityResult, currentDate: Date): SeasonalInsight[] {
    const insights: SeasonalInsight[] = []
    
    if (!seasonalData.isDetected) {
      return insights
    }

    // Generate insights for each detected pattern
    seasonalData.patterns.forEach(pattern => {
      const insight = this.createSeasonalInsight(pattern, seasonalData, currentDate)
      if (insight) {
        insights.push(insight)
      }
    })

    // Add peak preparation insight if upcoming peak
    if (seasonalData.nextPeak) {
      const peakInsight = this.createPeakPreparationInsight(seasonalData.nextPeak, currentDate)
      if (peakInsight) {
        insights.push(peakInsight)
      }
    }

    // Add inventory planning insight
    const inventoryInsight = this.createInventoryPlanningInsight(seasonalData, currentDate)
    if (inventoryInsight) {
      insights.push(inventoryInsight)
    }

    return insights.sort((a, b) => b.impactScore - a.impactScore)
  }

  private calculateROIScore(channel: ChannelData): number {
    if (!channel.roi || channel.roi <= 0) return 0
    
    // ROI score from 0-10, with diminishing returns
    if (channel.roi >= 500) return 10
    if (channel.roi >= 300) return 9
    if (channel.roi >= 200) return 8
    if (channel.roi >= 150) return 7
    if (channel.roi >= 100) return 6
    if (channel.roi >= 50) return 5
    if (channel.roi >= 25) return 4
    if (channel.roi >= 0) return 3
    return 0
  }

  private calculateVolumeScore(channel: ChannelData, allChannels: ChannelData[]): number {
    const totalRevenue = allChannels.reduce((sum, c) => sum + c.revenue, 0)
    const revenueShare = channel.revenue / totalRevenue
    
    // Volume score based on revenue share
    if (revenueShare >= 0.5) return 10
    if (revenueShare >= 0.3) return 8
    if (revenueShare >= 0.2) return 6
    if (revenueShare >= 0.1) return 4
    if (revenueShare >= 0.05) return 2
    return 1
  }

  private calculateEfficiencyScore(channel: ChannelData): number {
    // Efficiency based on conversion rate and AOV
    const conversionScore = Math.min(10, (channel.conversionRate / 5) * 10) // 5% conversion = 10 points
    const aovScore = Math.min(10, (channel.averageOrderValue / 100) * 10) // $100 AOV = 10 points
    
    return (conversionScore + aovScore) / 2
  }

  private generateChannelRecommendation(
    score: any,
    rank: number,
    totalChannels: number,
    businessContext: BusinessContext
  ): ChannelRecommendation | null {
    const { channel, data, overallScore } = score
    
    // Top performer
    if (rank === 0 && overallScore > 7) {
      return {
        channel,
        action: 'increase_budget',
        reason: `${channel} is your top-performing channel with excellent ROI and efficiency`,
        expectedImpact: this.calculateExpectedImpact(data, 'increase', businessContext),
        confidence: 0.9,
        timeframe: 'immediate'
      }
    }

    // Good performer
    if (rank < totalChannels / 2 && overallScore > 5) {
      return {
        channel,
        action: 'optimize',
        reason: `${channel} shows good performance with room for optimization`,
        expectedImpact: this.calculateExpectedImpact(data, 'optimize', businessContext),
        confidence: 0.7,
        timeframe: 'short_term'
      }
    }

    // Poor performer
    if (rank >= totalChannels * 0.8 && overallScore < 3) {
      return {
        channel,
        action: 'decrease_budget',
        reason: `${channel} underperforms compared to other channels`,
        expectedImpact: this.calculateExpectedImpact(data, 'decrease', businessContext),
        confidence: 0.8,
        timeframe: 'immediate'
      }
    }

    // Average performer
    if (overallScore >= 3 && overallScore <= 7) {
      return {
        channel,
        action: 'test',
        reason: `${channel} has potential but needs testing to optimize performance`,
        expectedImpact: this.calculateExpectedImpact(data, 'test', businessContext),
        confidence: 0.6,
        timeframe: 'medium_term'
      }
    }

    return null
  }

  private calculateExpectedImpact(
    channelData: ChannelData,
    action: string,
    businessContext: BusinessContext
  ): number {
    const baseImpact = channelData.revenue * 0.1 // 10% baseline impact
    
    const multipliers = {
      increase_budget: 1.5,
      optimize: 1.2,
      test: 1.1,
      decrease_budget: 0.5
    }

    const sizeMultipliers = {
      micro: 1.2,
      small: 1.0,
      medium: 0.8
    }

    return baseImpact * 
           (multipliers[action as keyof typeof multipliers] || 1) * 
           (sizeMultipliers[businessContext.businessSize] || 1)
  }

  private identifyCrossSellOpportunity(customerData: CustomerData[]): OpportunityInsight | null {
    const singlePurchaseCustomers = customerData.filter(c => c.orderCount === 1)
    
    if (singlePurchaseCustomers.length < customerData.length * 0.3) {
      return null // Not enough single-purchase customers
    }

    const avgOrderValue = mean(customerData.map(c => c.averageOrderValue)) || 0
    const potentialRevenue = singlePurchaseCustomers.length * avgOrderValue * 0.2 // 20% success rate

    return {
      id: uuidv4(),
      organizationId: this.businessContext.businessSize,
      type: 'recommendation',
      title: 'Cross-sell to Single-Purchase Customers',
      description: `${singlePurchaseCustomers.length} customers have made only one purchase. Cross-selling complementary products could increase their lifetime value.`,
      recommendation: 'Launch targeted email campaigns with personalized product recommendations based on their initial purchase.',
      impactScore: Math.min(10, Math.max(3, (potentialRevenue / 1000))),
      confidence: 0.7,
      affectedMetrics: ['revenue', 'customers'],
      timeframe: '30d',
      dataPoints: singlePurchaseCustomers.length,
      createdAt: new Date(),
      metadata: {
        source: 'cross_sell_analysis',
        algorithm: 'behavioral_segmentation',
        version: '1.0',
        parameters: { singlePurchaseCustomers: singlePurchaseCustomers.length },
        dataQuality: 0.8
      },
      opportunityType: 'cross_sell',
      targetSegment: 'single_purchase_customers',
      potentialRevenue,
      implementationSteps: [
        'Segment single-purchase customers',
        'Analyze their purchase patterns',
        'Create personalized product recommendations',
        'Design targeted email campaigns',
        'A/B test different messaging approaches'
      ]
    }
  }

  private identifyUpsellOpportunity(customerData: CustomerData[]): OpportunityInsight | null {
    const lowAOVCustomers = customerData.filter(c => {
      const avgAOV = mean(customerData.map(d => d.averageOrderValue)) || 0
      return c.averageOrderValue < avgAOV * 0.7 && c.orderCount > 1
    })

    if (lowAOVCustomers.length < 5) return null

    const avgAOV = mean(customerData.map(c => c.averageOrderValue)) || 0
    const potentialIncrease = lowAOVCustomers.reduce((sum, c) => {
      return sum + (avgAOV - c.averageOrderValue) * c.orderCount * 0.3
    }, 0)

    return {
      id: uuidv4(),
      organizationId: this.businessContext.businessSize,
      type: 'recommendation',
      title: 'Upsell to Low-AOV Repeat Customers',
      description: `${lowAOVCustomers.length} repeat customers have below-average order values. Upselling could increase revenue per customer.`,
      recommendation: 'Implement bundle offers and premium product suggestions for customers with historically low order values.',
      impactScore: Math.min(10, Math.max(4, (potentialIncrease / 1000))),
      confidence: 0.6,
      affectedMetrics: ['revenue', 'averageOrderValue'],
      timeframe: '60d',
      dataPoints: lowAOVCustomers.length,
      createdAt: new Date(),
      metadata: {
        source: 'upsell_analysis',
        algorithm: 'aov_segmentation',
        version: '1.0',
        parameters: { lowAOVCustomers: lowAOVCustomers.length },
        dataQuality: 0.8
      },
      opportunityType: 'upsell',
      targetSegment: 'low_aov_repeat_customers',
      potentialRevenue: potentialIncrease,
      implementationSteps: [
        'Identify low-AOV repeat customers',
        'Analyze their purchase history',
        'Create bundle offers',
        'Implement product recommendation engine',
        'Test different upsell strategies'
      ]
    }
  }

  private identifyRetentionOpportunity(customerData: CustomerData[]): OpportunityInsight | null {
    const now = new Date()
    const staleCustomers = customerData.filter(c => {
      const daysSinceLastOrder = differenceInDays(now, c.lastOrderDate)
      return daysSinceLastOrder > 60 && c.orderCount > 1
    })

    if (staleCustomers.length < 3) return null

    const potentialRevenue = staleCustomers.reduce((sum, c) => sum + c.lifetimeValue * 0.3, 0)

    return {
      id: uuidv4(),
      organizationId: this.businessContext.businessSize,
      type: 'recommendation',
      title: 'Re-engage Dormant Customers',
      description: `${staleCustomers.length} repeat customers haven't purchased in over 60 days. Win-back campaigns could reactivate them.`,
      recommendation: 'Launch a win-back email campaign with special offers for customers who haven\'t purchased recently.',
      impactScore: Math.min(10, Math.max(5, (potentialRevenue / 1000))),
      confidence: 0.5,
      affectedMetrics: ['revenue', 'customers'],
      timeframe: '30d',
      dataPoints: staleCustomers.length,
      createdAt: new Date(),
      metadata: {
        source: 'retention_analysis',
        algorithm: 'churn_prediction',
        version: '1.0',
        parameters: { staleCustomers: staleCustomers.length },
        dataQuality: 0.7
      },
      opportunityType: 'retention',
      targetSegment: 'dormant_customers',
      potentialRevenue,
      implementationSteps: [
        'Identify dormant customers',
        'Create compelling win-back offers',
        'Design personalized email campaigns',
        'Set up automated follow-up sequences',
        'Track reactivation rates'
      ]
    }
  }

  private identifyExpansionOpportunity(revenueData: MetricData[], customerData: CustomerData[]): OpportunityInsight | null {
    // Look for underutilized channels or time periods
    const revenueBySource = new Map<string, number>()
    revenueData.forEach(data => {
      const current = revenueBySource.get(data.source) || 0
      revenueBySource.set(data.source, current + data.value)
    })

    const sources = Array.from(revenueBySource.entries())
    if (sources.length < 2) return null

    const topSource = sources.reduce((max, current) => current[1] > max[1] ? current : max)
    const underutilizedSources = sources.filter(([source, revenue]) => 
      revenue < topSource[1] * 0.3 && revenue > 0
    )

    if (underutilizedSources.length === 0) return null

    const potentialRevenue = underutilizedSources.reduce((sum, [_, revenue]) => sum + revenue * 2, 0)

    return {
      id: uuidv4(),
      organizationId: this.businessContext.businessSize,
      type: 'recommendation',
      title: 'Expand Underutilized Channels',
      description: `You have ${underutilizedSources.length} channels with growth potential. Expanding these could diversify and increase revenue.`,
      recommendation: 'Increase investment in underperforming channels that show initial traction.',
      impactScore: Math.min(10, Math.max(4, (potentialRevenue / 10000))),
      confidence: 0.6,
      affectedMetrics: ['revenue', 'channels'],
      timeframe: '90d',
      dataPoints: underutilizedSources.length,
      createdAt: new Date(),
      metadata: {
        source: 'expansion_analysis',
        algorithm: 'channel_gap_analysis',
        version: '1.0',
        parameters: { underutilizedChannels: underutilizedSources.length },
        dataQuality: 0.8
      },
      opportunityType: 'acquisition',
      targetSegment: 'new_channels',
      potentialRevenue,
      implementationSteps: [
        'Analyze underperforming channels',
        'Identify success factors from top channels',
        'Develop channel-specific strategies',
        'Gradually increase investment',
        'Monitor performance improvements'
      ]
    }
  }

  private identifyPricingOpportunity(customerData: CustomerData[]): OpportunityInsight | null {
    const aovValues = customerData.map(c => c.averageOrderValue).filter(aov => aov > 0)
    if (aovValues.length < 10) return null

    const q25 = quantile(aovValues.sort((a, b) => a - b), 0.25) || 0
    const q75 = quantile(aovValues.sort((a, b) => a - b), 0.75) || 0
    const avgAOV = mean(aovValues) || 0

    // Look for pricing optimization opportunity
    const lowSpenders = customerData.filter(c => c.averageOrderValue < q25 && c.orderCount > 2)
    const highSpenders = customerData.filter(c => c.averageOrderValue > q75)

    if (highSpenders.length > lowSpenders.length * 0.5) {
      // Many customers willing to pay premium prices
      const potentialRevenue = lowSpenders.length * (avgAOV - q25) * 0.2

      return {
        id: uuidv4(),
        organizationId: this.businessContext.businessSize,
        type: 'recommendation',
        title: 'Pricing Optimization Opportunity',
        description: `Your customer base shows willingness to pay premium prices. Consider introducing higher-value options.`,
        recommendation: 'Test premium product tiers or bundle pricing to capture more value from price-sensitive segments.',
        impactScore: Math.min(10, Math.max(3, (potentialRevenue / 1000))),
        confidence: 0.4,
        affectedMetrics: ['revenue', 'averageOrderValue'],
        timeframe: '90d',
        dataPoints: customerData.length,
        createdAt: new Date(),
        metadata: {
          source: 'pricing_analysis',
          algorithm: 'price_sensitivity_analysis',
          version: '1.0',
          parameters: { q25, q75, avgAOV },
          dataQuality: 0.7
        },
        opportunityType: 'optimization',
        targetSegment: 'price_optimization',
        potentialRevenue,
        implementationSteps: [
          'Analyze customer price sensitivity',
          'Create premium product offerings',
          'Test bundle pricing strategies',
          'Monitor price elasticity',
          'Optimize pricing tiers'
        ]
      }
    }

    return null
  }

  private analyzePurchaseFrequency(customers: [string, OrderData[]][]): CustomerBehavior | null {
    const frequencies = customers.map(([_, orders]) => {
      if (orders.length <= 1) return 0
      const firstOrder = orders.reduce((min, order) => order.orderDate < min ? order.orderDate : min, orders[0].orderDate)
      const lastOrder = orders.reduce((max, order) => order.orderDate > max ? order.orderDate : max, orders[0].orderDate)
      const daysBetween = differenceInDays(lastOrder, firstOrder)
      return daysBetween > 0 ? orders.length / (daysBetween / 30) : 0 // Orders per month
    }).filter(f => f > 0)

    if (frequencies.length === 0) return null

    const avgFrequency = mean(frequencies) || 0
    const trend = this.calculateFrequencyTrend(customers)

    return {
      behavior: 'purchase_frequency',
      frequency: avgFrequency,
      impact: avgFrequency > 2 ? 'positive' : avgFrequency > 1 ? 'neutral' : 'negative',
      trend
    }
  }

  private analyzeSeasonalPurchasing(customers: [string, OrderData[]][]): CustomerBehavior | null {
    const monthlyPurchases = new Map<number, number>()
    
    customers.forEach(([_, orders]) => {
      orders.forEach(order => {
        const month = order.orderDate.getMonth()
        monthlyPurchases.set(month, (monthlyPurchases.get(month) || 0) + 1)
      })
    })

    if (monthlyPurchases.size < 3) return null

    const values = Array.from(monthlyPurchases.values())
    const maxPurchases = Math.max(...values)
    const minPurchases = Math.min(...values)
    const seasonalVariation = (maxPurchases - minPurchases) / maxPurchases

    return {
      behavior: 'seasonal_purchasing',
      frequency: seasonalVariation,
      impact: seasonalVariation > 0.5 ? 'positive' : 'neutral',
      trend: 'stable'
    }
  }

  private analyzeCartBehavior(customers: [string, OrderData[]][]): CustomerBehavior | null {
    // This would require cart data - simplified implementation
    const avgItemsPerOrder = customers.reduce((sum, [_, orders]) => {
      const totalItems = orders.reduce((itemSum, order) => itemSum + order.itemCount, 0)
      return sum + (totalItems / orders.length)
    }, 0) / customers.length

    return {
      behavior: 'cart_composition',
      frequency: avgItemsPerOrder,
      impact: avgItemsPerOrder > 3 ? 'positive' : avgItemsPerOrder > 1.5 ? 'neutral' : 'negative',
      trend: 'stable'
    }
  }

  private analyzePaymentBehavior(customers: [string, OrderData[]][]): CustomerBehavior | null {
    const paymentMethods = new Map<string, number>()
    
    customers.forEach(([_, orders]) => {
      orders.forEach(order => {
        if (order.paymentMethod) {
          paymentMethods.set(order.paymentMethod, (paymentMethods.get(order.paymentMethod) || 0) + 1)
        }
      })
    })

    if (paymentMethods.size === 0) return null

    const totalPayments = Array.from(paymentMethods.values()).reduce((sum, count) => sum + count, 0)
    const diversity = paymentMethods.size / totalPayments

    return {
      behavior: 'payment_diversity',
      frequency: diversity,
      impact: diversity > 0.3 ? 'positive' : 'neutral',
      trend: 'stable'
    }
  }

  private calculateFrequencyTrend(customers: [string, OrderData[]][]): 'increasing' | 'decreasing' | 'stable' {
    // Simplified trend calculation - would need more sophisticated time series analysis
    const recentCustomers = customers.filter(([_, orders]) => {
      const latestOrder = orders.reduce((max, order) => order.orderDate > max ? order.orderDate : max, orders[0].orderDate)
      return differenceInDays(new Date(), latestOrder) < 30
    })

    const recentFrequency = recentCustomers.length / customers.length
    
    if (recentFrequency > 0.7) return 'increasing'
    if (recentFrequency < 0.3) return 'decreasing'
    return 'stable'
  }

  private generateCustomerInsightDescription(
    behaviors: CustomerBehavior[],
    retentionRate: number,
    lifetimeValue: number
  ): string {
    const retentionText = retentionRate > 50 ? 'strong' : retentionRate > 30 ? 'moderate' : 'low'
    const ltvText = lifetimeValue > 500 ? 'high' : lifetimeValue > 200 ? 'moderate' : 'developing'
    
    return `Your customers show ${retentionText} retention patterns with ${ltvText} lifetime values. Key behaviors include ${behaviors.map(b => b.behavior).join(', ')}.`
  }

  private generateCustomerRecommendations(behaviors: CustomerBehavior[], retentionRate: number): string {
    if (retentionRate < 30) {
      return 'Focus on improving customer retention through better onboarding and engagement campaigns.'
    }
    if (retentionRate > 70) {
      return 'Your retention is strong - focus on increasing purchase frequency and average order value.'
    }
    return 'Balance retention improvements with strategies to increase customer lifetime value.'
  }

  private calculateCustomerImpactScore(behaviors: CustomerBehavior[], retentionRate: number): number {
    const retentionScore = Math.min(10, retentionRate / 10)
    const behaviorScore = behaviors.filter(b => b.impact === 'positive').length * 2
    
    return Math.min(10, Math.max(3, retentionScore + behaviorScore))
  }

  private generateDetailedCustomerRecommendations(behaviors: CustomerBehavior[], retentionRate: number): string[] {
    const recommendations: string[] = []
    
    if (retentionRate < 50) {
      recommendations.push('Implement customer loyalty program')
      recommendations.push('Improve post-purchase communication')
      recommendations.push('Create targeted win-back campaigns')
    }

    behaviors.forEach(behavior => {
      if (behavior.impact === 'negative') {
        switch (behavior.behavior) {
          case 'purchase_frequency':
            recommendations.push('Increase email marketing frequency')
            recommendations.push('Create subscription or auto-replenishment options')
            break
          case 'cart_composition':
            recommendations.push('Implement cross-sell recommendations')
            recommendations.push('Create product bundles')
            break
        }
      }
    })

    return recommendations
  }

  private createSeasonalInsight(
    pattern: any,
    seasonalData: SeasonalityResult,
    currentDate: Date
  ): SeasonalInsight | null {
    const seasonName = this.getSeasonName(pattern.period, currentDate)
    
    return {
      id: uuidv4(),
      organizationId: this.businessContext.businessSize,
      type: 'trend',
      title: `${pattern.period.charAt(0).toUpperCase() + pattern.period.slice(1)} Seasonal Pattern Detected`,
      description: `Your business shows ${pattern.strength > 0.5 ? 'strong' : 'moderate'} ${pattern.period} seasonal patterns.`,
      recommendation: `Plan inventory and marketing campaigns around your ${pattern.period} cycles.`,
      impactScore: Math.min(10, Math.max(4, pattern.strength * 10)),
      confidence: seasonalData.confidence,
      affectedMetrics: ['revenue', 'orders'],
      timeframe: pattern.period,
      dataPoints: 30,
      createdAt: new Date(),
      metadata: {
        source: 'seasonal_analysis',
        algorithm: 'seasonal_decomposition',
        version: '1.0',
        parameters: { pattern: pattern.period, strength: pattern.strength },
        dataQuality: 0.8
      },
      season: seasonName,
      historicalPattern: seasonalData,
      preparationSteps: this.generateSeasonalPreparationSteps(pattern.period),
      inventoryRecommendations: this.generateInventoryRecommendations(pattern),
      marketingRecommendations: this.generateMarketingRecommendations(pattern)
    }
  }

  private createPeakPreparationInsight(nextPeak: Date, currentDate: Date): SeasonalInsight | null {
    const daysUntilPeak = differenceInDays(nextPeak, currentDate)
    
    if (daysUntilPeak < 0 || daysUntilPeak > 90) return null

    return {
      id: uuidv4(),
      organizationId: this.businessContext.businessSize,
      type: 'trend',
      title: 'Upcoming Peak Season Preparation',
      description: `Your next peak period is expected around ${format(nextPeak, 'MMMM d')} - ${daysUntilPeak} days away.`,
      recommendation: 'Begin preparation now to maximize peak season performance.',
      impactScore: Math.max(6, Math.min(10, 10 - (daysUntilPeak / 30))),
      confidence: 0.7,
      affectedMetrics: ['revenue', 'orders', 'inventory'],
      timeframe: `${daysUntilPeak}d`,
      dataPoints: 30,
      createdAt: new Date(),
      metadata: {
        source: 'peak_preparation',
        algorithm: 'seasonal_forecasting',
        version: '1.0',
        parameters: { daysUntilPeak },
        dataQuality: 0.8
      },
      season: this.getSeasonName('monthly', nextPeak),
      historicalPattern: { isDetected: true, period: 30, strength: 0.7, confidence: 0.7, patterns: [] },
      preparationSteps: this.generatePeakPreparationSteps(daysUntilPeak),
      inventoryRecommendations: this.generatePeakInventoryRecommendations(daysUntilPeak),
      marketingRecommendations: this.generatePeakMarketingRecommendations(daysUntilPeak)
    }
  }

  private createInventoryPlanningInsight(seasonalData: SeasonalityResult, currentDate: Date): SeasonalInsight | null {
    if (!this.businessContext.primaryChannels.includes('shopify')) return null

    return {
      id: uuidv4(),
      organizationId: this.businessContext.businessSize,
      type: 'trend',
      title: 'Seasonal Inventory Planning',
      description: 'Your seasonal patterns suggest specific inventory management strategies.',
      recommendation: 'Align inventory levels with predicted seasonal demand patterns.',
      impactScore: 6,
      confidence: seasonalData.confidence,
      affectedMetrics: ['inventory', 'revenue'],
      timeframe: 'seasonal',
      dataPoints: 30,
      createdAt: new Date(),
      metadata: {
        source: 'inventory_planning',
        algorithm: 'seasonal_inventory_optimization',
        version: '1.0',
        parameters: { seasonalStrength: seasonalData.strength },
        dataQuality: 0.8
      },
      season: 'all_seasons',
      historicalPattern: seasonalData,
      preparationSteps: this.generateInventoryPlanningSteps(),
      inventoryRecommendations: this.generateDetailedInventoryRecommendations(seasonalData),
      marketingRecommendations: []
    }
  }

  private getSeasonName(period: string, date: Date): string {
    const month = date.getMonth()
    const seasons = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'fall', 'fall', 'fall', 'winter']
    return seasons[month]
  }

  private generateSeasonalPreparationSteps(period: string): string[] {
    const steps = {
      daily: ['Monitor daily performance patterns', 'Adjust staffing for peak hours'],
      weekly: ['Plan weekly promotions', 'Optimize weekend operations'],
      monthly: ['Prepare monthly inventory forecasts', 'Plan seasonal marketing campaigns'],
      yearly: ['Develop annual strategic plans', 'Prepare for major seasonal events']
    }
    
    return steps[period as keyof typeof steps] || ['Monitor seasonal patterns', 'Prepare accordingly']
  }

  private generateInventoryRecommendations(pattern: any): string[] {
    return [
      `Stock up ${Math.round(pattern.strength * 50)}% more inventory before peak periods`,
      'Implement just-in-time ordering for non-peak periods',
      'Monitor inventory turnover rates during seasonal transitions'
    ]
  }

  private generateMarketingRecommendations(pattern: any): string[] {
    return [
      `Increase marketing spend by ${Math.round(pattern.strength * 30)}% during peak periods`,
      'Create seasonal content and campaigns',
      'Adjust ad targeting based on seasonal behavior patterns'
    ]
  }

  private generatePeakPreparationSteps(daysUntilPeak: number): string[] {
    if (daysUntilPeak < 14) {
      return ['Final inventory check', 'Brief team on peak procedures', 'Activate peak marketing campaigns']
    }
    if (daysUntilPeak < 30) {
      return ['Order peak inventory', 'Prepare marketing materials', 'Schedule additional support staff']
    }
    return ['Analyze last year\'s peak performance', 'Plan inventory orders', 'Develop peak season strategy']
  }

  private generatePeakInventoryRecommendations(daysUntilPeak: number): string[] {
    if (daysUntilPeak < 21) {
      return ['Ensure adequate stock levels', 'Arrange backup suppliers']
    }
    return ['Place inventory orders now', 'Negotiate better terms with suppliers', 'Plan storage capacity']
  }

  private generatePeakMarketingRecommendations(daysUntilPeak: number): string[] {
    if (daysUntilPeak < 14) {
      return ['Launch peak campaigns', 'Increase ad budgets', 'Send early bird promotions']
    }
    return ['Prepare creative assets', 'Plan campaign timeline', 'Book advertising inventory']
  }

  private generateInventoryPlanningSteps(): string[] {
    return [
      'Analyze seasonal demand patterns',
      'Calculate safety stock levels',
      'Implement seasonal ordering schedules',
      'Monitor inventory turnover by season'
    ]
  }

  private generateDetailedInventoryRecommendations(seasonalData: SeasonalityResult): string[] {
    const strength = seasonalData.strength
    
    return [
      `Maintain ${Math.round(strength * 20 + 10)}% buffer stock during peak predictions`,
      'Implement seasonal ABC analysis for product categorization',
      'Use seasonal forecasting for automatic reorder points',
      'Plan clearance sales for end of seasonal cycles'
    ]
  }
}