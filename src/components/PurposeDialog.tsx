import { useEffect, useRef, useState } from 'react';
import { Button, Textarea } from './ui';

/** Asks staff to record a lawful/investigative purpose before a sensitive action. Uses native <dialog> for focus trapping. */
export function PurposeDialog({ open, title, description, confirmLabel = 'Continue', extraField, onSubmit, onClose }: {
  open: boolean; title: string; description: string; confirmLabel?: string;
  extraField?: { label: string; value: string; onChange: (v: string) => void };
  onSubmit: (purpose: string) => Promise<void>; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (open && !ref.current?.open) { setPurpose(''); setError(''); ref.current?.showModal(); }
    if (!open && ref.current?.open) ref.current.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} className="rounded-xl p-0 w-[min(32rem,calc(100vw-2rem))] backdrop:bg-black/50 m-auto">
      <form method="dialog" className="p-5 space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        if (purpose.trim().length < 10) return setError('Describe the purpose in at least 10 characters.');
        setLoading(true); setError('');
        try { await onSubmit(purpose.trim()); onClose(); } catch (err) { setError((err as Error).message); }
        setLoading(false);
      }}>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-slate-700">{description}</p>
        {extraField && (
          <div>
            <label className="font-medium block" htmlFor="pd-extra">{extraField.label}</label>
            <input id="pd-extra" className="w-full rounded-lg border border-slate-400 px-3 min-h-11" value={extraField.value} onChange={(e) => extraField.onChange(e.target.value)} />
          </div>
        )}
        <label htmlFor="pd-purpose" className="font-medium block">Purpose (recorded in the audit and custody log)</label>
        <Textarea id="pd-purpose" rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Reviewing scene photo to identify vehicle registration" autoFocus />
        {error && <p role="alert" className="text-sm font-medium text-red-700">⚠ {error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading}>{confirmLabel}</Button>
        </div>
      </form>
    </dialog>
  );
}
