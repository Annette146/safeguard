import { StrictMode, Suspense, lazy, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import './index.css';
import { AuthProvider, useAuth, type Role } from './lib/auth';
import { I18nProvider } from './lib/i18n';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { Home } from './pages/Home';
import { Login, Register } from './pages/Auth';
import { ReportWizard } from './pages/ReportWizard';
import { Sos } from './pages/Sos';
import { Track, MyReports, MyReportDetail, CitizenMap, Notifications } from './pages/Citizen';
import { Profile } from './pages/Profile';
import { Help } from './pages/Help';
// Staff/admin code is split out so citizens on slow connections don't download it.
const StaffDashboard = lazy(() => import('./pages/StaffDashboard').then((m) => ({ default: m.StaffDashboard })));
const StaffMap = lazy(() => import('./pages/StaffDashboard').then((m) => ({ default: m.StaffMap })));
const CaseDetail = lazy(() => import('./pages/CaseDetail').then((m) => ({ default: m.CaseDetail })));
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })));

/** UX guard only: every permission is enforced again by the API. */
function RequireRole({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <Spinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === 'citizen' ? '/' : '/staff'} replace />;
  return <Suspense fallback={<Spinner />}>{children}</Suspense>;
}

function App() {
  const { ready } = useAuth();
  if (!ready) return <div className="min-h-dvh flex items-center justify-center"><Spinner /></div>;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="report" element={<ReportWizard />} />
        <Route path="sos" element={<Sos />} />
        <Route path="track" element={<Track />} />
        <Route path="map" element={<CitizenMap />} />
        <Route path="help" element={<Help />} />
        <Route path="reports" element={<RequireRole roles={['citizen']}><MyReports /></RequireRole>} />
        <Route path="reports/:id" element={<RequireRole roles={['citizen']}><MyReportDetail /></RequireRole>} />
        <Route path="notifications" element={<RequireRole><Notifications /></RequireRole>} />
        <Route path="profile" element={<RequireRole><Profile /></RequireRole>} />
        <Route path="staff" element={<RequireRole roles={['officer', 'commander', 'investigator', 'admin']}><StaffDashboard /></RequireRole>} />
        <Route path="staff/map" element={<RequireRole roles={['officer', 'commander', 'investigator']}><StaffMap /></RequireRole>} />
        <Route path="staff/cases/:id" element={<RequireRole roles={['officer', 'commander', 'investigator']}><CaseDetail /></RequireRole>} />
        <Route path="admin" element={<RequireRole roles={['admin']}><Admin /></RequireRole>} />
        <Route path="*" element={<div className="text-center py-12"><h1 className="text-2xl font-bold">Page not found</h1><a href="/" className="underline">Go home</a></div>} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider><App /></AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);

// Offline shell (PWA). Evidence and API responses are never cached.
if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js').catch(() => {});
