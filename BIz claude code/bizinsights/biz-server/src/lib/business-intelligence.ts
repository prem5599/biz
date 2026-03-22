import { prisma } from './prisma'

// Business Intelligence and Personalization Engine
export interface IndustryBenchmark {
  industry: string
  metric: string
  percentile25: number
  percentile50: number
  percentile75: number
  percentile90: number
  sampleSize: number
}

export interface SeasonalPattern {
  month: number
  multiplier: number
  confidence: number
}

export interface BusinessProfile {
  organizationId: string
  industry?: string
  businessType?: 'ecommerce' | 'saas' | 'services' | 'retail' | 'b2b'
  size?: 'startup' | 'small' | 'medium' | 'large'
  geographicMarkets?: string[]
  foundedYear?: number
  employeeCount?: number
  primaryRevenueSources?: string[]
  targetCustomerSegments?: string[]
  seasonalityFactors?: SeasonalPattern[]
  competitiveLandscape?: 'high' | 'medium' | 'low'
  growthStage?: 'early' | 'growth' | 'mature' | 'declining'
  technologyAdoption?: 'early' | 'mainstream' | 'laggard'
}

export interface UserPreferences {
  userId: string
  preferredInsightTypes: string[]
  complexityLevel: 'basic' | 'intermediate' | 'advanced'
  communicationStyle: 'formal' | 'casual' | 'technical'
  focusAreas: string[]
  notificationFrequency: 'real_time' | 'daily' | 'weekly'
  insightHistory: {
    viewed: string[]
    acted_upon: string[]
    dismissed: string[]
    rated: { insightId: string; rating: number }[]
  }
}

export class BusinessIntelligenceEngine {
  private static readonly INDUSTRY_BENCHMARKS: Record<string, Record<string, IndustryBenchmark>> = {
    ecommerce: {
      conversion_rate: {
        industry: 'ecommerce',
        metric: 'conversion_rate',
        percentile25: 1.2,
        percentile50: 2.5,
        percentile75: 4.1,
        percentile90: 6.8,
        sampleSize: 1000
      },
      avg_order_value: {
        industry: 'ecommerce',
        metric: 'avg_order_value',
        percentile25: 45,
        percentile50: 78,
        percentile75: 125,
        percentile90: 200,
        sampleSize: 1000
      },
      cart_abandonment: {
        industry: 'ecommerce',
        metric: 'cart_abandonment',
        percentile25: 60,
        percentile50: 70,
        percentile75: 78,
        percentile90: 85,
        sampleSize: 1000
      }
    },
    saas: {
      monthly_churn_rate: {
        industry: 'saas',
        metric: 'monthly_churn_rate',
        percentile25: 3,
        percentile50: 5,
        percentile75: 8,
        percentile90: 12,
        sampleSize: 500
      },
      customer_acquisition_cost: {
        industry: 'saas',
        metric: 'customer_acquisition_cost',
        percentile25: 120,
        percentile50: 250,
        percentile75: 450,
        percentile90: 800,
        sampleSize: 500
      },
      lifetime_value: {
        industry: 'saas',
        metric: 'lifetime_value',
        percentile25: 600,
        percentile50: 1200,
        percentile75: 2400,
        percentile90: 4800,
        sampleSize: 500
      }
    }
  }

  private static readonly SEASONAL_PATTERNS: Record<string, SeasonalPattern[]> = {
    retail: [
      { month: 1, multiplier: 0.7, confidence: 0.9 },   // Post-holiday slump
      { month: 2, multiplier: 0.8, confidence: 0.85 },  // February low
      { month: 3, multiplier: 0.95, confidence: 0.8 },  // Spring pickup
      { month: 4, multiplier: 1.0, confidence: 0.75 },  // Normal
      { month: 5, multiplier: 1.1, confidence: 0.8 },   // Mother's Day
      { month: 6, multiplier: 1.05, confidence: 0.75 }, // Summer start
      { month: 7, multiplier: 0.9, confidence: 0.8 },   // Summer lull
      { month: 8, multiplier: 1.1, confidence: 0.85 },  // Back to school
      { month: 9, multiplier: 1.0, confidence: 0.75 },  // Normal
      { month: 10, multiplier: 1.2, confidence: 0.9 },  // Halloween/Pre-holiday
      { month: 11, multiplier: 1.8, confidence: 0.95 }, // Black Friday
      { month: 12, multiplier: 1.6, confidence: 0.95 }  // Christmas
    ],
    ecommerce: [
      { month: 1, multiplier: 0.75, confidence: 0.9 },
      { month: 2, multiplier: 0.85, confidence: 0.85 },
      { month: 3, multiplier: 0.95, confidence: 0.8 },
      { month: 4, multiplier: 1.0, confidence: 0.75 },
      { month: 5, multiplier: 1.1, confidence: 0.8 },
      { month: 6, multiplier: 1.05, confidence: 0.75 },
      { month: 7, multiplier: 1.1, confidence: 0.8 },
      { month: 8, multiplier: 1.0, confidence: 0.75 },
      { month: 9, multiplier: 1.0, confidence: 0.75 },
      { month: 10, multiplier: 1.15, confidence: 0.85 },
      { month: 11, multiplier: 1.5, confidence: 0.95 },
      { month: 12, multiplier: 1.4, confidence: 0.95 }
    ]
  }

  static async getBusinessProfile(organizationId: string): Promise<BusinessProfile> {
    try {
      // Try to get from organization settings first
      const orgSettings = await prisma.organizationSettings.findUnique({
        where: { organizationId }
      })

      if (orgSettings?.settings && typeof orgSettings.settings === 'object') {
        const settings = orgSettings.settings as any
        if (settings.businessProfile) {
          return { organizationId, ...settings.businessProfile }
        }
      }

      // If no profile exists, try to infer from integrations and data
      return await this.inferBusinessProfile(organizationId)
    } catch (error) {
      console.error('Error getting business profile:', error)
      return { organizationId }
    }
  }

  static async inferBusinessProfile(organizationId: string): Promise<BusinessProfile> {
    try {
      const integrations = await prisma.integration.findMany({
        where: { organizationId }
      })

      const profile: BusinessProfile = { organizationId }

      // Infer business type from integrations
      const hasShopify = integrations.some(i => i.platform === 'SHOPIFY')
      const hasWooCommerce = integrations.some(i => i.platform === 'WOOCOMMERCE')
      const hasStripe = integrations.some(i => i.platform === 'STRIPE')
      const hasFacebookAds = integrations.some(i => i.platform === 'FACEBOOK_ADS')

      if (hasShopify || hasWooCommerce) {
        profile.businessType = 'ecommerce'
        profile.industry = 'retail'
      } else if (hasStripe && !hasShopify && !hasWooCommerce) {
        profile.businessType = 'saas'
        profile.industry = 'technology'
      }

      // Infer size from revenue data
      const recentRevenue = await prisma.dataPoint.aggregate({
        where: {
          organizationId,
          metricType: 'revenue',
          dateRecorded: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        _sum: { value: true }
      })

      const monthlyRevenue = Number(recentRevenue._sum.value || 0)
      if (monthlyRevenue > 100000) profile.size = 'large'
      else if (monthlyRevenue > 25000) profile.size = 'medium'
      else if (monthlyRevenue > 5000) profile.size = 'small'
      else profile.size = 'startup'

      // Add seasonal patterns if we can identify the business type
      if (profile.businessType && this.SEASONAL_PATTERNS[profile.businessType]) {
        profile.seasonalityFactors = this.SEASONAL_PATTERNS[profile.businessType]
      }

      // Save inferred profile
      await this.saveBusinessProfile(organizationId, profile)

      return profile
    } catch (error) {
      console.error('Error inferring business profile:', error)
      return { organizationId }
    }
  }

  static async saveBusinessProfile(organizationId: string, profile: BusinessProfile): Promise<void> {
    try {
      await prisma.organizationSettings.upsert({
        where: { organizationId },
        update: {
          settings: {
            businessProfile: profile
          }
        },
        create: {
          organizationId,
          settings: {
            businessProfile: profile
          }
        }
      })
    } catch (error) {
      console.error('Error saving business profile:', error)
    }
  }

  static getBenchmarkComparison(
    metric: string,
    value: number,
    businessProfile: BusinessProfile
  ): {
    percentile: number
    performance: 'poor' | 'below_average' | 'average' | 'good' | 'excellent'
    comparison: string
  } {
    const industry = businessProfile.industry || businessProfile.businessType || 'general'
    const benchmark = this.INDUSTRY_BENCHMARKS[industry]?.[metric]

    if (!benchmark) {
      return {
        percentile: 50,
        performance: 'average',
        comparison: 'Industry benchmarks not available for this metric'
      }
    }

    let percentile = 50
    let performance: 'poor' | 'below_average' | 'average' | 'good' | 'excellent' = 'average'

    if (value >= benchmark.percentile90) {
      percentile = 90
      performance = 'excellent'
    } else if (value >= benchmark.percentile75) {
      percentile = 75
      performance = 'good'
    } else if (value >= benchmark.percentile50) {
      percentile = 50
      performance = 'average'
    } else if (value >= benchmark.percentile25) {
      percentile = 25
      performance = 'below_average'
    } else {
      percentile = 10
      performance = 'poor'
    }

    const comparison = this.generateBenchmarkComparison(metric, value, benchmark, performance)

    return { percentile, performance, comparison }
  }

  private static generateBenchmarkComparison(
    metric: string,
    value: number,
    benchmark: IndustryBenchmark,
    performance: string
  ): string {
    const metricName = metric.replace(/_/g, ' ')
    
    switch (performance) {
      case 'excellent':
        return `Your ${metricName} of ${value} is in the top 10% of ${benchmark.industry} businesses. This is exceptional performance.`
      case 'good':
        return `Your ${metricName} of ${value} is above average for ${benchmark.industry} businesses, ranking in the top 25%.`
      case 'average':
        return `Your ${metricName} of ${value} is typical for ${benchmark.industry} businesses, around the industry median.`
      case 'below_average':
        return `Your ${metricName} of ${value} is below the industry average for ${benchmark.industry} businesses. There's room for improvement.`
      case 'poor':
        return `Your ${metricName} of ${value} is significantly below industry standards for ${benchmark.industry} businesses. This requires immediate attention.`
      default:
        return `Your ${metricName} is ${value}.`
    }
  }

  static adjustForSeasonality(
    value: number,
    metric: string,
    date: Date,
    businessProfile: BusinessProfile
  ): {
    adjustedValue: number
    seasonalFactor: number
    isSeasonalPeak: boolean
    seasonalContext: string
  } {
    const month = date.getMonth() + 1
    const seasonalPatterns = businessProfile.seasonalityFactors || []
    
    const monthlyPattern = seasonalPatterns.find(p => p.month === month)
    
    if (!monthlyPattern) {
      return {
        adjustedValue: value,
        seasonalFactor: 1,
        isSeasonalPeak: false,
        seasonalContext: 'No seasonal data available'
      }
    }

    const adjustedValue = value / monthlyPattern.multiplier
    const isSeasonalPeak = monthlyPattern.multiplier > 1.2
    
    let seasonalContext = ''
    if (monthlyPattern.multiplier > 1.3) {
      seasonalContext = 'This is typically a peak seasonal period'
    } else if (monthlyPattern.multiplier < 0.8) {
      seasonalContext = 'This is typically a slower seasonal period'
    } else {
      seasonalContext = 'This is a normal seasonal period'
    }

    return {
      adjustedValue,
      seasonalFactor: monthlyPattern.multiplier,
      isSeasonalPeak,
      seasonalContext
    }
  }

  static getBusinessContextualAdvice(
    insight: string,
    businessProfile: BusinessProfile
  ): string {
    const { businessType, size, growthStage } = businessProfile

    // Customize advice based on business characteristics
    let contextualAdvice = insight

    // Size-specific adjustments
    if (size === 'startup') {
      contextualAdvice += ' As a startup, focus on sustainable growth rather than rapid scaling. Validate each step before investing heavily.'
    } else if (size === 'large') {
      contextualAdvice += ' Given your business size, consider enterprise-level solutions and systematic approaches to implementation.'
    }

    // Business type specific adjustments
    if (businessType === 'ecommerce') {
      contextualAdvice += ' For e-commerce businesses, pay special attention to seasonal trends and customer acquisition costs.'
    } else if (businessType === 'saas') {
      contextualAdvice += ' For SaaS businesses, focus on recurring revenue metrics and customer lifetime value.'
    }

    // Growth stage adjustments
    if (growthStage === 'early') {
      contextualAdvice += ' In the early stage, prioritize product-market fit and customer feedback over aggressive scaling.'
    } else if (growthStage === 'mature') {
      contextualAdvice += ' For mature businesses, focus on efficiency improvements and market expansion opportunities.'
    }

    return contextualAdvice
  }

  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId }
      })

      if (userSettings?.settings && typeof userSettings.settings === 'object') {
        const settings = userSettings.settings as any
        if (settings.insightPreferences) {
          return { userId, ...settings.insightPreferences }
        }
      }

      // Default preferences for new users
      return {
        userId,
        preferredInsightTypes: ['trend', 'opportunity', 'performance'],
        complexityLevel: 'intermediate',
        communicationStyle: 'casual',
        focusAreas: ['revenue', 'growth'],
        notificationFrequency: 'daily',
        insightHistory: {
          viewed: [],
          acted_upon: [],
          dismissed: [],
          rated: []
        }
      }
    } catch (error) {
      console.error('Error getting user preferences:', error)
      return {
        userId,
        preferredInsightTypes: ['trend', 'opportunity'],
        complexityLevel: 'intermediate',
        communicationStyle: 'casual',
        focusAreas: ['revenue'],
        notificationFrequency: 'daily',
        insightHistory: {
          viewed: [],
          acted_upon: [],
          dismissed: [],
          rated: []
        }
      }
    }
  }

  static async saveUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    try {
      await prisma.userSettings.upsert({
        where: { userId },
        update: {
          settings: {
            insightPreferences: preferences
          }
        },
        create: {
          userId,
          settings: {
            insightPreferences: preferences
          }
        }
      })
    } catch (error) {
      console.error('Error saving user preferences:', error)
    }
  }

  static personalizeInsightContent(
    insight: any,
    userPreferences: UserPreferences,
    businessProfile: BusinessProfile
  ): any {
    const { complexityLevel, communicationStyle, focusAreas } = userPreferences

    // Adjust complexity
    if (complexityLevel === 'basic') {
      insight.description = this.simplifyLanguage(insight.description)
      insight.recommendation = this.simplifyLanguage(insight.recommendation)
    } else if (complexityLevel === 'advanced') {
      insight.description = this.addTechnicalDetails(insight.description, insight.metadata)
    }

    // Adjust communication style
    if (communicationStyle === 'formal') {
      insight.description = this.formalizeTone(insight.description)
      insight.recommendation = this.formalizeTone(insight.recommendation)
    } else if (communicationStyle === 'technical') {
      insight.description = this.addTechnicalLanguage(insight.description)
      insight.recommendation = this.addTechnicalLanguage(insight.recommendation)
    }

    // Add business context
    insight.businessContext = BusinessIntelligenceEngine.getBusinessContextualAdvice(
      insight.recommendation,
      businessProfile
    )

    return insight
  }

  private static simplifyLanguage(text: string): string {
    return text
      .replace(/significantly/g, 'a lot')
      .replace(/optimize/g, 'improve')
      .replace(/implement/g, 'put in place')
      .replace(/substantial/g, 'big')
      .replace(/correlation/g, 'connection')
      .replace(/statistical/g, 'data-based')
  }

  private static formalizeTone(text: string): string {
    return text
      .replace(/You should/g, 'We recommend that you')
      .replace(/It's/g, 'It is')
      .replace(/can't/g, 'cannot')
      .replace(/won't/g, 'will not')
      .replace(/Let's/g, 'Let us')
  }

  private static addTechnicalLanguage(text: string): string {
    return text
      .replace(/connection/g, 'correlation')
      .replace(/unusual/g, 'anomalous')
      .replace(/pattern/g, 'statistical pattern')
      .replace(/increase/g, 'positive trend')
      .replace(/decrease/g, 'negative trend')
  }

  private static addTechnicalDetails(text: string, metadata: any): string {
    if (metadata?.statisticalSignificance) {
      text += ` (Statistical significance: ${(metadata.statisticalSignificance * 100).toFixed(1)}%)`
    }
    if (metadata?.dataPoints) {
      text += ` Based on analysis of ${metadata.dataPoints} data points.`
    }
    return text
  }
}

// Industry-specific insight generators
export class IndustrySpecificInsights {
  static generateEcommerceInsights(data: any, businessProfile: BusinessProfile): any[] {
    const insights = []

    // Cart abandonment analysis
    if (data.cart_abandonment_rate > 70) {
      insights.push({
        type: 'opportunity',
        title: 'High cart abandonment rate detected',
        description: `Your cart abandonment rate of ${data.cart_abandonment_rate}% is above the industry average. This represents a significant revenue recovery opportunity.`,
        recommendation: 'Implement cart abandonment email sequences, simplify checkout process, and consider offering exit-intent discounts.',
        impactScore: 8
      })
    }

    // Seasonal preparation
    const currentMonth = new Date().getMonth() + 1
    const seasonalPattern = businessProfile.seasonalityFactors?.find(p => p.month === currentMonth + 1)
    
    if (seasonalPattern && seasonalPattern.multiplier > 1.3) {
      insights.push({
        type: 'alert',
        title: 'Seasonal peak approaching',
        description: `Next month typically sees ${(seasonalPattern.multiplier * 100 - 100).toFixed(0)}% higher sales. Prepare for increased demand.`,
        recommendation: 'Increase inventory levels, prepare customer service capacity, and ensure payment processing can handle higher volume.',
        impactScore: 7
      })
    }

    return insights
  }

  static generateSaaSInsights(data: any, businessProfile: BusinessProfile): any[] {
    const insights = []

    // Churn rate analysis
    if (data.monthly_churn_rate > 5) {
      insights.push({
        type: 'alert',
        title: 'Elevated churn rate detected',
        description: `Your monthly churn rate of ${data.monthly_churn_rate}% is above healthy levels for SaaS businesses.`,
        recommendation: 'Implement proactive customer success programs, improve onboarding, and conduct exit interviews to identify churn reasons.',
        impactScore: 9
      })
    }

    // LTV:CAC ratio analysis
    if (data.lifetime_value && data.customer_acquisition_cost) {
      const ltvCacRatio = data.lifetime_value / data.customer_acquisition_cost
      
      if (ltvCacRatio < 3) {
        insights.push({
          type: 'performance',
          title: 'LTV:CAC ratio needs improvement',
          description: `Your LTV:CAC ratio of ${ltvCacRatio.toFixed(1)}:1 is below the recommended 3:1 threshold for sustainable SaaS growth.`,
          recommendation: 'Focus on either reducing customer acquisition costs through more efficient channels or increasing customer lifetime value through upselling and retention.',
          impactScore: 8
        })
      }
    }

    return insights
  }
}