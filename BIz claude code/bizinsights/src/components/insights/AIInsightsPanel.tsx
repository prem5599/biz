'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentOrganization } from '@/hooks/useOrganization'
import { InsightCard } from './InsightCard'
import { InsightsHeader } from './InsightsHeader'
import { InsightsSummary } from './InsightsSummary'
import { DataQualityWidget } from './DataQualityWidget'
import { AlertsWidget } from './AlertsWidget'
import { 
  Brain,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Target,
  RefreshCw,
  Sparkles
} from 'lucide-react'

interface InsightData {
  id: string
  organizationId: string
  type: 'trend' | 'anomaly' | 'performance' | 'recommendation' | 'alert'
  title: string
  description: string
  recommendation: string
  impactScore: number
  confidence: number
  affectedMetrics: string[]
  timeframe: string
  dataPoints: number
  createdAt: string
  metadata?: {
    source?: string
    algorithm?: string
    version?: string
    parameters?: Record<string, any>
    dataQuality?: number
    priorityReasoning?: string
    priority?: 'critical' | 'high' | 'medium' | 'low'
  }
}

interface InsightsResponse {
  success: boolean
  data: {
    insights: InsightData[]
    summary: string
    businessProfile?: {
      industry?: string
      businessType?: string
      size?: string
    }
    metadata: {
      totalInsights: number
      highImpactInsights: number
      forecastingEnabled: boolean
      generatedAt: string
      type?: string
    }
  }
  error?: string
}

interface AIInsightsPanelProps {
  className?: string
}

export function AIInsightsPanel({ className }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<InsightData[]>([])
  const [summary, setSummary] = useState<string>('')
  const [metadata, setMetadata] = useState<any>(null)
  const [businessProfile, setBusinessProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)
  const { organization } = useCurrentOrganization()

  const generateInsights = async (options?: {
    timeframe?: string
    metrics?: string[]
    includeForecasts?: boolean
    maxInsights?: number
  }) => {
    if (!organization?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/organizations/${organization.id}/insights/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeframe: options?.timeframe || '30d',
          metrics: options?.metrics || ['revenue', 'orders', 'customers', 'sessions'],
          includeForecasts: options?.includeForecasts !== false,
          includeRecommendations: true,
          maxInsights: options?.maxInsights || 15,
          minConfidence: 0.6
        })
      })

      const data: InsightsResponse = await response.json()

      if (data.success && data.data) {
        setInsights(data.data.insights || [])
        setSummary(data.data.summary || '')
        setMetadata(data.data.metadata || null)
        setBusinessProfile(data.data.businessProfile || null)
        setLastGenerated(new Date())
      } else {
        setError(data.error || 'Failed to generate insights')
      }
    } catch (err) {
      console.error('Error generating insights:', err)
      setError('Failed to generate insights. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadExistingInsights = async () => {
    if (!organization?.id) return

    try {
      const response = await fetch(`/api/organizations/${organization.id}/insights/generate`)
      const data: InsightsResponse = await response.json()

      if (data.success && data.data?.insights?.length > 0) {
        setInsights(data.data.insights)
        setSummary(data.data.summary || '')
        setMetadata(data.data.metadata || null)
        setBusinessProfile(data.data.businessProfile || null)
      }
    } catch (err) {
      console.error('Error loading existing insights:', err)
    }
  }

  const filterInsightsByType = (type: string) => {
    switch (type) {
      case 'all':
        return insights
      case 'trends':
        return insights.filter(i => i.type === 'trend')
      case 'alerts':
        return insights.filter(i => i.type === 'alert' || i.type === 'anomaly')
      case 'recommendations':
        return insights.filter(i => i.type === 'recommendation')
      case 'performance':
        return insights.filter(i => i.type === 'performance')
      default:
        return insights
    }
  }

  const getHighImpactInsights = () => insights.filter(i => i.impactScore >= 8)
  const getCriticalInsights = () => insights.filter(i => i.metadata?.priority === 'critical')

  useEffect(() => {
    loadExistingInsights()
  }, [organization?.id])

  return (
    <div className={`space-y-6 ${className}`}>
      <InsightsHeader
        onGenerate={generateInsights}
        isLoading={isLoading}
        lastGenerated={lastGenerated}
        totalInsights={insights.length}
        highImpactCount={getHighImpactInsights().length}
      />

      {/* Summary Section */}
      {summary && (
        <InsightsSummary
          summary={summary}
          metadata={metadata}
          businessProfile={businessProfile}
          criticalCount={getCriticalInsights().length}
        />
      )}

      {/* Data Quality & Alerts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <DataQualityWidget organizationId={organization?.id} />
        <AlertsWidget organizationId={organization?.id} />
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-medium">Failed to generate insights</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
            <Button
              onClick={() => generateInsights()}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Insights Tabs */}
      {insights.length > 0 ? (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Sparkles className="h-3 w-3" />
              All ({insights.length})
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3" />
              Trends ({filterInsightsByType('trends').length})
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" />
              Alerts ({filterInsightsByType('alerts').length})
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <BarChart3 className="h-3 w-3" />
              Performance ({filterInsightsByType('performance').length})
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Target className="h-3 w-3" />
              Actions ({filterInsightsByType('recommendations').length})
            </TabsTrigger>
          </TabsList>

          {['all', 'trends', 'alerts', 'performance', 'recommendations'].map((tabValue) => (
            <TabsContent key={tabValue} value={tabValue} className="space-y-4">
              <div className="grid gap-4">
                {filterInsightsByType(tabValue).map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    organizationId={organization?.id}
                  />
                ))}
              </div>
              
              {filterInsightsByType(tabValue).length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <div className="text-muted-foreground mb-2">
                        {tabValue === 'trends' && <TrendingUp className="h-8 w-8 mx-auto mb-2" />}
                        {tabValue === 'alerts' && <AlertTriangle className="h-8 w-8 mx-auto mb-2" />}
                        {tabValue === 'performance' && <BarChart3 className="h-8 w-8 mx-auto mb-2" />}
                        {tabValue === 'recommendations' && <Target className="h-8 w-8 mx-auto mb-2" />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        No {tabValue === 'all' ? 'insights' : tabValue} available at the moment.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : !isLoading && !error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">AI Insights Ready</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Generate AI-powered insights from your business data. Get trend analysis, 
                anomaly detection, performance recommendations, and revenue forecasting.
              </p>
              <div className="space-y-3">
                <Button onClick={() => generateInsights()} disabled={isLoading}>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate AI Insights
                </Button>
                <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                  <span>✓ Trend Analysis</span>
                  <span>✓ Anomaly Detection</span>
                  <span>✓ Revenue Forecasting</span>
                  <span>✓ Actionable Recommendations</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Loading State */}
      {isLoading && insights.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <RefreshCw className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
              <h3 className="text-xl font-semibold mb-2">Analyzing Your Data</h3>
              <p className="text-muted-foreground mb-4">
                Our AI is processing your business metrics to generate actionable insights...
              </p>
              <div className="flex justify-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  Statistical Analysis
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse animation-delay-200"></div>
                  Pattern Recognition
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse animation-delay-400"></div>
                  Generating Recommendations
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}