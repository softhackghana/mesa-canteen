# MESA — How It Works, Flows & Testing Guide

> Source of truth: `docs/MESA_PRD_v1.3.md` · `docs/DESIGN.md` · codebase `mesa-admin/`
> Written 2026-08-04 · Status reflects current build

---

## 1. The Stack

| Layer | Technology |
|---|---|
| Admin portal + POS kiosk | Next.js app — `mesa-admin/` (dev server `:3111`) |
| Backend | Local InsForge (`http://localhost:7130`, Postgres) |
| Database access | `@insforge/sdk` client (`lib/insforge.ts`) |
| API bridge | `app/api/[...path]/route.ts` proxy — keeps auth cookies alive across reloads |
| Offline storage | IndexedDB wrapper `lib/pos-db.ts` + localStorage queue |
| Device adapters | `lib/biometrics/*` (DigitalPersona real, Suprema/ZKTeco simulated) |
| Printer | `lib/printer.ts` — ESC/POS over WebSocket |

**Auth:** InsForge email/password → token session. Login:
`marcus.johnson@mesa.example` / `MesaAdmin123!`

---

## 2. High-Level Flow

```
Login (admin or POS operator)
        │
        ▼
Admin Portal (/dashboard, /people, /meal-rules, /reports,
/devices, /license, /templates, /settings, /audit)
        │
        └── Enrollment: /people/enroll → 3-impression scan → quality check
                → duplicate 1:N check → template saved
        │
        ▼
POS kiosk (/pos) — operator login
        │
        ▼
Idle screen polls scanner (background, always listening)
        │
        ▼
Employee places finger
        │
        ▼
Scan → match (auto-detect adapter: DigitalPersona bridge first,
fallback = simulator)
        │
        ├─ match + entitlement OK  → APPROVED (coupon prints) → meal issued
        ├─ match + duplicate / over window → DENIED
        └─ no match → No Match screen → fallback RFid/PIN or Supervisor Override
        │
        ▼
Offline? → transaction queued to IndexedDB → auto-sync on reconnect
```

---

## 3. Core Modules & How Each Works

### 3.1 Authentication & Sessions
- InsForge auth with email/password.
- `AuthGate` (client component) wraps the admin layout; spins until the session
  hydrate resolves, then redirects to `/login` only if truly unauthenticated.
- The proxy route normalizes the InsForge refresh cookie (`Secure`,
  `SameSite=None` → `SameSite=Lax`, single `Path=/api/auth` cookie) so sessions
  survive full page reloads cross-origin.

### 3.2 People Master (`/people`)
- Live data via `stores/people-store.ts` against the InsForge `people` table.
- Full profile CRUD: First Name, Last Name, Employee ID, Cost Centre,
  Department, Site; unique Employee ID enforced in DB.
- Bulk import via CSV (store has a bulk insert path).
- Secondary credentials: RFID card / PIN per profile.

### 3.3 Biometric Enrollment (`/people/enroll`)
- 3-step wizard: pick employee → capture 3 impressions → save.
- Simulated adapter runs the UI; `DigitalPersonaAdapter` (real) uses the
  WebSocket bridge protocol (`ws://127.0.0.1:8765`).
- Quality score gauge (rejects < default 80%), real-time 1:N duplicate check.
- Templates stored as SourceAFIS-style minutiae only (never raw images).

### 3.4 Meal Rules Engine (`/meal-rules`)
- Configurable rules: meal period, window (e.g. 11:00–14:00), max meals,
  active days, cost centres, sites, subsidy % (company vs employee), duplicate
  blocking toggle.
- Client-side evaluation: `windowFor()` / `countInWindow()` /
  `evaluateMealRule()` in `lib/meal-rules.ts` (selfcheck file included).
- DB-side enforcement: `enforce_meal_rule_before_insert` trigger —
  duplicate / over-window inserts are rejected at the database level.

### 3.5 POS Kiosk (`/pos`)
- **Operator login** first (`/pos/login`) — PIN-based.
- **Idle screen** polls the scanner continuously (FR-POS-001).
- **Scan flow** (per key): 1–4 scan seeded identities, 5 = no match.
- On approved meal: green Approved view, transaction logged, coupon print
  dispatched automatically (FR-RCP-001).
- Manual fallback sheet (RFID swipe / PIN entry) and Supervisor Override modal
  (supervisor PIN authorizes; audited).
- Dev offline toggle (`toggleDevOffline`) simulates network loss:
  transactions queue to IndexedDB and `forceSync()` pushes on reconnect
  (FR-POS-002/003).
- Shift summary + end shift views.

### 3.6 Receipt / Coupon Printing
- `renderCoupon()` builds real ESC/POS byte strings (align, bold, feed, cut),
  base64-encoded.
- Sent over WebSocket to `ws://127.0.0.1:8766` (ESC/POS bridge).
- Printer status surfaced: online / paper_out / cover_open / error; failures
  set a Printer Error view and audit-log a `printer_error` event.
- Reprint last coupon button (audit-logged, FR-RCP-005).
- Print enable/disable + site overrides in `/settings`.

### 3.7 Receipt Template Designer (`/templates`)
- WYSIWYG editor with drag-to-reorder fields, alignment, font size, bold,
  separators; live 80mm thermal-paper preview at `280px` width.
- Field set: Business Name, Site, Employee Name/ID, Department, Cost Centre,
  Meal Period, Date, Time, Tx Ref, Subsidy, Employee-Paid, barcode/QR,
  cashier, terminal, custom message.

### 3.8 Reports (`/reports`)
- Consolidated Meals per Employee (grouped by cost centre/department).
- Customer Statements for a date range.
- CSV export works; PDF/Excel stubbed (`ponytail:` marker — server-side
  export worker pending).

### 3.9 Devices (`/devices`)
- Terminal dashboard: name, IP, software version, last heartbeat, scanner
  vendor/model detected; remote restart / session logoff commands
  (ack simulated pending native agent).

### 3.10 License (`/license` + `/dashboard` widget)
- Self-contained ECDSA P-256 licensing: activate with a
  `MESA-XXXXX-XXXXX-XXXXX-XXXXX` key + registered business name; name
  normalisation + SHA-256 hash match per PRD §13.4.
- Signed JWT certificate (ES256) stored locally; offline verification with
  embedded public key; 72h offline tolerance.
- 30-day renewal warning, grace period (default 7 days), license status page
  (tier / expiry / limits / usage).
- `lib/license.selfcheck.ts` exercises the crypto end-to-end.

### 3.11 Audit (`/audit`)
- Immutable audit log (DB trigger blocks UPDATE/DELETE for every role).
- Events: overrides, profile changes, rule adjustments, sync events, license
  lifecycle, reprints, printer errors. Filterable + CSV export.

### 3.12 Settings (`/settings`)
- Global receipt-printing toggle + per-site overrides pushed to terminals on
  next heartbeat.

---

## 4. How to Test It Today (no hardware)

Start everything:

```bash
cd mesa-admin
npm run dev          # admin + POS at http://localhost:3111
# InsForge backend must be running on http://localhost:7130
```

### 4.1 Login
1. Visit `http://localhost:3111` → redirected to `/login`.
2. Sign in: `marcus.johnson@mesa.example` / `MesaAdmin123!`.
3. Land on `/dashboard`. **Hard reload** — session should persist (this was
   the bug we fixed; verify it stays).

### 4.2 People
1. `/people` — create / edit / deactivate a profile.
2. `/people/enroll` — run the 3-impression wizard; watch the quality gauge and
   duplicate detection against the seeded demo identities.

### 4.3 Meal rules
1. `/meal-rules` — create a rule (e.g. Lunch 11:00–14:00, max 1, block
   duplicates, 75% subsidy).
2. Try a duplicate meal for the same person inside the window via POS →
   should be DENIED. Try outside the window → APPROVED.
3. DB trigger also enforces this server-side (insert is rejected).

### 4.4 POS kiosk
1. `http://localhost:3111/pos` → operator login (seeded PIN from
   `DEMO_SUPERVISOR`/`demo-data.ts`).
2. Idle screen — press keys:
   - `1`–`4` → scan seeded identities → Approved view + coupon print attempt
   - `5` → no match → fallback sheet
3. Fallbacks: card/PIN entry sheet; Supervisor Override (enter supervisor PIN,
   reason) → approved + audit entries `override` + `meal_issued`.
4. Reprint last coupon — button on approved view (audit `reprint`).
5. Shift summary → end shift.

### 4.5 Offline + sync
1. Toggle Dev Offline (UI switch) — banner shows Offline Mode.
2. Scan a meal → queued (queued count increments; IndexedDB).
3. Toggle back online → sync pushes queue, count resets.

### 4.6 Reports
1. `/reports` — pick report type + date range → export CSV.

### 4.7 License
1. `/license` — activate / renew with a test key (see `lib/license.ts`
   `generateLicenseKey()`), verify status page, grace/expiry states by
   back-dating a certificate.

### 4.8 Templates
1. `/templates` — drag fields, save, watch the 80mm live preview. Persistence
   of design is UI-local today.

### 4.9 Audit
1. `/audit` — filter by action/actor, export CSV; confirm entries from your
   POS tests landed there.

---

## 5. Real DigitalPersona — Can I Use It Now?

**Partially.** `DigitalPersonaAdapter` (`lib/biometrics/DigitalPersonaAdapter.ts`)
implements the real device protocol: initialize/capture/identify, auto-detect by
USB VID, connects to a WebSocket bridge (`ws://127.0.0.1:8765`).

**What is missing:** the native bridge daemon. It is a small native program
that wraps the DigitalPersona SDK on the enrollment PC and speaks that
WebSocket protocol. Without it the adapter fails to connect and, by design
(FR-IM-007), the POS falls back to the simulator so the kiosk never dies.

So: build the bridge → plug in the U.are.U scanner → enrollment/scan become
real. Until then the simulator covers the full UI/flow testing.

## 6. Real Printing — Does It Work?

**Logic yes, printer no.** `renderCoupon()` produces genuine ESC/POS bytes and
the POS dispatches them on approval (auto) and reprint. But there is no ESC/POS
bridge daemon on `ws://127.0.0.1:8766` yet, so:

- Without bridge: `print()` returns `{ok:false}` → POS shows Printer Error
  view, audit logs `printer_error`.
- To test the pipeline without hardware: run a tiny mock WS server on `:8766`
  that replies `{"type":"status","status":"online"}` and
  `{"type":"printed","id":<id>}` on print — coupons then "print" (you can log
  the received ESC/POS bytes).
- For real output: ESC/POS-compatible 80mm thermal printer + bridge daemon.

## 7. Test Feed — Seeded Data

- Demo identities come from `lib/demo-data.ts` (names, employee IDs, RFID,
  PINs, templates). POS keys 1–5 map to them.
- `DEMO_SUPERVISOR` PIN is in `app/pos/_store.ts` (or `demo-data.ts` if
  exported there) — find it there for override tests.
- InsForge `people` table is seeded; admin login user
  `marcus.johnson@mesa.example` linked to `user_profiles` (`system_admin`).

## 8. Known Gaps vs PRD (see `docs/dev-tracer.html`)

| Area | Status |
|---|---|
| Suprema / ZKTeco adapters | Simulated (DigitalPersona real) |
| SourceAFIS matching | Adapter interface only; real engine needs native/WASM |
| Real DP / real printing | Needs bridge daemon(s) |
| PDF / Excel export | Stubbed (CSV works) |
| Month-end UI | DB function `close_fiscal_period()` exists, no admin page button yet |
| HRIS inbound / outbound APIs | Not started |
| Notification channels (email/SMS) | Not started |
| Dashboard / audit / reports / devices data | Demo fixtures; people + meal rules are live |
| Enrollment persistence | UI runs on demo identities (not yet wired to live people) |

---

*MESA — Meal Entitlement, Service & Access Platform · Confidential*