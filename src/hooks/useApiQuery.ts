import { useCallback, useEffect, useState } from 'react';
import { toApiFailure } from '../lib/api';
import type { ApiFailure } from '../types/safeguardTypes';

export type QueryState<T> = {
  data: T | null;
  isLoading: boolean;
  loading: boolean;
  error: ApiFailure | null;
  refetch: () => Promise<void>;
};

export function useApiQuery<T>(request: () => Promise<T>): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiFailure | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await request());
    } catch (requestError) {
      setError(toApiFailure(requestError));
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refetch();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refetch]);

  return { data, isLoading: loading, loading, error, refetch };
}
