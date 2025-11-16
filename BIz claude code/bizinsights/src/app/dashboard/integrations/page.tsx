'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { showToast } from '@/components/ui/toast-helper'
import { ShoppingBag, CreditCard, BarChart, Facebook, RefreshCw, ShoppingCart, X, Clock, CheckCircle2, AlertCircle, Zap, ExternalLink } from 'lucide-react'
import { useCurrentOrganization } from '@/hooks/useOrganization'
import { useDashboard } from '@/hooks/useDashboard'
import { ShopifyOAuthDialog } from '@/components/integrations/shopify-oauth-dialog'

const integrations = [
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Connect your Shopify store to sync orders, products, customers, and sales analytics. Get real-time insights into your e-commerce performance.',
    icon: ShoppingBag,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    connected: false,
    features: ['Order tracking', 'Customer analytics', 'Product performance', 'Revenue insights']
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Sync payment data, transaction history, and subscription metrics. Track revenue, customer lifetime value, and payment trends.',
    icon: CreditCard,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    connected: false,
    features: ['Payment analytics', 'Subscription tracking', 'Revenue insights', 'Customer data']
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Track website traffic, user behavior, conversions, and audience insights. Understand how visitors interact with your site.',
    icon: BarChart,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    connected: false,
    features: ['Traffic analysis', 'Conversion tracking', 'User behavior', 'Audience insights']
  },
  {
    id: 'facebook-ads',
    name: 'Facebook Ads',
    description: 'Monitor ad campaign performance, track ROAS, analyze audience engagement, and optimize your social media advertising spend.',
    icon: Facebook,
    color: 'text-blue-800',
    bgColor: 'bg-blue-50',
    connected: false,
    features: ['Campaign analytics', 'ROAS tracking', 'Audience insights', 'Ad optimization']
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Connect your WordPress WooCommerce store to track sales, analyze customer behavior, and monitor product performance.',
    icon: ShoppingCart,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    connected: false,
    features: ['Sales tracking', 'Customer analytics', 'Product insights', 'Order management']
  }
]

export default function Integrations() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState<string | null>(null)
  const [connectedIntegrations, setConnectedIntegrations] = useState<Set<string>>(new Set())
  const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, { lastSyncAt?: string; status: string }>>({})
  const [showWooCommerceModal, setShowWooCommerceModal] = useState(false)
  const [showShopifyModal, setShowShopifyModal] = useState(false)
  const [showShopifyOAuthDialog, setShowShopifyOAuthDialog] = useState(false)
  const [showStripeModal, setShowStripeModal] = useState(false)
  const [showGoogleAnalyticsModal, setShowGoogleAnalyticsModal] = useState(false)
  const [showFacebookAdsModal, setShowFacebookAdsModal] = useState(false)
  const [wooCommerceForm, setWooCommerceForm] = useState({
    storeUrl: '',
    consumerKey: '',
    consumerSecret: ''
  })
  const [shopifyForm, setShopifyForm] = useState({
    shopDomain: '',
    accessToken: ''
  })
  const [stripeForm, setStripeForm] = useState({
    secretKey: '',
    publishableKey: ''
  })
  const [googleAnalyticsForm, setGoogleAnalyticsForm] = useState({
    propertyId: '',
    serviceAccountKey: ''
  })
  const [facebookAdsForm, setFacebookAdsForm] = useState({
    accessToken: '',
    adAccountId: ''
  })
  const { organization } = useCurrentOrganization()
  const { data: dashboardData } = useDashboard(organization?.id || null)

  // Handle OAuth callback results
  useEffect(() => {
    const oauthResult = searchParams.get('oauth_result')
    const platform = searchParams.get('platform')
    const shop = searchParams.get('shop')
    const error = searchParams.get('error')
    const message = searchParams.get('message')

    if (oauthResult === 'success') {
      showToast.success(message || `${platform} connected successfully!`)
      // Reload integrations to show updated status
      loadIntegrations()
      // Clean up URL parameters
      window.history.replaceState({}, '', '/dashboard/integrations')
    } else if (oauthResult === 'error') {
      showToast.error(message || `Failed to connect ${platform}. Please try again.`)
      // Clean up URL parameters
      window.history.replaceState({}, '', '/dashboard/integrations')
    }
  }, [searchParams])

  // Load real integration status
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
    setLoading(integrationId)

    try {
      if (integrationId === 'shopify') {
        // Use OAuth flow for single-click authentication
        setShowShopifyOAuthDialog(true)
        setLoading(null) // Reset loading state since dialog handles it
      } else if (integrationId === 'stripe') {
        setShowStripeModal(true)
      } else if (integrationId === 'google-analytics') {
        setShowGoogleAnalyticsModal(true)
      } else if (integrationId === 'facebook-ads') {
        setShowFacebookAdsModal(true)
      } else if (integrationId === 'woocommerce') {
        setShowWooCommerceModal(true)
      }
    } catch (error) {
      console.error('Connection failed:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleSync = async (integrationId: string) => {
    setLoading(integrationId)
    
    try {
      const response = await fetch(`/api/integrations/${integrationId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: organization?.id || ''
        })
      })

      const data = await response.json()
      
      if (data.success) {
        showToast.success("Your data has been synced successfully!")
        // Reload integration statuses
        loadIntegrations()
      } else {
        showToast.error(`Sync failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error syncing integration:', error)
      showToast.error("Failed to sync integration. Please try again.")
    }
    
    setLoading(null)
  }

  const handleWooCommerceConnect = async () => {
    if (!wooCommerceForm.storeUrl || !wooCommerceForm.consumerKey || !wooCommerceForm.consumerSecret) {
      showToast.error("Please fill in all required fields.")
      return
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/.+\..+/
    if (!urlPattern.test(wooCommerceForm.storeUrl)) {
      showToast.error("Please enter a valid store URL (including https://).")
      return
    }

    setLoading('woocommerce')
    
    try {
      const response = await fetch('/api/integrations/woocommerce/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: organization?.id,
          storeUrl: wooCommerceForm.storeUrl,
          consumerKey: wooCommerceForm.consumerKey,
          consumerSecret: wooCommerceForm.consumerSecret
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setConnectedIntegrations(prev => new Set(prev).add('woocommerce'))
        setShowWooCommerceModal(false)
        setWooCommerceForm({ storeUrl: '', consumerKey: '', consumerSecret: '' })
        showToast.success("WooCommerce connected successfully!")
        // Reload integration statuses
        loadIntegrations()
      } else {
        showToast.error(`Connection failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error connecting WooCommerce:', error)
      showToast.error("Failed to connect WooCommerce. Please try again.")
    } finally {
      setLoading(null)
    }
  }

  const handleShopifyConnect = async () => {
    if (!shopifyForm.shopDomain || !shopifyForm.accessToken) {
      showToast.error("Please fill in all required fields.")
      return
    }

    // Validate domain format
    const domainPattern = /^[a-zA-Z0-9-]+$/
    if (!domainPattern.test(shopifyForm.shopDomain)) {
      showToast.error("Please enter a valid shop domain (without .myshopify.com).")
      return
    }

    setLoading('shopify')
    
    try {
      const response = await fetch('/api/integrations/shopify/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: organization?.id,
          shopDomain: shopifyForm.shopDomain,
          accessToken: shopifyForm.accessToken
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setConnectedIntegrations(prev => new Set(prev).add('shopify'))
        setShowShopifyModal(false)
        setShopifyForm({ shopDomain: '', accessToken: '' })
        showToast.success("Shopify connected successfully!")
        // Reload integration statuses
        loadIntegrations()
      } else {
        showToast.error(`Connection failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error connecting Shopify:', error)
      toast({
        title: "Connection Error",
        description: "Failed to connect Shopify. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleStripeConnect = async () => {
    if (!stripeForm.secretKey || !stripeForm.publishableKey) {
      showToast.error("Please fill in all required fields.")
      return
    }

    // Validate key formats
    if (!stripeForm.secretKey.startsWith('sk_')) {
      showToast.error("Secret key should start with 'sk_'.")
      return
    }

    if (!stripeForm.publishableKey.startsWith('pk_')) {
      showToast.error("Publishable key should start with 'pk_'.")
      return
    }

    setLoading('stripe')
    
    try {
      const response = await fetch('/api/integrations/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization?.id,
          secretKey: stripeForm.secretKey,
          publishableKey: stripeForm.publishableKey
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setConnectedIntegrations(prev => new Set(prev).add('stripe'))
        setShowStripeModal(false)
        setStripeForm({ secretKey: '', publishableKey: '' })
        showToast.success("Stripe connected successfully!")
        // Reload integration statuses
        loadIntegrations()
      } else {
        showToast.error(`Connection failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error)
      toast({
        title: "Connection Error",
        description: "Failed to connect Stripe. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleGoogleAnalyticsConnect = async () => {
    if (!googleAnalyticsForm.propertyId || !googleAnalyticsForm.serviceAccountKey) {
      showToast.error("Please fill in all required fields.")
      return
    }

    // Validate property ID format (should be numeric)
    if (!/^\d+$/.test(googleAnalyticsForm.propertyId)) {
      showToast.error("Property ID should be a number.")
      return
    }

    // Validate JSON format
    try {
      JSON.parse(googleAnalyticsForm.serviceAccountKey)
    } catch (error) {
      showToast.error("Service account key must be valid JSON.")
      return
    }

    setLoading('google-analytics')
    
    try {
      const response = await fetch('/api/integrations/google-analytics/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization?.id,
          propertyId: googleAnalyticsForm.propertyId,
          serviceAccountKey: googleAnalyticsForm.serviceAccountKey
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setConnectedIntegrations(prev => new Set(prev).add('google-analytics'))
        setShowGoogleAnalyticsModal(false)
        setGoogleAnalyticsForm({ propertyId: '', serviceAccountKey: '' })
        showToast.success("Google Analytics connected successfully!")
        // Reload integration statuses
        loadIntegrations()
      } else {
        showToast.error(`Connection failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error connecting Google Analytics:', error)
      toast({
        title: "Connection Error",
        description: "Failed to connect Google Analytics. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleFacebookAdsConnect = async () => {
    if (!facebookAdsForm.accessToken || !facebookAdsForm.adAccountId) {
      showToast.error("Please fill in all required fields.")
      return
    }

    // Validate access token format
    if (!facebookAdsForm.accessToken.startsWith('EAA')) {
      showToast.error("Facebook access token should start with 'EAA'.")
      return
    }

    setLoading('facebook-ads')
    
    try {
      const response = await fetch('/api/integrations/facebook-ads/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization?.id,
          accessToken: facebookAdsForm.accessToken,
          adAccountId: facebookAdsForm.adAccountId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setConnectedIntegrations(prev => new Set(prev).add('facebook-ads'))
        setShowFacebookAdsModal(false)
        setFacebookAdsForm({ accessToken: '', adAccountId: '' })
        showToast.success("Facebook Ads connected successfully!")
        // Reload integration statuses
        loadIntegrations()
      } else {
        showToast.error(`Connection failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error connecting Facebook Ads:', error)
      toast({
        title: "Connection Error",
        description: "Failed to connect Facebook Ads. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleGenericConnect = async (integrationId: string) => {
    let message = ''
    
    if (integrationId === 'Google Analytics') {
      message = `🚀 Google Analytics Integration Coming Soon!

📊 What you'll be able to connect:
• Website traffic and user behavior data
• Conversion tracking and goal completions  
• Audience demographics and interests
• Page performance and bounce rates
• Real-time visitor analytics

🔧 How it will work:
• OAuth 2.0 secure authentication
• Google Analytics 4 (GA4) API integration
• Automatic data sync every hour
• Historical data import (up to 2 years)

⏰ Expected availability: Q2 2025

For now, connect Shopify, WooCommerce, or Stripe to start tracking your business metrics!`
    } else if (integrationId === 'Facebook Ads') {
      message = `🚀 Facebook Ads Integration Coming Soon!

📈 What you'll be able to connect:
• Ad campaign performance data
• Audience insights and targeting metrics
• Cost per acquisition (CPA) and ROAS
• Ad creative performance analysis
• Cross-platform attribution data

🔧 How it will work:
• Facebook Business API integration
• Secure OAuth authentication
• Real-time campaign monitoring
• Custom audience sync capabilities

⏰ Expected availability: Q2 2025

For now, connect Shopify, WooCommerce, or Stripe to start analyzing your sales data!`
    }
    
    showToast.info(message)
    setLoading(null)
  }

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration? This will remove all synced data.')) {
      return
    }

    setLoading(integrationId)
    
    try {
      const response = await fetch(`/api/integrations/${integrationId}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: organization?.id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setConnectedIntegrations(prev => {
          const next = new Set(prev)
          next.delete(integrationId)
          return next
        })
        showToast.success(`${integrationId} has been disconnected successfully.`)
        // Reload integration statuses
        loadIntegrations()
      } else {
        showToast.error(`Disconnect failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error disconnecting integration:', error)
      showToast.error("Failed to disconnect integration. Please try again.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
            <p className="text-muted-foreground">
              Connect your business tools to unlock powerful insights
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => window.location.href = '/dashboard/integrations/oauth'}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Login to Connect
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/dashboard/integrations/easy'}
            >
              <Zap className="w-4 h-4 mr-2" />
              Manual Setup
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {integrations.map((integration) => {
            const Icon = integration.icon
            const isConnected = connectedIntegrations.has(integration.id)
            const isLoading = loading === integration.id

            return (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${integration.bgColor}`}>
                      <Icon className={`h-6 w-6 ${integration.color}`} />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        {integration.name}
                        {isConnected && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Connected
                          </span>
                        )}
                        {integration.comingSoon && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            Coming Soon
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mb-3">
                        {integration.description}
                      </CardDescription>
                      {integration.features && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {integration.features.map((feature: string, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {!isConnected ? (
                      <Button
                        onClick={() => handleConnect(integration.id)}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                        Connect
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleSync(integration.id)}
                          disabled={isLoading}
                          className="flex-1"
                        >
                          {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                          Sync Now
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDisconnect(integration.id)}
                          disabled={isLoading}
                        >
                          {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                          Disconnect
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
            <CardDescription>
              Monitor the health and sync status of your connected integrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connectedIntegrations.size === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No integrations connected yet. Connect your first integration above to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {Array.from(connectedIntegrations).map(integrationId => {
                  const integration = integrations.find(i => i.id === integrationId)
                  if (!integration) return null

                  return (
                    <div key={integrationId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <integration.icon className={`h-5 w-5 ${integration.color}`} />
                        <div>
                          <p className="font-medium">{integration.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {integrationStatuses[integrationId]?.lastSyncAt 
                              ? `Last synced: ${new Date(integrationStatuses[integrationId].lastSyncAt!).toLocaleString()}`
                              : 'Never synced'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {integrationStatuses[integrationId]?.status === 'SYNCING' ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                            Syncing
                          </span>
                        ) : integrationStatuses[integrationId]?.status === 'CONNECTED' ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Healthy
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Error
                          </span>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSync(integrationId)}
                          disabled={loading === integrationId}
                        >
                          {loading === integrationId ? (
                            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-1 h-3 w-3" />
                          )}
                          Sync Now
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* WooCommerce Connection Modal */}
      <Dialog open={showWooCommerceModal} onOpenChange={setShowWooCommerceModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Connect WooCommerce Store</DialogTitle>
            <DialogDescription>
              Enter your WooCommerce store details to connect and sync your data.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="form" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form">Connection Form</TabsTrigger>
              <TabsTrigger value="setup">Setup Guide</TabsTrigger>
            </TabsList>
            
            <TabsContent value="form" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="storeUrl">Store URL</Label>
                  <Input
                    id="storeUrl"
                    placeholder="https://yourstore.com"
                    value={wooCommerceForm.storeUrl}
                    onChange={(e) => setWooCommerceForm(prev => ({ ...prev, storeUrl: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your WooCommerce store URL (including https://)
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="consumerKey">Consumer Key</Label>
                  <Input
                    id="consumerKey"
                    placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={wooCommerceForm.consumerKey}
                    onChange={(e) => setWooCommerceForm(prev => ({ ...prev, consumerKey: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="consumerSecret">Consumer Secret</Label>
                  <Input
                    id="consumerSecret"
                    type="password"
                    placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={wooCommerceForm.consumerSecret}
                    onChange={(e) => setWooCommerceForm(prev => ({ ...prev, consumerSecret: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-green-800 text-xs">
                      <strong>What we sync:</strong> Orders, customers, and sales data for insights.
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-blue-800 text-xs">
                      <strong>Security:</strong> Only "Read" permissions - we never modify your store.
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded p-3">
                    <p className="text-amber-800 text-xs">
                      <strong>Requirements:</strong> WooCommerce 3.0+ with SSL/HTTPS enabled.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="setup" className="space-y-4 max-h-[50vh] overflow-y-auto">
              <div className="space-y-4 text-sm">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">1. Access WooCommerce Settings</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Log into your WordPress Admin dashboard</li>
                    <li>Go to <strong>WooCommerce</strong> → <strong>Settings</strong></li>
                    <li>Click the <strong>"Advanced"</strong> tab</li>
                    <li>Select <strong>"REST API"</strong> sub-tab</li>
                  </ol>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">2. Create API Key</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Click <strong>"Add key"</strong> button</li>
                    <li>Fill in the details:
                      <ul className="list-disc ml-4 mt-1">
                        <li><strong>Description:</strong> "BizInsights Analytics"</li>
                        <li><strong>User:</strong> Select an Administrator user</li>
                        <li><strong>Permissions:</strong> Select <strong>"Read"</strong></li>
                      </ul>
                    </li>
                    <li>Click <strong>"Generate API key"</strong></li>
                  </ol>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">3. Copy Credentials</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Copy the <strong>"Consumer key"</strong> (starts with ck_)</li>
                    <li>Copy the <strong>"Consumer secret"</strong> (starts with cs_)</li>
                    <li>Paste both in the Connection Form tab</li>
                    <li>Make sure your Store URL includes https://</li>
                  </ol>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setShowWooCommerceModal(false)}
              disabled={loading === 'woocommerce'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleWooCommerceConnect}
              disabled={loading === 'woocommerce'}
            >
              {loading === 'woocommerce' && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Connect Store
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shopify Connection Modal */}
      <Dialog open={showShopifyModal} onOpenChange={setShowShopifyModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Connect Shopify Store</DialogTitle>
            <DialogDescription>
              Enter your Shopify store details to connect and sync your data.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="form" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form">Connection Form</TabsTrigger>
              <TabsTrigger value="setup">Setup Guide</TabsTrigger>
            </TabsList>
            
            <TabsContent value="form" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="shopDomain">Shop Domain</Label>
                  <Input
                    id="shopDomain"
                    placeholder="your-store"
                    value={shopifyForm.shopDomain}
                    onChange={(e) => setShopifyForm(prev => ({ ...prev, shopDomain: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Shopify store domain (without .myshopify.com)
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accessToken">Access Token</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={shopifyForm.accessToken}
                    onChange={(e) => setShopifyForm(prev => ({ ...prev, accessToken: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-blue-800 text-xs">
                      <strong>Security:</strong> Your token is encrypted and stored securely. We only read data.
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded p-3">
                    <p className="text-amber-800 text-xs">
                      <strong>Domain format:</strong> Enter "mystore" not "mystore.myshopify.com"
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="setup" className="space-y-4 max-h-[50vh] overflow-y-auto">
              <div className="space-y-4 text-sm">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">1. Create Private App</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Log into your Shopify Admin panel</li>
                    <li>Go to <strong>Settings</strong> → <strong>Apps and sales channels</strong></li>
                    <li>Click <strong>"Develop apps"</strong> → <strong>"Create an app"</strong></li>
                    <li>Enter app name: "BizInsights Analytics"</li>
                  </ol>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">2. Configure Permissions</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Click <strong>"Configure Admin API scopes"</strong></li>
                    <li>Enable these permissions:
                      <ul className="list-disc ml-4 mt-1">
                        <li><code>read_orders</code> - View order data</li>
                        <li><code>read_products</code> - View product catalog</li>
                        <li><code>read_customers</code> - View customer data</li>
                        <li><code>read_analytics</code> - View store analytics</li>
                      </ul>
                    </li>
                    <li>Click <strong>"Save"</strong></li>
                  </ol>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">3. Get Access Token</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Click <strong>"Install app"</strong></li>
                    <li>Go to <strong>"API credentials"</strong> tab</li>
                    <li>Copy the <strong>"Admin API access token"</strong></li>
                    <li>Paste it in the Connection Form tab</li>
                  </ol>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setShowShopifyModal(false)}
              disabled={loading === 'shopify'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleShopifyConnect}
              disabled={loading === 'shopify'}
            >
              {loading === 'shopify' && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Connect Store
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stripe Connection Modal */}
      <Dialog open={showStripeModal} onOpenChange={setShowStripeModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Connect Stripe</DialogTitle>
            <DialogDescription>
              Enter your Stripe API keys to connect and sync payment data.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="form" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form">Connection Form</TabsTrigger>
              <TabsTrigger value="setup">Setup Guide</TabsTrigger>
            </TabsList>
            
            <TabsContent value="form" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="secretKey">Secret Key</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    placeholder="sk_live_... or sk_test_..."
                    value={stripeForm.secretKey}
                    onChange={(e) => setStripeForm(prev => ({ ...prev, secretKey: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="publishableKey">Publishable Key</Label>
                  <Input
                    id="publishableKey"
                    placeholder="pk_live_... or pk_test_..."
                    value={stripeForm.publishableKey}
                    onChange={(e) => setStripeForm(prev => ({ ...prev, publishableKey: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-green-800 text-xs">
                      <strong>What we sync:</strong> Payments, customers, subscriptions, and revenue analytics.
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-blue-800 text-xs">
                      <strong>Security:</strong> Keys are encrypted. We only read data - never process payments.
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded p-3">
                    <p className="text-amber-800 text-xs">
                      <strong>Modes:</strong> Use test keys for development, live keys for production.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="setup" className="space-y-4 max-h-[50vh] overflow-y-auto">
              <div className="space-y-4 text-sm">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">1. Access Stripe Dashboard</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Log into your <strong>Stripe Dashboard</strong> at dashboard.stripe.com</li>
                    <li>Make sure you're in the correct account/business</li>
                    <li>Check if you're in <strong>Test mode</strong> or <strong>Live mode</strong></li>
                  </ol>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">2. Navigate to API Keys</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Click <strong>"Developers"</strong> in the left sidebar</li>
                    <li>Select <strong>"API keys"</strong> from the submenu</li>
                    <li>You'll see both Publishable and Secret keys</li>
                  </ol>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">3. Copy Your Keys</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li><strong>Secret key:</strong> Click "Reveal test/live key" → Copy
                      <ul className="list-disc ml-4 mt-1">
                        <li>Starts with <code>sk_test_</code> (test) or <code>sk_live_</code> (live)</li>
                        <li>This key can access your Stripe data</li>
                      </ul>
                    </li>
                    <li><strong>Publishable key:</strong> Copy directly
                      <ul className="list-disc ml-4 mt-1">
                        <li>Starts with <code>pk_test_</code> (test) or <code>pk_live_</code> (live)</li>
                        <li>This key identifies your account publicly</li>
                      </ul>
                    </li>
                    <li>Paste both keys in the Connection Form tab</li>
                  </ol>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setShowStripeModal(false)}
              disabled={loading === 'stripe'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStripeConnect}
              disabled={loading === 'stripe'}
            >
              {loading === 'stripe' && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Connect Stripe
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Google Analytics Connection Modal */}
      <Dialog open={showGoogleAnalyticsModal} onOpenChange={setShowGoogleAnalyticsModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Connect Google Analytics</DialogTitle>
            <DialogDescription>
              Enter your Google Analytics property details to connect and sync your data.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="form" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form">Connection Form</TabsTrigger>
              <TabsTrigger value="setup">Setup Guide</TabsTrigger>
            </TabsList>
            
            <TabsContent value="form" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="propertyId">Property ID</Label>
                  <Input
                    id="propertyId"
                    placeholder="123456789"
                    value={googleAnalyticsForm.propertyId}
                    onChange={(e) => setGoogleAnalyticsForm(prev => ({ ...prev, propertyId: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Google Analytics 4 Property ID (9-digit number)
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="serviceAccountKey">Service Account Key (JSON)</Label>
                  <textarea
                    id="serviceAccountKey"
                    className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    placeholder='{"type": "service_account", "project_id": "your-project", ...}'
                    value={googleAnalyticsForm.serviceAccountKey}
                    onChange={(e) => setGoogleAnalyticsForm(prev => ({ ...prev, serviceAccountKey: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste the entire JSON key file content from Google Cloud Console
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-green-800 text-xs">
                      <strong>What we sync:</strong> Sessions, pageviews, user behavior, and traffic sources.
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-blue-800 text-xs">
                      <strong>Security:</strong> Service account keys are encrypted. We only read analytics data.
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded p-3">
                    <p className="text-amber-800 text-xs">
                      <strong>Requirements:</strong> Google Analytics 4 property with Data API access.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="setup" className="space-y-4 max-h-[50vh] overflow-y-auto">
              <div className="space-y-4 text-sm">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">1. Enable Google Analytics Data API</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Go to <strong>Google Cloud Console</strong> (console.cloud.google.com)</li>
                    <li>Select or create a project</li>
                    <li>Navigate to <strong>APIs & Services</strong> → <strong>Library</strong></li>
                    <li>Search for "Google Analytics Data API" and enable it</li>
                  </ol>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">2. Create Service Account</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Go to <strong>IAM & Admin</strong> → <strong>Service Accounts</strong></li>
                    <li>Click <strong>"Create Service Account"</strong></li>
                    <li>Enter name: "BizInsights Analytics"</li>
                    <li>Skip role assignment and click <strong>"Done"</strong></li>
                  </ol>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">3. Generate JSON Key</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Click on the created service account</li>
                    <li>Go to <strong>"Keys"</strong> tab</li>
                    <li>Click <strong>"Add Key"</strong> → <strong>"Create new key"</strong></li>
                    <li>Select <strong>"JSON"</strong> and click <strong>"Create"</strong></li>
                    <li>Save the downloaded JSON file</li>
                  </ol>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">4. Grant Analytics Access</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Open Google Analytics 4 Admin panel</li>
                    <li>Go to <strong>Property</strong> → <strong>Property Access Management</strong></li>
                    <li>Click <strong>"+"</strong> to add users</li>
                    <li>Enter the service account email from the JSON file</li>
                    <li>Grant <strong>"Viewer"</strong> role and save</li>
                  </ol>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">5. Get Property ID</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>In Google Analytics 4, go to <strong>Admin</strong></li>
                    <li>Under <strong>Property</strong>, click <strong>Property Details</strong></li>
                    <li>Copy the <strong>Property ID</strong> (9-digit number)</li>
                    <li>Paste it in the Connection Form tab</li>
                  </ol>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setShowGoogleAnalyticsModal(false)}
              disabled={loading === 'google-analytics'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGoogleAnalyticsConnect}
              disabled={loading === 'google-analytics'}
            >
              {loading === 'google-analytics' && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Connect Analytics
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Facebook Ads Connection Modal */}
      <Dialog open={showFacebookAdsModal} onOpenChange={setShowFacebookAdsModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Connect Facebook Ads</DialogTitle>
            <DialogDescription>
              Enter your Facebook Ads account details to connect and sync your campaign data.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="form" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form">Connection Form</TabsTrigger>
              <TabsTrigger value="setup">Setup Guide</TabsTrigger>
            </TabsList>
            
            <TabsContent value="form" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="accessToken">Access Token</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    placeholder="EAAGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={facebookAdsForm.accessToken}
                    onChange={(e) => setFacebookAdsForm(prev => ({ ...prev, accessToken: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Facebook Business access token (starts with EAA)
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adAccountId">Ad Account ID</Label>
                  <Input
                    id="adAccountId"
                    placeholder="123456789012345 or act_123456789012345"
                    value={facebookAdsForm.adAccountId}
                    onChange={(e) => setFacebookAdsForm(prev => ({ ...prev, adAccountId: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your ad account ID (with or without 'act_' prefix)
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-green-800 text-xs">
                      <strong>What we sync:</strong> Campaign performance, ROAS, audience insights, and ad spend.
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-blue-800 text-xs">
                      <strong>Security:</strong> Access tokens are encrypted. We only read advertising data.
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded p-3">
                    <p className="text-amber-800 text-xs">
                      <strong>Requirements:</strong> Facebook Business account with ads_read permission.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="setup" className="space-y-4 max-h-[50vh] overflow-y-auto">
              <div className="space-y-4 text-sm">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">1. Create Facebook App</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Go to <strong>Facebook Developers</strong> (developers.facebook.com)</li>
                    <li>Click <strong>"Create App"</strong> → <strong>"Business"</strong></li>
                    <li>Enter app name: "BizInsights Analytics"</li>
                    <li>Add <strong>Marketing API</strong> product to your app</li>
                  </ol>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">2. Generate Access Token</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Go to <strong>Tools</strong> → <strong>Graph API Explorer</strong></li>
                    <li>Select your app from the dropdown</li>
                    <li>Click <strong>"Generate Access Token"</strong></li>
                    <li>Grant required permissions:
                      <ul className="list-disc ml-4 mt-1">
                        <li><code>ads_read</code> - Read advertising data</li>
                        <li><code>ads_management</code> - Access ad accounts</li>
                        <li><code>business_management</code> - Access business info</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">3. Get Ad Account ID</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Go to <strong>Facebook Ads Manager</strong></li>
                    <li>Click on <strong>Account Settings</strong> in the dropdown</li>
                    <li>Copy the <strong>Ad Account ID</strong> (15-digit number)</li>
                    <li>Paste it in the Connection Form tab</li>
                  </ol>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">4. Extend Token (Optional)</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>For long-term access, extend your token</li>
                    <li>Use Facebook's <strong>Access Token Tool</strong></li>
                    <li>Click <strong>"Extend Access Token"</strong></li>
                    <li>Copy the extended token for production use</li>
                  </ol>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setShowFacebookAdsModal(false)}
              disabled={loading === 'facebook-ads'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFacebookAdsConnect}
              disabled={loading === 'facebook-ads'}
            >
              {loading === 'facebook-ads' && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Connect Ads
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shopify OAuth Dialog - Single Click Connection */}
      {organization?.id && (
        <ShopifyOAuthDialog
          isOpen={showShopifyOAuthDialog}
          onClose={() => setShowShopifyOAuthDialog(false)}
          organizationId={organization.id}
        />
      )}
    </DashboardLayout>
  )
}