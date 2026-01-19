'use client'

import '@/styles/charts.css'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useCurrentOrganization } from '@/hooks/useOrganization'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useCurrency } from '@/contexts/CurrencyContext'
import { formatCurrency, SUPPORTED_CURRENCIES } from '@/lib/currency'
import { AdvancedMetricCard } from '@/components/analytics/advanced-metric-card'
import { CustomerAnalyticsWidget } from '@/components/analytics/customer-analytics-widget'
import { PremiumLineChart, PremiumBarChart, PremiumPieChart } from '@/components/charts'
import { NotificationModal } from '@/components/ui/notification-modal'
import { useNotification } from '@/hooks/useNotification'
import { 
  BarChart3, TrendingUp, PieChart, Activity, RefreshCw, Users, ShoppingCart, 
  DollarSign, Package, Download, Filter, Calendar, FileSpreadsheet,
  Target, Zap, TrendingDown, AlertCircle, Star
} from 'lucide-react'
import { useState } from 'react'

export default function Analytics() {
  const { data: session, status } = useSession()
  const { organization, isLoading: orgLoading } = useCurrentOrganization()
  const [period, setPeriod] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [syncLoading, setSyncLoading] = useState(false)
  const { currency, setCurrency } = useCurrency()
  const { data: analytics, isLoading: analyticsLoading, error, refetch } = useAnalytics(
    period, 
    currency, 
    startDate || undefined, 
    endDate || undefined
  )
  const { notification, isOpen, closeNotification, showSuccess, showError, showInfo } = useNotification()

  if (status === 'loading' || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
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

  const formatGrowth = (growth: number) => {
    const sign = growth >= 0 ? '+' : ''
    return `${sign}${growth.toFixed(1)}%`
  }

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const handleSyncShopify = async () => {
    if (!organization?.id) return
    
    setSyncLoading(true)
    try {
      const response = await fetch('/api/integrations/shopify/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: organization.id
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Sync Result:', result.data)
        
        // Refresh analytics data after sync
        await refetch()
        
        // Show more detailed success message
        const debug = result.data?.debug
        if (debug) {
          showSuccess(
            'Shopify Sync Successful!',
            'Your Shopify data has been synchronized successfully.',
            [
              `Processed: ${debug.paidOrdersCount} paid orders`,
              `Calculated Revenue: ₹${debug.calculatedRevenue}`,
              `Total Orders Fetched: ${debug.fetchedOrdersCount}`,
              'Refresh the page to see updated data!'
            ]
          )
        } else {
          showSuccess(
            'Sync Successful!',
            'Shopify data synced successfully! Refresh the page to see updated data.'
          )
        }
      } else {
        const error = await response.json()
        showError(
          'Sync Failed',
          'Failed to synchronize Shopify data.',
          [error.error || 'Unknown error occurred', 'Please try again or contact support.']
        )
      }
    } catch (error) {
      console.error('Sync error:', error)
      showError(
        'Sync Error',
        'An error occurred during synchronization.',
        ['Please check your internet connection and try again.']
      )
    } finally {
      setSyncLoading(false)
    }
  }

  // Calculate real customer data from API analytics data
  const enhancedCustomerData = analytics ? {
    totalCustomers: analytics.totalCustomers || 0,
    newCustomers: analytics.newCustomers || 0,
    returningCustomers: analytics.returningCustomers || 0,
    customerGrowthRate: analytics.customerGrowth || 0,
    averageOrderValue: analytics.averageOrderValue || 0,
    customerLifetimeValue: analytics.customerLifetimeValue || 0,
    customerAcquisitionCost: analytics.customerAcquisitionCost || 0,
    churnRate: analytics.churnRate || 0,
    retentionRate: analytics.totalCustomers > 0 ? ((analytics.returningCustomers / analytics.totalCustomers) * 100) : 0,
    repeatPurchaseRate: analytics.totalCustomers > 0 ? ((analytics.returningCustomers / analytics.totalCustomers) * 100) : 0,
    customerSegments: {
      vip: Math.round(analytics.returningCustomers * 0.3), // Top 30% of returning customers
      regular: analytics.returningCustomers - Math.round(analytics.returningCustomers * 0.3),
      atrisk: Math.round(analytics.totalCustomers * (analytics.churnRate / 100)),
      new: analytics.newCustomers
    },
    topCustomers: [], // Real customer data would need to be fetched separately from a customers API endpoint
    customerSatisfaction: 0, // This would need to be calculated from reviews/feedback data
    purchaseFrequency: analytics.totalOrders > 0 && analytics.totalCustomers > 0 ? analytics.totalOrders / analytics.totalCustomers : 0
  } : null

  const handleExportData = async (format: 'csv' | 'excel') => {
    // Implementation for data export
    console.log(`Exporting data in ${format} format...`)
    // This would generate and download the file
  }

  return (
    <TooltipProvider>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Enhanced Header with Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
              <p className="text-gray-600">Comprehensive insights from your connected stores</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={period} onValueChange={(value) => {
                setPeriod(value)
                if (value !== 'custom') {
                  setStartDate('')
                  setEndDate('')
                }
              }}>
                <SelectTrigger className="w-40">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                  <SelectItem value="quarter">Last 90 days</SelectItem>
                  <SelectItem value="year">Last year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {period === 'custom' && (
                <>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Start date"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="End date"
                  />
                </>
              )}
              
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUPPORTED_CURRENCIES).slice(0, 10).map(([code, info]) => (
                    <SelectItem key={code} value={code}>
                      {info.symbol} {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={refetch} disabled={analyticsLoading}>
                <RefreshCw className={`h-4 w-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleSyncShopify} disabled={syncLoading}>
                <Download className={`h-4 w-4 ${syncLoading ? 'animate-spin' : ''}`} />
                {syncLoading ? 'Syncing...' : 'Sync Data'}
              </Button>

              <Button variant="outline" size="sm" onClick={() => handleExportData('excel')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-800">Error loading analytics: {error}</p>
              </CardContent>
            </Card>
          )}

          {analyticsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : analytics ? (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="customers" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Customers
                </TabsTrigger>
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Products
                </TabsTrigger>
                <TabsTrigger value="revenue" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Revenue
                </TabsTrigger>
                <TabsTrigger value="performance" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Performance
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Key Performance Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <AdvancedMetricCard
                    title="Total Revenue"
                    value={formatCurrency(analytics.totalRevenue, currency)}
                    subtitle="Across all channels"
                    icon={<DollarSign className="h-4 w-4" />}
                    tooltip="Total revenue from all connected sales channels including Shopify and WooCommerce"
                    trend={{
                      value: analytics.revenueGrowth || 0,
                      label: "growth",
                      period: "last period"
                    }}
                    status="good"
                    benchmark={{
                      value: formatCurrency(analytics.totalRevenue * 1.2, currency),
                      label: "Target",
                      comparison: "below"
                    }}
                  />

                  <AdvancedMetricCard
                    title="Total Orders"
                    value={analytics.totalOrders.toLocaleString()}
                    subtitle="Successfully completed"
                    icon={<ShoppingCart className="h-4 w-4" />}
                    tooltip="Number of successfully completed orders across all platforms"
                    details={[
                      `Average: ${formatCurrency(analytics.averageOrderValue, currency)} per order`,
                      `${Math.round(analytics.totalOrders / 30)} orders per day`
                    ]}
                    status="good"
                  />

                  <AdvancedMetricCard
                    title="Active Customers"
                    value={analytics.totalCustomers.toLocaleString()}
                    subtitle="Customer base"
                    icon={<Users className="h-4 w-4" />}
                    tooltip="Total number of unique customers who have made at least one purchase"
                    trend={{
                      value: analytics.customerGrowth || 0,
                      label: "growth",
                      period: "this period"
                    }}
                    status="good"
                    details={[
                      `${analytics.newCustomers} new customers`,
                      `${analytics.returningCustomers} returning customers`
                    ]}
                  />

                  <AdvancedMetricCard
                    title="Conversion Rate"
                    value={`${analytics.conversionRate.toFixed(1)}%`}
                    subtitle="Visitor to customer"
                    icon={<TrendingUp className="h-4 w-4" />}
                    tooltip="Percentage of visitors who complete a purchase"
                    benchmark={{
                      value: "3.5%",
                      label: "Industry avg",
                      comparison: analytics.conversionRate >= 3.5 ? "above" : "below"
                    }}
                    status={analytics.conversionRate >= 3.5 ? "good" : "warning"}
                  />
                </div>

                {/* Business Health Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <AdvancedMetricCard
                    title="Customer Lifetime Value"
                    value={formatCurrency(analytics.customerLifetimeValue, currency)}
                    subtitle="Average customer value"
                    icon={<Target className="h-4 w-4" />}
                    tooltip="Predicted total revenue from a customer over their entire relationship with your business"
                    details={[
                      `CLV:CAC ratio: ${(analytics.customerLifetimeValue / (analytics.customerAcquisitionCost || 1)).toFixed(1)}:1`,
                      "Healthy ratio: 3:1 or higher"
                    ]}
                    status={analytics.customerLifetimeValue / (analytics.customerAcquisitionCost || 1) >= 3 ? "good" : "warning"}
                  />

                  <AdvancedMetricCard
                    title="Customer Acquisition Cost"
                    value={formatCurrency(analytics.customerAcquisitionCost, currency)}
                    subtitle="Cost per new customer"
                    icon={<Zap className="h-4 w-4" />}
                    tooltip="Total marketing and sales expenses divided by number of new customers acquired"
                    benchmark={{
                      value: formatCurrency(50, currency),
                      label: "Target CAC",
                      comparison: analytics.customerAcquisitionCost <= 50 ? "below" : "above"
                    }}
                    status={analytics.customerAcquisitionCost <= 50 ? "good" : "warning"}
                  />

                  <AdvancedMetricCard
                    title="Return on Ad Spend"
                    value={`${analytics.returnOnAdSpend.toFixed(1)}x`}
                    subtitle="Revenue per ad dollar"
                    icon={<Activity className="h-4 w-4" />}
                    tooltip="Revenue generated for every dollar spent on advertising"
                    trend={{
                      value: analytics.returnOnAdSpend > 4 ? 10 : -5,
                      label: analytics.returnOnAdSpend > 4 ? "improvement" : "decline",
                      period: "vs target"
                    }}
                    status="good"
                    benchmark={{
                      value: "4.0x",
                      label: "Good ROAS",
                      comparison: analytics.returnOnAdSpend >= 4 ? "above" : "below"
                    }}
                  />
                </div>

                {/* Overview Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue vs Orders Trend */}
                  <PremiumLineChart
                    title="Revenue & Growth Trend"
                    data={analytics.revenueByPeriod?.map(item => ({
                      date: item.date,
                      value: item.revenue
                    })) || []}
                    currency={currency}
                    gradient={true}
                    height={300}
                  />

                  {/* Customer Distribution */}
                  <PremiumPieChart
                    title="Customer Distribution"
                    data={[
                      { name: 'New Customers', value: analytics.newCustomers },
                      { name: 'Returning Customers', value: analytics.returningCustomers },
                      { name: 'Inactive', value: Math.max(0, analytics.totalCustomers - analytics.newCustomers - analytics.returningCustomers) }
                    ]}
                    height={300}
                    colors={['#10b981', '#3b82f6', '#ef4444']}
                  />
                </div>
              </TabsContent>

              <TabsContent value="customers" className="space-y-6">
                {enhancedCustomerData && (
                  <CustomerAnalyticsWidget 
                    data={enhancedCustomerData} 
                    currency={currency} 
                  />
                )}
              </TabsContent>

              <TabsContent value="products" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5" />
                        Top Performing Products
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analytics.topProducts.length > 0 ? analytics.topProducts.slice(0, 8).map((product, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-semibold text-sm">{index + 1}</span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{product.name}</p>
                                <p className="text-sm text-gray-500">{product.quantity} units sold</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">{formatCurrency(product.revenue, currency)}</p>
                              <p className="text-xs text-gray-500">
                                {((product.revenue / analytics.totalRevenue) * 100).toFixed(1)}% of total
                              </p>
                            </div>
                          </div>
                        )) : (
                          <p className="text-gray-500 text-center py-8">No product data available</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <AdvancedMetricCard
                    title="Product Catalog"
                    value={analytics.totalProducts.toString()}
                    subtitle="Active products"
                    icon={<Package className="h-4 w-4" />}
                    tooltip="Total number of active products across all connected stores"
                    details={[
                      "Includes Shopify and WooCommerce products",
                      "Only active/published products counted"
                    ]}
                    className="h-fit"
                  />
                </div>
              </TabsContent>

              <TabsContent value="revenue" className="space-y-6">
                {/* Revenue Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue Trend Chart */}
                  <PremiumLineChart
                    title="Revenue Trend"
                    data={analytics.revenueByPeriod?.map(item => ({
                      date: item.date,
                      value: item.revenue
                    })) || []}
                    currency={currency}
                    gradient={true}
                    height={300}
                  />

                  {/* Revenue by Source Chart */}
                  <PremiumPieChart
                    title="Revenue by Source"
                    data={analytics.revenueByCurrency?.map((item: any) => ({
                      name: item.currency,
                      value: item.converted
                    })) || []}
                    currency={currency}
                    height={300}
                  />
                </div>

                {/* Monthly Revenue Comparison */}
                <PremiumBarChart
                  title="Monthly Revenue Comparison"
                  data={analytics.revenueByPeriod?.map(item => ({
                    name: item.date,
                    value: item.revenue
                  })) || []}
                  currency={currency}
                  height={350}
                />

                {/* Revenue by Currency Table */}
                {analytics.revenueByCurrency && analytics.revenueByCurrency.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue by Currency</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {analytics.revenueByCurrency.map((item) => (
                          <div key={item.currency} className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{item.currency}</span>
                              <span className="text-sm text-gray-600">
                                {formatCurrency(item.amount, item.currency)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ≈ {formatCurrency(item.converted, currency)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="performance" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AdvancedMetricCard
                    title="Revenue Growth"
                    value={`${analytics.revenueGrowth?.toFixed(1) || '0.0'}%`}
                    subtitle="Period over period"
                    icon={<TrendingUp className="h-4 w-4" />}
                    tooltip="Revenue growth rate compared to the previous period based on your actual sales data"
                    status={analytics.revenueGrowth >= 10 ? "good" : analytics.revenueGrowth >= 0 ? "warning" : "danger"}
                    benchmark={{
                      value: "10%",
                      label: "Good growth",
                      comparison: analytics.revenueGrowth >= 10 ? "above" : "below"
                    }}
                  />

                  <AdvancedMetricCard
                    title="Order Frequency"
                    value={`${(analytics.totalOrders / Math.max(analytics.totalCustomers, 1)).toFixed(1)}`}
                    subtitle="Orders per customer"
                    icon={<Activity className="h-4 w-4" />}
                    tooltip="Average number of orders per customer - higher indicates better customer engagement"
                    details={[
                      "Industry average: 2.1 orders/customer",
                      "Goal: Increase repeat purchases"
                    ]}
                  />

                  <AdvancedMetricCard
                    title="Business Health Score"
                    value={`${Math.round((analytics.conversionRate * 2 + Math.max(analytics.revenueGrowth || 0, 0) + (analytics.totalOrders > 0 ? 50 : 0)) / 3)}%`}
                    subtitle="Overall performance"
                    icon={<Target className="h-4 w-4" />}
                    tooltip="Composite score based on conversion rate, revenue growth, and order activity from your real data"
                    status={
                      Math.round((analytics.conversionRate * 2 + Math.max(analytics.revenueGrowth || 0, 0) + (analytics.totalOrders > 0 ? 50 : 0)) / 3) >= 60 
                        ? "good" 
                        : "warning"
                    }
                    details={[
                      "Based on: Conversion rate, revenue growth, order activity",
                      "Uses only real data from your connected stores"
                    ]}
                  />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                <p className="text-gray-600 mb-4">
                  Connect your Shopify or WooCommerce store and sync data to see analytics.
                </p>
                <Button onClick={handleSyncShopify} disabled={syncLoading}>
                  <Download className="h-4 w-4 mr-2" />
                  Connect Store
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>

      {/* Notification Modal */}
      {notification && (
        <NotificationModal
          isOpen={isOpen}
          onClose={closeNotification}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          details={notification.details}
          actionLabel={notification.actionLabel}
          onAction={notification.onAction}
        />
      )}
    </TooltipProvider>
  )
}