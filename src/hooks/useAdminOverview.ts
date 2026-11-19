import { useCallback } from 'react';
import { api } from '../lib/api';
import { useApiQuery } from './useApiQuery';
import type { AdminOverviewData, PlatformConfigData } from '../types/safeguardTypes';

export function useAdminOverview() {
  const overviewQuery = useApiQuery<AdminOverviewData>(
    useCallback(() => api<AdminOverviewData>('GET', '/api/admin/overview'), []),
  );
  const configQuery = useApiQuery<PlatformConfigData>(
    useCallback(() => api<PlatformConfigData>('GET', '/api/config'), []),
  );

  const refetch = useCallback(async () => {
    await Promise.all([overviewQuery.refetch(), configQuery.refetch()]);
  }, [overviewQuery.refetch, configQuery.refetch]);

  return {
    overview: overviewQuery.data,
    config: configQuery.data,
    loading: overviewQuery.loading,
    configLoading: configQuery.loading,
    error: overviewQuery.error ?? configQuery.error,
    refetch,
  };
}
