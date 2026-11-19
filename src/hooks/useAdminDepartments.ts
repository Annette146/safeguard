import { useCallback } from 'react';
import { api } from '../lib/api';
import { useApiQuery } from './useApiQuery';
import type { DepartmentRecord } from '../types/safeguardTypes';

export function useAdminDepartments() {
  const query = useApiQuery<DepartmentRecord[]>(
    useCallback(() => api<DepartmentRecord[]>('GET', '/api/admin/departments'), []),
  );

  const createDepartment = async (name: string, kind: string) => {
    await api('POST', '/api/admin/departments', { body: { name, kind } });
    await query.refetch();
  };

  return {
    departments: query.data ?? [],
    loading: query.loading,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createDepartment,
  };
}
