import { useQuery } from '@tanstack/react-query';
import { dashboardApi, insightsApi } from '../lib/api';
import { useAuth } from './useAuth';
import { DashboardData, Insight } from '../types';

export function useDashboard(organizationId: string | null, period: string = '30d') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard', organizationId, period],
    queryFn: async () => {
      if (!organizationId) return null;
      const response = await dashboardApi.getData(organizationId, period);
      return response.data.data as DashboardData;
    },
    enabled: !!user && !!organizationId,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
}

export function useInsights(organizationId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['insights', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await insightsApi.generate(organizationId);
      return response.data.data as Insight[];
    },
    enabled: !!user && !!organizationId,
    refetchInterval: 30 * 60 * 1000,
    staleTime: 15 * 60 * 1000,
  });
}

export function useTrendingInsights(organizationId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['insights', 'trending', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await insightsApi.getTrending(organizationId);
      return response.data.data as Insight[];
    },
    enabled: !!user && !!organizationId,
    staleTime: 10 * 60 * 1000,
  });
}
