import { useCallback, useEffect, useState } from 'react';
import { api, subscribe } from '../lib/api';
import type { SosAlertRecord } from '../types/safeguardTypes';

export function useActiveSos(enabled: boolean) {
  const [alerts, setAlerts] = useState<SosAlertRecord[]>([]);

  const load = useCallback(
    () => api<SosAlertRecord[]>('GET', '/api/sos/active').then(setAlerts).catch(() => {}),
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    void load();
    const unsub = subscribe((type, data) => {
      if (type === 'sos:new') {
        // Confirm real delivery: this dashboard has received and displayed the alert.
        api('POST', `/api/sos/${data.id}/delivered`).catch(() => {});
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`SOS ${data.isTest ? '(TEST) ' : ''}${data.reference}`, { body: data.details });
        }
        void load();
      }
      if (type === 'sos:update') void load();
    });
    // Mark already-open alerts as delivered too
    api<SosAlertRecord[]>('GET', '/api/sos/active')
      .then((rows) =>
        rows
          .filter((r) => r.status === 'sent')
          .forEach((r) => api('POST', `/api/sos/${r.id}/delivered`).catch(() => {})),
      )
      .catch(() => {});
    const t = setInterval(() => void load(), 30_000);
    return () => {
      unsub();
      clearInterval(t);
    };
  }, [enabled, load]);

  const actOnSos = useCallback(
    async (id: string, action: 'acknowledge' | 'dispatch' | 'resolve' | string, body?: unknown) => {
      await api('POST', `/api/sos/${id}/${action}`, body ? { body } : {});
      await load();
    },
    [load],
  );

  return { alerts, reload: load, actOnSos };
}
