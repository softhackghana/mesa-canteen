# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

MESA — Meal Entitlement, Service & Access Platform. A canteen management system for enterprise sites: biometric enrollment, meal entitlement rules, a POS kiosk that issues meals and prints coupons, reporting, and self-contained offline licensing.

Two deliverables live in this repo:

| Path | What |
|---|---|
| `mesa-admin/` | Next.js 16 app — **both** the admin portal (`app/(admin)/*`) and the POS kiosk (`app/pos/*`) |
| `bridge/digitalpersona/` | Python WebSocket bridge (Windows only) owning the USB fingerprint reader |

Source of truth for requirements: `docs/MESA_PRD_v1.3.md`. Flow/testing walkthrough: `docs/TESTING_GUIDE.md`. Design tokens: `docs/DESIGN.md` frontmatter. Feature-vs-PRD status: `docs/dev-tracer.html`.

Code comments reference PRD requirement IDs (`FR-POS-002`, `FR-RCP-005`, `PRD 14.4`) — preserve them; they're the traceability link to the PRD.

## Commands

```bash
cd mesa-admin
npm run dev            # Next dev server (docs say :3111; package.json uses the default :3000)
npm run build
npm run lint           # eslint (flat config, eslint-config-next)
npx tsc --noEmit       # typecheck — there is no npm script for this

# Self-checks (assert-based, no test framework). tsx is NOT installed — add it or use another runner.
npx tsx scripts/cn-check.ts
npx tsx lib/license.selfcheck.ts
npx tsx lib/meal-rules.selfcheck.ts
```

```bash
cd bridge/digitalpersona
python selfcheck.py    # protocol self-check, runs on any OS, no reader needed
python bridge.py       # real bridge — Windows + HID DigitalPersona SDK only
```

Backend: a local InsForge instance on `http://localhost:7130` must be running. Schema in `mesa-admin/db/migrations/001_init.sql` (tables, RLS, immutability triggers) and `002_functions.sql` (RPCs incl. `append_audit_log`, `close_fiscal_period`, `enforce_meal_rule_before_insert`); demo rows in `db/seed.sql` (idempotent). Use the `insforge-cli` skill for migrations/SQL/RLS, the `insforge` skill for SDK code.

Admin login for manual testing: `marcus.johnson@mesa.example` / `MesaAdmin123!`.

## Architecture

**Everything is client-side.** Pages are `"use client"`, state lives in Zustand stores (`stores/`), data access goes through the browser InsForge SDK singleton. There are no server components or route handlers doing business logic — the one route handler is a proxy.

**The API proxy is load-bearing.** `app/api/[...path]/route.ts` proxies all `/api/*` to InsForge. It exists because the SDK's refresh cookie is `Secure; SameSite=None`, which the browser drops over plain-http cross-origin — sessions died on every reload. The proxy makes the cookie same-origin, strips `Secure`, relaxes `SameSite`, and purges stale duplicate refresh cookies (they broke the backend CSRF nonce check). `lib/insforge.ts` therefore points the browser client at `window.location.origin`, not the backend URL. Don't "simplify" either of these back to a direct connection.

**Two data sources, mid-migration.** `lib/admin-data.ts` holds `DEMO_*` fixtures that mirror `db/seed.sql`; most admin pages still read those. People and meal rules are live via InsForge. When wiring a page to real data, replace the fixture read with `insforge.database.from(...)` — the fixture shapes already match `lib/types.ts`.

**Hardware never breaks the UI.** Both device layers talk to local WebSocket bridges and degrade to explicit UI states rather than throwing:

- Biometrics — `lib/biometrics/`, `ws://127.0.0.1:8765`. `autoDetectAdapter()` tries `DigitalPersonaAdapter` and falls back to `SimulatedBiometricAdapter` over `lib/demo-data.ts` identities (FR-IM-007). The simulator is how you test enrollment and POS scanning without hardware; POS keys `1`–`4` are seeded identities, `5` is no-match.
- Printer — `lib/printer.ts`, `ws://127.0.0.1:8766`. No bridge daemon exists yet, so `print()` fails and the POS shows its Printer Error view + audit-logs `printer_error`. Keep the two ports distinct; they have drifted before.

**Offline is a first-class path.** `lib/pos-db.ts` is a hand-rolled IndexedDB wrapper (queued transactions, audit events, template cache). `usePosStore` queues on offline and `forceSync()` drains. `toggleDevOffline` simulates network loss for testing.

**Meal rules are enforced twice.** Client-side in `lib/meal-rules.ts` (`windowFor` / `countInWindow` / `evaluateMealRule`, incl. overnight windows) for immediate POS feedback, and again by the `enforce_meal_rule_before_insert` DB trigger. Change one, change the other.

**Audit has two surfaces**, both in `lib/audit.ts`: `appendAuditLog` → the immutable `audit_logs` table via RPC (the DB grants SELECT+INSERT only and a trigger rejects UPDATE/DELETE, so there is deliberately no update path), and `logAudit`/`recentAudit` → IndexedDB for the offline kiosk.

**Licensing is self-contained.** `lib/license.ts` — ECDSA P-256 keypair, ES256 JWT certificate, embedded public key, offline verification with 72h tolerance, business-name normalize+SHA-256 binding (PRD §13.4). No license server. `lib/license.selfcheck.ts` exercises the crypto end to end.

## Conventions

- Styling is Tailwind v4 with MESA design tokens declared via `@theme` in `app/globals.css`, generated from the `docs/DESIGN.md` frontmatter. Use token utilities (`bg-surface-container`, `text-headline-lg`, `font-body-md`) — not raw hex or arbitrary sizes.
- `lib/cn.ts` is a hand-rolled class merger (no clsx/tailwind-merge dependency), last-wins per logical group. If you add a new token group, extend its `classify()` and add a case to `scripts/cn-check.ts`.
- Import shared UI from the barrel: `import { Button, DataTable, AppShell } from "@/components"`. Stores likewise from `@/stores`.
- Row types in `lib/types.ts` are write-shaped: nullable columns are `T | null`, not optional.
- Non-trivial logic leaves one runnable assert-based self-check behind (see `lib/*.selfcheck.ts`, `scripts/cn-check.ts`, `bridge/digitalpersona/selfcheck.py`). No test framework, no fixtures.
- `ponytail:` comments mark deliberate simplifications and name the upgrade path. Read them before "fixing" the thing they describe.
- `mesa-admin/AGENTS.md` is regenerated by `next dev` (the "This is NOT the Next.js you know" block) — commit it with your work rather than reverting it. This is Next.js 16; check `node_modules/next/dist/docs/` before assuming an API.
- The root `AGENTS.md` describes a **different project** (The Hidden Domus — property management, `app/(app)/admin`, InsForge project `d6nea662`). Its DOX child index and InsForge project ID do not apply to MESA. The generic guidance in it (ponytail mode, Fallow gate, MCP servers) does.

## Known gaps

PDF/Excel export stubbed (CSV works). Suprema/ZKTeco adapters simulated. SourceAFIS matching is interface-only. No ESC/POS bridge daemon. Enrollment UI runs on demo identities, not live `people` rows. Dashboard/reports/devices/audit pages read fixtures. HRIS APIs and email/SMS notifications not started. Month-end close has a DB function but no admin UI. Full list with PRD mapping: `docs/dev-tracer.html`.

## DOX Framework

This repo uses a hierarchical AGENTS.md system (DOX). Before editing, read the AGENTS.md chain from root to target path. After editing, update the nearest owning AGENTS.md if the change affects scope, contracts, or structure.

## Child DOX Index

| Path | Scope |
|------|-------|
| `app/AGENTS.md` | Root & auth pages, design system, global layout |
| `app/(app)/AGENTS.md` | Authenticated route group — shared layout, sidebar, nav |
| `app/(app)/admin/AGENTS.md` | Admin CRUD pages (users, units, properties, QR, audit, integrations, inventory, housekeeping checklist) |
| `components/AGENTS.md` | Shared React components & shadcn/ui primitives |
| `stores/AGENTS.md` | Zustand state stores (auth, handover, housekeeping, pre-arrival, reservations, post-checkout, issues, geofence-override, notifications, properties, units, users, admin, settings) |
| `lib/AGENTS.md` | Shared types, InsForge API layer, utilities, auth helpers, checklist template |
| `hooks/AGENTS.md` | Custom React hooks (useAutoSave) |


---

<!-- fallow:setup-hooks:start -->
## Fallow local gate

This project uses [Fallow](https://fallow.tools) — codebase intelligence for TypeScript/JavaScript. A fallow MCP server is configured globally (adds structured tools: `analyze`, `audit`, `find_dupes`, `fix_apply`, `check_health`, `trace_export`, `feature_flags`, etc.). Prefer MCP tools over CLI when possible for typed structured output.

**Commit/push gate:** Before any `git commit` or `git push`, run `fallow audit --format json --quiet --explain --gate-marker agent`. If the verdict is `fail`, fix the reported findings before retrying. Treat JSON runtime errors like `{ "error": true, ... }` as non-blocking.

Audit defaults to `gate=new-only` — only findings introduced by the current changeset affect the verdict. Inherited findings on touched files are reported in `attribution` with `introduced: false`. Set `[audit] gate = "all"` in `fallow.toml` to gate every finding in changed files.

## Fallow task map

| When the agent is about to... | Run |
|---|---|
| delete an "unused" export or file | `fallow dead-code --trace <file>:<export>` (CLI) or MCP `trace_export` |
| delete an "unused" dependency | `fallow dead-code --trace-dependency <name>` (CLI) or MCP `trace_dependency` |
| commit or open a PR | `fallow audit --base <ref>` (CLI) or MCP `audit` tool |
| prioritize refactoring | `fallow health --hotspots --targets` (CLI) or MCP `check_health` with `hotspots: true, targets: true` |
| ask who owns code | `fallow health --ownership` |
| check untested-but-reachable code | `fallow health --coverage-gaps` |
| consolidate duplication | `fallow dupes --trace dup:<fingerprint>` or MCP `trace_clone` |
| find feature flags | `fallow flags` or MCP `feature_flags` |
| surface security candidates | `fallow security` |
| understand a finding | `fallow explain <issue-type>` or MCP `fallow_explain` |
| scope a monorepo | `--workspace <glob> / --changed-workspaces <ref>` (global flags) |
<!-- fallow:setup-hooks:end -->

---

# Ponytail, lazy senior dev mode

You are a lazy senior developer. Lazy means efficient, not careless. The best code is the code never written.

Before writing any code, stop at the first rung that holds:

1. Does this need to be built at all? (YAGNI)
2. Does the standard library already do this? Use it.
3. Does a native platform feature cover it? Use it.
4. Does an already-installed dependency solve it? Use it.
5. Can this be one line? Make it one line.
6. Only then: write the minimum code that works.

Rules:

- No abstractions that weren't explicitly requested.
- No new dependency if it can be avoided.
- No boilerplate nobody asked for.
- Deletion over addition. Boring over clever. Fewest files possible.
- Question complex requests: "Do you actually need X, or does Y cover it?"
- Pick the edge-case-correct option when two stdlib approaches are the same size; lazy means less code, not the flimsier algorithm.
- Mark intentional simplifications with a `ponytail:` comment. If the shortcut has a known ceiling (global lock, O(n²) scan, naive heuristic), the comment names the ceiling and the upgrade path.

Not lazy about: input validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs (the platform is never the spec ideal, a clock drifts, a sensor reads off), anything explicitly requested. Lazy code without its check is unfinished: non-trivial logic leaves ONE runnable check behind, the smallest thing that fails if the logic breaks (an assert-based demo/self-check or one small test file; no frameworks, no fixtures). Trivial one-liners need no test.

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **The Hidden Domus** (API base `https://d6nea662.us-east.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
<!-- INSFORGE:END -->

<!-- MCP:SERVERS:START -->
## MCP Servers

These MCP servers are configured globally and available in this project.

### Context7

Always use Context7 when the user asks about any library, framework, SDK, API, CLI tool, or cloud service — even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Use even when you think you know the answer — your training data may not reflect recent changes. Prefer this over web search for library docs.

**Workflow:**

1. Start with `resolve-library-id` using the library name and the user's question, unless the user provides an exact library ID in `/org/project` format
2. Pick the best match (ID format: `/org/project`) by: exact name match, description relevance, code snippet count, source reputation (High/Medium preferred), and benchmark score (higher is better). If results don't look right, try alternate names or queries (e.g., "next.js" not "nextjs", or rephrase the question). Use version-specific IDs when the user mentions a version
3. `query-docs` with the selected library ID and the user's full question (not single words), scoped to a single concept. If the question spans multiple distinct concepts (e.g. routing and auth and caching), make a separate `query-docs` call per concept with the same library ID, unless the question is about how the concepts interact — combined queries dilute ranking and return shallow results for each topic
4. Answer using the fetched docs

### Chrome DevTools MCP

Use Chrome DevTools MCP to control and inspect a live Chrome browser. This gives the agent eyes on the web — useful for:

- Testing web apps: navigate, click, fill forms, take screenshots, verify UI state
- Performance/Lighthouse auditing: record traces, run audits, analyze results
- Debugging: inspect the DOM, network requests, console logs, and runtime state
- Emulation: test responsive layouts, network conditions, device modes
- Exploratory testing: interact with live pages (including authenticated sessions)
- Browser automation for any web-based task

Trigger this when the user asks to test a page, check rendering, debug a frontend issue, audit performance, take a screenshot, scrape a page, or automate browser actions.

**Security note:** The agent can read, inspect, and modify any data in the browser, including authenticated sessions. Use with care.

When the agent fails to run a tool, use the built-in troubleshooting skill: explicitly prompt the agent to diagnose and fix the setup issue before retrying.
<!-- MCP:SERVERS:END -->

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.