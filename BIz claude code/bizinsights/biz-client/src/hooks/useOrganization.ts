import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '../lib/api';
import { Organization } from '../types';
import { useAuth } from './useAuth';

export function useOrganizations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const response = await organizationsApi.getAll();
      return response.data.data as Organization[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCurrentOrganization() {
  const { data: organizations, isLoading, error } = useOrganizations();

  const currentOrganization = organizations?.[0] || null;

  return {
    organization: currentOrganization,
    organizations: organizations || [],
    isLoading,
    error,
  };
}

export function useOrganization(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['organization', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await organizationsApi.getById(id);
      return response.data.data as Organization;
    },
    enabled: !!user && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; slug: string }) => {
      const response = await organizationsApi.create(data);
      return response.data.data as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; billingEmail?: string };
    }) => {
      const response = await organizationsApi.update(id, data);
      return response.data.data as Organization;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization', variables.id] });
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await organizationsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}
