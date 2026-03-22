"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Info, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdvancedMetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  tooltip?: string
  trend?: {
    value: number
    label: string
    period?: string
  }
  status?: 'good' | 'warning' | 'danger' | 'neutral'
  benchmark?: {
    value: string
    label: string
    comparison?: 'above' | 'below' | 'equal'
  }
  details?: string[]
  className?: string
}

export function AdvancedMetricCard({
  title,
  value,
  subtitle,
  icon,
  tooltip,
  trend,
  status = 'neutral',
  benchmark,
  details,
  className
}: AdvancedMetricCardProps) {
  const statusColors = {
    good: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    danger: 'border-red-200 bg-red-50',
    neutral: 'border-gray-200 bg-white'
  }

  const getTrendIcon = (trendValue: number) => {
    if (trendValue > 0) return <TrendingUp className="h-3 w-3 text-green-600" />
    if (trendValue < 0) return <TrendingDown className="h-3 w-3 text-red-600" />
    return null
  }

  const getTrendColor = (trendValue: number) => {
    if (trendValue > 0) return 'text-green-600'
    if (trendValue < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  return (
    <TooltipProvider>
      <Card className={cn(statusColors[status], className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium text-gray-900">{title}</CardTitle>
            {tooltip && (
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {icon && <div className="text-gray-500">{icon}</div>}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}

            {trend && (
              <div className="flex items-center gap-1">
                {getTrendIcon(trend.value)}
                <span className={cn("text-xs font-medium", getTrendColor(trend.value))}>
                  {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}% {trend.label}
                </span>
                {trend.period && (
                  <span className="text-xs text-gray-500">vs {trend.period}</span>
                )}
              </div>
            )}

            {benchmark && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{benchmark.label}:</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium">{benchmark.value}</span>
                  {benchmark.comparison === 'above' && <TrendingUp className="h-3 w-3 text-green-500" />}
                  {benchmark.comparison === 'below' && <TrendingDown className="h-3 w-3 text-red-500" />}
                  {benchmark.comparison === 'equal' && <div className="w-3 h-3 rounded-full bg-gray-400" />}
                </div>
              </div>
            )}

            {details && details.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                {details.map((detail, index) => (
                  <p key={index} className="text-xs text-gray-500">{detail}</p>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}