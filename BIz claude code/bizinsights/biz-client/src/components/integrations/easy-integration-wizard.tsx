'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2, AlertCircle, RefreshCw, ExternalLink, Copy, Eye, EyeOff, HelpCircle, ArrowRight, Zap } from 'lucide-react'
import { showToast } from '@/components/ui/toast-helper'

interface EasyIntegrationWizardProps {
  integration: {
    id: string
    name: string
    description: string
    icon: React.ComponentType<any>
    color: string
    bgColor: string
    features: string[]
    difficulty: 'easy' | 'medium' | 'advanced'
    estimatedTime: string
  }
  onConnect: (data: any) => Promise<void>
  onClose: () => void
}

export function EasyIntegrationWizard({ integration, onConnect, onClose }: EasyIntegrationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [testConnection, setTestConnection] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')

  const Icon = integration.icon

  // Integration-specific configurations
  const getIntegrationConfig = () => {
    switch (integration.id) {
      case 'shopify':
        return {
          totalSteps: 3,
          fields: [
            {
              key: 'shopDomain',
              label: 'Shop Name',
              placeholder: 'mystore',
              type: 'text',
              help: 'Just your shop name, not the full URL',
              validation: (value: string) => {
                if (!value) return 'Shop name is required'
                if (value.includes('.')) return 'Enter only the shop name (without .myshopify.com)'
                if (!/^[a-zA-Z0-9-]+$/.test(value)) return 'Shop name can only contain letters, numbers, and hyphens'
                return null
              }
            },
            {
              key: 'accessToken',
              label: 'Private App Access Token',
              placeholder: 'shpat_xxxxxxxxxxxxxxxx',
              type: 'password',
              help: 'From your Shopify Admin → Apps → Private apps',
              validation: (value: string) => {
                if (!value) return 'Access token is required'
                if (!value.startsWith('shpat_')) return 'Token should start with "shpat_"'
                return null
              }
            }
          ],
          quickSetupUrl: 'https://admin.shopify.com/settings/apps/private',
          testEndpoint: '/api/integrations/shopify/test'
        }
      
      case 'stripe':
        return {
          totalSteps: 3,
          fields: [
            {
              key: 'secretKey',
              label: 'Secret Key',
              placeholder: 'sk_live_... or sk_test_...',
              type: 'password',
              help: 'From your Stripe Dashboard → Developers → API keys',
              validation: (value: string) => {
                if (!value) return 'Secret key is required'
                if (!value.startsWith('sk_')) return 'Secret key should start with "sk_"'
                return null
              }
            },
            {
              key: 'publishableKey',
              label: 'Publishable Key',
              placeholder: 'pk_live_... or pk_test_...',
              type: 'text',
              help: 'Your publishable key (safe to share)',
              validation: (value: string) => {
                if (!value) return 'Publishable key is required'
                if (!value.startsWith('pk_')) return 'Publishable key should start with "pk_"'
                return null
              }
            }
          ],
          quickSetupUrl: 'https://dashboard.stripe.com/apikeys',
          testEndpoint: '/api/integrations/stripe/test'
        }

      case 'woocommerce':
        return {
          totalSteps: 3,
          fields: [
            {
              key: 'storeUrl',
              label: 'Store URL',
              placeholder: 'https://yourstore.com',
              type: 'url',
              help: 'Your WooCommerce store URL (including https://)',
              validation: (value: string) => {
                if (!value) return 'Store URL is required'
                if (!value.startsWith('http')) return 'URL must start with https:// or http://'
                return null
              }
            },
            {
              key: 'consumerKey',
              label: 'Consumer Key',
              placeholder: 'ck_xxxxxxxxxxxxxxxx',
              type: 'text',
              help: 'From WooCommerce → Settings → Advanced → REST API',
              validation: (value: string) => {
                if (!value) return 'Consumer key is required'
                if (!value.startsWith('ck_')) return 'Consumer key should start with "ck_"'
                return null
              }
            },
            {
              key: 'consumerSecret',
              label: 'Consumer Secret',
              placeholder: 'cs_xxxxxxxxxxxxxxxx',
              type: 'password',
              help: 'From the same REST API settings page',
              validation: (value: string) => {
                if (!value) return 'Consumer secret is required'
                if (!value.startsWith('cs_')) return 'Consumer secret should start with "cs_"'
                return null
              }
            }
          ],
          quickSetupUrl: null,
          testEndpoint: '/api/integrations/woocommerce/test'
        }

      default:
        return {
          totalSteps: 3,
          fields: [],
          quickSetupUrl: null,
          testEndpoint: null
        }
    }
  }

  const config = getIntegrationConfig()
  const progress = (currentStep / config.totalSteps) * 100

  const validateField = (key: string, value: string) => {
    const field = config.fields.find(f => f.key === key)
    return field?.validation ? field.validation(value) : null
  }

  const validateAllFields = () => {
    const errors: Record<string, string> = {}
    config.fields.forEach(field => {
      const error = validateField(field.key, formData[field.key] || '')
      if (error) errors[field.key] = error
    })
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleFieldChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    
    // Clear validation error when user starts typing
    if (validationErrors[key]) {
      setValidationErrors(prev => ({ ...prev, [key]: '' }))
    }
    
    // Real-time validation
    const error = validateField(key, value)
    if (error) {
      setValidationErrors(prev => ({ ...prev, [key]: error }))
    }
  }

  const testConnectionAPI = async () => {
    if (!config.testEndpoint) return true
    
    setTestConnection('testing')
    
    try {
      const response = await fetch(config.testEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        setTestConnection('success')
        return true
      } else {
        setTestConnection('error')
        showToast.error(`Connection failed: ${result.error}`)
        return false
      }
    } catch (error) {
      setTestConnection('error')
      showToast.error('Failed to test connection')
      return false
    }
  }

  const handleNext = async () => {
    if (currentStep === 1) {
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!validateAllFields()) {
        showToast.error('Please fix the errors before continuing')
        return
      }
      
      // Test connection
      const connectionSuccess = await testConnectionAPI()
      if (connectionSuccess) {
        setCurrentStep(3)
      }
    } else if (currentStep === 3) {
      setLoading(true)
      try {
        await onConnect(formData)
        showToast.success(`${integration.name} connected successfully!`)
        onClose()
      } catch (error) {
        showToast.error('Connection failed. Please try again.')
      } finally {
        setLoading(false)
      }
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast.success('Copied to clipboard!')
  }

  const togglePasswordVisibility = (key: string) => {
    setShowPassword(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${integration.bgColor} flex items-center justify-center`}>
                <Icon className={`w-8 h-8 ${integration.color}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Connect {integration.name}</h3>
              <p className="text-muted-foreground mb-4">{integration.description}</p>
              
              <div className="flex items-center justify-center gap-4 mb-6">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {integration.difficulty === 'easy' ? 'Easy Setup' : integration.difficulty === 'medium' ? 'Medium Setup' : 'Advanced Setup'}
                </Badge>
                <Badge variant="outline">
                  {integration.estimatedTime} setup
                </Badge>
              </div>
            </div>

            <div className="grid gap-3">
              <h4 className="font-medium text-sm">What you'll get:</h4>
              {integration.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            {config.quickSetupUrl && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-1">Need help getting your credentials?</p>
                    <p className="text-sm text-blue-700 mb-3">
                      We'll guide you step-by-step, or you can open your {integration.name} settings now.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(config.quickSetupUrl, '_blank')}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Open {integration.name} Settings
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">Enter Your Credentials</h3>
              <p className="text-muted-foreground">
                We'll test the connection to make sure everything works perfectly.
              </p>
            </div>

            <div className="space-y-4">
              {config.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key} className="flex items-center gap-2">
                    {field.label}
                    {field.help && (
                      <div className="relative group">
                        <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {field.help}
                        </div>
                      </div>
                    )}
                  </Label>
                  
                  <div className="relative">
                    <Input
                      id={field.key}
                      type={field.type === 'password' && !showPassword[field.key] ? 'password' : 'text'}
                      placeholder={field.placeholder}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className={validationErrors[field.key] ? 'border-red-500' : ''}
                    />
                    
                    {field.type === 'password' && (
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(field.key)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  
                  {validationErrors[field.key] && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors[field.key]}
                    </p>
                  )}
                  
                  {field.help && !validationErrors[field.key] && (
                    <p className="text-xs text-muted-foreground">{field.help}</p>
                  )}
                </div>
              ))}
            </div>

            {testConnection === 'testing' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Testing connection...</p>
                    <p className="text-sm text-blue-700">Verifying your credentials with {integration.name}</p>
                  </div>
                </div>
              </div>
            )}

            {testConnection === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Connection successful!</p>
                    <p className="text-sm text-green-700">Your {integration.name} account is ready to connect</p>
                  </div>
                </div>
              </div>
            )}

            {testConnection === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Connection failed</p>
                    <p className="text-sm text-red-700">Please check your credentials and try again</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      case 3:
        return (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2">Ready to Connect!</h3>
              <p className="text-muted-foreground mb-6">
                Everything looks good. Click the button below to complete the connection and start syncing your data.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-3">Connection Summary:</h4>
              <div className="space-y-2 text-sm">
                {config.fields.map((field) => (
                  <div key={field.key} className="flex justify-between items-center">
                    <span className="text-muted-foreground">{field.label}:</span>
                    <span className="font-mono text-xs">
                      {field.type === 'password' 
                        ? '••••••••••••••••' 
                        : formData[field.key]?.substring(0, 20) + (formData[field.key]?.length > 20 ? '...' : '')
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              🔒 Your credentials are encrypted and stored securely. We only read data - never modify your account.
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Easy Setup</DialogTitle>
              <DialogDescription>
                Step {currentStep} of {config.totalSteps}
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

        <div className="min-h-[400px]">
          {renderStep()}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onClose : () => setCurrentStep(currentStep - 1)}
            disabled={loading}
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={loading || (currentStep === 2 && testConnection === 'testing')}
          >
            {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {currentStep === config.totalSteps ? 'Connect Now' : 'Continue'}
            {currentStep < config.totalSteps && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}