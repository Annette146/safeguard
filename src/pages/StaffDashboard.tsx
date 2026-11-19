import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, subscribe } from '../lib/api';
import { useAuth } from '../lib/auth';
import { STATUS, SEVERITY, SOS_STATUS, CATEGORY_LABELS, catLabel, fmtDate } from '../lib/labels';
import { Alert, Badge, Button, Card, Empty, PageTitle, Select, Spinner } from '../components/ui';
import { MapView, MapLegend, colorFor, MARKER_COLORS } from '../components/MapView';

export function useActiveSos(enabled: boolean) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const load = useCallback(() => api('GET', '/api/sos/active').then(setAlerts).catch(() => {}), []);
  useEffect(() => {
    if (!enabled) return;
    load();
    const unsub = subscribe((type, data) => {
      if (type === 'sos:new') {
        // Confirm real delivery: this dashboard has received and displayed the alert.
        api('POST', `/api/sos/${data.id}/delivered`).catch(() => {});
        if ('Notification' in window && Notification.permission === 'granted') new Notification(`SOS ${data.isTest ? '(TEST) ' : ''}${data.reference}`, { body: data.details });
        load();
      }
      if (type === 'sos:update') load();
    });
    // mark already-open alerts as delivered too
    api('GET', '/api/sos/active').then((rows: any[]) => rows.filter((r) => r.status === 'sent').forEach((r) => api('POST', `/api/sos/${r.id}/delivered`).catch(() => {})));
    const t = setInterval(load, 30_000);
    return () => { unsub(); clearInterval(t); };
  }, [enabled, load]);
  return { alerts, reload: load };
}

export function StaffDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const responder = user?.role === 'officer' || user?.role === 'commander';
  const { alerts, reload } = useActiveSos(responder);
  const [stats, setStats] = useState<any>(null);
  const [rows, setRows] = useState<any[] | null>(null);
  const [filters, setFilters] = useState({ status: '', category: '', severity: '' });
  const [ledger, setLedger] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => { if (user?.role === 'admin') nav('/admin', { replace: true }); }, [user, nav]);
  const loadCases = useCallback(() => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    api('GET', `/api/incidents${q ? `?${q}` : ''}`).then(setRows).catch((e) => setError(e.message));
    api('GET', '/api/incidents/stats').then(setStats).catch(() => {});
  }, [filters]);
  useEffect(() => { loadCases(); }, [loadCases]);
  useEffect(() => subscribe((type) => { if (type === 'incident:new' || type === 'notification') loadCases(); }), [loadCases]);

  const count = (k: string) => stats?.byStatus.find((s: any) => s.status === k)?.n ?? 0;
  const tiles: [string, number, string][] = stats ? [
    ['New reports', count('submitted'), 'text-sky-800'], ['Assigned', count('assigned'), 'text-indigo-800'],
    ['Investigating', count('investigating') + count('awaiting_info') + count('escalated'), 'text-violet-800'],
    ['Active SOS', stats.activeSos, 'text-red-700'],
  ] : [];

  return (
    <div className="space-y-5">
      <PageTitle sub={user?.role === 'commander' ? 'All incidents. Assign cases to officers and investigators.' : 'Cases assigned to you.'}>
        {user?.role === 'commander' ? 'Command centre' : user?.role === 'investigator' ? 'Investigations' : 'Officer dashboard'}
      </PageTitle>
      {error && <Alert kind="error">{error}</Alert>}

      {responder && <SosPanel alerts={alerts} reload={reload} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(([l, n, c]) => (
          <Card key={l} className="!p-4"><p className="text-sm text-slate-600">{l}</p><p className={`text-3xl font-bold ${c}`}>{n}</p></Card>
        ))}
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <h2 className="font-semibold text-lg mr-auto">{user?.role === 'commander' ? 'Incidents' : 'My cases'}</h2>
          {(['status', 'severity', 'category'] as const).map((k) => (
            <div key={k}>
              <label htmlFor={`f-${k}`} className="block text-xs font-medium text-slate-600 capitalize">{k}</label>
              <Select id={`f-${k}`} value={filters[k]} onChange={(e) => setFilters({ ...filters, [k]: e.target.value })} className="!min-h-10 text-sm">
                <option value="">All</option>
                {Object.entries(k === 'status' ? STATUS : k === 'severity' ? SEVERITY : CATEGORY_LABELS).map(([v, o]) => <option key={v} value={v}>{o.label}</option>)}
              </Select>
            </div>
          ))}
        </div>
        {rows === null ? <Spinner /> : rows.length === 0 ? <Empty>No incidents match.</Empty> : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-600 border-b">
                <tr><th className="p-2">Reference</th><th className="p-2">Type</th><th className="p-2">Severity</th><th className="p-2">Status</th><th className="p-2">Evidence</th><th className="p-2">Assigned</th><th className="p-2">Reported</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="p-2"><Link className="font-mono font-semibold text-brand-700 underline" to={`/staff/cases/${r.id}`}>{r.reference}</Link>{r.isEmergency && <Badge className="ml-1 bg-red-600 text-white">SOS</Badge>}</td>
                    <td className="p-2">{catLabel(r.category)}</td>
                    <td className="p-2"><Badge className={SEVERITY[r.severity].cls}>{SEVERITY[r.severity].label}</Badge></td>
                    <td className="p-2"><Badge className={STATUS[r.status].cls}>{STATUS[r.status].label}</Badge></td>
                    <td className="p-2">{r.evidenceCount}</td>
                    <td className="p-2">{r.assigneeCount || <span className="text-amber-700 font-semibold">Unassigned</span>}</td>
                    <td className="p-2 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {user?.role !== 'officer' && (
        <Card className="flex flex-wrap items-center gap-3">
          <div className="mr-auto"><h2 className="font-semibold">Evidence ledger</h2><p className="text-sm text-slate-600">Re-verify every hash link and signature in the ledger.</p></div>
          {ledger && <Badge className={ledger.ok ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'}>{ledger.ok ? `✓ Intact · ${ledger.entries} entries` : `✗ Broken at #${ledger.brokenAt}: ${ledger.reason}`}</Badge>}
          <Button variant="secondary" onClick={() => api('GET', '/api/ledger/verify').then(setLedger)}>Verify ledger</Button>
        </Card>
      )}
    </div>
  );
}

function SosPanel({ alerts, reload }: { alerts: any[]; reload: () => void }) {
  const [busy, setBusy] = useState('');
  const [notifPerm, setNotifPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied');
  const act = async (id: string, action: string, body?: unknown) => {
    setBusy(id + action);
    try { await api('POST', `/api/sos/${id}/${action}`, body ? { body } : {}); reload(); } catch (e) { alert((e as Error).message); }
    setBusy('');
  };
  const pts = alerts.filter((a) => a.lat != null).map((a) => ({ id: a.id, lat: a.lat, lng: a.lng, color: a.isTest ? '#64748b' : MARKER_COLORS.emergency, label: `${a.isTest ? 'TEST ' : ''}SOS ${a.reference}` }));
  return (
    <Card className={alerts.some((a) => !a.isTest && ['sent', 'delivered'].includes(a.status)) ? 'border-2 border-sos' : ''}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h2 className="font-semibold text-lg text-sos mr-auto">🚨 Emergency alerts ({alerts.length})</h2>
        {notifPerm === 'default' && <Button variant="secondary" onClick={() => Notification.requestPermission().then(setNotifPerm)}>Enable desktop alerts</Button>}
      </div>
      {alerts.length === 0 ? <p className="text-slate-600">No active emergencies. New alerts appear here instantly.</p> : (
        <div className="grid lg:grid-cols-2 gap-4">
          <ul className="space-y-2" aria-live="assertive">
            {alerts.map((a) => (
              <li key={a.id} className={`rounded-lg border p-3 ${a.isTest ? 'border-slate-300 bg-slate-50' : 'border-red-300 bg-red-50'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  {a.isTest && <Badge className="bg-slate-700 text-white">TEST</Badge>}
                  <span className="font-mono font-semibold">{a.reference}</span>
                  <Badge className="bg-white border">{SOS_STATUS[a.status]?.label}</Badge>
                  <span className="ml-auto text-xs text-slate-600">{fmtDate(a.createdAt)}</span>
                </div>
                <p className="mt-1 font-medium capitalize">{a.emergencyType.replaceAll('_', ' ')}</p>
                <p className="text-sm">{a.lat != null ? <>📍 {a.lat.toFixed(5)}, {a.lng.toFixed(5)} (±{a.accuracyM ?? '?'} m, {a.locationSource === 'gps' ? 'live GPS' : 'LAST KNOWN location'}) · <a className="underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}`}>Directions</a></> : '⚠ No location shared'}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['sent', 'delivered'].includes(a.status) && <Button className="!min-h-9 text-sm" loading={busy === a.id + 'acknowledge'} onClick={() => act(a.id, 'acknowledge')}>Acknowledge</Button>}
                  {a.status !== 'dispatched' && <Button className="!min-h-9 text-sm" variant="danger" onClick={() => { const note = prompt('Who was dispatched? e.g. "Patrol unit 7, ETA 6 min"'); if (note) act(a.id, 'dispatch', { note }); }}>Confirm dispatch</Button>}
                  <Button className="!min-h-9 text-sm" variant="secondary" onClick={() => confirm('Mark this emergency resolved?') && act(a.id, 'resolve')}>Resolve</Button>
                  <Link to={`/staff/cases/${a.incidentId}`} className="text-sm underline self-center">Open case & messages</Link>
                </div>
              </li>
            ))}
          </ul>
          <MapView points={pts} height={360} label="Emergency alert locations" />
        </div>
      )}
    </Card>
  );
}

export function StaffMap() {
  const nav = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [cat, setCat] = useState('');
  const [sev, setSev] = useState('');
  const [days, setDays] = useState('30');
  useEffect(() => { api('GET', '/api/incidents').then(setRows).catch(() => {}); }, []);
  const since = Date.now() - Number(days) * 86400_000;
  const pts = rows.filter((r) => r.lat != null && (!cat || r.category === cat) && (!sev || r.severity === sev) && (days === 'all' || new Date(r.createdAt).getTime() >= since))
    .map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, color: colorFor(r), label: `${r.reference} · ${catLabel(r.category)} · ${STATUS[r.status].label}`, onClick: () => nav(`/staff/cases/${r.id}`) }));
  return (
    <div className="space-y-3">
      <PageTitle sub="Click a marker to open the case. Only incidents you are authorised to see are shown.">Incident map</PageTitle>
      <div className="flex flex-wrap gap-2 items-end">
        <div><label htmlFor="m-cat" className="block text-xs font-medium">Category</label><Select id="m-cat" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All</option>{Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></div>
        <div><label htmlFor="m-sev" className="block text-xs font-medium">Severity</label><Select id="m-sev" value={sev} onChange={(e) => setSev(e.target.value)}><option value="">All</option>{Object.entries(SEVERITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></div>
        <div><label htmlFor="m-days" className="block text-xs font-medium">Period</label><Select id="m-days" value={days} onChange={(e) => setDays(e.target.value)}><option value="1">24 hours</option><option value="7">7 days</option><option value="30">30 days</option><option value="all">All time</option></Select></div>
        <p className="text-sm text-slate-700 self-center">{pts.length} shown</p>
      </div>
      <MapLegend />
      <MapView points={pts} height={560} label="Incident map" />
    </div>
  );
}
