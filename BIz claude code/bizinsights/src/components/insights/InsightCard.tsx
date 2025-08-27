'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  BarChart3, 
  Brain,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  Clock,
  Zap
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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
    trendDirection?: 'up' | 'down' | 'stable'
    severity?: 'low' | 'medium' | 'high' | 'critical'
  }
}

interface InsightCardProps {
  insight: InsightData
  organizationId?: string
  onFeedback?: (insightId: string, feedback: any) => void
}

export function InsightCard({ insight, organizationId, onFeedback }: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [feedback, setFeedback] = useState<{
    helpful?: boolean
    implemented?: boolean
    rating?: number
  }>({})

  const getInsightIcon = (type: string, impactScore: number) => {
    switch (type) {
      case 'trend':
        return insight.metadata?.trendDirection === 'up' 
          ? <TrendingUp className="h-5 w-5" /> 
          : insight.metadata?.trendDirection === 'down'
          ? <TrendingDown className="h-5 w-5" />
          : <BarChart3 className="h-5 w-5" />
      case 'alert':
      case 'anomaly':
        return <AlertTriangle className="h-5 w-5" />
      case 'recommendation':
        return <Target className="h-5 w-5" />
      case 'performance':
        return <BarChart3 className="h-5 w-5" />
      default:
        return <Lightbulb className="h-5 w-5" />
    }
  }

  const getInsightColor = (type: string, impactScore: number, priority?: string) => {
    if (priority === 'critical' || impactScore >= 9) return 'text-red-600'
    if (priority === 'high' || impactScore >= 7) return 'text-orange-600'
    if (type === 'recommendation') return 'text-green-600'
    if (type === 'trend') return insight.metadata?.trendDirection === 'up' ? 'text-green-600' : 'text-red-600'
    if (type === 'alert' || type === 'anomaly') return 'text-orange-600'
    if (type === 'performance') return 'text-blue-600'
    return 'text-gray-600'
  }

  const getImpactBadge = (score: number, priority?: string) => {
    if (priority === 'critical' || score >= 9) 
      return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Critical Impact</Badge>
    if (priority === 'high' || score >= 7) 
      return <Badge variant="destructive" className="bg-orange-100 text-orange-800 border-orange-200">High Impact</Badge>
    if (score >= 5) 
      return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">Medium Impact</Badge>
    return <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">Low Impact</Badge>
  }

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive" className="animate-pulse">🚨 Critical</Badge>
      case 'high':
        return <Badge variant="destructive">⚡ High Priority</Badge>
      case 'medium':
        return <Badge variant="default">📊 Medium Priority</Badge>
      case 'low':
        return <Badge variant="secondary">📝 Low Priority</Badge>
      default:
        return null
    }
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      trend: 'Trend Analysis',
      anomaly: 'Anomaly Detection',
      alert: 'Alert',
      performance: 'Performance Insight',
      recommendation: 'Recommendation'
    }
    return labels[type as keyof typeof labels] || type
  }

  const handleFeedback = async (type: 'helpful' | 'not_helpful' | 'implemented', value: boolean) => {
    const newFeedback = { ...feedback }
    
    if (type === 'helpful') {
      newFeedback.helpful = value
    } else if (type === 'not_helpful') {
      newFeedback.helpful = !value
    } else if (type === 'implemented') {
      newFeedback.implemented = value
    }

    setFeedback(newFeedback)

    // Send feedback to API
    if (organizationId) {
      try {
        await fetch('/api/insights/feedback', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            insightId: insight.id,
            organizationId,
            helpful: newFeedback.helpful,
            implemented: newFeedback.implemented,
            feedback: `User interaction: ${type}`
          })
        })
      } catch (error) {
        console.error('Error sending feedback:', error)
      }
    }

    onFeedback?.(insight.id, newFeedback)
  }

  const formatMetricName = (metric: string) => {
    return metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <Card className="relative group hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={`${getInsightColor(insight.type, insight.impactScore, insight.metadata?.priority)} mt-0.5`}>
              {getInsightIcon(insight.type, insight.impactScore)}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg leading-tight mb-2 pr-4">
                {insight.title}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {getImpactBadge(insight.impactScore, insight.metadata?.priority)}
                {getPriorityBadge(insight.metadata?.priority)}
                <Badge variant="outline" className="text-xs">
                  {getTypeLabel(insight.type)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {Math.round(insight.confidence * 100)}% confidence
                </Badge>
                {insight.metadata?.severity && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {insight.metadata.severity} severity
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Quick action indicator */}
          {insight.metadata?.priority === 'critical' && (
            <div className="absolute top-4 right-4">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {insight.description}
          </p>
        </div>

        {/* Recommendation */}
        {insight.recommendation && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  Recommended Action
                </h4>
                <p className="text-sm text-blue-800 leading-relaxed">
                  {insight.recommendation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Metadata and Details */}
        {isExpanded && (
          <div className="space-y-3 pt-2 border-t border-gray-100">
            {/* Priority Reasoning */}
            {insight.metadata?.priorityReasoning && (
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-900 mb-1 flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Analysis
                </h4>
                <p className="text-sm text-gray-700">
                  {insight.metadata.priorityReasoning}
                </p>
              </div>
            )}

            {/* Technical Details */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-medium text-gray-900">Data Points:</span>
                <div className="text-gray-600">{insight.dataPoints}</div>
              </div>
              <div>
                <span className="font-medium text-gray-900">Timeframe:</span>
                <div className="text-gray-600">{insight.timeframe}</div>
              </div>
              <div>
                <span className="font-medium text-gray-900">Algorithm:</span>
                <div className="text-gray-600">{insight.metadata?.algorithm || 'Standard Analysis'}</div>
              </div>
              <div>
                <span className="font-medium text-gray-900">Data Quality:</span>
                <div className="text-gray-600">
                  {insight.metadata?.dataQuality 
                    ? `${Math.round(insight.metadata.dataQuality * 100)}%`
                    : 'N/A'
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Affected Metrics */}
        {insight.affectedMetrics && insight.affectedMetrics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs font-medium text-gray-900 mr-2">Affects:</span>
            {insight.affectedMetrics.map((metric, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {formatMetricName(metric)}
              </Badge>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4">
            {/* Feedback buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${feedback.helpful === true ? 'text-green-600' : ''}`}
                onClick={() => handleFeedback('helpful', true)}
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${feedback.helpful === false ? 'text-red-600' : ''}`}
                onClick={() => handleFeedback('not_helpful', true)}
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </div>

            {/* Implementation status */}
            {insight.type === 'recommendation' && (
              <Button
                variant="ghost"
                size="sm"
                className={`text-xs ${feedback.implemented ? 'text-green-600' : ''}`}
                onClick={() => handleFeedback('implemented', !feedback.implemented)}
              >
                {feedback.implemented ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Implemented
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3 mr-1" />
                    Mark as Done
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Less Details' : 'More Details'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(insight.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}