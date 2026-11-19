import type { ApiFailure } from '../types/safeguardTypes';

// Access token lives in memory only (never localStorage). The refresh token is an httpOnly cookie.
let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

export const setAccessToken = (t: string | null) => { accessToken = t; listeners.forEach((l) => l()); };
export const getAccessToken = () => accessToken;
export const onTokenChange = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export class ApiError extends Error {
  status: number; code?: string; fields?: Record<string, string>;
  constructor(status: number, message: string, code?: string, fields?: Record<string, string>) {
    super(message); this.status = status; this.code = code; this.fields = fields;
  }
}

export const toApiFailure = (error: unknown): ApiFailure => {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.code === 'offline') {
      return {
        kind: 'network',
        message: error.message || 'Cannot reach the server. Check your connection and try again.',
      };
    }
    if (error.status === 401) {
      return {
        kind: 'unauthenticated',
        message: error.message || 'Your session has expired. Please sign in again.',
      };
    }
    if (error.status === 403 && error.code === 'suspended') {
      return {
        kind: 'suspended',
        message: error.message || 'Your account is suspended.',
      };
    }
    if (error.status === 403) {
      return {
        kind: 'forbidden',
        message: error.message || 'You are not authorized to perform this action.',
      };
    }
    if (error.status === 400 || error.status === 422) {
      return {
        kind: 'validation',
        message: error.message || 'Please check the information you entered.',
        fields: error.fields,
      };
    }
    return {
      kind: 'unknown',
      message: error.message || 'Something went wrong. Please try again.',
      fields: error.fields,
    };
  }
  if (error instanceof Error) {
    return {
      kind: 'unknown',
      message: error.message || 'Something went wrong. Please try again.',
    };
  }
  return {
    kind: 'unknown',
    message: 'Something went wrong. Please try again.',
  };
};

export async function refreshSession(): Promise<boolean> {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
    .then(async (r) => {
      if (!r.ok) { setAccessToken(null); return false; }
      setAccessToken((await r.json()).accessToken);
      return true;
    })
    .catch(() => false)
    .finally(() => { refreshing = null; });
  return refreshing;
}

interface Opts { body?: unknown; form?: FormData; headers?: Record<string, string>; raw?: boolean }

export async function api<T = any>(method: string, url: string, opts: Opts = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = { ...opts.headers };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  let r: Response;
  try {
    r = await fetch(url, {
      method, headers, credentials: 'same-origin',
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    });
  } catch {
    throw new ApiError(0, 'No connection. Check your internet and try again.', 'offline');
  }
  if (r.status === 401 && accessToken && retry && !url.startsWith('/api/auth/')) {
    if (await refreshSession()) return api<T>(method, url, opts, false);
  }
  if (opts.raw && r.ok) return r as unknown as T;
  const data = r.headers.get('content-type')?.includes('json') ? await r.json() : null;
  if (!r.ok) throw new ApiError(r.status, data?.error ?? `Request failed (${r.status}).`, data?.code, data?.fields);
  return data as T;
}

/** Upload with progress (fetch has no upload progress). */
export function uploadWithProgress(url: string, form: FormData, headers: Record<string, string>, onProgress: (pct: number) => void) {
  return new Promise<any>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', url);
    if (accessToken) x.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    for (const [k, v] of Object.entries(headers)) x.setRequestHeader(k, v);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    x.onload = () => {
      let data: any = null;
      try { data = JSON.parse(x.responseText); } catch { /* ignore */ }
      if (x.status >= 200 && x.status < 300) resolve(data);
      else reject(new ApiError(x.status, data?.error ?? `Upload failed (${x.status}).`));
    };
    x.onerror = () => reject(new ApiError(0, 'Upload failed: no connection.', 'offline'));
    x.send(form);
  });
}

/** Authenticated Server-Sent Events over fetch (EventSource can't send Authorization headers). */
export function subscribe(onEvent: (type: string, data: any) => void): () => void {
  const ctrl = new AbortController();
  let stopped = false;
  const run = async () => {
    while (!stopped) {
      try {
        const r = await fetch('/api/events', { headers: { Authorization: `Bearer ${accessToken}` }, signal: ctrl.signal });
        if (r.status === 401) { await refreshSession(); continue; }
        const reader = r.body!.pipeThrough(new TextDecoderStream()).getReader();
        let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += value;
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
            const type = /^event: (.*)$/m.exec(chunk)?.[1];
            const data = /^data: (.*)$/m.exec(chunk)?.[1];
            if (type && data) onEvent(type, JSON.parse(data));
          }
        }
      } catch { /* network drop */ }
      if (!stopped) await new Promise((r) => setTimeout(r, 3000));
    }
  };
  run();
  return () => { stopped = true; ctrl.abort(); };
}
