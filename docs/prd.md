# SAFEGUARD: Product Requirements Document

| | |
|---|---|
| **Product** | SAFEGUARD: public-safety reporting, emergency SOS and tamper-evident digital evidence platform |
| **Document version** | 1.0 (2026-11-19) |
| **Product version covered** | v0.1 dev build, plus roadmap to v1.0 |
| **Source brief** | [init prompt.md](../init%20prompt.md) (master development prompt) |
| **Companion docs** | [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) (technical decisions) · [API.md](../../docs/API.md) (endpoint reference) · [README.md](../../README.md) (setup) |
| **Status** | Draft, pending stakeholder and legal review |

> **How to read this document.** Every requirement has an ID (`FR-AREA-n` / `NFR-n`), a priority and a build status.
> - **Priority:** **P0** = must exist for v1.0 launch · **P1** = needed soon after launch · **P2** = later or optional
> - **Status:** ✅ Done in v0.1 · 🟡 Partial · ⬜ Not started
>
> This PRD defines *what* and *why*. ARCHITECTURE.md defines *how*. Where they conflict, raise it as an open question (§14). Don't silently diverge from either.

---

## 1. Summary

SAFEGUARD is a mobile-first web platform (with a planned native companion app) that connects **citizens**, **police officers**, **station commanders**, **investigators** and **system administrators** around four capabilities:

1. **Incident reporting**, anonymous or identified, with location and media evidence.
2. **Emergency SOS**, with an honest, step-by-step delivery status that never falsely confirms help.
3. **Tamper-evident evidence management**: encryption, SHA-256 hashing, a ledger-anchored chain of custody and purpose-gated access.
4. **Case collaboration**: assignment, messaging, notes, status workflow and auditing.

The public service is free. The business is sustained by institutional subscriptions (§12).

## 2. Problem statement

| Who | Problem today | Consequence |
|---|---|---|
| Citizens | Reporting means visiting a station, fear of retaliation, and no way to follow up | Under-reporting, especially of GBV, harassment and cybercrime |
| Citizens in danger | They can't always make a voice call safely, and don't know whether anyone received their alert | Delayed response, false reassurance |
| Officers and investigators | Evidence arrives through WhatsApp or USB with no provenance | Integrity is disputed and custody can't be documented |
| Institutions | No auditable record of who accessed sensitive data and why | Exposure under the Data Protection Act 2019, and loss of public trust |

## 3. Goals and non-goals

### 3.1 Goals
- **G1 Accessible reporting:** a first-time user can submit a report with a photo in **under 3 minutes** on a low-end Android phone over 3G.
- **G2 Honest emergency signalling:** every SOS shows exactly the furthest confirmed state, and **0** false "help is coming" messages.
- **G3 Evidence integrity:** any change to stored evidence or its custody history is **detectable 100% of the time** at access.
- **G4 Accountable access:** every view, download, transfer and identity reveal is attributable to a person and a stated purpose.
- **G5 Privacy by default:** anonymous reporters are not identifiable from what SAFEGUARD collects, and admins can't read case content.

### 3.2 Non-goals
- SAFEGUARD is **not** the police and does not replace emergency numbers (999 / 112 / 911 in Kenya).
- **No** automated identification of suspects, **no** facial recognition, **no** AI-determined guilt.
- **No** promise that anonymous reporters can always be traced, and **no** guarantee that evidence will be admissible in court.
- **No** raw evidence or personal data on any blockchain.
- **No** interception of hardware buttons in ways the OS forbids (see FR-SOS-H).
- **No** monetisation of evidence or personal data.

## 4. Users and personas

| Role | Persona | Primary jobs | Key constraint |
|---|---|---|---|
| `citizen` (incl. anonymous) | *Wanjiru*, 24, student in Nairobi, mid-range Android, intermittent data | Report harassment safely; follow up; get help fast | Fear of exposure; limited data; may not read English well |
| `officer` | *Cpl. Grace Muthoni*, patrol officer | Receive SOS; review assigned incidents; talk to reporters | Works mostly from a phone in the field |
| `commander` | Officer commanding a station | Triage incoming reports; assign officers and investigators; grant download rights | Accountable for the station's caseload |
| `investigator` | *Det. Faith Achieng*, DCI | Examine evidence, verify integrity, document custody, build the case | Needs court-defensible provenance |
| `admin` | Platform operations | Manage accounts, departments and configuration; monitor security | **Must not** see case content or evidence |

**Separation-of-duties principle:** administrative power and investigative access are disjoint. Commanders control case access, and admins control accounts.

## 5. Key user journeys (acceptance scenarios)

These two journeys are the release acceptance tests. v1.0 cannot ship unless both pass end to end on a real Android and iOS device.

### J1: Report → investigate → verify
1. A citizen opens SAFEGUARD and chooses **Report anonymously** (or signs in for an identified report).
2. They complete the guided wizard: category → what happened → when/where (GPS, map tap or search) → evidence (in-app camera or upload) → contact preference → review.
3. On submit, the system hashes, encrypts and stores each file, registers its hash in the ledger and shows a **reference number plus a one-time tracking code**.
4. Commanders are notified in real time. A commander assigns an officer and an investigator.
5. The investigator opens an evidence item, states a purpose and sees **"Integrity verified"** (a fresh hash matches the ledger).
6. The investigator messages the reporter. The anonymous reporter replies via **Track a report**.
7. Every step appears in the case timeline and the evidence chain of custody.

### J2: SOS
1. A citizen presses **SOS – REQUEST EMERGENCY HELP**. A short countdown appears with optional emergency-type selection, **Send now** and **Cancel** (and optional follow-up details for responders can be added once sent).
2. The device captures the current location (or the last known location, clearly labelled).
3. Status advances only as it is confirmed: `queued → sent → delivered → acknowledged → dispatched`.
4. If offline, the alert is queued locally and retried, and the citizen is offered the **native dialer** and an **SMS share** fallback.
5. A responder's dashboard marks the alert *delivered* on receipt. The responder acknowledges it and later records a dispatch with a note.

## 6. Functional requirements

### 6.1 Accounts, authentication and access control (`AUTH`)

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-AUTH-1 | Citizens can self-register with email and password. Phone is optional. | P0 | ✅ |
| FR-AUTH-2 | Staff accounts are created by admins and start as `pending_verification` until activated. | P0 | ✅ |
| FR-AUTH-3 | Passwords are hashed with Argon2id. Lockout after repeated failures. Auth endpoints are rate-limited. | P0 | ✅ |
| FR-AUTH-4 | Short-lived (15 min) access tokens are held in memory only. Refresh tokens are httpOnly cookies with rotation and reuse detection. | P0 | ✅ |
| FR-AUTH-5 | TOTP MFA is available to all users and **enforced for staff** in production. | P0 | 🟡 enforcement is behind a flag |
| FR-AUTH-6 | Five roles (`citizen`, `officer`, `commander`, `investigator`, `admin`) are enforced **on the server** for every request. The client-side guards are UX only. | P0 | ✅ |
| FR-AUTH-7 | Case access is granted only by assignment, following the access matrix in ARCHITECTURE.md §2. | P0 | ✅ |
| FR-AUTH-8 | Role changes and suspension take effect on the next request and revoke all assignments. | P0 | ✅ |
| FR-AUTH-9 | Institutional (multi-tenant) accounts and attribute-based rules (department, jurisdiction). | P1 | ⬜ |

### 6.2 Incident reporting (`RPT`)

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-RPT-1 | A multi-step guided wizard with a progress indicator. Each step fits on one phone screen. | P0 | ✅ |
| FR-RPT-2 | 13 categories: theft, assault, sexual harassment, GBV, road accident, missing person, fire, robbery, domestic violence, cybercrime, suspicious activity, public disturbance, other. | P0 | ✅ |
| FR-RPT-3 | Fields: category, description, date/time, location, severity, preferred contact method, optional reporter details. | P0 | ✅ |
| FR-RPT-4 | **Anonymous mode:** no account needed, no IP logged, no identity fields. Returns a reference and a one-time tracking code. The limits of anonymity are explained in plain language before submission. | P0 | ✅ |
| FR-RPT-5 | **Identified mode:** linked to the account. Identity is visible only to assigned staff after they state a purpose (FR-CASE-6). | P0 | ✅ |
| FR-RPT-6 | Every submission gets a unique, human-readable incident reference. | P0 | ✅ |
| FR-RPT-7 | Citizens can view their own reports and status. Anonymous reporters track theirs with reference + code. | P0 | ✅ |
| FR-RPT-8 | Draft persistence, so a dropped connection doesn't lose a half-written report. | P1 | ⬜ |
| FR-RPT-9 | Citizens never see other citizens' identities, contact details or confidential reports. | P0 | ✅ |

### 6.3 Emergency SOS (`SOS`)

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-SOS-1 | A red **SOS – REQUEST EMERGENCY HELP** button is reachable from the home screen and every main screen. | P0 | ✅ |
| FR-SOS-2 | A short countdown with optional emergency-type selection, **Send now** (skips the countdown) and **Cancel**, plus optional post-trigger details for responders. The countdown must never block a genuine emergency. | P0 | ✅ |
| FR-SOS-3 | Captures current GPS. Otherwise uses the last-known location, **labelled as such**. Also works with no location at all. | P0 | ✅ |
| FR-SOS-4 | States `initiated / queued → sent → delivered → acknowledged → dispatched`. Each state is set only by the actor defined in ARCHITECTURE.md §4. **No state is ever displayed before it is confirmed.** | P0 | ✅ |
| FR-SOS-5 | Offline queue with an idempotency key and automatic retry. Pending alerts survive an app restart. | P0 | ✅ |
| FR-SOS-6 | Native dialer fallback using configured emergency numbers, and an SMS-share fallback through the user's SMS app. | P0 | ✅ |
| FR-SOS-7 | Live location updates during an active SOS, shared only with responders. | P0 | ✅ (in-app only) |
| FR-SOS-8 | **Discreet mode:** no sound, minimal screen, no sensitive details on screen. The camera and microphone are never activated secretly. | P0 | ✅ |
| FR-SOS-9 | **Test mode** sends a clearly labelled test alert that never reaches the live feed as a real emergency. | P0 | ✅ |
| FR-SOS-10 | Trusted emergency contacts, notified (with the user's consent) with the reference, location and a restricted-access status link. | P1 | 🟡 contacts stored; automatic notification needs SMS provider |
| FR-SOS-11 | Responder dashboard: active SOS feed, map, acknowledge, dispatch with a note. | P0 | ✅ |
| FR-SOS-12 | Rate limiting and abuse detection that **never blocks** a first or genuine alert. | P0 | 🟡 |
| FR-SOS-13 | SMS gateway delivery (e.g. Africa's Talking) when there's no data. | P1 | ⬜ |
| FR-SOS-14 | Integration with an official emergency-service API, mapping its delivery receipts onto FR-SOS-4 states. | P2 | ⬜ (depends on a partnership) |

#### FR-SOS-H: Hardware and alternative activation (native companion app)

Third-party apps **cannot** intercept power/side or volume-button presses on a locked phone on either Android or iOS without abusing accessibility services (which is prohibited; see ARCHITECTURE.md §4). Requirements are scoped to what each OS supports:

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-SOS-H1 | Guided setup page explaining the device's **native** Emergency SOS shortcut, required permissions, what is shared and how to test safely. | P0 | ✅ (web) |
| FR-SOS-H2 | Android Quick Settings tile (usable from the lock screen) and a home-screen widget. | P1 | ⬜ |
| FR-SOS-H3 | iOS Lock Screen widget / Control Center control, plus App Intents (Siri and the Action Button). | P1 | ⬜ |
| FR-SOS-H4 | Wear OS / watchOS one-tap complication. | P2 | ⬜ |
| FR-SOS-H5 | Background location during an active SOS (Android foreground service, iOS "Always" permission). | P1 | ⬜ |
| FR-SOS-H6 | A published **device compatibility matrix** covering locked, background, killed, offline, GPS off, low battery and permissions-revoked states. | P0 for native launch | ⬜ |
| FR-SOS-H7 | PWA app-shortcut "SOS" (Android long-press on the icon). | P1 | 🟡 |

### 6.4 Maps and location (`MAP`)

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-MAP-1 | Detect current location with permission. Pick a location by tapping the map or by place/landmark search, with nearby basemap landmarks visible. Text and coordinate-sharing fallback. | P0 | ✅ |
| FR-MAP-2 | Staff map with colour-coded markers: **red** emergency, **orange** high priority, **blue** general, **green** resolved. Each marker also has a text or shape cue so colour isn't the only signal. | P0 | ✅ |
| FR-MAP-3 | Filters by category, date and severity. "Assigned to me" view. Directions link. | P0 | ✅ |
| FR-MAP-4 | Location precision depends on role. The public map shows only coarsened, non-confidential points. Exact locations of vulnerable reporters or confidential cases are never public. | P0 | ✅ |
| FR-MAP-5 | Marker clustering and geographic pattern (heatmap) views for staff. | P1 | ⬜ (needs PostGIS) |
| FR-MAP-6 | Production tile and geocoding provider that complies with usage policies. | P0 for launch | ⬜ |

### 6.5 Evidence capture and storage (`EVD`)

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-EVD-1 | In-app photo, video and audio capture, with preview, retake and discard. Upload media and documents (PDF) from device storage. Per-item description. | P0 | ✅ |
| FR-EVD-2 | Upload progress and retry. Files are validated by magic bytes, not by extension. | P0 | ✅ |
| FR-EVD-3 | SHA-256 of the **original** bytes. AES-256-GCM envelope encryption with a per-file key. Only ciphertext is stored. | P0 | ✅ |
| FR-EVD-4 | Originals are never modified, compressed or overwritten. Derivatives (previews, transcodes) are stored separately and labelled. | P0 | 🟡 no derivatives yet |
| FR-EVD-5 | Metadata: evidence ID, incident ID, upload time, original name, type, size, hash, uploader or anonymous reference, verification status. | P0 | ✅ |
| FR-EVD-6 | Capture/EXIF/GPS metadata is extracted and shown as **"user-submitted, unverified"**, kept separate from verified facts. | P1 | ⬜ |
| FR-EVD-7 | Malware scanning (e.g. ClamAV) before evidence is available to staff. | P0 for launch | 🟡 hook only |
| FR-EVD-8 | Chunked, resumable uploads for low bandwidth. | P1 | ⬜ |
| FR-EVD-9 | No normal delete function for anyone. Lawful disposal goes through a dual-authorised crypto-shredding process that appends a `DISPOSED` record. | P0 / P1 | ✅ / ⬜ |

### 6.6 Integrity ledger and chain of custody (`LED`)

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-LED-1 | Each evidence registration writes `{evidence_id, sha256, size, mime}` to an append-only, signed ledger behind a `LedgerAdapter` interface. | P0 | ✅ (local hash chain) |
| FR-LED-2 | The ledger stores **only** identifiers, hashes and action types. Purpose text is stored off-ledger, with only its hash anchored. | P0 | ✅ |
| FR-LED-3 | On every open: authenticate → authorise → record purpose → decrypt → fresh hash → compare with the ledger and the DB → show pass/fail → log. A failure alerts commanders. | P0 | ✅ |
| FR-LED-4 | Chain of custody records: submitted, accessed (who, when, why), verified, viewed, downloaded, transferred (from/to), disposed. | P0 | ✅ |
| FR-LED-5 | DB-level triggers block UPDATE/DELETE on integrity fields, custody, ledger and audit tables. | P0 | ✅ |
| FR-LED-6 | **Permissioned multi-party ledger** (Hyperledger Besu, QBFT, ≥ 4 validators run by different organisations) with an `EvidenceRegistry` contract and an outbox so ledger outages don't block intake. | P1 | ⬜ |
| FR-LED-7 | Exportable per-item **evidence certificate** (hash, custody log, verification results) to support Evidence Act s.106B. No claim of admissibility. | P1 | ⬜ |

Blockchain is never used in place of encryption or authorisation.

### 6.7 Case management (`CASE`)

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-CASE-1 | Commanders see new incidents and assign officers and investigators. Download permission is granted separately. | P0 | ✅ |
| FR-CASE-2 | Assigned officers can add investigators. | P0 | ✅ |
| FR-CASE-3 | Status workflow, with every change visible to the reporter. | P0 | ✅ |
| FR-CASE-4 | Investigation notes, recorded actions, escalation to a department, requests for more information. | P0 | ✅ |
| FR-CASE-5 | Case timeline that combines status, assignments, messages, evidence and custody events. | P0 | ✅ |
| FR-CASE-6 | Reporter identity reveal requires a stated purpose and is logged. | P0 | ✅ |
| FR-CASE-7 | Evidence transfer between authorised custodians, recorded in custody. | P0 | ✅ |
| FR-CASE-8 | Generated investigation report (PDF) for a case. | P1 | ⬜ |
| FR-CASE-9 | Evidence access history view per item for investigators. | P0 | ✅ |

### 6.8 Communication (`COM`)

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-COM-1 | Incident-scoped messaging between the reporter and the case team, including anonymous reporters via the tracking code. | P0 | ✅ |
| FR-COM-2 | Staff-only internal thread per case. | P0 | ✅ |
| FR-COM-3 | Real-time push (SSE) and an in-app notification centre. | P0 | ✅ |
| FR-COM-4 | Message timestamps and delivery/read indicators. | P0 / P1 | ✅ / ⬜ |
| FR-COM-5 | File attachments in messages, going through the evidence pipeline when attached to a case. | P1 | ⬜ |
| FR-COM-6 | WebRTC voice calls (initiate, accept, reject, end, status, call record) with a self-hosted SFU and TURN server. | P1 | ⬜ |
| FR-COM-7 | Optional video calls with explicit camera and microphone permission. | P2 | ⬜ |
| FR-COM-8 | Calls are **not recorded** unless there's a legal basis, notice to all parties and a documented retention policy. | P0 (constraint) | n/a |
| FR-COM-9 | Web push (FCM/APNs) and email notifications. | P1 | ⬜ |

### 6.9 AI assistance (`AI`)

Every AI output is labelled **"AI suggestion"**, requires human confirmation and is never shown to citizens as a decision.

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-AI-1 | Category and priority suggestions on new reports. | P2 | ⬜ |
| FR-AI-2 | Summarisation of long descriptions for triage. | P2 | ⬜ |
| FR-AI-3 | English ↔ Kiswahili translation of messages and reports, with the original always kept. | P2 | ⬜ |
| FR-AI-4 | Audio transcription of submitted evidence (derivative, never replacing the original). | P2 | ⬜ |
| FR-AI-5 | Duplicate-report detection and "missing information" prompts. | P2 | ⬜ |
| FR-AI-6 | Aggregate trend analytics (counts and areas, never individual profiling). | P2 | ⬜ |
| FR-AI-X | **Prohibited:** facial recognition, suspect identification, guilt scoring. | n/a | n/a |

### 6.10 Administration (`ADM`)

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-ADM-1 | Manage users, roles, status and institutional verification. | P0 | ✅ |
| FR-ADM-2 | Manage departments. | P0 | ✅ |
| FR-ADM-3 | Overview and security metrics (failed logins, denied access, lockouts). | P0 | ✅ |
| FR-ADM-4 | Audit-log viewer with evidence-access purposes **redacted** for admins. | P0 | ✅ |
| FR-ADM-5 | Platform configuration: emergency numbers, SOS settings, integration status (`configured` / `not_configured`). | P0 | ✅ |
| FR-ADM-6 | System health monitoring (latency, queue depth, ledger lag). | P1 | ⬜ |
| FR-ADM-7 | Admins have **no** route to case content, evidence or reporter identity. | P0 | ✅ |

### 6.11 Experience, accessibility and localisation (`UX`)

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-UX-1 | The home screen has branding, a welcome message, SOS, report, anonymous report, my reports, map, call emergency services, help and language switch; light/dark theme toggle across the app and a role-based sidebar dashboard shell for staff and administrators. | P0 | ✅ |
| FR-UX-2 | Emergency numbers appear on every page. A disclaimer of the platform's role is always reachable. | P0 | ✅ |
| FR-UX-3 | **Full** English and Kiswahili coverage of every screen, including errors. | P0 | 🟡 nav and home only |
| FR-UX-4 | Every action shows a loading, success or failure state. Error messages say how to fix the problem. No dead buttons. | P0 | ✅ |
| FR-UX-5 | Installable PWA. The offline shell keeps the SOS page and emergency numbers available. API responses and evidence are never cached. | P0 | ✅ |
| FR-UX-6 | Privacy policy, terms of service and help centre in both languages. | P0 | 🟡 |

## 7. Non-functional requirements

| ID | Category | Requirement | Target / measure |
|---|---|---|---|
| NFR-1 | Performance | Citizen first load on a slow 3G connection | ≤ 4 s to interactive. Citizen JS bundle ≤ 200 KB gzip, with staff code lazy-loaded |
| NFR-2 | Performance | Time for an SOS to reach the server, online | p95 ≤ 3 s from the tap on **Send now** |
| NFR-3 | Performance | SOS shown on a responder dashboard | p95 ≤ 2 s after `sent` |
| NFR-4 | Availability | SOS intake and responder feed | 99.9% monthly. Report intake 99.5% |
| NFR-5 | Durability | Evidence ciphertext and ledger | No loss. Object Lock (WORM) storage, PITR backups, tested restore every quarter |
| NFR-6 | Security | Transport | TLS 1.2+ only, HSTS, strict CSP, Helmet defaults |
| NFR-7 | Security | Keys | Master/KEK in KMS/HSM. Ledger signing key never in code or the frontend. Rotation without re-encrypting files |
| NFR-8 | Security | App security | Input validation on every endpoint. Parameterised SQL only. XSS/CSRF protections. Dependency and SAST scanning in CI. External penetration test before launch |
| NFR-9 | Privacy | Data minimisation | Anonymous flow stores no IP or device identifiers. Retention schedule per data class (SOS locations, messages, audit) |
| NFR-10 | Accessibility | Standard | WCAG 2.2 AA. Keyboard-only and screen-reader (TalkBack, VoiceOver) walkthroughs of J1 and J2 pass. Touch targets ≥ 44 px |
| NFR-11 | Compatibility | Devices | Android 10+ (Chrome), iOS 16+ (Safari), current desktop browsers. Tested on at least one low-end Android device (≤ 3 GB RAM) |
| NFR-12 | Scalability | Horizontal | Stateless API instances. Redis for SSE fan-out and rate limits. PostgreSQL + PostGIS |
| NFR-13 | Observability | Ops | Structured logs (no PII or evidence content), metrics, alerting on SOS-delivery latency and integrity failures |
| NFR-14 | Auditability | Tamper evidence | Any edit, deletion or reordering of ledger, custody or audit records is detected by chain verification |

## 8. Data and privacy model (summary)

| Data class | Sensitivity | Encrypted at rest | Who can read | Retention (proposed, to be confirmed by counsel) |
|---|---|---|---|---|
| Evidence files | Very high | ✅ per-file key | Assigned staff + purpose | Case life + statutory period, then crypto-shred |
| Reporter identity and contacts | High | ✅ | Assigned staff + purpose | Case life + statutory period |
| SOS location trail | High | ✅ | Responders during the alert. Assigned staff afterwards | 90 days unless linked to a case |
| Messages | High | at-rest DB encryption | Case participants | Case life |
| Audit, custody and ledger | Medium | Integrity-protected | Assigned staff (custody), admins (audit, redacted) | Permanent (append-only) |
| Account data | Medium | Partially (MFA secrets) | The user, admins | Account life + 1 year |

Full mapping lives in the DPIA (a launch prerequisite, see §11).

## 9. Success metrics

| Metric | Target (first 6 months after launch) |
|---|---|
| Report completion rate (wizard started → submitted) | ≥ 70% |
| Median time to submit a report with one photo | ≤ 3 min |
| SOS false-confirmation incidents | **0** (tracked as a P0 bug class) |
| Median SOS `sent → acknowledged` | ≤ 60 s during staffed hours |
| Median time from report to first staff action | ≤ 24 h |
| Evidence integrity check failures not caused by real tampering | 0 |
| Share of anonymous reports with at least one follow-up message | Tracked baseline |
| Accessibility defects (WCAG AA) open at release | 0 critical / 0 serious |

## 10. Release plan

| Release | Scope | Exit criteria |
|---|---|---|
| **v0.1 (current)** | Phases 1–5 core, plus messaging and SSE (see ✅ items) | J1 and J2 pass on dev. Server e2e tests green |
| **v0.5 Pilot-ready** | PostgreSQL/PostGIS, KMS, Object Lock storage, ClamAV, enforced staff MFA, full Kiswahili, legal pages, production map provider, CI security scans | Pen test with no open high or critical findings. DPIA approved. One institution signs an MOU |
| **v0.8 Native companion** | Expo/React Native app: QS tile, lock-screen widgets, App Intents, background location during SOS, push, SMS fallback | Device compatibility matrix (FR-SOS-H6) published |
| **v1.0 Launch** | Besu ledger, evidence certificate, case PDF report, resumable uploads, voice calls | All P0 ✅. J1 and J2 accepted on real devices with responders |
| **v1.x** | AI suggestions, video calls, analytics, institutional subscriptions | Per-feature review, including an AI safety review |

## 11. Compliance requirements (Kenya)

These **gate the launch**. Each needs sign-off by qualified Kenyan counsel.

| Framework | Requirement for SAFEGUARD | Status |
|---|---|---|
| Data Protection Act 2019 | DPIA; ODPC registration; lawful basis per processing purpose; data-subject rights workflow; 72 h breach notification runbook; cross-border transfer assessment (host in Kenya preferred); children's data rules | 🟡 minimisation and purpose logging done; the rest ⬜ |
| Computer Misuse and Cybercrimes Act 2018 | Detect and log unauthorised access; incident-response procedure; evidence preservation | 🟡 |
| Evidence Act (Cap. 80) s.106B | Support electronic-evidence certificates through custody and hashes | 🟡 data captured, certificate ⬜ |
| Constitution Arts. 29, 31, 35, 47 | Privacy by default; reasons recorded for administrative actions; status transparency to reporters | ✅ |
| Institutional | MOUs with onboarding institutions; staff verification | 🟡 |
| Product claims | No impersonation of police, no claim of government endorsement, no admissibility guarantee, clear disclaimers | ✅ |

## 12. Business model

- **Free forever:** public reporting, SOS, tracking and messaging for citizens.
- **Paid (institutional):** universities, private security firms, hospitals, malls, residential estates, county governments.

| Tier | Intended for | Includes |
|---|---|---|
| Community | Small estates and colleges | Dashboard, up to N staff seats, standard support |
| Professional | Security firms, hospitals, malls | + SOS responder console, custom categories, SLA |
| Enterprise / Government | Counties, large institutions | + dedicated deployment, API integrations, SSO, training, dedicated validator node |

Requirements: **FR-BIZ-1** tenants and institutional onboarding · **FR-BIZ-2** subscription tiers and billing records · **FR-BIZ-3** usage metering (**counts only, never content**) · **FR-BIZ-4** tenant data isolation. All are P2 and ⬜.

**Hard rule:** no revenue stream may involve selling, sharing or analysing evidence or personal data.

## 13. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A user believes help is coming when it isn't | Medium | Critical | Strict state semantics (FR-SOS-4); native dialer always offered; copy reviewed with responders |
| Malicious or prank SOS floods responders | Medium | High | Rate limits per account and device that never block a first alert; abuse review; test mode |
| Insider misuse of evidence or identity | Medium | Critical | Assignment-only access, purpose gating, immutable audit, commander alerts, multi-party ledger |
| A single operator rewrites history (local ledger) | Low | High | Move to multi-party Besu (FR-LED-6) |
| Anonymous reporter is de-anonymised from content | Medium | High | Plain-language warnings; EXIF shown as unverified, with an option to strip metadata from shared derivatives |
| Low adoption by police without a formal partnership | High | High | Pilot with private security and universities first; MOUs; training |
| Map provider or OSM usage-policy breach | Medium | Medium | Commercial or self-hosted tiles before launch (FR-MAP-6) |
| Hardware SOS expectations exceed what the OS allows | High | Medium | Honest setup guide (FR-SOS-H1); point users to native OS SOS |

## 14. Open questions

1. Which first institution will pilot (university security office or private security firm)? This decides the v0.5 scope.
2. Who operates the ≥ 4 Besu validator nodes, and under what governance agreement?
3. What are the confirmed statutory retention periods per data class (§8)?
4. Hosting: is a Kenyan data centre available that meets KMS and Object Lock requirements, or is a cross-border transfer assessment needed?
5. Should anonymous reporters be able to opt in to a trusted-contact relay without creating an account?
6. Native app stack: Expo/React Native (shared TS) or fully native Kotlin and Swift?
7. Age gate policy for minors reporting (guardian involvement versus child-protection referral).

## 15. Glossary

| Term | Meaning |
|---|---|
| **Reference** | Public, human-readable incident identifier |
| **Tracking code** | One-time secret that lets an anonymous reporter view and reply to their report |
| **Purpose** | Free-text justification recorded before evidence or identity access |
| **Chain of custody** | Ordered, append-only record of every handling event for an evidence item |
| **Ledger** | Append-only, signed hash chain (now) or permissioned blockchain (planned) anchoring evidence hashes and custody events |
| **Delivered (SOS)** | The alert was rendered on at least one responder dashboard, which is not the same as acknowledged |
| **Crypto-shredding** | Lawful disposal by destroying an item's encryption key and ciphertext, recorded as `DISPOSED` |
