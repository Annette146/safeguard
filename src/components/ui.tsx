import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const variants: Record<Variant, string> = {
  primary: 'bg-brand-800 text-white hover:bg-brand-700 disabled:bg-slate-400',
  secondary: 'bg-white text-brand-800 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800',
  danger: 'bg-sos text-white hover:bg-sos-dark disabled:bg-red-300',
  ghost: 'text-brand-700 hover:bg-brand-50 dark:text-blue-400 dark:hover:bg-zinc-800',
};
const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 min-h-11 font-semibold transition-colors disabled:cursor-not-allowed';

export function Button({ variant = 'primary', loading, children, className = '', ...p }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button {...p} disabled={p.disabled || loading} aria-busy={loading || undefined} className={`${base} ${variants[variant]} ${className}`}>
      {loading && <Spinner small />}{children}
    </button>
  );
}
export function LinkButton({ to, variant = 'primary', className = '', children }: { to: string; variant?: Variant; className?: string; children: ReactNode }) {
  return <Link to={to} className={`${base} ${variants[variant]} ${className}`}>{children}</Link>;
}

export function Spinner({ small }: { small?: boolean }) {
  return <span role="status" aria-label="Loading" className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${small ? 'h-4 w-4' : 'h-6 w-6'}`} />;
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: (id: string, describedBy?: string) => ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block font-medium text-slate-900 dark:text-zinc-100">{label}</label>
      {hint && <p id={hintId} className="text-sm text-slate-600 dark:text-zinc-400">{hint}</p>}
      {children(id, [hintId, errId].filter(Boolean).join(' ') || undefined)}
      {error && <p id={errId} className="text-sm font-medium text-red-700 dark:text-red-400">⚠ {error}</p>}
    </div>
  );
}
const inputCls = 'w-full rounded-lg border border-slate-400 bg-white px-3 min-h-11 text-base focus:border-brand-600 aria-[invalid=true]:border-red-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`${inputCls} ${p.className ?? ''}`} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={`${inputCls} ${p.className ?? ''}`} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={`${inputCls} py-2 ${p.className ?? ''}`} />;

export function Badge({ className = '', children }: { className?: string; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{children}</span>;
}

export function Alert({ kind = 'info', title, children }: { kind?: 'info' | 'error' | 'success' | 'warning'; title?: string; children?: ReactNode }) {
  const cls = {
    info: 'bg-sky-50 border-sky-300 text-sky-950', error: 'bg-red-50 border-red-300 text-red-950',
    success: 'bg-emerald-50 border-emerald-300 text-emerald-950', warning: 'bg-amber-50 border-amber-300 text-amber-950',
  }[kind];
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border p-3 ${cls}`}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className="text-sm mt-0.5">{children}</div>}
    </div>
  );
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-xl bg-white border border-slate-200 shadow-sm p-4 sm:p-5 dark:bg-zinc-900/95 dark:border-zinc-800 ${className}`}>{children}</section>;
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold text-brand-900 dark:text-white">{children}</h1>
      {sub && <p className="text-slate-600 mt-1 dark:text-zinc-400">{sub}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-slate-600 text-center py-8 dark:text-zinc-400">{children}</p>;
}
