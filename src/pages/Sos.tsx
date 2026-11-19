import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { SOS_STATUS, fmtDate } from '../lib/labels';
import { Alert, Button, Card, Textarea } from '../components/ui';
import { MapView, MARKER_COLORS } from '../components/MapView';
import { useEmergencyNumbers } from '../components/Layout';

const TYPES: [string, string][] = [
  ['assault', 'Attack / assault'], ['robbery', 'Robbery'], ['medical', 'Medical'], ['kidnapping', 'Abduction'],
  ['domestic_violence', 'Domestic violence'], ['fire', 'Fire'], ['road_accident', 'Road accident'], ['other', 'Other'],
];
const COUNTDOWN = 5;
const LS_ACTIVE = 'sg_sos_active';
const LS_QUEUE = 'sg_sos_queue';
const LS_LAST_LOC = 'sg_last_loc';

type Loc = { lat: number; lng: number; accuracyM: number; at: string; source: 'gps' | 'last_known' };
interface Active { id: string; trackingCode: string | null; reference: string }
interface Pending { clientId: string; body: Record<string, unknown> }

const store = {
  get<T>(k: string): T | null { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; } },
  set(k: string, v: unknown) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};

export function Sos() {
  const { user } = useAuth();
  const nums = useEmergencyNumbers();
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'active'>(() => (store.get<Active>(LS_ACTIVE) || store.get<Pending>(LS_QUEUE) ? 'active' : 'idle'));
  const [type, setType] = useState('other');
  const [isTest, setIsTest] = useState(false);
  const [discreet, setDiscreet] = useState(false);
  const [count, setCount] = useState(COUNTDOWN);
  const [loc, setLoc] = useState<Loc | null>(null);
  const [locError, setLocError] = useState('');
  const [active, setActive] = useState<Active | null>(() => store.get<Active>(LS_ACTIVE));
  const [status, setStatus] = useState<any>(null);
  const [clientStatus, setClientStatus] = useState<'initiated' | 'queued' | null>(() => (store.get<Pending>(LS_QUEUE) ? 'queued' : null));
  const [sendError, setSendError] = useState('');
  const [contacts, setContacts] = useState<{ configured: number; sent: number; channel: string } | null>(null);
  const [details, setDetails] = useState('');
  const [detailsSent, setDetailsSent] = useState(false);
  const watchId = useRef<number | null>(null);
  const locRef = useRef<Loc | null>(null);
  locRef.current = loc;

  // Start watching location as soon as the page opens (uses permission the user has granted).
  useEffect(() => {
    const last = store.get<Loc>(LS_LAST_LOC);
    if (last) setLoc({ ...last, source: 'last_known' });
    if (!('geolocation' in navigator)) { setLocError('This device cannot share its location.'); return; }
    watchId.current = navigator.geolocation.watchPosition((p) => {
      const l: Loc = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), accuracyM: Math.round(p.coords.accuracy), at: new Date(p.timestamp).toISOString(), source: 'gps' };
      setLoc(l); setLocError(''); store.set(LS_LAST_LOC, l);
    }, (e) => setLocError(e.code === 1 ? 'Location permission is off. Responders will not see where you are unless you allow it in your browser settings.' : 'Current location unavailable.'),
    { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 });
    return () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); };
  }, []);

  const trySend = useCallback(async (pending: Pending) => {
    try {
      const r = await api('POST', '/api/sos', { body: pending.body });
      const a: Active = { id: r.id, trackingCode: r.trackingCode ?? store.get<Active>(LS_ACTIVE)?.trackingCode ?? null, reference: r.reference };
      store.set(LS_ACTIVE, a); store.set(LS_QUEUE, null);
      setActive(a); setStatus(r); setClientStatus(null); setSendError('');
      if (r.contacts) setContacts(r.contacts);
      return true;
    } catch (e) {
      // Network failure: keep the alert queued on this device and keep retrying.
      store.set(LS_QUEUE, pending); setClientStatus('queued');
      setSendError((e as Error).message);
      return false;
    }
  }, []);

  // Retry queued alert when back online and every 10 s.
  useEffect(() => {
    if (clientStatus !== 'queued') return;
    const retry = () => { const p = store.get<Pending>(LS_QUEUE); if (p) trySend({ ...p, body: { ...p.body, activationMethod: 'queued_retry' } }); };
    window.addEventListener('online', retry);
    const t = setInterval(retry, 10_000);
    return () => { window.removeEventListener('online', retry); clearInterval(t); };
  }, [clientStatus, trySend]);

  const send = useCallback(() => {
    const l = locRef.current;
    const pending: Pending = {
      clientId: crypto.randomUUID(),
      body: {
        emergencyType: type, isTest, activationMethod: 'in_app',
        lat: l?.lat ?? null, lng: l?.lng ?? null, accuracyM: l?.accuracyM ?? null,
        locationSource: l ? l.source : 'none', locationAt: l?.at ?? null,
      },
    };
    pending.body.clientId = pending.clientId;
    setPhase('active'); setClientStatus('initiated');
    trySend(pending);
  }, [type, isTest, trySend]);

  // Countdown: auto-sends; "Send now" skips it, so genuine emergencies are never delayed.
  useEffect(() => {
    if (phase !== 'confirm') return;
    if (count <= 0) { send(); return; }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, count, send]);

  // Poll status + push location updates while active.
  useEffect(() => {
    if (!active) return;
    const headers = active.trackingCode ? { 'x-tracking-code': active.trackingCode } : undefined;
    const poll = () => api('GET', `/api/sos/${active.id}/status`, { headers }).then(setStatus).catch(() => {});
    const pushLoc = () => {
      const l = locRef.current;
      if (l?.source === 'gps') api('POST', `/api/sos/${active.id}/location`, { headers, body: { lat: l.lat, lng: l.lng, accuracyM: l.accuracyM } }).catch(() => {});
    };
    poll();
    const a = setInterval(poll, 5000);
    const b = setInterval(pushLoc, 30_000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [active]);

  const headers = active?.trackingCode ? { 'x-tracking-code': active.trackingCode } : undefined;
  const finished = status && ['cancelled', 'resolved'].includes(status.status);
  const clear = () => { store.set(LS_ACTIVE, null); store.set(LS_QUEUE, null); setActive(null); setStatus(null); setClientStatus(null); setPhase('idle'); setCount(COUNTDOWN); setDetailsSent(false); setContacts(null); };
  const cancelAlert = async () => {
    if (!active) { clear(); return; }
    if (!confirm('Cancel this SOS alert? Only do this if you are safe.')) return;
    await api('POST', `/api/sos/${active.id}/cancel`, { headers }).catch(() => {});
    setStatus((s: any) => ({ ...s, status: 'cancelled' }));
  };
  const smsBody = encodeURIComponent(`I need help. ${loc ? `My location: https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng} (±${loc.accuracyM} m)` : ''}`);

  const CallBar = (
    <div className="grid grid-cols-2 gap-2">
      {nums.map((n) => <a key={n} href={`tel:${n}`} className="rounded-xl bg-white border-2 border-sos text-sos font-bold text-center py-4 text-lg">📞 Call {n}</a>)}
    </div>
  );

  if (discreet && phase === 'active') {
    return (
      <div className="fixed inset-0 z-[3000] bg-black text-slate-500 p-6 flex flex-col justify-between">
        <p className="text-sm">{status?.status ? SOS_STATUS[status.status]?.label : clientStatus === 'queued' ? 'Waiting for connection' : 'Sending…'}</p>
        <button className="text-sm underline self-start" onClick={() => setDiscreet(false)}>Show full screen</button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {phase === 'idle' && (
        <>
          <h1 className="text-2xl font-bold text-brand-900">Emergency help</h1>
          <button onClick={() => { setCount(COUNTDOWN); setPhase('confirm'); }}
            className="w-full aspect-square max-h-80 rounded-full bg-sos hover:bg-sos-dark text-white shadow-2xl ring-8 ring-red-200 flex flex-col items-center justify-center focus-visible:ring-red-400">
            <span className="text-6xl font-black">SOS</span>
            <span className="text-lg font-bold mt-2 px-6 text-center">REQUEST EMERGENCY HELP</span>
          </button>
          {CallBar}
          <Card className="space-y-2 text-sm">
            <p><strong>Location:</strong> {loc ? `${loc.source === 'gps' ? 'Current' : 'Last known'} location ready (±${loc.accuracyM} m)` : locError || 'Finding your location…'}</p>
            <p>When you press SOS, you can pick the type of emergency. The alert sends automatically after {COUNTDOWN} seconds unless you cancel, or immediately if you tap "Send now".</p>
            <label className="flex items-center gap-2 pt-1"><input type="checkbox" className="h-5 w-5" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} /> Send a <strong>test alert</strong> (clearly marked TEST, not a real emergency)</label>
            {!user && <p className="text-slate-600">You're not signed in. Your alert is anonymous, and trusted contacts can't be notified. <Link to="/login?next=/sos" className="underline">Sign in</Link></p>}
          </Card>
        </>
      )}

      {phase === 'confirm' && (
        <Card className="space-y-4 border-sos border-2">
          <h1 className="text-xl font-bold text-sos" aria-live="assertive">{isTest ? 'TEST alert' : 'Sending emergency alert'} in {count}…</h1>
          <fieldset>
            <legend className="font-semibold mb-2">What's happening? (optional)</legend>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(([k, l]) => (
                <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(k)}
                  className={`rounded-lg border-2 min-h-12 font-semibold ${type === k ? 'border-sos bg-red-50 text-sos' : 'border-slate-300'}`}>{l}</button>
              ))}
            </div>
          </fieldset>
          <p className="text-sm"><strong>Location to send:</strong> {loc ? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)} (±${loc.accuracyM} m, ${loc.source === 'gps' ? 'current' : 'last known'})` : 'Not available — the alert will be sent without a location.'}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="danger" className="min-h-14 text-lg" onClick={send}>Send alert now</Button>
            <Button variant="secondary" className="min-h-14 text-lg" onClick={() => setPhase('idle')}>Cancel</Button>
          </div>
          {CallBar}
        </Card>
      )}

      {phase === 'active' && (
        <>
          <h1 className="text-2xl font-bold text-brand-900">{status?.isTest || isTest ? 'Test alert status' : 'Your emergency alert'}</h1>
          {status?.isTest && <Alert kind="info" title="This is a TEST alert">It is clearly labelled as a test on responder dashboards. No one will be dispatched.</Alert>}
          <StatusSteps current={status?.status ?? clientStatus ?? 'initiated'} />
          {sendError && clientStatus === 'queued' && (
            <Alert kind="error" title="Alert not sent yet: no connection">
              Your alert is saved on this device and will be sent automatically when you're back online. <strong>Call {nums[0]} now</strong> — phone calls can work without internet.
              <a className="block mt-2 underline font-semibold" href={`sms:?&body=${smsBody}`}>Send your location by SMS to someone you trust</a>
            </Alert>
          )}
          {status?.status === 'dispatched' && <Alert kind="success" title="Help has been dispatched">{status.dispatchNote}</Alert>}
          {active && <p className="text-sm text-slate-700">Reference <strong className="font-mono">{active.reference}</strong>{status?.createdAt && <> · raised {fmtDate(status.createdAt)}</>}</p>}
          {contacts && contacts.configured > 0 && (
            <Alert kind={contacts.sent ? 'success' : 'warning'}>
              {contacts.sent ? `${contacts.sent} of your emergency contacts were sent an SMS.` : `Your ${contacts.configured} emergency contact(s) could NOT be notified automatically (SMS is not set up on this SAFEGUARD server). Use the SMS link below to tell them.`}
            </Alert>
          )}
          {CallBar}
          {loc && (
            <Card className="space-y-2">
              <p className="text-sm"><strong>{loc.source === 'gps' ? 'Current location' : 'Last known location'}</strong> (±{loc.accuracyM} m) — shared only with responders{status?.status && !finished ? ', updated every 30 seconds while this page is open' : ''}.</p>
              <MapView points={[{ id: 'me', lat: loc.lat, lng: loc.lng, color: MARKER_COLORS.emergency, label: 'Your location' }]} height={220} label="Your location" />
              <a className="text-sm underline font-semibold text-brand-700" href={`sms:?&body=${smsBody}`}>Share my location by SMS</a>
            </Card>
          )}
          {active && !finished && (
            <Card className="space-y-2">
              <label htmlFor="sos-details" className="font-semibold">Add details for responders (optional)</label>
              <Textarea id="sos-details" rows={2} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="e.g. I'm in the blue building, 2nd floor" maxLength={1000} />
              <Button variant="secondary" disabled={!details.trim()} onClick={async () => {
                await api('POST', `/api/sos/${active.id}/details`, { headers, body: { details } }); setDetails(''); setDetailsSent(true);
              }}>Send details</Button>
              {detailsSent && <p className="text-sm text-emerald-700" role="status">✓ Details sent to responders.</p>}
            </Card>
          )}
          <div className="flex flex-wrap gap-2">
            {!finished && <Button variant="secondary" onClick={cancelAlert}>I'm safe — cancel alert</Button>}
            {!finished && <Button variant="ghost" onClick={() => setDiscreet(true)}>Discreet screen</Button>}
            {finished && <Button onClick={clear}>Done</Button>}
          </div>
          <p className="text-xs text-slate-600">SAFEGUARD shows "help dispatched" only after a responder confirms it. Your camera and microphone are never switched on by an alert.</p>
        </>
      )}
    </div>
  );
}

const ORDER = ['initiated', 'queued', 'sent', 'delivered', 'acknowledged', 'dispatched'];
function StatusSteps({ current }: { current: string }) {
  if (['cancelled', 'resolved'].includes(current)) return <Alert kind="info" title={SOS_STATUS[current].label}>{SOS_STATUS[current].detail}</Alert>;
  const idx = ORDER.indexOf(current);
  const steps = ORDER.filter((s) => s !== 'queued' || current === 'queued');
  return (
    <Card>
      <ol className="space-y-3" aria-live="polite">
        {steps.map((s) => {
          const i = ORDER.indexOf(s);
          const state = i < idx ? 'done' : i === idx ? 'current' : 'todo';
          return (
            <li key={s} className="flex gap-3" aria-current={state === 'current' ? 'step' : undefined}>
              <span className={`mt-0.5 h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${state === 'done' ? 'bg-emerald-600 text-white' : state === 'current' ? 'bg-sos text-white animate-pulse' : 'bg-slate-200 text-slate-500'}`} aria-hidden="true">
                {state === 'done' ? '✓' : ''}
              </span>
              <span>
                <span className={`font-semibold ${state === 'todo' ? 'text-slate-500' : ''}`}>{SOS_STATUS[s].label}</span>
                {state === 'current' && <span className="block text-sm text-slate-700">{SOS_STATUS[s].detail}</span>}
                <span className="sr-only"> ({state === 'done' ? 'completed' : state === 'current' ? 'current step' : 'not yet'})</span>
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
