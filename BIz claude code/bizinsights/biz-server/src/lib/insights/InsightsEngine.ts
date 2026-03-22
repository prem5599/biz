import {
  InsightData,
  TrendInsight,
  AnomalyInsight,
  PerformanceInsight,
  RecommendationInsight,
  BusinessContext,
  MetricData,
  ChannelData,
  CustomerData,
  OrderData,
  InsightGenerationOptions,
  DateRange,
  BusinessMetrics,
  TimeContext,
  EngineConfiguration,
  AnalysisContext,
  DataQualityReport,
  InsightGenerationJob,
  InsightGenerationStatus
} from './types'
import { StatisticalAnalyzer } from './StatisticalAnalyzer'
import { DataIntegrator } from './DataIntegrator'
import { LanguageGenerator } from './LanguageGenerator'
import { BusinessIntelligence } from './BusinessIntelligence'
import { ImpactScorer } from './ImpactScorer'
import { CacheManager } from './CacheManager'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import { mean } from 'd3-array'

export class InsightsEngine {
  private organizationId: string
  private configuration: EngineConfiguration
  private statisticalAnalyzer: StatisticalAnalyzer
  private dataIntegrator: DataIntegrator
  private languageGenerator: LanguageGenerator | null = null
  private businessIntelligence: BusinessIntelligence | null = null
  private impactScorer: ImpactScorer | null = null
  private cacheManager: CacheManager
  private businessContext: BusinessContext | null = null
  private activeJobs = new Map<string, InsightGenerationJob>()

  constructor(organizationId: string, configuration?: Partial<EngineConfiguration>) {
    this.organizationId = organizationId
    this.configuration = {
      minDataPoints: 7,
      confidenceThreshold: 0.6,
      significanceLevel: 0.05,
      cacheEnabled: true,
      cacheTtl: 60 * 60 * 1000, // 1 hour
      parallelProcessing: true,
      enableForecasting: true,
      enableAnomalyDetection: true,
      enableSeasonalityDetection: true,
      ...configuration
    }

    // Initialize core components
    this.statisticalAnalyzer = new StatisticalAnalyzer()
    this.dataIntegrator = new DataIntegrator(organizationId)
    this.cacheManager = new CacheManager(organizationId, {
      defaultTTL: this.configuration.cacheTtl,
      maxCacheSize: 1000
    })
  }

  async generateInsights(timeframe?: string, options?: InsightGenerationOptions): Promise<InsightData[]> {
    const jobId = uuidv4()
    const job: InsightGenerationJob = {
      id: jobId,
      organizationId: this.organizationId,
      status: 'running',
      progress: 0,
      startedAt: new Date(),
      options: options || {}
    }

    this.activeJobs.set(jobId, job)

    try {
      // Check cache first if enabled
      if (this.configuration.cacheEnabled) {
        const cachedInsights = await this.cacheManager.getCachedInsightsBatch(this.organizationId, options)
        if (cachedInsights && cachedInsights.length > 0) {
          job.status = 'completed'
          job.completedAt = new Date()
          job.progress = 100
          job.results = cachedInsights
          return cachedInsights
        }
      }

      // Initialize analysis context
      const context = await this.initializeAnalysisContext(timeframe, options)
      job.progress = 10

      // Validate data quality
      const dataQuality = await this.dataIntegrator.validateDataQuality(context.timeframe)
      if (dataQuality.score < 0.3) {
        throw new Error(`Data quality too low (${(dataQuality.score * 100).toFixed(1)}%) to generate reliable insights`)
      }
      job.progress = 20

      // Generate all insight types in parallel if enabled
      let insights: InsightData[] = []
      
      if (this.configuration.parallelProcessing) {
        const [trendInsights, anomalyInsights, performanceInsights, recommendationInsights] = await Promise.all([
          this.analyzeRevenueTrends(context),
          this.detectAnomalies(context),
          this.analyzeChannelPerformance(context),
          this.generateRecommendations(context)
        ])
        
        insights = [
          ...trendInsights,
          ...anomalyInsights,
          ...performanceInsights,
          ...recommendationInsights
        ]
      } else {
        // Sequential processing
        const trendInsights = await this.analyzeRevenueTrends(context)
        job.progress = 40
        
        const anomalyInsights = await this.detectAnomalies(context)
        job.progress = 60
        
        const performanceInsights = await this.analyzeChannelPerformance(context)
        job.progress = 80
        
        const recommendationInsights = await this.generateRecommendations(context)
        job.progress = 90

        insights = [
          ...trendInsights,
          ...anomalyInsights,
          ...performanceInsights,
          ...recommendationInsights
        ]
      }

      // Score and prioritize insights
      const scoredInsights = await this.scoreAndPrioritizeInsights(insights, context)
      
      // Apply filters based on options
      let filteredInsights = this.applyInsightFilters(scoredInsights, options)

      // Cache results if enabled
      if (this.configuration.cacheEnabled && filteredInsights.length > 0) {
        await this.cacheManager.cacheInsightsBatch(this.organizationId, filteredInsights)
      }

      // Complete job
      job.status = 'completed'
      job.completedAt = new Date()
      job.progress = 100
      job.results = filteredInsights

      return filteredInsights

    } catch (error) {
      job.status = 'failed'
      job.completedAt = new Date()
      job.error = error instanceof Error ? error.message : 'Unknown error'
      
      console.error('Error generating insights:', error)
      throw error
    } finally {
      // Clean up job after some time
      setTimeout(() => {
        this.activeJobs.delete(jobId)
      }, 5 * 60 * 1000) // 5 minutes
    }
  }

  async analyzeRevenueTrends(context?: AnalysisContext): Promise<TrendInsight[]> {
    const analysisContext = context || await this.initializeAnalysisContext()
    const revenueData = await this.dataIntegrator.fetchRevenueData(analysisContext.timeframe)
    
    if (revenueData.length < this.configuration.minDataPoints) {
      return []
    }

    const insights: TrendInsight[] = []

    try {
      // Overall revenue trend
      const trendResult = this.statisticalAnalyzer.calculateTrend(revenueData)
      if (trendResult && trendResult.rSquared >= this.configuration.confidenceThreshold) {
        const insight = await this.createTrendInsight(trendResult, revenueData, 'revenue', analysisContext)
        if (insight) insights.push(insight)
      }

      // Segment trends by source if available
      const revenueBySource = this.groupDataBySource(revenueData)
      for (const [source, data] of revenueBySource.entries()) {
        if (data.length >= this.configuration.minDataPoints) {
          const sourceTrend = this.statisticalAnalyzer.calculateTrend(data)
          if (sourceTrend && sourceTrend.rSquared >= this.configuration.confidenceThreshold) {
            const insight = await this.createTrendInsight(sourceTrend, data, `revenue_${source}`, analysisContext)
            if (insight) insights.push(insight)
          }
        }
      }

      // Generate forecasts if enabled
      if (this.configuration.enableForecasting) {
        const forecast = this.statisticalAnalyzer.generateForecast(revenueData)
        if (forecast) {
          const forecastInsight = await this.createForecastInsight(forecast, revenueData, analysisContext)
          if (forecastInsight) insights.push(forecastInsight)
        }
      }

    } catch (error) {
      console.error('Error analyzing revenue trends:', error)
    }

    return insights
  }

  async detectAnomalies(context?: AnalysisContext): Promise<AnomalyInsight[]> {
    if (!this.configuration.enableAnomalyDetection) return []

    const analysisContext = context || await this.initializeAnalysisContext()
    const insights: AnomalyInsight[] = []

    try {
      // Check multiple metrics for anomalies
      const metrics = ['revenue', 'orders', 'sessions', 'conversions']
      
      for (const metric of metrics) {
        const data = await this.fetchMetricData(metric, analysisContext.timeframe)
        if (data.length < this.configuration.minDataPoints) continue

        // Detect outliers using multiple methods
        const zscoreOutliers = this.statisticalAnalyzer.detectOutliers(data, 'zscore')
        const iqrOutliers = this.statisticalAnalyzer.detectOutliers(data, 'iqr')

        // Combine and deduplicate outliers
        const allOutliers = [...zscoreOutliers, ...iqrOutliers]
        const uniqueOutliers = this.deduplicateOutliers(allOutliers)

        // Create insights for significant anomalies
        for (const outlier of uniqueOutliers) {
          if (outlier.severity === 'high' || outlier.severity === 'critical') {
            const insight = await this.createAnomalyInsight(outlier, data, metric, analysisContext)
            if (insight) insights.push(insight)
          }
        }
      }

    } catch (error) {
      console.error('Error detecting anomalies:', error)
    }

    return insights
  }

  async analyzeChannelPerformance(context?: AnalysisContext): Promise<PerformanceInsight[]> {
    const analysisContext = context || await this.initializeAnalysisContext()
    const insights: PerformanceInsight[] = []

    try {
      const channelData = await this.dataIntegrator.fetchMarketingData(analysisContext.timeframe)
      if (channelData.length < 2) return insights // Need at least 2 channels to compare

      // Initialize business intelligence if not already done
      if (!this.businessIntelligence) {
        await this.initializeDependentComponents()
      }

      // Get channel recommendations
      const channelRecommendations = this.businessIntelligence!.analyzeChannelROI(channelData)
      
      // Create performance insights
      const topPerformer = channelData.reduce((best, current) => 
        (current.roi || 0) > (best.roi || 0) ? current : best
      )

      const channelComparison = this.generateChannelComparisons(channelData)

      const insight: PerformanceInsight = {
        id: uuidv4(),
        organizationId: this.organizationId,
        type: 'performance',
        title: 'Channel Performance Analysis',
        description: this.languageGenerator!.generateComparison(
          topPerformer,
          channelData.find(c => c.name !== topPerformer.name) || channelData[1],
          'roi'
        ),
        recommendation: this.generateChannelRecommendationText(channelRecommendations),
        impactScore: this.calculateChannelImpactScore(channelRecommendations),
        confidence: 0.8,
        affectedMetrics: ['revenue', 'roi', 'conversions'],
        timeframe: analysisContext.timeframe ? this.formatTimeframe(analysisContext.timeframe) : '30d',
        dataPoints: channelData.length,
        createdAt: new Date(),
        metadata: {
          source: 'channel_performance_analysis',
          algorithm: 'roi_optimization',
          version: '1.0',
          parameters: { channels: channelData.length },
          dataQuality: 0.9
        },
        channelComparison,
        topPerformer,
        recommendations: channelRecommendations
      }

      insights.push(insight)

    } catch (error) {
      console.error('Error analyzing channel performance:', error)
    }

    return insights
  }

  async generateRecommendations(context?: AnalysisContext): Promise<RecommendationInsight[]> {
    const analysisContext = context || await this.initializeAnalysisContext()
    const insights: RecommendationInsight[] = []

    try {
      if (!this.businessIntelligence) {
        await this.initializeDependentComponents()
      }

      // Get revenue and customer data for opportunity analysis
      const revenueData = await this.dataIntegrator.fetchRevenueData(analysisContext.timeframe)
      const customerData = await this.dataIntegrator.fetchCustomerData(analysisContext.timeframe)

      // Detect growth opportunities
      const opportunities = this.businessIntelligence!.detectGrowthOpportunities(revenueData, customerData)
      
      for (const opportunity of opportunities) {
        const recommendationInsight: RecommendationInsight = {
          ...opportunity,
          type: 'recommendation',
          actionItems: this.convertToActionItems(opportunity.implementationSteps),
          expectedImpact: {
            revenueImpact: {
              monthly: opportunity.potentialRevenue,
              confidence: opportunity.confidence
            },
            timeToImpact: '30-60 days',
            riskLevel: 'medium',
            successProbability: opportunity.confidence
          },
          implementationDifficulty: this.assessImplementationDifficulty(opportunity.implementationSteps),
          timeframe: this.mapOpportunityTimeframe(opportunity.opportunityType)
        }

        insights.push(recommendationInsight)
      }

      // Generate seasonal recommendations if enabled
      if (this.configuration.enableSeasonalityDetection) {
        const seasonalInsights = await this.generateSeasonalRecommendations(revenueData, analysisContext)
        insights.push(...seasonalInsights)
      }

    } catch (error) {
      console.error('Error generating recommendations:', error)
    }

    return insights
  }

  async getJobStatus(jobId: string): Promise<InsightGenerationJob | null> {
    return this.activeJobs.get(jobId) || null
  }

  async invalidateCache(triggers: string[]): Promise<void> {
    if (this.configuration.cacheEnabled) {
      await this.cacheManager.invalidateCache(this.organizationId, triggers)
    }
  }

  async getDataQualityReport(): Promise<DataQualityReport> {
    const defaultTimeframe = this.getDefaultTimeframe()
    return await this.dataIntegrator.validateDataQuality(defaultTimeframe)
  }

  // Private helper methods

  private async initializeAnalysisContext(timeframe?: string, options?: InsightGenerationOptions): Promise<AnalysisContext> {
    // Get business context if not already loaded
    if (!this.businessContext) {
      this.businessContext = await this.dataIntegrator.getBusinessContext()
    }

    // Initialize dependent components if needed
    if (!this.languageGenerator || !this.businessIntelligence || !this.impactScorer) {
      await this.initializeDependentComponents()
    }

    // Determine timeframe
    const dateRange = options?.timeframe || this.parseTimeframe(timeframe || '30d')
    
    // Get available data metrics
    const availableData = await this.dataIntegrator.getAvailableMetrics()

    return {
      organizationId: this.organizationId,
      businessContext: this.businessContext,
      timeframe: dateRange,
      availableData,
      configuration: this.configuration
    }
  }

  private async initializeDependentComponents(): Promise<void> {
    if (!this.businessContext) {
      this.businessContext = await this.dataIntegrator.getBusinessContext()
    }

    this.languageGenerator = new LanguageGenerator(this.businessContext)
    this.businessIntelligence = new BusinessIntelligence(this.businessContext)
    this.impactScorer = new ImpactScorer(this.businessContext)
  }

  private async fetchMetricData(metric: string, timeframe: DateRange): Promise<MetricData[]> {
    switch (metric) {
      case 'revenue':
        return await this.dataIntegrator.fetchRevenueData(timeframe)
      case 'traffic':
      case 'sessions':
        return await this.dataIntegrator.fetchTrafficData(timeframe)
      default:
        // Fallback to revenue data
        return await this.dataIntegrator.fetchRevenueData(timeframe)
    }
  }

  private parseTimeframe(timeframe: string): DateRange {
    const now = new Date()
    let start: Date

    switch (timeframe) {
      case '7d':
        start = subDays(now, 7)
        break
      case '30d':
        start = subDays(now, 30)
        break
      case '90d':
        start = subDays(now, 90)
        break
      case '1y':
        start = subDays(now, 365)
        break
      default:
        start = subDays(now, 30) // Default to 30 days
    }

    return {
      start: startOfDay(start),
      end: endOfDay(now)
    }
  }

  private getDefaultTimeframe(): DateRange {
    return this.parseTimeframe('30d')
  }

  private formatTimeframe(timeframe: DateRange): string {
    const days = Math.ceil((timeframe.end.getTime() - timeframe.start.getTime()) / (1000 * 60 * 60 * 24))
    return `${days}d`
  }

  private groupDataBySource(data: MetricData[]): Map<string, MetricData[]> {
    const grouped = new Map<string, MetricData[]>()
    
    data.forEach(point => {
      if (!grouped.has(point.source)) {
        grouped.set(point.source, [])
      }
      grouped.get(point.source)!.push(point)
    })

    return grouped
  }

  private deduplicateOutliers(outliers: any[]): any[] {
    const seen = new Set<string>()
    return outliers.filter(outlier => {
      const key = `${outlier.date.toISOString()}_${outlier.value}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private async createTrendInsight(
    trendResult: any,
    data: MetricData[],
    metricName: string,
    context: AnalysisContext
  ): Promise<TrendInsight | null> {
    if (!this.languageGenerator) return null

    try {
      const insight: TrendInsight = {
        id: uuidv4(),
        organizationId: this.organizationId,
        type: 'trend',
        title: `${metricName.charAt(0).toUpperCase() + metricName.slice(1)} Trend Analysis`,
        description: this.languageGenerator.generateTrendNarrative(trendResult, metricName),
        recommendation: this.generateTrendRecommendation(trendResult, metricName),
        impactScore: this.calculateTrendImpactScore(trendResult, data),
        confidence: trendResult.rSquared,
        affectedMetrics: [metricName],
        timeframe: trendResult.timeframe,
        dataPoints: data.length,
        createdAt: new Date(),
        metadata: {
          source: 'trend_analysis',
          algorithm: 'linear_regression',
          version: '1.0',
          parameters: { slope: trendResult.slope, rSquared: trendResult.rSquared },
          dataQuality: 0.9,
          trendDirection: trendResult.direction,
          trendStrength: trendResult.strength
        },
        trendData: trendResult
      }

      return insight
    } catch (error) {
      console.error('Error creating trend insight:', error)
      return null
    }
  }

  private async createAnomalyInsight(
    outlier: any,
    data: MetricData[],
    metricName: string,
    context: AnalysisContext
  ): Promise<AnomalyInsight | null> {
    if (!this.languageGenerator) return null

    try {
      const insight: AnomalyInsight = {
        id: uuidv4(),
        organizationId: this.organizationId,
        type: 'anomaly',
        title: `${metricName.charAt(0).toUpperCase() + metricName.slice(1)} Anomaly Detected`,
        description: this.languageGenerator.generateAnomalyAlert(outlier, data, metricName),
        recommendation: this.generateAnomalyRecommendation(outlier, metricName),
        impactScore: this.calculateAnomalyImpactScore(outlier),
        confidence: outlier.confidence,
        affectedMetrics: [metricName],
        timeframe: '1d',
        dataPoints: 1,
        createdAt: new Date(),
        metadata: {
          source: 'anomaly_detection',
          algorithm: outlier.method,
          version: '1.0',
          parameters: { severity: outlier.severity, deviation: outlier.deviation },
          dataQuality: 0.8
        },
        anomalyData: outlier,
        historicalContext: data
      }

      return insight
    } catch (error) {
      console.error('Error creating anomaly insight:', error)
      return null
    }
  }

  private async createForecastInsight(
    forecast: any,
    data: MetricData[],
    context: AnalysisContext
  ): Promise<TrendInsight | null> {
    if (!this.languageGenerator) return null

    try {
      const insight: TrendInsight = {
        id: uuidv4(),
        organizationId: this.organizationId,
        type: 'trend',
        title: 'Revenue Forecast',
        description: this.languageGenerator.generateForecastNarrative(forecast, 'revenue'),
        recommendation: this.generateForecastRecommendation(forecast),
        impactScore: Math.min(10, forecast.accuracy * 10),
        confidence: forecast.confidence,
        affectedMetrics: ['revenue'],
        timeframe: '7d',
        dataPoints: forecast.predictions.length,
        createdAt: new Date(),
        metadata: {
          source: 'forecasting',
          algorithm: forecast.method,
          version: '1.0',
          parameters: { accuracy: forecast.accuracy, method: forecast.method },
          dataQuality: 0.8
        },
        trendData: {
          slope: 0,
          intercept: 0,
          rSquared: forecast.confidence,
          pValue: 0.05,
          significance: 'medium',
          direction: 'stable',
          strength: 'moderate',
          dataPoints: data.length,
          timeframe: '7d',
          confidenceInterval: { lower: 0, upper: 0 }
        },
        forecastData: forecast
      }

      return insight
    } catch (error) {
      console.error('Error creating forecast insight:', error)
      return null
    }
  }

  private async scoreAndPrioritizeInsights(
    insights: InsightData[],
    context: AnalysisContext
  ): Promise<InsightData[]> {
    if (!this.impactScorer || !this.businessContext) return insights

    try {
      // Calculate business metrics
      const revenueData = await this.dataIntegrator.fetchRevenueData(context.timeframe)
      const businessMetrics: BusinessMetrics = {
        monthlyRevenue: this.businessContext.monthlyRevenue || 0,
        monthlyOrders: revenueData.length,
        averageOrderValue: revenueData.length > 0 ? mean(revenueData.map(d => d.value)) || 0 : 0,
        customerAcquisitionCost: 50, // Default value
        customerLifetimeValue: 200, // Default value
        monthlyActiveUsers: 100, // Default value
        conversionRate: 2.5, // Default value
        growthRate: 10 // Default value
      }

      // Create time context
      const timeContext: TimeContext = {
        currentDate: new Date(),
        businessCycle: 'growth',
        seasonalContext: 'shoulder_season'
      }

      // Score insights
      const scoredInsights = this.impactScorer.scoreInsightsBatch(insights, businessMetrics, timeContext)
      
      return scoredInsights.map(scored => ({
        id: scored.id,
        organizationId: scored.organizationId,
        type: scored.type,
        title: scored.title,
        description: scored.description,
        recommendation: scored.recommendation,
        impactScore: scored.overallScore,
        confidence: scored.confidence,
        affectedMetrics: scored.affectedMetrics,
        timeframe: scored.timeframe,
        dataPoints: scored.dataPoints,
        createdAt: scored.createdAt,
        metadata: {
          ...scored.metadata,
          priorityReasoning: scored.reasoning,
          priority: scored.priority
        }
      }))

    } catch (error) {
      console.error('Error scoring insights:', error)
      return insights
    }
  }

  private applyInsightFilters(insights: InsightData[], options?: InsightGenerationOptions): InsightData[] {
    let filtered = insights

    // Filter by confidence threshold
    if (options?.minConfidence) {
      filtered = filtered.filter(i => i.confidence >= options.minConfidence!)
    }

    // Filter by metrics
    if (options?.metrics && options.metrics.length > 0) {
      filtered = filtered.filter(i => 
        i.affectedMetrics.some(metric => options.metrics!.includes(metric))
      )
    }

    // Limit number of results
    if (options?.maxInsights) {
      filtered = filtered.slice(0, options.maxInsights)
    }

    // Sort by impact score
    return filtered.sort((a, b) => b.impactScore - a.impactScore)
  }

  // Additional helper methods for insight generation
  private generateTrendRecommendation(trendResult: any, metricName: string): string {
    if (trendResult.direction === 'increasing') {
      return `Your ${metricName} is trending upward. Consider scaling successful strategies to maintain momentum.`
    } else if (trendResult.direction === 'decreasing') {
      return `Your ${metricName} is declining. Review and adjust your current strategies to reverse this trend.`
    }
    return `Your ${metricName} is stable. Look for opportunities to drive growth.`
  }

  private generateAnomalyRecommendation(outlier: any, metricName: string): string {
    if (outlier.severity === 'critical') {
      return `Immediate investigation required for this ${metricName} anomaly.`
    } else if (outlier.severity === 'high') {
      return `Schedule urgent review of this ${metricName} anomaly.`
    }
    return `Monitor this ${metricName} anomaly and track for patterns.`
  }

  private generateForecastRecommendation(forecast: any): string {
    const trend = forecast.predictions.length > 1 
      ? forecast.predictions[forecast.predictions.length - 1].predicted > forecast.predictions[0].predicted ? 'upward' : 'downward'
      : 'stable'
    
    if (trend === 'upward') {
      return 'Prepare for increased demand by scaling operations and marketing efforts.'
    } else if (trend === 'downward') {
      return 'Plan for lower volume by focusing on efficiency and customer retention.'
    }
    return 'Stable forecast allows for strategic planning and optimization.'
  }

  private calculateTrendImpactScore(trendResult: any, data: MetricData[]): number {
    const strengthMultiplier = trendResult.strength === 'strong' ? 1.5 : trendResult.strength === 'moderate' ? 1.0 : 0.5
    const confidenceMultiplier = trendResult.rSquared
    const dataQualityMultiplier = Math.min(1, data.length / 30)
    
    return Math.min(10, Math.max(1, 5 * strengthMultiplier * confidenceMultiplier * dataQualityMultiplier))
  }

  private calculateAnomalyImpactScore(outlier: any): number {
    const severityScores = { critical: 10, high: 8, medium: 6, low: 4 }
    return severityScores[outlier.severity as keyof typeof severityScores] || 5
  }

  private generateChannelComparisons(channels: ChannelData[]): any[] {
    // Simplified channel comparison logic
    return channels.map((channel, index) => ({
      channelA: channel,
      channelB: channels[(index + 1) % channels.length],
      metrics: {
        revenue: { difference: 0, percentDifference: 0, winner: channel.name },
        roi: { difference: 0, percentDifference: 0, winner: channel.name }
      },
      winner: channel.name,
      recommendation: `Optimize ${channel.name} performance`
    }))
  }

  private generateChannelRecommendationText(recommendations: any[]): string {
    if (recommendations.length === 0) return 'No specific channel recommendations at this time.'
    
    const topRecommendation = recommendations[0]
    return `Focus on ${topRecommendation.channel}: ${topRecommendation.reason}`
  }

  private calculateChannelImpactScore(recommendations: any[]): number {
    if (recommendations.length === 0) return 5
    
    const avgImpact = mean(recommendations.map(r => r.expectedImpact)) || 0
    return Math.min(10, Math.max(1, avgImpact / 1000)) // Normalize to 1-10 scale
  }

  private async generateSeasonalRecommendations(
    revenueData: MetricData[],
    context: AnalysisContext
  ): Promise<RecommendationInsight[]> {
    if (!this.businessIntelligence || !this.configuration.enableSeasonalityDetection) {
      return []
    }

    try {
      const seasonalResult = this.statisticalAnalyzer.calculateSeasonality(revenueData)
      if (!seasonalResult || !seasonalResult.isDetected) return []

      const seasonalInsights = this.businessIntelligence.generateSeasonalRecommendations(seasonalResult, new Date())
      
      return seasonalInsights.map(insight => ({
        ...insight,
        type: 'recommendation' as const,
        actionItems: this.convertToActionItems(insight.preparationSteps || []),
        expectedImpact: {
          revenueImpact: {
            monthly: insight.impactScore * 1000,
            confidence: insight.confidence
          },
          timeToImpact: 'seasonal',
          riskLevel: 'low' as const,
          successProbability: insight.confidence
        },
        implementationDifficulty: 'medium' as const,
        timeframe: 'medium_term' as const
      }))
    } catch (error) {
      console.error('Error generating seasonal recommendations:', error)
      return []
    }
  }

  private convertToActionItems(steps: string[]): any[] {
    return steps.map((step, index) => ({
      id: `action_${index}`,
      title: step,
      description: step,
      priority: index === 0 ? 'high' as const : 'medium' as const,
      category: 'marketing' as const,
      measurementKpis: ['revenue', 'orders']
    }))
  }

  private assessImplementationDifficulty(steps: string[]): 'easy' | 'medium' | 'hard' {
    if (steps.length <= 2) return 'easy'
    if (steps.length <= 4) return 'medium'
    return 'hard'
  }

  private mapOpportunityTimeframe(opportunityType: string): 'immediate' | 'short_term' | 'medium_term' | 'long_term' {
    const timeframeMap: Record<string, 'immediate' | 'short_term' | 'medium_term' | 'long_term'> = {
      cross_sell: 'short_term',
      upsell: 'short_term',
      retention: 'immediate',
      acquisition: 'medium_term',
      optimization: 'long_term'
    }
    
    return timeframeMap[opportunityType] || 'medium_term'
  }

  // Cleanup method
  destroy(): void {
    this.cacheManager.destroy()
    this.activeJobs.clear()
  }
}