'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Check, Crown, Settings as SettingsIcon, Bell, Shield, Globe, Database, Zap, Users } from 'lucide-react'
import { useCurrentOrganization } from '@/hooks/useOrganization'
import { useOrganizationSettings } from '@/hooks/useSettings'
import { useCurrency } from '@/contexts/CurrencyContext'
import { SUPPORTED_CURRENCIES } from '@/lib/currency'

const plans = [
  {
    id: 'FREE',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      '1 integration',
      'Basic dashboard',
      'Monthly reports',
      'Email support'
    ],
    current: true
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: '$29',
    period: 'per month',
    description: 'For growing businesses',
    features: [
      '3 integrations',
      'AI insights',
      'Weekly reports',
      'Priority support',
      'Custom dashboards'
    ],
    popular: true
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    price: '$79',
    period: 'per month',
    description: 'For established companies',
    features: [
      'Unlimited integrations',
      'Advanced AI insights',
      'Daily reports',
      'Team collaboration',
      'API access',
      'Priority support'
    ]
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise', 
    price: '$199',
    period: 'per month',
    description: 'For large organizations',
    features: [
      'Everything in Business',
      'Custom integrations',
      'White-label',
      'Dedicated support',
      'SLA guarantee',
      'Custom contracts'
    ]
  }
]

export default function Settings() {
  const [loading, setLoading] = useState<string | null>(null)
  const [saveLoading, setSaveLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [pendingChanges, setPendingChanges] = useState<any>({})
  
  const { organization } = useCurrentOrganization()
  const { setCurrency: setGlobalCurrency } = useCurrency()
  const { 
    settings, 
    loading: settingsLoading, 
    error: settingsError, 
    updateSettings 
  } = useOrganizationSettings(organization?.id || '')

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleSaveSettings = async (section: string) => {
    setSaveLoading(section)
    try {
      const sectionChanges = pendingChanges[section] || {}
      const result = await updateSettings(sectionChanges)
      if (result.success) {
        showMessage('success', result.message || 'Settings saved successfully')
        // Clear pending changes for this section
        setPendingChanges(prev => ({ ...prev, [section]: {} }))
        
        // If currency was updated, update the global currency context
        if (sectionChanges.currency) {
          setGlobalCurrency(sectionChanges.currency)
        }
      } else {
        showMessage('error', result.error || 'Failed to save settings')
      }
    } catch (error) {
      showMessage('error', 'Failed to save settings')
    } finally {
      setSaveLoading(null)
    }
  }

  const updateSetting = (key: string, value: any, section: string = 'general') => {
    setPendingChanges(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
  }

  const getCurrentValue = (key: string, section: string = 'general') => {
    return pendingChanges[section]?.[key] ?? settings[key]
  }

  const handleUpgrade = async (planId: string) => {
    setLoading(planId)
    
    try {
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: 'temp-org-id', // This should come from context/state
          planType: planId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        window.location.href = data.data.checkoutUrl
      } else {
        alert('Failed to create checkout session: ' + data.error)
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      alert('Failed to upgrade plan')
    }
    
    setLoading(null)
  }

  if (settingsLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div>Loading settings...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization settings, billing, and preferences
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {settingsError && (
          <div className="p-4 rounded-md bg-red-50 text-red-800 border border-red-200">
            Error loading settings: {settingsError}
          </div>
        )}

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Advanced
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>
                  Configure basic settings for your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      value={getCurrentValue('organizationName') || ''}
                      onChange={(e) => updateSetting('organizationName', e.target.value, 'general')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={getCurrentValue('timezone') || 'UTC'} onValueChange={(value) => updateSetting('timezone', value, 'general')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                        <SelectItem value="Asia/Kolkata">India</SelectItem>
                        <SelectItem value="Australia/Sydney">Sydney</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Default Currency</Label>
                    <Select value={getCurrentValue('currency')} onValueChange={(value) => updateSetting('currency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SUPPORTED_CURRENCIES).slice(0, 15).map(([code, info]) => (
                          <SelectItem key={code} value={code}>
                            {info.symbol} {code} - {info.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={getCurrentValue('language')} onValueChange={(value) => updateSetting('language', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={() => handleSaveSettings('general')}
                  disabled={saveLoading === 'general' || !pendingChanges.general || Object.keys(pendingChanges.general).length === 0}
                >
                  {saveLoading === 'general' ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Control how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Reports</Label>
                      <p className="text-sm text-muted-foreground">Receive reports via email</p>
                    </div>
                    <Switch
                      checked={getCurrentValue('emailReports') ?? false}
                      onCheckedChange={(checked) => updateSetting('emailReports', checked, 'notifications')}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Daily Digest</Label>
                      <p className="text-sm text-muted-foreground">Daily summary of your analytics</p>
                    </div>
                    <Switch
                      checked={getCurrentValue('dailyDigest') ?? false}
                      onCheckedChange={(checked) => updateSetting('dailyDigest', checked, 'notifications')}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Alerts</Label>
                      <p className="text-sm text-muted-foreground">Important alerts and notifications</p>
                    </div>
                    <Switch
                      checked={getCurrentValue('alertsEnabled') ?? false}
                      onCheckedChange={(checked) => updateSetting('alertsEnabled', checked, 'notifications')}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Weekly Reports</Label>
                      <p className="text-sm text-muted-foreground">Automated weekly business reports</p>
                    </div>
                    <Switch
                      checked={getCurrentValue('weeklyReports') ?? false}
                      onCheckedChange={(checked) => updateSetting('weeklyReports', checked, 'notifications')}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Monthly Reports</Label>
                      <p className="text-sm text-muted-foreground">Comprehensive monthly analysis</p>
                    </div>
                    <Switch
                      checked={getCurrentValue('monthlyReports') ?? false}
                      onCheckedChange={(checked) => updateSetting('monthlyReports', checked, 'notifications')}
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => handleSaveSettings('notifications')}
                  disabled={saveLoading === 'notifications' || !pendingChanges.notifications || Object.keys(pendingChanges.notifications).length === 0}
                >
                  {saveLoading === 'notifications' ? 'Saving...' : 'Save Preferences'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Settings */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Configuration</CardTitle>
                <CardDescription>
                  Configure data collection and analysis settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataRetention">Data Retention (days)</Label>
                    <Select value={getCurrentValue('dataRetention')} onValueChange={(value) => updateSetting('dataRetention', value, 'analytics')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">6 months</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                        <SelectItem value="730">2 years</SelectItem>
                        <SelectItem value="-1">Forever</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="syncFrequency">Sync Frequency (hours)</Label>
                    <Select value={getCurrentValue('syncFrequency')} onValueChange={(value) => updateSetting('syncFrequency', value, 'analytics')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Every hour</SelectItem>
                        <SelectItem value="4">Every 4 hours</SelectItem>
                        <SelectItem value="12">Every 12 hours</SelectItem>
                        <SelectItem value="24">Daily</SelectItem>
                        <SelectItem value="168">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Sync</Label>
                    <p className="text-sm text-muted-foreground">Automatically sync data from integrations</p>
                  </div>
                  <Switch
                    checked={getCurrentValue('autoSync') ?? false}
                    onCheckedChange={(checked) => updateSetting('autoSync', checked, 'analytics')}
                  />
                </div>

                <Button 
                  onClick={() => handleSaveSettings('analytics')}
                  disabled={saveLoading === 'analytics' || !pendingChanges.analytics || Object.keys(pendingChanges.analytics).length === 0}
                >
                  {saveLoading === 'analytics' ? 'Saving...' : 'Save Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage security and access controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Switch
                    checked={getCurrentValue('twoFactorAuth') ?? false}
                    onCheckedChange={(checked) => updateSetting('twoFactorAuth', checked, 'security')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                  <Select value={getCurrentValue('sessionTimeout')} onValueChange={(value) => updateSetting('sessionTimeout', value, 'security')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="4">4 hours</SelectItem>
                      <SelectItem value="8">8 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="168">1 week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ipWhitelist">IP Whitelist</Label>
                  <Input
                    id="ipWhitelist"
                    placeholder="192.168.1.1, 10.0.0.1 (comma separated)"
                    value={getCurrentValue('ipWhitelist') || ''}
                    onChange={(e) => updateSetting('ipWhitelist', e.target.value, 'security')}
                  />
                  <p className="text-sm text-muted-foreground">Restrict access to specific IP addresses</p>
                </div>

                <Button 
                  onClick={() => handleSaveSettings('security')}
                  disabled={saveLoading === 'security' || !pendingChanges.security || Object.keys(pendingChanges.security).length === 0}
                >
                  {saveLoading === 'security' ? 'Saving...' : 'Update Security'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Features</CardTitle>
                <CardDescription>
                  Configure advanced functionality and integrations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>API Access</Label>
                    <p className="text-sm text-muted-foreground">Enable REST API access</p>
                  </div>
                  <Switch
                    checked={getCurrentValue('apiAccess') ?? false}
                    onCheckedChange={(checked) => updateSetting('apiAccess', checked, 'advanced')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Webhooks</Label>
                    <p className="text-sm text-muted-foreground">Enable webhook notifications</p>
                  </div>
                  <Switch
                    checked={getCurrentValue('webhooksEnabled') ?? false}
                    onCheckedChange={(checked) => updateSetting('webhooksEnabled', checked, 'advanced')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customDomain">Custom Domain</Label>
                  <Input
                    id="customDomain"
                    placeholder="analytics.yourdomain.com"
                    value={getCurrentValue('customDomain') || ''}
                    onChange={(e) => updateSetting('customDomain', e.target.value, 'advanced')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>White Label</Label>
                    <p className="text-sm text-muted-foreground">Remove BizInsights branding</p>
                  </div>
                  <Switch
                    checked={getCurrentValue('whiteLabel') ?? false}
                    onCheckedChange={(checked) => updateSetting('whiteLabel', checked, 'advanced')}
                  />
                </div>

                <Separator />

                <div>
                  <h4 className="text-lg font-medium mb-4">Data Export & Backup</h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto Backup</Label>
                        <p className="text-sm text-muted-foreground">Automatically backup your data</p>
                      </div>
                      <Switch
                        checked={getCurrentValue('autoBackup') ?? false}
                        onCheckedChange={(checked) => updateSetting('autoBackup', checked, 'advanced')}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="backupFrequency">Backup Frequency</Label>
                        <Select value={getCurrentValue('backupFrequency')} onValueChange={(value) => updateSetting('backupFrequency', value, 'advanced')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="exportFormat">Export Format</Label>
                        <Select value={getCurrentValue('exportFormat')} onValueChange={(value) => updateSetting('exportFormat', value, 'advanced')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="json">JSON</SelectItem>
                            <SelectItem value="csv">CSV</SelectItem>
                            <SelectItem value="xlsx">Excel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => handleSaveSettings('advanced')}
                  disabled={saveLoading === 'advanced' || !pendingChanges.advanced || Object.keys(pendingChanges.advanced).length === 0}
                >
                  {saveLoading === 'advanced' ? 'Saving...' : 'Save Advanced Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Settings */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>
                  You are currently on the Free plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Free Plan</h3>
                    <p className="text-sm text-muted-foreground">
                      1 integration • Basic dashboard • Monthly reports
                    </p>
                  </div>
                  <Badge variant="secondary">Current</Badge>
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-2xl font-bold mb-4">Upgrade Your Plan</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {plans.map((plan) => (
                  <Card key={plan.id} className={`relative ${plan.popular ? 'border-blue-500 shadow-lg' : ''}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-blue-500 text-white">
                          <Crown className="h-3 w-3 mr-1" />
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="text-center">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="text-3xl font-bold">
                        {plan.price}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{plan.period}
                        </span>
                      </div>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full"
                        variant={plan.current ? "secondary" : plan.popular ? "default" : "outline"}
                        disabled={plan.current || loading === plan.id}
                        onClick={() => handleUpgrade(plan.id)}
                      >
                        {plan.current ? 'Current Plan' : 
                         loading === plan.id ? 'Processing...' : 
                         plan.id === 'FREE' ? 'Downgrade' : 'Upgrade'
                        }
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Billing Information</CardTitle>
                <CardDescription>
                  Manage your payment method and billing details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    No active subscription
                  </div>
                  <Button variant="outline" disabled>
                    Manage Billing
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}