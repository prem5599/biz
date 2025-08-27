import { useState, useEffect } from 'react'
import { useCurrentOrganization } from './useOrganization'

export interface AnalyticsData {
  totalRevenue: number
  revenueByPeriod: Array<{ date: string; revenue: number; orders: number }>
  revenueGrowth: number
  totalOrders: number
  averageOrderValue: number
  ordersGrowth: number
  totalCustomers: number
  newCustomers: number
  returningCustomers: number
  customerAcquisitionCost: number
  customerLifetimeValue: number
  customerGrowth: number
  totalProducts: number
  topProducts: Array<{ name: string; revenue: number; quantity: number }>
  conversionRate: number
  churnRate: number
  returnOnAdSpend: number
  revenueByCountry: Array<{ country: string; revenue: number }>
  revenueByCurrency: Array<{ currency: string; amount: number; converted: number }>
}

export interface UseAnalyticsResult {
  data: AnalyticsData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useAnalytics(
  period: string = 'all', 
  currency: string = 'USD', 
  startDate?: string, 
  endDate?: string
): UseAnalyticsResult {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { organization } = useCurrentOrganization()

  const fetchAnalytics = async () => {
    if (!organization?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        organizationId: organization.id,
        period: period,
        currency
      })

      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/analytics?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [organization?.id, period, currency, startDate, endDate])

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalytics
  }
}

export function useRealtimeAnalytics(
  period: string = 'all', 
  currency: string = 'USD', 
  startDate?: string, 
  endDate?: string
) {
  const analytics = useAnalytics(period, currency, startDate, endDate)

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      analytics.refetch()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [analytics.refetch])

  return analytics
}