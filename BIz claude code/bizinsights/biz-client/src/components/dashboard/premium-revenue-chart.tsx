"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PremiumLineChart } from '@/components/charts'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, DollarSign, Info, CalendarDays } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

interface PremiumRevenueChartProps {
  data?: Array<{
    date: string
    revenue: number
    orders: number
  }>
  currency: string
  isLoading?: boolean
}

export function PremiumRevenueChart({ data = [], currency, isLoading = false }: PremiumRevenueChartProps) {
  if (isLoading) {
    return (
      <Card className="premium-chart-card">
        <CardHeader>
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-200 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  // Calculate insights from data
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0)
  const totalOrders = data.reduce((sum, item) => sum + item.orders, 0)
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  
  // Calculate growth
  const firstHalf = data.slice(0, Math.floor(data.length / 2))
  const secondHalf = data.slice(Math.floor(data.length / 2))
  const firstHalfRevenue = firstHalf.reduce((sum, item) => sum + item.revenue, 0)
  const secondHalfRevenue = secondHalf.reduce((sum, item) => sum + item.revenue, 0)
  const growth = firstHalfRevenue > 0 ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0

  // Find best and worst performing days
  const bestDay = data.reduce((max, item) => item.revenue > max.revenue ? item : max, data[0] || { date: '', revenue: 0, orders: 0 })
  const worstDay = data.reduce((min, item) => item.revenue < min.revenue ? item : min, data[0] || { date: '', revenue: 0, orders: 0 })

  // Prepare chart data
  const chartData = data.map(item => ({
    date: item.date,
    value: item.revenue
  }))

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  return (
    <TooltipProvider>
      <Card className="premium-chart-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Revenue Performance
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Daily revenue tracking with growth analysis</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Track your daily revenue trends and identify patterns
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={growth >= 0 ? "default" : "destructive"} className="flex items-center gap-1">
                {growth >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(growth).toFixed(1)}%
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {data.length === 0 ? (
            <div className="h-80 flex flex-col items-center justify-center text-center">
              <DollarSign className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Revenue Data</h3>
              <p className="text-gray-600 mb-4">
                Connect your payment provider or e-commerce platform to see revenue trends
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <CalendarDays className="h-4 w-4" />
                Data will appear here once you have sales
              </div>
            </div>
          ) : (
            <>
              {/* Key Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Total Revenue</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {formatCurrency(totalRevenue, currency)}
                  </div>
                  <div className="text-sm text-green-600">
                    From {totalOrders} orders
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Average Order Value</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {formatCurrency(averageOrderValue, currency)}
                  </div>
                  <div className="text-sm text-blue-600">
                    Per order revenue
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">Best Performing Day</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {formatCurrency(bestDay.revenue, currency)}
                  </div>
                  <div className="text-sm text-purple-600">
                    {formatDate(bestDay.date)}
                  </div>
                </div>
              </div>

              {/* Revenue Chart */}
              <div className="space-y-4">
                <PremiumLineChart
                  title=""
                  data={chartData}
                  currency={currency}
                  gradient={true}
                  height={320}
                  className="border-0 shadow-none bg-transparent"
                />
              </div>

              {/* Insights */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  Revenue Insights
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Period Growth:</span>
                      <span className={`font-medium ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Best Day:</span>
                      <span className="font-medium text-gray-900">
                        {formatDate(bestDay.date)} ({formatCurrency(bestDay.revenue, currency)})
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Orders:</span>
                      <span className="font-medium text-gray-900">{totalOrders.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Daily Average:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(totalRevenue / data.length, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}