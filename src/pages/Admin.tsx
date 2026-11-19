import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  Activity,
  ArrowRight,
  Ban,
  Building2,
  CheckCircle2,
  Clock3,
  Lock,
  Plus,
  RefreshCw,
  ScrollText,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users as UsersIcon,
} from 'lucide-react';
import { useAuth, type Role } from '../auth/AuthProvider';
import { fmtDate } from '../lib/labels';
import { adminQuickActions } from '../Data/Navitems';
import { useAdminOverview } from '../hooks/useAdminOverview';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { useAdminDepartments } from '../hooks/useAdminDepartments';
import { useAdminAuditLogs } from '../hooks/useAdminAuditLogs';
import { PageHeader } from '../components/PageHeader';
import { AdminActionDialog } from '../components/AdminActionDialog';
import { Alert, Badge, Button, Card, Field, Input, Select, Spinner } from '../components/ui';
import type {
  AdminActionBody,
  AdminUserRecord,
  CreateStaffPayload,
  UserAccountStatus,
} from '../types/safeguardTypes';

type PendingUserAction =
  | { kind: 'role'; user: AdminUserRecord; nextRole: Role }
  | { kind: 'status'; user: AdminUserRecord; nextStatus: UserAccountStatus; label: string };

export function AdminOverview() {
  const { user } = useAuth();
  const { overview, loading, error, refetch } = useAdminOverview();
  const { users, loading: usersLoading } = useAdminUsers();

  const metricCards = [
    {
      label: 'Total accounts',
      value: usersLoading ? '—' : users.length.toLocaleString(),
      href: '/admin/users',
      warn: false,
    },
    {
      label: 'Locked accounts',
      value: loading || !overview ? '—' : overview.lockedAccounts.toLocaleString(),
      href: '/admin/suspended',
      warn: !!overview && overview.lockedAccounts > 0,
    },
    {
      label: 'Denied requests (24h)',
      value: loading || !overview ? '—' : overview.deniedLast24h.toLocaleString(),
      href: '/admin/audit-logs',
      warn: !!overview && overview.deniedLast24h > 20,
    },
    {
      label: 'Staff without MFA',
      value: loading || !overview ? '—' : overview.staffWithoutMfa.toLocaleString(),
      href: '/admin/users',
      warn: !!overview && overview.staffWithoutMfa > 0,
    },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      <section className="rounded-2xl border border-blue-700 bg-blue-600 p-6 text-white shadow-lg shadow-blue-200/60 sm:p-8 dark:border-blue-500/40 dark:bg-zinc-900/95 dark:shadow-none">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-100">
              <Activity className="h-4 w-4" aria-hidden="true" /> Admin control panel
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {user?.fullName.split(' ')[0] ?? 'Admin'}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100 sm:text-base dark:text-zinc-300">
              Manage institutional accounts, departments, and security monitoring. Separation of
              duties is enforced: administrators cannot open case content, evidence, or reporter
              identities.
            </p>
          </div>
          <Link
            to="/admin/users"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400"
          >
            Manage users <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {error && <Alert kind="error">{error.message}</Alert>}

      <section aria-labelledby="platform-overview">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="platform-overview" className="text-lg font-bold text-zinc-900 dark:text-white">
              Platform &amp; security overview
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Evidence integrity, security events, and service health at a glance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <Link
            to="/admin/settings"
            className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-blue-500 hover:shadow-lg hover:shadow-blue-100/70 dark:border-zinc-800 dark:bg-zinc-900/95 dark:hover:border-blue-500 dark:hover:shadow-none sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Evidence ledger &amp; runtime
              </p>
              <ArrowRight className="h-5 w-5 text-zinc-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-600 dark:text-zinc-600 dark:group-hover:text-blue-400" />
            </div>
            <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
              {loading || !overview
                ? '—'
                : overview.ledger.ok
                  ? `Intact · ${overview.ledger.entries} entries`
                  : `Broken at #${overview.ledger.brokenAt}`}
            </p>
            <span
              className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                !overview
                  ? 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  : overview.ledger.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400'
                    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-400'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {overview?.ledger.name ?? 'Checking ledger…'}
            </span>
            <div className="my-5 border-t border-zinc-200 dark:border-zinc-800" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Incidents</p>
                <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                  {overview ? overview.incidents.toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Evidence items</p>
                <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                  {overview ? overview.evidenceItems.toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Failed logins (24h)</p>
                <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                  {overview ? overview.failedLoginsLast24h.toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Uptime</p>
                <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                  {overview
                    ? `${Math.floor(overview.uptimeSec / 3600)}h ${Math.floor((overview.uptimeSec % 3600) / 60)}m`
                    : '—'}
                </p>
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {metricCards.map(({ label, value, href, warn }) => (
              <Link
                key={label}
                to={href}
                className="group rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-blue-500 hover:bg-blue-50/50 dark:border-zinc-800 dark:bg-zinc-900/95 dark:hover:border-blue-500 dark:hover:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
                  <ArrowRight className="h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-600 dark:text-zinc-600 dark:group-hover:text-blue-400" />
                </div>
                <p
                  className={`mt-1 text-2xl font-bold tracking-tight ${
                    warn ? 'text-red-600 dark:text-red-400' : 'text-zinc-950 dark:text-white'
                  }`}
                >
                  {value}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="text-lg font-bold text-zinc-900 dark:text-white">
          Quick actions
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {adminQuickActions.map(({ label, description, href, icon: Icon }) => (
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
    </div>
  );
}

export function AdminUsers() {
  const { user: me } = useAuth();
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [pending, setPending] = useState<PendingUserAction | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState<CreateStaffPayload>({
    email: '',
    fullName: '',
    role: 'officer',
    departmentId: null,
    badgeNumber: '',
    temporaryPassword: '',
    status: 'pending_verification',
  });

  const { users, departments, loading, error, createUser, updateUser } = useAdminUsers(roleFilter);

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${u.fullName} ${u.email} ${u.badgeNumber ?? ''} ${u.department ?? ''}`
      .toLowerCase()
      .includes(q);
  });

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await createUser({
        ...form,
        departmentId: form.departmentId || null,
        badgeNumber: form.badgeNumber?.trim() || undefined,
      });
      setMsg({
        kind: 'success',
        text: `Account created for ${form.email}. Share the temporary password through a secure channel.`,
      });
      setForm({
        ...form,
        email: '',
        fullName: '',
        badgeNumber: '',
        temporaryPassword: '',
      });
      setShowCreate(false);
    } catch (err) {
      setMsg({ kind: 'error', text: (err as Error).message });
    }
  };

  const confirmPendingAction = async (body: AdminActionBody) => {
    if (!pending) return;
    if (pending.kind === 'role') {
      await updateUser(pending.user.id, { role: pending.nextRole }, body);
      setMsg({
        kind: 'success',
        text: `Updated ${pending.user.fullName}'s role to ${pending.nextRole}. Sessions and assignments revoked.`,
      });
    } else {
      await updateUser(pending.user.id, { status: pending.nextStatus }, body);
      setMsg({
        kind: 'success',
        text: `Updated ${pending.user.fullName}'s status to ${pending.nextStatus.replaceAll('_', ' ')}.`,
      });
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-5">
      <PageHeader
        title="Users & access"
        description="Search accounts, create verified staff logins, and manage roles or suspensions."
        action={
          <Button type="button" onClick={() => setShowCreate((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {showCreate ? 'Close form' : 'Create staff account'}
          </Button>
        }
      />

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {error && <Alert kind="error">{error.message}</Alert>}

      {showCreate && (
        <Card>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3">
            Create staff account
          </h2>
          <form className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end" onSubmit={handleCreate}>
            <Field label="Full name">
              {(id) => (
                <Input
                  id={id}
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              )}
            </Field>
            <Field label="Work email">
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              )}
            </Field>
            <Field label="Role">
              {(id) => (
                <Select
                  id={id}
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as CreateStaffPayload['role'] })
                  }
                >
                  <option value="officer">Police officer</option>
                  <option value="commander">Commanding officer</option>
                  <option value="investigator">Investigator</option>
                  <option value="admin">Administrator</option>
                </Select>
              )}
            </Field>
            <Field label="Department">
              {(id) => (
                <Select
                  id={id}
                  value={form.departmentId ?? ''}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value || null })}
                >
                  <option value="">—</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Badge / service no.">
              {(id) => (
                <Input
                  id={id}
                  value={form.badgeNumber ?? ''}
                  onChange={(e) => setForm({ ...form, badgeNumber: e.target.value })}
                />
              )}
            </Field>
            <Field label="Temporary password (12+ chars)">
              {(id) => (
                <Input
                  id={id}
                  type="text"
                  required
                  minLength={12}
                  value={form.temporaryPassword}
                  onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })}
                  autoComplete="off"
                />
              )}
            </Field>
            <Field label="Initial status">
              {(id) => (
                <Select
                  id={id}
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as CreateStaffPayload['status'] })
                  }
                >
                  <option value="pending_verification">Pending institutional verification</option>
                  <option value="active">Active (verified)</option>
                </Select>
              )}
            </Field>
            <Button type="submit">Create account</Button>
          </form>
        </Card>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
          <label className="relative block flex-1 min-w-60 max-w-sm">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, badge or department"
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-black dark:text-white dark:focus:ring-blue-500/20"
            />
          </label>
          <div className="flex items-center gap-2">
            <label htmlFor="rf" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Role
            </label>
            <Select
              id="rf"
              className="!w-auto !min-h-10 text-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All roles</option>
              {(['citizen', 'officer', 'commander', 'investigator', 'admin'] as const).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-black/30 dark:text-zinc-400">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">MFA</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-zinc-500 dark:text-zinc-400">
                      No matching accounts found.
                    </td>
                  </tr>
                )}
                {filtered.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {u.fullName}
                          {u.badgeNumber && (
                            <span className="ml-1.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                              ({u.badgeNumber})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{u.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <label className="sr-only" htmlFor={`role-${u.id}`}>
                          Role for {u.fullName}
                        </label>
                        <select
                          id={`role-${u.id}`}
                          disabled={isSelf}
                          value={u.role}
                          onChange={(e) =>
                            setPending({
                              kind: 'role',
                              user: u,
                              nextRole: e.target.value as Role,
                            })
                          }
                          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        >
                          {(['citizen', 'officer', 'commander', 'investigator', 'admin'] as const).map(
                            (r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ),
                          )}
                        </select>
                      </td>
                      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-300">
                        {u.department ?? '—'}
                      </td>
                      <td className="px-5 py-4">
                        {u.mfaEnabled ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400">
                            On
                          </Badge>
                        ) : (
                          <Badge
                            className={
                              u.role !== 'citizen'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                            }
                          >
                            Off
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          className={
                            u.status === 'suspended'
                              ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300'
                              : u.status === 'pending_verification'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                          }
                        >
                          {u.status.replaceAll('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {!isSelf && u.status === 'pending_verification' && (
                            <button
                              type="button"
                              onClick={() =>
                                setPending({
                                  kind: 'status',
                                  user: u,
                                  nextStatus: 'active',
                                  label: 'Verify account',
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                              Verify
                            </button>
                          )}
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() =>
                                setPending({
                                  kind: 'status',
                                  user: u,
                                  nextStatus: u.status === 'suspended' ? 'active' : 'suspended',
                                  label: u.status === 'suspended' ? 'Reinstate' : 'Suspend',
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:border-blue-500 hover:text-blue-600 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-blue-400 dark:hover:text-blue-400"
                            >
                              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                              {u.status === 'suspended' ? 'Reinstate' : 'Suspend'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pending && (
        <AdminActionDialog
          title={
            pending.kind === 'role'
              ? `Change ${pending.user.fullName}'s role to ${pending.nextRole}`
              : `${pending.label} · ${pending.user.fullName}`
          }
          description={
            pending.kind === 'role'
              ? 'Changing a role takes effect immediately and revokes existing sessions and case assignments.'
              : 'Provide an administrative reason before updating account status.'
          }
          onClose={() => setPending(null)}
          onConfirm={confirmPendingAction}
        />
      )}
    </div>
  );
}

export function AdminSuspended() {
  const { user: me } = useAuth();
  const { users, loading, error, updateUser } = useAdminUsers();
  const [pending, setPending] = useState<{
    user: AdminUserRecord;
    nextStatus: UserAccountStatus;
    label: string;
  } | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const flagged = users.filter((u) => u.status === 'suspended' || u.status === 'pending_verification');

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-5">
      <PageHeader
        title="Suspends & pending verification"
        description="Review suspended accounts and staff awaiting institutional verification."
      />
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {error && <Alert kind="error">{error.message}</Alert>}

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/95">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-black/30 dark:text-zinc-400">
                <tr>
                  <th className="px-5 py-3">Account</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {flagged.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-2">
                        <Ban className="h-4 w-4" aria-hidden="true" /> No suspended or pending
                        accounts right now.
                      </span>
                    </td>
                  </tr>
                )}
                {flagged.map((u) => (
                  <tr key={u.id} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-zinc-900 dark:text-white">{u.fullName}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{u.email}</p>
                    </td>
                    <td className="px-5 py-4 capitalize text-zinc-700 dark:text-zinc-300">
                      {u.role}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        className={
                          u.status === 'suspended'
                            ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                        }
                      >
                        {u.status.replaceAll('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {u.id !== me?.id && (
                        <button
                          type="button"
                          onClick={() =>
                            setPending({
                              user: u,
                              nextStatus: 'active',
                              label: u.status === 'suspended' ? 'Reinstate account' : 'Verify account',
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          {u.status === 'suspended' ? 'Reinstate' : 'Verify'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pending && (
        <AdminActionDialog
          title={`${pending.label} · ${pending.user.fullName}`}
          onClose={() => setPending(null)}
          onConfirm={async (body) => {
            await updateUser(pending.user.id, { status: pending.nextStatus }, body);
            setMsg({
              kind: 'success',
              text: `${pending.user.fullName} is now active.`,
            });
          }}
        />
      )}
    </div>
  );
}

export function AdminDepartments() {
  const { departments, loading, error, createDepartment } = useAdminDepartments();
  const [name, setName] = useState('');
  const [kind, setKind] = useState('police');
  const [err, setErr] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await createDepartment(name.trim(), kind);
      setName('');
    } catch (er) {
      setErr((er as Error).message);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-5">
      <PageHeader
        title="Departments & institutions"
        description="Manage participating police units, emergency responders, investigators, and institutional offices."
      />
      {error && <Alert kind="error">{error.message}</Alert>}
      {err && <Alert kind="error">{err}</Alert>}

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          Add department
        </h2>
        <form className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end" onSubmit={handleSubmit}>
          <Field label="New department">
            {(id) => (
              <Input
                id={id}
                required
                placeholder="e.g. Kilimani Police Station"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>
          <Field label="Type">
            {(id) => (
              <Select id={id} value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="police">Police</option>
                <option value="emergency">Emergency</option>
                <option value="investigations">Investigations</option>
                <option value="institution">Institution</option>
              </Select>
            )}
          </Field>
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/95">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Spinner />
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {departments.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No departments registered yet.
              </li>
            )}
            {departments.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-5 py-3.5">
                <span className="font-medium text-zinc-900 dark:text-white">{d.name}</span>
                <Badge className="bg-blue-50 text-blue-700 capitalize dark:bg-blue-500/15 dark:text-blue-400">
                  {d.kind}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function AdminAuditLogs() {
  const [outcome, setOutcome] = useState('');
  const { logs, loading, error, refetch } = useAdminAuditLogs(outcome);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-5">
      <PageHeader
        title="Audit logs"
        description="Append-only security & administrative events. Evidence and reporter-identity access purposes are redacted for administrators."
        action={
          <Button type="button" variant="secondary" onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
          </Button>
        }
      />

      {error && <Alert kind="error">{error.message}</Alert>}

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            Showing {logs.length} event(s)
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="oc" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Outcome
            </label>
            <Select
              id="oc"
              className="!w-auto !min-h-10 text-sm"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              <option value="">All</option>
              <option value="denied">Denied (security alerts)</option>
              <option value="failure">Failures</option>
              <option value="success">Success</option>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-xs">
              <thead className="bg-zinc-50 uppercase text-zinc-500 dark:bg-black/30 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      No audit records match this filter.
                    </td>
                  </tr>
                )}
                {logs.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-t border-zinc-100 dark:border-zinc-800 ${
                      r.outcome === 'denied'
                        ? 'bg-red-50/70 dark:bg-red-950/25'
                        : r.outcome === 'failure'
                          ? 'bg-amber-50/70 dark:bg-amber-950/25'
                          : ''
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                      {fmtDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200">
                      {r.actor ?? 'anonymous'}
                      {r.actorRole && ` (${r.actorRole})`}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-900 dark:text-zinc-100">
                      {r.action}
                    </td>
                    <td className="px-4 py-3 font-semibold">{r.outcome}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {r.targetType ? `${r.targetType}:${String(r.targetId ?? '').slice(0, 8)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{r.ip ?? '—'}</td>
                    <td className="px-4 py-3 max-w-64 truncate text-zinc-600 dark:text-zinc-400" title={r.detail ?? ''}>
                      {r.detail ?? '—'}
                    </td>
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

export function AdminSettings() {
  const { overview, config, loading, error } = useAdminOverview();
  const integrations = Object.entries(config?.integrations ?? {});

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-5">
      <PageHeader
        title="Platform configuration & health"
        description="Emergency numbers, external integration status, and server health metrics."
      />
      {error && <Alert kind="error">{error.message}</Alert>}

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              System health &amp; ledger
            </h2>
            {overview && (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <dt className="text-zinc-500 dark:text-zinc-400">Uptime</dt>
                  <dd className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                    {Math.floor(overview.uptimeSec / 3600)}h {Math.floor((overview.uptimeSec % 3600) / 60)}m
                  </dd>
                </div>
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <dt className="text-zinc-500 dark:text-zinc-400">Memory usage</dt>
                  <dd className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                    {overview.memoryMb} MB
                  </dd>
                </div>
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <dt className="text-zinc-500 dark:text-zinc-400">Failed logins (24h)</dt>
                  <dd className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                    {overview.failedLoginsLast24h}
                  </dd>
                </div>
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <dt className="text-zinc-500 dark:text-zinc-400">Denied requests (24h)</dt>
                  <dd className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                    {overview.deniedLast24h}
                  </dd>
                </div>
              </dl>
            )}
            {overview && (
              <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Ledger adapter: {overview.ledger.name ?? 'Local hash chain'}
                </p>
                <Badge
                  className={
                    overview.ledger.ok
                      ? 'bg-emerald-100 text-emerald-900 mt-2 dark:bg-emerald-500/15 dark:text-emerald-400'
                      : 'bg-red-100 text-red-900 mt-2 dark:bg-red-500/15 dark:text-red-400'
                  }
                >
                  {overview.ledger.ok
                    ? `✓ Intact · ${overview.ledger.entries} entries`
                    : `✗ Broken at #${overview.ledger.brokenAt}: ${overview.ledger.reason}`}
                </Badge>
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                Emergency &amp; integration configuration
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                External integrations report their real server status honestly (`not_configured`
                until credentials are provisioned).
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Configured emergency numbers
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(config?.emergencyNumbers ?? ['999', '112']).map((n) => (
                  <Badge
                    key={n}
                    className="bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300"
                  >
                    {n}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                External services
              </p>
              {integrations.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  No integration status map returned by `/api/config`.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                  {integrations.map(([key, status]) => (
                    <li key={key} className="flex items-center justify-between px-3 py-2.5 text-sm">
                      <span className="font-medium uppercase text-zinc-800 dark:text-zinc-200">
                        {key.replaceAll('_', ' ')}
                      </span>
                      <Badge
                        className={
                          status === 'configured'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                        }
                      >
                        {status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/** Backwards-compatible default export for `/admin`. */
export function Admin() {
  return <AdminOverview />;
}
