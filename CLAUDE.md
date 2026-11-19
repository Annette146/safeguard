# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The React frontend of SAFEGUARD, a public-safety reporting, emergency SOS and digital-evidence app. The API lives in the sibling `../server` directory (Express + SQLite). It has its own package and is outside this git repo. Project-wide docs: `../README.md`, `../docs/ARCHITECTURE.md` and `../docs/API.md`, which is the source of truth for endpoints.

## Commands

Requires Node.js ≥ 24.7.

```bash
npm run dev       # Vite dev server on :5173, proxies /api to http://localhost:4000
npm run build     # tsc --noEmit (type-check) + vite build -> dist/
npm run preview
```

The web app has no tests or linter. `npm run build` is the check. The API must be running for the app to work:

```bash
cd ../server && npm run seed && npm run dev   # first run: cp .env.example .env and generate keys
cd ../server && npm test                      # e2e API tests (RBAC, workflow, tamper detection, SOS)
```

Once `dist/` is built, the server serves it at http://localhost:4000. The dev seed creates demo accounts `citizen|commander|officer|officer2|investigator|admin@safeguard.test`, password `Safeguard!2026`.

## Stack

React 19, react-router v7 (imported from `react-router`, not `react-router-dom`), Tailwind CSS v4 through the `@tailwindcss/vite` plugin (no tailwind config file, class-based dark mode via `@custom-variant dark`), Redux Toolkit (`@reduxjs/toolkit` + `react-redux`) for persisted light/dark theme state, `lucide-react` icons, Leaflet + OpenStreetMap, TypeScript strict.

## Architecture

- **Root providers (`src/Provider.tsx`)**: wraps the app in Redux `<Provider store={store}>`, `<I18nProvider>`, and `<AuthProvider>`.
- **Routing (`src/main.tsx`)**: all routes are declared here inside `<Layout>`, including citizen routes and role-gated dashboard routes (`/staff`, `/staff/incidents`, `/staff/sos`, `/staff/map`, `/staff/ledger`, `/staff/cases/:id` and `/admin`, `/admin/users`, `/admin/suspended`, `/admin/departments`, `/admin/audit-logs`, `/admin/settings`). `RequireRole` (`src/auth/RequireRole.tsx`) guards are UX-only. The server enforces every permission again, so never rely on the client for access control. Staff and admin pages (`StaffDashboard`, `StaffIncidents`, `StaffSos`, `StaffMap`, `StaffLedger`, `CaseDetail`, `AdminOverview`, `AdminUsers`, `AdminSuspended`, `AdminDepartments`, `AdminAuditLogs`, `AdminSettings`) are lazy-loaded so citizens on slow connections don't download them. Keep any new staff-only page lazy.
- **Dashboard shell (`src/components/Header.tsx`, `src/components/Sidebar.tsx`, `src/components/Layout.tsx`, `src/Data/Navitems.ts`)**: `Header` renders the fixed top navigation bar, language switch, notification bell, profile dropdown, and Redux-backed theme toggle. For `/staff*` and `/admin*` routes, `Layout` renders the fixed left `Sidebar` driven by `src/Data/Navitems.ts` alongside `PageHeader` and `AdminActionDialog`.
- **API client (`src/lib/api.ts`) & Hooks (`src/hooks/`)**: always call the backend through `api(method, url, opts)`. It attaches the bearer token, retries once after a silent refresh on a 401 and throws `ApiError` (`status`, `code`, `fields` for form validation errors, `code: 'offline'` on network failure). `toApiFailure()` maps errors to structured `ApiFailure` objects consumed by `useApiQuery` and domain hooks (`useAdminOverview`, `useAdminUsers`, `useAdminDepartments`, `useAdminAuditLogs`, `useStaffIncidents`, `useActiveSos`).
  - The access token is kept **in memory only**, never in localStorage. The refresh token is an httpOnly cookie, and `refreshSession()` deduplicates concurrent refreshes.
  - Uploads use `uploadWithProgress` (XHR) because fetch has no upload progress.
  - Real-time updates use `subscribe()`, which reads SSE from `/api/events` over fetch because EventSource can't send an Authorization header. It reconnects in a loop.
- **Auth (`src/auth/AuthProvider.tsx`, re-exported at `src/lib/auth.tsx`)**: `useAuth()` gives `user`, `ready`, `login` (optional TOTP), `register` and `logout`. Roles: `citizen | officer | commander | investigator | admin`. On boot the app restores the session through the refresh cookie and renders nothing until `ready`.
- **Theme (`src/slices/theme/ThemeSlice.ts`, `src/slices/stores/ThemeStore.ts`)**: Redux slice managing `'light' | 'dark'` theme persisted in `localStorage`.
- **Types (`src/types/safeguardTypes.ts`)**: shared TypeScript contracts for admin, incident, SOS, ledger, and API failure types.
- **i18n (`src/lib/i18n.tsx`)**: English and Kiswahili dictionaries live inline. `sw` is typed as `typeof en`, so every key you add must exist in both. Use `useI18n().t(key)`. Only part of the UI is translated so far, and some strings are hard-coded English.
- **Display labels (`src/lib/labels.ts`)**: mappings for categories, statuses and similar values.
- **SOS (`src/pages/Sos.tsx`)**: offline-first. Pending SOS requests are queued in localStorage with an idempotency key and retried. States must stay honest (`queued → sent → delivered → acknowledged → dispatched`): never show a state the server hasn't confirmed.
- **PWA (`public/sw.js`)**: the service worker is registered only in production builds and caches only the app shell (`/`, `/sos`, assets). It deliberately never caches `/api/*` or evidence. Bump `CACHE` when you change the shell.

## Domain rules to preserve

- Case access is assignment-based, and admins have no route to case content or evidence.
- Opening evidence requires a stated purpose (`PurposeDialog`) and is logged on the server.
- Anonymous reports return a reference and a one-time tracking code that `/track` uses. No identity is attached.
- External integrations (SMS, emergency-service API, malware scan, KMS) return `not_configured`. The UI must say so instead of implying success.
- Emergency numbers come from `GET /api/config` and appear on every page via `Layout`.

## Coding & UI conventions

- Do not use emojis anywhere in the UI or code; use icons (from `lucide-react`) instead.
- Avoid long comments; keep code comments brief and only where necessary.
