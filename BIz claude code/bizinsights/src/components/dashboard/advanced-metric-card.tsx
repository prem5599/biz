'use client'

import { useState, useMemo } from 'react'
import { formatCurrency } from '@/lib/currency'
import { TrendingUp, TrendingDown, Minus, Info, Target } from 'lucide-react'

interface DataPoint {
  date: string
  value: number
}

interface AdvancedMetricCardProps {
  title: string
  value: string | number
  previousValue?: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'stable'
  trendPercentage?: number
  status?: 'good' | 'warning' | 'danger' | 'neutral'
  children?: React.ReactNode
  icon?: React.ReactNode
  benchmark?: {
    value: string | number
    label: string
  }
  insights?: string[]
  chartData?: DataPoint[]
  currency?: string
  showComparison?: boolean
  comparisonData?: {
    label: string
    value: string | number
  }
}

export function AdvancedMetricCard({
  title,
  value,
  previousValue,
  subtitle,
  trend,
  trendPercentage,
  status = 'neutral',
  children,
  icon,
  benchmark,
  insights,
  chartData = [],
  currency = 'USD',
  showComparison = false,
  comparisonData
}: AdvancedMetricCardProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; data: DataPoint } | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const getTrendColor = () => {
    if (trend === 'up') return '#22c55e'
    if (trend === 'down') return '#ef4444'
    return '#6b7280'
  }

  const getTrendSign = () => {
    if (trend === 'up') return '+'
    if (trend === 'down') return '-'
    return ''
  }

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3" />
    if (trend === 'down') return <TrendingDown className="h-3 w-3" />
    return <Minus className="h-3 w-3" />
  }

  const getStatusColor = () => {
    switch (status) {
      case 'good': return '#22c55e'
      case 'warning': return '#f59e0b'
      case 'danger': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getStatusBackground = () => {
    switch (status) {
      case 'good': return '#f0fdf4'
      case 'warning': return '#fffbeb'
      case 'danger': return '#fef2f2'
      default: return '#f8fafc'
    }
  }

  const formatValue = (val: number) => {
    if (title.toLowerCase().includes('revenue') || title.toLowerCase().includes('value')) {
      return formatCurrency(val, currency)
    }
    if (title.toLowerCase().includes('rate') || title.toLowerCase().includes('percentage')) {
      return `${val.toFixed(1)}%`
    }
    return val.toLocaleString()
  }

  const chartMetrics = useMemo(() => {
    if (!chartData || chartData.length === 0) return null
    
    const values = chartData.map(d => d.value)
    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)
    const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length
    const volatility = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - avgValue, 2), 0) / values.length)
    
    return {
      max: maxValue,
      min: minValue,
      avg: avgValue,
      volatility: (volatility / avgValue) * 100,
      trend: values[values.length - 1] > values[0] ? 'up' : 'down',
      change: ((values[values.length - 1] - values[0]) / values[0]) * 100
    }
  }, [chartData])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return null
    }

    const maxValue = Math.max(...chartData.map(d => d.value))
    const minValue = Math.min(...chartData.map(d => d.value))
    const range = maxValue - minValue || maxValue || 1

    const width = 280
    const height = 60
    const padding = 15

    const points = chartData.map((point, index) => ({
      x: padding + (index / (chartData.length - 1)) * (width - padding * 2),
      y: height - padding - ((point.value - minValue) / range) * (height - padding * 2),
      data: point
    }))

    const pathData = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ')

    const areaPath = `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    const lineColor = getTrendColor()

    return (
      <div className="relative mt-3 bg-gray-50 rounded-lg p-2">
        <svg 
          className="w-full h-15 overflow-visible" 
          viewBox={`0 0 ${width} ${height}`}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id={`gradient-${title.replace(/\s+/g, '-')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
          <path
            d={areaPath}
            fill={`url(#gradient-${title.replace(/\s+/g, '-')})`}
          />
          
          <path
            d={pathData}
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3"
              fill={lineColor}
              className="hover:r-4 cursor-pointer transition-all"
              onMouseEnter={() => setHoveredPoint({ x: point.x, y: point.y, data: point.data })}
            />
          ))}
        </svg>

        {hoveredPoint && (
          <div
            className="absolute z-10 bg-white border shadow-sm rounded px-2 py-1 text-xs pointer-events-none transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`,
              marginTop: '-8px'
            }}
          >
            <div className="font-medium">{formatValue(hoveredPoint.data.value)}</div>
            <div className="text-gray-500">{formatDate(hoveredPoint.data.date)}</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <div 
              className="w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ 
                backgroundColor: getStatusBackground(),
                color: getStatusColor()
              }}
            >
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>
        
        {trend && trendPercentage && (
          <div 
            className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded"
            style={{ 
              color: getTrendColor(),
              backgroundColor: trend === 'up' ? '#f0fdf4' : trend === 'down' ? '#fef2f2' : '#f8fafc'
            }}
          >
            {getTrendIcon()}
            <span>{getTrendSign()}{trendPercentage}%</span>
          </div>
        )}
      </div>

      <div className="mb-3">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {previousValue && (
          <div className="text-xs text-gray-500 mt-1">
            Previous: {previousValue}
          </div>
        )}
      </div>

      {benchmark && (
        <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded mt-3">
          <span className="text-xs text-gray-600">{benchmark.label}</span>
          <span className="text-xs font-medium text-gray-900">{benchmark.value}</span>
        </div>
      )}

      {/* Interactive Chart */}
      {renderChart()}

      {insights && insights.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {insights.slice(0, 1).map((insight, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
              <span className="text-xs text-gray-600">{insight}</span>
            </div>
          ))}
        </div>
      )}

      {children}
    </div>
  )
}