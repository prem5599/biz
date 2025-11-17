'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { QuickConnectCard } from '@/components/integrations/quick-connect-card'
import { EasyIntegrationWizard } from '@/components/integrations/easy-integration-wizard'
import { CreateOrganizationForm } from '@/components/organization/create-organization-form'
import { showToast } from '@/components/ui/toast-helper'
import {
  ShoppingBag,
  CreditCard,
  BarChart,
  Facebook,
  ShoppingCart,
  Search,
  Filter,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Users,
  Zap,
  Rocket,
  X
} from 'lucide-react'
import { useCurrentOrganization } from '@/hooks/useOrganization'

const integrations = [
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Connect your Shopify store in under 2 minutes. Sync orders, customers, and products automatically.',
    icon: ShoppingBag,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    features: [
      'Real-time order tracking',
      'Customer analytics & insights', 
      'Product performance metrics',
      'Revenue & sales trends',
      'Inventory level monitoring',
      'Customer lifetime value'
    ],
    difficulty: 'easy' as const,
    estimatedTime: '2 min',
    popular: true,
    category: 'ecommerce'
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Sync payment data, subscriptions, and customer information from your Stripe account.',
    icon: CreditCard,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    features: [
      'Payment analytics & trends',
      'Subscription metrics',
      'Customer payment behavior',
      'Revenue insights',
      'Chargeback monitoring',
      'MRR & ARR tracking'
    ],
    difficulty: 'easy' as const,
    estimatedTime: '3 min',
    recommended: true,
    category: 'payment'
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Connect your WordPress WooCommerce store to track sales and analyze customer behavior.',
    icon: ShoppingCart,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    features: [
      'Sales tracking & analytics',
      'Customer behavior insights',
      'Product performance data',
      'Order management metrics',
      'Conversion rate analysis',
      'Inventory tracking'
    ],
    difficulty: 'medium' as const,
    estimatedTime: '5 min',
    category: 'ecommerce'
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Track website traffic, user behavior, and conversions with GA4 integration.',
    icon: BarChart,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    features: [
      'Website traffic analysis',
      'User behavior tracking',
      'Conversion rate optimization',
      'Audience insights',
      'Page performance metrics',
      'Goal tracking'
    ],
    difficulty: 'advanced' as const,
    estimatedTime: '10 min',
    category: 'analytics'
  },
  {
    id: 'facebook-ads',
    name: 'Facebook Ads',
    description: 'Monitor ad campaigns, track ROAS, and analyze audience engagement across Meta platforms.',
    icon: Facebook,
    color: 'text-blue-800',
    bgColor: 'bg-blue-50',
    features: [
      'Campaign performance tracking',
      'ROAS & ad spend analysis',
      'Audience insights',
      'Creative performance metrics',
      'Attribution tracking',
      'A/B test results'
    ],
    difficulty: 'advanced' as const,
    estimatedTime: '15 min',
    category: 'advertising'
  }
]

const categories = [
  { id: 'all', name: 'All Integrations', icon: Sparkles },
  { id: 'ecommerce', name: 'E-commerce', icon: ShoppingBag },
  { id: 'payment', name: 'Payments', icon: CreditCard },
  { id: 'analytics', name: 'Analytics', icon: BarChart },
  { id: 'advertising', name: 'Advertising', icon: TrendingUp }
]

export default function EasyIntegrations() {
  const searchParams = useSearchParams()
  const isWelcome = searchParams.get('welcome') === 'true'

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)
  const [connectedIntegrations, setConnectedIntegrations] = useState<Set<string>>(new Set())
  const [connectingIntegrations, setConnectingIntegrations] = useState<Set<string>>(new Set())
  const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, { lastSyncAt?: string; status: string }>>({})
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(isWelcome)

  const { organization, isLoading: orgLoading } = useCurrentOrganization()

  // Load integration statuses
  useEffect(() => {
    if (!organization?.id) return

    const loadIntegrations = async () => {
      try {
        const response = await fetch(`/api/organizations/${organization.id}/dashboard`)
        const data = await response.json()
        
        if (data.success && data.data.integrations) {
          const connected = new Set<string>()
          const statuses: Record<string, { lastSyncAt?: string; status: string }> = {}
          
          data.data.integrations.forEach((integration: any) => {
            const platformId = integration.platform.toLowerCase()
            if (integration.status === 'CONNECTED') {
              connected.add(platformId)
            }
            statuses[platformId] = {
              lastSyncAt: integration.lastSyncAt,
              status: integration.status
            }
          })
          
          setConnectedIntegrations(connected)
          setIntegrationStatuses(statuses)
        }
      } catch (error) {
        console.error('Error loading integrations:', error)
      }
    }

    loadIntegrations()
  }, [organization?.id])

  // Show organization creation form if no organization exists
  if (!orgLoading && !organization) {
    return <CreateOrganizationForm />
  }

  const handleConnect = async (integrationId: string, data?: any) => {
    setConnectingIntegrations(prev => new Set(prev).add(integrationId))
    
    try {
      let endpoint = ''
      let payload = { organizationId: organization?.id, ...data }
      
      switch (integrationId) {
        case 'shopify':
          endpoint = '/api/integrations/shopify/connect'
          break
        case 'stripe':
          endpoint = '/api/integrations/stripe/connect'
          break
        case 'woocommerce':
          endpoint = '/api/integrations/woocommerce/connect'
          break
        default:
          throw new Error('Integration not supported yet')
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      
      if (result.success) {
        setConnectedIntegrations(prev => new Set(prev).add(integrationId))
        showToast.success(`${integrations.find(i => i.id === integrationId)?.name} connected successfully!`)
        
        // Reload integration statuses
        const dashboardResponse = await fetch(`/api/organizations/${organization?.id}/dashboard`)
        const dashboardData = await dashboardResponse.json()
        
        if (dashboardData.success && dashboardData.data.integrations) {
          const statuses: Record<string, { lastSyncAt?: string; status: string }> = {}
          dashboardData.data.integrations.forEach((integration: any) => {
            const platformId = integration.platform.toLowerCase()
            statuses[platformId] = {
              lastSyncAt: integration.lastSyncAt,
              status: integration.status
            }
          })
          setIntegrationStatuses(statuses)
        }
      } else {
        throw new Error(result.error || 'Connection failed')
      }
    } catch (error) {
      console.error('Connection failed:', error)
      showToast.error(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setConnectingIntegrations(prev => {
        const next = new Set(prev)
        next.delete(integrationId)
        return next
      })
    }
  }

  const handleSync = async (integrationId: string) => {
    setConnectingIntegrations(prev => new Set(prev).add(integrationId))
    
    try {
      const response = await fetch(`/api/integrations/${integrationId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization?.id })
      })

      const result = await response.json()
      
      if (result.success) {
        showToast.success('Data synced successfully!')
        
        // Update last sync time
        setIntegrationStatuses(prev => ({
          ...prev,
          [integrationId]: {
            ...prev[integrationId],
            lastSyncAt: new Date().toISOString(),
            status: 'CONNECTED'
          }
        }))
      } else {
        throw new Error(result.error || 'Sync failed')
      }
    } catch (error) {
      console.error('Sync failed:', error)
      showToast.error(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setConnectingIntegrations(prev => {
        const next = new Set(prev)
        next.delete(integrationId)
        return next
      })
    }
  }

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration? This will remove all synced data.')) {
      return
    }

    setConnectingIntegrations(prev => new Set(prev).add(integrationId))
    
    try {
      const response = await fetch(`/api/integrations/${integrationId}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization?.id })
      })

      const result = await response.json()
      
      if (result.success) {
        setConnectedIntegrations(prev => {
          const next = new Set(prev)
          next.delete(integrationId)
          return next
        })
        showToast.success(`${integrations.find(i => i.id === integrationId)?.name} disconnected successfully.`)
      } else {
        throw new Error(result.error || 'Disconnect failed')
      }
    } catch (error) {
      console.error('Disconnect failed:', error)
      showToast.error(`Disconnect failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setConnectingIntegrations(prev => {
        const next = new Set(prev)
        next.delete(integrationId)
        return next
      })
    }
  }

  const filteredIntegrations = integrations
    .filter(integration => {
      if (selectedCategory !== 'all' && integration.category !== selectedCategory) {
        return false
      }
      if (searchQuery && !integration.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !integration.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      // Sort by connection status (connected first), then by popularity/recommendation
      const aConnected = connectedIntegrations.has(a.id)
      const bConnected = connectedIntegrations.has(b.id)
      
      if (aConnected && !bConnected) return -1
      if (!aConnected && bConnected) return 1
      
      if (a.popular && !b.popular) return -1
      if (!a.popular && b.popular) return 1
      
      if (a.recommended && !b.recommended) return -1
      if (!a.recommended && b.recommended) return 1
      
      return 0
    })

  const connectedCount = connectedIntegrations.size
  const totalIntegrations = integrations.length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        {showWelcomeBanner && connectedCount === 0 && (
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Rocket className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">Welcome to BizInsights! 🎉</h3>
                    <p className="text-gray-700 mb-4">
                      Let's get you set up in under 2 minutes. Connect your first integration below to start getting AI-powered insights about your business.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                        ✓ Automatic data sync
                      </Badge>
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        ✓ AI insights ready
                      </Badge>
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                        ✓ Real-time analytics
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setShowWelcomeBanner(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Banner */}
        {connectedCount > 0 && showWelcomeBanner && (
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">Great job! Your first integration is connected! 🚀</h3>
                    <p className="text-gray-700 mb-3">
                      Data is now syncing. Head to your dashboard to see AI-powered insights, or connect more integrations for deeper analytics.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => window.location.href = '/dashboard'}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        View Dashboard
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowWelcomeBanner(false)}
                      >
                        Connect More
                      </Button>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setShowWelcomeBanner(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Easy Integrations</h1>
            <p className="text-muted-foreground">
              Connect your business tools in minutes with our guided setup
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              {connectedCount}/{totalIntegrations} Connected
            </Badge>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                style={{ width: `${(connectedCount / totalIntegrations) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {connectedCount > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div className="ml-2">
                    <p className="text-sm font-medium leading-none">Connected</p>
                    <p className="text-2xl font-bold">{connectedCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-blue-600" />
                  <div className="ml-2">
                    <p className="text-sm font-medium leading-none">Data Sources</p>
                    <p className="text-2xl font-bold">{connectedCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <div className="ml-2">
                    <p className="text-sm font-medium leading-none">Last Sync</p>
                    <p className="text-2xl font-bold">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="whitespace-nowrap"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {category.name}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Integration Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {filteredIntegrations.map((integration) => (
            <QuickConnectCard
              key={integration.id}
              integration={integration}
              isConnected={connectedIntegrations.has(integration.id)}
              isConnecting={connectingIntegrations.has(integration.id)}
              connectionStatus={integrationStatuses[integration.id]?.status as 'healthy' | 'error' | 'syncing'}
              lastSyncAt={integrationStatuses[integration.id]?.lastSyncAt}
              onConnect={() => {
                if (['google-analytics', 'facebook-ads'].includes(integration.id)) {
                  showToast.info(`${integration.name} integration coming soon! Connect Shopify, Stripe, or WooCommerce for now.`)
                } else {
                  setSelectedIntegration(integration.id)
                }
              }}
              onSync={() => handleSync(integration.id)}
              onDisconnect={() => handleDisconnect(integration.id)}
            />
          ))}
        </div>

        {filteredIntegrations.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No integrations found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Integration Wizard */}
      {selectedIntegration && (
        <EasyIntegrationWizard
          integration={integrations.find(i => i.id === selectedIntegration)!}
          onConnect={(data) => handleConnect(selectedIntegration, data)}
          onClose={() => setSelectedIntegration(null)}
        />
      )}
    </DashboardLayout>
  )
}