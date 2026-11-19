import { StrictMode, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import './index.css';
import { Providers } from './Provider';
import { RequireRole } from './auth/RequireRole';
import { useAuth } from './auth/AuthProvider';
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
const StaffIncidents = lazy(() => import('./pages/StaffDashboard').then((m) => ({ default: m.StaffIncidents })));
const StaffSos = lazy(() => import('./pages/StaffDashboard').then((m) => ({ default: m.StaffSos })));
const StaffMap = lazy(() => import('./pages/StaffDashboard').then((m) => ({ default: m.StaffMap })));
const StaffLedger = lazy(() => import('./pages/StaffDashboard').then((m) => ({ default: m.StaffLedger })));
const CaseDetail = lazy(() => import('./pages/CaseDetail').then((m) => ({ default: m.CaseDetail })));

const AdminOverview = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminOverview })));
const AdminUsers = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminUsers })));
const AdminSuspended = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminSuspended })));
const AdminDepartments = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminDepartments })));
const AdminAuditLogs = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminAuditLogs })));
const AdminSettings = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminSettings })));

function App() {
  const { ready } = useAuth();
  if (!ready) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

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
        <Route path="staff/incidents" element={<RequireRole roles={['officer', 'commander', 'investigator']}><StaffIncidents /></RequireRole>} />
        <Route path="staff/sos" element={<RequireRole roles={['officer', 'commander']}><StaffSos /></RequireRole>} />
        <Route path="staff/map" element={<RequireRole roles={['officer', 'commander', 'investigator']}><StaffMap /></RequireRole>} />
        <Route path="staff/ledger" element={<RequireRole roles={['commander', 'investigator']}><StaffLedger /></RequireRole>} />
        <Route path="staff/cases/:id" element={<RequireRole roles={['officer', 'commander', 'investigator']}><CaseDetail /></RequireRole>} />

        <Route path="admin" element={<RequireRole roles={['admin']}><AdminOverview /></RequireRole>} />
        <Route path="admin/users" element={<RequireRole roles={['admin']}><AdminUsers /></RequireRole>} />
        <Route path="admin/suspended" element={<RequireRole roles={['admin']}><AdminSuspended /></RequireRole>} />
        <Route path="admin/departments" element={<RequireRole roles={['admin']}><AdminDepartments /></RequireRole>} />
        <Route path="admin/audit-logs" element={<RequireRole roles={['admin']}><AdminAuditLogs /></RequireRole>} />
        <Route path="admin/settings" element={<RequireRole roles={['admin']}><AdminSettings /></RequireRole>} />

        <Route
          path="*"
          element={
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold">Page not found</h1>
              <a href="/" className="underline">
                Go home
              </a>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Providers>
        <App />
      </Providers>
    </BrowserRouter>
  </StrictMode>,
);

// Offline shell (PWA). Evidence and API responses are never cached.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
