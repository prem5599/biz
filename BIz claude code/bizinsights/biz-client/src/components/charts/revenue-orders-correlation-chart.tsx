"use client"

import '@/styles/charts.css'
import { 
  ComposedChart,
  Line,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, BarChart3, Calendar, ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface CorrelationDataPoint {
  date: string
  revenue: number
  orders: number
  averageOrderValue?: number
}

type DateRangeType = '7d' | '30d' | '90d' | 'all'

interface RevenueOrdersCorrelationChartProps {
  data: CorrelationDataPoint[]
  currency: string
  isLoading?: boolean
  height?: number
}

export function RevenueOrdersCorrelationChart({
  data,
  currency,
  isLoading = false,
  height = 400
}: RevenueOrdersCorrelationChartProps) {
  const [dateRange, setDateRange] = useState<DateRangeType>('30d')

  // Filter data based on selected date range and fill in missing days with zeros
  const filteredData = useMemo(() => {
    const now = new Date()
    let daysBack: number
    
    switch (dateRange) {
      case '7d':
        daysBack = 7
        break
      case '30d':
        daysBack = 30
        break
      case '90d':
        daysBack = 90
        break
      case 'all':
        daysBack = 365 // Show up to 1 year for 'all'
        break
      default:
        daysBack = 30
    }
    
    // Generate complete date range
    const completeData = []
    const dataByDate = new Map()
    
    // Index existing data by date
    data.forEach(item => {
      const dateKey = typeof item.date === 'string' ? item.date : new Date(item.date).toISOString().split('T')[0]
      dataByDate.set(dateKey, item)
    })
    
    // Generate all days in range
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateString = date.toISOString().split('T')[0]
      
      // Use existing data or create zero entry
      const dayData = dataByDate.get(dateString) || {
        date: dateString,
        revenue: 0,
        orders: 0
      }
      
      completeData.push(dayData)
    }
    
    return completeData
  }, [data, dateRange])

  // Simple data processing - just format dates
  const chartData = useMemo(() => {
    return filteredData.map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      })
    }))
  }, [filteredData])

  // Simple totals for the filtered period
  const totals = useMemo(() => {
    const totalRevenue = filteredData.reduce((sum, d) => sum + d.revenue, 0)
    // Orders must be whole numbers - sum and floor to ensure no decimals
    const totalOrders = Math.floor(filteredData.reduce((sum, d) => sum + d.orders, 0))
    return { totalRevenue, totalOrders }
  }, [filteredData])

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case '7d': return 'Last 7 Days'
      case '30d': return 'Last 30 Days'
      case '90d': return 'Last 90 Days'
      case 'all': return 'All Time'
      default: return 'Last 30 Days'
    }
  }


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const revenueData = payload.find((p: any) => p.dataKey === 'revenue')
      const ordersData = payload.find((p: any) => p.dataKey === 'orders')

      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-[180px]">
          <p className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">{label}</p>
          
          <div className="space-y-2">
            {revenueData && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-gray-600">Revenue:</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(revenueData.value, currency)}
                </span>
              </div>
            )}
            
            {ordersData && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-600">Orders:</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {Math.floor(ordersData.value)}
                </span>
              </div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 animate-pulse text-blue-600" />
            Daily Revenue & Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Daily Revenue & Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16 text-gray-500">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Data Available</h3>
            <p className="text-sm text-gray-500">Connect your store to see daily revenue and orders</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Daily Revenue & Orders
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {getDateRangeLabel()} • {chartData.length} days of data
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {getDateRangeLabel()}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setDateRange('7d')}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${dateRange === '7d' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    Last 7 Days
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateRange('30d')}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${dateRange === '30d' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    Last 30 Days
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateRange('90d')}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${dateRange === '90d' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    Last 90 Days
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateRange('all')}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${dateRange === 'all' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    All Time
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Simple Summary */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-blue-700 mb-1">Total Revenue</div>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(totals.totalRevenue, currency)}
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-green-700 mb-1">Total Orders</div>
            <div className="text-2xl font-bold text-green-900">
              {totals.totalOrders.toLocaleString()}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="w-full" style={{ height: height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              
              {/* Revenue Y-Axis (Left) */}
              <YAxis 
                yAxisId="revenue"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#3b82f6' }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
                  return `$${value}`
                }}
                width={70}
              />
              
              {/* Orders Y-Axis (Right) */}
              <YAxis 
                yAxisId="orders"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#10b981' }}
                tickFormatter={(value) => Math.floor(value).toString()}
                width={50}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
              />
              
              {/* Revenue Bars */}
              <Bar
                yAxisId="revenue"
                dataKey="revenue"
                fill="#3b82f6"
                opacity={0.8}
                radius={[3, 3, 0, 0]}
                name="Daily Revenue"
              />
              
              {/* Orders Line */}
              <Line
                yAxisId="orders"
                type="monotone"
                dataKey="orders"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                name="Daily Orders"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Simple Explanation */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">📊 How to Read This Chart</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• <span className="text-blue-600 font-medium">Blue bars</span> = Revenue earned each day</p>
            <p>• <span className="text-green-600 font-medium">Green line</span> = Number of orders each day</p>
            <p>• Higher bars = more money earned that day</p>
            <p>• Higher line points = more orders that day</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}