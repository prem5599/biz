'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AdvancedMetricCard } from './advanced-metric-card'
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Star,
  AlertTriangle,
  DollarSign,
  BarChart3
} from 'lucide-react'

interface ProductData {
  id: string
  name: string
  revenue: number
  quantity: number
  profit: number
  profitMargin: number
  trend: 'up' | 'down' | 'stable'
  trendPercentage: number
  category: string
  stockLevel: number
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock'
  conversionRate: number
  views: number
  cartAdditions: number
  checkouts: number
}

interface ProductAnalyticsData {
  totalProducts: number
  totalRevenue: number
  averageMargin: number
  topPerformers: ProductData[]
  underPerformers: ProductData[]
  categoryPerformance: Array<{
    category: string
    revenue: number
    products: number
    margin: number
  }>
  inventoryAlerts: Array<{
    productId: string
    productName: string
    issue: 'low_stock' | 'out_of_stock' | 'slow_moving'
    stockLevel: number
  }>
  conversionFunnel: {
    views: number
    cartAdditions: number
    checkouts: number
    purchases: number
  }
}

interface ProductAnalyticsWidgetProps {
  data: ProductAnalyticsData
  currency: string
  isLoading?: boolean
}

export function ProductAnalyticsWidget({ data, currency, isLoading }: ProductAnalyticsWidgetProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
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

  const getMarginStatus = (margin: number) => {
    if (margin >= 40) return 'good'
    if (margin >= 20) return 'warning'
    return 'danger'
  }

  const getConversionRate = (checkouts: number, views: number) => {
    return views > 0 ? ((checkouts / views) * 100).toFixed(2) : '0.00'
  }

  return (
    <div className="space-y-6">
      {/* Product Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AdvancedMetricCard
          title="Product Revenue"
          value={formatCurrency(data.totalRevenue || 0)}
          subtitle="Total from all products"
          icon={<DollarSign className="h-4 w-4" />}
          status="good"
          insights={[
            `${data.totalProducts || 0} active products`,
            `Avg. ${formatCurrency((data.totalRevenue || 0) / Math.max(data.totalProducts || 1, 1))} per product`
          ]}
        />

        <AdvancedMetricCard
          title="Average Margin"
          value={`${(data.averageMargin || 0).toFixed(1)}%`}
          subtitle="Across all products"
          icon={<BarChart3 className="h-4 w-4" />}
          status={getMarginStatus(data.averageMargin || 0)}
          benchmark={{
            value: "35%",
            label: "Target Margin"
          }}
          insights={[
            "Higher margins = better profitability",
            "Focus on high-margin products"
          ]}
        />

        <AdvancedMetricCard
          title="Inventory Alerts"
          value={data.inventoryAlerts?.length || 0}
          subtitle="Products needing attention"
          icon={<AlertTriangle className="h-4 w-4" />}
          status={(data.inventoryAlerts?.length || 0) > 0 ? 'warning' : 'good'}
          insights={[
            `${data.inventoryAlerts?.filter(a => a.issue === 'out_of_stock').length || 0} out of stock`,
            `${data.inventoryAlerts?.filter(a => a.issue === 'low_stock').length || 0} low stock`
          ]}
        />

        <AdvancedMetricCard
          title="Conversion Rate"
          value={`${getConversionRate(data.conversionFunnel?.purchases || 0, data.conversionFunnel?.views || 0)}%`}
          subtitle="Views to purchases"
          icon={<ShoppingCart className="h-4 w-4" />}
          status={parseFloat(getConversionRate(data.conversionFunnel?.purchases || 0, data.conversionFunnel?.views || 0)) >= 2 ? 'good' : 'warning'}
          insights={[
            `${(data.conversionFunnel?.views || 0).toLocaleString()} product views`,
            `${(data.conversionFunnel?.purchases || 0).toLocaleString()} purchases`
          ]}
        />
      </div>

      {/* Top and Bottom Performers */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data.topPerformers || []).slice(0, 5).map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-green-900">{product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                          {product.category}
                        </Badge>
                        <span className="text-xs text-green-700">
                          {(product.profitMargin || 0).toFixed(1)}% margin
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-green-900">
                      {formatCurrency(product.revenue)}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      {product.trendPercentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data.underPerformers || []).slice(0, 3).map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 text-red-800 rounded-full flex items-center justify-center text-sm font-semibold">
                      !
                    </div>
                    <div>
                      <p className="font-medium text-sm text-red-900">{product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs bg-red-100 text-red-800">
                          {product.category}
                        </Badge>
                        <span className="text-xs text-red-700">
                          {(product.conversionRate || 0).toFixed(2)}% conversion
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-red-900">
                      {formatCurrency(product.revenue)}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <TrendingDown className="h-3 w-3" />
                      {product.trendPercentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            Category Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(data.categoryPerformance || []).map((category) => (
              <div key={category.category} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-blue-900">{category.category}</h3>
                  <Badge className="bg-blue-100 text-blue-800">{category.products} products</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Revenue:</span>
                    <span className="font-semibold text-blue-900">{formatCurrency(category.revenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Avg. Margin:</span>
                    <span className="font-semibold text-blue-900">{(category.margin || 0).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={((category.revenue || 0) / Math.max(data.totalRevenue || 1, 1)) * 100} 
                    className="h-2" 
                  />
                  <p className="text-xs text-blue-600">
                    {(((category.revenue || 0) / Math.max(data.totalRevenue || 1, 1)) * 100).toFixed(1)}% of total revenue
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Alerts */}
      {(data.inventoryAlerts?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Inventory Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data.inventoryAlerts || []).map((alert) => (
                <div key={alert.productId} className={`flex items-center justify-between p-3 rounded-lg border ${
                  alert.issue === 'out_of_stock' 
                    ? 'bg-red-50 border-red-200' 
                    : alert.issue === 'low_stock'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-orange-50 border-orange-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`h-4 w-4 ${
                      alert.issue === 'out_of_stock' 
                        ? 'text-red-500' 
                        : alert.issue === 'low_stock'
                        ? 'text-yellow-500'
                        : 'text-orange-500'
                    }`} />
                    <div>
                      <p className="font-medium text-sm">{alert.productName}</p>
                      <p className="text-xs text-gray-600">
                        {alert.issue === 'out_of_stock' && 'Out of stock'}
                        {alert.issue === 'low_stock' && `Low stock: ${alert.stockLevel} remaining`}
                        {alert.issue === 'slow_moving' && 'Slow moving inventory'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={
                    alert.issue === 'out_of_stock' 
                      ? 'bg-red-100 text-red-800' 
                      : alert.issue === 'low_stock'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-orange-100 text-orange-800'
                  }>
                    {alert.issue.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product List with Stock Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            Complete Product List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">
                  {[...data.topPerformers, ...data.underPerformers].filter(p => p.stockStatus === 'in_stock').length}
                </div>
                <div className="text-sm text-green-600">In Stock</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-700">
                  {data.inventoryAlerts.filter(a => a.issue === 'low_stock').length}
                </div>
                <div className="text-sm text-yellow-600">Low Stock</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-700">
                  {data.inventoryAlerts.filter(a => a.issue === 'out_of_stock').length}
                </div>
                <div className="text-sm text-red-600">Out of Stock</div>
              </div>
            </div>

            {/* Product List Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Product Name</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Category</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">Stock Level</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">Revenue</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Top Performers */}
                  {data.topPerformers.map((product, index) => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-medium text-sm">{product.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-600">{product.category}</td>
                      <td className="p-3 text-right">
                        <span className={`text-sm font-medium ${
                          product.stockLevel > 50 ? 'text-green-600' : 
                          product.stockLevel > 10 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {product.stockLevel}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          product.stockStatus === 'in_stock' ? 'bg-green-100 text-green-800' :
                          product.stockStatus === 'low_stock' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {product.stockStatus === 'in_stock' ? 'In Stock' :
                           product.stockStatus === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="p-3 text-right text-sm font-medium">{formatCurrency(product.revenue)}</td>
                      <td className="p-3 text-right text-sm text-gray-600">{product.quantity}</td>
                    </tr>
                  ))}
                  
                  {/* Under Performers */}
                  {data.underPerformers.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="font-medium text-sm">{product.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-600">{product.category}</td>
                      <td className="p-3 text-right">
                        <span className={`text-sm font-medium ${
                          product.stockLevel > 50 ? 'text-green-600' : 
                          product.stockLevel > 10 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {product.stockLevel}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          product.stockStatus === 'in_stock' ? 'bg-green-100 text-green-800' :
                          product.stockStatus === 'low_stock' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {product.stockStatus === 'in_stock' ? 'In Stock' :
                           product.stockStatus === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="p-3 text-right text-sm font-medium">{formatCurrency(product.revenue)}</td>
                      <td className="p-3 text-right text-sm text-gray-600">{product.quantity}</td>
                    </tr>
                  ))}

                  {/* Add inventory alert products that might not be in top/under performers */}
                  {data.inventoryAlerts.map((alert) => {
                    const isAlreadyListed = [...data.topPerformers, ...data.underPerformers]
                      .some(p => p.name === alert.productName)
                    
                    if (isAlreadyListed) return null
                    
                    return (
                      <tr key={alert.productId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              alert.issue === 'out_of_stock' ? 'bg-red-500' : 'bg-yellow-500'
                            }`}></div>
                            <span className="font-medium text-sm">{alert.productName}</span>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-600">General</td>
                        <td className="p-3 text-right">
                          <span className={`text-sm font-medium ${
                            alert.stockLevel > 10 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {alert.stockLevel}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            alert.issue === 'out_of_stock' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {alert.issue === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}
                          </span>
                        </td>
                        <td className="p-3 text-right text-sm font-medium">-</td>
                        <td className="p-3 text-right text-sm text-gray-600">-</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-purple-500" />
            Product Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Product Views</p>
                  <p className="text-sm text-blue-700">Visitors viewing products</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-900">
                  {(data.conversionFunnel?.views || 0).toLocaleString()}
                </p>
                <p className="text-sm text-blue-700">100%</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 text-green-800 rounded-full flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <p className="font-semibold text-green-900">Add to Cart</p>
                  <p className="text-sm text-green-700">Products added to cart</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-900">
                  {(data.conversionFunnel?.cartAdditions || 0).toLocaleString()}
                </p>
                <p className="text-sm text-green-700">
                  {(((data.conversionFunnel?.cartAdditions || 0) / Math.max(data.conversionFunnel?.views || 1, 1)) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <p className="font-semibold text-yellow-900">Checkout Started</p>
                  <p className="text-sm text-yellow-700">Customers who started checkout</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-900">
                  {(data.conversionFunnel?.checkouts || 0).toLocaleString()}
                </p>
                <p className="text-sm text-yellow-700">
                  {(((data.conversionFunnel?.checkouts || 0) / Math.max(data.conversionFunnel?.views || 1, 1)) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center font-semibold">
                  4
                </div>
                <div>
                  <p className="font-semibold text-purple-900">Purchase Completed</p>
                  <p className="text-sm text-purple-700">Successful purchases</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-900">
                  {(data.conversionFunnel?.purchases || 0).toLocaleString()}
                </p>
                <p className="text-sm text-purple-700">
                  {(((data.conversionFunnel?.purchases || 0) / Math.max(data.conversionFunnel?.views || 1, 1)) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}