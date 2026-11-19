import { useCallback } from 'react';
import { api } from '../lib/api';
import { useApiQuery } from './useApiQuery';
import type { Role } from '../auth/AuthProvider';
import type {
  AdminActionBody,
  AdminUserRecord,
  CreateStaffPayload,
  DepartmentRecord,
  UserAccountStatus,
} from '../types/safeguardTypes';

export function useAdminUsers(roleFilter = '') {
  const usersQuery = useApiQuery<AdminUserRecord[]>(
    useCallback(
      () => api<AdminUserRecord[]>('GET', `/api/admin/users${roleFilter ? `?role=${encodeURIComponent(roleFilter)}` : ''}`),
      [roleFilter],
    ),
  );

  const departmentsQuery = useApiQuery<DepartmentRecord[]>(
    useCallback(() => api<DepartmentRecord[]>('GET', '/api/admin/departments'), []),
  );

  const createUser = async (payload: CreateStaffPayload) => {
    await api('POST', '/api/admin/users', { body: payload });
    await usersQuery.refetch();
  };

  const updateUser = async (
    id: string,
    patch: { role?: Role; status?: UserAccountStatus },
    body?: AdminActionBody,
  ) => {
    const payload = {
      ...patch,
      ...(body?.reason ? { reason: body.reason } : {}),
    };
    await api('PATCH', `/api/admin/users/${id}`, { body: payload });
    await usersQuery.refetch();
  };

  return {
    users: usersQuery.data ?? [],
    departments: departmentsQuery.data ?? [],
    loading: usersQuery.loading,
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
    refetch: usersQuery.refetch,
    createUser,
    updateUser,
  };
}
