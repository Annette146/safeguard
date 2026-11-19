import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, uploadWithProgress } from '../lib/api';
import { useAuth } from '../lib/auth';
import { STATUS, SEVERITY, catLabel, fmtDate, fmtBytes } from '../lib/labels';
import { Alert, Badge, Button, Card, Empty, Field, Input, LinkButton, PageTitle, Spinner } from '../components/ui';
import { Messages } from '../components/Messages';
import { MapView, MapLegend, colorFor, getPosition } from '../components/MapView';
import { EvidenceCapture, type EvidenceItem } from '../components/EvidenceCapture';

export function Track() {
  const [reference, setReference] = useState('');
  const [code, setCode] = useState('');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try { setData(await api('POST', '/api/incidents/track', { body: { reference: reference.trim(), code: code.trim() } })); }
    catch (err) { setError((err as Error).message); }
    setLoading(false);
  };
  if (data) return <ReportView data={data} trackingCode={code.trim()} reload={async () => setData(await api('POST', '/api/incidents/track', { body: { reference, code } }))} />;
  return (
    <div className="max-w-md mx-auto">
      <PageTitle sub="Enter the reference number and private tracking code you received when you reported.">Track a report</PageTitle>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert kind="error">{error} Check both values carefully — the code is case-sensitive.</Alert>}
          <Field label="Reference number" hint="Looks like SG-2026-7K3QF9">{(id, d) => <Input id={id} aria-describedby={d} required value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} autoCapitalize="characters" />}</Field>
          <Field label="Tracking code">{(id) => <Input id={id} required value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false} className="font-mono" />}</Field>
          <Button className="w-full" loading={loading}>View report</Button>
        </form>
      </Card>
      <p className="text-sm text-slate-600 mt-3">Reported with an account? <Link to="/reports" className="underline">See My reports</Link>.</p>
    </div>
  );
}

export function MyReports() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api('GET', '/api/incidents/mine').then(setRows).catch((e) => setError(e.message)); }, []);
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <PageTitle sub="Only you and the officers assigned to each case can see these.">My reports</PageTitle>
        <LinkButton to="/report?mode=identified">+ New report</LinkButton>
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      {rows === null ? <Spinner /> : rows.length === 0 ? <Empty>You haven't submitted any reports yet.</Empty> : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link to={`/reports/${r.id}`} className="block rounded-xl bg-white border border-slate-200 p-4 hover:border-brand-600">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-semibold">{r.reference}</span>
                  <Badge className={STATUS[r.status].cls}>{STATUS[r.status].label}</Badge>
                  {r.isEmergency && <Badge className="bg-red-600 text-white">SOS</Badge>}
                  <span className="ml-auto text-sm text-slate-600">{fmtDate(r.createdAt)}</span>
                </div>
                <p className="mt-1 font-medium">{catLabel(r.category)}</p>
                <p className="text-sm text-slate-700 line-clamp-2">{r.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MyReportDetail() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const load = () => api('GET', `/api/incidents/${id}`).then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!data) return <Spinner />;
  return <ReportView data={data} reload={load} />;
}

function ReportView({ data, trackingCode, reload }: { data: any; trackingCode?: string; reload: () => Promise<unknown> }) {
  const i = data.incident;
  const [adding, setAdding] = useState<EvidenceItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const upload = async () => {
    setUploading(true); setMsg(null);
    let ok = 0;
    for (const it of adding) {
      const form = new FormData();
      form.append('file', it.blob, it.name); form.append('captureMethod', it.captureMethod);
      if (it.description) form.append('description', it.description);
      if (it.capturedAt) form.append('capturedAt', it.capturedAt);
      try { await uploadWithProgress(`/api/incidents/${i.id}/evidence`, form, trackingCode ? { 'x-tracking-code': trackingCode } : {}, () => {}); ok++; }
      catch (e) { setMsg({ kind: 'error', text: `${it.name}: ${(e as Error).message}` }); }
    }
    if (ok) { setMsg({ kind: 'success', text: `${ok} file(s) secured.` }); setAdding([]); await reload(); }
    setUploading(false);
  };
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-600">Report</p>
        <h1 className="text-2xl font-bold font-mono text-brand-900">{i.reference}</h1>
        <div className="flex flex-wrap gap-2 mt-1">
          <Badge className={STATUS[i.status].cls}>{STATUS[i.status].label}</Badge>
          <Badge className={SEVERITY[i.severity].cls}>{SEVERITY[i.severity].label}</Badge>
          <Badge className="bg-slate-100 text-slate-800">{catLabel(i.category)}</Badge>
          {i.isAnonymous && <Badge className="bg-slate-800 text-white">Anonymous</Badge>}
        </div>
      </div>
      {i.status === 'awaiting_info' && <Alert kind="warning" title="Investigators have asked for more information">Please read the messages below and reply.</Alert>}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <h2 className="font-semibold text-lg">Details</h2>
          <p className="whitespace-pre-wrap">{i.description}</p>
          <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-slate-600">Happened</dt><dd>{fmtDate(i.occurredAt)}</dd>
            <dt className="text-slate-600">Reported</dt><dd>{fmtDate(i.createdAt)}</dd>
            <dt className="text-slate-600">Place</dt><dd>{i.locationText || (i.lat != null ? `${i.lat.toFixed(5)}, ${i.lng.toFixed(5)}` : 'Not given')}</dd>
          </dl>
          {i.lat != null && <MapView points={[{ id: i.id, lat: i.lat, lng: i.lng, color: colorFor(i), label: 'Incident location' }]} height={200} label="Incident location" />}
        </Card>
        <Card>
          <h2 className="font-semibold text-lg mb-2">Progress</h2>
          <ol className="relative border-l-2 border-slate-200 ml-2 space-y-3">
            {data.timeline.map((e: any, k: number) => (
              <li key={k} className="ml-4">
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-brand-800" aria-hidden="true" />
                <p className="font-medium">{e.detail}</p>
                <p className="text-xs text-slate-600">{fmtDate(e.createdAt)}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
      <Card>
        <h2 className="font-semibold text-lg mb-2">Messages with the case officer</h2>
        {i.preferredContact === 'none' ? <p className="text-slate-600">You asked not to be contacted.</p> : <Messages incidentId={i.id} trackingCode={trackingCode} mine="reporter" />}
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold text-lg">Evidence</h2>
        {data.evidence.length === 0 ? <p className="text-slate-600">No evidence submitted yet.</p> : (
          <ul className="divide-y divide-slate-200">
            {data.evidence.map((e: any) => (
              <li key={e.id} className="py-2 text-sm">
                <p className="font-medium">{e.evidenceRef} · {e.originalName} <span className="text-slate-600 font-normal">({fmtBytes(e.sizeBytes)})</span></p>
                <p className="text-slate-600 break-all">SHA-256 {e.sha256} · ledger #{e.ledgerSeq} · {fmtDate(e.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
        {!['closed', 'resolved'].includes(i.status) && (
          <details>
            <summary className="cursor-pointer font-semibold text-brand-700">Add more evidence</summary>
            <div className="mt-3 space-y-3">
              <EvidenceCapture items={adding} onChange={setAdding} />
              {adding.length > 0 && <Button onClick={upload} loading={uploading}>Upload {adding.length} file(s)</Button>}
            </div>
          </details>
        )}
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      </Card>
    </div>
  );
}

export function CitizenMap() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { if (user?.role === 'citizen') api('GET', '/api/incidents/mine').then(setRows).catch(() => {}); }, [user]);
  const locate = async () => { setErr(''); try { const p = await getPosition(); setMe({ lat: p.coords.latitude, lng: p.coords.longitude }); } catch (e) { setErr((e as Error).message); } };
  const points = [
    ...rows.filter((r) => r.lat != null).map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, color: colorFor(r), label: `${r.reference} · ${catLabel(r.category)}` })),
    ...(me ? [{ id: 'me', lat: me.lat, lng: me.lng, color: '#0f2a44', label: 'You are here' }] : []),
  ];
  return (
    <div className="space-y-3">
      <PageTitle sub={user ? 'Your location and your own reports. Other people\'s reports are never shown.' : 'Sign in to see your reports on the map.'}>Map</PageTitle>
      <div className="flex flex-wrap items-center gap-3"><Button onClick={locate}>📍 Show my location</Button><MapLegend /></div>
      {err && <Alert kind="warning">{err}</Alert>}
      <MapView points={points} height={480} label="Map of your reports" />
    </div>
  );
}

export function Notifications() {
  const [rows, setRows] = useState<any[] | null>(null);
  const { user } = useAuth();
  useEffect(() => {
    api('GET', '/api/notifications').then((r) => { setRows(r); api('POST', '/api/notifications/read-all').catch(() => {}); });
  }, []);
  const link = (n: any) => (!n.incidentId ? null : user?.role === 'citizen' ? `/reports/${n.incidentId}` : `/staff/cases/${n.incidentId}`);
  return (
    <div className="max-w-2xl">
      <PageTitle>Notifications</PageTitle>
      {rows === null ? <Spinner /> : rows.length === 0 ? <Empty>No notifications yet.</Empty> : (
        <ul className="space-y-2">
          {rows.map((n) => {
            const to = link(n);
            const body = <><p className={n.readAt ? '' : 'font-semibold'}>{!n.readAt && <span className="sr-only">Unread: </span>}{n.body}</p><p className="text-xs text-slate-600">{fmtDate(n.createdAt)}</p></>;
            return <li key={n.id}>{to ? <Link to={to} className="block rounded-lg bg-white border border-slate-200 p-3 hover:border-brand-600">{body}</Link> : <div className="rounded-lg bg-white border border-slate-200 p-3">{body}</div>}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
