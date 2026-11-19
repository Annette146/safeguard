import { useCallback, useEffect, useState } from 'react';
import { api, subscribe } from '../lib/api';
import { useApiQuery } from './useApiQuery';
import type { IncidentRecord, IncidentStats, LedgerVerification } from '../types/safeguardTypes';

export type IncidentFilters = {
  status: string;
  category: string;
  severity: string;
};

export function useStaffIncidents(filters: IncidentFilters = { status: '', category: '', severity: '' }) {
  const [ledger, setLedger] = useState<LedgerVerification | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const incidentsQuery = useApiQuery<IncidentRecord[]>(
    useCallback(() => {
      const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
      return api<IncidentRecord[]>('GET', `/api/incidents${q ? `?${q}` : ''}`);
    }, [filters.status, filters.category, filters.severity]),
  );

  const statsQuery = useApiQuery<IncidentStats>(
    useCallback(() => api<IncidentStats>('GET', '/api/incidents/stats'), []),
  );

  const refetchAll = useCallback(() => {
    void incidentsQuery.refetch();
    void statsQuery.refetch();
  }, [incidentsQuery.refetch, statsQuery.refetch]);

  useEffect(() => {
    return subscribe((type) => {
      if (type === 'incident:new' || type === 'notification') {
        refetchAll();
      }
    });
  }, [refetchAll]);

  const verifyLedger = async () => {
    setLedgerLoading(true);
    try {
      const res = await api<LedgerVerification>('GET', '/api/ledger/verify');
      setLedger(res);
      return res;
    } finally {
      setLedgerLoading(false);
    }
  };

  return {
    incidents: incidentsQuery.data,
    stats: statsQuery.data,
    loading: incidentsQuery.loading,
    error: incidentsQuery.error,
    refetch: refetchAll,
    ledger,
    ledgerLoading,
    verifyLedger,
  };
}
