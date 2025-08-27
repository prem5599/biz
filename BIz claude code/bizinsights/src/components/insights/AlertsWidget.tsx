'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp,
  RefreshCw,
  Bell,
  Clock,
  XCircle,
  CheckCircle,
  Zap
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Alert {
  id: string
  type: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  metric: string
  value: number | string
  threshold?: number
  trend?: 'up' | 'down' | 'stable'
  createdAt: string
  acknowledged?: boolean
  severity: 'critical' | 'high' | 'medium' | 'low'
}

interface AlertsData {
  alerts: Alert[]
  summary: {
    total: number
    critical: number
    unacknowledged: number
    last24h: number
  }
  lastUpdated: string
}

interface AlertsWidgetProps {
  organizationId?: string
}

export function AlertsWidget({ organizationId }: AlertsWidgetProps) {
  const [data, setData] = useState<AlertsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAlerts = async () => {
    if (!organizationId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/organizations/${organizationId}/insights/alerts`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch alerts')
      }
    } catch (err) {
      console.error('Error fetching alerts:', err)
      setError('Failed to load alerts')
    } finally {
      setIsLoading(false)
    }
  }

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`/api/insights/feedback`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          insightId: alertId,
          organizationId,
          acknowledged: true,
          feedback: 'Alert acknowledged by user'
        })
      })
      
      // Update local state
      if (data) {
        setData({
          ...data,
          alerts: data.alerts.map(alert => 
            alert.id === alertId ? { ...alert, acknowledged: true } : alert
          )
        })
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [organizationId])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600'
      case 'high':
        return 'text-orange-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="animate-pulse">🚨 Critical</Badge>
      case 'high':
        return <Badge variant="destructive">⚡ High</Badge>
      case 'medium':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-200">⚠️ Medium</Badge>
      case 'low':
        return <Badge variant="secondary">ℹ️ Low</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const formatValue = (value: number | string, metric: string) => {
    if (typeof value === 'number') {
      if (metric.toLowerCase().includes('revenue') || metric.toLowerCase().includes('price')) {
        return `$${value.toLocaleString()}`
      }
      if (metric.toLowerCase().includes('rate') || metric.toLowerCase().includes('percent')) {
        return `${value.toFixed(1)}%`
      }
      return value.toLocaleString()
    }
    return value
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5 text-orange-600" />
          Real-time Alerts
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAlerts}
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
            <RefreshCw className="h-8 w-8 text-orange-600 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading alerts...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-6">
            <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">{error}</p>
            <Button size="sm" variant="outline" onClick={fetchAlerts}>
              Try Again
            </Button>
          </div>
        )}

        {!isLoading && !error && (!data || !data.alerts || data.alerts.length === 0) && (
          <div className="text-center py-6">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">All Clear!</p>
            <p className="text-xs text-gray-500">No active alerts at this time</p>
          </div>
        )}

        {data && data.alerts && data.alerts.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-100">
              <div className="text-center">
                <div className="text-xl font-bold text-red-600">{data.summary?.critical || 0}</div>
                <div className="text-xs text-gray-600">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-orange-600">{data.summary?.unacknowledged || 0}</div>
                <div className="text-xs text-gray-600">Unread</div>
              </div>
            </div>

            {/* Alerts List */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {data.alerts.slice(0, 5).map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-3 rounded-lg border transition-all ${
                    alert.acknowledged 
                      ? 'bg-gray-50 border-gray-200 opacity-75' 
                      : 'bg-white border-orange-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      {getSeverityBadge(alert.severity)}
                      {getTrendIcon(alert.trend)}
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-gray-900 leading-tight">
                      {alert.title}
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {alert.description}
                    </p>
                    
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium capitalize text-gray-700">
                          {alert.metric.replace(/_/g, ' ')}:
                        </span>
                        <span className={getSeverityColor(alert.severity)}>
                          {formatValue(alert.value, alert.metric)}
                        </span>
                        {alert.threshold && (
                          <span className="text-gray-500">
                            (threshold: {formatValue(alert.threshold, alert.metric)})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Show More Link */}
            {data.alerts.length > 5 && (
              <div className="text-center pt-2 border-t border-gray-100">
                <Button variant="ghost" size="sm" className="text-xs">
                  View {data.alerts.length - 5} more alerts
                </Button>
              </div>
            )}

            {/* Last Updated */}
            {data.lastUpdated && (
              <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
                Last updated {formatDistanceToNow(new Date(data.lastUpdated), { addSuffix: true })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}