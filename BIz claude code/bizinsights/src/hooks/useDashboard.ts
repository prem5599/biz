'use client'

import { useQuery } from '@tanstack/react-query'
import { useUser } from '@clerk/nextjs'

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
  const { user } = useUser()
  
  return useQuery({
    queryKey: ['dashboard', organizationId, period],
    queryFn: () => fetchDashboardData(organizationId!, period),
    enabled: !!user && !!organizationId,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  })
}

export function useInsights(organizationId: string | null) {
  const { user } = useUser()
  
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
    enabled: !!user && !!organizationId,
    refetchInterval: 30 * 60 * 1000, // Refetch every 30 minutes
    staleTime: 15 * 60 * 1000, // Consider data stale after 15 minutes
  })
}