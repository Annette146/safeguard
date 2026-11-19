import { useEffect, useState } from 'react';
import { api, setAccessToken } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Alert, Button, Card, Field, Input, PageTitle } from '../components/ui';

export function Profile() {
  const { user, setUser } = useAuth();
  return (
    <div className="max-w-2xl space-y-4">
      <PageTitle sub={user?.email}>{user?.fullName}</PageTitle>
      {user?.role === 'citizen' && <EmergencyContacts />}
      {user?.role === 'citizen' && <SosSetupGuide />}
      <MfaSetup enabled={!!user?.mfaEnabled} onEnabled={() => user && setUser({ ...user, mfaEnabled: true })} />
    </div>
  );
}

function EmergencyContacts() {
  const [rows, setRows] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [config, setConfig] = useState<any>(null);
  const load = () => api('GET', '/api/auth/contacts').then(setRows);
  useEffect(() => { load(); api('GET', '/api/config').then(setConfig); }, []);
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try { await api('POST', '/api/auth/contacts', { body: { name, phone, notifyOnSos: true } }); setName(''); setPhone(''); load(); }
    catch (err) { setError((err as Error).message); }
  };
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold text-lg">Trusted emergency contacts</h2>
      <p className="text-sm text-slate-700">When you raise an SOS, SAFEGUARD can text these people your reference number and location. Their numbers are stored encrypted and never shown to anyone else.</p>
      {config?.integrations?.sms === 'not_configured' && <Alert kind="warning">SMS sending is not set up on this server yet, so contacts will <strong>not</strong> be notified automatically. The SOS screen will tell you and offer a manual SMS link instead.</Alert>}
      <ul className="divide-y divide-slate-200">
        {rows.map((r) => (
          <li key={r.id} className="py-2 flex items-center justify-between">
            <span>{r.name} · <span className="text-slate-600">{r.phone}</span></span>
            <Button variant="ghost" onClick={async () => { await api('DELETE', `/api/auth/contacts/${r.id}`); load(); }}>Remove<span className="sr-only"> {r.name}</span></Button>
          </li>
        ))}
      </ul>
      {rows.length < 5 && (
        <form onSubmit={add} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <Field label="Name">{(id) => <Input id={id} required value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          <Field label="Phone">{(id) => <Input id={id} required type="tel" placeholder="+2547…" value={phone} onChange={(e) => setPhone(e.target.value)} />}</Field>
          <Button>Add</Button>
        </form>
      )}
      {error && <Alert kind="error">{error}</Alert>}
    </Card>
  );
}

function SosSetupGuide() {
  const ua = navigator.userAgent;
  const platform = /iPhone|iPad/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'other';
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold text-lg">Set up fast emergency access</h2>
      <p className="text-sm text-slate-700">Phone makers don't let apps take over the power button while the phone is locked. So the quickest option without unlocking is your phone's <strong>built-in emergency SOS</strong>. Set it up as well as SAFEGUARD:</p>
      {platform !== 'android' && (
        <div>
          <h3 className="font-semibold">iPhone</h3>
          <ol className="list-decimal ml-5 text-sm space-y-1">
            <li>Settings → Emergency SOS → turn on <strong>Call with Hold and Release</strong> and/or <strong>Call with 5 Button Presses</strong>.</li>
            <li>Add emergency contacts in the Health app → Medical ID. iOS texts them your location after an SOS call.</li>
            <li>For SAFEGUARD: open the <strong>SOS page</strong> in Safari → Share → <strong>Add to Home Screen</strong>. You get a one-tap SOS icon (the phone must be unlocked).</li>
          </ol>
        </div>
      )}
      {platform !== 'ios' && (
        <div>
          <h3 className="font-semibold">Android</h3>
          <ol className="list-decimal ml-5 text-sm space-y-1">
            <li>Settings → Safety & emergency → <strong>Emergency SOS</strong> → turn on (press the power button 5 times). On Samsung: Settings → Safety and emergency → Emergency SOS.</li>
            <li>Set your emergency number to 999 or 112 and add emergency contacts there.</li>
            <li>For SAFEGUARD: Chrome menu → <strong>Install app</strong> / Add to Home screen, then long-press the icon and drag the "SOS" shortcut to your home screen.</li>
          </ol>
        </div>
      )}
      <p className="text-sm text-slate-700"><strong>Test safely:</strong> on the SOS page, tick "Send a test alert". It's labelled TEST for responders and no one is dispatched.</p>
    </Card>
  );
}

function MfaSetup({ enabled, onEnabled }: { enabled: boolean; onEnabled: () => void }) {
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold text-lg">Two-step verification</h2>
      {enabled || done ? <Alert kind="success">Two-step verification is on. You'll be asked for a code from your authenticator app when you sign in.</Alert> : !setup ? (
        <>
          <p className="text-sm text-slate-700">Protect your account with a code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy…). Required for police, investigator and admin accounts.</p>
          <Button variant="secondary" onClick={async () => { try { setSetup(await api('POST', '/api/auth/mfa/setup')); } catch (e) { setError((e as Error).message); } }}>Set up two-step verification</Button>
        </>
      ) : (
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault(); setError('');
          try { const r = await api('POST', '/api/auth/mfa/enable', { body: { code } }); setAccessToken(r.accessToken); setDone(true); onEnabled(); }
          catch (err) { setError((err as Error).message); }
        }}>
          <p className="text-sm">In your authenticator app choose "Enter a setup key" and type this key:</p>
          <p className="font-mono text-lg bg-slate-100 rounded p-2 break-all select-all">{setup.secret}</p>
          <p className="text-sm"><a href={setup.otpauthUri} className="underline">Or open it in an authenticator app on this device</a></p>
          <Field label="6-digit code from the app">{(id) => <Input id={id} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />}</Field>
          <Button>Turn on</Button>
        </form>
      )}
      {error && <Alert kind="error">{error}</Alert>}
    </Card>
  );
}
