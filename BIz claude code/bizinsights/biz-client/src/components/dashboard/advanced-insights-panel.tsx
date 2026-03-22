'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCurrentOrganization } from '@/hooks/useOrganization'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  BarChart, 
  RefreshCw,
  Brain,
  Lightbulb
} from 'lucide-react'

interface InsightData {
  id: string
  type: 'trend' | 'performance' | 'opportunity' | 'alert' | 'forecast'
  title: string
  description: string
  recommendation?: string
  impactScore: number
  confidence?: number
  affectedMetrics?: string[]
  timeframe?: string
  businessContext?: string
  metadata?: any
  createdAt: string
}

interface InsightsResponse {
  insights: InsightData[]
  summary: string
  businessProfile: {
    industry?: string
    businessType?: string
    size?: string
  }
  metadata: {
    totalInsights: number
    highImpactInsights: number
    forecastingEnabled: boolean
    generatedAt: string
  }
}

export function AdvancedInsightsPanel() {
  const [insights, setInsights] = useState<InsightData[]>([])
  const [summary, setSummary] = useState<string>('')
  const [metadata, setMetadata] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { organization } = useCurrentOrganization()

  const getInsightIcon = (type: string, impactScore: number) => {
    switch (type) {
      case 'trend':
        return impactScore >= 7 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />
      case 'alert':
        return <AlertTriangle className="h-5 w-5" />
      case 'opportunity':
        return <Target className="h-5 w-5" />
      case 'performance':
        return <BarChart className="h-5 w-5" />
      case 'forecast':
        return <Brain className="h-5 w-5" />
      default:
        return <Lightbulb className="h-5 w-5" />
    }
  }

  const getInsightColor = (type: string, impactScore: number) => {
    if (impactScore >= 8) return 'text-red-600'
    if (type === 'opportunity') return 'text-green-600'
    if (type === 'alert') return 'text-orange-600'
    if (type === 'trend') return 'text-blue-600'
    return 'text-gray-600'
  }

  const getImpactBadge = (score: number) => {
    if (score >= 8) return <Badge variant="destructive">High Impact</Badge>
    if (score >= 6) return <Badge variant="default">Medium Impact</Badge>
    return <Badge variant="secondary">Low Impact</Badge>
  }

  const generateInsights = async () => {
    if (!organization?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/organizations/${organization.id}/insights/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        const insightsData: InsightsResponse = data.data
        setInsights(insightsData.insights || [])
        setSummary(insightsData.summary || '')
        setMetadata(insightsData.metadata || null)
      } else {
        setError(data.error || 'Failed to generate insights')
      }
    } catch (err) {
      console.error('Error generating insights:', err)
      setError('Failed to generate insights')
    } finally {
      setIsLoading(false)
    }
  }

  const loadExistingInsights = async () => {
    if (!organization?.id) return

    try {
      const response = await fetch(`/api/organizations/${organization.id}/insights/generate`)
      const data = await response.json()

      if (data.success && data.data?.length > 0) {
        setInsights(data.data)
      }
    } catch (err) {
      console.error('Error loading insights:', err)
    }
  }

  useEffect(() => {
    loadExistingInsights()
  }, [organization?.id])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Business Insights</h2>
          <p className="text-muted-foreground">
            Advanced analytics and recommendations powered by artificial intelligence
          </p>
        </div>
        <Button
          onClick={generateInsights}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
          {isLoading ? 'Analyzing...' : 'Generate Insights'}
        </Button>
      </div>

      {/* Summary Card */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{summary}</p>
            {metadata && (
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span>Total insights: {metadata.totalInsights}</span>
                <span>High impact: {metadata.highImpactInsights}</span>
                {metadata.forecastingEnabled && (
                  <span className="flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    Forecasting enabled
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights Grid */}
      {insights.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          {insights.map((insight) => (
            <Card key={insight.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={getInsightColor(insight.type, insight.impactScore)}>
                      {getInsightIcon(insight.type, insight.impactScore)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg leading-tight">
                        {insight.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        {getImpactBadge(insight.impactScore)}
                        <Badge variant="outline" className="text-xs">
                          {insight.type}
                        </Badge>
                        {insight.confidence && (
                          <Badge variant="outline" className="text-xs">
                            {(insight.confidence * 100).toFixed(0)}% confidence
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight.description}
                  </p>
                </div>

                {insight.recommendation && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">
                      Recommended Action
                    </h4>
                    <p className="text-sm text-blue-800">
                      {insight.recommendation}
                    </p>
                  </div>
                )}

                {insight.businessContext && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      Business Context
                    </h4>
                    <p className="text-sm text-gray-700">
                      {insight.businessContext}
                    </p>
                  </div>
                )}

                {insight.affectedMetrics && insight.affectedMetrics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {insight.affectedMetrics.map((metric, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {metric.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                )}

                {insight.timeframe && (
                  <div className="text-xs text-muted-foreground">
                    Timeframe: {insight.timeframe}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !isLoading && !error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No insights generated yet</h3>
              <p className="text-muted-foreground mb-4">
                Click "Generate Insights" to analyze your business data and get AI-powered recommendations.
              </p>
              <Button onClick={generateInsights} disabled={isLoading}>
                Generate Your First Insights
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Loading State */}
      {isLoading && insights.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium mb-2">Analyzing your data...</h3>
              <p className="text-muted-foreground">
                Our AI is processing your business metrics to generate actionable insights.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}