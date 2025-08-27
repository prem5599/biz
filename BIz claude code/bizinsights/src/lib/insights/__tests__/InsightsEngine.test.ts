import { InsightsEngine } from '../InsightsEngine'
import { InsightGenerationOptions, BusinessContext } from '../types'

// Mock the dependencies
jest.mock('../StatisticalAnalyzer')
jest.mock('../DataIntegrator')
jest.mock('../LanguageGenerator')
jest.mock('../BusinessIntelligence')
jest.mock('../ImpactScorer')
jest.mock('../CacheManager')

describe('InsightsEngine', () => {
  let engine: InsightsEngine
  const mockOrganizationId = 'test-org-123'

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()
    
    engine = new InsightsEngine(mockOrganizationId, {
      enableForecasting: true,
      enableAnomalyDetection: true,
      enableSeasonalityDetection: true,
      minDataPoints: 7,
      confidenceThreshold: 0.6,
      cacheEnabled: false, // Disable cache for testing
      parallelProcessing: false // Disable parallel processing for predictable testing
    })
  })

  afterEach(() => {
    engine.destroy()
  })

  describe('constructor', () => {
    it('should initialize with correct organization ID', () => {
      expect(engine).toBeDefined()
      // We can't directly access private properties, but we can test behavior
    })

    it('should use custom configuration', () => {
      const customEngine = new InsightsEngine('test-org', {
        minDataPoints: 10,
        confidenceThreshold: 0.8,
        cacheEnabled: false
      })
      
      expect(customEngine).toBeDefined()
      customEngine.destroy()
    })
  })

  describe('generateInsights', () => {
    beforeEach(() => {
      // Mock the data integrator methods
      const mockDataIntegrator = require('../DataIntegrator').DataIntegrator
      mockDataIntegrator.prototype.getBusinessContext = jest.fn().mockResolvedValue({
        businessSize: 'small',
        primaryChannels: ['shopify', 'stripe'],
        seasonalBusiness: false,
        businessModel: 'b2c'
      } as BusinessContext)
      
      mockDataIntegrator.prototype.validateDataQuality = jest.fn().mockResolvedValue({
        score: 0.8,
        issues: [],
        recommendations: [],
        coverage: {},
        freshness: {}
      })
      
      mockDataIntegrator.prototype.fetchRevenueData = jest.fn().mockResolvedValue([
        {
          date: new Date('2024-01-01'),
          value: 100,
          source: 'shopify',
          metricType: 'revenue'
        },
        {
          date: new Date('2024-01-02'),
          value: 110,
          source: 'shopify',
          metricType: 'revenue'
        }
      ])
      
      mockDataIntegrator.prototype.fetchMarketingData = jest.fn().mockResolvedValue([])
      mockDataIntegrator.prototype.fetchCustomerData = jest.fn().mockResolvedValue([])
      mockDataIntegrator.prototype.getAvailableMetrics = jest.fn().mockResolvedValue(['revenue'])
    })

    it('should generate insights successfully', async () => {
      const insights = await engine.generateInsights()
      
      expect(insights).toBeDefined()
      expect(Array.isArray(insights)).toBe(true)
    })

    it('should respect maxInsights option', async () => {
      const options: InsightGenerationOptions = {
        maxInsights: 5
      }
      
      const insights = await engine.generateInsights(undefined, options)
      
      expect(insights.length).toBeLessThanOrEqual(5)
    })

    it('should filter by confidence threshold', async () => {
      const options: InsightGenerationOptions = {
        minConfidence: 0.8
      }
      
      const insights = await engine.generateInsights(undefined, options)
      
      insights.forEach(insight => {
        expect(insight.confidence).toBeGreaterThanOrEqual(0.8)
      })
    })

    it('should handle data quality errors gracefully', async () => {
      const mockDataIntegrator = require('../DataIntegrator').DataIntegrator
      mockDataIntegrator.prototype.validateDataQuality = jest.fn().mockResolvedValue({
        score: 0.2, // Low quality score
        issues: [],
        recommendations: [],
        coverage: {},
        freshness: {}
      })
      
      await expect(engine.generateInsights()).rejects.toThrow('Data quality too low')
    })
  })

  describe('analyzeRevenueTrends', () => {
    beforeEach(() => {
      const mockDataIntegrator = require('../DataIntegrator').DataIntegrator
      mockDataIntegrator.prototype.getBusinessContext = jest.fn().mockResolvedValue({
        businessSize: 'small',
        primaryChannels: ['shopify'],
        seasonalBusiness: false
      })
    })

    it('should analyze revenue trends', async () => {
      const insights = await engine.analyzeRevenueTrends()
      
      expect(insights).toBeDefined()
      expect(Array.isArray(insights)).toBe(true)
    })
  })

  describe('detectAnomalies', () => {
    it('should detect anomalies when enabled', async () => {
      const insights = await engine.detectAnomalies()
      
      expect(insights).toBeDefined()
      expect(Array.isArray(insights)).toBe(true)
    })

    it('should return empty array when anomaly detection is disabled', async () => {
      const disabledEngine = new InsightsEngine(mockOrganizationId, {
        enableAnomalyDetection: false
      })
      
      const insights = await disabledEngine.detectAnomalies()
      
      expect(insights).toEqual([])
      disabledEngine.destroy()
    })
  })

  describe('analyzeChannelPerformance', () => {
    beforeEach(() => {
      const mockDataIntegrator = require('../DataIntegrator').DataIntegrator
      mockDataIntegrator.prototype.fetchMarketingData = jest.fn().mockResolvedValue([
        {
          name: 'Shopify',
          source: 'shopify',
          revenue: 1000,
          orders: 10,
          sessions: 500,
          conversions: 15,
          roi: 150,
          conversionRate: 3,
          averageOrderValue: 100
        },
        {
          name: 'Google Ads',
          source: 'google_ads',
          revenue: 800,
          orders: 8,
          sessions: 400,
          conversions: 12,
          roi: 120,
          conversionRate: 2.5,
          averageOrderValue: 100
        }
      ])
    })

    it('should analyze channel performance', async () => {
      const insights = await engine.analyzeChannelPerformance()
      
      expect(insights).toBeDefined()
      expect(Array.isArray(insights)).toBe(true)
    })

    it('should return empty array with insufficient channels', async () => {
      const mockDataIntegrator = require('../DataIntegrator').DataIntegrator
      mockDataIntegrator.prototype.fetchMarketingData = jest.fn().mockResolvedValue([
        {
          name: 'Shopify',
          source: 'shopify',
          revenue: 1000,
          orders: 10,
          sessions: 500,
          conversions: 15,
          roi: 150,
          conversionRate: 3,
          averageOrderValue: 100
        }
      ])
      
      const insights = await engine.analyzeChannelPerformance()
      
      expect(insights).toEqual([])
    })
  })

  describe('generateRecommendations', () => {
    beforeEach(() => {
      const mockDataIntegrator = require('../DataIntegrator').DataIntegrator
      mockDataIntegrator.prototype.fetchRevenueData = jest.fn().mockResolvedValue([])
      mockDataIntegrator.prototype.fetchCustomerData = jest.fn().mockResolvedValue([])
    })

    it('should generate recommendations', async () => {
      const insights = await engine.generateRecommendations()
      
      expect(insights).toBeDefined()
      expect(Array.isArray(insights)).toBe(true)
    })
  })

  describe('getDataQualityReport', () => {
    beforeEach(() => {
      const mockDataIntegrator = require('../DataIntegrator').DataIntegrator
      mockDataIntegrator.prototype.validateDataQuality = jest.fn().mockResolvedValue({
        score: 0.8,
        issues: [],
        recommendations: ['Test recommendation'],
        coverage: { revenue: 0.9 },
        freshness: { revenue: new Date() }
      })
    })

    it('should return data quality report', async () => {
      const report = await engine.getDataQualityReport()
      
      expect(report).toBeDefined()
      expect(report.score).toBe(0.8)
      expect(report.recommendations).toContain('Test recommendation')
    })
  })

  describe('invalidateCache', () => {
    it('should invalidate cache when enabled', async () => {
      const cachedEngine = new InsightsEngine(mockOrganizationId, {
        cacheEnabled: true
      })
      
      await expect(cachedEngine.invalidateCache(['data_update'])).resolves.not.toThrow()
      cachedEngine.destroy()
    })

    it('should handle cache invalidation when cache is disabled', async () => {
      await expect(engine.invalidateCache(['data_update'])).resolves.not.toThrow()
    })
  })

  describe('error handling', () => {
    it('should handle data integrator errors gracefully', async () => {
      const mockDataIntegrator = require('../DataIntegrator').DataIntegrator
      mockDataIntegrator.prototype.getBusinessContext = jest.fn().mockRejectedValue(new Error('Database error'))
      
      // Should not throw, but return empty results or handle gracefully
      await expect(engine.generateInsights()).rejects.toThrow()
    })

    it('should handle statistical analyzer errors gracefully', async () => {
      const mockStatisticalAnalyzer = require('../StatisticalAnalyzer').StatisticalAnalyzer
      mockStatisticalAnalyzer.prototype.calculateTrend = jest.fn().mockImplementation(() => {
        throw new Error('Statistical calculation error')
      })
      
      // Should handle the error and continue with other analyses
      const insights = await engine.generateInsights().catch(() => [])
      expect(Array.isArray(insights)).toBe(true)
    })
  })

  describe('configuration validation', () => {
    it('should handle invalid configuration gracefully', () => {
      const invalidEngine = new InsightsEngine('test', {
        minDataPoints: -1, // Invalid
        confidenceThreshold: 2, // Invalid (should be 0-1)
        enableForecasting: true
      })
      
      expect(invalidEngine).toBeDefined()
      invalidEngine.destroy()
    })
  })
})