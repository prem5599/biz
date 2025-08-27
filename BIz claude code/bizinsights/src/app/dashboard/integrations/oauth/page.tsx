'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { OAuthConnectCard } from '@/components/integrations/oauth-connect-card'
import { OAuthAuthorizationDialog } from '@/components/integrations/oauth-authorization-dialog'
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
  ExternalLink,
  Shield,
  Clock,
  Globe
} from 'lucide-react'
import { useCurrentOrganization } from '@/hooks/useOrganization'

const oauthIntegrations = [
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Connect your Shopify store with one click. Login with your Shopify account and start syncing data instantly.',
    icon: ShoppingBag,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    popular: true,
    category: 'ecommerce',
    permissions: [
      'Read orders and sales data',
      'Access customer information',
      'View product catalog',
      'Read store analytics'
    ],
    dataTypes: [
      'Orders and transactions',
      'Customer profiles and behavior',
      'Product performance metrics',
      'Revenue and sales trends',
      'Inventory levels',
      'Customer lifetime value'
    ],
    authUrl: '/api/integrations/shopify/oauth/authorize'
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'One-click connection to your Stripe account. Securely sync payment data, subscriptions, and customer information.',
    icon: CreditCard,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    recommended: true,
    category: 'payment',
    permissions: [
      'Read payment transactions',
      'Access customer data',
      'View subscription information',
      'Read account analytics'
    ],
    dataTypes: [
      'Payment transactions',
      'Customer payment methods',
      'Subscription metrics',
      'Revenue analytics',
      'Chargeback data',
      'MRR and ARR tracking'
    ],
    authUrl: '/api/integrations/stripe/oauth/authorize'
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Connect with Google OAuth to access your GA4 data. Get website traffic, user behavior, and conversions.',
    icon: BarChart,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    category: 'analytics',
    permissions: [
      'Read Google Analytics data',
      'Access website traffic information',
      'View conversion data',
      'Read audience insights'
    ],
    dataTypes: [
      'Website sessions and pageviews',
      'User behavior and demographics',
      'Conversion rates and goals',
      'Traffic sources',
      'Page performance',
      'Real-time visitor data'
    ],
    authUrl: '/api/integrations/google-analytics/oauth/authorize'
  },
  {
    id: 'facebook-business',
    name: 'Facebook Business',
    description: 'Login with Facebook to connect your Business Manager. Access ad campaigns, pages, and Instagram insights.',
    icon: Facebook,
    color: 'text-blue-800',
    bgColor: 'bg-blue-50',
    category: 'advertising',
    permissions: [
      'Read ad campaign data',
      'Access Facebook Pages insights',
      'View Instagram business data',
      'Read audience information'
    ],
    dataTypes: [
      'Ad campaign performance',
      'ROAS and ad spend metrics',
      'Audience demographics',
      'Page and post engagement',
      'Instagram insights',
      'Conversion tracking'
    ],
    authUrl: '/api/integrations/facebook/oauth/authorize'
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    description: 'Connect with Google OAuth to access your Google Ads data. Monitor campaigns, keywords, and ad performance.',
    icon: Globe,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    category: 'advertising',
    permissions: [
      'Read Google Ads campaign data',
      'Access keyword performance',
      'View ad group metrics',
      'Read conversion data'
    ],
    dataTypes: [
      'Campaign performance metrics',
      'Keyword rankings and costs',
      'Ad group effectiveness',
      'Conversion tracking',
      'Quality Score data',
      'Budget and spend analysis'
    ],
    authUrl: '/api/integrations/google-ads/oauth/authorize'
  },
  {
    id: 'linkedin-ads',
    name: 'LinkedIn Ads',
    description: 'One-click LinkedIn connection for B2B advertising insights. Track campaigns, leads, and professional audiences.',
    icon: Users,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    category: 'advertising',
    permissions: [
      'Read LinkedIn ad campaign data',
      'Access lead generation metrics',
      'View audience insights',
      'Read company page analytics'
    ],
    dataTypes: [
      'B2B campaign performance',
      'Lead generation metrics',
      'Professional audience data',
      'Company page insights',
      'Sponsored content performance',
      'Cost per lead tracking'
    ],
    authUrl: '/api/integrations/linkedin/oauth/authorize'
  }
]

const categories = [
  { id: 'all', name: 'All Platforms', icon: Sparkles },
  { id: 'ecommerce', name: 'E-commerce', icon: ShoppingBag },
  { id: 'payment', name: 'Payments', icon: CreditCard },
  { id: 'analytics', name: 'Analytics', icon: BarChart },
  { id: 'advertising', name: 'Advertising', icon: TrendingUp }
]

export default function OAuthIntegrations() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIntegration, setSelectedIntegration] = useState<typeof oauthIntegrations[0] | null>(null)
  const [connectedIntegrations, setConnectedIntegrations] = useState<Set<string>>(new Set())
  const [connectingIntegrations, setConnectingIntegrations] = useState<Set<string>>(new Set())
  const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, { lastSyncAt?: string; status: string }>>({})
  
  const { organization } = useCurrentOrganization()

  // Load integration statuses
  useEffect(() => {
    loadIntegrations()
  }, [organization?.id])

  const loadIntegrations = async () => {
    if (!organization?.id) return

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

  const handleConnect = async (integrationId: string) => {
    const integration = oauthIntegrations.find(i => i.id === integrationId)
    if (!integration) return

    // For demo purposes, we'll show the authorization dialog
    // In a real app, this would handle the OAuth flow
    setSelectedIntegration(integration)
  }

  const handleAuthorize = async (authUrl: string) => {
    if (!selectedIntegration) return

    setConnectingIntegrations(prev => new Set(prev).add(selectedIntegration.id))
    
    try {
      // In a real app, this would be handled by the OAuth callback
      // For demo, we'll simulate a successful connection
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setConnectedIntegrations(prev => new Set(prev).add(selectedIntegration.id))
      setIntegrationStatuses(prev => ({
        ...prev,
        [selectedIntegration.id]: {
          lastSyncAt: new Date().toISOString(),
          status: 'CONNECTED'
        }
      }))
      
      showToast.success(`${selectedIntegration.name} connected successfully!`)
    } catch (error) {
      console.error('Connection failed:', error)
      showToast.error('Connection failed. Please try again.')
    } finally {
      setConnectingIntegrations(prev => {
        const next = new Set(prev)
        next.delete(selectedIntegration.id)
        return next
      })
    }
  }

  const handleSync = async (integrationId: string) => {
    setConnectingIntegrations(prev => new Set(prev).add(integrationId))
    
    try {
      // Simulate sync
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setIntegrationStatuses(prev => ({
        ...prev,
        [integrationId]: {
          ...prev[integrationId],
          lastSyncAt: new Date().toISOString(),
          status: 'CONNECTED'
        }
      }))
      
      showToast.success('Data synced successfully!')
    } catch (error) {
      console.error('Sync failed:', error)
      showToast.error('Sync failed. Please try again.')
    } finally {
      setConnectingIntegrations(prev => {
        const next = new Set(prev)
        next.delete(integrationId)
        return next
      })
    }
  }

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) {
      return
    }

    setConnectingIntegrations(prev => new Set(prev).add(integrationId))
    
    try {
      // Simulate disconnect
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setConnectedIntegrations(prev => {
        const next = new Set(prev)
        next.delete(integrationId)
        return next
      })
      
      const integration = oauthIntegrations.find(i => i.id === integrationId)
      showToast.success(`${integration?.name} disconnected successfully.`)
    } catch (error) {
      console.error('Disconnect failed:', error)
      showToast.error('Disconnect failed. Please try again.')
    } finally {
      setConnectingIntegrations(prev => {
        const next = new Set(prev)
        next.delete(integrationId)
        return next
      })
    }
  }

  const filteredIntegrations = oauthIntegrations
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
  const totalIntegrations = oauthIntegrations.length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-white" />
              </div>
              One-Click Integrations
            </h1>
            <p className="text-muted-foreground">
              Login with your accounts to connect instantly - no API keys needed
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              {connectedCount}/{totalIntegrations} Connected
            </Badge>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
                style={{ width: `${(connectedCount / totalIntegrations) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Benefits Banner */}
        <Card className="border-2 border-dashed border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Super Easy OAuth Connections</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Just click "Login to Connect" and sign in with your existing accounts. No copying API keys or complex setup!
                </p>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>One-click connection</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <Shield className="w-4 h-4" />
                    <span>Secure OAuth flow</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-700">
                    <Clock className="w-4 h-4" />
                    <span>30 seconds setup</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                    <p className="text-sm font-medium leading-none">Sync Status</p>
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
              placeholder="Search platforms..."
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
        <div className="grid gap-6 lg:grid-cols-2">
          {filteredIntegrations.map((integration) => (
            <OAuthConnectCard
              key={integration.id}
              integration={integration}
              isConnected={connectedIntegrations.has(integration.id)}
              isConnecting={connectingIntegrations.has(integration.id)}
              connectionStatus={integrationStatuses[integration.id]?.status as 'healthy' | 'error' | 'syncing'}
              lastSyncAt={integrationStatuses[integration.id]?.lastSyncAt}
              onConnect={() => handleConnect(integration.id)}
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
                <h3 className="text-lg font-semibold mb-2">No platforms found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* OAuth Authorization Dialog */}
      {selectedIntegration && (
        <OAuthAuthorizationDialog
          integration={selectedIntegration}
          isOpen={!!selectedIntegration}
          onClose={() => setSelectedIntegration(null)}
          onAuthorize={handleAuthorize}
        />
      )}
    </DashboardLayout>
  )
}