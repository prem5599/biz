'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { showToast } from '@/components/ui/toast-helper'
import { ShoppingBag, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useCurrentOrganization } from '@/hooks/useOrganization'

export default function ShopifyOAuth() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { organization } = useCurrentOrganization()

  const [shopName, setShopName] = useState('')
  const [loading, setLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [shopifyData, setShopifyData] = useState<any>(null)

  // Check if already connected
  useEffect(() => {
    checkConnection()
  }, [organization?.id])

  // Handle OAuth callback
  useEffect(() => {
    const oauthResult = searchParams.get('oauth_result')
    const platform = searchParams.get('platform')
    const message = searchParams.get('message')

    if (oauthResult === 'success' && platform === 'shopify') {
      showToast.success(message || 'Shopify connected successfully!')
      setIsConnected(true)
      checkConnection()
      fetchShopifyData()
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/integrations/oauth')
    } else if (oauthResult === 'error') {
      showToast.error(message || 'Failed to connect Shopify')
      setLoading(false)
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/integrations/oauth')
    }
  }, [searchParams])

  const checkConnection = async () => {
    if (!organization?.id) return

    try {
      const response = await fetch(`/api/organizations/${organization.id}/dashboard`)
      const data = await response.json()

      if (data.success && data.data.integrations) {
        const shopifyIntegration = data.data.integrations.find(
          (int: any) => int.platform === 'SHOPIFY' && int.status === 'CONNECTED'
        )
        setIsConnected(!!shopifyIntegration)

        if (shopifyIntegration) {
          setShopifyData(shopifyIntegration.metadata?.shopData || null)
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error)
    }
  }

  const fetchShopifyData = async () => {
    if (!organization?.id) return

    try {
      const response = await fetch(`/api/organizations/${organization.id}/dashboard`)
      const data = await response.json()

      if (data.success && data.data.integrations) {
        const shopifyIntegration = data.data.integrations.find(
          (int: any) => int.platform === 'SHOPIFY'
        )

        if (shopifyIntegration?.metadata?.shopData) {
          setShopifyData(shopifyIntegration.metadata.shopData)
        }
      }
    } catch (error) {
      console.error('Error fetching Shopify data:', error)
    }
  }

  const handleLogin = async () => {
    if (!shopName.trim()) {
      showToast.error('Please enter your shop name')
      return
    }

    if (!organization?.id) {
      showToast.error('No organization found. Please create an account first.')
      return
    }

    // Clean shop name
    const cleanShopName = shopName.trim().replace('.myshopify.com', '').toLowerCase()

    // Validate format
    const shopPattern = /^[a-z0-9-]+$/
    if (!shopPattern.test(cleanShopName)) {
      showToast.error('Shop name can only contain lowercase letters, numbers, and hyphens')
      return
    }

    setLoading(true)

    // Redirect directly to OAuth authorize endpoint
    const authUrl = `/api/integrations/shopify/oauth/authorize?shop=${cleanShopName}&organization_id=${organization.id}`
    window.location.href = authUrl
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Shopify store?')) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/integrations/shopify/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization?.id })
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Shopify disconnected successfully')
        setIsConnected(false)
        setShopifyData(null)
      } else {
        showToast.error('Failed to disconnect Shopify')
      }
    } catch (error) {
      showToast.error('Failed to disconnect Shopify')
    } finally {
      setLoading(false)
    }
  }

  if (!organization?.id) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Organization Required
              </CardTitle>
              <CardDescription>
                You need to create an account and organization before connecting Shopify.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/auth/signup')} className="w-full">
                Create Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Connect Shopify</h1>
          <p className="text-muted-foreground mt-2">
            Login with your Shopify store to sync your data
          </p>
        </div>

        {!isConnected ? (
          <>
            {/* Login Form */}
            <Card>
              <CardHeader>
                <CardTitle>Enter Your Store Name</CardTitle>
                <CardDescription>
                  Enter your Shopify store name to get started
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shopName">Shop Name</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="shopName"
                      placeholder="mystore"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                      disabled={loading}
                      className="flex-1"
                    />
                    <span className="text-muted-foreground whitespace-nowrap text-sm">
                      .myshopify.com
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Example: If your store is <strong>awesome-store.myshopify.com</strong>, enter <strong>awesome-store</strong>
                  </p>
                </div>

                <Button
                  onClick={handleLogin}
                  disabled={loading || !shopName.trim()}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Connecting to Shopify...
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-5 h-5 mr-2" />
                      Login with Shopify
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* What Happens Next */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-900">What happens next?</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm text-green-800">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">1.</span>
                    <span>You'll be redirected to Shopify</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">2.</span>
                    <span>Login to your Shopify store (if not already logged in)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">3.</span>
                    <span>Review and approve the permissions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">4.</span>
                    <span>You'll be automatically redirected back here</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">5.</span>
                    <span>Your store data will be synced automatically! ✓</span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Connected State */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <CheckCircle2 className="w-5 h-5" />
                    Shopify Connected!
                  </CardTitle>
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={loading}
                    className="border-green-600 text-green-700 hover:bg-green-100"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Disconnect
                  </Button>
                </div>
                <CardDescription className="text-green-700">
                  Your Shopify store is successfully connected and syncing
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Shopify Data Display */}
            {shopifyData && (
              <Card>
                <CardHeader>
                  <CardTitle>Store Information</CardTitle>
                  <CardDescription>Data from your Shopify store</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {shopifyData.name && (
                      <div>
                        <p className="text-sm text-muted-foreground">Store Name</p>
                        <p className="font-semibold">{shopifyData.name}</p>
                      </div>
                    )}
                    {shopifyData.email && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-semibold">{shopifyData.email}</p>
                      </div>
                    )}
                    {shopifyData.domain && (
                      <div>
                        <p className="text-sm text-muted-foreground">Domain</p>
                        <p className="font-semibold">{shopifyData.domain}</p>
                      </div>
                    )}
                    {shopifyData.myshopify_domain && (
                      <div>
                        <p className="text-sm text-muted-foreground">Shopify Domain</p>
                        <p className="font-semibold">{shopifyData.myshopify_domain}</p>
                      </div>
                    )}
                    {shopifyData.currency && (
                      <div>
                        <p className="text-sm text-muted-foreground">Currency</p>
                        <p className="font-semibold">{shopifyData.currency}</p>
                      </div>
                    )}
                    {shopifyData.timezone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Timezone</p>
                        <p className="font-semibold">{shopifyData.timezone}</p>
                      </div>
                    )}
                    {shopifyData.shop_owner && (
                      <div>
                        <p className="text-sm text-muted-foreground">Owner</p>
                        <p className="font-semibold">{shopifyData.shop_owner}</p>
                      </div>
                    )}
                    {shopifyData.plan_display_name && (
                      <div>
                        <p className="text-sm text-muted-foreground">Plan</p>
                        <p className="font-semibold">{shopifyData.plan_display_name}</p>
                      </div>
                    )}
                  </div>

                  {shopifyData.created_at && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Store Created</p>
                      <p className="font-semibold">
                        {new Date(shopifyData.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
                <CardDescription>What you can do now</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="w-full"
                  variant="outline"
                >
                  View Dashboard
                </Button>
                <Button
                  onClick={() => router.push('/dashboard/analytics')}
                  className="w-full"
                  variant="outline"
                >
                  View Analytics
                </Button>
                <Button
                  onClick={fetchShopifyData}
                  className="w-full"
                  variant="outline"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Refresh Data
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
