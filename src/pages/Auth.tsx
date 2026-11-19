import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { Alert, Button, Card, Field, Input, PageTitle } from '../components/ui';

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needTotp, setNeedTotp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const u = await login(email, password, needTotp ? totp : undefined);
      nav(params.get('next') ?? (u.role === 'citizen' ? '/' : u.role === 'admin' ? '/admin' : '/staff'), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'mfa_code_required') setNeedTotp(true);
      else setError((err as Error).message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto">
      <PageTitle sub="Citizens, police officers, investigators and administrators all sign in here.">Sign in</PageTitle>
      <Card>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="Email">{(id) => <Input id={id} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Field label="Password">{(id) => <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
          {needTotp && (
            <Field label="Authentication code" hint="Open your authenticator app and enter the 6-digit code for SAFEGUARD.">
              {(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={totp} onChange={(e) => setTotp(e.target.value.replace(/\D/g, ''))} />}
            </Field>
          )}
          <Button className="w-full" loading={loading}>Sign in</Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-slate-700">No account? <Link to="/register" className="font-semibold underline text-brand-700">Create one</Link> or <Link to="/report?mode=anonymous" className="font-semibold underline text-brand-700">report anonymously</Link>.</p>
      <p className="mt-2 text-center text-sm text-slate-600">Police and investigator accounts are created by your institution's administrator.</p>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (f.fullName.trim().length < 2) errs.fullName = 'Enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) errs.email = 'Enter a valid email address, like name@example.com.';
    if (f.password.length < 10) errs.password = 'Use at least 10 characters. A short phrase is easiest to remember.';
    if (f.password !== f.confirm) errs.confirm = 'The passwords do not match.';
    if (!agree) errs.agree = 'Please confirm you have read how we handle your data.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true); setError('');
    try {
      await register({ fullName: f.fullName, email: f.email, password: f.password, phone: f.phone || undefined });
      nav('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto">
      <PageTitle sub="An account lets you follow all your reports and message investigators. You can still report anonymously at any time.">Create account</PageTitle>
      <Card>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="Full name" error={errors.fullName}>{(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.fullName} autoComplete="name" value={f.fullName} onChange={set('fullName')} />}</Field>
          <Field label="Email" error={errors.email}>{(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.email} type="email" autoComplete="email" value={f.email} onChange={set('email')} />}</Field>
          <Field label="Phone number (optional)" hint="Only shown to officers assigned to your reports.">{(id, d) => <Input id={id} aria-describedby={d} type="tel" autoComplete="tel" placeholder="+254 7XX XXX XXX" value={f.phone} onChange={set('phone')} />}</Field>
          <Field label="Password" hint="At least 10 characters." error={errors.password}>{(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.password} type="password" autoComplete="new-password" value={f.password} onChange={set('password')} />}</Field>
          <Field label="Confirm password" error={errors.confirm}>{(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.confirm} type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} />}</Field>
          <div>
            <label className="flex gap-3 items-start">
              <input type="checkbox" className="h-5 w-5 mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>I have read <Link to="/help" target="_blank" className="underline font-semibold">how SAFEGUARD handles my data</Link>.</span>
            </label>
            {errors.agree && <p className="text-sm font-medium text-red-700 mt-1">⚠ {errors.agree}</p>}
          </div>
          <Button className="w-full" loading={loading}>Create account</Button>
        </form>
      </Card>
      <p className="mt-4 text-center">Already registered? <Link to="/login" className="font-semibold underline text-brand-700">Sign in</Link></p>
    </div>
  );
}
