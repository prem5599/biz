import { useState, useEffect } from 'react'
import { userApi, organizationsApi } from '../lib/api'

export interface UserSettings {
  // Notification preferences
  emailReports?: boolean
  dailyDigest?: boolean
  alertsEnabled?: boolean
  weeklyReports?: boolean
  monthlyReports?: boolean

  // Personal preferences
  timezone?: string
  currency?: string
  language?: string
  theme?: 'light' | 'dark' | 'system'

  // Privacy settings
  shareUsageData?: boolean
  marketingEmails?: boolean

  // Dashboard preferences
  defaultDashboard?: string
  chartType?: 'line' | 'bar' | 'area'
  metricsToShow?: string[]
}

export interface OrganizationSettings {
  // General Settings
  organizationName?: string
  timezone?: string
  currency?: string
  language?: string

  // Notifications
  emailReports?: boolean
  dailyDigest?: boolean
  alertsEnabled?: boolean
  weeklyReports?: boolean
  monthlyReports?: boolean

  // Analytics
  dataRetention?: string
  autoSync?: boolean
  syncFrequency?: string

  // Security
  twoFactorAuth?: boolean
  sessionTimeout?: string
  ipWhitelist?: string

  // Advanced
  apiAccess?: boolean
  webhooksEnabled?: boolean
  customDomain?: string
  whiteLabel?: boolean

  // Data Export
  autoBackup?: boolean
  backupFrequency?: string
  exportFormat?: string

  // Billing
  billingEmail?: string
  subscriptionTier?: 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE'
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await userApi.getSettings()
      const data = response.data

      if (data.success) {
        setSettings(data.data)
      } else {
        setError(data.error || 'Failed to fetch settings')
      }
    } catch (err) {
      setError('Failed to fetch settings')
      console.error('Error fetching user settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      const response = await userApi.updateSettings(newSettings)
      const data = response.data

      if (data.success) {
        setSettings(prevSettings => ({ ...prevSettings, ...newSettings }))
        return { success: true, message: data.message }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      console.error('Error updating user settings:', err)
      return { success: false, error: 'Failed to update settings' }
    }
  }

  const resetSetting = async (key?: string) => {
    try {
      // Use the api instance for delete with optional key param
      const { default: api } = await import('../lib/api')
      const url = key ? `/user/settings?key=${key}` : '/user/settings'
      const response = await api.delete(url)
      const data = response.data

      if (data.success) {
        await fetchSettings()
        return { success: true, message: data.message }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      console.error('Error resetting user settings:', err)
      return { success: false, error: 'Failed to reset settings' }
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  return {
    settings,
    loading,
    error,
    updateSettings,
    resetSetting,
    refetchSettings: fetchSettings
  }
}

export function useOrganizationSettings(organizationId: string) {
  const [settings, setSettings] = useState<OrganizationSettings>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = async () => {
    if (!organizationId) return

    try {
      setLoading(true)
      setError(null)

      const response = await organizationsApi.getSettings(organizationId)
      const data = response.data

      if (data.success) {
        setSettings(data.data)
      } else {
        setError(data.error || 'Failed to fetch settings')
      }
    } catch (err) {
      setError('Failed to fetch settings')
      console.error('Error fetching organization settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (newSettings: Partial<OrganizationSettings>) => {
    try {
      const response = await organizationsApi.updateSettings(organizationId, newSettings)
      const data = response.data

      if (data.success) {
        setSettings(prevSettings => ({ ...prevSettings, ...newSettings }))
        return { success: true, message: data.message }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      console.error('Error updating organization settings:', err)
      return { success: false, error: 'Failed to update settings' }
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [organizationId])

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetchSettings: fetchSettings
  }
}
