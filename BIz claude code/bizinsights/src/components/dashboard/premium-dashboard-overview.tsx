"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PremiumLineChart, PremiumBarChart, PremiumPieChart, RevenueOrdersCorrelationChart } from '@/components/charts'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Target } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'

interface DashboardOverviewProps {
  data: {
    revenue: Array<{ date: string; value: number }>
    revenueTotal: number
    revenueGrowth: number
    orders: Array<{ date: string; value: number }>
    ordersTotal: number
    ordersGrowth: number
    customers: Array<{ date: string; value: number }>
    customersTotal: number
    customersGrowth: number
    conversionRate: number
    averageOrderValue: number
  }
  currency: string
  isLoading?: boolean
}

export function PremiumDashboardOverview({ data, currency, isLoading = false }: DashboardOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-80 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }


  // Prepare data for different charts - both revenue and orders from same source
  const revenueVsOrdersData = data.revenue.map((item: any) => ({
    date: item.date,
    revenue: item.value,
    orders: item.orders || 0  // Orders are already in the same data point
  }))

  const performanceData = [
    { name: 'Conversion Rate', value: data.conversionRate, target: 3.5 },
    { name: 'Avg Order Value', value: data.averageOrderValue, target: 100 },
    { name: 'Customer Growth', value: data.customersGrowth, target: 10 },
    { name: 'Revenue Growth', value: data.revenueGrowth, target: 15 }
  ]

  return (
    <div className="space-y-6">
      {/* Detailed Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue & Orders Correlation - Enhanced */}
        <RevenueOrdersCorrelationChart
          data={revenueVsOrdersData}
          currency={currency}
          isLoading={isLoading}
          height={350}
        />

        {/* Performance vs Targets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Performance vs Targets
            </CardTitle>
            <p className="text-sm text-gray-600">
              How your key metrics compare to industry benchmarks
            </p>
          </CardHeader>
          <CardContent>
            <PremiumBarChart
              title=""
              data={performanceData}
              height={300}
              colors={['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b']}
              className="border-0 shadow-none"
            />
            <div className="mt-4 grid grid-cols-2 gap-4">
              {performanceData.map((item, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{item.name}:</span>
                    <span className={`font-semibold ${
                      item.value >= item.target ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {item.name.includes('Rate') || item.name.includes('Growth') 
                        ? `${item.value.toFixed(1)}%` 
                        : item.name.includes('Value')
                        ? formatCurrency(item.value, currency)
                        : item.value.toFixed(1)
                      }
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Target: {item.name.includes('Rate') || item.name.includes('Growth') 
                      ? `${item.target}%` 
                      : item.name.includes('Value')
                      ? formatCurrency(item.target, currency)
                      : item.target
                    }
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Business Health Summary
          </CardTitle>
          <p className="text-sm text-gray-600">
            Quick insights to understand your business performance at a glance
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Health Score */}
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {Math.round((data.conversionRate * 10 + data.revenueGrowth + data.customersGrowth) / 3)}%
              </div>
              <p className="text-sm font-medium text-gray-700">Overall Health Score</p>
              <p className="text-xs text-gray-500 mt-1">
                Based on conversion, revenue, and customer growth
              </p>
            </div>

            {/* Revenue per Customer */}
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatCurrency(data.revenueTotal / data.customersTotal, currency)}
              </div>
              <p className="text-sm font-medium text-gray-700">Revenue per Customer</p>
              <p className="text-xs text-gray-500 mt-1">
                Average revenue generated per customer
              </p>
            </div>

            {/* Growth Momentum */}
            <div className="text-center">
              <div className={`text-3xl font-bold mb-2 ${
                (data.revenueGrowth + data.ordersGrowth + data.customersGrowth) / 3 > 0 
                  ? 'text-blue-600' 
                  : 'text-red-600'
              }`}>
                {((data.revenueGrowth + data.ordersGrowth + data.customersGrowth) / 3).toFixed(1)}%
              </div>
              <p className="text-sm font-medium text-gray-700">Growth Momentum</p>
              <p className="text-xs text-gray-500 mt-1">
                Combined growth across all key metrics
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}