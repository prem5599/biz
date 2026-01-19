'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

interface DashboardData {
  metrics: {
    revenue: number
    orders: number
    customers: number
    conversionRate: number
  }
  insights: Array<{
    id: string
    type: 'TREND' | 'ANOMALY' | 'RECOMMENDATION' | 'ALERT'
    title: string
    description: string
    impactScore: number
    isRead: boolean
    metadata?: any
  }>
  integrations: Array<{
    id: string
    platform: string
    status: string
    lastSyncAt?: string
  }>
  period: string
}

async function fetchDashboardData(organizationId: string, period: string = '30d'): Promise<DashboardData> {
  const response = await fetch(`/api/organizations/${organizationId}/dashboard?period=${period}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data')
  }

  const data = await response.json()
  return data.data
}

export function useDashboard(organizationId: string | null, period: string = '30d') {
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'
  
  return useQuery({
    queryKey: ['dashboard', organizationId, period],
    queryFn: () => fetchDashboardData(organizationId!, period),
    enabled: isAuthenticated && !!organizationId,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  })
}

export function useInsights(organizationId: string | null) {
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'
  
  return useQuery({
    queryKey: ['insights', organizationId],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${organizationId}/insights/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to generate insights')
      }

      const data = await response.json()
      return data.data
    },
    enabled: isAuthenticated && !!organizationId,
    refetchInterval: 30 * 60 * 1000,
    staleTime: 15 * 60 * 1000,
  })
}
