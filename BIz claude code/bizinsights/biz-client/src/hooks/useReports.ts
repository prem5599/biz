import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../lib/api';
import { useAuth } from './useAuth';
import { Report, ScheduledReport } from '../types';

export function useReports(organizationId: string | null, limit?: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reports', organizationId, limit],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await reportsApi.getAll(organizationId, limit);
      return response.data.data.reports as Report[];
    },
    enabled: !!user && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      organizationId: string;
      reportType: string;
      period: string;
      currency: string;
      format: string;
    }) => {
      const response = await reportsApi.generate(data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['reports', variables.organizationId],
      });
    },
  });
}

export function useDownloadReport() {
  return useMutation({
    mutationFn: async ({ id, format }: { id: string; format: string }) => {
      const response = await reportsApi.getById(id, format);
      return response.data;
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      organizationId,
    }: {
      id: string;
      organizationId: string;
    }) => {
      await reportsApi.delete(id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['reports', variables.organizationId],
      });
    },
  });
}

export function useCleanupReports() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await reportsApi.cleanup();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useScheduledReports(organizationId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reports', 'scheduled', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await reportsApi.getScheduled(organizationId);
      return response.data.data as ScheduledReport[];
    },
    enabled: !!user && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      organizationId: string;
      reportType: string;
      frequency: string;
      format: string;
      recipients: string[];
      title: string;
    }) => {
      const response = await reportsApi.createSchedule(data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['reports', 'scheduled', variables.organizationId],
      });
    },
  });
}

export function useUpdateScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      organizationId,
      data,
    }: {
      id: string;
      organizationId: string;
      data: any;
    }) => {
      const response = await reportsApi.updateSchedule(id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['reports', 'scheduled', variables.organizationId],
      });
    },
  });
}

export function useDeleteScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      organizationId,
    }: {
      id: string;
      organizationId: string;
    }) => {
      await reportsApi.deleteSchedule(id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['reports', 'scheduled', variables.organizationId],
      });
    },
  });
}
