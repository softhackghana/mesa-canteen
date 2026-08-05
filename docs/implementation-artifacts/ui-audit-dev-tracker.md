# Dev Tracker: MESA UI/UX Audit Fixes

- Plan: `docs/ui-audit.md`
- Code doc: this tracker
- Last updated: 2026-08-05
- **Resume here:** All phases complete. Last verified 2026-08-05.

## Decisions & Verifications
- Kiosk typography: reuse/add `text-display-lg` (32/700), `text-display-md` (28/700), `text-kiosk-body` (18/500), `text-kiosk-label` (14/500) declared in `globals.css`. Updated `DESIGN.md` to document them.
- POS result actions: create `PosPrimaryAction`, `PosSecondaryAction`, `PosTextAction` shared components in `app/pos/_components/PosActions.tsx` with minimum 56px touch height.
- Reduced motion: wrap continuous keyframe animations in `@media (prefers-reduced-motion: reduce)` and remove `animate-bounce`/`*-pulse` utilities for users who prefer reduced motion.
- Mono token usage: keep `font-data-mono text-data-mono` only for IDs, codes, timestamps, currency/transaction refs, receipt data; replace with `font-body-md` / `font-label-md` for prose, labels, helper text, summary values.
- Hardcoded hex cleanup: map dynamic license tone to semantic container classes; replace POS hardcoded success/warning colors with `bg-success-container`/`text-on-success-container`/warning tokens; replace arbitrary shadow with `shadow-overlay`.
- Async feedback: add local `isLoading` state to each POS async button; disable and show spinner while pending.

## Phase 1 — Global Design System
- [x] 1.1 Update `mesa-admin/app/globals.css` — add `prefers-reduced-motion` guards around `.pulse-ring`, `.pulse-amber`, `.progress-bar-fill`; verify kiosk tokens exist; add `.page-container` utility.
- [x] 1.2 Update `docs/DESIGN.md` — document kiosk typography scale and reduced-motion rule.
- [x] 1.3 Wrap admin main content in `max-w-[1600px] mx-auto` via `.page-container` in `AppShell`.

## Phase 2 — Admin Typography & Token Cleanup
- [x] 2.1 `components/layout/filter-chips.tsx` — use `font-body-md` for chip counts.
- [x] 2.2 `app/(admin)/dashboard/page.tsx` — replace prose mono with `font-body-md`; fix terminal heartbeat age formatting; chart counts use `font-body-md`.
- [x] 2.3 `app/(admin)/people/page.tsx` — mono cleanup; guard `initials()`; action button sizing.
- [x] 2.4 `app/(admin)/meal-rules/page.tsx` — mono cleanup for day buttons, site/department tags, subsidy labels.
- [x] 2.5 `app/(admin)/reports/page.tsx` — replace hand-rolled daily table with `DataTable`; add labels to date inputs; summary stats use `font-body-md font-semibold`; loading state.
- [x] 2.6 `app/(admin)/templates/page.tsx` — listbox semantics, mono cleanup, preview width token, add-field button sizing.
- [x] 2.7 `app/(admin)/devices/page.tsx` — mono cleanup; align heartbeat age with status color.
- [x] 2.8 `app/(admin)/license/page.tsx` — mono cleanup; map dynamic color to token classes; deactivate secondary style.
- [x] 2.9 `app/(admin)/settings/page.tsx` — mono cleanup; styled radio group.
- [x] 2.10 `app/(admin)/audit/page.tsx` — mono cleanup; add `EmptyState`.
- [x] 2.11 `app/(admin)/people/enroll/page.tsx` — mono cleanup; SVG font via CSS token.
- [x] 2.12 `app/login/page.tsx` — body typography, password toggle, SSO hint, footer version.

## Phase 3 — POS Component Standardization & Tokens
- [x] 3.1 Create `app/pos/_components/PosActions.tsx` — `PosPrimaryAction`, `PosSecondaryAction`, `PosTextAction` with loading state.
- [x] 3.2 Replace all POS `text-[28px]`, `text-[24px]`, `text-[20px]`, `text-[11px]`, `text-lg` with kiosk tokens.
- [x] 3.3 Raise every POS button/link to ≥44px (primary/secondary 56–64px).
- [x] 3.4 Replace hardcoded hex/arbitrary shadows in POS with semantic tokens.

## Phase 4 — POS Accessibility
- [x] 4.1 Convert `<div onClick>` fingerprint area to `<button>` in `pos/login/page.tsx`.
- [x] 4.2 Add `aria-hidden="true"` to decorative icons in POS views (Icon component handles most).
- [x] 4.3 Add `role="dialog"` / `aria-modal="true"` to `NoMatchView`, `ManualEntrySheet`; `OverrideModal` already had them.
- [x] 4.4 Restore visible focus rings on POS buttons/inputs; replace `DeniedView` ⚠ emoji with `Icon`.
- [x] 4.5 Respect `prefers-reduced-motion` for continuous animations via globals.css.

## Phase 5 — POS Async Feedback
- [x] 5.1 Add loading states to `ApprovedView` reprint, `PrinterErrorView` retry, `NoMatchView` try again, `OverrideModal` authorise, `ManualEntrySheet` submit, `ShiftSummaryView` print/sign-out, `OfflineBanner` force sync.

## Phase 6 — Verification
- [x] 6.1 `cd mesa-admin && npm run build` passes.
- [x] 6.2 `cd mesa-admin && npx tsc --noEmit` passes.
- [x] 6.3 `npx tsx scripts/cn-check.ts` passes.
- [x] 6.4 `npx tsx lib/meal-rules.selfcheck.ts` passes.
- [x] 6.5 `npx tsx lib/license.selfcheck.ts` passes.
- [x] 6.6 fallow audit new-only introduced dead-code resolved; remaining findings are inherited.

## Blockers / Notes
- `npm run lint` still reports pre-existing errors in `stores/*` (`any` types) and warnings outside the changed files. These are not introduced by this work.
- `PosResultCard` / `PosStatusHeading` abstractions were skipped: `PosActions` plus direct token classes were enough to standardise the result views (YAGNI).
- Bridge `selfcheck.py` could not run locally because `websockets` is not installed; it is unrelated to these UI changes.
