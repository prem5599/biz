import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi } from '../lib/api';
import { useAuth } from './useAuth';
import { Integration } from '../types';

export function useAvailableIntegrations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['integrations', 'available'],
    queryFn: async () => {
      const response = await integrationsApi.getAvailable();
      return response.data.data;
    },
    enabled: !!user,
    staleTime: 30 * 60 * 1000,
  });
}

export function useConnectedIntegrations(organizationId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['integrations', 'connected', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await integrationsApi.getConnected(organizationId);
      return response.data.data as Integration[];
    },
    enabled: !!user && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useConnectIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      platform,
      organizationId,
      data,
    }: {
      platform: string;
      organizationId: string;
      data?: any;
    }) => {
      const response = await integrationsApi.connect(platform, organizationId, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['integrations', 'connected', variables.organizationId],
      });
    },
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      platform,
      organizationId,
    }: {
      platform: string;
      organizationId: string;
    }) => {
      const response = await integrationsApi.disconnect(platform, organizationId);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['integrations', 'connected', variables.organizationId],
      });
    },
  });
}

export function useSyncIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      platform,
      organizationId,
    }: {
      platform: string;
      organizationId: string;
    }) => {
      const response = await integrationsApi.sync(platform, organizationId);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['integrations', 'connected', variables.organizationId],
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useOAuthAuthorize() {
  return useMutation({
    mutationFn: async ({
      platform,
      organizationId,
    }: {
      platform: string;
      organizationId: string;
    }) => {
      const response = await integrationsApi.getOAuthUrl(platform, organizationId);
      return response.data;
    },
  });
}

export function useOAuthCallback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      platform,
      code,
      organizationId,
    }: {
      platform: string;
      code: string;
      organizationId: string;
    }) => {
      const response = await integrationsApi.handleOAuthCallback(platform, code, organizationId);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['integrations', 'connected', variables.organizationId],
      });
    },
  });
}
