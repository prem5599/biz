'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function IntegrationsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/integrations/oauth')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-muted-foreground">
        Redirecting to integrations...
      </div>
    </div>
  )
}