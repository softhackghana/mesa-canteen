# Dev Tracker: MESA UI/UX Audit Fixes

- Plan: `docs/ui-audit.md`
- Code doc: this tracker
- Last updated: 2026-08-05
- **Resume here:** Phase 1, Task 1.1 — Add kiosk tokens, reduced-motion guards, and page max-width utilities to `mesa-admin/app/globals.css` and `docs/DESIGN.md`. Pending decisions: none.

## Decisions & Verifications
- Kiosk typography: reuse/add `text-display-lg` (32/700), `text-display-md` (28/700), `text-kiosk-body` (18/500), `text-kiosk-label` (14/500) already declared in `globals.css`. Update `DESIGN.md` to document them.
- POS result actions: create `PosPrimaryAction`, `PosSecondaryAction`, `PosTextAction` shared components in `app/pos/_components/PosActions.tsx` with minimum 56px touch height.
- Reduced motion: wrap continuous keyframe animations in `@media (prefers-reduced-motion: reduce)` and remove `animate-bounce`/`*-pulse` utilities for users who prefer reduced motion.
- Mono token usage: keep `font-data-mono text-data-mono` only for IDs, codes, timestamps, currency/transaction refs, receipt data; replace with `font-body-md` / `font-label-md` for prose, labels, helper text, summary values.
- Hardcoded hex cleanup: map dynamic license tone to semantic container classes; replace POS hardcoded success/warning colors with `bg-success-container`/`text-on-success-container`/warning tokens; replace arbitrary shadow with `shadow-overlay`.
- Async feedback: add local `isLoading` state to each POS async button; disable and show spinner while pending.

## Phase 1 — Global Design System
- [ ] 1.1 Update `mesa-admin/app/globals.css` — add `prefers-reduced-motion` guards around `.pulse-ring`, `.pulse-amber`, `.progress-bar-fill`; verify kiosk tokens exist; add `.page-container` utility or use `max-w-7xl mx-auto`.
- [ ] 1.2 Update `docs/DESIGN.md` — document kiosk typography scale and reduced-motion rule.
- [ ] 1.3 Wrap admin main content in `max-w-7xl mx-auto` (either in `AppShell` or via a shared page wrapper).

## Phase 2 — Admin Typography & Token Cleanup
- [ ] 2.1 `components/layout/filter-chips.tsx` — use `font-body-md` for chip counts.
- [ ] 2.2 `app/(admin)/dashboard/page.tsx` — replace prose mono with `font-body-md`; fix terminal heartbeat age formatting; chart counts use `font-body-md`.
- [ ] 2.3 `app/(admin)/people/page.tsx` — mono cleanup; guard `initials()`; action button sizing.
- [ ] 2.4 `app/(admin)/meal-rules/page.tsx` — mono cleanup for day buttons, site/department tags, subsidy labels.
- [ ] 2.5 `app/(admin)/reports/page.tsx` — replace hand-rolled daily table with `DataTable`; add labels to date inputs; summary stats use `font-body-md font-semibold`; loading state.
- [ ] 2.6 `app/(admin)/templates/page.tsx` — listbox semantics, mono cleanup, preview width token, add-field button sizing.
- [ ] 2.7 `app/(admin)/devices/page.tsx` — mono cleanup; align heartbeat age with status color.
- [ ] 2.8 `app/(admin)/license/page.tsx` — mono cleanup; map dynamic color to token classes; deactivate secondary style.
- [ ] 2.9 `app/(admin)/settings/page.tsx` — mono cleanup; styled radio group.
- [ ] 2.10 `app/(admin)/audit/page.tsx` — mono cleanup; add `EmptyState`.
- [ ] 2.11 `app/(admin)/people/enroll/page.tsx` — mono cleanup; SVG font via CSS token.
- [ ] 2.12 `app/login/page.tsx` — body typography, password toggle (optional), footer version.

## Phase 3 — POS Component Standardization & Tokens
- [ ] 3.1 Create `app/pos/_components/PosActions.tsx` — `PosPrimaryAction`, `PosSecondaryAction`, `PosTextAction` with loading state.
- [ ] 3.2 Create `app/pos/_components/PosResultCard.tsx` and `app/pos/_components/PosStatusHeading.tsx` for consistent result views.
- [ ] 3.3 Replace all POS `text-[28px]`, `text-[24px]`, `text-[20px]`, `text-[11px]`, `text-lg` with kiosk tokens.
- [ ] 3.4 Raise every POS button/link to ≥44px (primary/secondary 56–64px).
- [ ] 3.5 Replace hardcoded hex/arbitrary shadows in POS with semantic tokens.

## Phase 4 — POS Accessibility
- [ ] 4.1 Convert `<div onClick>` fingerprint area to `<button>` in `pos/login/page.tsx`.
- [ ] 4.2 Add `aria-hidden="true"` to decorative icons in POS views.
- [ ] 4.3 Add `role="dialog"` / `aria-modal="true"` to `NoMatchView`, `ManualEntrySheet`, `OverrideModal`.
- [ ] 4.4 Restore visible focus rings; replace `DeniedView` ⚠ emoji with `Icon`.
- [ ] 4.5 Respect `prefers-reduced-motion` for continuous animations.

## Phase 5 — POS Async Feedback
- [ ] 5.1 Add loading states to `ApprovedView` reprint, `PrinterErrorView` retry, `NoMatchView` try again, `OverrideModal` authorise, `ManualEntrySheet` submit, `ShiftSummaryView` print/sign-out, `OfflineBanner` force sync.

## Phase 6 — Verification
- [ ] 6.1 `cd mesa-admin && npm run build` passes.
- [ ] 6.2 `cd mesa-admin && npm run lint` passes.
- [ ] 6.3 `cd mesa-admin && npx tsc --noEmit` passes.
- [ ] 6.4 Update this tracker with verification results and mark phases complete.

## Blockers / Notes
- None yet.
