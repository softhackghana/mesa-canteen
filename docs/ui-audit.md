# MESA UI/UX Audit — Admin Portal & POS Kiosk

**Date:** 2026-08-05  
**Scope:** `mesa-admin/app` — all admin pages and the POS kiosk segment  
**Method:** Code review + live browser inspection at `http://localhost:3002`  
**Screenshots:** `/tmp/ui-audit/01-login.png` through `/tmp/ui-audit/15-pos-no-match.png`

---

## Executive Summary

The biggest single problem is **type system abuse**: the app overuses `font-data-mono text-data-mono` (12px JetBrains Mono) for labels, prose, KPIs, helper text, and captions. The result feels like a terminal rather than a professional desktop admin product. The second biggest problem is **POS inconsistency**: success/denied/no-match/printer-error views use different heading sizes, button heights, and color approaches for the same semantic actions, and several kiosk buttons fall below the 44px minimum touch target. This audit groups issues by page and by cross-cutting theme, with exact file paths, line numbers, and recommended fixes.

---

## 1. Global / Design-System Issues

### 1.1 Typography token `text-data-mono` is used for prose, not data
**Rule broken:** DESIGN.md says JetBrains Mono is for "IDs, order numbers, and currency values". It is being used everywhere else.
**Evidence:**
- People filter chips show counts in `font-data-mono text-data-mono` — `components/layout/filter-chips.tsx:58-59`.
- Meal Rules day buttons, cost-centre chips, site/department tags use `font-data-mono text-data-mono` — `app/(admin)/meal-rules/page.tsx:172`, `:193-199`, `:219`, `:244`.
- Reports summary stats, day-count cells, footer prose use `font-data-mono text-data-mono` — `app/(admin)/reports/page.tsx:370-375`, `:450`, `:454-455`, `:469-471`.
- License labels, metadata, helper text, and capacity percentages use `font-data-mono text-data-mono` — `app/(admin)/license/page.tsx:47-48`, `:54-55`, `:138-139`, `:150-156`, `:159-161`, `:166-169`, `:184-185`, `:192-200`, `:204-205`, `:234-235`, `:248-250`.
- Devices form labels and helper text use `font-data-mono text-data-mono` — `app/(admin)/devices/page.tsx:280`, `:297`, `:319`, `:327-328`.
- Templates explanatory text, layout hints, and live-preview caption use `font-data-mono text-data-mono` — `app/(admin)/templates/page.tsx:177`, `:212-213`, `:255-256`, `:275`, `:325`.
- Settings printer helper text uses `font-data-mono text-data-mono` — `app/(admin)/settings/page.tsx:86`.
- Audit filter summary, actor/source labels, and security note use `font-data-mono text-data-mono` — `app/(admin)/audit/page.tsx:136`, `:245-246`, `:248-249`, `:295`.

**Why it matters:** 12px monospace is hard to scan for body copy and makes the admin portal feel technical/cold. It also reduces legibility for non-engineer users (cashiers, HR, finance).

**Fix:**
- Prose, helper text, captions, section labels, and instructional copy → `font-body-md text-body-md` or `font-body-lg text-body-lg`.
- Numeric **summary** values (meals, costs, percentages) → `font-body-md text-body-md font-semibold` or `font-body-lg text-body-lg`.
- Keep `font-data-mono text-data-mono` only for: employee IDs, cost-centre IDs, transaction refs, timestamps, terminal IPs/versions, raw JSON change logs, and receipt-style tabular data.

---

### 1.2 POS kiosk type scale is a patchwork of arbitrary sizes
**Rule broken:** DESIGN.md tokens stop at `text-headline-lg` (24px); POS needs larger kiosk scale but none exists, so every view invents arbitrary sizes.
**Evidence:**
- `app/pos/page.tsx:125` `text-[28px]`, `:169` `text-[11px]`, `:179` `text-[28px]`.
- `app/pos/login/page.tsx:82-83` `text-[24px]` + `text-[28px]`, `:120` `text-[24px]`, `:147` `text-[11px]`.
- `app/pos/_components/ApprovedView.tsx:42` `text-[28px]`, `:60` `text-[24px]`, `:73-75` raw hex `#166534`/`#dcfce7`.
- `app/pos/_components/DeniedView.tsx:21` `text-[28px]` + emoji `⚠` in heading string.
- `app/pos/_components/NoMatchView.tsx:30` `text-[28px]`.
- `app/pos/_components/PrinterErrorView.tsx:37` `text-[28px]`, `:41` `text-[20px]`, `:47-48` `text-[11px]` (below 12px).
- `app/pos/_components/ShiftSummaryView.tsx:34` `text-[28px]`, `:57` `text-lg`, `:59` `text-[28px]`, `:67/80/93/101` `text-[20px]`.

**Why it matters:** Inconsistent sizes across result views break muscle memory and look unpolished. Arbitrary values also bypass the token system.

**Fix:**
- Add kiosk-only tokens to `app/globals.css` / `docs/DESIGN.md`:
  - `text-display-lg` 32px/700, `text-display-md` 28px/700 for main result headings.
  - `text-kiosk-body` 18px/500 for body text at arm's length.
  - `text-kiosk-label` 14px/500 for secondary metadata.
- Replace all POS `text-[28px]`, `text-[24px]`, `text-[20px]`, `text-[11px]`, `text-lg`, `text-base` with these tokens.
- Minimum POS body text = 14px; never 10–11px.

---

### 1.3 Hardcoded hex / arbitrary Tailwind values bypass tokens
**Evidence:**
- `app/pos/login/page.tsx:80` hardcoded `shadow-[0_4px_20px_rgba(23,28,31,0.04)]]`; token `shadow-overlay` exists.
- `app/pos/_components/ApprovedView.tsx:41` `bg-[rgba(220,252,231,0.8)]` + `text-[#166534]`; should be `bg-success-container text-on-success-container`.
- `app/pos/_components/PrinterErrorView.tsx:20` `bg-[#d0f1d1] border-[#1d6d21]`; should use `bg-success-container border-success`.
- `app/pos/_components/PrinterErrorView.tsx:56` `bg-[#ffdcbe] border-[#855000]`; should use `bg-warning-container border-warning`.
- `app/pos/_components/OfflineBanner.tsx:15` `bg-[#f59e0b]`; should use `bg-warning`.
- `app/pos/_components/OverrideModal.tsx:43` hardcoded shadow again.
- `app/(admin)/license/page.tsx:42` inline `backgroundColor: tone` for dynamic license card color.
- `app/(admin)/people/enroll/page.tsx:52` inline `fontFamily: "Manrope, sans-serif"`.
- `app/(admin)/templates/page.tsx:25` `font-mono` instead of token `font-data-mono`.
- `app/(admin)/templates/page.tsx` (preview container) hardcoded `w-[280px]`.

**Fix:** Remove every arbitrary value that has a token equivalent. For dynamic license tone, map status to pre-defined token classes (`bg-success-container`, `bg-warning-container`, etc.) instead of injecting a CSS variable into `style`.

---

### 1.4 Animation lacks `prefers-reduced-motion`
**Evidence:** `app/globals.css` defines `.pulse-ring`, `.pulse-amber`, and `.progress-bar-fill` keyframes without `@media (prefers-reduced-motion: reduce)` guards. POS views also use Tailwind `animate-pulse` / `animate-bounce` unguarded.
**Fix:** Wrap all continuous animations in a media query; in reduced-motion mode show a static state instead.

---

### 1.5 Page containers have no max-width
**Evidence:** All admin pages render content directly in `main` without a `max-w-*` wrapper. On ultra-wide monitors tables and grids stretch indefinitely.
**Fix:** Add `max-w-7xl mx-auto` or `max-w-[1600px] mx-auto` around main content; tables can still overflow-scroll inside that container.

---

## 2. Admin Portal — Per Page Findings

### 2.1 Login page (`app/login/page.tsx`)
**Screenshot:** `/tmp/ui-audit/01-login.png`

| Issue | Location | Severity | Fix |
|---|---|---|---|
| Heading looks clickable but is static | `h1 MESA` | Low | Reduce visual affordance or make it a home link. |
| SSO button disabled without visible "why" | button title exists but not shown inline | Low | Add short hint below button, not only tooltip. |
| Form labels not associated with inputs | `label` uses `htmlFor` correctly | OK | — |
| No "show password" toggle | — | Low | Add password visibility toggle. |
| Footer `MESA v1.0` is all-caps data-mono | line ~? | Low | Use `font-body-md` for copyright/version line. |

---

### 2.2 Dashboard (`app/(admin)/dashboard/page.tsx`)
**Screenshot:** `/tmp/ui-audit/02-dashboard.png`

| Issue | Location | Severity | Fix |
|---|---|---|---|
| Terminal health shows `103638s ago` (29h) while status says "Online" | live data mapping bug | **High** | Fix heartbeat age threshold or formatting; green "Online" for 29h-old heartbeat is misleading. |
| "Meals Served This Week" chart is hand-built with inline `style={{ height }}` | ~line 250+ | Medium | Use SVG or a tiny chart component; current div-height approach is hard to maintain and lacks axis/empty state. |
| Exception log and recent activity use ad-hoc tables | ~line 300+ | Medium | Reuse `DataTable` component for consistency. |
| Chart bar labels use `font-data-mono` for counts | ~line 260 | Medium | Use `font-body-md`. |
| No empty state when no transactions | — | Low | Add `EmptyState` component when `txs.length === 0`. |
| License widget duplicates logic also in `/license` | — | Low | Consider extracting a shared `LicenseCard` later (not critical). |

---

### 2.3 People Master (`app/(admin)/people/page.tsx`)
**Screenshot:** `/tmp/ui-audit/03-people.png`

| Issue | Location | Severity | Fix |
|---|---|---|---|
| Filter chips counts use `font-data-mono` | `FilterChips` component | Medium | Use `font-body-md` for counts. |
| Table header `COST CENTRE` right-aligned? | `DataTable` default | Low | Cost centre is an ID-like code; consider right-align or keep left per English reading order. |
| "View" / "Edit" / "Enroll" action buttons are small and close together | row actions | Medium | Increase gap or use icon-only buttons with `aria-label` and min 32×32px hit area. |
| Bulk import dialog mixes file input, textarea, mapping, preview | ~line 240+ | Medium | Separate into steps or collapse mapping until CSV parsed. |
| Profile dialog tabs overflow on narrow widths | `Dialog size="lg"` | Low | Ensure dialog body has `overflow-y-auto` and tabs wrap. |
| `initials()` function crashes on missing name | ~line 62 | **High** | Guard `first_name[0]` / `last_name[0]` if fields are empty. |
| Status pill text color contrast on neutral variant | neutral badge | Low | Verify 4.5:1; neutral variant uses `text-on-surface-variant` on `bg-neutral-container`. |

---

### 2.4 Meal Rules (`app/(admin)/meal-rules/page.tsx`)
**Screenshot:** `/tmp/ui-audit/04-meal-rules.png`

| Issue | Location | Severity | Fix |
|---|---|---|---|
| Site filter chips use `font-data-mono` | ~line 193-199 | Medium | Use `font-body-md`. |
| Rule ID subtitle `ID: MR-10492` uses `font-data-mono` inside a row | ~line 314 | Low | Acceptable for an ID, but visually heavy; consider `font-label-md text-on-surface-variant`. |
| Subsidy split labels use `font-data-mono` | `:152-154`, `:356-357` | Medium | Use `font-body-md`. |
| Site/department tags use `font-data-mono` | `:219`, `:244` | Medium | Use `font-body-md`. |
| "Edit" / "Disable" buttons have inconsistent widths per row | row actions | Low | Give action buttons a fixed min-width container so rows align. |

---

### 2.5 Reports (`app/(admin)/reports/page.tsx`)
**Screenshot:** `/tmp/ui-audit/05-reports.png`

| Issue | Location | Severity | Fix |
|---|---|---|---|
| **Hand-rolled daily-breakdown table duplicates `DataTable`** | `EmployeeDailyTable` ~line 423-468 | **High** | Refactor to use shared `DataTable` with columns; this duplicates header styling, hover, pagination, and empty state. |
| Date-range inputs have no visible `<label>` | ~line 331-333 | **High** | Wrap in `Label` or add `aria-label`; the "→" alone is not a label. |
| Summary stats use `font-data-mono` | `:370-375` | Medium | Use `font-body-md font-semibold`. |
| Day-count cells in daily table use `font-data-mono` | `:450`, `:454-455` | Medium | Use `font-body-md`; only `EMP-` IDs should be mono. |
| Footer prose uses `font-data-mono` | `:469-471` | Medium | Use `font-body-md text-on-surface-variant`. |
| Loading state missing for consolidated table | `DataTable` without `loading` prop | Medium | Pass `loading` prop from `useEffect`. |
| Report cards grid uses `xl:grid-cols-4` with multi-line descriptions | `:341` | Low | Test at 1280px; if cramped use `lg:grid-cols-2 xl:grid-cols-3`. |

---

### 2.6 Receipt Templates (`app/(admin)/templates/page.tsx`)
**Screenshot:** `/tmp/ui-audit/06-templates.png`

| Issue | Location | Severity | Fix |
|---|---|---|---|
| Template list uses `li onClick` instead of a button | `:179-208` | **High** | Wrap selectable list items in `<button>` or use `role="listbox"` with `aria-selected`. |
| Drag handle and remove icons lack `aria-label` on the outer control | `:195` etc. | Medium | Ensure icon-only buttons have `aria-label`. |
| Layout fields helper text uses `font-data-mono` | `:255-256` | Medium | Use `font-body-md`. |
| Live preview hardcoded `w-[280px]` | preview container | Medium | Use `max-w-xs` token or a `w-[320px]` that matches 80mm thermal paper at 203dpi. |
| Add-field buttons are tiny chip-style | `:154-159` | Low | Use `size="sm"` `Button` variant for consistent height. |
| `font-mono` instead of `font-data-mono` in preview | `:25` | Low | Replace with token. |

---

### 2.7 Devices (`app/(admin)/devices/page.tsx`)
**Screenshot:** `/tmp/ui-audit/07-devices.png`

| Issue | Location | Severity | Fix |
|---|---|---|---|
| Form input labels / helper text use `font-data-mono` | `:280`, `:297`, `:319`, `:327-328` | Medium | Use `font-body-md` / `font-label-md`. |
| Terminal table header labels are uppercase mono | `DataTable` defaults | Low | Already per design system; OK. |
| "Restart" / "Logoff" buttons different widths | row actions | Low | Equalize button widths. |
| Last heartbeat shows "1d ago" but status chip "Online" — same as dashboard | data logic | **High** | Align heartbeat-age threshold with color status. |

---

### 2.8 License (`app/(admin)/license/page.tsx`)
**Screenshot:** `/tmp/ui-audit/08-license.png`

| Issue | Location | Severity | Fix |
|---|---|---|---|
| License metadata labels and capacity percentages use `font-data-mono` | many lines | Medium | Use `font-body-md` / `font-label-md`. |
| Inline dynamic color via `backgroundColor: tone` | `:42` | Medium | Use mapped token classes. |
| Days-remaining number (`360 days remaining`) uses `font-data-mono` | `:56-57` | Low | Use `font-body-md`. |
| "Deactivate" and "Renew" are equally prominent destructive/primary actions | header actions | Medium | Make "Deactivate" a secondary/destructive `Button` variant. |

---

### 2.9 Settings (`app/(admin)/settings/page.tsx`)
**Screenshot:** `/tmp/ui-audit/09-settings.png`

| Issue | Location | Severity | Fix |
|---|---|---|---|
| Printer helper text uses `font-data-mono` | `:86` | Medium | Use `font-body-md`. |
| Site count uses `font-data-mono` | `:131` | Low | Use `font-body-md`. |
| Radio buttons use raw `<input type="radio">` with generic labels | `:108+` | Medium | Use shared `Switch` or a styled radio group component for consistent focus rings. |
| "Unsaved Changes" badge uses `font-data-mono` | `:118-119` | Low | Use `font-label-md`. |

---

### 2.10 Audit Log (`app/(admin)/audit/page.tsx`)
**Screenshot:** `/tmp/ui-audit/10-audit.png`

| Issue | Location | Severity | Fix |
|---|---|---|---|
| Actor/source labels use `font-data-mono` | `:136` | Medium | Actor type is categorical, not machine data; use `font-body-md`. |
| Filter summary / security note use `font-data-mono` | `:245-246`, `:248-249`, `:295` | Medium | Use `font-body-md`. |
| Severity badge "Info" has low contrast against neutral container | verify | Low | Check `text-on-info-container` on `bg-info-container`. |
| Empty state is a single row; no `EmptyState` component | — | Low | Use shared `EmptyState` when no rows. |

---

### 2.11 Enrollment (`app/(admin)/people/enroll/page.tsx`)
**Screenshot:** `/tmp/ui-audit/11-enroll.png`

| Issue | Location | Severity | Fix |
|---|---|---|---|
| Stepper numbers use `font-data-mono` | `:182` | Low | OK for numeric step indicators, but could be `font-nav-item`. |
| Step labels use `font-data-mono` | `:182`, `:234-235` | Medium | Use `font-nav-item` or `font-body-md`. |
| Employee ID / cost centre use `font-data-mono` inside profile card | `:228`, `:234-235` | Acceptable | Keep for IDs. |
| Facility Access / Progress labels use `font-data-mono` | `:264-265`, `:275` | Medium | Use `font-body-md`. |
| Inline `fontFamily` in SVG | `:52` | Low | Use token via CSS class. |
| Instructional text uses `font-data-mono` | `:330` | Medium | Use `font-nav-item` / `font-body-md`. |
| Radio buttons for paper size are generic HTML | `:108+` (referenced) | Medium | Use styled radio group component. |

---

## 3. POS Kiosk Findings

### 3.1 Touch targets below minimum
**Rule:** Kiosk buttons should be ≥44px, ideally 56–64px for fast service.
**Evidence:**
- `app/pos/page.tsx:140-160` — "Manual Entry", "Supervisor Override", "Shift Summary" are ~36–44px (`px-6 py-3` / `py-2`).
- `app/pos/_components/TopBar.tsx:89-99` — "Go Offline (dev)" toggle is ~28px (`px-2 py-1`).
- `app/pos/_components/OfflineBanner.tsx:20-26` — "Force Sync" is ~32px (`px-3 py-1`).
- `app/pos/_components/ManualEntrySheet.tsx:39-60` — Mode toggles are ~32–36px (`py-2`).
- `app/pos/_components/ManualEntrySheet.tsx:88-101` — "Back to Scanner" / "Supervisor Override" text-only links are ~24px.
- `app/pos/_components/ApprovedView.tsx:93-117` — "Reprint", "Override", "Return" are 36–40px.
- `app/pos/_components/OverrideModal.tsx:165-182` — "Cancel" / "Authorise" are ~40px.
- `app/pos/_components/ShiftSummaryView.tsx:42` — Close (X) is 40×40px.

**Fix:** Define kiosk button tokens (e.g. `h-14` / `h-16`) and use them consistently. Convert text-only actions to real buttons.

---

### 3.2 Same semantic action styled inconsistently across views
**Evidence:**
| View | "Return/Dismiss/Done" button | Height | Style |
|---|---|---|---|
| ApprovedView | "Return to Scanning" | ~36px | secondary, border |
| DeniedView | "Dismiss — Return to Scanner" | 64px | secondary, h-16 |
| NoMatchView | "Try Again" | 56px | primary, h-14 |
| PrinterErrorView | "Skip — No Coupon" | 192px | grid cell, border-2 |

Supervisor Override buttons vary similarly: 40px outlined, 64px filled, 24px underlined text.

**Fix:** Create reusable POS result components: `PosPrimaryAction` (56–64px filled), `PosSecondaryAction` (56–64px outlined), `PosTextAction` (44px underlined). Use the same component for "Return to scanner" in every view.

---

### 3.3 Accessibility problems
**Evidence:**
- `app/pos/login/page.tsx:129-145` fingerprint login area is a `<div onClick>`; not keyboard focusable or activatable.
- Decorative icons lack `aria-hidden="true"` in `ApprovedView`, `NoMatchView`, `PrinterErrorView`, `ShiftSummaryView`.
- `NoMatchView` and `ManualEntrySheet` are modal-like but lack `role="dialog"` / `aria-modal="true"`.
- `OverrideModal` PIN input is `readOnly` with custom star display; focus ring removed (`focus:outline-none`) — no visible focus.
- All continuous animations lack `prefers-reduced-motion` (see 1.4).
- `DeniedView` heading contains `⚠` emoji instead of a semantic icon.

**Fix:** Convert clickable divs to `<button>`. Add `aria-hidden` on decorative icons. Add dialog roles. Restore focus rings. Replace emoji with `material-symbols-outlined` icon.

---

### 3.4 Missing feedback for async actions
**Evidence:**
- `ApprovedView` "Reprint Last Coupon" calls async `reprintLastCoupon()` with no loading/disabled state.
- `PrinterErrorView` "Retry Print" same issue.
- `NoMatchView` "Try Again" calls async `scan()` with no loading state.
- `OverrideModal` "Authorise" has `disabled={pinEntry.length === 0}` but no spinner during authorize.
- `ManualEntrySheet` submit calls async `attemptFallback()` with no spinner.
- `ShiftSummaryView` "Print Shift Report" / "Sign Out" call async actions with no loading state.
- `OfflineBanner` "Force Sync" calls async `forceSync()` with no loading state.

**Fix:** Add `isLoading` state to each async action; disable button and show a spinner while pending.

---

### 3.5 Layout / overflow
**Evidence:**
- `app/pos/_components/ApprovedView.tsx:41` green overlay uses fixed `h-[40%]` which can clip on short displays.
- `app/pos/_components/PrinterErrorView.tsx:18` uses `max-w-[1200px]`; on narrow portrait kiosks content is cramped.
- `app/pos/_components/OverrideModal.tsx:39` uses `max-w-[600px]` and no `overflow-y-auto`.
- `app/pos/_components/ShiftSummaryView.tsx:30` uses `max-h-[calc(100vh-64px)]` hardcoded offset.

**Fix:** Use `max-h-dvh`, `overflow-y-auto`, and derive header offset from a CSS custom property (`--spacing-header-height`).

---

## 4. Recommended Fix Order

1. **Typography pass (highest impact)** — replace `font-data-mono text-data-mono` with `font-body-md` / `font-body-lg` across all prose, labels, helper text, and summary values. Keep mono only for IDs, codes, timestamps, raw data.
2. **POS component standardization** — create `PosPrimaryAction`, `PosSecondaryAction`, `PosResultCard`, `PosStatusHeading`, `PosKioskHeading`; replace per-view copy-paste.
3. **POS touch targets** — raise every kiosk button to ≥44px (ideally 56px).
4. **Accessibility pass** — convert div-onClick to buttons, add `aria-hidden` on decorative icons, add dialog roles, restore focus rings, add `prefers-reduced-motion`.
5. **Async feedback** — add loading states to POS print/scan/override/sync actions and admin report/template saves.
6. **Layout hardening** — add page max-width, dialog overflow, derive kiosk header offset from token.
7. **Code reuse** — replace hand-rolled Reports daily-breakdown table and Audit/Biometric exception tables with shared `DataTable`.
8. **Color/token cleanup** — remove all hardcoded hex/arbitrary shadows; use semantic tokens.

---

## 5. Files to Touch (summary)

- `mesa-admin/app/globals.css` — add kiosk display tokens and `prefers-reduced-motion` guards.
- `mesa-admin/app/(admin)/dashboard/page.tsx` — chart reuse, terminal heartbeat formatting, mono cleanup.
- `mesa-admin/app/(admin)/people/page.tsx` — mono cleanup, `initials()` guard, action button sizing.
- `mesa-admin/app/(admin)/meal-rules/page.tsx` — mono cleanup.
- `mesa-admin/app/(admin)/reports/page.tsx` — replace hand-rolled daily table with `DataTable`, add labels to date inputs, loading state.
- `mesa-admin/app/(admin)/templates/page.tsx` — listbox semantics, mono cleanup, preview width.
- `mesa-admin/app/(admin)/devices/page.tsx` — mono cleanup, heartbeat/status alignment.
- `mesa-admin/app/(admin)/license/page.tsx` — mono cleanup, dynamic color mapping.
- `mesa-admin/app/(admin)/settings/page.tsx` — mono cleanup, styled radio group.
- `mesa-admin/app/(admin)/audit/page.tsx` — mono cleanup, empty state.
- `mesa-admin/app/(admin)/people/enroll/page.tsx` — mono cleanup, SVG font token.
- `mesa-admin/app/pos/page.tsx` and all `app/pos/_components/*` — type tokens, touch targets, async loading, accessibility, layout.
- `mesa-admin/components/layout/filter-chips.tsx` — mono cleanup for counts.
- `mesa-admin/docs/DESIGN.md` — add kiosk typography tokens.

---

## 6. Appendix: Screenshots Captured

| # | Path | Page / State |
|---|---|---|
| 01 | `/tmp/ui-audit/01-login.png` | Admin login |
| 02 | `/tmp/ui-audit/02-dashboard.png` | Dashboard |
| 03 | `/tmp/ui-audit/03-people.png` | People Master |
| 04 | `/tmp/ui-audit/04-meal-rules.png` | Meal Rules |
| 05 | `/tmp/ui-audit/05-reports.png` | Reports |
| 06 | `/tmp/ui-audit/06-templates.png` | Receipt Templates |
| 07 | `/tmp/ui-audit/07-devices.png` | Device Management |
| 08 | `/tmp/ui-audit/08-license.png` | License |
| 09 | `/tmp/ui-audit/09-settings.png` | Settings |
| 10 | `/tmp/ui-audit/10-audit.png` | Audit Log |
| 11 | `/tmp/ui-audit/11-enroll.png` | Enrollment |
| 12 | `/tmp/ui-audit/12-pos-login.png` | POS operator login |
| 13 | `/tmp/ui-audit/13-pos-scan.png` | POS ready to scan |
| 14 | `/tmp/ui-audit/14-pos-approved-printer-error.png` | POS approved + printer error |
| 15 | `/tmp/ui-audit/15-pos-no-match.png` | POS no match |
