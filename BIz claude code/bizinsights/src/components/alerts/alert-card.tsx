"use client"

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Alert, AlertSeverity, AlertType } from '@/types/alerts'
import { formatDistanceToNow } from 'date-fns'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Package,
  TrendingDown,
  Wifi,
  Users,
  DollarSign,
  Shield,
  Settings,
  ExternalLink,
  X,
  Check,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlertCardProps {
  alert: Alert
  onAcknowledge?: (alertId: string) => void
  onResolve?: (alertId: string) => void
  onDismiss?: (alertId: string) => void
  compact?: boolean
}

export function AlertCard({ 
  alert, 
  onAcknowledge, 
  onResolve, 
  onDismiss, 
  compact = false 
}: AlertCardProps) {
  const getSeverityConfig = (severity: AlertSeverity) => {
    const configs = {
      low: {
        icon: Info,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        badge: 'bg-blue-100 text-blue-800'
      },
      medium: {
        icon: AlertCircle,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        badge: 'bg-yellow-100 text-yellow-800'
      },
      high: {
        icon: AlertTriangle,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        badge: 'bg-orange-100 text-orange-800'
      },
      critical: {
        icon: AlertTriangle,
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        badge: 'bg-red-100 text-red-800'
      }
    }
    return configs[severity]
  }

  const getTypeIcon = (type: AlertType) => {
    const icons = {
      inventory: Package,
      performance: TrendingDown,
      integration: Wifi,
      customer: Users,
      financial: DollarSign,
      security: Shield,
      system: Settings
    }
    return icons[type]
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-red-100 text-red-800',
      acknowledged: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      dismissed: 'bg-gray-100 text-gray-800'
    }
    return variants[status as keyof typeof variants] || variants.active
  }

  const severityConfig = getSeverityConfig(alert.severity)
  const TypeIcon = getTypeIcon(alert.type)
  const SeverityIcon = severityConfig.icon

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:shadow-sm transition-shadow",
              severityConfig.bg,
              severityConfig.border
            )}>
              <div className="flex items-center gap-2">
                <SeverityIcon className={cn("h-4 w-4", severityConfig.color)} />
                <TypeIcon className="h-4 w-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {alert.title}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
                </p>
              </div>
              <Badge variant="outline" className={getStatusBadge(alert.status)}>
                {alert.status}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs">
              <p className="font-medium">{alert.title}</p>
              <p className="text-sm">{alert.description}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      severityConfig.border,
      alert.status === 'active' && "ring-1 ring-opacity-20 ring-current"
    )}>
      <CardHeader className={cn("pb-3", severityConfig.bg)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <SeverityIcon className={cn("h-5 w-5", severityConfig.color)} />
              <TypeIcon className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{alert.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={severityConfig.badge}>
                  {alert.severity.toUpperCase()}
                </Badge>
                <Badge variant="outline" className={getStatusBadge(alert.status)}>
                  {alert.status.toUpperCase()}
                </Badge>
                <span className="text-xs text-gray-500 capitalize">
                  {alert.type}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {alert.status === 'active' && onAcknowledge && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAcknowledge(alert.id)}
                className="h-8 w-8 p-0"
              >
                <Clock className="h-4 w-4" />
              </Button>
            )}
            {(alert.status === 'active' || alert.status === 'acknowledged') && onResolve && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onResolve(alert.id)}
                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(alert.id)}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <p className="text-sm text-gray-700 mb-3">{alert.description}</p>
        
        {alert.metadata && (
          <div className="space-y-2 mb-3">
            {Object.entries(alert.metadata).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                <span className="font-medium text-gray-900">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Created {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
          </span>
          {alert.actionUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={alert.actionUrl} className="flex items-center gap-1">
                {alert.actionLabel || 'View Details'}
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}