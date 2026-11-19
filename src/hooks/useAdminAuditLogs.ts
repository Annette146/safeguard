import { useCallback } from 'react';
import { api } from '../lib/api';
import { useApiQuery } from './useApiQuery';
import type { AuditLogRecord } from '../types/safeguardTypes';

export function useAdminAuditLogs(outcome = '') {
  const query = useApiQuery<AuditLogRecord[]>(
    useCallback(
      () => api<AuditLogRecord[]>('GET', `/api/admin/audit${outcome ? `?outcome=${encodeURIComponent(outcome)}` : ''}`),
      [outcome],
    ),
  );

  return {
    logs: query.data ?? [],
    loading: query.loading,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
