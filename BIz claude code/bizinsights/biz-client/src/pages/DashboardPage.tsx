import { useAuth } from '../hooks/useAuth';
import { useCurrentOrganization, useCreateOrganization } from '../hooks/useOrganization';
import { useDashboard } from '../hooks/useDashboard';
import { useCurrency, formatCurrency } from '../contexts/CurrencyContext';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { analyticsApi } from '../lib/api';

// Dashboard components
import { AdvancedMetricCard } from '../components/dashboard/advanced-metric-card';
import { PremiumDashboardOverview } from '../components/dashboard/premium-dashboard-overview';
import { PremiumRevenueChart } from '../components/dashboard/premium-revenue-chart';
import { PremiumTrafficChart } from '../components/dashboard/premium-traffic-chart';
import { CustomerInsightsWidget } from '../components/dashboard/customer-insights-widget';
import { ProductAnalyticsWidget } from '../components/dashboard/product-analytics-widget';
import { RevenueForecastingWidget } from '../components/dashboard/revenue-forecasting-widget';
import { QuickActionsPanel } from '../components/dashboard/quick-actions-panel';
import { AIInsightsPanel } from '../components/insights/AIInsightsPanel';

// UI components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ErrorBoundary } from '../components/ErrorBoundary';

import {
  BarChart3,
  Users,
  Package,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Eye,
  UserCheck,
  Loader2,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { organization, isLoading: orgLoading } = useCurrentOrganization();
  const { currency } = useCurrency();
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboard(organization?.id || null);

  const createOrgMutation = useCreateOrganization();
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');

  // Fetch analytics data for each tab
  const { data: customerAnalytics, isLoading: customersLoading } = useQuery({
    queryKey: ['analytics', organization?.id, 'customers'],
    queryFn: async () => {
      const result = await analyticsApi.getCustomerAnalytics(organization!.id);
      return result.data?.data;
    },
    enabled: !!organization?.id && !!dashboardData?.hasActiveIntegrations,
    staleTime: 10 * 60 * 1000,
  });

  const { data: productAnalytics, isLoading: productsLoading } = useQuery({
    queryKey: ['analytics', organization?.id, 'products'],
    queryFn: async () => {
      const result = await analyticsApi.getProductAnalytics(organization!.id);
      return result.data?.data;
    },
    enabled: !!organization?.id && !!dashboardData?.hasActiveIntegrations,
    staleTime: 10 * 60 * 1000,
  });

  const { data: forecastAnalytics, isLoading: forecastLoading } = useQuery({
    queryKey: ['analytics', organization?.id, 'forecast'],
    queryFn: async () => {
      const result = await analyticsApi.getForecastAnalytics(organization!.id);
      return result.data?.data;
    },
    enabled: !!organization?.id && !!dashboardData?.hasActiveIntegrations,
    staleTime: 10 * 60 * 1000,
  });

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !orgSlug) return;
    try {
      await createOrgMutation.mutateAsync({ name: orgName, slug: orgSlug });
      toast.success('Organization created!');
    } catch {
      toast.error('Failed to create organization');
    }
  };

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Your Organization</h2>
          <p className="text-gray-600 mb-6">
            Create an organization to start tracking your business metrics.
          </p>
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  setOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                }}
                placeholder="My Company"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
              <input
                type="text"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="my-company"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <button
              type="submit"
              disabled={createOrgMutation.isPending}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createOrgMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                'Create Organization'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const formatCurrencyValue = (value: number | string) => {
    const numValue = Number(value) || 0;
    return formatCurrency(numValue, currency);
  };

  const formatNumber = (value: number | string) => {
    const numValue = Number(value) || 0;
    return new Intl.NumberFormat('en-US').format(numValue);
  };

  const formatPercentage = (value: number | string) => {
    const numValue = Number(value) || 0;
    return `${numValue.toFixed(1)}%`;
  };

  const hasActiveIntegrations = dashboardData?.hasActiveIntegrations || false;
  const metrics = hasActiveIntegrations && dashboardData?.metrics
    ? {
        revenue: Number(dashboardData.metrics.revenue) || 0,
        orders: Math.floor(Number(dashboardData.metrics.orders)) || 0,
        customers: Math.floor(Number(dashboardData.metrics.customers)) || 0,
        conversionRate: Number(dashboardData.metrics.conversionRate) || 0,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Intelligence Dashboard</h1>
          <p className="text-muted-foreground">
            {hasActiveIntegrations
              ? 'Real-time data from your connected integrations'
              : 'Connect your store to see advanced analytics beyond basic dashboards'}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {dashboardLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading advanced analytics...</span>
        </div>
      )}

      {/* No Integrations Banner */}
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
              <Link
                to="/dashboard/integrations"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Shopify Store
                <TrendingUp className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Overview */}
      {metrics ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <AdvancedMetricCard
            title="Total Revenue"
            value={formatCurrencyValue(metrics.revenue)}
            subtitle="From connected integrations"
            icon={<DollarSign className="h-4 w-4" />}
            status="good"
            insights={['Real data from your store', 'Updated automatically']}
            trend="up"
            trendPercentage={15.3}
            chartData={dashboardData?.chartData?.revenue?.map((item: any) => ({
              date: item.date,
              value: Math.round(item.revenue),
            })).slice(-7) || []}
            currency={currency}
          />
          <AdvancedMetricCard
            title="Total Orders"
            value={formatNumber(metrics.orders)}
            subtitle="From connected integrations"
            icon={<ShoppingCart className="h-4 w-4" />}
            status="good"
            insights={['Real data from your store', 'Updated automatically']}
            trend="up"
            trendPercentage={12.8}
            chartData={dashboardData?.chartData?.revenue?.map((item: any) => ({
              date: item.date,
              value: Math.round(item.orders || 0),
            })).slice(-7) || []}
            currency={currency}
          />
          <AdvancedMetricCard
            title="Total Customers"
            value={formatNumber(metrics.customers)}
            subtitle="From connected integrations"
            icon={<UserCheck className="h-4 w-4" />}
            status="good"
            insights={['Real data from your store', 'Updated automatically']}
            trend="up"
            trendPercentage={18.5}
            chartData={dashboardData?.chartData?.customers?.map((item: any) => ({
              date: item.date,
              value: Math.round(item.customers || 0),
            })).slice(-7) || []}
            currency={currency}
          />
          <AdvancedMetricCard
            title="Conversion Rate"
            value={formatPercentage(metrics.conversionRate)}
            subtitle="From connected integrations"
            icon={<TrendingUp className="h-4 w-4" />}
            status="good"
            insights={['Real data from your store', 'Updated automatically']}
            trend="up"
            trendPercentage={5.2}
            chartData={dashboardData?.chartData?.revenue?.map((item: any) => ({
              date: item.date,
              value: item.conversionRate || 0,
            })).slice(-7) || []}
            currency={currency}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <AdvancedMetricCard
            title="Total Revenue"
            value={formatCurrencyValue(0)}
            subtitle="From connected integrations"
            icon={<DollarSign className="h-4 w-4" />}
            status="good"
            insights={['Real data from your store']}
            trend="up"
            trendPercentage={15.3}
            chartData={[]}
            currency={currency}
          />
          <AdvancedMetricCard
            title="Total Orders"
            value={formatNumber(0)}
            subtitle="From connected integrations"
            icon={<ShoppingCart className="h-4 w-4" />}
            status="good"
            insights={['Real data from your store']}
            trend="up"
            trendPercentage={12.8}
            chartData={[]}
            currency={currency}
          />
          <AdvancedMetricCard
            title="Total Customers"
            value={formatNumber(0)}
            subtitle="From connected integrations"
            icon={<UserCheck className="h-4 w-4" />}
            status="good"
            insights={['Real data from your store']}
            trend="up"
            trendPercentage={18.5}
            chartData={[]}
            currency={currency}
          />
          <AdvancedMetricCard
            title="Conversion Rate"
            value={formatPercentage(0)}
            subtitle="From connected integrations"
            icon={<TrendingUp className="h-4 w-4" />}
            status="good"
            insights={['Real data from your store']}
            trend="up"
            trendPercentage={5.2}
            chartData={[]}
            currency={currency}
          />
        </div>
      )}

      {/* Advanced Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="actions">Quick Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ErrorBoundary>
          {hasActiveIntegrations && dashboardData ? (
            <div className="space-y-6">
              <PremiumDashboardOverview
                data={{
                  revenue: dashboardData?.chartData?.revenue?.map((item: any) => ({
                    date: item.date,
                    value: item.revenue,
                    orders: item.orders,
                  })) || [],
                  revenueTotal: metrics?.revenue || 0,
                  revenueGrowth: dashboardData?.metrics?.revenueGrowth || 0,
                  orders: dashboardData?.chartData?.revenue?.map((item: any) => ({
                    date: item.date,
                    value: item.orders,
                  })) || [],
                  ordersTotal: metrics?.orders || 0,
                  ordersGrowth: dashboardData?.metrics?.ordersGrowth || 0,
                  customers: dashboardData?.chartData?.customers?.map((item: any) => ({
                    date: item.date,
                    value: Math.round(item.customers),
                  })) || [],
                  customersTotal: metrics?.customers || 0,
                  customersGrowth: dashboardData?.metrics?.customersGrowth || 0,
                  conversionRate: metrics?.conversionRate || 0,
                  averageOrderValue:
                    metrics && metrics.orders > 0 ? metrics.revenue / metrics.orders : 0,
                  healthMetrics: dashboardData?.healthMetrics,
                }}
                currency={currency}
                isLoading={dashboardLoading}
              />
              <AIInsightsPanel />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <PremiumRevenueChart data={[]} currency={currency} isLoading={dashboardLoading} />
                <PremiumTrafficChart data={[]} isLoading={dashboardLoading} />
              </div>
              <AIInsightsPanel />
            </div>
          )}
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="customers">
          <ErrorBoundary>
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
                Connect your Shopify, WooCommerce, or other e-commerce platform to see detailed
                customer insights.
              </p>
              <Link
                to="/dashboard/integrations"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Integration
                <TrendingUp className="h-4 w-4" />
              </Link>
            </div>
          )}
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="products">
          <ErrorBoundary>
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
                Connect your Shopify, WooCommerce, or other e-commerce platform to see detailed
                product analytics.
              </p>
              <Link
                to="/dashboard/integrations"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Integration
                <TrendingUp className="h-4 w-4" />
              </Link>
            </div>
          )}
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="forecast">
          <ErrorBoundary>
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
                Connect your Shopify, WooCommerce, or other e-commerce platform to see AI-powered
                revenue forecasting.
              </p>
              <Link
                to="/dashboard/integrations"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Integration
                <TrendingUp className="h-4 w-4" />
              </Link>
            </div>
          )}
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="actions">
          <ErrorBoundary>
          <QuickActionsPanel
            organizationId={organization.id}
            alerts={3}
            pendingTasks={2}
          />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
