import { useState, useEffect, useCallback } from 'react'
import { Alert } from '@/types/alerts'
import { useCurrentOrganization } from './useOrganization'

export interface UseAlertsResult {
  alerts: Alert[]
  activeAlerts: Alert[]
  criticalAlerts: Alert[]
  isLoading: boolean
  error: string | null
  refetch: () => void
  acknowledgeAlert: (alertId: string) => Promise<void>
  resolveAlert: (alertId: string) => Promise<void>
  dismissAlert: (alertId: string) => Promise<void>
}

export function useAlerts(): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { organization } = useCurrentOrganization()

  const fetchAlerts = useCallback(async () => {
    if (!organization?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/alerts?organizationId=${organization.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch alerts')
      }

      const data = await response.json()
      setAlerts(data.alerts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching alerts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [organization?.id])

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve' | 'dismiss') => {
    if (!organization?.id) return

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          alertId,
          organizationId: organization.id,
          action
        })
      })

      if (response.ok) {
        // Update local alert state
        setAlerts(prevAlerts => 
          prevAlerts.map(alert => 
            alert.id === alertId 
              ? { 
                  ...alert, 
                  status: action === 'acknowledge' ? 'ACKNOWLEDGED' : 
                          action === 'resolve' ? 'RESOLVED' : 'DISMISSED',
                  updatedAt: new Date(),
                  [`${action}dAt`]: new Date()
                }
              : alert
          )
        )
      }
    } catch (error) {
      console.error(`Error ${action}ing alert:`, error)
      throw error
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  // Auto-refresh alerts every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  const activeAlerts = alerts.filter(alert => alert.status === 'ACTIVE')
  const criticalAlerts = alerts.filter(alert => 
    alert.severity === 'CRITICAL' && alert.status === 'ACTIVE'
  )

  return {
    alerts,
    activeAlerts,
    criticalAlerts,
    isLoading,
    error,
    refetch: fetchAlerts,
    acknowledgeAlert: (alertId: string) => handleAlertAction(alertId, 'acknowledge'),
    resolveAlert: (alertId: string) => handleAlertAction(alertId, 'resolve'),
    dismissAlert: (alertId: string) => handleAlertAction(alertId, 'dismiss')
  }
}

export function useRealtimeAlerts(): UseAlertsResult {
  const alerts = useAlerts()

  // Auto-refresh every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      alerts.refetch()
    }, 30 * 1000)

    return () => clearInterval(interval)
  }, [alerts.refetch])

  return alerts
}