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
    if (permission.toLowerCase().includes('read')) return <Eye className="w-3 h-3 text-blue-600" />
    if (permission.toLowerCase().includes('user') || permission.toLowerCase().includes('profile')) return <User className="w-3 h-3 text-green-600" />
    if (permission.toLowerCase().includes('analytics') || permission.toLowerCase().includes('data')) return <BarChart3 className="w-3 h-3 text-purple-600" />
    if (permission.toLowerCase().includes('payment') || permission.toLowerCase().includes('transaction')) return <CreditCard className="w-3 h-3 text-orange-600" />
    return <Lock className="w-3 h-3 text-gray-600" />
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
          <div className="space-y-4">
             {/* Simple Description */}
             <div className="flex items-start gap-4 pb-2">
                <div className={`shrink-0 w-12 h-12 rounded-xl ${integration.bgColor} flex items-center justify-center shadow-sm`}>
                  <Icon className={`w-6 h-6 ${integration.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 leading-relaxed">{integration.description}</p>
                </div>
             </div>

            {/* Compact Details Grid */}
            <div className="grid gap-3">
              {/* Security Notice - Compact */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <h4 className="font-medium text-sm text-blue-900">Secure Connection</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div className="flex items-center gap-1.5 text-xs text-blue-700">
                      <CheckCircle2 className="w-3 h-3" /> Encrypted
                   </div>
                   <div className="flex items-center gap-1.5 text-xs text-blue-700">
                      <CheckCircle2 className="w-3 h-3" /> Read-only
                   </div>
                </div>
              </div>

              {/* Permissions - Compact List */}
              <div className="bg-gray-50/50 border border-gray-100 rounded-lg p-3">
                <h4 className="font-medium text-xs uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                  <Lock className="w-3 h-3" /> Requested Access
                </h4>
                <div className="space-y-1.5">
                  {integration.permissions.map((permission, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs text-gray-700">
                      <div className="mt-0.5">{getPermissionIcon(permission)}</div>
                      <span>{permission}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Steps - Horizontal / Compact */}
            <div className="pt-2 border-t">
              <h4 className="font-medium text-xs text-gray-500 mb-3">PROCESS OVERVIEW</h4>
              <div className="flex items-center justify-between text-xs text-gray-600 px-2">
                 <div className="flex flex-col items-center gap-1 text-center max-w-[80px]">
                    <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-medium">1</div>
                    <span>Login</span>
                 </div>
                 <div className="h-px bg-gray-200 w-12 mx-2"></div>
                 <div className="flex flex-col items-center gap-1 text-center max-w-[80px]">
                    <div className="w-6 h-6 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center font-medium">2</div>
                    <span>Authorize</span>
                 </div>
                 <div className="h-px bg-gray-200 w-12 mx-2"></div>
                 <div className="flex flex-col items-center gap-1 text-center max-w-[80px]">
                    <div className="w-6 h-6 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center font-medium">3</div>
                    <span>Sync</span>
                 </div>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6 text-center py-6">
            <div className="relative">
               <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 flex items-center justify-center animate-pulse">
                 <ExternalLink className="w-8 h-8 text-blue-600" />
               </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-1">Waiting for Authorization</h3>
              <p className="text-sm text-muted-foreground px-4">
                Please complete the login process in the popup window.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (authWindow && !authWindow.closed) {
                  authWindow.focus()
                } else {
                  handleAuthorize()
                }
              }}
            >
              <ExternalLink className="mr-2 h-3 w-3" />
              Re-open Popup
            </Button>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6 text-center py-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-1">Connected!</h3>
              <p className="text-sm text-muted-foreground">
                Syncing your {integration.name} data...
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Reduced max-width and ensured max-height logic */}
      <DialogContent className="sm:max-w-[440px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        
        {/* Compact Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <DialogTitle className="text-lg">Connect {integration.name}</DialogTitle>
               <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-normal">
                  Step {step}/3
               </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
           {renderStep()}
        </div>

        {/* Fixed Footer */}
        <div className="px-6 py-4 border-t bg-gray-50/30 flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isRedirecting}
            size="sm"
            className="text-gray-500 hover:text-gray-900"
          >
            Cancel
          </Button>
          
          {step === 1 && (
            <Button
              onClick={handleAuthorize}
              disabled={isRedirecting}
              className="bg-blue-600 hover:bg-blue-700 text-sm"
              size="sm"
            >
              <ExternalLink className="mr-2 h-3 w-3" />
              Continue to Login
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}