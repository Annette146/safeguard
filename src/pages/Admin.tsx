import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDate } from '../lib/labels';
import { Alert, Badge, Button, Card, Field, Input, PageTitle, Select, Spinner } from '../components/ui';

const TABS = ['Overview', 'Users', 'Departments', 'Audit log'] as const;

export function Admin() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  return (
    <div className="space-y-4">
      <PageTitle sub="Manage accounts, departments and security monitoring. Administrators cannot open reports or evidence.">Administration</PageTitle>
      <div role="tablist" className="flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`px-4 min-h-11 font-semibold border-b-2 -mb-px ${tab === t ? 'border-brand-800 text-brand-900' : 'border-transparent text-slate-600'}`}>{t}</button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'Overview' && <Overview />}
        {tab === 'Users' && <Users />}
        {tab === 'Departments' && <Departments />}
        {tab === 'Audit log' && <AuditLog />}
      </div>
    </div>
  );
}

function Overview() {
  const [o, setO] = useState<any>(null);
  useEffect(() => { api('GET', '/api/admin/overview').then(setO); }, []);
  if (!o) return <Spinner />;
  const tile = (l: string, v: React.ReactNode, warn = false) => <Card className="!p-4"><p className="text-sm text-slate-600">{l}</p><p className={`text-2xl font-bold ${warn ? 'text-red-700' : ''}`}>{v}</p></Card>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tile('Incidents', o.incidents)}
        {tile('Evidence items', o.evidenceItems)}
        {tile('Denied requests (24h)', o.deniedLast24h, o.deniedLast24h > 20)}
        {tile('Failed logins (24h)', o.failedLoginsLast24h, o.failedLoginsLast24h > 20)}
        {tile('Locked accounts', o.lockedAccounts, o.lockedAccounts > 0)}
        {tile('Staff without MFA', o.staffWithoutMfa, o.staffWithoutMfa > 0)}
        {tile('Uptime', `${Math.floor(o.uptimeSec / 3600)}h ${Math.floor((o.uptimeSec % 3600) / 60)}m`)}
        {tile('Memory', `${o.memoryMb} MB`)}
      </div>
      <Card>
        <h2 className="font-semibold">Evidence ledger</h2>
        <p className="text-sm text-slate-600">{o.ledger.name}</p>
        <Badge className={o.ledger.ok ? 'bg-emerald-100 text-emerald-900 mt-2' : 'bg-red-100 text-red-900 mt-2'}>{o.ledger.ok ? `✓ Intact · ${o.ledger.entries} entries` : `✗ Broken at #${o.ledger.brokenAt}: ${o.ledger.reason}`}</Badge>
      </Card>
    </div>
  );
}

function Users() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState<any[] | null>(null);
  const [depts, setDepts] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [f, setF] = useState({ email: '', fullName: '', role: 'officer', departmentId: '', badgeNumber: '', temporaryPassword: '', status: 'pending_verification' });
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const load = () => api('GET', `/api/admin/users${filter ? `?role=${filter}` : ''}`).then(setRows);
  useEffect(() => { load(); api('GET', '/api/admin/departments').then(setDepts); /* eslint-disable-next-line */ }, [filter]);
  const patch = async (id: string, body: object) => {
    try { await api('PATCH', `/api/admin/users/${id}`, { body }); setMsg({ kind: 'success', text: 'User updated.' }); load(); }
    catch (e) { setMsg({ kind: 'error', text: (e as Error).message }); }
  };
  return (
    <div className="space-y-4">
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <Card>
        <h2 className="font-semibold text-lg mb-3">Create staff account</h2>
        <form className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api('POST', '/api/admin/users', { body: { ...f, departmentId: f.departmentId || null, badgeNumber: f.badgeNumber || undefined } });
            setMsg({ kind: 'success', text: `Account created for ${f.email}. Share the temporary password through a secure channel.` });
            setF({ ...f, email: '', fullName: '', badgeNumber: '', temporaryPassword: '' }); load();
          } catch (err) { setMsg({ kind: 'error', text: (err as Error).message }); }
        }}>
          <Field label="Full name">{(id) => <Input id={id} required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />}</Field>
          <Field label="Work email">{(id) => <Input id={id} type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field>
          <Field label="Role">{(id) => <Select id={id} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="officer">Police officer</option><option value="commander">Commanding officer</option><option value="investigator">Investigator</option><option value="admin">Administrator</option></Select>}</Field>
          <Field label="Department">{(id) => <Select id={id} value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value })}><option value="">—</option>{depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>}</Field>
          <Field label="Badge / service no.">{(id) => <Input id={id} value={f.badgeNumber} onChange={(e) => setF({ ...f, badgeNumber: e.target.value })} />}</Field>
          <Field label="Temporary password (12+ chars)">{(id) => <Input id={id} type="text" required minLength={12} value={f.temporaryPassword} onChange={(e) => setF({ ...f, temporaryPassword: e.target.value })} autoComplete="off" />}</Field>
          <Field label="Initial status">{(id) => <Select id={id} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="pending_verification">Pending institutional verification</option><option value="active">Active (verified)</option></Select>}</Field>
          <Button>Create account</Button>
        </form>
      </Card>
      <Card>
        <div className="flex items-end gap-2 mb-3">
          <h2 className="font-semibold text-lg mr-auto">Accounts</h2>
          <label htmlFor="rf" className="text-sm">Role</label>
          <Select id="rf" className="!w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All</option>{['citizen', 'officer', 'commander', 'investigator', 'admin'].map((r) => <option key={r} value={r}>{r}</option>)}</Select>
        </div>
        {rows === null ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-600 border-b"><tr><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Role</th><th className="p-2">Department</th><th className="p-2">MFA</th><th className="p-2">Status</th></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="p-2">{u.fullName}{u.badgeNumber && <span className="text-slate-600"> ({u.badgeNumber})</span>}</td>
                    <td className="p-2">{u.email}</td>
                    <td className="p-2">
                      <label className="sr-only" htmlFor={`role-${u.id}`}>Role for {u.fullName}</label>
                      <select id={`role-${u.id}`} disabled={u.id === me?.id} value={u.role} className="border rounded px-1 py-1" onChange={(e) => confirm(`Change ${u.fullName}'s role to ${e.target.value}? Their sessions and case assignments will be revoked.`) && patch(u.id, { role: e.target.value })}>
                        {['citizen', 'officer', 'commander', 'investigator', 'admin'].map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="p-2">{u.department ?? '—'}</td>
                    <td className="p-2">{u.mfaEnabled ? '✓' : <span className={u.role !== 'citizen' ? 'text-amber-700 font-semibold' : ''}>off</span>}</td>
                    <td className="p-2">
                      <label className="sr-only" htmlFor={`st-${u.id}`}>Status for {u.fullName}</label>
                      <select id={`st-${u.id}`} disabled={u.id === me?.id} value={u.status} className="border rounded px-1 py-1" onChange={(e) => patch(u.id, { status: e.target.value })}>
                        <option value="active">active</option><option value="pending_verification">pending verification</option><option value="suspended">suspended</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Departments() {
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('police');
  const [err, setErr] = useState('');
  const load = () => api('GET', '/api/admin/departments').then(setRows);
  useEffect(() => { load(); }, []);
  return (
    <Card className="space-y-3">
      <ul className="divide-y">{rows.map((d) => <li key={d.id} className="py-2 flex justify-between"><span>{d.name}</span><span className="text-slate-600 text-sm">{d.kind}</span></li>)}</ul>
      <form className="grid sm:grid-cols-[1fr_auto_auto] gap-2 items-end" onSubmit={async (e) => {
        e.preventDefault(); setErr('');
        try { await api('POST', '/api/admin/departments', { body: { name, kind } }); setName(''); load(); } catch (er) { setErr((er as Error).message); }
      }}>
        <Field label="New department">{(id) => <Input id={id} required value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label="Type">{(id) => <Select id={id} value={kind} onChange={(e) => setKind(e.target.value)}><option value="police">Police</option><option value="emergency">Emergency</option><option value="investigations">Investigations</option><option value="institution">Institution</option></Select>}</Field>
        <Button>Add</Button>
      </form>
      {err && <Alert kind="error">{err}</Alert>}
    </Card>
  );
}

function AuditLog() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [outcome, setOutcome] = useState('');
  useEffect(() => { setRows(null); api('GET', `/api/admin/audit${outcome ? `?outcome=${outcome}` : ''}`).then(setRows); }, [outcome]);
  return (
    <Card>
      <div className="flex items-end gap-2 mb-3">
        <p className="text-sm text-slate-600 mr-auto">Append-only. The purposes recorded for evidence and identity access are hidden from administrators.</p>
        <label htmlFor="oc" className="text-sm">Outcome</label>
        <Select id="oc" className="!w-auto" value={outcome} onChange={(e) => setOutcome(e.target.value)}><option value="">All</option><option value="denied">Denied (security alerts)</option><option value="failure">Failures</option><option value="success">Success</option></Select>
      </div>
      {rows === null ? <Spinner /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-slate-600 border-b"><tr><th className="p-1">Time</th><th className="p-1">Actor</th><th className="p-1">Action</th><th className="p-1">Outcome</th><th className="p-1">Target</th><th className="p-1">IP</th><th className="p-1">Detail</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-b ${r.outcome === 'denied' ? 'bg-red-50' : r.outcome === 'failure' ? 'bg-amber-50' : ''}`}>
                  <td className="p-1 whitespace-nowrap">{fmtDate(r.createdAt)}</td><td className="p-1">{r.actor ?? 'anonymous'}{r.actorRole && ` (${r.actorRole})`}</td>
                  <td className="p-1 font-mono">{r.action}</td><td className="p-1">{r.outcome}</td><td className="p-1">{r.targetType ? `${r.targetType}:${String(r.targetId ?? '').slice(0, 8)}` : ''}</td>
                  <td className="p-1">{r.ip ?? ''}</td><td className="p-1 max-w-64 truncate" title={r.detail ?? ''}>{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
