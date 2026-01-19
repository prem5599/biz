'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { AlertCenter } from '@/components/alerts/alert-center'
import { useCurrentOrganization } from '@/hooks/useOrganization'
import { Alert } from '@/types/alerts'
import { Loader2 } from 'lucide-react'

export default function AlertsPage() {
  const { data: session, status } = useSession()
  const { organization, isLoading: orgLoading } = useCurrentOrganization()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAlerts = async () => {
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
  }

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
                  [`${action}dAt`]: new Date()
                }
              : alert
          )
        )
      }
    } catch (error) {
      console.error(`Error ${action}ing alert:`, error)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [organization?.id])

  if (status === 'loading' || orgLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin')
  }

  if (!organization) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Organization Found</h2>
            <p className="text-gray-600">Please create an organization to continue.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Alerts</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={fetchAlerts}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alert Center</h1>
          <p className="text-gray-600">Monitor and manage important business notifications</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <AlertCenter
            alerts={alerts}
            onAcknowledge={(alertId) => handleAlertAction(alertId, 'acknowledge')}
            onResolve={(alertId) => handleAlertAction(alertId, 'resolve')}
            onDismiss={(alertId) => handleAlertAction(alertId, 'dismiss')}
            onRefresh={fetchAlerts}
          />
        )}
      </div>
    </DashboardLayout>
  )
}