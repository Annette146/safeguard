import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, uploadWithProgress } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { CATEGORY_LABELS, SEVERITY, fmtBytes } from '../lib/labels';
import { Alert, Button, Card, Field, Input, Select, Textarea, LinkButton } from '../components/ui';
import { MapView, LocationSearch, getPosition } from '../components/MapView';
import { EvidenceCapture, type EvidenceItem } from '../components/EvidenceCapture';

const STEPS = ['How to report', 'What happened', 'Details', 'Location', 'Evidence', 'Review'];

interface Form {
  mode: 'anonymous' | 'identified'; category: string; severity: string; description: string; occurredAt: string;
  lat: number | null; lng: number | null; locationText: string; locationSource: 'gps' | 'map' | 'text' | 'none';
  contact: string; preferredContact: 'in_app' | 'phone' | 'email' | 'none';
}

export function ReportWizard() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>({
    mode: params.get('mode') === 'identified' && user ? 'identified' : 'anonymous', category: '', severity: 'medium', description: '',
    occurredAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    lat: null, lng: null, locationText: '', locationSource: 'none', contact: '', preferredContact: 'in_app',
  });
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [gps, setGps] = useState<{ state: 'idle' | 'loading' | 'error'; msg?: string }>({ state: 'idle' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [progress, setProgress] = useState<Record<string, number | 'done' | 'failed'>>({});
  const [result, setResult] = useState<{ id: string; reference: string; trackingCode: string | null } | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  const validateStep = () => {
    const e: Record<string, string> = {};
    if (step === 0 && f.mode === 'identified' && !user) e.mode = 'Sign in first to report with your identity, or choose anonymous.';
    if (step === 1 && !f.category) e.category = 'Choose the option that best matches what happened. Pick "Other" if unsure.';
    if (step === 2 && f.description.trim().length < 10) e.description = 'Describe what happened in at least a sentence (10+ characters).';
    if (step === 2 && f.occurredAt && new Date(f.occurredAt) > new Date(Date.now() + 5 * 60000)) e.occurredAt = 'The date and time cannot be in the future.';
    if (step === 3 && f.lat == null && !f.locationText.trim()) e.location = 'Share your location, tap the map, or type where it happened.';
    setErrors(e);
    return !Object.keys(e).length;
  };
  const next = () => { if (validateStep()) { setStep((s) => s + 1); window.scrollTo(0, 0); } };
  const back = () => { setErrors({}); setStep((s) => s - 1); window.scrollTo(0, 0); };

  const useGps = async () => {
    setGps({ state: 'loading' });
    try {
      const p = await getPosition();
      setF((x) => ({ ...x, lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), locationSource: 'gps' }));
      setGps({ state: 'idle', msg: `Location found (accuracy about ${Math.round(p.coords.accuracy)} m).` });
    } catch (e) { setGps({ state: 'error', msg: (e as Error).message }); }
  };

  const uploadAll = async (id: string, code: string | null, items: EvidenceItem[]) => {
    for (const it of items) {
      if (progress[it.key] === 'done') continue;
      const form = new FormData();
      form.append('file', it.blob, it.name);
      form.append('captureMethod', it.captureMethod);
      if (it.description) form.append('description', it.description);
      if (it.capturedAt) form.append('capturedAt', it.capturedAt);
      try {
        await uploadWithProgress(`/api/incidents/${id}/evidence`, form, code ? { 'x-tracking-code': code } : {},
          (pct) => setProgress((p) => ({ ...p, [it.key]: pct })));
        setProgress((p) => ({ ...p, [it.key]: 'done' }));
      } catch (e) {
        setProgress((p) => ({ ...p, [it.key]: 'failed' }));
        setSubmitError(`${it.name}: ${(e as Error).message}`);
      }
    }
  };

  const submit = async () => {
    setSubmitting(true); setSubmitError('');
    try {
      const r: { id: string; reference: string; trackingCode: string | null } = result ?? await api('POST', '/api/incidents', { body: {
        mode: f.mode, category: f.category, severity: f.severity, description: f.description,
        occurredAt: f.occurredAt ? new Date(f.occurredAt).toISOString() : null,
        lat: f.lat, lng: f.lng, locationText: f.locationText || undefined, locationSource: f.lat != null ? f.locationSource : f.locationText ? 'text' : 'none',
        contact: f.mode === 'identified' ? f.contact || undefined : undefined, preferredContact: f.preferredContact,
      } });
      setResult(r);
      await uploadAll(r.id, r.trackingCode, evidence);
    } catch (e) { setSubmitError((e as Error).message); }
    setSubmitting(false);
  };

  const failed = evidence.filter((e) => progress[e.key] === 'failed');
  if (result && !submitting && failed.length === 0) return <Done result={result} identified={f.mode === 'identified'} evidenceCount={evidence.length} />;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-brand-900 mb-1">{t('report')}</h1>
      <nav aria-label="Progress" className="mb-5">
        <p className="text-sm text-slate-700 mb-2">Step {step + 1} of {STEPS.length}: <strong>{STEPS[step]}</strong></p>
        <ol className="flex gap-1">
          {STEPS.map((s, i) => <li key={s} className={`h-2 flex-1 rounded-full ${i <= step ? 'bg-brand-800' : 'bg-slate-200'}`} aria-current={i === step ? 'step' : undefined}><span className="sr-only">{s}{i < step ? ' (completed)' : ''}</span></li>)}
        </ol>
      </nav>

      <Card className="space-y-5">
        {step === 0 && (
          <fieldset className="space-y-3">
            <legend className="font-semibold text-lg mb-2">How would you like to report?</legend>
            {(['anonymous', 'identified'] as const).map((m) => (
              <label key={m} className={`flex gap-3 rounded-xl border-2 p-4 cursor-pointer ${f.mode === m ? 'border-brand-800 bg-brand-50' : 'border-slate-200'}`}>
                <input type="radio" name="mode" className="h-5 w-5 mt-1" checked={f.mode === m} onChange={() => set('mode', m)} />
                <span>
                  <span className="font-semibold block">{m === 'anonymous' ? '🕶️ Anonymously' : '👤 With my identity'}</span>
                  {m === 'anonymous' ? (
                    <span className="text-sm text-slate-700 block mt-1">
                      We don't ask for your name or contact details. You'll get a reference number and a private tracking code to check progress and message investigators.
                      <strong className="block mt-1">Limits of anonymity:</strong> what you write, and details inside photos or videos (faces, places, file metadata), could still reveal who you are. If you lose your tracking code, we can't recover it for you.
                    </span>
                  ) : (
                    <span className="text-sm text-slate-700 block mt-1">
                      Your name and contact details are visible only to officers and investigators assigned to your case, and every access is logged. You can follow up from "My reports".
                      {!user && <><br /><Link to="/login?next=/report?mode=identified" className="underline font-semibold">Sign in</Link> or <Link to="/register" className="underline font-semibold">create an account</Link> first.</>}
                    </span>
                  )}
                </span>
              </label>
            ))}
            {errors.mode && <p className="text-sm font-medium text-red-700">⚠ {errors.mode}</p>}
          </fieldset>
        )}

        {step === 1 && (
          <>
            <fieldset>
              <legend className="font-semibold text-lg mb-2">What kind of incident is it?</legend>
              <div className="grid sm:grid-cols-2 gap-2">
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <label key={k} className={`flex gap-3 rounded-lg border-2 p-3 cursor-pointer ${f.category === k ? 'border-brand-800 bg-brand-50' : 'border-slate-200'}`}>
                    <input type="radio" name="category" className="h-5 w-5 mt-0.5" checked={f.category === k} onChange={() => set('category', k)} />
                    <span><span className="font-medium block">{v.label}</span><span className="text-sm text-slate-600">{v.hint}</span></span>
                  </label>
                ))}
              </div>
              {errors.category && <p className="text-sm font-medium text-red-700 mt-2">⚠ {errors.category}</p>}
            </fieldset>
            <fieldset>
              <legend className="font-semibold text-lg mb-2">How serious is it?</legend>
              <div className="grid sm:grid-cols-2 gap-2">
                {Object.entries(SEVERITY).map(([k, v]) => (
                  <label key={k} className={`flex gap-3 rounded-lg border-2 p-3 cursor-pointer ${f.severity === k ? 'border-brand-800 bg-brand-50' : 'border-slate-200'}`}>
                    <input type="radio" name="severity" className="h-5 w-5 mt-0.5" checked={f.severity === k} onChange={() => set('severity', k)} />
                    <span><span className="font-medium block">{v.label}</span><span className="text-sm text-slate-600">{v.hint}</span></span>
                  </label>
                ))}
              </div>
              {f.severity === 'critical' && <div className="mt-3"><Alert kind="warning" title="Is someone in danger right now?">Use the <Link to="/sos" className="underline font-bold">SOS button</Link> or call 999. A report is not monitored like an emergency line.</Alert></div>}
            </fieldset>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="What happened?" hint="Say what you saw or experienced, who was involved (descriptions, not guesses about names), and anything that would help. Example: 'Two men on a black motorbike grabbed my bag near Kencom at about 7pm.'" error={errors.description}>
              {(id, d) => <Textarea id={id} aria-describedby={d} aria-invalid={!!errors.description} rows={6} maxLength={5000} value={f.description} onChange={(e) => set('description', e.target.value)} />}
            </Field>
            <p className="text-sm text-slate-600 -mt-3">{f.description.length}/5000</p>
            <Field label="When did it happen?" hint="Approximate is fine." error={errors.occurredAt}>
              {(id, d) => <Input id={id} aria-describedby={d} type="datetime-local" value={f.occurredAt} max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={(e) => set('occurredAt', e.target.value)} />}
            </Field>
            {f.mode === 'identified' && (
              <>
                <Field label="Best way to reach you">
                  {(id) => (
                    <Select id={id} value={f.preferredContact} onChange={(e) => set('preferredContact', e.target.value as Form['preferredContact'])}>
                      <option value="in_app">In-app messages</option><option value="phone">Phone call</option><option value="email">Email</option><option value="none">Please don't contact me</option>
                    </Select>
                  )}
                </Field>
                {['phone', 'email'].includes(f.preferredContact) && (
                  <Field label={f.preferredContact === 'phone' ? 'Phone number for this report' : 'Email for this report'} hint="Leave blank to use the details on your account.">
                    {(id, d) => <Input id={id} aria-describedby={d} value={f.contact} maxLength={200} onChange={(e) => set('contact', e.target.value)} />}
                  </Field>
                )}
              </>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={useGps} loading={gps.state === 'loading'}>📍 Use my current location</Button>
              {f.lat != null && <span className="text-sm text-slate-700">Selected: {f.lat.toFixed(5)}, {f.lng!.toFixed(5)} ({f.locationSource === 'gps' ? 'GPS' : 'map'})</span>}
            </div>
            {gps.msg && <Alert kind={gps.state === 'error' ? 'warning' : 'success'}>{gps.msg}</Alert>}
            <LocationSearch onSelect={(r) => { setF((x) => ({ ...x, lat: r.lat, lng: r.lng, locationSource: 'map', locationText: x.locationText || r.name.split(',').slice(0, 3).join(',') })); }} />
            <p className="text-sm text-slate-700">Or tap the map where it happened:</p>
            <MapView picked={f.lat != null ? { lat: f.lat, lng: f.lng! } : null} onPick={(p) => setF((x) => ({ ...x, ...p, locationSource: 'map' }))} label="Choose incident location" />
            <Field label="Describe the place (optional)" hint="Landmarks help, e.g. 'outside Tuskys, Moi Avenue'." error={errors.location}>
              {(id, d) => <Input id={id} aria-describedby={d} value={f.locationText} maxLength={300} onChange={(e) => set('locationText', e.target.value)} />}
            </Field>
          </>
        )}

        {step === 4 && (
          <>
            <div>
              <h2 className="font-semibold text-lg">Add evidence (optional)</h2>
              <p className="text-sm text-slate-700">Photos, videos, audio or documents. Only capture evidence when it is safe to do so.</p>
            </div>
            <EvidenceCapture items={evidence} onChange={setEvidence} />
          </>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">Check your report</h2>
            <dl className="divide-y divide-slate-200 rounded-lg border border-slate-200">
              {[
                ['Reporting', f.mode === 'anonymous' ? 'Anonymously' : `As ${user?.fullName}`, 0],
                ['Incident', `${CATEGORY_LABELS[f.category]?.label} · ${SEVERITY[f.severity].label}`, 1],
                ['What happened', f.description, 2],
                ['When', f.occurredAt ? new Date(f.occurredAt).toLocaleString() : 'Not given', 2],
                ['Where', [f.locationText, f.lat != null ? `${f.lat.toFixed(5)}, ${f.lng!.toFixed(5)}` : ''].filter(Boolean).join(' · ') || 'Not given', 3],
                ['Evidence', evidence.length ? evidence.map((e) => `${e.name} (${fmtBytes(e.blob.size)})`).join(', ') : 'None', 4],
              ].map(([k, v, s]) => (
                <div key={k as string} className="p-3 flex gap-3">
                  <dt className="w-28 shrink-0 font-medium text-slate-700">{k}</dt>
                  <dd className="flex-1 whitespace-pre-wrap break-words">{v}</dd>
                  {!result && <button type="button" className="text-sm underline text-brand-700 font-semibold self-start" onClick={() => setStep(s as number)}>Edit<span className="sr-only"> {k}</span></button>}
                </div>
              ))}
            </dl>
            <Alert kind="info">Submitting a knowingly false report is an offence. SAFEGUARD shares your report only with authorised officers.</Alert>
            {evidence.length > 0 && (result || submitting) && (
              <ul className="space-y-1" aria-label="Upload progress">
                {evidence.map((e) => {
                  const p = progress[e.key];
                  return (
                    <li key={e.key} className="text-sm">
                      <div className="flex justify-between"><span className="truncate">{e.name}</span><span>{p === 'done' ? '✓ Secured' : p === 'failed' ? '✗ Failed' : `${p ?? 0}%`}</span></div>
                      <progress className="w-full h-2" max={100} value={p === 'done' ? 100 : typeof p === 'number' ? p : 0} aria-label={`Upload ${e.name}`} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {submitError && <Alert kind="error" title={result ? 'Your report was saved, but some evidence did not upload' : 'Your report was not sent'}>{submitError} {result ? 'Tap "Retry uploads". Your report reference is ' + result.reference + '.' : 'Your answers are kept, so you can try again.'}</Alert>}

        <div className="flex justify-between gap-2 pt-2">
          {step > 0 && !result ? <Button type="button" variant="secondary" onClick={back}>← {t('back')}</Button> : <span />}
          {step < STEPS.length - 1
            ? <Button type="button" onClick={next}>{t('next')} →</Button>
            : <Button type="button" onClick={submit} loading={submitting}>{result ? 'Retry uploads' : t('submit')}</Button>}
        </div>
        {result && failed.length > 0 && !submitting && (
          <p className="text-sm"><Link className="underline" to={result.trackingCode ? '/track' : `/reports/${result.id}`}>Skip and finish without these files</Link> — save your reference: <strong>{result.reference}</strong>{result.trackingCode && <> and code <strong className="font-mono">{result.trackingCode}</strong></>}</p>
        )}
      </Card>
    </div>
  );
}

function Done({ result, identified, evidenceCount }: { result: { id: string; reference: string; trackingCode: string | null }; identified: boolean; evidenceCount: number }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(`Reference: ${result.reference}\nTracking code: ${result.trackingCode}`); setCopied(true); } catch { /* unsupported */ }
  };
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Alert kind="success" title="Your report has been submitted">
        {evidenceCount > 0 && `${evidenceCount} evidence file${evidenceCount > 1 ? 's were' : ' was'} encrypted, fingerprinted and recorded in the evidence ledger. `}
        A supervising officer will review it. This is not an emergency line — if you are in danger, use SOS or call 999.
      </Alert>
      <Card className="space-y-3 text-center">
        <p className="text-slate-700">Your reference number</p>
        <p className="text-3xl font-mono font-bold tracking-wider text-brand-900">{result.reference}</p>
        {result.trackingCode && (
          <>
            <p className="text-slate-700 pt-2">Your private tracking code</p>
            <p className="text-xl font-mono font-bold break-all bg-amber-50 border border-amber-300 rounded-lg p-3">{result.trackingCode}</p>
            <Alert kind="warning" title="Save this code now">It is shown only once. Anyone with the reference and this code can read the report's status and messages. We cannot recover it for you.</Alert>
            <Button type="button" variant="secondary" onClick={copy}>{copied ? '✓ Copied' : 'Copy reference & code'}</Button>
          </>
        )}
      </Card>
      <div className="flex flex-wrap gap-2 justify-center">
        {identified ? <LinkButton to={`/reports/${result.id}`}>View my report</LinkButton> : <LinkButton to="/track">Track this report</LinkButton>}
        <LinkButton to="/" variant="secondary">Back to home</LinkButton>
      </div>
    </div>
  );
}
