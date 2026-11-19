import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Activity, ArrowRight, FolderKanban, Search, ShieldCheck, Siren } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { STATUS, SEVERITY, SOS_STATUS, CATEGORY_LABELS, catLabel, fmtDate } from '../lib/labels';
import { getStaffQuickActions } from '../Data/Navitems';
import { useActiveSos } from '../hooks/useActiveSos';
import { useStaffIncidents, type IncidentFilters } from '../hooks/useStaffIncidents';
import { PageHeader } from '../components/PageHeader';
import { Alert, Badge, Button, Card, Empty, Select, Spinner } from '../components/ui';
import { MapView, MapLegend, colorFor, MARKER_COLORS } from '../components/MapView';
import type { SosAlertRecord } from '../types/safeguardTypes';

export function StaffDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const responder = user?.role === 'officer' || user?.role === 'commander';
  const { alerts, actOnSos } = useActiveSos(responder);
  const { incidents, stats, error, ledger, ledgerLoading, verifyLedger } = useStaffIncidents();

  if (user?.role === 'admin') {
    nav('/admin', { replace: true });
    return null;
  }

  const count = (k: string) => stats?.byStatus.find((s) => s.status === k)?.n ?? 0;
  const metricCards = stats
    ? [
        { label: 'New reports', value: count('submitted'), href: '/staff/incidents', accent: 'text-sky-700 dark:text-sky-400' },
        { label: 'Assigned', value: count('assigned'), href: '/staff/incidents', accent: 'text-indigo-700 dark:text-indigo-400' },
        {
          label: 'Investigating',
          value: count('investigating') + count('awaiting_info') + count('escalated'),
          href: '/staff/incidents',
          accent: 'text-violet-700 dark:text-violet-400',
        },
        {
          label: 'Active SOS',
          value: stats.activeSos,
          href: responder ? '/staff/sos' : '/staff/incidents',
          accent: stats.activeSos > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-white',
        },
      ]
    : [];

  const title =
    user?.role === 'commander'
      ? 'Command centre'
      : user?.role === 'investigator'
        ? 'Investigator dashboard'
        : 'Officer dashboard';

  const subtitle =
    user?.role === 'commander'
      ? 'Triage incoming reports, coordinate SOS response, and assign officers and investigators.'
      : user?.role === 'investigator'
        ? 'Examine assigned cases, verify cryptographic evidence hashes, and record custody actions.'
        : 'Monitor emergency SOS alerts, inspect assigned incidents, and coordinate with reporters.';

  const quickActions = user ? getStaffQuickActions(user.role) : [];
  const recent = (incidents ?? []).slice(0, 8);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      <section className="rounded-2xl border border-blue-700 bg-blue-600 p-6 text-white shadow-lg shadow-blue-200/60 sm:p-8 dark:border-blue-500/40 dark:bg-zinc-900/95 dark:shadow-none">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-100">
              <Activity className="h-4 w-4" aria-hidden="true" /> {title}
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {user?.fullName.split(' ')[0] ?? 'Officer'}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100 sm:text-base dark:text-zinc-300">
              {subtitle}
            </p>
          </div>
          <Link
            to="/staff/incidents"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400"
          >
            View incidents <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {error && <Alert kind="error">{error.message}</Alert>}

      {responder && <SosPanel alerts={alerts} onAction={actOnSos} />}

      {metricCards.length > 0 && (
        <section aria-labelledby="case-metrics">
          <h2 id="case-metrics" className="text-lg font-bold text-zinc-900 dark:text-white mb-3">
            Caseload overview
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {metricCards.map((m) => (
              <Link
                key={m.label}
                to={m.href}
                className="group rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-blue-500 hover:bg-blue-50/50 dark:border-zinc-800 dark:bg-zinc-900/95 dark:hover:border-blue-500"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{m.label}</p>
                  <ArrowRight className="h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-600 dark:text-zinc-600 dark:group-hover:text-blue-400" />
                </div>
                <p className={`mt-1 text-3xl font-bold tracking-tight ${m.accent}`}>{m.value}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="staff-quick-actions">
        <h2 id="staff-quick-actions" className="text-lg font-bold text-zinc-900 dark:text-white">
          Quick actions
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {quickActions.map(({ label, description, href, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900/95 dark:hover:border-blue-500"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-zinc-800 dark:text-blue-400 dark:group-hover:bg-blue-500/20">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>
                <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">
                  {description}
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-600 dark:text-zinc-600 dark:group-hover:text-blue-400" />
            </Link>
          ))}
        </div>
      </section>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            {user?.role === 'commander' ? 'Recent incidents' : 'My recent cases'}
          </h2>
          <Link
            to="/staff/incidents"
            className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            All incidents →
          </Link>
        </div>
        {incidents === null ? (
          <Spinner />
        ) : recent.length === 0 ? (
          <Empty>No incidents assigned or matching right now.</Empty>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead className="text-left text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="p-2">Reference</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Severity</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Evidence</th>
                  <th className="p-2">Assigned</th>
                  <th className="p-2">Reported</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                  >
                    <td className="p-2">
                      <Link
                        className="font-mono font-semibold text-blue-700 underline dark:text-blue-400"
                        to={`/staff/cases/${r.id}`}
                      >
                        {r.reference}
                      </Link>
                      {r.isEmergency && <Badge className="ml-1 bg-red-600 text-white">SOS</Badge>}
                    </td>
                    <td className="p-2">{catLabel(r.category)}</td>
                    <td className="p-2">
                      <Badge className={SEVERITY[r.severity]?.cls ?? ''}>
                        {SEVERITY[r.severity]?.label ?? r.severity}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Badge className={STATUS[r.status]?.cls ?? ''}>
                        {STATUS[r.status]?.label ?? r.status}
                      </Badge>
                    </td>
                    <td className="p-2">{r.evidenceCount}</td>
                    <td className="p-2">
                      {r.assigneeCount || (
                        <span className="text-amber-700 dark:text-amber-400 font-semibold">
                          Unassigned
                        </span>
                      )}
                    </td>
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
          <div className="mr-auto">
            <h2 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              Evidence ledger
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Re-verify every hash link and signature in the ledger.
            </p>
          </div>
          {ledger && (
            <Badge
              className={
                ledger.ok ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
              }
            >
              {ledger.ok
                ? `✓ Intact · ${ledger.entries} entries`
                : `✗ Broken at #${ledger.brokenAt}: ${ledger.reason}`}
            </Badge>
          )}
          <Button
            variant="secondary"
            loading={ledgerLoading}
            onClick={() => void verifyLedger()}
          >
            Verify ledger
          </Button>
        </Card>
      )}
    </div>
  );
}

export function StaffIncidents() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<IncidentFilters>({
    status: '',
    category: '',
    severity: '',
  });
  const [search, setSearch] = useState('');
  const { incidents, error } = useStaffIncidents(filters);

  const visible = (incidents ?? []).filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${r.reference} ${catLabel(r.category)} ${r.status} ${r.severity}`
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-5">
      <PageHeader
        title={user?.role === 'commander' ? 'All incidents & cases' : 'My assigned cases'}
        description={
          user?.role === 'commander'
            ? 'Triage reports, filter by severity or category, and assign officers and investigators.'
            : 'Review cases assigned to you, examine authorized evidence, and message reporters.'
        }
      />

      {error && <Alert kind="error">{error.message}</Alert>}

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="flex flex-wrap items-end gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
          <label className="relative block flex-1 min-w-56 max-w-sm">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference or category"
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-black dark:text-white"
            />
          </label>
          {(['status', 'severity', 'category'] as const).map((k) => (
            <div key={k}>
              <label
                htmlFor={`f-${k}`}
                className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 capitalize mb-1"
              >
                {k}
              </label>
              <Select
                id={`f-${k}`}
                value={filters[k]}
                onChange={(e) => setFilters({ ...filters, [k]: e.target.value })}
                className="!min-h-10 !w-auto text-sm"
              >
                <option value="">All</option>
                {Object.entries(
                  k === 'status' ? STATUS : k === 'severity' ? SEVERITY : CATEGORY_LABELS,
                ).map(([v, o]) => (
                  <option key={v} value={v}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>

        {incidents === null ? (
          <div className="p-8 flex justify-center">
            <Spinner />
          </div>
        ) : visible.length === 0 ? (
          <Empty>No incidents match.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-black/30 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Evidence</th>
                  <th className="px-4 py-3">Assigned</th>
                  <th className="px-4 py-3">Reported</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        className="font-mono font-semibold text-blue-700 underline dark:text-blue-400"
                        to={`/staff/cases/${r.id}`}
                      >
                        {r.reference}
                      </Link>
                      {r.isEmergency && <Badge className="ml-1 bg-red-600 text-white">SOS</Badge>}
                    </td>
                    <td className="px-4 py-3">{catLabel(r.category)}</td>
                    <td className="px-4 py-3">
                      <Badge className={SEVERITY[r.severity]?.cls ?? ''}>
                        {SEVERITY[r.severity]?.label ?? r.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS[r.status]?.cls ?? ''}>
                        {STATUS[r.status]?.label ?? r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{r.evidenceCount}</td>
                    <td className="px-4 py-3">
                      {r.assigneeCount || (
                        <span className="text-amber-700 dark:text-amber-400 font-semibold">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function StaffSos() {
  const { alerts, actOnSos } = useActiveSos(true);
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-5">
      <PageHeader
        title="Emergency SOS responder console"
        description="Real-time SOS feed. Acknowledge alerts and record dispatches only after confirmation."
      />
      <SosPanel alerts={alerts} onAction={actOnSos} />
    </div>
  );
}

function SosPanel({
  alerts,
  onAction,
}: {
  alerts: SosAlertRecord[];
  onAction: (id: string, action: string, body?: unknown) => Promise<void>;
}) {
  const [busy, setBusy] = useState('');
  const [notifPerm, setNotifPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );

  const act = async (id: string, action: string, body?: unknown) => {
    setBusy(id + action);
    try {
      await onAction(id, action, body);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const pts = alerts
    .filter((a) => a.lat != null && a.lng != null)
    .map((a) => ({
      id: a.id,
      lat: a.lat!,
      lng: a.lng!,
      color: a.isTest ? '#64748b' : MARKER_COLORS.emergency,
      label: `${a.isTest ? 'TEST ' : ''}SOS ${a.reference}`,
    }));

  return (
    <Card className={alerts.some((a) => !a.isTest && ['sent', 'delivered'].includes(a.status)) ? 'border-2 border-sos' : ''}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h2 className="font-semibold text-lg text-sos mr-auto flex items-center gap-2">
          <Siren className="h-5 w-5" aria-hidden="true" />
          Emergency alerts ({alerts.length})
        </h2>
        {notifPerm === 'default' && (
          <Button
            variant="secondary"
            onClick={() => Notification.requestPermission().then(setNotifPerm)}
          >
            Enable desktop alerts
          </Button>
        )}
      </div>
      {alerts.length === 0 ? (
        <p className="text-slate-600 dark:text-zinc-400">
          No active emergencies. New alerts appear here instantly.
        </p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <ul className="space-y-2" aria-live="assertive">
            {alerts.map((a) => (
              <li
                key={a.id}
                className={`rounded-lg border p-3 ${
                  a.isTest
                    ? 'border-slate-300 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800/50'
                    : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {a.isTest && <Badge className="bg-slate-700 text-white">TEST</Badge>}
                  <span className="font-mono font-semibold">{a.reference}</span>
                  <Badge className="bg-white border text-zinc-900">
                    {SOS_STATUS[a.status]?.label ?? a.status}
                  </Badge>
                  <span className="ml-auto text-xs text-slate-600 dark:text-zinc-400">
                    {fmtDate(a.createdAt)}
                  </span>
                </div>
                <p className="mt-1 font-medium capitalize">
                  {a.emergencyType.replaceAll('_', ' ')}
                </p>
                <p className="text-sm">
                  {a.lat != null && a.lng != null ? (
                    <>
                      📍 {a.lat.toFixed(5)}, {a.lng.toFixed(5)} (±{a.accuracyM ?? '?'} m,{' '}
                      {a.locationSource === 'gps' ? 'live GPS' : 'LAST KNOWN location'}) ·{' '}
                      <a
                        className="underline font-medium"
                        target="_blank"
                        rel="noreferrer"
                        href={`https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}`}
                      >
                        Directions
                      </a>
                    </>
                  ) : (
                    '⚠ No location shared'
                  )}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['sent', 'delivered'].includes(a.status) && (
                    <Button
                      className="!min-h-9 text-sm"
                      loading={busy === a.id + 'acknowledge'}
                      onClick={() => void act(a.id, 'acknowledge')}
                    >
                      Acknowledge
                    </Button>
                  )}
                  {a.status !== 'dispatched' && (
                    <Button
                      className="!min-h-9 text-sm"
                      variant="danger"
                      onClick={() => {
                        const note = prompt('Who was dispatched? e.g. "Patrol unit 7, ETA 6 min"');
                        if (note) void act(a.id, 'dispatch', { note });
                      }}
                    >
                      Confirm dispatch
                    </Button>
                  )}
                  <Button
                    className="!min-h-9 text-sm"
                    variant="secondary"
                    onClick={() => confirm('Mark this emergency resolved?') && void act(a.id, 'resolve')}
                  >
                    Resolve
                  </Button>
                  <Link
                    to={`/staff/cases/${a.incidentId}`}
                    className="text-sm underline self-center text-blue-700 dark:text-blue-400"
                  >
                    Open case &amp; messages
                  </Link>
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
  const { incidents } = useStaffIncidents();
  const [cat, setCat] = useState('');
  const [sev, setSev] = useState('');
  const [days, setDays] = useState('30');

  const rows = incidents ?? [];
  const since = Date.now() - Number(days) * 86400_000;
  const pts = rows
    .filter(
      (r) =>
        r.lat != null &&
        r.lng != null &&
        (!cat || r.category === cat) &&
        (!sev || r.severity === sev) &&
        (days === 'all' || new Date(r.createdAt).getTime() >= since),
    )
    .map((r) => ({
      id: r.id,
      lat: r.lat!,
      lng: r.lng!,
      color: colorFor(r),
      label: `${r.reference} · ${catLabel(r.category)} · ${STATUS[r.status]?.label ?? r.status}`,
      onClick: () => nav(`/staff/cases/${r.id}`),
    }));

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Incident map"
        description="Click a marker to open the case. Only incidents you are authorised to see are shown."
      />
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label htmlFor="m-cat" className="block text-xs font-medium mb-1">
            Category
          </label>
          <Select
            id="m-cat"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="!min-h-10 !w-auto text-sm"
          >
            <option value="">All</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="m-sev" className="block text-xs font-medium mb-1">
            Severity
          </label>
          <Select
            id="m-sev"
            value={sev}
            onChange={(e) => setSev(e.target.value)}
            className="!min-h-10 !w-auto text-sm"
          >
            <option value="">All</option>
            {Object.entries(SEVERITY).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="m-days" className="block text-xs font-medium mb-1">
            Period
          </label>
          <Select
            id="m-days"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="!min-h-10 !w-auto text-sm"
          >
            <option value="1">24 hours</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="all">All time</option>
          </Select>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 self-center">{pts.length} shown</p>
      </div>
      <MapLegend />
      <MapView points={pts} height={560} label="Incident map" />
    </div>
  );
}

export function StaffLedger() {
  const { ledger, ledgerLoading, verifyLedger } = useStaffIncidents();

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-5">
      <PageHeader
        title="Evidence integrity ledger"
        description="Re-verify every SHA-256 hash link and signature across the append-only evidence ledger."
      />
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              Ledger verification
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Detects any alteration, deletion, or reordering of stored evidence records.
            </p>
          </div>
          <Button loading={ledgerLoading} onClick={() => void verifyLedger()}>
            Run full verification
          </Button>
        </div>
        {ledger && (
          <Alert kind={ledger.ok ? 'success' : 'error'} title={ledger.ok ? 'Ledger intact' : 'Integrity failure detected'}>
            {ledger.ok
              ? `Verified ${ledger.entries} ledger entries with zero discrepancies.`
              : `Broken at entry #${ledger.brokenAt}: ${ledger.reason}`}
          </Alert>
        )}
      </Card>
    </div>
  );
}
