'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { showToast } from '@/components/ui/toast-helper'
import { ShoppingBag, Loader2 } from 'lucide-react'
import { useCurrentOrganization } from '@/hooks/useOrganization'

export default function ShopifyOAuth() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { organization } = useCurrentOrganization()
  const [shopName, setShopName] = useState('')
  const [loading, setLoading] = useState(false)

  // Handle OAuth callback
  useEffect(() => {
    const oauthResult = searchParams.get('oauth_result')
    const message = searchParams.get('message')

    if (oauthResult === 'success') {
      showToast.success(message || 'Shopify connected successfully!')
      window.history.replaceState({}, '', '/dashboard/integrations/oauth')
      router.push('/dashboard')
    } else if (oauthResult === 'error') {
      showToast.error(message || 'Failed to connect Shopify')
      setLoading(false)
      window.history.replaceState({}, '', '/dashboard/integrations/oauth')
    }
  }, [searchParams, router])

  const handleLogin = () => {
    // Validate shop name
    if (!shopName.trim()) {
      showToast.error('Please enter your shop name')
      return
    }

    // Check organization
    if (!organization?.id) {
      showToast.error('Please sign up first')
      router.push('/auth/signup')
      return
    }

    const cleanShopName = shopName.trim().replace('.myshopify.com', '').toLowerCase()

    if (!/^[a-z0-9-]+$/.test(cleanShopName)) {
      showToast.error('Invalid shop name format')
      return
    }

    setLoading(true)

    // Redirect to OAuth
    try {
      window.location.href = `/api/integrations/shopify/oauth/authorize?shop=${cleanShopName}&organization_id=${organization.id}`
    } catch (error) {
      console.error('OAuth error:', error)
      showToast.error('Failed to start login')
      setLoading(false)
    }
  }

  // Show signup message if no organization
  if (!organization?.id) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center mx-auto">
              <ShoppingBag className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold">Connect Shopify</h1>
            <p className="text-gray-600">Create an account to get started</p>
            <Button
              onClick={() => router.push('/auth/signup')}
              className="bg-green-600 hover:bg-green-700"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center">
            <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Login with Shopify</h1>
            <p className="text-gray-600">Enter your store name</p>
          </div>

          {/* Single input with button */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Input
                placeholder="mystore"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                disabled={loading}
                className="text-lg h-12 flex-1"
                autoFocus
              />
              <span className="text-gray-500 text-sm whitespace-nowrap">
                .myshopify.com
              </span>
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading || !shopName.trim()}
              className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Login
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
