import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { useAuth, isStaff } from '../auth/AuthProvider';
import { useI18n } from '../lib/i18n';
import { api } from '../lib/api';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function useEmergencyNumbers() {
  const [nums, setNums] = useState<string[]>(['999', '112']);
  useEffect(() => {
    api<{ emergencyNumbers: string[] }>('GET', '/api/config')
      .then((c) => {
        if (Array.isArray(c.emergencyNumbers) && c.emergencyNumbers.length > 0) {
          setNums(c.emergencyNumbers);
        }
      })
      .catch(() => {});
  }, []);
  return nums;
}

export function Layout() {
  const { user } = useAuth();
  const { t } = useI18n();
  const loc = useLocation();
  const nums = useEmergencyNumbers();
  const staff = isStaff(user);
  const inDashboardShell =
    staff && (loc.pathname.startsWith('/admin') || loc.pathname.startsWith('/staff'));

  const footerContent = (
    <div className={`mx-auto px-4 py-4 space-y-1 ${inDashboardShell ? 'max-w-7xl sm:px-6 lg:px-8' : 'max-w-6xl'}`}>
      <p>
        {t('disclaimer')}{' '}
        {nums.map((n, i) => (
          <span key={n}>
            {i > 0 && ' / '}
            <a className="font-semibold text-brand-700 underline dark:text-blue-400" href={`tel:${n}`}>
              {n}
            </a>
          </span>
        ))}
        .
      </p>
      <p>
        <Link to="/help" className="underline">
          Privacy, terms &amp; how your data is protected
        </Link>
      </p>
    </div>
  );

  if (inDashboardShell) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black pt-16 flex flex-col">
        <Header />
        <Sidebar />
        <main id="main" className="flex-1 lg:pl-64">
          {<Outlet />}
        </main>
        <footer className="lg:pl-64 border-t border-zinc-200 bg-white text-sm text-slate-600 dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-400">
          {footerContent}
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <Header />
      <main id="main" className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 pt-22">
        <Outlet />
      </main>

      {!staff && loc.pathname !== '/sos' && (
        <Link
          to="/sos"
          className="fixed bottom-4 right-4 z-[1000] rounded-full bg-sos text-white font-extrabold shadow-xl h-16 w-16 flex items-center justify-center text-lg ring-4 ring-white hover:bg-sos-dark dark:ring-zinc-900"
          aria-label="SOS – request emergency help"
        >
          SOS
        </Link>
      )}

      <footer className="border-t border-slate-200 bg-white text-sm text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        {footerContent}
      </footer>
    </div>
  );
}
