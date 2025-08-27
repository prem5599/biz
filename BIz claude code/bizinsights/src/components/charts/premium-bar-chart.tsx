"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MoreHorizontal, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface DataPoint {
  name: string
  value: number
  color?: string
}

interface PremiumBarChartProps {
  title: string
  data: DataPoint[]
  valueKey?: string
  nameKey?: string
  colors?: string[]
  height?: number
  currency?: string
  formatValue?: (value: number) => string
  showValues?: boolean
  className?: string
}

export function PremiumBarChart({
  title,
  data,
  valueKey = 'value',
  nameKey = 'name',
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
  height = 350,
  currency,
  formatValue,
  showValues = true,
  className
}: PremiumBarChartProps) {
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

  const CustomLabel = ({ x, y, width, value }: any) => {
    if (!showValues) return null
    return (
      <text 
        x={x + width / 2} 
        y={y - 5} 
        fill="#6b7280" 
        textAnchor="middle" 
        fontSize="12"
        fontWeight="500"
      >
        {formatAxisValue(value)}
      </text>
    )
  }

  const totalValue = data.reduce((sum, item) => sum + item[valueKey as keyof DataPoint] as number, 0)

  return (
    <Card className={`premium-chart-card ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-gray-900">
            {title}
          </CardTitle>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-blue-600" />
            <span className="text-xs text-gray-600">
              Total: {formatTooltipValue(totalValue)}
            </span>
          </div>
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
            <BarChart 
              data={data} 
              margin={{ top: 20, right: 5, left: 5, bottom: 5 }}
              barCategoryGap="20%"
            >
              <defs>
                {colors.map((color, index) => (
                  <linearGradient key={index} id={`barGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.9} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.6} />
                  </linearGradient>
                ))}
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#f0f0f0" 
                horizontal={true}
                vertical={false}
              />
              
              <XAxis
                dataKey={nameKey}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                interval={0}
                angle={data.length > 6 ? -45 : 0}
                textAnchor={data.length > 6 ? 'end' : 'middle'}
                height={data.length > 6 ? 60 : 30}
              />
              
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={formatAxisValue}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Bar 
                dataKey={valueKey} 
                radius={[4, 4, 0, 0]}
                label={<CustomLabel />}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color || `url(#barGradient${index % colors.length})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}