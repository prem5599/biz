import * as ss from 'simple-statistics'
import { SimpleLinearRegression } from 'ml-regression'
import { mean, median, deviation, quantile } from 'd3-array'
import {
  MetricData,
  TrendResult,
  OutlierResult,
  SignificanceResult,
  CorrelationResult,
  SeasonalityResult,
  SeasonalPattern,
  ForecastData,
  ForecastPoint
} from './types'

export class StatisticalAnalyzer {
  private readonly MIN_TREND_POINTS = 7
  private readonly MIN_SEASONALITY_POINTS = 30
  private readonly CONFIDENCE_LEVEL = 0.95
  private readonly ANOMALY_CONFIDENCE_LEVEL = 0.99

  calculateTrend(data: MetricData[]): TrendResult | null {
    if (data.length < this.MIN_TREND_POINTS) {
      return null
    }

    try {
      const sortedData = data.sort((a, b) => a.date.getTime() - b.date.getTime())
      const x = sortedData.map((d, i) => i)
      const y = sortedData.map(d => d.value)

      const regression = new SimpleLinearRegression(x, y)
      const rSquared = this.calculateRSquared(x, y, regression)
      const pValue = this.calculateTrendPValue(x, y, regression)
      
      const slope = regression.slope
      const direction = this.getTrendDirection(slope)
      const strength = this.getTrendStrength(rSquared)
      const significance = this.getSignificanceLevel(pValue)

      const lastIndex = x[x.length - 1]
      const projectedValue = regression.predict(lastIndex + 1)
      const residuals = y.map((val, i) => val - regression.predict(x[i]))
      const standardError = Math.sqrt(ss.variance(residuals))
      const confidenceInterval = this.calculateConfidenceInterval(
        projectedValue,
        standardError,
        data.length
      )

      return {
        slope,
        intercept: regression.intercept,
        rSquared,
        pValue,
        significance,
        direction,
        strength,
        projectedValue,
        confidenceInterval,
        dataPoints: data.length,
        timeframe: this.getTimeframe(sortedData[0].date, sortedData[sortedData.length - 1].date)
      }
    } catch (error) {
      console.error('Error calculating trend:', error)
      return null
    }
  }

  detectOutliers(data: MetricData[], method: 'zscore' | 'iqr' = 'zscore'): OutlierResult[] {
    if (data.length < 5) return []

    const values = data.map(d => d.value)
    const outliers: OutlierResult[] = []

    try {
      if (method === 'zscore') {
        outliers.push(...this.detectZScoreOutliers(data, values))
      } else if (method === 'iqr') {
        outliers.push(...this.detectIQROutliers(data, values))
      }

      return outliers.sort((a, b) => b.deviation - a.deviation)
    } catch (error) {
      console.error('Error detecting outliers:', error)
      return []
    }
  }

  private detectZScoreOutliers(data: MetricData[], values: number[]): OutlierResult[] {
    const meanValue = mean(values) || 0
    const stdDev = deviation(values) || 1
    const outliers: OutlierResult[] = []

    data.forEach((point, index) => {
      const zScore = Math.abs((point.value - meanValue) / stdDev)
      
      if (zScore > 3) {
        const deviation = point.value - meanValue
        outliers.push({
          date: point.date,
          value: point.value,
          expectedValue: meanValue,
          deviation: Math.abs(deviation),
          severity: this.getAnomalySeverity(zScore, 'zscore'),
          method: 'zscore',
          confidence: this.calculateAnomalyConfidence(zScore, 'zscore'),
          context: this.generateAnomalyContext(point, meanValue, 'zscore')
        })
      }
    })

    return outliers
  }

  private detectIQROutliers(data: MetricData[], values: number[]): OutlierResult[] {
    const q1 = quantile(values.sort((a, b) => a - b), 0.25) || 0
    const q3 = quantile(values.sort((a, b) => a - b), 0.75) || 0
    const iqr = q3 - q1
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr
    const medianValue = median(values) || 0
    const outliers: OutlierResult[] = []

    data.forEach(point => {
      if (point.value < lowerBound || point.value > upperBound) {
        const deviation = Math.abs(point.value - medianValue)
        const iqrDeviations = Math.max(
          Math.abs(point.value - lowerBound) / iqr,
          Math.abs(point.value - upperBound) / iqr
        )
        
        outliers.push({
          date: point.date,
          value: point.value,
          expectedValue: medianValue,
          deviation,
          severity: this.getAnomalySeverity(iqrDeviations, 'iqr'),
          method: 'iqr',
          confidence: this.calculateAnomalyConfidence(iqrDeviations, 'iqr'),
          context: this.generateAnomalyContext(point, medianValue, 'iqr')
        })
      }
    })

    return outliers
  }

  calculateSignificance(current: number, previous: number, variance: number): SignificanceResult {
    if (previous === 0 || variance === 0) {
      return {
        isSignificant: false,
        pValue: 1,
        confidenceLevel: 0,
        effectSize: 0,
        interpretation: 'Cannot calculate significance with zero baseline or variance'
      }
    }

    try {
      const change = current - previous
      const standardError = Math.sqrt(variance)
      const tStatistic = change / standardError
      const degreesOfFreedom = 30 // Assuming 30-day comparison
      
      const pValue = this.calculateTTestPValue(tStatistic, degreesOfFreedom)
      const isSignificant = pValue < (1 - this.CONFIDENCE_LEVEL)
      const effectSize = Math.abs(change) / Math.sqrt(variance)
      
      return {
        isSignificant,
        pValue,
        confidenceLevel: this.CONFIDENCE_LEVEL,
        effectSize,
        interpretation: this.interpretSignificance(isSignificant, pValue, effectSize)
      }
    } catch (error) {
      console.error('Error calculating significance:', error)
      return {
        isSignificant: false,
        pValue: 1,
        confidenceLevel: 0,
        effectSize: 0,
        interpretation: 'Error calculating statistical significance'
      }
    }
  }

  performCorrelationAnalysis(dataset1: MetricData[], dataset2: MetricData[]): CorrelationResult | null {
    if (dataset1.length < 5 || dataset2.length < 5) return null

    try {
      const aligned = this.alignDatasets(dataset1, dataset2)
      if (aligned.x.length < 5) return null

      const coefficient = ss.sampleCorrelation(aligned.x, aligned.y)
      const n = aligned.x.length
      const tStatistic = coefficient * Math.sqrt((n - 2) / (1 - coefficient * coefficient))
      const pValue = this.calculateTTestPValue(tStatistic, n - 2)
      
      return {
        coefficient,
        pValue,
        significance: this.getSignificanceLevel(pValue),
        strength: this.getCorrelationStrength(Math.abs(coefficient)),
        direction: coefficient >= 0 ? 'positive' : 'negative',
        interpretation: this.interpretCorrelation(coefficient, pValue)
      }
    } catch (error) {
      console.error('Error performing correlation analysis:', error)
      return null
    }
  }

  calculateSeasonality(data: MetricData[], period: number = 7): SeasonalityResult | null {
    if (data.length < this.MIN_SEASONALITY_POINTS) return null

    try {
      const sortedData = data.sort((a, b) => a.date.getTime() - b.date.getTime())
      const values = sortedData.map(d => d.value)
      
      const seasonalStrength = this.calculateSeasonalStrength(values, period)
      const patterns = this.detectSeasonalPatterns(sortedData, period)
      const confidence = this.calculateSeasonalConfidence(values, period)
      const isDetected = seasonalStrength > 0.3 && confidence > 0.7

      let nextPeak: Date | undefined
      let nextTrough: Date | undefined

      if (isDetected && patterns.length > 0) {
        const peaks = this.findSeasonalPeaks(sortedData, period)
        const troughs = this.findSeasonalTroughs(sortedData, period)
        
        if (peaks.length > 0) {
          nextPeak = this.projectNextSeasonalEvent(peaks, period)
        }
        if (troughs.length > 0) {
          nextTrough = this.projectNextSeasonalEvent(troughs, period)
        }
      }

      return {
        isDetected,
        period,
        strength: seasonalStrength,
        confidence,
        patterns,
        nextPeak,
        nextTrough
      }
    } catch (error) {
      console.error('Error calculating seasonality:', error)
      return null
    }
  }

  generateForecast(data: MetricData[], periods: number = 7): ForecastData | null {
    if (data.length < this.MIN_TREND_POINTS) return null

    try {
      const sortedData = data.sort((a, b) => a.date.getTime() - b.date.getTime())
      const trend = this.calculateTrend(sortedData)
      
      if (!trend) return null

      const method = this.selectForecastMethod(sortedData)
      const predictions = this.generateForecastPoints(sortedData, periods, method, trend)
      const accuracy = this.calculateForecastAccuracy(sortedData, method)
      
      return {
        predictions,
        method,
        accuracy,
        confidence: trend.rSquared,
        assumptions: this.getForecastAssumptions(method, trend)
      }
    } catch (error) {
      console.error('Error generating forecast:', error)
      return null
    }
  }

  private calculateRSquared(x: number[], y: number[], regression: SimpleLinearRegression): number {
    const yMean = mean(y) || 0
    const totalSumSquares = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0)
    const residualSumSquares = x.reduce((sum, val, i) => {
      const predicted = regression.predict(val)
      return sum + Math.pow(y[i] - predicted, 2)
    }, 0)
    
    return Math.max(0, 1 - (residualSumSquares / totalSumSquares))
  }

  private calculateTrendPValue(x: number[], y: number[], regression: SimpleLinearRegression): number {
    const n = x.length
    const residuals = y.map((val, i) => val - regression.predict(x[i]))
    const residualVariance = ss.variance(residuals)
    const xVariance = ss.variance(x)
    const standardError = Math.sqrt(residualVariance / (xVariance * (n - 1)))
    const tStatistic = Math.abs(regression.slope) / standardError
    
    return this.calculateTTestPValue(tStatistic, n - 2)
  }

  private calculateTTestPValue(tStatistic: number, degreesOfFreedom: number): number {
    // Simplified p-value calculation using approximation
    const absT = Math.abs(tStatistic)
    if (absT > 3) return 0.001
    if (absT > 2.5) return 0.01
    if (absT > 2) return 0.05
    if (absT > 1.5) return 0.1
    return 0.2
  }

  private getTrendDirection(slope: number): 'increasing' | 'decreasing' | 'stable' {
    if (Math.abs(slope) < 0.01) return 'stable'
    return slope > 0 ? 'increasing' : 'decreasing'
  }

  private getTrendStrength(rSquared: number): 'strong' | 'moderate' | 'weak' {
    if (rSquared > 0.7) return 'strong'
    if (rSquared > 0.4) return 'moderate'
    return 'weak'
  }

  private getSignificanceLevel(pValue: number): 'high' | 'medium' | 'low' | 'none' {
    if (pValue < 0.01) return 'high'
    if (pValue < 0.05) return 'medium'
    if (pValue < 0.1) return 'low'
    return 'none'
  }

  private getAnomalySeverity(score: number, method: 'zscore' | 'iqr'): 'low' | 'medium' | 'high' | 'critical' {
    if (method === 'zscore') {
      if (score > 4) return 'critical'
      if (score > 3.5) return 'high'
      if (score > 3) return 'medium'
      return 'low'
    } else {
      if (score > 3) return 'critical'
      if (score > 2.5) return 'high'
      if (score > 2) return 'medium'
      return 'low'
    }
  }

  private calculateAnomalyConfidence(score: number, method: 'zscore' | 'iqr'): number {
    if (method === 'zscore') {
      return Math.min(0.99, 0.5 + (score - 2) * 0.1)
    } else {
      return Math.min(0.99, 0.6 + (score - 1.5) * 0.1)
    }
  }

  private generateAnomalyContext(point: MetricData, expected: number, method: string): string {
    const deviation = ((point.value - expected) / expected * 100).toFixed(1)
    const direction = point.value > expected ? 'above' : 'below'
    return `Value is ${Math.abs(parseFloat(deviation))}% ${direction} expected using ${method} method`
  }

  private getCorrelationStrength(coefficient: number): 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak' {
    const abs = Math.abs(coefficient)
    if (abs > 0.8) return 'very_strong'
    if (abs > 0.6) return 'strong'
    if (abs > 0.4) return 'moderate'
    if (abs > 0.2) return 'weak'
    return 'very_weak'
  }

  private alignDatasets(dataset1: MetricData[], dataset2: MetricData[]): { x: number[], y: number[] } {
    const dateMap1 = new Map(dataset1.map(d => [d.date.toISOString().split('T')[0], d.value]))
    const dateMap2 = new Map(dataset2.map(d => [d.date.toISOString().split('T')[0], d.value]))
    
    const x: number[] = []
    const y: number[] = []
    
    for (const [date, value1] of dateMap1) {
      const value2 = dateMap2.get(date)
      if (value2 !== undefined) {
        x.push(value1)
        y.push(value2)
      }
    }
    
    return { x, y }
  }

  private calculateSeasonalStrength(values: number[], period: number): number {
    try {
      if (values.length < period * 2) return 0
      
      const cycles = Math.floor(values.length / period)
      const cycleMeans: number[] = []
      
      for (let i = 0; i < cycles; i++) {
        const cycleValues = values.slice(i * period, (i + 1) * period)
        cycleMeans.push(mean(cycleValues) || 0)
      }
      
      const overallMean = mean(values) || 0
      const seasonalVariance = ss.variance(cycleMeans)
      const totalVariance = ss.variance(values)
      
      return totalVariance > 0 ? seasonalVariance / totalVariance : 0
    } catch (error) {
      return 0
    }
  }

  private detectSeasonalPatterns(data: MetricData[], period: number): SeasonalPattern[] {
    const patterns: SeasonalPattern[] = []
    
    try {
      const dailyPattern = this.analyzePattern(data, 1, 'daily')
      if (dailyPattern.strength > 0.2) patterns.push(dailyPattern)
      
      const weeklyPattern = this.analyzePattern(data, 7, 'weekly')
      if (weeklyPattern.strength > 0.2) patterns.push(weeklyPattern)
      
      const monthlyPattern = this.analyzePattern(data, 30, 'monthly')
      if (monthlyPattern.strength > 0.2) patterns.push(monthlyPattern)
      
      if (data.length >= 365) {
        const yearlyPattern = this.analyzePattern(data, 365, 'yearly')
        if (yearlyPattern.strength > 0.2) patterns.push(yearlyPattern)
      }
    } catch (error) {
      console.error('Error detecting seasonal patterns:', error)
    }
    
    return patterns
  }

  private analyzePattern(data: MetricData[], period: number, type: SeasonalPattern['period']): SeasonalPattern {
    const values = data.map(d => d.value)
    const strength = this.calculateSeasonalStrength(values, period)
    
    return {
      period: type,
      strength,
      phase: 0, // Simplified - could be enhanced with FFT analysis
      amplitude: this.calculateAmplitude(values, period)
    }
  }

  private calculateAmplitude(values: number[], period: number): number {
    if (values.length < period * 2) return 0
    
    const cycles = Math.floor(values.length / period)
    let maxAmplitude = 0
    
    for (let i = 0; i < cycles; i++) {
      const cycleValues = values.slice(i * period, (i + 1) * period)
      const cycleMax = Math.max(...cycleValues)
      const cycleMin = Math.min(...cycleValues)
      const amplitude = (cycleMax - cycleMin) / 2
      maxAmplitude = Math.max(maxAmplitude, amplitude)
    }
    
    return maxAmplitude
  }

  private calculateSeasonalConfidence(values: number[], period: number): number {
    const strength = this.calculateSeasonalStrength(values, period)
    const dataQuality = Math.min(1, values.length / (period * 4))
    return strength * dataQuality
  }

  private findSeasonalPeaks(data: MetricData[], period: number): Date[] {
    // Simplified peak detection - could be enhanced with more sophisticated algorithms
    const peaks: Date[] = []
    const values = data.map(d => d.value)
    
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
        peaks.push(data[i].date)
      }
    }
    
    return peaks
  }

  private findSeasonalTroughs(data: MetricData[], period: number): Date[] {
    const troughs: Date[] = []
    const values = data.map(d => d.value)
    
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] < values[i - 1] && values[i] < values[i + 1]) {
        troughs.push(data[i].date)
      }
    }
    
    return troughs
  }

  private projectNextSeasonalEvent(events: Date[], period: number): Date {
    if (events.length === 0) return new Date()
    
    const lastEvent = events[events.length - 1]
    const nextEvent = new Date(lastEvent)
    nextEvent.setDate(nextEvent.getDate() + period)
    
    return nextEvent
  }

  private selectForecastMethod(data: MetricData[]): 'linear' | 'exponential' | 'seasonal' | 'arima' {
    const trend = this.calculateTrend(data)
    const seasonality = this.calculateSeasonality(data)
    
    if (seasonality?.isDetected) return 'seasonal'
    if (trend && trend.strength === 'strong') return 'linear'
    return 'linear' // Simplified selection logic
  }

  private generateForecastPoints(
    data: MetricData[],
    periods: number,
    method: 'linear' | 'exponential' | 'seasonal' | 'arima',
    trend: TrendResult
  ): ForecastPoint[] {
    const predictions: ForecastPoint[] = []
    const lastDate = data[data.length - 1].date
    const values = data.map(d => d.value)
    const standardError = Math.sqrt(ss.variance(values)) / Math.sqrt(data.length)
    
    for (let i = 1; i <= periods; i++) {
      const futureDate = new Date(lastDate)
      futureDate.setDate(futureDate.getDate() + i)
      
      let predicted: number
      
      switch (method) {
        case 'linear':
          predicted = trend.intercept + trend.slope * (data.length + i - 1)
          break
        case 'seasonal':
          // Simplified seasonal forecast
          const seasonalIndex = i % 7 // Weekly seasonality
          const seasonalFactor = this.getSeasonalFactor(data, seasonalIndex)
          predicted = (trend.intercept + trend.slope * (data.length + i - 1)) * seasonalFactor
          break
        default:
          predicted = trend.intercept + trend.slope * (data.length + i - 1)
      }
      
      const margin = 1.96 * standardError * Math.sqrt(i) // 95% confidence interval
      
      predictions.push({
        date: futureDate,
        predicted: Math.max(0, predicted),
        lower: Math.max(0, predicted - margin),
        upper: predicted + margin,
        confidence: Math.max(0.5, trend.confidence || 0.8)
      })
    }
    
    return predictions
  }

  private getSeasonalFactor(data: MetricData[], dayOfWeek: number): number {
    const dayValues = data.filter(d => d.date.getDay() === dayOfWeek).map(d => d.value)
    const allValues = data.map(d => d.value)
    
    if (dayValues.length === 0) return 1
    
    const dayMean = mean(dayValues) || 0
    const overallMean = mean(allValues) || 1
    
    return dayMean / overallMean
  }

  private calculateForecastAccuracy(data: MetricData[], method: string): number {
    // Simplified accuracy calculation - could use cross-validation
    const trend = this.calculateTrend(data)
    if (!trend) return 0.5
    
    return Math.min(0.95, trend.rSquared * 0.8 + 0.2)
  }

  private getForecastAssumptions(method: string, trend: TrendResult): string[] {
    const assumptions = [
      'Historical patterns will continue',
      'No major external disruptions',
      'Data quality remains consistent'
    ]
    
    if (method === 'linear') {
      assumptions.push('Linear trend continues at current rate')
    }
    
    if (method === 'seasonal') {
      assumptions.push('Seasonal patterns remain stable')
    }
    
    if (trend.rSquared < 0.5) {
      assumptions.push('Low trend confidence - use with caution')
    }
    
    return assumptions
  }

  private calculateConfidenceInterval(
    predicted: number,
    standardError: number,
    sampleSize: number
  ): { lower: number; upper: number } {
    const tValue = 1.96 // 95% confidence for large samples
    const margin = tValue * standardError
    
    return {
      lower: Math.max(0, predicted - margin),
      upper: predicted + margin
    }
  }

  private getTimeframe(startDate: Date, endDate: Date): string {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (days <= 7) return '7d'
    if (days <= 30) return '30d'
    if (days <= 90) return '90d'
    if (days <= 365) return '1y'
    return 'custom'
  }

  private interpretSignificance(isSignificant: boolean, pValue: number, effectSize: number): string {
    if (!isSignificant) {
      return 'No statistically significant change detected'
    }
    
    const effectDescription = effectSize > 0.8 ? 'large' : effectSize > 0.5 ? 'medium' : 'small'
    return `Statistically significant change with ${effectDescription} effect size (p=${pValue.toFixed(3)})`
  }

  private interpretCorrelation(coefficient: number, pValue: number): string {
    const strength = this.getCorrelationStrength(Math.abs(coefficient))
    const direction = coefficient >= 0 ? 'positive' : 'negative'
    const significance = pValue < 0.05 ? 'significant' : 'not significant'
    
    return `${strength} ${direction} correlation (r=${coefficient.toFixed(3)}, ${significance})`
  }
}