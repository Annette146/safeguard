import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { Bell, ChevronDown, LogOut, Menu, Moon, Sun, User, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../slices/stores/ThemeStore';
import { toggleTheme } from '../slices/theme/ThemeSlice';
import { isStaff, useAuth, type Role } from '../auth/AuthProvider';
import { useI18n } from '../lib/i18n';
import { api, subscribe } from '../lib/api';

function portalLabel(role?: Role): string {
  switch (role) {
    case 'admin':
      return 'Admin Panel';
    case 'commander':
      return 'Command Centre';
    case 'investigator':
      return 'Investigator Portal';
    case 'officer':
      return 'Officer Portal';
    default:
      return 'Public Safety';
  }
}

export function Header() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const nav = useNavigate();
  const loc = useLocation();
  const staff = isStaff(user);
  const inDashboardShell = staff && (loc.pathname.startsWith('/admin') || loc.pathname.startsWith('/staff'));

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const theme = useSelector((state: RootState) => state.theme.theme);
  const dispatch = useDispatch();

  useEffect(() => {
    setMobileNavOpen(false);
    setUserMenuOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    const load = () =>
      api<{ readAt: string | null }[]>('GET', '/api/notifications')
        .then((n) => setUnread(n.filter((x) => !x.readAt).length))
        .catch(() => {});
    void load();
    return subscribe((type) => {
      if (type === 'notification') void load();
    });
  }, [user]);

  const publicLinks: [string, string][] = !user
    ? [
        ['/', 'Home'],
        ['/track', t('track')],
        ['/help', t('help')],
      ]
    : staff
      ? ([
          [user.role === 'admin' ? '/admin' : '/staff', 'Dashboard'],
          ...(user.role !== 'admin' ? [['/staff/map', t('map')]] : []),
          ['/help', t('help')],
        ] as [string, string][])
      : [
          ['/', 'Home'],
          ['/reports', t('myReports')],
          ['/map', t('map')],
          ['/help', t('help')],
        ];

  const homeHref = staff ? (user?.role === 'admin' ? '/admin' : '/staff') : '/';

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    nav('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-blue-100 bg-white/95 backdrop-blur-md shadow-sm dark:border-zinc-800 dark:bg-zinc-900/95">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <nav
        aria-label="Top navigation"
        className={`mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:px-6 ${inDashboardShell ? 'max-w-full lg:px-8' : 'max-w-6xl'}`}
      >
        <div className="flex items-center gap-4">
          <Link to={homeHref} className="flex items-center gap-3 hover:opacity-85 transition-opacity group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-brand-800 p-1.5 shadow-sm">
              <img src="/icon.svg" alt="" className="h-7 w-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight leading-none text-zinc-950 dark:text-white">
                SAFEGUARD
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                {portalLabel(user?.role)}
              </span>
            </div>
          </Link>

          {!inDashboardShell && (
            <div className="hidden md:flex items-center gap-1 ml-2">
              {publicLinks.map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-zinc-700 hover:bg-blue-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <label htmlFor="lang" className="sr-only">
            Language
          </label>
          <select
            id="lang"
            value={lang}
            onChange={(e) => setLang(e.target.value as 'en' | 'sw')}
            className="min-h-10 rounded-lg border border-zinc-200 bg-white px-2.5 text-sm font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="en">English</option>
            <option value="sw">Kiswahili</option>
          </select>

          {user && (
            <Link
              to="/notifications"
              className="relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              aria-label={`${t('notifications')}${unread ? `, ${unread} unread` : ''}`}
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unread > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sos px-1 text-[11px] font-bold text-white"
                  aria-hidden="true"
                >
                  {unread}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <div ref={menuRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-expanded={userMenuOpen}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-blue-100/80 bg-blue-50/60 px-3 py-1.5 transition-all hover:bg-blue-100/70 dark:border-zinc-700 dark:bg-zinc-800/80 dark:hover:bg-zinc-700"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                  <User className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold leading-none text-zinc-900 dark:text-white">
                    {user.fullName.split(' ')[0]}
                  </p>
                  <p className="mt-0.5 text-xs capitalize text-zinc-600 dark:text-zinc-400">
                    {user.role}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-zinc-600 transition-transform dark:text-zinc-400 ${userMenuOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-xl border border-blue-100 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="border-b border-blue-100 px-3 py-2 dark:border-zinc-700">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                      {user.fullName}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-blue-50 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:hover:text-white"
                  >
                    <User className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                    <span>{t('profile')}</span>
                  </Link>
                  <div className="my-1 border-t border-blue-100 dark:border-zinc-700" />
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>{t('signOut')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden sm:inline-flex min-h-10 items-center rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {t('signIn')}
            </Link>
          )}

          <button
            type="button"
            onClick={() => dispatch(toggleTheme())}
            className="min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-2 shadow-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-yellow-400" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-zinc-600" aria-hidden="true" />
            )}
          </button>

          {!inDashboardShell && (
            <button
              type="button"
              className="md:hidden inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-2.5 text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-nav"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileNavOpen((o) => !o)}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </nav>

      {!inDashboardShell && mobileNavOpen && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="md:hidden border-t border-zinc-200 bg-white px-4 pb-3 flex flex-col dark:border-zinc-800 dark:bg-zinc-900"
        >
          {publicLinks.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end
              className="py-3 font-medium border-b border-zinc-100 text-zinc-800 dark:border-zinc-800 dark:text-zinc-200"
            >
              {label}
            </NavLink>
          ))}
          {user ? (
            <>
              <Link
                to="/profile"
                className="py-3 font-medium border-b border-zinc-100 text-zinc-800 dark:border-zinc-800 dark:text-zinc-200"
              >
                {t('profile')}
              </Link>
              <button
                type="button"
                className="py-3 text-left font-medium text-red-600 dark:text-red-400"
                onClick={() => void handleLogout()}
              >
                {t('signOut')}
              </button>
            </>
          ) : (
            <Link to="/login" className="py-3 font-semibold text-blue-600 dark:text-blue-400">
              {t('signIn')}
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
