"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface DataPoint {
  date: string
  value: number
  label?: string
}

interface PremiumLineChartProps {
  title: string
  data: DataPoint[]
  valueKey?: string
  xAxisKey?: string
  color?: string
  gradient?: boolean
  showTrend?: boolean
  height?: number
  currency?: string
  formatValue?: (value: number) => string
  className?: string
}

export function PremiumLineChart({
  title,
  data,
  valueKey = 'value',
  xAxisKey = 'date',
  color = '#3b82f6',
  gradient = true,
  showTrend = true,
  height = 350,
  currency,
  formatValue,
  className
}: PremiumLineChartProps) {
  const formatTooltipValue = (value: number) => {
    if (formatValue) return formatValue(value)
    if (currency) return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
    return value.toLocaleString()
  }

  const formatAxisValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toString()
  }

  const calculateTrend = () => {
    if (data.length < 2) return { trend: 0, direction: 'neutral' }
    const firstValue = data[0][valueKey as keyof DataPoint] as number
    const lastValue = data[data.length - 1][valueKey as keyof DataPoint] as number
    const trend = ((lastValue - firstValue) / firstValue) * 100
    return { 
      trend: Math.abs(trend), 
      direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral' 
    }
  }

  const { trend, direction } = calculateTrend()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600">
                  {formatTooltipValue(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  const ChartComponent = gradient ? AreaChart : LineChart

  return (
    <Card className={`premium-chart-card ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-gray-900">
            {title}
          </CardTitle>
          {showTrend && direction !== 'neutral' && (
            <div className="flex items-center gap-1">
              {direction === 'up' ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={`text-xs font-medium ${
                direction === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.toFixed(1)}% {direction === 'up' ? 'increase' : 'decrease'}
              </span>
            </div>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Export as PNG</DropdownMenuItem>
            <DropdownMenuItem>Export Data</DropdownMenuItem>
            <DropdownMenuItem>View Details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                {gradient && (
                  <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                  </linearGradient>
                )}
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#f0f0f0" 
                horizontal={true}
                vertical={false}
              />
              
              <XAxis
                dataKey={xAxisKey}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={(value) => {
                  try {
                    return new Date(value).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })
                  } catch {
                    return value
                  }
                }}
              />
              
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={formatAxisValue}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {gradient ? (
                <Area
                  type="monotone"
                  dataKey={valueKey}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#gradient-${title})`}
                  dot={{ fill: color, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey={valueKey}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ fill: color, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
                />
              )}
            </ChartComponent>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}