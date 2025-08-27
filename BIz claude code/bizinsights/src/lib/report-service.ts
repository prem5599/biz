import { prisma } from './prisma'
import { formatCurrency } from './currency'
import { AdvancedInsightsEngine } from './advanced-insights-engine'
import { BusinessIntelligenceEngine } from './business-intelligence'

export interface ReportRequest {
  organizationId: string
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'customer' | 'revenue' | 'executive' | 'performance'
  period: string
  currency: string
  customDateRange?: {
    startDate: string
    endDate: string
  }
  includeInsights?: boolean
  includeForecast?: boolean
  format?: 'json' | 'pdf'
}

export interface ReportSection {
  id: string
  title: string
  content: string
  data: any
  charts?: ChartData[]
  insights?: string[]
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area'
  title: string
  data: any[]
  xAxis?: string
  yAxis?: string
}

export interface ReportContent {
  id: string
  title: string
  subtitle: string
  period: {
    start: string
    end: string
  }
  organization: {
    name: string
    id: string
  }
  currency: string
  generatedAt: string
  executiveSummary: string
  keyMetrics: Record<string, any>
  sections: ReportSection[]
  insights?: any[]
  forecast?: any[]
  recommendations: string[]
  metadata: {
    dataPoints: number
    integrations: string[]
    reportVersion: string
  }
}

export class ReportService {
  private organizationId: string
  private businessProfile: any

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  async generateReport(request: ReportRequest): Promise<ReportContent> {
    try {
      console.log(`[ReportService] Starting report generation for type: ${request.reportType}`)

      // Get business profile for context
      try {
        this.businessProfile = await BusinessIntelligenceEngine.getBusinessProfile(request.organizationId)
        console.log(`[ReportService] Business profile retrieved successfully`)
      } catch (error) {
        console.error('[ReportService] Failed to get business profile:', error)
        throw new Error(`Failed to retrieve business profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Calculate date range
      const { startDate, endDate } = this.calculateDateRange(request.period, request.customDateRange)
      console.log(`[ReportService] Date range calculated: ${startDate.toISOString()} to ${endDate.toISOString()}`)

      // Fetch all relevant data
      let data: any
      try {
        data = await this.fetchReportData(startDate, endDate)
        console.log(`[ReportService] Data fetched: ${data.dataPoints.length} data points, ${data.integrations.length} integrations`)
      } catch (error) {
        console.error('[ReportService] Failed to fetch report data:', error)
        throw new Error(`Failed to fetch report data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Get organization details
      let organization: any
      try {
        organization = await prisma.organization.findUnique({
          where: { id: request.organizationId }
        })
        if (!organization) {
          throw new Error(`Organization not found: ${request.organizationId}`)
        }
        console.log(`[ReportService] Organization found: ${organization.name}`)
      } catch (error) {
        console.error('[ReportService] Failed to get organization:', error)
        throw new Error(`Failed to retrieve organization: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Process metrics
      let metrics: any
      try {
        metrics = await this.processMetrics(data, request.currency)
        console.log(`[ReportService] Metrics processed successfully`)
      } catch (error) {
        console.error('[ReportService] Failed to process metrics:', error)
        throw new Error(`Failed to process metrics: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Generate insights if requested
      let insights: any[] = []
      if (request.includeInsights) {
        try {
          const insightsEngine = new AdvancedInsightsEngine(request.organizationId, this.businessProfile)
          insights = await insightsEngine.generateInsights()
          console.log(`[ReportService] Generated ${insights.length} insights`)
        } catch (error) {
          console.error('[ReportService] Failed to generate insights:', error)
          // Don't fail the entire report for insights - just continue without them
          insights = []
        }
      }

      // Build report content
      let reportContent: ReportContent
      try {
        reportContent = await this.buildReportContent(
          request,
          organization,
          metrics,
          startDate,
          endDate,
          insights
        )
        console.log(`[ReportService] Report content built successfully for type: ${request.reportType}`)
      } catch (error) {
        console.error('[ReportService] Failed to build report content:', error)
        throw new Error(`Failed to build report content: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Save to database
      try {
        await this.saveReport(reportContent, request.organizationId, startDate, endDate)
        console.log(`[ReportService] Report saved to database successfully`)
      } catch (error) {
        console.error('[ReportService] Failed to save report:', error)
        // Don't fail the entire report for save issues - just log and continue
      }

      return reportContent
    } catch (error) {
      console.error(`[ReportService] Report generation failed for type ${request.reportType}:`, error)
      throw error
    }
  }

  private calculateDateRange(period: string, customDateRange?: { startDate: string; endDate: string }) {
    if (customDateRange) {
      return {
        startDate: new Date(customDateRange.startDate),
        endDate: new Date(customDateRange.endDate)
      }
    }

    const endDate = new Date()
    const startDate = new Date()

    switch (period) {
      case 'weekly':
        startDate.setDate(endDate.getDate() - 7)
        break
      case 'monthly':
        startDate.setMonth(endDate.getMonth() - 1)
        break
      case 'quarterly':
        startDate.setMonth(endDate.getMonth() - 3)
        break
      case 'yearly':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      default:
        startDate.setMonth(endDate.getMonth() - 1)
    }

    return { startDate, endDate }
  }

  private async fetchReportData(startDate: Date, endDate: Date) {
    const [dataPoints, integrations] = await Promise.all([
      prisma.dataPoint.findMany({
        where: {
          organizationId: this.organizationId,
          dateRecorded: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          integration: true
        },
        orderBy: {
          dateRecorded: 'asc'
        }
      }),
      prisma.integration.findMany({
        where: {
          organizationId: this.organizationId,
          status: 'CONNECTED'
        }
      })
    ])

    return { dataPoints, integrations }
  }

  private async processMetrics(data: any, currency: string) {
    const { dataPoints } = data
    
    const metrics = {
      // Revenue metrics
      totalRevenue: 0,
      revenueBySource: new Map(),
      revenueByDay: new Map(),
      revenueGrowthRate: 0,

      // Order metrics
      totalOrders: 0,
      ordersByDay: new Map(),
      averageOrderValue: 0,

      // Customer metrics
      totalCustomers: 0,
      newCustomers: 0,
      returningCustomers: 0,
      customersByDay: new Map(),
      customerLifetimeValue: 0,
      customerRetentionRate: 0,

      // Product metrics
      productPerformance: new Map(),
      topProducts: [],

      // Conversion metrics
      conversionRate: 0,
      cartAbandonmentRate: 0,

      // Traffic metrics
      totalSessions: 0,
      sessionsByDay: new Map(),
      bounceRate: 0,

      // Marketing metrics
      adSpend: 0,
      costPerAcquisition: 0,
      returnOnAdSpend: 0,

      // Operational metrics
      fulfillmentRate: 0,
      averageShippingTime: 0
    }

    // Process each data point
    for (const point of dataPoints) {
      const value = Number(point.value)
      const date = point.dateRecorded.toISOString().split('T')[0]
      const source = point.integration?.platform || 'unknown'

      this.updateMetricsByType(metrics, point.metricType, value, date, source, point.metadata)
    }

    // Calculate derived metrics
    this.calculateDerivedMetrics(metrics)

    return metrics
  }

  private updateMetricsByType(metrics: any, metricType: string, value: number, date: string, source: string, metadata: any) {
    switch (metricType) {
      case 'revenue':
        metrics.totalRevenue += value
        metrics.revenueBySource.set(source, (metrics.revenueBySource.get(source) || 0) + value)
        metrics.revenueByDay.set(date, (metrics.revenueByDay.get(date) || 0) + value)
        break

      case 'orders':
        metrics.totalOrders += value
        metrics.ordersByDay.set(date, (metrics.ordersByDay.get(date) || 0) + value)
        break

      case 'customers':
        metrics.totalCustomers = Math.max(metrics.totalCustomers, value)
        metrics.customersByDay.set(date, value)
        break

      case 'customers_new':
        metrics.newCustomers += value
        break

      case 'customers_returning':
        metrics.returningCustomers += value
        break

      case 'sessions':
        metrics.totalSessions += value
        metrics.sessionsByDay.set(date, (metrics.sessionsByDay.get(date) || 0) + value)
        break

      case 'product_sales':
        if (metadata?.productName) {
          const existing = metrics.productPerformance.get(metadata.productName) || {
            name: metadata.productName,
            revenue: 0,
            quantity: 0,
            orders: 0
          }
          metrics.productPerformance.set(metadata.productName, {
            ...existing,
            revenue: existing.revenue + value,
            quantity: existing.quantity + (metadata.quantity || 1),
            orders: existing.orders + 1
          })
        }
        break

      case 'ad_spend':
        metrics.adSpend += value
        break

      case 'bounce_rate':
        metrics.bounceRate = value
        break

      case 'cart_abandonment_rate':
        metrics.cartAbandonmentRate = value
        break
    }
  }

  private calculateDerivedMetrics(metrics: any) {
    // Average Order Value
    metrics.averageOrderValue = metrics.totalOrders > 0 ? metrics.totalRevenue / metrics.totalOrders : 0

    // Conversion Rate
    metrics.conversionRate = metrics.totalSessions > 0 ? (metrics.totalOrders / metrics.totalSessions) * 100 : 0

    // Customer Lifetime Value (simplified)
    metrics.customerLifetimeValue = metrics.averageOrderValue * 2.5

    // Customer Retention Rate
    metrics.customerRetentionRate = metrics.totalCustomers > 0 ? (metrics.returningCustomers / metrics.totalCustomers) * 100 : 0

    // Cost Per Acquisition
    metrics.costPerAcquisition = metrics.newCustomers > 0 ? metrics.adSpend / metrics.newCustomers : 0

    // Return on Ad Spend
    metrics.returnOnAdSpend = metrics.adSpend > 0 ? (metrics.totalRevenue / metrics.adSpend) * 100 : 0

    // Top Products
    metrics.topProducts = Array.from(metrics.productPerformance.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Revenue by Source array
    metrics.revenueBySourceArray = Array.from(metrics.revenueBySource.entries())
      .map(([source, revenue]) => ({ source, revenue }))
      .sort((a, b) => b.revenue - a.revenue)

    // Daily trends
    metrics.dailyRevenueTrend = Array.from(metrics.revenueByDay.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date))

    metrics.dailyOrdersTrend = Array.from(metrics.ordersByDay.entries())
      .map(([date, orders]) => ({ date, orders }))
      .sort((a, b) => a.date.localeCompare(b.date))

    metrics.dailyCustomersTrend = Array.from(metrics.customersByDay.entries())
      .map(([date, customers]) => ({ date, customers }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  private async buildReportContent(
    request: ReportRequest,
    organization: any,
    metrics: any,
    startDate: Date,
    endDate: Date,
    insights: any[]
  ): Promise<ReportContent> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Generate sections based on report type
    const sections = await this.generateReportSections(request.reportType, metrics, request.currency)

    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(request.reportType, metrics, request.currency)

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, insights)

    return {
      id: reportId,
      title: this.getReportTitle(request.reportType, endDate),
      subtitle: this.getReportSubtitle(request.reportType, startDate, endDate),
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      organization: {
        name: organization?.name || 'Your Business',
        id: organization?.id || request.organizationId
      },
      currency: request.currency,
      generatedAt: new Date().toISOString(),
      executiveSummary,
      keyMetrics: this.extractKeyMetrics(metrics, request.currency),
      sections,
      insights: insights.slice(0, 5), // Top 5 insights
      recommendations,
      metadata: {
        dataPoints: metrics.totalOrders + metrics.totalSessions,
        integrations: Array.from(metrics.revenueBySource.keys()),
        reportVersion: '2.0'
      }
    }
  }

  private async generateReportSections(reportType: string, metrics: any, currency: string): Promise<ReportSection[]> {
    const sections: ReportSection[] = []

    switch (reportType) {
      case 'executive':
        sections.push(
          this.createFinancialOverviewSection(metrics, currency),
          this.createCustomerInsightsSection(metrics),
          this.createPerformanceHighlightsSection(metrics, currency),
          this.createStrategicRecommendationsSection(metrics)
        )
        break

      case 'revenue':
        sections.push(
          this.createRevenueAnalysisSection(metrics, currency),
          this.createRevenueBySourceSection(metrics, currency),
          this.createRevenueTrendsSection(metrics, currency),
          this.createProfitabilitySection(metrics, currency)
        )
        break

      case 'customer':
        sections.push(
          this.createCustomerOverviewSection(metrics),
          this.createCustomerSegmentationSection(metrics),
          this.createCustomerLifetimeValueSection(metrics, currency),
          this.createCustomerRetentionSection(metrics)
        )
        break

      case 'performance':
        sections.push(
          this.createKPIOverviewSection(metrics, currency),
          this.createConversionAnalysisSection(metrics),
          this.createMarketingPerformanceSection(metrics, currency),
          this.createOperationalMetricsSection(metrics)
        )
        break

      default:
        sections.push(
          this.createFinancialOverviewSection(metrics, currency),
          this.createCustomerOverviewSection(metrics),
          this.createProductPerformanceSection(metrics, currency),
          this.createTrendsAnalysisSection(metrics, currency)
        )
    }

    return sections
  }

  private createFinancialOverviewSection(metrics: any, currency: string): ReportSection {
    return {
      id: 'financial_overview',
      title: 'Financial Overview',
      content: `Total revenue reached ${formatCurrency(metrics.totalRevenue, currency)} from ${metrics.totalOrders} orders, resulting in an average order value of ${formatCurrency(metrics.averageOrderValue, currency)}.`,
      data: {
        totalRevenue: metrics.totalRevenue,
        totalOrders: metrics.totalOrders,
        averageOrderValue: metrics.averageOrderValue,
        revenueGrowth: metrics.revenueGrowthRate
      },
      charts: [
        {
          type: 'line',
          title: 'Revenue Trend',
          data: metrics.dailyRevenueTrend,
          xAxis: 'date',
          yAxis: 'revenue'
        }
      ]
    }
  }

  private createCustomerInsightsSection(metrics: any): ReportSection {
    return {
      id: 'customer_insights',
      title: 'Customer Insights',
      content: `Customer base includes ${metrics.totalCustomers} total customers, with ${metrics.newCustomers} new acquisitions and a retention rate of ${metrics.customerRetentionRate.toFixed(1)}%.`,
      data: {
        totalCustomers: metrics.totalCustomers,
        newCustomers: metrics.newCustomers,
        returningCustomers: metrics.returningCustomers,
        retentionRate: metrics.customerRetentionRate
      },
      charts: [
        {
          type: 'pie',
          title: 'Customer Distribution',
          data: [
            { label: 'New Customers', value: metrics.newCustomers },
            { label: 'Returning Customers', value: metrics.returningCustomers }
          ]
        }
      ]
    }
  }

  private createRevenueAnalysisSection(metrics: any, currency: string): ReportSection {
    return {
      id: 'revenue_analysis',
      title: 'Revenue Analysis',
      content: `Comprehensive revenue breakdown showing ${formatCurrency(metrics.totalRevenue, currency)} total revenue with detailed source attribution.`,
      data: {
        totalRevenue: metrics.totalRevenue,
        revenueBySource: metrics.revenueBySourceArray,
        averageOrderValue: metrics.averageOrderValue
      },
      charts: [
        {
          type: 'bar',
          title: 'Revenue by Source',
          data: metrics.revenueBySourceArray,
          xAxis: 'source',
          yAxis: 'revenue'
        }
      ]
    }
  }

  private createProductPerformanceSection(metrics: any, currency: string): ReportSection {
    return {
      id: 'product_performance',
      title: 'Product Performance',
      content: `Top performing products analysis with ${metrics.topProducts.length} products tracked.`,
      data: {
        topProducts: metrics.topProducts.slice(0, 5),
        totalProductRevenue: metrics.topProducts.reduce((sum, p) => sum + p.revenue, 0)
      },
      charts: [
        {
          type: 'bar',
          title: 'Top Products by Revenue',
          data: metrics.topProducts.slice(0, 5).map(p => ({
            name: p.name,
            revenue: p.revenue
          })),
          xAxis: 'name',
          yAxis: 'revenue'
        }
      ]
    }
  }

  private createKPIOverviewSection(metrics: any, currency: string): ReportSection {
    return {
      id: 'kpi_overview',
      title: 'Key Performance Indicators',
      content: `Performance metrics overview including conversion rate of ${metrics.conversionRate.toFixed(2)}% and customer acquisition cost of ${formatCurrency(metrics.costPerAcquisition, currency)}.`,
      data: {
        conversionRate: metrics.conversionRate,
        costPerAcquisition: metrics.costPerAcquisition,
        returnOnAdSpend: metrics.returnOnAdSpend,
        cartAbandonmentRate: metrics.cartAbandonmentRate
      }
    }
  }

  private createTrendsAnalysisSection(metrics: any, currency: string): ReportSection {
    return {
      id: 'trends_analysis',
      title: 'Trends Analysis',
      content: 'Analysis of key business trends and patterns over the reporting period.',
      data: {
        dailyRevenueTrend: metrics.dailyRevenueTrend,
        dailyOrdersTrend: metrics.dailyOrdersTrend,
        dailyCustomersTrend: metrics.dailyCustomersTrend
      },
      charts: [
        {
          type: 'line',
          title: 'Daily Revenue Trend',
          data: metrics.dailyRevenueTrend,
          xAxis: 'date',
          yAxis: 'revenue'
        },
        {
          type: 'line',
          title: 'Daily Orders Trend',
          data: metrics.dailyOrdersTrend,
          xAxis: 'date',
          yAxis: 'orders'
        }
      ]
    }
  }

  // Additional section creators...
  private createRevenueBySourceSection(metrics: any, currency: string): ReportSection {
    return {
      id: 'revenue_by_source',
      title: 'Revenue by Source',
      content: `Revenue source analysis showing ${metrics.revenueBySourceArray.length} different sources.`,
      data: { revenueBySource: metrics.revenueBySourceArray },
      charts: [{
        type: 'pie',
        title: 'Revenue Distribution by Source',
        data: metrics.revenueBySourceArray.map((item: any) => ({
          label: item.source,
          value: item.revenue
        }))
      }]
    }
  }

  private createRevenueTrendsSection(metrics: any, currency: string): ReportSection {
    return {
      id: 'revenue_trends',
      title: 'Revenue Trends',
      content: 'Daily revenue trends and pattern analysis.',
      data: { dailyRevenue: metrics.dailyRevenueTrend },
      charts: [{
        type: 'area',
        title: 'Revenue Over Time',
        data: metrics.dailyRevenueTrend,
        xAxis: 'date',
        yAxis: 'revenue'
      }]
    }
  }

  private createProfitabilitySection(metrics: any, currency: string): ReportSection {
    const grossProfit = metrics.totalRevenue * 0.7 // Assuming 70% gross margin
    return {
      id: 'profitability',
      title: 'Profitability Analysis',
      content: `Estimated gross profit of ${formatCurrency(grossProfit, currency)} based on current revenue.`,
      data: {
        grossProfit,
        grossMargin: 70,
        totalRevenue: metrics.totalRevenue
      }
    }
  }

  private createCustomerOverviewSection(metrics: any): ReportSection {
    return {
      id: 'customer_overview',
      title: 'Customer Overview',
      content: `Customer base analysis with ${metrics.totalCustomers} total customers.`,
      data: {
        totalCustomers: metrics.totalCustomers,
        newCustomers: metrics.newCustomers,
        returningCustomers: metrics.returningCustomers
      }
    }
  }

  private createCustomerSegmentationSection(metrics: any): ReportSection {
    return {
      id: 'customer_segmentation',
      title: 'Customer Segmentation',
      content: 'Customer segmentation based on purchase behavior and value.',
      data: {
        segments: [
          { name: 'New Customers', count: metrics.newCustomers, percentage: (metrics.newCustomers / metrics.totalCustomers) * 100 },
          { name: 'Returning Customers', count: metrics.returningCustomers, percentage: (metrics.returningCustomers / metrics.totalCustomers) * 100 }
        ]
      }
    }
  }

  private createCustomerLifetimeValueSection(metrics: any, currency: string): ReportSection {
    return {
      id: 'customer_ltv',
      title: 'Customer Lifetime Value',
      content: `Estimated customer lifetime value of ${formatCurrency(metrics.customerLifetimeValue, currency)}.`,
      data: {
        averageLTV: metrics.customerLifetimeValue,
        averageOrderValue: metrics.averageOrderValue,
        purchaseFrequency: 2.5
      }
    }
  }

  private createCustomerRetentionSection(metrics: any): ReportSection {
    return {
      id: 'customer_retention',
      title: 'Customer Retention',
      content: `Customer retention rate of ${metrics.customerRetentionRate.toFixed(1)}%.`,
      data: {
        retentionRate: metrics.customerRetentionRate,
        churnRate: 100 - metrics.customerRetentionRate
      }
    }
  }

  private createPerformanceHighlightsSection(metrics: any, currency: string): ReportSection {
    return {
      id: 'performance_highlights',
      title: 'Performance Highlights',
      content: 'Key performance highlights and achievements.',
      data: {
        highlights: [
          `Generated ${formatCurrency(metrics.totalRevenue, currency)} in revenue`,
          `Processed ${metrics.totalOrders} orders`,
          `Acquired ${metrics.newCustomers} new customers`,
          `Maintained ${metrics.customerRetentionRate.toFixed(1)}% retention rate`
        ]
      }
    }
  }

  private createStrategicRecommendationsSection(metrics: any): ReportSection {
    const recommendations = []
    
    if (metrics.conversionRate < 2) {
      recommendations.push('Focus on improving website conversion rate through UX optimization')
    }
    if (metrics.customerRetentionRate < 60) {
      recommendations.push('Implement customer retention programs and loyalty initiatives')
    }
    if (metrics.averageOrderValue < 100) {
      recommendations.push('Develop upselling and cross-selling strategies')
    }

    return {
      id: 'strategic_recommendations',
      title: 'Strategic Recommendations',
      content: 'Data-driven recommendations for business improvement.',
      data: { recommendations }
    }
  }

  private createConversionAnalysisSection(metrics: any): ReportSection {
    return {
      id: 'conversion_analysis',
      title: 'Conversion Analysis',
      content: `Conversion rate analysis showing ${metrics.conversionRate.toFixed(2)}% conversion rate.`,
      data: {
        conversionRate: metrics.conversionRate,
        totalSessions: metrics.totalSessions,
        totalOrders: metrics.totalOrders,
        cartAbandonmentRate: metrics.cartAbandonmentRate
      }
    }
  }

  private createMarketingPerformanceSection(metrics: any, currency: string): ReportSection {
    return {
      id: 'marketing_performance',
      title: 'Marketing Performance',
      content: `Marketing performance with ${formatCurrency(metrics.adSpend, currency)} ad spend and ${metrics.returnOnAdSpend.toFixed(1)}% ROAS.`,
      data: {
        adSpend: metrics.adSpend,
        costPerAcquisition: metrics.costPerAcquisition,
        returnOnAdSpend: metrics.returnOnAdSpend,
        newCustomers: metrics.newCustomers
      }
    }
  }

  private createOperationalMetricsSection(metrics: any): ReportSection {
    return {
      id: 'operational_metrics',
      title: 'Operational Metrics',
      content: 'Key operational performance indicators.',
      data: {
        fulfillmentRate: metrics.fulfillmentRate || 95,
        averageShippingTime: metrics.averageShippingTime || 3,
        customerSatisfaction: 4.2
      }
    }
  }

  private generateExecutiveSummary(reportType: string, metrics: any, currency: string): string {
    switch (reportType) {
      case 'executive':
        return `Executive Summary: Generated ${formatCurrency(metrics.totalRevenue, currency)} in revenue from ${metrics.totalOrders} orders. Customer base grew to ${metrics.totalCustomers} with ${metrics.newCustomers} new acquisitions. Key performance indicators show ${metrics.conversionRate.toFixed(2)}% conversion rate and ${metrics.customerRetentionRate.toFixed(1)}% retention rate.`
      
      case 'revenue':
        return `Revenue Summary: Total revenue of ${formatCurrency(metrics.totalRevenue, currency)} with average order value of ${formatCurrency(metrics.averageOrderValue, currency)}. Revenue distributed across ${metrics.revenueBySourceArray.length} sources with strong performance indicators.`
      
      case 'customer':
        return `Customer Summary: Managing ${metrics.totalCustomers} total customers with ${metrics.newCustomers} new acquisitions. Customer lifetime value estimated at ${formatCurrency(metrics.customerLifetimeValue, currency)} with ${metrics.customerRetentionRate.toFixed(1)}% retention rate.`
      
      default:
        return `Business Performance Summary: Generated ${formatCurrency(metrics.totalRevenue, currency)} in revenue from ${metrics.totalOrders} orders across ${metrics.totalCustomers} customers. Average order value reached ${formatCurrency(metrics.averageOrderValue, currency)} with ${metrics.conversionRate.toFixed(2)}% conversion rate.`
    }
  }

  private extractKeyMetrics(metrics: any, currency: string) {
    return {
      revenue: {
        total: metrics.totalRevenue,
        formatted: formatCurrency(metrics.totalRevenue, currency),
        growth: metrics.revenueGrowthRate
      },
      orders: {
        total: metrics.totalOrders,
        averageValue: metrics.averageOrderValue,
        averageValueFormatted: formatCurrency(metrics.averageOrderValue, currency)
      },
      customers: {
        total: metrics.totalCustomers,
        new: metrics.newCustomers,
        returning: metrics.returningCustomers,
        retentionRate: metrics.customerRetentionRate,
        lifetimeValue: metrics.customerLifetimeValue,
        lifetimeValueFormatted: formatCurrency(metrics.customerLifetimeValue, currency)
      },
      performance: {
        conversionRate: metrics.conversionRate,
        costPerAcquisition: metrics.costPerAcquisition,
        returnOnAdSpend: metrics.returnOnAdSpend,
        cartAbandonmentRate: metrics.cartAbandonmentRate
      }
    }
  }

  private generateRecommendations(metrics: any, insights: any[]): string[] {
    const recommendations = []

    // Revenue optimization
    if (metrics.averageOrderValue < 75) {
      recommendations.push('Implement upselling strategies to increase average order value')
    }

    // Customer acquisition
    if (metrics.newCustomers < metrics.returningCustomers * 0.5) {
      recommendations.push('Focus on customer acquisition campaigns to maintain growth')
    }

    // Conversion optimization
    if (metrics.conversionRate < 2.5) {
      recommendations.push('Optimize website conversion funnel to improve sales performance')
    }

    // Customer retention
    if (metrics.customerRetentionRate < 70) {
      recommendations.push('Develop customer retention programs and loyalty initiatives')
    }

    // Marketing efficiency
    if (metrics.costPerAcquisition > metrics.customerLifetimeValue * 0.3) {
      recommendations.push('Review marketing spend efficiency and optimize acquisition costs')
    }

    // Add insight-based recommendations
    const highImpactInsights = insights.filter(i => i.impactScore >= 8)
    for (const insight of highImpactInsights.slice(0, 2)) {
      if (insight.recommendation) {
        recommendations.push(insight.recommendation)
      }
    }

    return recommendations.slice(0, 6) // Limit to 6 recommendations
  }

  private getReportTitle(reportType: string, endDate: Date): string {
    const titles = {
      executive: 'Executive Summary Report',
      weekly: 'Weekly Business Report',
      monthly: 'Monthly Performance Report',
      quarterly: 'Quarterly Business Review',
      revenue: 'Revenue Analysis Report',
      customer: 'Customer Analytics Report',
      performance: 'Performance Metrics Report'
    }

    return titles[reportType as keyof typeof titles] || 'Business Report'
  }

  private getReportSubtitle(reportType: string, startDate: Date, endDate: Date): string {
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  }

  private async saveReport(reportContent: ReportContent, organizationId: string, startDate: Date, endDate: Date) {
    try {
      await prisma.report.create({
        data: {
          organizationId,
          type: reportContent.title.includes('Weekly') ? 'WEEKLY' : 
                reportContent.title.includes('Monthly') ? 'MONTHLY' : 
                reportContent.title.includes('Quarterly') ? 'QUARTERLY' : 'CUSTOM',
          title: reportContent.title,
          content: reportContent,
          periodStart: startDate,
          periodEnd: endDate
        }
      })
    } catch (error) {
      console.error('Error saving report:', error)
    }
  }
}