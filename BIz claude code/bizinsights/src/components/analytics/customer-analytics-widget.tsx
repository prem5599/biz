"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdvancedMetricCard } from './advanced-metric-card'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  Heart, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Clock,
  Star,
  Target,
  BarChart3
} from 'lucide-react'
import { formatCurrency } from '@/lib/currency'

interface CustomerAnalyticsProps {
  data: {
    totalCustomers: number
    newCustomers: number
    returningCustomers: number
    customerGrowthRate: number
    averageOrderValue: number
    customerLifetimeValue: number
    customerAcquisitionCost: number
    churnRate: number
    retentionRate: number
    repeatPurchaseRate: number
    customerSegments: {
      vip: number
      regular: number
      atrisk: number
      new: number
    }
    topCustomers: Array<{
      name: string
      email: string
      totalSpent: number
      orders: number
      lastOrder: string
    }>
    customerSatisfaction: number
    purchaseFrequency: number
  }
  currency: string
}

export function CustomerAnalyticsWidget({ data, currency }: CustomerAnalyticsProps) {
  const getChurnStatus = (rate: number) => {
    if (rate > 20) return 'danger'
    if (rate > 10) return 'warning'
    return 'good'
  }

  const getRetentionStatus = (rate: number) => {
    if (rate > 80) return 'good'
    if (rate > 60) return 'warning'
    return 'danger'
  }

  const getSegmentColor = (segment: string) => {
    const colors = {
      vip: 'bg-purple-100 text-purple-800 border-purple-200',
      regular: 'bg-blue-100 text-blue-800 border-blue-200',
      atrisk: 'bg-red-100 text-red-800 border-red-200',
      new: 'bg-green-100 text-green-800 border-green-200'
    }
    return colors[segment as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Customer Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdvancedMetricCard
            title="Total Customers"
            value={data.totalCustomers.toLocaleString()}
            subtitle="Active customer base"
            icon={<Users className="h-4 w-4" />}
            tooltip="Total number of customers who have made at least one purchase"
            trend={{
              value: data.customerGrowthRate,
              label: "growth",
              period: "last month"
            }}
            status="good"
            details={[
              `${data.newCustomers} new this month`,
              `${data.returningCustomers} returning customers`
            ]}
          />

          <AdvancedMetricCard
            title="Customer Acquisition Cost"
            value={formatCurrency(data.customerAcquisitionCost, currency)}
            subtitle="Cost to acquire new customer"
            icon={<UserPlus className="h-4 w-4" />}
            tooltip="Total marketing spend divided by number of new customers acquired"
            benchmark={{
              value: formatCurrency(50, currency),
              label: "Industry avg",
              comparison: data.customerAcquisitionCost < 50 ? 'below' : 'above'
            }}
            status={data.customerAcquisitionCost < 50 ? 'good' : 'warning'}
          />

          <AdvancedMetricCard
            title="Customer Lifetime Value"
            value={formatCurrency(data.customerLifetimeValue, currency)}
            subtitle="Average revenue per customer"
            icon={<DollarSign className="h-4 w-4" />}
            tooltip="Predicted total revenue from a customer over their entire relationship"
            details={[
              `CLV:CAC ratio: ${(data.customerLifetimeValue / data.customerAcquisitionCost).toFixed(1)}:1`,
              `Target ratio: 3:1 or higher`
            ]}
            status={data.customerLifetimeValue / data.customerAcquisitionCost >= 3 ? 'good' : 'warning'}
          />

          <AdvancedMetricCard
            title="Average Order Value"
            value={formatCurrency(data.averageOrderValue, currency)}
            subtitle="Per order revenue"
            icon={<ShoppingCart className="h-4 w-4" />}
            tooltip="Average amount spent per order across all customers"
            trend={{
              value: 8.5,
              label: "increase",
              period: "last quarter"
            }}
            status="good"
          />
        </div>

        {/* Customer Retention & Churn */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AdvancedMetricCard
            title="Retention Rate"
            value={`${data.retentionRate.toFixed(1)}%`}
            subtitle="Customers who return"
            icon={<UserCheck className="h-4 w-4" />}
            tooltip="Percentage of customers who make a repeat purchase within 90 days"
            status={getRetentionStatus(data.retentionRate)}
            benchmark={{
              value: "75%",
              label: "Target",
              comparison: data.retentionRate >= 75 ? 'above' : 'below'
            }}
          />

          <AdvancedMetricCard
            title="Churn Rate"
            value={`${data.churnRate.toFixed(1)}%`}
            subtitle="Customer loss rate"
            icon={<AlertTriangle className="h-4 w-4" />}
            tooltip="Percentage of customers who haven't purchased in the last 90 days"
            status={getChurnStatus(data.churnRate)}
            details={[
              `${Math.round(data.totalCustomers * (data.churnRate / 100))} at-risk customers`,
              "Consider re-engagement campaigns"
            ]}
          />

          <AdvancedMetricCard
            title="Repeat Purchase Rate"
            value={`${data.repeatPurchaseRate.toFixed(1)}%`}
            subtitle="Multiple order customers"
            icon={<Heart className="h-4 w-4" />}
            tooltip="Percentage of customers who have made more than one purchase"
            trend={{
              value: 12.3,
              label: "improvement",
              period: "last month"
            }}
            status="good"
          />
        </div>

        {/* Customer Segmentation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Customer Segmentation
              <Tooltip>
                <TooltipTrigger>
                  <BarChart3 className="h-4 w-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p><strong>VIP:</strong> High-value customers (top 20%)</p>
                    <p><strong>Regular:</strong> Consistent purchasers</p>
                    <p><strong>At Risk:</strong> Haven't purchased recently</p>
                    <p><strong>New:</strong> First-time customers</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(data.customerSegments).map(([segment, count]) => {
                const percentage = (count / data.totalCustomers) * 100
                return (
                  <div key={segment} className="text-center">
                    <div className={`p-4 rounded-lg border ${getSegmentColor(segment)}`}>
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm font-medium capitalize">{segment}</div>
                      <div className="text-xs mt-1">{percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 space-y-3">
              <h4 className="font-medium text-gray-900">Customer Distribution</h4>
              {Object.entries(data.customerSegments).map(([segment, count]) => {
                const percentage = (count / data.totalCustomers) * 100
                return (
                  <div key={segment} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize font-medium">{segment} Customers</span>
                      <span>{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        {data.topCustomers.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Top Customers
                <Badge variant="secondary">{data.topCustomers.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topCustomers.map((customer, index) => (
                  <div key={customer.email} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {formatCurrency(customer.totalSpent, currency)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {customer.orders} orders
                      </p>
                      <p className="text-xs text-gray-400">
                        Last: {new Date(customer.lastOrder).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Top Customers
                <Badge variant="secondary">0</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Individual customer data not available</p>
                <p className="text-sm text-gray-400 mt-1">
                  Customer metrics are calculated from aggregated data
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Behavior Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AdvancedMetricCard
            title="Purchase Frequency"
            value={`${data.purchaseFrequency.toFixed(1)} orders`}
            subtitle="Per customer average"
            icon={<Clock className="h-4 w-4" />}
            tooltip="Average number of orders per customer per year"
            details={[
              "Higher frequency indicates stronger engagement",
              "Industry average: 2.3 orders/year"
            ]}
          />

          <AdvancedMetricCard
            title="Customer Satisfaction"
            value={data.customerSatisfaction > 0 ? `${data.customerSatisfaction.toFixed(1)}/5.0` : "N/A"}
            subtitle={data.customerSatisfaction > 0 ? "Average rating" : "No rating data"}
            icon={<Star className="h-4 w-4" />}
            tooltip="Based on reviews, returns, and support interactions. Requires review/feedback data integration."
            status={data.customerSatisfaction >= 4.0 ? 'good' : data.customerSatisfaction > 0 ? 'warning' : 'neutral'}
            details={data.customerSatisfaction > 0 ? undefined : [
              "Rating data not available",
              "Integrate review systems for insights"
            ]}
          />

          <AdvancedMetricCard
            title="Customer Health Score"
            value={`${Math.round((data.retentionRate + (100 - data.churnRate)) / 2)}%`}
            subtitle="Overall customer health"
            icon={<Heart className="h-4 w-4" />}
            tooltip="Composite score based on retention and churn metrics from your store data"
            status={
              Math.round((data.retentionRate + (100 - data.churnRate)) / 2) >= 70 
                ? 'good' 
                : 'warning'
            }
            details={[
              "Factors: Customer retention & low churn",
              "Target: 70% or higher (without satisfaction data)"
            ]}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}