import { InsightType } from '@prisma/client'

export interface InsightData {
  id: string
  organizationId: string
  type: 'trend' | 'anomaly' | 'performance' | 'recommendation' | 'alert'
  title: string
  description: string
  recommendation: string
  impactScore: number // 1-10 scale
  confidence: number // 0-1 statistical confidence
  affectedMetrics: string[]
  timeframe: string
  dataPoints: number
  createdAt: Date
  metadata: InsightMetadata
}

export interface InsightMetadata {
  source: string
  algorithm: string
  version: string
  parameters: Record<string, any>
  dataQuality: number // 0-1 score
  statisticalSignificance?: number
  pValue?: number
  rSquared?: number
  seasonalityDetected?: boolean
  outlierMethod?: 'zscore' | 'iqr' | 'isolation_forest'
  trendDirection?: 'up' | 'down' | 'stable'
  trendStrength?: 'weak' | 'moderate' | 'strong'
  correlationStrength?: number
}

export interface MetricData {
  date: Date
  value: number
  source: 'shopify' | 'stripe' | 'google_analytics' | 'facebook_ads'
  metricType: 'revenue' | 'orders' | 'sessions' | 'conversions' | 'customers' | 'traffic'
  metadata?: Record<string, any>
}

export interface BusinessContext {
  industry?: string
  businessSize: 'micro' | 'small' | 'medium'
  monthlyRevenue?: number
  primaryChannels: string[]
  seasonalBusiness: boolean
  foundedDate?: Date
  employeeCount?: number
  targetMarket?: string
  businessModel?: 'b2b' | 'b2c' | 'marketplace' | 'saas' | 'subscription'
}

export interface TrendResult {
  slope: number
  intercept: number
  rSquared: number
  pValue: number
  significance: 'high' | 'medium' | 'low' | 'none'
  direction: 'increasing' | 'decreasing' | 'stable'
  strength: 'strong' | 'moderate' | 'weak'
  projectedValue?: number
  confidenceInterval: {
    lower: number
    upper: number
  }
  dataPoints: number
  timeframe: string
}

export interface OutlierResult {
  date: Date
  value: number
  expectedValue: number
  deviation: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  method: 'zscore' | 'iqr' | 'isolation_forest'
  confidence: number
  context: string
}

export interface SignificanceResult {
  isSignificant: boolean
  pValue: number
  confidenceLevel: number
  effectSize: number
  interpretation: string
}

export interface CorrelationResult {
  coefficient: number
  pValue: number
  significance: 'high' | 'medium' | 'low' | 'none'
  strength: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak'
  direction: 'positive' | 'negative'
  interpretation: string
}

export interface SeasonalityResult {
  isDetected: boolean
  period: number
  strength: number
  confidence: number
  patterns: SeasonalPattern[]
  nextPeak?: Date
  nextTrough?: Date
}

export interface SeasonalPattern {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  strength: number
  phase: number
  amplitude: number
}

export interface TrendInsight extends InsightData {
  type: 'trend'
  trendData: TrendResult
  forecastData?: ForecastData
}

export interface AnomalyInsight extends InsightData {
  type: 'anomaly'
  anomalyData: OutlierResult
  historicalContext: MetricData[]
}

export interface PerformanceInsight extends InsightData {
  type: 'performance'
  channelComparison: ChannelComparison[]
  topPerformer: ChannelData
  recommendations: ChannelRecommendation[]
}

export interface RecommendationInsight extends InsightData {
  type: 'recommendation'
  actionItems: ActionItem[]
  expectedImpact: ImpactEstimate
  implementationDifficulty: 'easy' | 'medium' | 'hard'
  timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term'
}

export interface ChannelData {
  name: string
  source: string
  revenue: number
  orders: number
  sessions: number
  conversions: number
  spend?: number
  roi?: number
  conversionRate: number
  averageOrderValue: number
  customerAcquisitionCost?: number
  lifetimeValue?: number
  period: DateRange
}

export interface ChannelComparison {
  channelA: ChannelData
  channelB: ChannelData
  metrics: {
    revenue: ComparisonResult
    roi: ComparisonResult
    conversionRate: ComparisonResult
    averageOrderValue: ComparisonResult
  }
  winner: string
  recommendation: string
}

export interface ComparisonResult {
  difference: number
  percentDifference: number
  significance: SignificanceResult
  winner: string
}

export interface ChannelRecommendation {
  channel: string
  action: 'increase_budget' | 'decrease_budget' | 'optimize' | 'pause' | 'test'
  reason: string
  expectedImpact: number
  confidence: number
  timeframe: string
}

export interface ActionItem {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  category: 'marketing' | 'product' | 'operations' | 'finance' | 'customer_service'
  estimatedHours?: number
  requiredSkills?: string[]
  dependencies?: string[]
  measurementKpis: string[]
}

export interface ImpactEstimate {
  revenueImpact: {
    monthly: number
    confidence: number
  }
  timeToImpact: string
  riskLevel: 'low' | 'medium' | 'high'
  successProbability: number
}

export interface DateRange {
  start: Date
  end: Date
}

export interface BusinessMetrics {
  monthlyRevenue: number
  monthlyOrders: number
  averageOrderValue: number
  customerAcquisitionCost: number
  customerLifetimeValue: number
  monthlyActiveUsers: number
  conversionRate: number
  churnRate?: number
  growthRate: number
}

export interface TimeContext {
  currentDate: Date
  businessCycle: 'peak' | 'growth' | 'decline' | 'recovery'
  seasonalContext: 'high_season' | 'low_season' | 'shoulder_season'
  competitiveEvents?: string[]
  marketConditions?: 'favorable' | 'neutral' | 'challenging'
}

export interface ImpactComponents {
  revenueImpact: number
  urgencyScore: number
  implementationScore: number
  confidenceLevel: number
}

export interface CustomerData {
  customerId: string
  acquisitionDate: Date
  totalRevenue: number
  orderCount: number
  averageOrderValue: number
  lastOrderDate: Date
  acquisitionChannel: string
  segment?: string
  lifetimeValue?: number
}

export interface OrderData {
  orderId: string
  customerId: string
  orderDate: Date
  totalValue: number
  itemCount: number
  channel: string
  isFirstOrder: boolean
  paymentMethod?: string
  shippingMethod?: string
  region?: string
}

export interface OpportunityInsight extends InsightData {
  type: 'recommendation'
  opportunityType: 'cross_sell' | 'upsell' | 'retention' | 'acquisition' | 'optimization'
  targetSegment: string
  potentialRevenue: number
  implementationSteps: string[]
}

export interface CustomerInsight extends InsightData {
  type: 'performance'
  segment: string
  behaviors: CustomerBehavior[]
  retentionRate: number
  lifetimeValue: number
  recommendations: string[]
}

export interface CustomerBehavior {
  behavior: string
  frequency: number
  impact: 'positive' | 'negative' | 'neutral'
  trend: 'increasing' | 'decreasing' | 'stable'
}

export interface SeasonalInsight extends InsightData {
  type: 'trend'
  season: string
  historicalPattern: SeasonalityResult
  preparationSteps: string[]
  inventoryRecommendations?: string[]
  marketingRecommendations?: string[]
}

export interface ForecastData {
  predictions: ForecastPoint[]
  method: 'linear' | 'exponential' | 'seasonal' | 'arima'
  accuracy: number
  confidence: number
  assumptions: string[]
}

export interface ForecastPoint {
  date: Date
  predicted: number
  lower: number
  upper: number
  confidence: number
}

export interface CacheEntry<T> {
  data: T
  timestamp: Date
  expiresAt: Date
  tags: string[]
}

export interface InsightGenerationOptions {
  timeframe?: DateRange
  metrics?: string[]
  includeForecasts?: boolean
  includeRecommendations?: boolean
  minConfidence?: number
  maxInsights?: number
  priorityMetrics?: string[]
}

export interface DataQualityReport {
  score: number // 0-1
  issues: DataQualityIssue[]
  recommendations: string[]
  coverage: Record<string, number>
  freshness: Record<string, Date>
}

export interface DataQualityIssue {
  type: 'missing_data' | 'inconsistent_format' | 'outliers' | 'stale_data'
  severity: 'low' | 'medium' | 'high'
  description: string
  affectedMetrics: string[]
  suggestedFix?: string
}

export interface InsightFeedback {
  insightId: string
  userId: string
  rating: 1 | 2 | 3 | 4 | 5
  helpful: boolean
  implemented: boolean
  feedback?: string
  timestamp: Date
}

export interface EngineConfiguration {
  minDataPoints: number
  confidenceThreshold: number
  significanceLevel: number
  cacheEnabled: boolean
  cacheTtl: number
  parallelProcessing: boolean
  enableForecasting: boolean
  enableAnomalyDetection: boolean
  enableSeasonalityDetection: boolean
}

export interface AnalysisContext {
  organizationId: string
  businessContext: BusinessContext
  timeframe: DateRange
  availableData: string[]
  configuration: EngineConfiguration
}

export type InsightGenerationStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface InsightGenerationJob {
  id: string
  organizationId: string
  status: InsightGenerationStatus
  progress: number
  startedAt: Date
  completedAt?: Date
  error?: string
  results?: InsightData[]
  options: InsightGenerationOptions
}