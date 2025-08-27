'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  TrendingUp,
  BarChart3,
  Users,
  ShoppingCart
} from 'lucide-react'

interface DataQualityMetric {
  metric: string
  quality: number
  status: 'good' | 'warning' | 'poor'
  lastUpdated: string
  recordCount: number
  issues?: string[]
}

interface DataQualityData {
  overallScore: number
  metrics: DataQualityMetric[]
  recommendations: string[]
  lastAssessment: string
}

interface DataQualityWidgetProps {
  organizationId?: string
}

export function DataQualityWidget({ organizationId }: DataQualityWidgetProps) {
  const [data, setData] = useState<DataQualityData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDataQuality = async () => {
    if (!organizationId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/organizations/${organizationId}/insights/data-quality`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch data quality information')
      }
    } catch (err) {
      console.error('Error fetching data quality:', err)
      setError('Failed to assess data quality')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDataQuality()
  }, [organizationId])

  const getQualityColor = (score: number) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getQualityBadge = (status: string) => {
    switch (status) {
      case 'good':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Good</Badge>
      case 'warning':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-200">Warning</Badge>
      case 'poor':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Poor</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getMetricIcon = (metric: string) => {
    switch (metric.toLowerCase()) {
      case 'revenue':
        return <TrendingUp className="h-4 w-4" />
      case 'orders':
        return <ShoppingCart className="h-4 w-4" />
      case 'customers':
        return <Users className="h-4 w-4" />
      default:
        return <BarChart3 className="h-4 w-4" />
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5 text-blue-600" />
          Data Quality Assessment
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDataQuality}
            disabled={isLoading}
            className="ml-auto h-8 w-8 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-muted-foreground">Assessing data quality...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-6">
            <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">{error}</p>
            <Button size="sm" variant="outline" onClick={fetchDataQuality}>
              Try Again
            </Button>
          </div>
        )}

        {!isLoading && !error && !data && (
          <div className="text-center py-6">
            <Database className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No data quality assessment available</p>
            <Button size="sm" variant="outline" onClick={fetchDataQuality}>
              Run Assessment
            </Button>
          </div>
        )}

        {data && (
          <>
            {/* Overall Score */}
            <div className="text-center py-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border">
              <div className={`text-3xl font-bold ${getQualityColor(data.overallScore)}`}>
                {Math.round(data.overallScore)}%
              </div>
              <div className="text-sm text-gray-600 mb-2">Overall Data Quality</div>
              <Progress 
                value={data.overallScore} 
                className="w-24 mx-auto h-2"
              />
            </div>

            {/* Metrics Breakdown */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Metrics Assessment
              </h4>
              {data.metrics && data.metrics.length > 0 ? data.metrics.map((metric, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 flex-1">
                    {getMetricIcon(metric.metric)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">
                          {metric.metric.replace(/_/g, ' ')}
                        </span>
                        {getQualityBadge(metric.status)}
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatNumber(metric.recordCount)} records
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${getQualityColor(metric.quality)}`}>
                      {Math.round(metric.quality)}%
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-6">
                  <Database className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No metrics data available</p>
                </div>
              )}
            </div>

            {/* Issues & Recommendations */}
            {data.recommendations && data.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Recommendations
                </h4>
                <div className="space-y-1">
                  {data.recommendations.slice(0, 3).map((rec, index) => (
                    <div key={index} className="text-xs text-gray-600 flex items-start gap-2">
                      <div className="w-1 h-1 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Indicators */}
            {data.metrics && data.metrics.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>{data.metrics.filter(m => m.status === 'good').length} Good</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-600" />
                    <span>{data.metrics.filter(m => m.status === 'warning').length} Warning</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-600" />
                    <span>{data.metrics.filter(m => m.status === 'poor').length} Poor</span>
                  </div>
                </div>
                <span>
                  Updated {new Date(data.lastAssessment).toLocaleDateString()}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}