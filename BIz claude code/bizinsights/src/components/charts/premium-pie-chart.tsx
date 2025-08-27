"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MoreHorizontal, PieChart as PieChartIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface DataPoint {
  name: string
  value: number
  color?: string
}

interface PremiumPieChartProps {
  title: string
  data: DataPoint[]
  valueKey?: string
  nameKey?: string
  colors?: string[]
  height?: number
  currency?: string
  formatValue?: (value: number) => string
  showLegend?: boolean
  showLabels?: boolean
  innerRadius?: number
  className?: string
}

export function PremiumPieChart({
  title,
  data,
  valueKey = 'value',
  nameKey = 'name',
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
  height = 350,
  currency,
  formatValue,
  showLegend = true,
  showLabels = true,
  innerRadius = 0,
  className
}: PremiumPieChartProps) {
  const formatTooltipValue = (value: number) => {
    if (formatValue) return formatValue(value)
    if (currency) return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
    return value.toLocaleString()
  }

  const totalValue = data.reduce((sum, item) => sum + item[valueKey as keyof DataPoint] as number, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const percentage = ((data[valueKey] / totalValue) * 100).toFixed(1)
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">{data[nameKey]}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: payload[0].color }}
              />
              <span className="text-sm text-gray-600">
                {formatTooltipValue(data[valueKey])}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {percentage}% of total
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (!showLabels || percent < 0.05) return null // Don't show labels for slices < 5%
    
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  const CustomLegend = ({ payload }: any) => {
    if (!showLegend) return null
    
    return (
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {payload.map((entry: any, index: number) => {
          const percentage = ((entry.payload[valueKey] / totalValue) * 100).toFixed(1)
          return (
            <div key={index} className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs font-medium text-gray-700">
                {entry.value}
              </span>
              <span className="text-xs text-gray-500">
                ({percentage}%)
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card className={`premium-chart-card ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-gray-900">
            {title}
          </CardTitle>
          <div className="flex items-center gap-1">
            <PieChartIcon className="h-3 w-3 text-blue-600" />
            <span className="text-xs text-gray-600">
              {data.length} categories • {formatTooltipValue(totalValue)} total
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
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={<CustomLabel />}
                outerRadius={Math.min(height * 0.35, 120)}
                innerRadius={innerRadius}
                fill="#8884d8"
                dataKey={valueKey}
                stroke="#ffffff"
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color || colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}