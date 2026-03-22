import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '../lib/api';
import { useAuth } from './useAuth';
import { Alert } from '../types';

export function useAlerts(organizationId: string | null, status?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['alerts', organizationId, status],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await alertsApi.getAll(organizationId, status);
      return response.data.alerts || response.data.data || [];
    },
    enabled: !!user && !!organizationId,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
}

export function useActiveAlerts(organizationId: string | null) {
  const { data: alerts, ...rest } = useAlerts(organizationId);

  const activeAlerts = alerts?.filter((alert: Alert) => alert.status === 'ACTIVE') || [];
  const criticalAlerts = alerts?.filter(
    (alert: Alert) => alert.severity === 'CRITICAL' && alert.status === 'ACTIVE'
  ) || [];

  return {
    ...rest,
    data: alerts,
    activeAlerts,
    criticalAlerts,
  };
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const response = await alertsApi.acknowledge(alertId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const response = await alertsApi.resolve(alertId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const response = await alertsApi.dismiss(alertId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useAlertRules(organizationId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['alertRules', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await alertsApi.getRules(organizationId);
      return response.data.data || [];
    },
    enabled: !!user && !!organizationId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await alertsApi.createRule(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] });
    },
  });
}

export function useUpdateAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await alertsApi.updateRule(id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] });
    },
  });
}

export function useDeleteAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await alertsApi.deleteRule(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] });
    },
  });
}
