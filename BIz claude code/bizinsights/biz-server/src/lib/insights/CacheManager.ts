import { InsightData, CacheEntry, InsightGenerationOptions } from './types'
import { addMinutes, addHours, addDays, isAfter, isBefore } from 'date-fns'

// Simple in-memory cache implementation for development
// In production, this would use Redis or similar
class InMemoryCache {
  private cache = new Map<string, any>()
  private expirationTimers = new Map<string, NodeJS.Timeout>()

  set(key: string, value: any, ttlMs: number): void {
    // Clear existing timer if present
    const existingTimer = this.expirationTimers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set the value
    this.cache.set(key, value)

    // Set expiration timer
    const timer = setTimeout(() => {
      this.cache.delete(key)
      this.expirationTimers.delete(key)
    }, ttlMs)

    this.expirationTimers.set(key, timer)
  }

  get(key: string): any | null {
    return this.cache.get(key) || null
  }

  delete(key: string): void {
    this.cache.delete(key)
    const timer = this.expirationTimers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.expirationTimers.delete(key)
    }
  }

  clear(): void {
    this.cache.clear()
    this.expirationTimers.forEach(timer => clearTimeout(timer))
    this.expirationTimers.clear()
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  size(): number {
    return this.cache.size
  }
}

export class CacheManager {
  private cache: InMemoryCache
  private organizationId: string
  private defaultTTL: number = 60 * 60 * 1000 // 1 hour in milliseconds
  private maxCacheSize: number = 1000
  private activeGenerations = new Map<string, Promise<InsightData[]>>()

  constructor(organizationId: string, options?: { defaultTTL?: number; maxCacheSize?: number }) {
    this.organizationId = organizationId
    this.cache = new InMemoryCache()
    
    if (options?.defaultTTL) {
      this.defaultTTL = options.defaultTTL
    }
    if (options?.maxCacheSize) {
      this.maxCacheSize = options.maxCacheSize
    }

    // Clean up expired entries periodically
    setInterval(() => this.cleanupExpired(), 15 * 60 * 1000) // Every 15 minutes
  }

  async cacheInsight(orgId: string, insight: InsightData, ttl: number = this.defaultTTL): Promise<void> {
    if (orgId !== this.organizationId) return

    const key = this.generateInsightKey(insight)
    const cacheEntry: CacheEntry<InsightData> = {
      data: insight,
      timestamp: new Date(),
      expiresAt: addMinutes(new Date(), ttl / (60 * 1000)),
      tags: this.generateInsightTags(insight)
    }

    this.cache.set(key, cacheEntry, ttl)
    
    // Ensure cache doesn't exceed max size
    this.enforceMaxCacheSize()
  }

  async cacheInsightsBatch(orgId: string, insights: InsightData[], ttl: number = this.defaultTTL): Promise<void> {
    if (orgId !== this.organizationId) return

    const batchKey = this.generateBatchKey(insights)
    const cacheEntry: CacheEntry<InsightData[]> = {
      data: insights,
      timestamp: new Date(),
      expiresAt: addMinutes(new Date(), ttl / (60 * 1000)),
      tags: ['batch', 'insights', orgId]
    }

    this.cache.set(batchKey, cacheEntry, ttl)

    // Also cache individual insights
    await Promise.all(insights.map(insight => this.cacheInsight(orgId, insight, ttl)))
  }

  async getCachedInsights(orgId: string, maxAge: number = this.defaultTTL): Promise<InsightData[]> {
    if (orgId !== this.organizationId) return []

    const cutoffTime = addMinutes(new Date(), -maxAge / (60 * 1000))
    const cachedKeys = this.cache.keys().filter(key => key.includes(`insights:${orgId}`))
    const validInsights: InsightData[] = []

    for (const key of cachedKeys) {
      const entry = this.cache.get(key) as CacheEntry<InsightData> | null
      if (entry && isAfter(entry.timestamp, cutoffTime)) {
        validInsights.push(entry.data)
      }
    }

    return validInsights.sort((a, b) => b.impactScore - a.impactScore)
  }

  async getCachedInsightsBatch(orgId: string, options?: InsightGenerationOptions): Promise<InsightData[] | null> {
    if (orgId !== this.organizationId) return null

    const batchKey = this.generateBatchKeyFromOptions(orgId, options)
    const entry = this.cache.get(batchKey) as CacheEntry<InsightData[]> | null

    if (entry && isAfter(new Date(), entry.expiresAt)) {
      // Entry expired, remove it
      this.cache.delete(batchKey)
      return null
    }

    return entry?.data || null
  }

  async invalidateCache(orgId: string, triggers: string[]): Promise<void> {
    if (orgId !== this.organizationId && !triggers.includes('global')) return

    const keysToDelete: string[] = []

    // Find keys to invalidate based on triggers
    for (const key of this.cache.keys()) {
      const entry = this.cache.get(key) as CacheEntry<any> | null
      if (!entry) continue

      const shouldInvalidate = triggers.some(trigger => {
        switch (trigger) {
          case 'data_update':
            return entry.tags.some(tag => ['revenue', 'orders', 'customers', 'sessions'].includes(tag))
          case 'settings_change':
            return entry.tags.includes('business_context')
          case 'new_integration':
            return entry.tags.some(tag => ['channel', 'integration'].includes(tag))
          case 'manual_refresh':
            return entry.tags.includes(orgId)
          case 'global':
            return true
          default:
            return entry.tags.includes(trigger)
        }
      })

      if (shouldInvalidate) {
        keysToDelete.push(key)
      }
    }

    // Delete identified keys
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  async precomputeInsights(orgId: string): Promise<void> {
    if (orgId !== this.organizationId) return

    // This would trigger background insight generation
    // For now, just mark that precomputation is needed
    const precomputeKey = `precompute:${orgId}`
    const entry: CacheEntry<{ status: string; timestamp: Date }> = {
      data: { status: 'queued', timestamp: new Date() },
      timestamp: new Date(),
      expiresAt: addHours(new Date(), 1),
      tags: ['precompute', orgId]
    }

    this.cache.set(precomputeKey, entry, 60 * 60 * 1000) // 1 hour
  }

  // Request deduplication for simultaneous insight requests
  async deduplicateInsightGeneration<T>(
    key: string,
    generatorFunction: () => Promise<T>
  ): Promise<T> {
    const deduplicationKey = `generation:${this.organizationId}:${key}`
    
    // Check if there's already an active generation for this key
    const activeGeneration = this.activeGenerations.get(deduplicationKey)
    if (activeGeneration) {
      return activeGeneration as Promise<T>
    }

    // Start new generation
    const generationPromise = generatorFunction()
    this.activeGenerations.set(deduplicationKey, generationPromise as Promise<InsightData[]>)

    try {
      const result = await generationPromise
      return result
    } finally {
      // Clean up active generation tracking
      this.activeGenerations.delete(deduplicationKey)
    }
  }

  // Cache statistics and health
  getCacheStats(): {
    size: number
    maxSize: number
    hitRate: number
    organizationId: string
    oldestEntry: Date | null
    newestEntry: Date | null
  } {
    const keys = this.cache.keys()
    let oldestEntry: Date | null = null
    let newestEntry: Date | null = null
    let orgSpecificCount = 0

    for (const key of keys) {
      const entry = this.cache.get(key) as CacheEntry<any> | null
      if (!entry) continue

      if (entry.tags.includes(this.organizationId)) {
        orgSpecificCount++
      }

      if (!oldestEntry || isBefore(entry.timestamp, oldestEntry)) {
        oldestEntry = entry.timestamp
      }
      if (!newestEntry || isAfter(entry.timestamp, newestEntry)) {
        newestEntry = entry.timestamp
      }
    }

    return {
      size: orgSpecificCount,
      maxSize: this.maxCacheSize,
      hitRate: 0, // Would need to track hits/misses to calculate
      organizationId: this.organizationId,
      oldestEntry,
      newestEntry
    }
  }

  // Cache key generation methods
  private generateInsightKey(insight: InsightData): string {
    const typePrefix = insight.type
    const metricHash = insight.affectedMetrics.sort().join(',')
    const timeframeHash = insight.timeframe
    
    return `insight:${this.organizationId}:${typePrefix}:${metricHash}:${timeframeHash}:${insight.id}`
  }

  private generateBatchKey(insights: InsightData[]): string {
    const types = [...new Set(insights.map(i => i.type))].sort().join(',')
    const timeframes = [...new Set(insights.map(i => i.timeframe))].sort().join(',')
    const count = insights.length
    
    return `batch:${this.organizationId}:${types}:${timeframes}:${count}`
  }

  private generateBatchKeyFromOptions(orgId: string, options?: InsightGenerationOptions): string {
    if (!options) {
      return `batch:${orgId}:default`
    }

    const metrics = options.metrics?.sort().join(',') || 'all'
    const timeframe = options.timeframe ? `${options.timeframe.start.getTime()}-${options.timeframe.end.getTime()}` : 'default'
    const flags = [
      options.includeForecasts ? 'forecasts' : '',
      options.includeRecommendations ? 'recommendations' : '',
    ].filter(Boolean).join(',')

    return `batch:${orgId}:${metrics}:${timeframe}:${flags}`
  }

  private generateInsightTags(insight: InsightData): string[] {
    const tags = [
      this.organizationId,
      insight.type,
      ...insight.affectedMetrics,
      insight.timeframe
    ]

    // Add specific tags based on insight metadata
    if (insight.metadata?.source) {
      tags.push(insight.metadata.source)
    }

    if (insight.type === 'performance') {
      tags.push('channel')
    }

    if (insight.type === 'trend') {
      tags.push('forecast')
    }

    return tags
  }

  private cleanupExpired(): void {
    const now = new Date()
    const keysToDelete: string[] = []

    for (const key of this.cache.keys()) {
      const entry = this.cache.get(key) as CacheEntry<any> | null
      if (entry && isAfter(now, entry.expiresAt)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  private enforceMaxCacheSize(): void {
    if (this.cache.size() <= this.maxCacheSize) return

    // Get all entries with timestamps
    const entries: Array<{ key: string; timestamp: Date }> = []
    
    for (const key of this.cache.keys()) {
      const entry = this.cache.get(key) as CacheEntry<any> | null
      if (entry) {
        entries.push({ key, timestamp: entry.timestamp })
      }
    }

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // Remove oldest entries until we're under the limit
    const entriesToRemove = entries.length - this.maxCacheSize
    for (let i = 0; i < entriesToRemove; i++) {
      this.cache.delete(entries[i].key)
    }
  }

  // Utility methods for cache warming and management
  async warmCache(orgId: string, commonQueries: string[]): Promise<void> {
    if (orgId !== this.organizationId) return

    // This would pre-populate cache with commonly requested insights
    // Implementation would depend on the specific queries
    for (const query of commonQueries) {
      const warmKey = `warm:${orgId}:${query}`
      const entry: CacheEntry<{ warmed: boolean }> = {
        data: { warmed: true },
        timestamp: new Date(),
        expiresAt: addDays(new Date(), 1),
        tags: ['warm', orgId, query]
      }
      
      this.cache.set(warmKey, entry, 24 * 60 * 60 * 1000) // 24 hours
    }
  }

  async exportCacheData(): Promise<{ [key: string]: CacheEntry<any> }> {
    const exportData: { [key: string]: CacheEntry<any> } = {}
    
    for (const key of this.cache.keys()) {
      const entry = this.cache.get(key)
      if (entry && entry.tags.includes(this.organizationId)) {
        exportData[key] = entry
      }
    }
    
    return exportData
  }

  async importCacheData(data: { [key: string]: CacheEntry<any> }): Promise<void> {
    const now = new Date()
    
    for (const [key, entry] of Object.entries(data)) {
      // Only import non-expired entries for this organization
      if (entry.tags.includes(this.organizationId) && isAfter(entry.expiresAt, now)) {
        const remainingTTL = entry.expiresAt.getTime() - now.getTime()
        this.cache.set(key, entry, remainingTTL)
      }
    }
  }

  // Cleanup method
  destroy(): void {
    this.cache.clear()
    this.activeGenerations.clear()
  }
}