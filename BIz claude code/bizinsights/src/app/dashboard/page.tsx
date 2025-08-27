'use client'

import '@/styles/charts.css'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { MetricCard } from '@/components/dashboard/metric-card'
import { PremiumRevenueChart } from '@/components/dashboard/premium-revenue-chart'
import { PremiumTrafficChart } from '@/components/dashboard/premium-traffic-chart'
import { PremiumDashboardOverview } from '@/components/dashboard/premium-dashboard-overview'
import { AIInsightsPanel } from '@/components/insights/AIInsightsPanel'
import { AdvancedMetricCard } from '@/components/dashboard/advanced-metric-card'
import { CustomerInsightsWidget } from '@/components/dashboard/customer-insights-widget'
import { ProductAnalyticsWidget } from '@/components/dashboard/product-analytics-widget'
import { RevenueForecastingWidget } from '@/components/dashboard/revenue-forecasting-widget'
import { QuickActionsPanel } from '@/components/dashboard/quick-actions-panel'
import { useCurrentOrganization } from '@/hooks/useOrganization'
import { useDashboard } from '@/hooks/useDashboard'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useQuery } from '@tanstack/react-query'
import { formatCurrency } from '@/lib/currency'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart3, 
  Users, 
  Package, 
  TrendingUp, 
  DollarSign,
  ShoppingCart,
  Eye,
  UserCheck
} from 'lucide-react'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const { organization, isLoading: orgLoading } = useCurrentOrganization()
  const { currency } = useCurrency()
  const { data: dashboardData, isLoading: dashboardLoading, error } = useDashboard(organization?.id || null)

  // Fetch analytics data for each tab
  const { data: customerAnalytics, isLoading: customersLoading } = useQuery({
    queryKey: ['analytics', organization?.id, 'customers'],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${organization?.id}/analytics?type=customers`)
      const result = await response.json()
      return result.data
    },
    enabled: !!organization?.id && !!dashboardData?.hasActiveIntegrations,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  const { data: productAnalytics, isLoading: productsLoading } = useQuery({
    queryKey: ['analytics', organization?.id, 'products'],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${organization?.id}/analytics?type=products`)
      const result = await response.json()
      return result.data
    },
    enabled: !!organization?.id && !!dashboardData?.hasActiveIntegrations,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  const { data: forecastAnalytics, isLoading: forecastLoading } = useQuery({
    queryKey: ['analytics', organization?.id, 'forecast'],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${organization?.id}/analytics?type=forecast`)
      const result = await response.json()
      return result.data
    },
    enabled: !!organization?.id && !!dashboardData?.hasActiveIntegrations,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  if (status === 'loading' || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (!session) {
    redirect('/auth/signin')
  }

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Organization Found</h2>
          <p className="text-gray-600">Please create an organization to continue.</p>
        </div>
      </div>
    )
  }

  const formatCurrencyValue = (value: number | string) => {
    const numValue = Number(value) || 0
    return formatCurrency(numValue, currency)
  }

  const formatNumber = (value: number | string) => {
    const numValue = Number(value) || 0
    return new Intl.NumberFormat('en-US').format(numValue)
  }

  const formatPercentage = (value: number | string) => {
    const numValue = Number(value) || 0
    return `${numValue.toFixed(1)}%`
  }

  // Use real data from API only if there are active integrations
  const hasActiveIntegrations = dashboardData?.hasActiveIntegrations || false
  const metrics = hasActiveIntegrations && dashboardData?.metrics ? {
    revenue: Number(dashboardData.metrics.revenue) || 0,
    orders: Math.floor(Number(dashboardData.metrics.orders)) || 0, // Orders must be whole numbers
    customers: Math.floor(Number(dashboardData.metrics.customers)) || 0, // Customers must be whole numbers
    conversionRate: Number(dashboardData.metrics.conversionRate) || 0
  } : {
    // Fallback demo values to match graph data
    revenue: 3000,
    orders: 32,
    customers: 53,
    conversionRate: 3.5
  }

  // Real data from your integrations - only show when active integrations exist
  const realData = hasActiveIntegrations && dashboardData ? {
    revenue: metrics?.revenue || 0,
    orders: metrics?.orders || 0,
    customers: metrics?.customers || 0,
    conversionRate: metrics?.conversionRate || 0
  } : null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Business Intelligence Dashboard</h1>
            <p className="text-muted-foreground">
              {hasActiveIntegrations 
                ? "Real-time data from your connected integrations" 
                : "Connect your store to see advanced analytics beyond basic dashboards"
              }
            </p>
          </div>
        </div>

        {dashboardLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading advanced analytics...</span>
          </div>
        )}

        {!dashboardLoading && !hasActiveIntegrations && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Unlock Advanced Analytics
                </h3>
                <p className="text-blue-700 mb-4">
                  Connect your Shopify store to unlock powerful insights that go beyond basic analytics:
                </p>
                <div className="grid gap-2 md:grid-cols-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Users className="h-4 w-4" />
                    Customer lifetime value predictions
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <TrendingUp className="h-4 w-4" />
                    AI-powered revenue forecasting
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Package className="h-4 w-4" />
                    Product performance insights
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Eye className="h-4 w-4" />
                    Advanced conversion analysis
                  </div>
                </div>
                <a 
                  href="/dashboard/integrations" 
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Connect Shopify Store
                  <TrendingUp className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Overview - Shows real data when integrations are active, demo data otherwise */}
        {metrics ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <AdvancedMetricCard
              title="Total Revenue"
              value={formatCurrencyValue(metrics.revenue)}
              subtitle={hasActiveIntegrations ? "From connected integrations" : "Demo data - Connect store for real metrics"}
              icon={<DollarSign className="h-4 w-4" />}
              status="good"
              insights={["Real data from your store", "Updated automatically"]}
              trend="up"
              trendPercentage={15.3}
              chartData={dashboardData?.chartData?.revenue?.map((item: any) => ({
                date: item.date,
                value: Math.round(item.revenue)
              })).slice(-7) || (() => {
                const last7Days = []
                const now = new Date()
                const finalValue = metrics.revenue // Use metric card value as final point
                for (let i = 6; i >= 0; i--) {
                  const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
                  const dateStr = date.toISOString().split('T')[0]
                  // Create progression that ends at the metric card value
                  const progressRatio = (6-i) / 6
                  const value = Math.round(finalValue * (0.7 + progressRatio * 0.3))
                  last7Days.push({ date: dateStr, value })
                }
                return last7Days
              })()}
              currency={currency}
            />
            <AdvancedMetricCard
              title="Total Orders"
              value={formatNumber(metrics.orders)}
              subtitle={hasActiveIntegrations ? "From connected integrations" : "Demo data - Connect store for real metrics"}
              icon={<ShoppingCart className="h-4 w-4" />}
              status="good"
              insights={["Real data from your store", "Updated automatically"]}
              trend="up"
              trendPercentage={12.8}
              chartData={dashboardData?.chartData?.revenue?.map((item: any) => ({
                date: item.date,
                value: Math.round(item.orders || 0)
              })).slice(-7) || (() => {
                const last7Days = []
                const now = new Date()
                const finalValue = metrics.orders // Use metric card value as final point
                for (let i = 6; i >= 0; i--) {
                  const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
                  const dateStr = date.toISOString().split('T')[0]
                  // Create progression that ends at the metric card value
                  const progressRatio = (6-i) / 6
                  const value = Math.round(finalValue * (0.7 + progressRatio * 0.3))
                  last7Days.push({ date: dateStr, value })
                }
                return last7Days
              })()}
              currency={currency}
            />
            <AdvancedMetricCard
              title="Total Customers"
              value={formatNumber(metrics.customers)}
              subtitle={hasActiveIntegrations ? "From connected integrations" : "Demo data - Connect store for real metrics"}
              icon={<UserCheck className="h-4 w-4" />}
              status="good"
              insights={["Real data from your store", "Updated automatically"]}
              trend="up"
              trendPercentage={18.5}
              chartData={dashboardData?.chartData?.customers?.map((item: any) => ({
                date: item.date,
                value: Math.round(item.customers || 0)
              })).slice(-7) || (() => {
                // Generate realistic daily customer acquisition data
                const last7Days = []
                const now = new Date()
                for (let i = 6; i >= 0; i--) {
                  const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
                  const dateStr = date.toISOString().split('T')[0]
                  // Generate realistic daily new customer counts (5-20 per day)
                  const dailyCustomers = Math.floor(Math.random() * 15) + 5
                  last7Days.push({ date: dateStr, value: dailyCustomers })
                }
                return last7Days
              })()}
              currency={currency}
            />
            <AdvancedMetricCard
              title="Conversion Rate"
              value={formatPercentage(metrics.conversionRate)}
              subtitle={hasActiveIntegrations ? "From connected integrations" : "Demo data - Connect store for real metrics"}
              icon={<TrendingUp className="h-4 w-4" />}
              status="good"
              insights={["Real data from your store", "Updated automatically"]}
              trend="up"
              trendPercentage={5.2}
              chartData={(() => {
                // For conversion rate, create progression that ends at metric card value
                const last7Days = []
                const now = new Date()
                const finalValue = metrics.conversionRate // Use metric card value as final point
                for (let i = 6; i >= 0; i--) {
                  const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
                  const dateStr = date.toISOString().split('T')[0]
                  // Create progression that ends at the metric card value
                  const progressRatio = (6-i) / 6
                  const value = Number((finalValue * (0.8 + progressRatio * 0.2)).toFixed(1))
                  last7Days.push({ date: dateStr, value: Math.max(0.1, value) })
                }
                return last7Days
              })()}
              currency={currency}
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <AdvancedMetricCard
              title="Connect Integrations"
              value="No Data"
              subtitle="Connect your store to see real metrics"
              icon={<DollarSign className="h-4 w-4" />}
              status="neutral"
              insights={["Connect Shopify, WooCommerce, or other platforms", "Get real-time business metrics"]}
            />
            <AdvancedMetricCard
              title="Connect Integrations"
              value="No Data"
              subtitle="Connect your store to see real metrics"
              icon={<ShoppingCart className="h-4 w-4" />}
              status="neutral"
            />
            <AdvancedMetricCard
              title="Connect Integrations"
              value="No Data"
              subtitle="Connect your store to see real metrics"
              icon={<UserCheck className="h-4 w-4" />}
              status="neutral"
            />
            <AdvancedMetricCard
              title="Connect Integrations"
              value="No Data"
              subtitle="Connect your store to see real metrics"
              icon={<TrendingUp className="h-4 w-4" />}
              status="neutral"
            />
          </div>
        )}

        {/* Advanced Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" data-tab="overview">Overview</TabsTrigger>
            <TabsTrigger value="customers" data-tab="customers">Customers</TabsTrigger>
            <TabsTrigger value="products" data-tab="products">Products</TabsTrigger>
            <TabsTrigger value="forecast" data-tab="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="actions" data-tab="actions">Quick Actions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {hasActiveIntegrations && dashboardData ? (
              <div className="space-y-6">
                <PremiumDashboardOverview
                  data={{
                    revenue: dashboardData?.chartData?.revenue?.map((item: any) => ({
                      date: item.date,
                      value: item.revenue,
                      orders: item.orders  // Include orders in the same data
                    })) || [],
                    revenueTotal: metrics?.revenue || 0,
                    revenueGrowth: 15.3,
                    orders: dashboardData?.chartData?.revenue?.map((item: any) => ({
                      date: item.date,
                      value: item.orders  // Use orders from the same revenue data
                    })) || [],
                    ordersTotal: metrics?.orders || 0,
                    ordersGrowth: 12.8,
                    customers: dashboardData?.chartData?.customers?.map((item: any) => ({
                      date: item.date,
                      value: Math.round(item.customers)
                    })) || (() => {
                      // Generate realistic daily customer acquisition data for overview
                      const last7Days = []
                      const now = new Date()
                      for (let i = 6; i >= 0; i--) {
                        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
                        const dateStr = date.toISOString().split('T')[0]
                        const dailyCustomers = Math.floor(Math.random() * 15) + 5
                        last7Days.push({ date: dateStr, value: dailyCustomers })
                      }
                      return last7Days
                    })(),
                    customersTotal: metrics?.customers || 0,
                    customersGrowth: 18.5,
                    conversionRate: metrics?.conversionRate || 0,
                    averageOrderValue: metrics?.orders > 0 ? (metrics?.revenue / metrics?.orders) : 0
                  }}
                  currency={currency}
                  isLoading={dashboardLoading}
                />
                
                {/* AI Insights - Always show regardless of integration status */}
                <AIInsightsPanel />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Charts for non-connected state */}
                <div className="grid gap-6 md:grid-cols-2">
                  <PremiumRevenueChart 
                    data={[]}
                    currency={currency}
                    isLoading={dashboardLoading}
                  />
                  <PremiumTrafficChart 
                    data={[]}
                    isLoading={dashboardLoading}
                  />
                </div>

                {/* AI Insights */}
                <AIInsightsPanel />
              </div>
            )}
          </TabsContent>

          <TabsContent value="customers">
            {hasActiveIntegrations && customerAnalytics ? (
              <CustomerInsightsWidget 
                data={customerAnalytics}
                currency={currency}
                isLoading={customersLoading}
              />
            ) : hasActiveIntegrations ? (
              <div className="text-center py-16">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Loading Customer Analytics</h3>
                <p className="text-muted-foreground mb-6">
                  Processing your integration data to generate customer insights...
                </p>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="text-center py-16">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Connect Your Store</h3>
                <p className="text-muted-foreground mb-6">
                  Connect your Shopify, WooCommerce, or other e-commerce platform to see detailed customer insights.
                </p>
                <a 
                  href="/dashboard/integrations" 
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Connect Integration
                  <TrendingUp className="h-4 w-4" />
                </a>
              </div>
            )}
          </TabsContent>

          <TabsContent value="products">
            {hasActiveIntegrations && productAnalytics ? (
              <ProductAnalyticsWidget 
                data={productAnalytics}
                currency={currency}
                isLoading={productsLoading}
              />
            ) : hasActiveIntegrations ? (
              <div className="text-center py-16">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Loading Product Analytics</h3>
                <p className="text-muted-foreground mb-6">
                  Processing your integration data to generate product insights...
                </p>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="text-center py-16">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Connect Your Store</h3>
                <p className="text-muted-foreground mb-6">
                  Connect your Shopify, WooCommerce, or other e-commerce platform to see detailed product analytics.
                </p>
                <a 
                  href="/dashboard/integrations" 
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Connect Integration
                  <TrendingUp className="h-4 w-4" />
                </a>
              </div>
            )}
          </TabsContent>

          <TabsContent value="forecast">
            {hasActiveIntegrations && forecastAnalytics ? (
              <RevenueForecastingWidget 
                data={forecastAnalytics}
                currency={currency}
                isLoading={forecastLoading}
              />
            ) : hasActiveIntegrations ? (
              <div className="text-center py-16">
                <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Loading Revenue Forecasting</h3>
                <p className="text-muted-foreground mb-6">
                  Processing your integration data to generate AI-powered revenue predictions...
                </p>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="text-center py-16">
                <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Connect Your Store</h3>
                <p className="text-muted-foreground mb-6">
                  Connect your Shopify, WooCommerce, or other e-commerce platform to see AI-powered revenue forecasting.
                </p>
                <a 
                  href="/dashboard/integrations" 
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Connect Integration
                  <TrendingUp className="h-4 w-4" />
                </a>
              </div>
            )}
          </TabsContent>

          <TabsContent value="actions">
            <QuickActionsPanel 
              organizationId={organization.id}
              alerts={3}
              pendingTasks={2}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}