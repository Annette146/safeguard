import { Suspense, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAuth, type Role } from './AuthProvider';
import { Spinner } from '../components/ui';

/** UX guard only: every permission is enforced again by the API. */
export function RequireRole({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, ready } = useAuth();
  const loc = useLocation();

  if (!ready) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-sm text-zinc-500 dark:text-zinc-400">
        <p className="flex items-center gap-2">
          Checking access… <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    const dest = user.role === 'citizen' ? '/' : user.role === 'admin' ? '/admin' : '/staff';
    return <Navigate to={dest} replace />;
  }

  return <Suspense fallback={<Spinner />}>{children}</Suspense>;
}
