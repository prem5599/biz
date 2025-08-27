'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Users, 
  Package, 
  TrendingUp,
  AlertTriangle,
  Settings,
  BarChart3,
  Download,
  RefreshCw,
  Plus
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  action: () => void
  badge?: {
    text: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
  disabled?: boolean
}

interface QuickActionsPanelProps {
  organizationId: string
  alerts?: number
  pendingTasks?: number
}

export function QuickActionsPanel({ organizationId, alerts = 0, pendingTasks = 0 }: QuickActionsPanelProps) {
  const router = useRouter()

  const quickActions: QuickAction[] = [
    {
      id: 'generate-report',
      title: 'Generate Report',
      description: 'Create comprehensive business reports',
      icon: <FileText className="h-5 w-5" />,
      action: () => router.push('/dashboard/reports'),
      badge: pendingTasks > 0 ? {
        text: `${pendingTasks} pending`,
        variant: 'secondary'
      } : undefined
    },
    {
      id: 'customer-insights',
      title: 'Customer Analysis',
      description: 'Deep dive into customer behavior',
      icon: <Users className="h-5 w-5" />,
      action: () => {
        // Navigate to customers tab in the main dashboard
        const currentUrl = new URL(window.location.href)
        currentUrl.hash = '#customers'
        window.location.href = currentUrl.toString()
        // Also trigger tab change programmatically
        const customerTab = document.querySelector('[data-tab="customers"]') as HTMLElement
        if (customerTab) customerTab.click()
      }
    },
    {
      id: 'product-performance',
      title: 'Product Analytics',
      description: 'Track product performance and inventory',
      icon: <Package className="h-5 w-5" />,
      action: () => {
        // Navigate to products tab in the main dashboard
        const currentUrl = new URL(window.location.href)
        currentUrl.hash = '#products'
        window.location.href = currentUrl.toString()
        // Also trigger tab change programmatically
        const productTab = document.querySelector('[data-tab="products"]') as HTMLElement
        if (productTab) productTab.click()
      }
    },
    {
      id: 'revenue-forecast',
      title: 'Revenue Forecast',
      description: 'AI-powered revenue predictions',
      icon: <TrendingUp className="h-5 w-5" />,
      action: () => {
        // Navigate to forecast tab in the main dashboard
        const currentUrl = new URL(window.location.href)
        currentUrl.hash = '#forecast'
        window.location.href = currentUrl.toString()
        // Also trigger tab change programmatically
        const forecastTab = document.querySelector('[data-tab="forecast"]') as HTMLElement
        if (forecastTab) forecastTab.click()
      }
    },
    {
      id: 'analytics-page',
      title: 'Analytics Page',
      description: 'Dedicated analytics dashboard',
      icon: <AlertTriangle className="h-5 w-5" />,
      action: () => router.push('/dashboard/analytics'),
      badge: alerts > 0 ? {
        text: `${alerts} alerts`,
        variant: 'destructive'
      } : undefined
    },
    {
      id: 'integrations',
      title: 'Manage Integrations',
      description: 'Connect more data sources',
      icon: <Settings className="h-5 w-5" />,
      action: () => router.push('/dashboard/integrations')
    }
  ]

  const dataActions = [
    {
      id: 'sync-data',
      title: 'Sync Data',
      description: 'Refresh all connected integrations',
      icon: <RefreshCw className="h-4 w-4" />,
      action: async () => {
        try {
          // Refresh the current page to sync latest data
          window.location.reload()
        } catch (error) {
          console.error('Error syncing data:', error)
        }
      }
    },
    {
      id: 'export-data',
      title: 'Export Reports',
      description: 'Generate and download reports',
      icon: <Download className="h-4 w-4" />,
      action: () => {
        router.push('/dashboard/reports')
      }
    },
    {
      id: 'analytics-view',
      title: 'Analytics View',
      description: 'View detailed analytics page',
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => router.push('/dashboard/analytics')
    }
  ]

  return (
    <div className="space-y-6">
      {/* Main Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start space-y-2 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                onClick={action.action}
                disabled={action.disabled}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {action.icon}
                    <span className="font-medium text-sm">{action.title}</span>
                  </div>
                  {action.badge && (
                    <Badge variant={action.badge.variant} className="text-xs">
                      {action.badge.text}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600 text-left">{action.description}</p>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Management Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-700">Data Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {dataActions.map((action) => (
              <Button
                key={action.id}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-xs hover:bg-gray-100"
                onClick={action.action}
              >
                {action.icon}
                {action.title}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">Integration Status</h3>
              <p className="text-sm text-blue-700">Connected data sources</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">
                {/* This would be populated from real integration data */}
                Ready
              </div>
              <div className="text-sm text-blue-600">Connect more sources</div>
            </div>
          </div>
          <div className="mt-3">
            <a 
              href="/dashboard/integrations" 
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Manage integrations →
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Shopify Insights Not Available */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Advanced Analytics</h3>
              <p className="text-sm text-green-700 mt-1">
                Get insights not available in Shopify's basic dashboard:
              </p>
              <ul className="text-xs text-green-600 mt-2 space-y-1">
                <li>• Customer lifetime value predictions</li>
                <li>• Product performance forecasting</li>
                <li>• Advanced cohort analysis</li>
                <li>• Churn risk assessment</li>
                <li>• Seasonal trend analysis</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}