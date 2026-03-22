import { prisma } from '../prisma'
import {
  MetricData,
  ChannelData,
  CustomerData,
  OrderData,
  DateRange,
  BusinessContext,
  DataQualityReport,
  DataQualityIssue
} from './types'
import { startOfDay, endOfDay, format, parseISO, isValid } from 'date-fns'
import { mean, deviation } from 'd3-array'

export class DataIntegrator {
  private organizationId: string

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  async fetchRevenueData(period: DateRange): Promise<MetricData[]> {
    try {
      const dataPoints = await prisma.dataPoint.findMany({
        where: {
          organizationId: this.organizationId,
          metricType: 'revenue',
          dateRecorded: {
            gte: startOfDay(period.start),
            lte: endOfDay(period.end)
          }
        },
        include: {
          integration: true
        },
        orderBy: {
          dateRecorded: 'asc'
        }
      })

      return dataPoints.map(dp => ({
        date: dp.dateRecorded,
        value: parseFloat(dp.value.toString()),
        source: this.mapIntegrationType(dp.integration.platform),
        metricType: 'revenue',
        metadata: dp.metadata as Record<string, any>
      }))
    } catch (error) {
      console.error('Error fetching revenue data:', error)
      return []
    }
  }

  async fetchTrafficData(period: DateRange): Promise<MetricData[]> {
    try {
      const dataPoints = await prisma.dataPoint.findMany({
        where: {
          organizationId: this.organizationId,
          metricType: {
            in: ['sessions', 'pageviews', 'users']
          },
          dateRecorded: {
            gte: startOfDay(period.start),
            lte: endOfDay(period.end)
          }
        },
        include: {
          integration: true
        },
        orderBy: {
          dateRecorded: 'asc'
        }
      })

      return dataPoints.map(dp => ({
        date: dp.dateRecorded,
        value: parseFloat(dp.value.toString()),
        source: this.mapIntegrationType(dp.integration.platform),
        metricType: this.mapMetricType(dp.metricType),
        metadata: dp.metadata as Record<string, any>
      }))
    } catch (error) {
      console.error('Error fetching traffic data:', error)
      return []
    }
  }

  async fetchMarketingData(period: DateRange): Promise<ChannelData[]> {
    try {
      const [revenueData, ordersData, sessionsData, conversionsData, spendData] = await Promise.all([
        this.fetchChannelMetric('revenue', period),
        this.fetchChannelMetric('orders', period),
        this.fetchChannelMetric('sessions', period),
        this.fetchChannelMetric('conversions', period),
        this.fetchChannelMetric('ad_spend', period)
      ])

      const channels = this.aggregateChannelData(
        revenueData,
        ordersData,
        sessionsData,
        conversionsData,
        spendData,
        period
      )

      return channels
    } catch (error) {
      console.error('Error fetching marketing data:', error)
      return []
    }
  }

  async fetchCustomerData(period: DateRange): Promise<CustomerData[]> {
    try {
      // This would typically come from customer data stored in your system
      // For now, we'll derive it from order data
      const orderData = await prisma.dataPoint.findMany({
        where: {
          organizationId: this.organizationId,
          metricType: 'orders',
          dateRecorded: {
            gte: startOfDay(period.start),
            lte: endOfDay(period.end)
          }
        },
        include: {
          integration: true
        },
        orderBy: {
          dateRecorded: 'asc'
        }
      })

      // Group by customer (using metadata.customerId if available)
      const customerMap = new Map<string, any>()
      
      orderData.forEach(dp => {
        const metadata = dp.metadata as any
        const customerId = metadata?.customerId || `unknown_${dp.integration.platform}_${Math.random()}`
        
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customerId,
            acquisitionDate: dp.dateRecorded,
            totalRevenue: 0,
            orderCount: 0,
            lastOrderDate: dp.dateRecorded,
            acquisitionChannel: dp.integration.platform,
            orders: []
          })
        }
        
        const customer = customerMap.get(customerId)!
        customer.totalRevenue += parseFloat(dp.value.toString())
        customer.orderCount += 1
        customer.lastOrderDate = new Date(Math.max(customer.lastOrderDate.getTime(), dp.dateRecorded.getTime()))
        customer.orders.push(dp)
      })

      return Array.from(customerMap.values()).map(customer => ({
        customerId: customer.customerId,
        acquisitionDate: customer.acquisitionDate,
        totalRevenue: customer.totalRevenue,
        orderCount: customer.orderCount,
        averageOrderValue: customer.totalRevenue / customer.orderCount,
        lastOrderDate: customer.lastOrderDate,
        acquisitionChannel: customer.acquisitionChannel,
        lifetimeValue: customer.totalRevenue // Simplified LTV calculation
      }))
    } catch (error) {
      console.error('Error fetching customer data:', error)
      return []
    }
  }

  async fetchOrderData(period: DateRange): Promise<OrderData[]> {
    try {
      const orderDataPoints = await prisma.dataPoint.findMany({
        where: {
          organizationId: this.organizationId,
          metricType: 'orders',
          dateRecorded: {
            gte: startOfDay(period.start),
            lte: endOfDay(period.end)
          }
        },
        include: {
          integration: true
        },
        orderBy: {
          dateRecorded: 'asc'
        }
      })

      return orderDataPoints.map(dp => {
        const metadata = dp.metadata as any
        return {
          orderId: metadata?.orderId || `order_${dp.id}`,
          customerId: metadata?.customerId || `customer_${Math.random()}`,
          orderDate: dp.dateRecorded,
          totalValue: parseFloat(dp.value.toString()),
          itemCount: metadata?.itemCount || 1,
          channel: dp.integration.platform,
          isFirstOrder: metadata?.isFirstOrder || false,
          paymentMethod: metadata?.paymentMethod,
          shippingMethod: metadata?.shippingMethod,
          region: metadata?.region
        }
      })
    } catch (error) {
      console.error('Error fetching order data:', error)
      return []
    }
  }

  async getBusinessContext(): Promise<BusinessContext> {
    try {
      const settings = await prisma.organizationSettings.findUnique({
        where: { organizationId: this.organizationId }
      })

      const organization = await prisma.organization.findUnique({
        where: { id: this.organizationId },
        include: {
          integrations: true
        }
      })

      if (!organization) {
        throw new Error('Organization not found')
      }

      const settingsData = settings?.settings as any || {}
      
      // Analyze recent revenue to determine business size
      const recentRevenue = await this.getRecentMonthlyRevenue()
      const businessSize = this.determineBusinessSize(recentRevenue)
      
      // Get primary channels from integrations
      const primaryChannels = organization.integrations
        .filter(i => i.status === 'CONNECTED')
        .map(i => i.platform.toLowerCase())

      return {
        industry: settingsData.industry,
        businessSize,
        monthlyRevenue: recentRevenue,
        primaryChannels,
        seasonalBusiness: settingsData.seasonalBusiness || false,
        foundedDate: settingsData.foundedDate ? parseISO(settingsData.foundedDate) : undefined,
        employeeCount: settingsData.employeeCount,
        targetMarket: settingsData.targetMarket,
        businessModel: settingsData.businessModel || 'b2c'
      }
    } catch (error) {
      console.error('Error getting business context:', error)
      
      // Return default context
      return {
        businessSize: 'small',
        primaryChannels: ['shopify', 'stripe'],
        seasonalBusiness: false,
        businessModel: 'b2c'
      }
    }
  }

  async validateDataQuality(period: DateRange): Promise<DataQualityReport> {
    try {
      const issues: DataQualityIssue[] = []
      const coverage: Record<string, number> = {}
      const freshness: Record<string, Date> = {}

      // Check data availability for each source
      const sources = ['shopify', 'stripe', 'google_analytics', 'facebook_ads']
      const metrics = ['revenue', 'orders', 'sessions', 'conversions']

      for (const metric of metrics) {
        const data = await this.fetchMetricData(metric, period)
        
        // Check coverage
        const expectedDays = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24))
        const actualDays = new Set(data.map(d => format(d.date, 'yyyy-MM-dd'))).size
        coverage[metric] = actualDays / expectedDays

        // Check freshness
        if (data.length > 0) {
          freshness[metric] = data[data.length - 1].date
        }

        // Identify issues
        if (coverage[metric] < 0.8) {
          issues.push({
            type: 'missing_data',
            severity: coverage[metric] < 0.5 ? 'high' : 'medium',
            description: `${metric} data is ${(coverage[metric] * 100).toFixed(1)}% complete`,
            affectedMetrics: [metric],
            suggestedFix: `Check integration status for sources providing ${metric} data`
          })
        }

        // Check for outliers
        const values = data.map(d => d.value)
        if (values.length > 0) {
          const outliers = this.detectSimpleOutliers(values)
          if (outliers.length > values.length * 0.1) {
            issues.push({
              type: 'outliers',
              severity: 'medium',
              description: `${metric} contains ${outliers.length} potential outliers`,
              affectedMetrics: [metric],
              suggestedFix: 'Review data collection process for anomalies'
            })
          }
        }

        // Check data freshness
        const now = new Date()
        const daysSinceLastData = freshness[metric] 
          ? Math.ceil((now.getTime() - freshness[metric].getTime()) / (1000 * 60 * 60 * 24))
          : Infinity

        if (daysSinceLastData > 2) {
          issues.push({
            type: 'stale_data',
            severity: daysSinceLastData > 7 ? 'high' : 'medium',
            description: `${metric} data is ${daysSinceLastData} days old`,
            affectedMetrics: [metric],
            suggestedFix: 'Check integration sync status and re-sync if necessary'
          })
        }
      }

      // Calculate overall score
      const avgCoverage = mean(Object.values(coverage)) || 0
      const freshnessScore = Object.keys(freshness).length / metrics.length
      const issuesPenalty = Math.min(0.3, issues.length * 0.05)
      const score = Math.max(0, (avgCoverage * 0.5 + freshnessScore * 0.3 + (1 - issuesPenalty) * 0.2))

      return {
        score,
        issues,
        recommendations: this.generateDataQualityRecommendations(issues),
        coverage,
        freshness
      }
    } catch (error) {
      console.error('Error validating data quality:', error)
      return {
        score: 0,
        issues: [{
          type: 'missing_data',
          severity: 'high',
          description: 'Unable to assess data quality',
          affectedMetrics: [],
          suggestedFix: 'Check database connection and data availability'
        }],
        recommendations: ['Verify data integration status'],
        coverage: {},
        freshness: {}
      }
    }
  }

  private async fetchChannelMetric(metricType: string, period: DateRange): Promise<Map<string, number>> {
    const dataPoints = await prisma.dataPoint.findMany({
      where: {
        organizationId: this.organizationId,
        metricType,
        dateRecorded: {
          gte: startOfDay(period.start),
          lte: endOfDay(period.end)
        }
      },
      include: {
        integration: true
      }
    })

    const channelTotals = new Map<string, number>()
    
    dataPoints.forEach(dp => {
      const channel = dp.integration.platform.toLowerCase()
      const currentTotal = channelTotals.get(channel) || 0
      channelTotals.set(channel, currentTotal + parseFloat(dp.value.toString()))
    })

    return channelTotals
  }

  private aggregateChannelData(
    revenueData: Map<string, number>,
    ordersData: Map<string, number>,
    sessionsData: Map<string, number>,
    conversionsData: Map<string, number>,
    spendData: Map<string, number>,
    period: DateRange
  ): ChannelData[] {
    const channels = new Set([
      ...revenueData.keys(),
      ...ordersData.keys(),
      ...sessionsData.keys(),
      ...conversionsData.keys(),
      ...spendData.keys()
    ])

    return Array.from(channels).map(channel => {
      const revenue = revenueData.get(channel) || 0
      const orders = ordersData.get(channel) || 0
      const sessions = sessionsData.get(channel) || 0
      const conversions = conversionsData.get(channel) || 0
      const spend = spendData.get(channel) || 0

      const conversionRate = sessions > 0 ? (conversions / sessions) * 100 : 0
      const averageOrderValue = orders > 0 ? revenue / orders : 0
      const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0
      const customerAcquisitionCost = conversions > 0 ? spend / conversions : 0

      return {
        name: this.formatChannelName(channel),
        source: channel,
        revenue,
        orders,
        sessions,
        conversions,
        spend: spend > 0 ? spend : undefined,
        roi: spend > 0 ? roi : undefined,
        conversionRate,
        averageOrderValue,
        customerAcquisitionCost: spend > 0 ? customerAcquisitionCost : undefined,
        period
      }
    })
  }

  private async fetchMetricData(metricType: string, period: DateRange): Promise<MetricData[]> {
    const dataPoints = await prisma.dataPoint.findMany({
      where: {
        organizationId: this.organizationId,
        metricType,
        dateRecorded: {
          gte: startOfDay(period.start),
          lte: endOfDay(period.end)
        }
      },
      include: {
        integration: true
      },
      orderBy: {
        dateRecorded: 'asc'
      }
    })

    return dataPoints.map(dp => ({
      date: dp.dateRecorded,
      value: parseFloat(dp.value.toString()),
      source: this.mapIntegrationType(dp.integration.platform),
      metricType: this.mapMetricType(dp.metricType),
      metadata: dp.metadata as Record<string, any>
    }))
  }

  private async getRecentMonthlyRevenue(): Promise<number> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const result = await prisma.dataPoint.aggregate({
      where: {
        organizationId: this.organizationId,
        metricType: 'revenue',
        dateRecorded: {
          gte: thirtyDaysAgo
        }
      },
      _sum: {
        value: true
      }
    })

    return parseFloat(result._sum.value?.toString() || '0')
  }

  private determineBusinessSize(monthlyRevenue: number): 'micro' | 'small' | 'medium' {
    if (monthlyRevenue < 10000) return 'micro'
    if (monthlyRevenue < 100000) return 'small'
    return 'medium'
  }

  private detectSimpleOutliers(values: number[]): number[] {
    if (values.length < 5) return []

    const meanValue = mean(values) || 0
    const stdDev = deviation(values) || 1
    
    return values.filter(value => Math.abs(value - meanValue) > 2 * stdDev)
  }

  private generateDataQualityRecommendations(issues: DataQualityIssue[]): string[] {
    const recommendations = new Set<string>()

    issues.forEach(issue => {
      switch (issue.type) {
        case 'missing_data':
          recommendations.add('Check integration connection status')
          recommendations.add('Verify API credentials and permissions')
          break
        case 'stale_data':
          recommendations.add('Enable automatic data synchronization')
          recommendations.add('Set up monitoring for data freshness')
          break
        case 'outliers':
          recommendations.add('Review data validation rules')
          recommendations.add('Implement outlier detection and alerting')
          break
        case 'inconsistent_format':
          recommendations.add('Standardize data formatting across sources')
          recommendations.add('Implement data transformation pipelines')
          break
      }
    })

    return Array.from(recommendations)
  }

  private mapIntegrationType(platform: string): 'shopify' | 'stripe' | 'google_analytics' | 'facebook_ads' {
    const platformMap: Record<string, 'shopify' | 'stripe' | 'google_analytics' | 'facebook_ads'> = {
      'SHOPIFY': 'shopify',
      'STRIPE': 'stripe',
      'GOOGLE_ANALYTICS': 'google_analytics',
      'FACEBOOK_ADS': 'facebook_ads'
    }
    
    return platformMap[platform.toUpperCase()] || 'shopify'
  }

  private mapMetricType(metricType: string): 'revenue' | 'orders' | 'sessions' | 'conversions' | 'customers' | 'traffic' {
    const metricMap: Record<string, 'revenue' | 'orders' | 'sessions' | 'conversions' | 'customers' | 'traffic'> = {
      'revenue': 'revenue',
      'orders': 'orders',
      'sessions': 'sessions',
      'pageviews': 'traffic',
      'users': 'customers',
      'conversions': 'conversions'
    }
    
    return metricMap[metricType.toLowerCase()] || 'revenue'
  }

  private formatChannelName(channel: string): string {
    const nameMap: Record<string, string> = {
      'shopify': 'Shopify',
      'stripe': 'Stripe',
      'google_analytics': 'Google Analytics',
      'facebook_ads': 'Facebook Ads'
    }
    
    return nameMap[channel] || channel.charAt(0).toUpperCase() + channel.slice(1)
  }

  async getAvailableMetrics(): Promise<string[]> {
    try {
      const result = await prisma.dataPoint.findMany({
        where: {
          organizationId: this.organizationId
        },
        select: {
          metricType: true
        },
        distinct: ['metricType']
      })

      return result.map(r => r.metricType)
    } catch (error) {
      console.error('Error getting available metrics:', error)
      return []
    }
  }

  async getDateRange(): Promise<DateRange | null> {
    try {
      const result = await prisma.dataPoint.aggregate({
        where: {
          organizationId: this.organizationId
        },
        _min: {
          dateRecorded: true
        },
        _max: {
          dateRecorded: true
        }
      })

      if (!result._min.dateRecorded || !result._max.dateRecorded) {
        return null
      }

      return {
        start: result._min.dateRecorded,
        end: result._max.dateRecorded
      }
    } catch (error) {
      console.error('Error getting date range:', error)
      return null
    }
  }
}