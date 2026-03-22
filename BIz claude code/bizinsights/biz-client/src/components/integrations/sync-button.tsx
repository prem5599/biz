'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { useCurrentOrganization } from '@/hooks/useOrganization'

interface SyncButtonProps {
  integration?: string
  onSyncComplete?: () => void
}

export function SyncButton({ integration = 'shopify', onSyncComplete }: SyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const { organization } = useCurrentOrganization()

  const handleSync = async () => {
    if (!organization?.id) return

    try {
      setIsLoading(true)
      setStatus('idle')

      const response = await fetch(`/api/integrations/${integration}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: organization.id
        })
      })

      if (!response.ok) {
        throw new Error('Sync failed')
      }

      const result = await response.json()
      setStatus('success')
      
      if (onSyncComplete) {
        onSyncComplete()
      }

      // Reset status after 3 seconds
      setTimeout(() => setStatus('idle'), 3000)

    } catch (error) {
      console.error('Sync error:', error)
      setStatus('error')
      
      // Reset status after 3 seconds
      setTimeout(() => setStatus('idle'), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          Syncing...
        </>
      )
    }

    switch (status) {
      case 'success':
        return (
          <>
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            Synced!
          </>
        )
      case 'error':
        return (
          <>
            <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
            Failed
          </>
        )
      default:
        return (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Data
          </>
        )
    }
  }

  const getButtonVariant = () => {
    switch (status) {
      case 'success':
        return 'default'
      case 'error':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <Button 
      variant={getButtonVariant()}
      onClick={handleSync}
      disabled={isLoading}
      className="min-w-32"
    >
      {getButtonContent()}
    </Button>
  )
}