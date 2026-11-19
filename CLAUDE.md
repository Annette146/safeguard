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

React 19, react-router v7 (imported from `react-router`, not `react-router-dom`), Tailwind CSS v4 through the `@tailwindcss/vite` plugin (no tailwind config file), Leaflet + OpenStreetMap, TypeScript strict. No state library: state lives in React context and local component state.

## Architecture

- **Routing (`src/main.tsx`)**: all routes are declared here inside `<Layout>`. `RequireRole` guards are UX-only. The server enforces every permission again, so never rely on the client for access control. Staff and admin pages (`StaffDashboard`, `CaseDetail`, `Admin`) are lazy-loaded so citizens on slow connections don't download them. Keep any new staff-only page lazy.
- **API client (`src/lib/api.ts`)**: always call the backend through `api(method, url, opts)`. It attaches the bearer token, retries once after a silent refresh on a 401 and throws `ApiError` (`status`, `code`, `fields` for form validation errors, `code: 'offline'` on network failure).
  - The access token is kept **in memory only**, never in localStorage. The refresh token is an httpOnly cookie, and `refreshSession()` deduplicates concurrent refreshes.
  - Uploads use `uploadWithProgress` (XHR) because fetch has no upload progress.
  - Real-time updates use `subscribe()`, which reads SSE from `/api/events` over fetch because EventSource can't send an Authorization header. It reconnects in a loop.
- **Auth (`src/lib/auth.tsx`)**: `useAuth()` gives `user`, `ready`, `login` (optional TOTP), `register` and `logout`. Roles: `citizen | officer | commander | investigator | admin`. On boot the app restores the session through the refresh cookie and renders nothing until `ready`.
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
