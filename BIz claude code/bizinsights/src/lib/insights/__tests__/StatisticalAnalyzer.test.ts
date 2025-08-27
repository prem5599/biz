import { StatisticalAnalyzer } from '../StatisticalAnalyzer'
import { MetricData } from '../types'

describe('StatisticalAnalyzer', () => {
  let analyzer: StatisticalAnalyzer
  let mockData: MetricData[]

  beforeEach(() => {
    analyzer = new StatisticalAnalyzer()
    
    // Create mock data with clear upward trend
    mockData = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2024, 0, i + 1),
      value: 100 + (i * 5) + (Math.random() * 10 - 5), // Base 100 + 5 per day + noise
      source: 'shopify' as const,
      metricType: 'revenue' as const,
      metadata: { test: true }
    }))
  })

  describe('calculateTrend', () => {
    it('should detect upward trend in growing data', () => {
      const result = analyzer.calculateTrend(mockData)
      
      expect(result).not.toBeNull()
      expect(result!.direction).toBe('increasing')
      expect(result!.slope).toBeGreaterThan(0)
      expect(result!.rSquared).toBeGreaterThan(0.5)
      expect(result!.dataPoints).toBe(30)
    })

    it('should detect downward trend in declining data', () => {
      const decliningData = mockData.map((point, i) => ({
        ...point,
        value: 200 - (i * 3) + (Math.random() * 8 - 4) // Declining trend
      }))

      const result = analyzer.calculateTrend(decliningData)
      
      expect(result).not.toBeNull()
      expect(result!.direction).toBe('decreasing')
      expect(result!.slope).toBeLessThan(0)
    })

    it('should return null for insufficient data', () => {
      const insufficientData = mockData.slice(0, 5) // Less than minimum 7 points
      const result = analyzer.calculateTrend(insufficientData)
      
      expect(result).toBeNull()
    })

    it('should detect stable trend in flat data', () => {
      const flatData = mockData.map(point => ({
        ...point,
        value: 100 + (Math.random() * 4 - 2) // Minimal variation around 100
      }))

      const result = analyzer.calculateTrend(flatData)
      
      expect(result).not.toBeNull()
      expect(result!.direction).toBe('stable')
      expect(Math.abs(result!.slope)).toBeLessThan(0.1)
    })
  })

  describe('detectOutliers', () => {
    it('should detect outliers using z-score method', () => {
      // Add clear outliers to the data
      const dataWithOutliers = [...mockData]
      dataWithOutliers[10] = { ...dataWithOutliers[10], value: 1000 } // High outlier
      dataWithOutliers[20] = { ...dataWithOutliers[20], value: 10 }   // Low outlier

      const outliers = analyzer.detectOutliers(dataWithOutliers, 'zscore')
      
      expect(outliers.length).toBeGreaterThan(0)
      expect(outliers.some(o => o.value === 1000)).toBe(true)
      expect(outliers.some(o => o.value === 10)).toBe(true)
      expect(outliers.every(o => o.method === 'zscore')).toBe(true)
    })

    it('should detect outliers using IQR method', () => {
      const dataWithOutliers = [...mockData]
      dataWithOutliers[15] = { ...dataWithOutliers[15], value: 500 }

      const outliers = analyzer.detectOutliers(dataWithOutliers, 'iqr')
      
      expect(outliers.length).toBeGreaterThan(0)
      expect(outliers.every(o => o.method === 'iqr')).toBe(true)
    })

    it('should return empty array for insufficient data', () => {
      const insufficientData = mockData.slice(0, 3)
      const outliers = analyzer.detectOutliers(insufficientData, 'zscore')
      
      expect(outliers).toEqual([])
    })

    it('should return empty array for data without outliers', () => {
      const cleanData = mockData.map((point, i) => ({
        ...point,
        value: 100 + (i * 0.1) // Very stable trend, no outliers
      }))

      const outliers = analyzer.detectOutliers(cleanData, 'zscore')
      
      expect(outliers.length).toBe(0)
    })
  })

  describe('calculateSignificance', () => {
    it('should detect significant increase', () => {
      const result = analyzer.calculateSignificance(120, 100, 25) // 20% increase
      
      expect(result.isSignificant).toBe(true)
      expect(result.pValue).toBeLessThan(0.05)
      expect(result.effectSize).toBeGreaterThan(0)
      expect(result.interpretation).toContain('significant')
    })

    it('should detect non-significant change', () => {
      const result = analyzer.calculateSignificance(102, 100, 100) // Small change, high variance
      
      expect(result.isSignificant).toBe(false)
      expect(result.pValue).toBeGreaterThan(0.05)
    })

    it('should handle zero baseline gracefully', () => {
      const result = analyzer.calculateSignificance(100, 0, 25)
      
      expect(result.isSignificant).toBe(false)
      expect(result.interpretation).toContain('Cannot calculate')
    })

    it('should handle zero variance gracefully', () => {
      const result = analyzer.calculateSignificance(120, 100, 0)
      
      expect(result.isSignificant).toBe(false)
      expect(result.interpretation).toContain('Cannot calculate')
    })
  })

  describe('performCorrelationAnalysis', () => {
    it('should detect positive correlation', () => {
      const dataset2 = mockData.map(point => ({
        ...point,
        value: point.value * 0.8 + 50 // Positively correlated
      }))

      const result = analyzer.performCorrelationAnalysis(mockData, dataset2)
      
      expect(result).not.toBeNull()
      expect(result!.coefficient).toBeGreaterThan(0.5)
      expect(result!.direction).toBe('positive')
      expect(result!.strength).toMatch(/strong|very_strong/)
    })

    it('should detect negative correlation', () => {
      const dataset2 = mockData.map(point => ({
        ...point,
        value: 300 - point.value * 0.5 // Negatively correlated
      }))

      const result = analyzer.performCorrelationAnalysis(mockData, dataset2)
      
      expect(result).not.toBeNull()
      expect(result!.coefficient).toBeLessThan(-0.3)
      expect(result!.direction).toBe('negative')
    })

    it('should return null for insufficient data', () => {
      const smallDataset = mockData.slice(0, 3)
      const result = analyzer.performCorrelationAnalysis(smallDataset, smallDataset)
      
      expect(result).toBeNull()
    })
  })

  describe('calculateSeasonality', () => {
    it('should detect weekly seasonality', () => {
      // Create data with clear weekly pattern
      const weeklyData = Array.from({ length: 56 }, (_, i) => ({
        date: new Date(2024, 0, i + 1),
        value: 100 + (Math.sin(i * 2 * Math.PI / 7) * 20), // 7-day cycle
        source: 'shopify' as const,
        metricType: 'revenue' as const
      }))

      const result = analyzer.calculateSeasonality(weeklyData, 7)
      
      expect(result).not.toBeNull()
      expect(result!.isDetected).toBe(true)
      expect(result!.period).toBe(7)
      expect(result!.strength).toBeGreaterThan(0.3)
    })

    it('should return null for insufficient data', () => {
      const insufficientData = mockData.slice(0, 20) // Less than minimum 30 points
      const result = analyzer.calculateSeasonality(insufficientData, 7)
      
      expect(result).toBeNull()
    })

    it('should not detect seasonality in random data', () => {
      const randomData = Array.from({ length: 50 }, (_, i) => ({
        date: new Date(2024, 0, i + 1),
        value: Math.random() * 100,
        source: 'shopify' as const,
        metricType: 'revenue' as const
      }))

      const result = analyzer.calculateSeasonality(randomData, 7)
      
      expect(result).not.toBeNull()
      expect(result!.isDetected).toBe(false)
      expect(result!.strength).toBeLessThan(0.3)
    })
  })

  describe('generateForecast', () => {
    it('should generate forecast for trending data', () => {
      const result = analyzer.generateForecast(mockData, 7)
      
      expect(result).not.toBeNull()
      expect(result!.predictions).toHaveLength(7)
      expect(result!.method).toBeDefined()
      expect(result!.accuracy).toBeGreaterThan(0)
      expect(result!.confidence).toBeGreaterThan(0)
      
      // Check that predictions have required fields
      result!.predictions.forEach(prediction => {
        expect(prediction.date).toBeInstanceOf(Date)
        expect(prediction.predicted).toBeGreaterThan(0)
        expect(prediction.lower).toBeDefined()
        expect(prediction.upper).toBeDefined()
        expect(prediction.confidence).toBeDefined()
      })
    })

    it('should return null for insufficient data', () => {
      const insufficientData = mockData.slice(0, 5)
      const result = analyzer.generateForecast(insufficientData, 7)
      
      expect(result).toBeNull()
    })

    it('should generate increasing predictions for upward trend', () => {
      const result = analyzer.generateForecast(mockData, 5)
      
      expect(result).not.toBeNull()
      const predictions = result!.predictions
      
      // For upward trending data, later predictions should generally be higher
      expect(predictions[4].predicted).toBeGreaterThan(predictions[0].predicted)
    })
  })
})