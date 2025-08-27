'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AdvancedMetricCard } from './advanced-metric-card'
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Star, 
  ShoppingCart, 
  Clock,
  DollarSign,
  TrendingUp
} from 'lucide-react'

interface CustomerInsightsData {
  totalCustomers: number
  newCustomers: number
  returningCustomers: number
  customerLifetimeValue: number
  averageOrderValue: number
  retentionRate: number
  purchaseFrequency: number
  customerSegments: {
    vip: number
    regular: number
    atrisk: number
    new: number
  }
  topCustomers: Array<{
    id: string
    name: string
    totalSpent: number
    orders: number
    lastPurchase: string
  }>
  churnRisk: {
    high: number
    medium: number
    low: number
  }
}

interface CustomerInsightsWidgetProps {
  data: CustomerInsightsData
  currency: string
  isLoading?: boolean
}

export function CustomerInsightsWidget({ data, currency, isLoading }: CustomerInsightsWidgetProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(value)
  }

  const getRetentionStatus = (rate: number) => {
    if (rate >= 80) return 'good'
    if (rate >= 60) return 'warning'
    return 'danger'
  }

  const getCLVStatus = (clv: number, aov: number) => {
    const ratio = clv / aov
    if (ratio >= 5) return 'good'
    if (ratio >= 3) return 'warning'
    return 'danger'
  }

  return (
    <div className="space-y-6">
      {/* Main Customer Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AdvancedMetricCard
          title="Customer Lifetime Value"
          value={formatCurrency(data.customerLifetimeValue)}
          subtitle="Average value per customer"
          icon={<DollarSign className="h-4 w-4" />}
          status={getCLVStatus(data.customerLifetimeValue, data.averageOrderValue)}
          benchmark={{
            value: formatCurrency(data.averageOrderValue * 5),
            label: "Industry Target"
          }}
          insights={[
            `${Math.round(data.customerLifetimeValue / data.averageOrderValue)}x average order value`,
            `${data.purchaseFrequency.toFixed(1)} purchases per customer on average`
          ]}
        />

        <AdvancedMetricCard
          title="Customer Retention Rate"
          value={`${data.retentionRate.toFixed(1)}%`}
          subtitle="Customers who return"
          icon={<UserCheck className="h-4 w-4" />}
          status={getRetentionStatus(data.retentionRate)}
          trend={data.retentionRate >= 70 ? 'up' : 'down'}
          trendPercentage={Math.abs(data.retentionRate - 70)}
          insights={[
            `${data.returningCustomers} returning customers`,
            "Retention directly impacts profitability"
          ]}
        />

        <AdvancedMetricCard
          title="Purchase Frequency"
          value={`${data.purchaseFrequency.toFixed(1)}x`}
          subtitle="Orders per customer"
          icon={<ShoppingCart className="h-4 w-4" />}
          status={data.purchaseFrequency >= 2 ? 'good' : 'warning'}
          benchmark={{
            value: "2.5x",
            label: "E-commerce Average"
          }}
          insights={[
            "Higher frequency = better engagement",
            "Focus on repeat purchase campaigns"
          ]}
        />

        <AdvancedMetricCard
          title="New vs Returning"
          value={`${Math.round((data.returningCustomers / data.totalCustomers) * 100)}%`}
          subtitle="Returning customer ratio"
          icon={<Users className="h-4 w-4" />}
          status={data.returningCustomers > data.newCustomers ? 'good' : 'warning'}
          insights={[
            `${data.newCustomers} new customers this period`,
            `${data.returningCustomers} returning customers`
          ]}
        />
      </div>

      {/* Customer Segmentation */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Customer Segments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-100 text-purple-800">VIP</Badge>
                  <span className="text-sm text-gray-600">High-value customers</span>
                </div>
                <span className="font-semibold">{data.customerSegments.vip}</span>
              </div>
              <Progress value={(data.customerSegments.vip / data.totalCustomers) * 100} className="h-2" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">Regular</Badge>
                  <span className="text-sm text-gray-600">Consistent buyers</span>
                </div>
                <span className="font-semibold">{data.customerSegments.regular}</span>
              </div>
              <Progress value={(data.customerSegments.regular / data.totalCustomers) * 100} className="h-2" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-100 text-yellow-800">At Risk</Badge>
                  <span className="text-sm text-gray-600">May churn soon</span>
                </div>
                <span className="font-semibold">{data.customerSegments.atrisk}</span>
              </div>
              <Progress value={(data.customerSegments.atrisk / data.totalCustomers) * 100} className="h-2" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800">New</Badge>
                  <span className="text-sm text-gray-600">First-time buyers</span>
                </div>
                <span className="font-semibold">{data.customerSegments.new}</span>
              </div>
              <Progress value={(data.customerSegments.new / data.totalCustomers) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topCustomers.slice(0, 5).map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{customer.name}</p>
                      <p className="text-xs text-gray-500">{customer.orders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(customer.totalSpent)}</p>
                    <p className="text-xs text-gray-500">
                      Last: {new Date(customer.lastPurchase).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Churn Risk Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Churn Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">{data.churnRisk.high}</div>
              <div className="text-sm text-red-700">High Risk</div>
              <div className="text-xs text-red-600 mt-1">No purchase in 90+ days</div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{data.churnRisk.medium}</div>
              <div className="text-sm text-yellow-700">Medium Risk</div>
              <div className="text-xs text-yellow-600 mt-1">No purchase in 60-90 days</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{data.churnRisk.low}</div>
              <div className="text-sm text-green-700">Low Risk</div>
              <div className="text-xs text-green-600 mt-1">Active customers</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}