import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ChevronDown, LogOut, Menu, UserRound, X } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { adminNavItems, getStaffNavItems } from '../Data/Navitems';

export function Sidebar() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setMenuOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user || user.role === 'citizen') return null;

  const items = user.role === 'admin' ? adminNavItems : getStaffNavItems(user.role);

  const handleSignOut = async () => {
    await logout();
    nav('/login');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        className="fixed left-4 top-20 z-50 rounded-lg border border-blue-100 bg-white p-2 shadow-md transition-all hover:bg-blue-50 lg:hidden dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        aria-label="Toggle dashboard sidebar"
        aria-expanded={isMobileMenuOpen}
      >
        {isMobileMenuOpen ? (
          <X className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        ) : (
          <Menu className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        )}
      </button>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Dashboard navigation"
        className={`fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r border-blue-100 bg-white shadow-sm transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-900 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-blue-100 bg-gradient-to-r from-blue-50/60 to-white px-6 py-4 lg:hidden dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-800 p-1.5 shadow-sm">
              <img src="/icon.svg" alt="" className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-zinc-950 dark:text-white">SAFEGUARD</p>
              <p className="text-xs font-medium capitalize text-blue-600 dark:text-blue-400">
                {user.role} portal
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
            <div className="mb-4">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Main Menu
              </p>
            </div>

            {items.map((item) => {
              const isActive =
                loc.pathname === item.href ||
                (item.href === '/staff/incidents' && loc.pathname.startsWith('/staff/cases/'));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-zinc-800 hover:bg-blue-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-transform ${
                      isActive ? 'scale-110' : 'group-hover:scale-105'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="font-semibold">{item.label}</span>
                  {isActive && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-white/75 animate-pulse" aria-hidden="true" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto shrink-0 border-t border-blue-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-blue-100/70 bg-zinc-50 p-3 text-left transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-800 p-1.5 shadow-sm">
                  <img src="/icon.svg" alt="" className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                    {user.fullName}
                  </p>
                  <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">{user.email}</p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-zinc-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {menuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-blue-100 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-zinc-700"
                  >
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                    <span>Profile & MFA</span>
                  </Link>
                  <div className="my-1 border-t border-blue-100 dark:border-zinc-700" />
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
