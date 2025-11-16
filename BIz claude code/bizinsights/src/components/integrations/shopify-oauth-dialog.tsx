'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShoppingBag, ExternalLink, AlertCircle, HelpCircle } from 'lucide-react'
import { showToast } from '@/components/ui/toast-helper'

interface ShopifyOAuthDialogProps {
  isOpen: boolean
  onClose: () => void
  organizationId: string
}

export function ShopifyOAuthDialog({ isOpen, onClose, organizationId }: ShopifyOAuthDialogProps) {
  const [shopName, setShopName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConnect = async () => {
    // Validate shop name
    if (!shopName.trim()) {
      setError('Please enter your shop name')
      return
    }

    // Clean shop name (remove .myshopify.com if present)
    const cleanShopName = shopName.trim().replace('.myshopify.com', '').toLowerCase()

    // Validate format
    const shopPattern = /^[a-z0-9-]+$/
    if (!shopPattern.test(cleanShopName)) {
      setError('Shop name can only contain lowercase letters, numbers, and hyphens')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Redirect to OAuth authorization endpoint
      const authUrl = `/api/integrations/shopify/oauth/authorize?shop=${cleanShopName}&organization_id=${organizationId}`

      console.log('[Shopify OAuth] Redirecting to:', authUrl)

      // Redirect to authorization endpoint
      window.location.href = authUrl
    } catch (err) {
      console.error('[Shopify OAuth] Error:', err)
      setError('Failed to initiate connection. Please try again.')
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <DialogTitle>Connect Shopify Store</DialogTitle>
              <DialogDescription>
                Enter your Shopify store name to get started
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Shop Name Input */}
          <div className="space-y-2">
            <Label htmlFor="shopName" className="flex items-center gap-2">
              Your Shopify Store Name
              <div className="relative group">
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  The name in your Shopify URL (e.g., "mystore" from mystore.myshopify.com)
                </div>
              </div>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="shopName"
                placeholder="mystore"
                value={shopName}
                onChange={(e) => {
                  setShopName(e.target.value)
                  setError('')
                }}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className={error ? 'border-red-500' : ''}
                autoFocus
              />
              <span className="text-muted-foreground whitespace-nowrap">.myshopify.com</span>
            </div>
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Example: If your store URL is <strong>awesome-store.myshopify.com</strong>, enter <strong>awesome-store</strong>
            </p>
          </div>

          {/* What Happens Next */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">What happens next?</h4>
            <ol className="text-sm text-blue-800 space-y-1.5 list-decimal list-inside">
              <li>You'll be redirected to Shopify</li>
              <li>Login to your Shopify store (if not already logged in)</li>
              <li>Review and approve the permissions</li>
              <li>You'll be automatically redirected back</li>
              <li>Your store will be connected! ✓</li>
            </ol>
          </div>

          {/* Permissions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">We'll request permission to:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Read products</strong> - View your product catalog</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Read orders</strong> - View your sales and orders</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Read customers</strong> - Access customer data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Read analytics</strong> - View store analytics</span>
              </li>
            </ul>
            <p className="text-xs text-gray-600 mt-3">
              🔒 We only request read permissions - we'll never modify your store or make changes.
            </p>
          </div>

          {/* Security Note */}
          <div className="text-xs text-muted-foreground text-center">
            This is a secure OAuth connection. Your password is never shared with us.
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isLoading || !shopName.trim()}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect with Shopify
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
