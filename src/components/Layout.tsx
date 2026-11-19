import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth, isStaff } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { api, subscribe } from '../lib/api';

export function useEmergencyNumbers() {
  const [nums, setNums] = useState<string[]>(['999', '112']);
  useEffect(() => { api('GET', '/api/config').then((c) => setNums(c.emergencyNumbers)).catch(() => {}); }, []);
  return nums;
}

export function Layout() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const nav = useNavigate();
  const loc = useLocation();
  const nums = useEmergencyNumbers();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const staff = isStaff(user);

  useEffect(() => setMenuOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!user) return setUnread(0);
    const load = () => api('GET', '/api/notifications').then((n: { readAt: string | null }[]) => setUnread(n.filter((x) => !x.readAt).length)).catch(() => {});
    load();
    return subscribe((type) => { if (type === 'notification') load(); });
  }, [user]);

  const links: [string, string][] = !user ? [['/', 'Home'], ['/track', t('track')], ['/help', t('help')]]
    : staff ? ([['/staff', 'Dashboard'], ...(user.role !== 'admin' ? [['/staff/map', t('map')]] : []), ...(user.role === 'admin' ? [['/admin', 'Administration']] : [])] as [string, string][])
    : [['/', 'Home'], ['/reports', t('myReports')], ['/map', t('map')], ['/help', t('help')]];

  return (
    <div className="min-h-dvh flex flex-col">
      <a href="#main" className="skip-link">Skip to main content</a>
      <header className="bg-brand-800 text-white">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-3">
          <Link to={staff ? '/staff' : '/'} className="flex items-center gap-2 font-extrabold tracking-wide text-lg">
            <img src="/icon.svg" alt="" className="h-8 w-8" /> SAFEGUARD
            {staff && <span className="text-xs font-semibold bg-white/15 rounded px-2 py-0.5 capitalize">{user!.role}</span>}
          </Link>
          <nav aria-label="Main" className="hidden md:flex gap-1 ml-4">
            {links.map(([to, l]) => (
              <NavLink key={to} to={to} end className={({ isActive }) => `px-3 py-2 rounded-md font-medium ${isActive ? 'bg-white/15' : 'hover:bg-white/10'}`}>{l}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="lang" className="sr-only">Language</label>
            <select id="lang" value={lang} onChange={(e) => setLang(e.target.value as 'en' | 'sw')}
              className="bg-white/10 rounded-md px-2 min-h-11 text-sm font-semibold [&>option]:text-slate-900">
              <option value="en">English</option><option value="sw">Kiswahili</option>
            </select>
            {user && (
              <Link to="/notifications" className="relative rounded-md px-2 min-h-11 inline-flex items-center hover:bg-white/10" aria-label={`${t('notifications')}${unread ? `, ${unread} unread` : ''}`}>
                <span aria-hidden="true" className="text-xl">🔔</span>
                {unread > 0 && <span className="absolute top-1 right-0 bg-sos text-white text-[11px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center" aria-hidden="true">{unread}</span>}
              </Link>
            )}
            <button className="md:hidden rounded-md px-3 min-h-11 hover:bg-white/10 font-semibold" aria-expanded={menuOpen} aria-controls="mobile-nav" onClick={() => setMenuOpen((o) => !o)}>Menu</button>
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <>
                  <Link to="/profile" className="px-3 py-2 rounded-md hover:bg-white/10 font-medium">{user.fullName.split(' ')[0]}</Link>
                  <button onClick={async () => { await logout(); nav('/'); }} className="px-3 py-2 rounded-md hover:bg-white/10 font-medium">{t('signOut')}</button>
                </>
              ) : <Link to="/login" className="px-3 py-2 rounded-md bg-white text-brand-800 font-semibold">{t('signIn')}</Link>}
            </div>
          </div>
        </div>
        {menuOpen && (
          <nav id="mobile-nav" aria-label="Mobile" className="md:hidden border-t border-white/15 px-4 pb-3 flex flex-col">
            {links.map(([to, l]) => <NavLink key={to} to={to} end className="py-3 font-medium border-b border-white/10">{l}</NavLink>)}
            {user ? (
              <>
                <Link to="/profile" className="py-3 font-medium border-b border-white/10">{t('profile')}</Link>
                <button className="py-3 text-left font-medium" onClick={async () => { await logout(); nav('/'); }}>{t('signOut')}</button>
              </>
            ) : <Link to="/login" className="py-3 font-semibold">{t('signIn')}</Link>}
          </nav>
        )}
      </header>

      <main id="main" className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      {!staff && loc.pathname !== '/sos' && (
        <Link to="/sos" className="fixed bottom-4 right-4 z-[1000] rounded-full bg-sos text-white font-extrabold shadow-xl h-16 w-16 flex items-center justify-center text-lg ring-4 ring-white hover:bg-sos-dark"
          aria-label="SOS – request emergency help">SOS</Link>
      )}

      <footer className="border-t border-slate-200 bg-white text-sm text-slate-600">
        <div className="mx-auto max-w-6xl px-4 py-4 space-y-1">
          <p>{t('disclaimer')} {nums.map((n, i) => <span key={n}>{i > 0 && ' / '}<a className="font-semibold text-brand-700 underline" href={`tel:${n}`}>{n}</a></span>)}.</p>
          <p><Link to="/help" className="underline">Privacy, terms & how your data is protected</Link></p>
        </div>
      </footer>
    </div>
  );
}
