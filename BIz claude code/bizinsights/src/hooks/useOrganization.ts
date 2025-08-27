'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

interface Organization {
  id: string
  name: string
  slug: string
  subscriptionTier: string
  billingEmail?: string
  members: Array<{
    id: string
    role: string
    user: {
      id: string
      name?: string
      email: string
      image?: string
    }
  }>
  _count: {
    integrations: number
    insights: number
  }
}

async function fetchOrganizations(): Promise<Organization[]> {
  const response = await fetch('/api/organizations', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch organizations')
  }

  const data = await response.json()
  return data.data
}

export function useOrganizations() {
  const { data: session } = useSession()
  
  return useQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
    enabled: !!session,
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
  })
}

export function useCurrentOrganization() {
  const { data: organizations, isLoading, error } = useOrganizations()
  
  // For now, return the first organization (in a real app, this would be selected by the user)
  const currentOrganization = organizations?.[0] || null
  
  return {
    organization: currentOrganization,
    isLoading,
    error
  }
}