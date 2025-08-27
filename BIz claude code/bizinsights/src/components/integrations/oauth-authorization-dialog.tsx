'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  ExternalLink, 
  Shield, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle,
  ArrowRight,
  Lock,
  Eye,
  User,
  BarChart3,
  CreditCard
} from 'lucide-react'

interface OAuthAuthorizationDialogProps {
  integration: {
    id: string
    name: string
    description: string
    icon: React.ComponentType<any>
    color: string
    bgColor: string
    permissions: string[]
    authUrl: string
  }
  isOpen: boolean
  onClose: () => void
  onAuthorize: (authUrl: string) => void
}

export function OAuthAuthorizationDialog({ 
  integration, 
  isOpen, 
  onClose, 
  onAuthorize 
}: OAuthAuthorizationDialogProps) {
  const [step, setStep] = useState(1)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [authWindow, setAuthWindow] = useState<Window | null>(null)

  const Icon = integration.icon
  const totalSteps = 3
  const progress = (step / totalSteps) * 100

  const getPermissionIcon = (permission: string) => {
    if (permission.toLowerCase().includes('read')) return <Eye className="w-4 h-4 text-blue-600" />
    if (permission.toLowerCase().includes('user') || permission.toLowerCase().includes('profile')) return <User className="w-4 h-4 text-green-600" />
    if (permission.toLowerCase().includes('analytics') || permission.toLowerCase().includes('data')) return <BarChart3 className="w-4 h-4 text-purple-600" />
    if (permission.toLowerCase().includes('payment') || permission.toLowerCase().includes('transaction')) return <CreditCard className="w-4 h-4 text-orange-600" />
    return <Lock className="w-4 h-4 text-gray-600" />
  }

  const handleAuthorize = () => {
    setIsRedirecting(true)
    setStep(2)
    
    // Open OAuth popup
    const popup = window.open(
      integration.authUrl,
      'oauth_popup',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    )
    
    setAuthWindow(popup)
    
    // Monitor popup for completion
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed)
        setStep(3)
        setIsRedirecting(false)
        
        // Simulate success (in real app, you'd check for success/failure)
        setTimeout(() => {
          onAuthorize(integration.authUrl)
          onClose()
        }, 2000)
      }
    }, 1000)

    // Fallback close after 5 minutes
    setTimeout(() => {
      if (popup && !popup.closed) {
        popup.close()
        clearInterval(checkClosed)
        setIsRedirecting(false)
        setStep(1)
      }
    }, 300000)
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Integration Header */}
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${integration.bgColor} flex items-center justify-center shadow-sm`}>
                <Icon className={`w-8 h-8 ${integration.color}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Connect to {integration.name}</h3>
              <p className="text-muted-foreground mb-4">{integration.description}</p>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Secure OAuth Connection</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    You'll be redirected to {integration.name}'s secure login page. We never see your password.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-blue-600">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Industry-standard security</span>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Encrypted connection</span>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Revokable access</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-600" />
                Permissions we'll request:
              </h4>
              <div className="space-y-2">
                {integration.permissions.map((permission, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {getPermissionIcon(permission)}
                    <span className="text-sm text-gray-700">{permission}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-muted-foreground bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                💡 <strong>We only read data</strong> - BizInsights never modifies, deletes, or posts to your {integration.name} account
              </div>
            </div>

            {/* What happens next */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-medium text-sm mb-3">What happens next:</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">1</span>
                  <span>You'll login to your {integration.name} account</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">2</span>
                  <span>Authorize BizInsights to read your data</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">3</span>
                  <span>We'll start syncing your data automatically</span>
                </div>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-100 flex items-center justify-center">
              <ExternalLink className="w-8 h-8 text-blue-600" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2">Login to {integration.name}</h3>
              <p className="text-muted-foreground mb-6">
                Complete the authorization in the popup window, then return here.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <RefreshCw className="w-8 h-8 text-blue-600 mx-auto mb-3 animate-spin" />
              <p className="text-sm text-blue-700 mb-2">Waiting for authorization...</p>
              <p className="text-xs text-blue-600">
                If the popup was blocked, click the button below to try again
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                if (authWindow && !authWindow.closed) {
                  authWindow.focus()
                } else {
                  handleAuthorize()
                }
              }}
              className="w-full"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Authorization Window
            </Button>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2">Successfully Connected!</h3>
              <p className="text-muted-foreground mb-6">
                Your {integration.name} account has been connected to BizInsights.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center justify-center mb-3">
                <RefreshCw className="w-6 h-6 text-green-600 animate-spin" />
              </div>
              <p className="text-sm text-green-700 mb-2">Setting up data sync...</p>
              <p className="text-xs text-green-600">
                We're now syncing your {integration.name} data. This may take a few minutes.
              </p>
            </div>

            <div className="text-xs text-muted-foreground">
              You can close this window and check your dashboard for the latest data.
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>OAuth Authorization</DialogTitle>
              <DialogDescription>
                Step {step} of {totalSteps}
              </DialogDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {Math.round(progress)}% Complete
            </Badge>
          </div>
        </DialogHeader>

        <div className="mb-4">
          <Progress value={progress} className="h-2" />
        </div>

        <div className="min-h-[400px] py-4">
          {renderStep()}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isRedirecting}
          >
            Cancel
          </Button>
          
          {step === 1 && (
            <Button
              onClick={handleAuthorize}
              disabled={isRedirecting}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Continue to {integration.name}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}