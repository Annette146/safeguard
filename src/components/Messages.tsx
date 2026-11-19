import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { fmtDate } from '../lib/labels';
import { Button, Textarea, Alert, Spinner } from './ui';

interface Msg { id: string; senderKind: 'reporter' | 'staff' | 'system'; senderName: string; body: string; internal: number; createdAt: string }

/** Incident-scoped secure thread. Polls every 10 s (real-time push arrives via notifications). */
export function Messages({ incidentId, trackingCode, staff, mine }: { incidentId: string; trackingCode?: string; staff?: boolean; mine: 'reporter' | 'staff' }) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const headers = trackingCode ? { 'x-tracking-code': trackingCode } : undefined;

  const load = async () => {
    try { setMsgs(await api('GET', `/api/incidents/${incidentId}/messages`, { headers })); setError(''); }
    catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { load(); const t = setInterval(load, 10_000); return () => clearInterval(t); /* eslint-disable-next-line */ }, [incidentId]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [msgs?.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await api('POST', `/api/incidents/${incidentId}/messages`, { body: { body, internal }, headers });
      setBody(''); await load();
    } catch (err) { setError((err as Error).message); }
    setSending(false);
  };

  return (
    <div className="space-y-3">
      {error && <Alert kind="error">{error}</Alert>}
      <div className="max-h-96 overflow-y-auto space-y-2 rounded-lg bg-slate-50 p-3" aria-live="polite" aria-label="Messages">
        {msgs === null ? <Spinner /> : msgs.length === 0 ? <p className="text-sm text-slate-600">No messages yet.</p> : msgs.map((m) => {
          const own = m.senderKind === mine;
          return (
            <div key={m.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 ${m.internal ? 'bg-amber-100 border border-amber-300' : own ? 'bg-brand-800 text-white' : 'bg-white border border-slate-200'}`}>
                <p className={`text-xs font-semibold ${own && !m.internal ? 'text-brand-100' : 'text-slate-600'}`}>
                  {m.senderName}{m.internal ? ' · staff only' : ''}
                </p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`text-[11px] mt-1 ${own && !m.internal ? 'text-brand-100' : 'text-slate-500'}`}>{fmtDate(m.createdAt)} · ✓ delivered</p>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="space-y-2">
        <label htmlFor={`msg-${incidentId}`} className="sr-only">Message</label>
        <Textarea id={`msg-${incidentId}`} rows={2} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000}
          placeholder={staff ? 'Message the reporter or case team…' : 'Write to the case officer…'} />
        <div className="flex items-center justify-between gap-2">
          {staff ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-5 w-5" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Staff only (reporter can't see)
            </label>
          ) : <span className="text-xs text-slate-600">Sent over an encrypted connection. Only officers assigned to your case can read them.</span>}
          <Button loading={sending} disabled={!body.trim()}>Send</Button>
        </div>
      </form>
    </div>
  );
}
