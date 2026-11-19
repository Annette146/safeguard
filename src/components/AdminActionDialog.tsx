import { useState, type FormEvent } from 'react';
import type { AdminActionBody } from '../types/safeguardTypes';

type Props = {
  title: string;
  description?: string;
  onConfirm: (body: AdminActionBody) => Promise<void>;
  onClose: () => void;
};

export function AdminActionDialog({
  title,
  description = 'Provide a reason, then confirm this administrative action.',
  onConfirm,
  onClose,
}: Props) {
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setConfirming(true);
    try {
      await onConfirm({
        reason: reason.trim(),
      });
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Action failed.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <form
        onSubmit={(event) => void submit(event)}
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        )}
        <label className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Reason
          <input
            required
            autoFocus
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Institutional verification completed"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-black dark:text-white"
          />
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={confirming || !reason.trim()}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {confirming ? 'Updating…' : 'Confirm action'}
          </button>
        </div>
      </form>
    </div>
  );
}
