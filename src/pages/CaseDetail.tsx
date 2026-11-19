import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { STATUS, SEVERITY, catLabel, fmtDate, fmtBytes } from '../lib/labels';
import { Alert, Badge, Button, Card, Field, Input, Select, Spinner, Textarea } from '../components/ui';
import { MapView, colorFor } from '../components/MapView';
import { Messages } from '../components/Messages';
import { PurposeDialog } from '../components/PurposeDialog';

export function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const load = () => api('GET', `/api/incidents/${id}`).then(setD).catch((e) => setError(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);
  const ok = (m: string) => { setFlash(m); load(); setTimeout(() => setFlash(''), 4000); };

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!d) return <Spinner />;
  const i = d.incident;
  const canWork = user?.role === 'commander' || !!d.myAssignment;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <p className="text-sm text-slate-600">Case</p>
          <h1 className="text-2xl font-bold font-mono text-brand-900">{i.reference}</h1>
          <div className="flex flex-wrap gap-2 mt-1">
            <Badge className={STATUS[i.status].cls}>{STATUS[i.status].label}</Badge>
            <Badge className={SEVERITY[i.severity].cls}>{SEVERITY[i.severity].label}</Badge>
            <Badge className="bg-slate-100 text-slate-800">{catLabel(i.category)}</Badge>
            {i.isEmergency && <Badge className="bg-red-600 text-white">SOS</Badge>}
            {i.isAnonymous && <Badge className="bg-slate-800 text-white">Anonymous reporter</Badge>}
            {i.escalatedTo && <Badge className="bg-orange-100 text-orange-900">Escalated: {i.escalatedTo}</Badge>}
          </div>
        </div>
        {d.myAssignment && <p className="text-sm text-slate-700">You: <strong className="capitalize">{d.myAssignment.caseRole}</strong>{d.myAssignment.canDownload ? ' · download permitted' : ''}</p>}
      </div>
      {flash && <Alert kind="success">{flash}</Alert>}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="space-y-3">
            <h2 className="font-semibold text-lg">Report <span className="text-sm font-normal text-slate-600">(submitted by the reporter, not independently verified)</span></h2>
            <p className="whitespace-pre-wrap">{i.description}</p>
            <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-slate-600">Occurred</dt><dd>{fmtDate(i.occurredAt)}</dd>
              <dt className="text-slate-600">Reported</dt><dd>{fmtDate(i.createdAt)}</dd>
              <dt className="text-slate-600">Location</dt><dd>{i.locationText || '—'} {i.lat != null && <>· {i.lat.toFixed(5)}, {i.lng.toFixed(5)} ({i.locationSource}) · <a className="underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${i.lat},${i.lng}`}>Directions</a></>}</dd>
              <dt className="text-slate-600">Contact pref.</dt><dd>{i.preferredContact}</dd>
            </dl>
            {i.lat != null && <MapView points={[{ id: i.id, lat: i.lat, lng: i.lng, color: colorFor(i), label: i.reference }]} height={220} label="Incident location" />}
            <ReporterIdentity incidentId={i.id} available={d.hasReporterIdentity} anonymous={i.isAnonymous} />
          </Card>

          <EvidencePanel d={d} onChange={load} />

          <Card>
            <h2 className="font-semibold text-lg mb-2">Messages</h2>
            <Messages incidentId={i.id} staff mine="staff" />
          </Card>
        </div>

        <div className="space-y-4">
          {canWork && <ActionsPanel d={d} ok={ok} />}
          <AssignPanel d={d} role={user!.role} ok={ok} />
          <NotesPanel d={d} ok={ok} />
          <Card>
            <h2 className="font-semibold text-lg mb-2">Timeline</h2>
            <ol className="space-y-2 text-sm">
              {d.timeline.map((e: any, k: number) => (
                <li key={k} className="border-l-2 border-slate-200 pl-3">
                  <p>{e.detail} {e.public ? <span className="text-xs text-slate-500">(visible to reporter)</span> : null}</p>
                  <p className="text-xs text-slate-600">{e.actor ?? 'System'} · {fmtDate(e.createdAt)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReporterIdentity({ incidentId, available, anonymous }: { incidentId: string; available: boolean; anonymous: boolean }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<any>(null);
  if (anonymous) return <Alert kind="info">Anonymous report. SAFEGUARD doesn't hold this reporter's identity. Contact them through Messages.</Alert>;
  if (!available) return null;
  return (
    <div>
      {info ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-semibold">Reporter details (access logged)</p>
          <p>{info.name} · {info.email}{info.phone ? ` · ${info.phone}` : ''}</p>
          {info.contact && <p>Contact given for this report: {info.contact}</p>}
          <p>Preferred contact: {info.preferredContact}</p>
        </div>
      ) : <Button variant="secondary" onClick={() => setOpen(true)}>Reveal reporter details</Button>}
      <PurposeDialog open={open} onClose={() => setOpen(false)} title="Access reporter identity"
        description="Reporter identities are confidential. Record why you need them. Your name, the time and this purpose are logged."
        confirmLabel="Reveal" onSubmit={async (purpose) => setInfo(await api('POST', `/api/incidents/${incidentId}/reveal-reporter`, { body: { purpose } }))} />
    </div>
  );
}

function EvidencePanel({ d, onChange }: { d: any; onChange: () => void }) {
  const [dialog, setDialog] = useState<null | { ev: any; mode: 'view' | 'download' | 'transfer' }>(null);
  const [recipient, setRecipient] = useState('');
  const [viewing, setViewing] = useState<{ ev: any; url: string | null; integrity: any } | null>(null);
  const [custody, setCustody] = useState<{ ref: string; events: any[] } | null>(null);
  const [verify, setVerify] = useState<Record<string, any>>({});
  const assigned = !!d.myAssignment;

  const access = async (ev: any, mode: 'view' | 'download', purpose: string) => {
    const r = await api('POST', `/api/evidence/${ev.id}/access`, { body: { purpose, mode } });
    let url: string | null = null;
    if (r.grantId) {
      const res: Response = await api('GET', `/api/evidence/${ev.id}/content?grant=${r.grantId}`, { raw: true });
      url = URL.createObjectURL(await res.blob());
      if (mode === 'download') {
        const a = document.createElement('a'); a.href = url; a.download = `${ev.evidenceRef}-${ev.originalName}`; a.click();
      }
    }
    if (viewing?.url) URL.revokeObjectURL(viewing.url);
    setViewing({ ev, url: mode === 'view' ? url : null, integrity: r.integrity });
    onChange();
  };

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold text-lg">Digital evidence ({d.evidence.length})</h2>
      {!assigned && d.evidence.length > 0 && <Alert kind="info">Assign yourself or an investigator to open evidence. Supervisors can see the file details but not the files themselves.</Alert>}
      {d.evidence.length === 0 && <p className="text-slate-600">No evidence submitted.</p>}
      <ul className="space-y-3">
        {d.evidence.map((ev: any) => (
          <li key={ev.id} className="rounded-lg border border-slate-200 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold">{ev.evidenceRef}</span>
              <span className="text-sm">{ev.originalName}</span>
              <span className="text-xs text-slate-600">{ev.mimeType} · {fmtBytes(ev.sizeBytes)}</span>
              {ev.malwareScan === 'not_scanned' && <Badge className="bg-amber-100 text-amber-900">Not malware-scanned</Badge>}
            </div>
            <dl className="text-xs grid grid-cols-[auto_1fr] gap-x-3 text-slate-700">
              <dt>SHA-256</dt><dd className="font-mono break-all">{ev.sha256}</dd>
              <dt>Ledger</dt><dd>entry #{ev.ledgerSeq}</dd>
              <dt>Submitted</dt><dd>{fmtDate(ev.createdAt)} · {ev.anonymous ? 'anonymous reporter' : 'identified account'} · via {ev.captureMethod}</dd>
              {ev.capturedAt && <><dt>Device time</dt><dd>{fmtDate(ev.capturedAt)} (reported by device, unverified)</dd></>}
              {ev.description && <><dt>Description</dt><dd>{ev.description}</dd></>}
            </dl>
            {verify[ev.id] && <Alert kind={verify[ev.id].ok ? 'success' : 'error'} title={verify[ev.id].ok ? 'Integrity check passed' : 'INTEGRITY CHECK FAILED'}>{verify[ev.id].reason}</Alert>}
            <div className="flex flex-wrap gap-2">
              {assigned && <Button className="!min-h-9 text-sm" onClick={() => setDialog({ ev, mode: 'view' })}>Open</Button>}
              <Button className="!min-h-9 text-sm" variant="secondary" onClick={async () => { const r = await api('POST', `/api/evidence/${ev.id}/verify`); setVerify((v) => ({ ...v, [ev.id]: r })); }}>Verify integrity</Button>
              {assigned && d.myAssignment.canDownload && <Button className="!min-h-9 text-sm" variant="secondary" onClick={() => setDialog({ ev, mode: 'download' })}>Download original</Button>}
              {assigned && <Button className="!min-h-9 text-sm" variant="secondary" onClick={() => { setRecipient(''); setDialog({ ev, mode: 'transfer' }); }}>Record transfer</Button>}
              <Button className="!min-h-9 text-sm" variant="ghost" onClick={async () => { const r = await api('GET', `/api/evidence/${ev.id}/custody`); setCustody({ ref: r.evidenceRef, events: r.events }); }}>Chain of custody</Button>
            </div>
          </li>
        ))}
      </ul>

      {viewing && (
        <div className="rounded-lg border-2 border-brand-800 p-3 space-y-2">
          <div className="flex items-center justify-between"><h3 className="font-semibold">{viewing.ev.evidenceRef}</h3><Button variant="ghost" onClick={() => { if (viewing.url) URL.revokeObjectURL(viewing.url); setViewing(null); }}>Close</Button></div>
          <Alert kind={viewing.integrity.ok ? 'success' : 'error'} title={viewing.integrity.ok ? '✓ Integrity verified' : '✗ Integrity check failed'}>
            {viewing.integrity.reason}<br />
            <span className="font-mono text-xs break-all">Ledger #{viewing.integrity.ledgerSeq}: {viewing.integrity.ledgerHash}<br />Now: {viewing.integrity.freshHash ?? 'n/a'}</span>
          </Alert>
          {viewing.url && viewing.ev.mimeType.startsWith('image/') && <img src={viewing.url} alt={`Evidence ${viewing.ev.evidenceRef}`} className="max-h-[70vh] mx-auto" />}
          {viewing.url && viewing.ev.mimeType.startsWith('video/') && <video src={viewing.url} controls className="w-full max-h-[70vh] bg-black" />}
          {viewing.url && viewing.ev.mimeType.startsWith('audio/') && <audio src={viewing.url} controls className="w-full" />}
          {viewing.url && viewing.ev.mimeType === 'application/pdf' && <a href={viewing.url} target="_blank" rel="noreferrer" className="underline">Open PDF</a>}
        </div>
      )}

      {custody && (
        <div className="rounded-lg border border-slate-300 p-3">
          <div className="flex items-center justify-between"><h3 className="font-semibold">Chain of custody · {custody.ref}</h3><Button variant="ghost" onClick={() => setCustody(null)}>Close</Button></div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs mt-2">
              <thead className="text-left text-slate-600"><tr><th className="p-1">When</th><th className="p-1">Who</th><th className="p-1">Action</th><th className="p-1">Purpose / result</th><th className="p-1">Ledger</th></tr></thead>
              <tbody>
                {custody.events.map((e, k) => (
                  <tr key={k} className="border-t"><td className="p-1 whitespace-nowrap">{fmtDate(e.createdAt)}</td><td className="p-1">{e.actor}{e.actorRole ? ` (${e.actorRole})` : ''}</td><td className="p-1 font-semibold">{e.action}</td><td className="p-1">{[e.purpose, e.recipient && `→ ${e.recipient}`, e.result].filter(Boolean).join(' · ')}</td><td className="p-1">#{e.ledgerSeq}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PurposeDialog open={!!dialog} onClose={() => setDialog(null)}
        title={dialog?.mode === 'transfer' ? 'Record evidence transfer' : dialog?.mode === 'download' ? 'Download original evidence' : 'Open evidence'}
        description={dialog?.mode === 'transfer' ? 'Record who is receiving this evidence and why. This is added to the chain of custody.' : 'The file will be decrypted and its hash checked against the ledger. This access is recorded in the chain of custody.'}
        confirmLabel={dialog?.mode === 'transfer' ? 'Record transfer' : dialog?.mode === 'download' ? 'Download' : 'Open'}
        extraField={dialog?.mode === 'transfer' ? { label: 'Received by (person / unit)', value: recipient, onChange: setRecipient } : undefined}
        onSubmit={async (purpose) => {
          if (!dialog) return;
          if (dialog.mode === 'transfer') { await api('POST', `/api/evidence/${dialog.ev.id}/transfer`, { body: { recipient, purpose } }); onChange(); }
          else await access(dialog.ev, dialog.mode, purpose);
        }} />
    </Card>
  );
}

function ActionsPanel({ d, ok }: { d: any; ok: (m: string) => void }) {
  const i = d.incident;
  const [status, setStatus] = useState(i.status);
  const [note, setNote] = useState('');
  const [esc, setEsc] = useState({ department: '', reason: '' });
  const [info, setInfo] = useState('');
  const [err, setErr] = useState('');
  const run = async (fn: () => Promise<unknown>, m: string) => { setErr(''); try { await fn(); ok(m); } catch (e) { setErr((e as Error).message); } };
  return (
    <Card className="space-y-4">
      <h2 className="font-semibold text-lg">Actions</h2>
      {err && <Alert kind="error">{err}</Alert>}
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); run(() => api('PATCH', `/api/incidents/${i.id}/status`, { body: { status, note: note || undefined } }), 'Status updated. The reporter has been notified.'); setNote(''); }}>
        <Field label="Case status">{(id) => <Select id={id} value={status} onChange={(e) => setStatus(e.target.value)}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>}</Field>
        <Field label="Action taken (internal, optional)">{(id) => <Input id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Visited scene, spoke to witnesses" />}</Field>
        <Button className="w-full">Update status</Button>
      </form>
      <details>
        <summary className="cursor-pointer font-semibold text-brand-700">Request more information from reporter</summary>
        <form className="space-y-2 mt-2" onSubmit={(e) => { e.preventDefault(); run(() => api('POST', `/api/incidents/${i.id}/request-info`, { body: { message: info } }), 'Request sent to the reporter.'); setInfo(''); }}>
          <label htmlFor="ri" className="sr-only">Question for reporter</label>
          <Textarea id="ri" rows={3} value={info} onChange={(e) => setInfo(e.target.value)} placeholder="What do you need to know?" />
          <Button variant="secondary" className="w-full" disabled={info.trim().length < 5}>Send request</Button>
        </form>
      </details>
      <details>
        <summary className="cursor-pointer font-semibold text-brand-700">Escalate to another department</summary>
        <form className="space-y-2 mt-2" onSubmit={(e) => { e.preventDefault(); run(() => api('POST', `/api/incidents/${i.id}/escalate`, { body: esc }), 'Case escalated.'); }}>
          <Field label="Department">{(id) => <Input id={id} value={esc.department} onChange={(e) => setEsc({ ...esc, department: e.target.value })} placeholder="e.g. Gender & Children Desk, DCI Cybercrime" />}</Field>
          <Field label="Reason">{(id) => <Textarea id={id} rows={2} value={esc.reason} onChange={(e) => setEsc({ ...esc, reason: e.target.value })} />}</Field>
          <Button variant="secondary" className="w-full">Escalate</Button>
        </form>
      </details>
    </Card>
  );
}

function AssignPanel({ d, role, ok }: { d: any; role: string; ok: (m: string) => void }) {
  const [staff, setStaff] = useState<{ officer: any[]; investigator: any[] }>({ officer: [], investigator: [] });
  const [sel, setSel] = useState({ userId: '', caseRole: role === 'commander' ? 'officer' : 'investigator', canDownload: false });
  const [err, setErr] = useState('');
  const canAssign = role === 'commander' || (role === 'officer' && d.myAssignment);
  useEffect(() => {
    if (!canAssign) return;
    Promise.all(['officer', 'investigator'].map((r) => api('GET', `/api/staff/users?role=${r}`))).then(([o, i]) => setStaff({ officer: o, investigator: i })).catch(() => {});
  }, [canAssign]);
  const options = staff[sel.caseRole as 'officer' | 'investigator'].filter((s) => !d.assignments.some((a: any) => a.userId === s.id));
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold text-lg">Assigned team</h2>
      {d.assignments.length === 0 ? <p className="text-amber-800 font-medium">No one assigned yet.</p> : (
        <ul className="text-sm space-y-1">
          {d.assignments.map((a: any) => (
            <li key={a.id} className="flex items-center gap-2">
              <span className="flex-1">{a.name} {a.badge && <span className="text-slate-600">({a.badge})</span>} · <span className="capitalize">{a.caseRole}</span>{a.canDownload ? ' · ⬇' : ''}</span>
              {role === 'commander' && <button className="text-red-700 underline text-xs" onClick={async () => { if (confirm(`Remove ${a.name} from this case?`)) { await api('DELETE', `/api/incidents/${d.incident.id}/assign/${a.id}`); ok('Assignment removed.'); } }}>Remove</button>}
            </li>
          ))}
        </ul>
      )}
      {canAssign && (
        <form className="space-y-2 border-t pt-3" onSubmit={async (e) => {
          e.preventDefault(); setErr('');
          try { await api('POST', `/api/incidents/${d.incident.id}/assign`, { body: sel }); setSel({ ...sel, userId: '' }); ok('Assigned. They have been notified.'); }
          catch (er) { setErr((er as Error).message); }
        }}>
          {role === 'commander' && (
            <Field label="Role on case">{(id) => <Select id={id} value={sel.caseRole} onChange={(e) => setSel({ ...sel, caseRole: e.target.value, userId: '' })}><option value="officer">Police officer</option><option value="investigator">Investigator</option></Select>}</Field>
          )}
          <Field label={role === 'commander' ? 'Person' : 'Add an investigator'}>{(id) => (
            <Select id={id} value={sel.userId} onChange={(e) => setSel({ ...sel, userId: e.target.value })} required>
              <option value="">Choose…</option>
              {options.map((s) => <option key={s.id} value={s.id}>{s.name}{s.badge ? ` (${s.badge})` : ''}{s.department ? ` – ${s.department}` : ''}</option>)}
            </Select>
          )}</Field>
          {role === 'commander' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={sel.canDownload} onChange={(e) => setSel({ ...sel, canDownload: e.target.checked })} /> Allow downloading original evidence</label>}
          {err && <Alert kind="error">{err}</Alert>}
          <Button className="w-full" disabled={!sel.userId}>Assign</Button>
        </form>
      )}
    </Card>
  );
}

function NotesPanel({ d, ok }: { d: any; ok: (m: string) => void }) {
  const [body, setBody] = useState('');
  return (
    <Card className="space-y-2">
      <h2 className="font-semibold text-lg">Investigation notes</h2>
      <p className="text-xs text-slate-600">Staff only. Notes can't be edited or deleted.</p>
      <ul className="space-y-2 text-sm">
        {d.notes.map((n: any) => <li key={n.id} className="rounded bg-slate-50 p-2"><p className="whitespace-pre-wrap">{n.body}</p><p className="text-xs text-slate-600">{n.author} · {fmtDate(n.createdAt)}</p></li>)}
      </ul>
      <form className="space-y-2" onSubmit={async (e) => { e.preventDefault(); await api('POST', `/api/incidents/${d.incident.id}/notes`, { body: { body } }); setBody(''); ok('Note added.'); }}>
        <label htmlFor="note" className="sr-only">New note</label>
        <Textarea id="note" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a note…" />
        <Button variant="secondary" className="w-full" disabled={!body.trim()}>Add note</Button>
      </form>
    </Card>
  );
}
