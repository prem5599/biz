import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../lib/api';
import { useCurrentOrganization } from './useOrganization';
import { useAuth } from './useAuth';
import { AnalyticsData } from '../types';

export interface UseAnalyticsResult {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAnalytics(
  period: string = 'all',
  currency: string = 'USD',
  startDate?: string,
  endDate?: string
): UseAnalyticsResult {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organization } = useCurrentOrganization();
  const { user } = useAuth();

  const fetchAnalytics = useCallback(async () => {
    if (!organization?.id || !user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await analyticsApi.getData({
        organizationId: organization.id,
        period,
        currency,
        startDate,
        endDate,
      });

      setData(response.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, period, currency, startDate, endDate, user]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
}

export function useRealtimeAnalytics(
  period: string = 'all',
  currency: string = 'USD',
  startDate?: string,
  endDate?: string
) {
  const analytics = useAnalytics(period, currency, startDate, endDate);

  useEffect(() => {
    const interval = setInterval(() => {
      analytics.refetch();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [analytics.refetch]);

  return analytics;
}

export function useCustomerAnalytics(organizationId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['analytics', 'customers', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const response = await analyticsApi.getCustomerAnalytics(organizationId);
      return response.data.data;
    },
    enabled: !!user && !!organizationId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useProductAnalytics(organizationId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['analytics', 'products', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const response = await analyticsApi.getProductAnalytics(organizationId);
      return response.data.data;
    },
    enabled: !!user && !!organizationId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useForecastAnalytics(organizationId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['analytics', 'forecast', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const response = await analyticsApi.getForecastAnalytics(organizationId);
      return response.data.data;
    },
    enabled: !!user && !!organizationId,
    staleTime: 10 * 60 * 1000,
  });
}
