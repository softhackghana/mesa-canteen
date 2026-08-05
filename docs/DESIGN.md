---
name: Canteen Operations System
colors:
  surface: '#f6fafe'
  surface-dim: '#d6dade'
  surface-bright: '#f6fafe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4f8'
  surface-container: '#eaeef2'
  surface-container-high: '#e4e9ed'
  surface-container-highest: '#dfe3e7'
  on-surface: '#171c1f'
  on-surface-variant: '#444653'
  inverse-surface: '#2c3134'
  inverse-on-surface: '#edf1f5'
  outline: '#757684'
  outline-variant: '#c5c5d5'
  surface-tint: '#3f54c1'
  primary: '#344ab7'
  on-primary: '#ffffff'
  primary-container: '#4f64d1'
  on-primary-container: '#f0efff'
  inverse-primary: '#bac3ff'
  secondary: '#565e76'
  on-secondary: '#ffffff'
  secondary-container: '#dbe1ff'
  on-secondary-container: '#5c647c'
  tertiary: '#47576c'
  on-tertiary: '#ffffff'
  tertiary-container: '#5f6f86'
  on-tertiary-container: '#ebf2ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dee0ff'
  primary-fixed-dim: '#bac3ff'
  on-primary-fixed: '#00115a'
  on-primary-fixed-variant: '#233aa8'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#bec6e2'
  on-secondary-fixed: '#131b30'
  on-secondary-fixed-variant: '#3f465d'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f6fafe'
  on-background: '#171c1f'
  surface-variant: '#dfe3e7'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  nav-item:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  display-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  display-md:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  kiosk-body:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
  kiosk-label:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  margin-page: 24px
  gutter: 16px
  sidebar-width-expanded: 240px
  sidebar-width-collapsed: 72px
  table-row-height: 56px
  unit-xs: 4px
  unit-sm: 8px
  unit-md: 16px
  unit-lg: 24px
  unit-xl: 32px
---

## Brand & Style

This design system is built for the high-efficiency environment of canteen and cafeteria management. The brand personality is **utilitarian, reliable, and calm**, prioritizing clarity over decoration to reduce cognitive load during peak service hours.

The visual style is a refined **Corporate Modern** approach. It leverages a "Sidebar-First" architecture inspired by professional productivity tools. The interface uses a systematic layout with subtle tonal layering to differentiate between global navigation, local context, and primary work surfaces. The aesthetic is defined by its restraint, using whitespace and soft borders rather than heavy shadows to organize information.

## Colors

The palette is rooted in a professional **Soft Gray and Blue** spectrum. 

- **Primary Blue:** Used for actionable elements, active states, and branding. It is saturated enough to provide high contrast against the light grays.
- **Surface Grays:** A range of cool-toned neutrals (`#F8FAFC` to `#E2E8F0`) are used to create structural hierarchy. The deepest grays are reserved for secondary text and icons.
- **Functional Semantics:** Status indicators for order management (e.g., Pending, Preparing, Completed) use standard semantic colors but are applied with low-chroma backgrounds and high-chroma text for legibility.

## Typography

The typography system uses **Manrope** for its balance of geometric clarity and humanist warmth, making it ideal for both high-density data tables and menu interfaces.

- **Headlines:** Set in Bold or Semi-Bold weights with tight letter-spacing to appear grounded.
- **Data Labels:** **JetBrains Mono** is introduced for IDs, order numbers, and currency values. The monospaced nature ensures that columns of prices or quantities align perfectly in data tables.
- **Navigation:** Uses a medium weight to ensure legibility against the sidebar background.

## Layout & Spacing

The system follows a **Fluid Sidebar** model. The layout consists of a persistent global navigation bar (collapsed or expanded) and a primary content area that uses a fluid grid.

- **Grid:** A 12-column system is used for dashboard layouts. Data tables should always stretch to the full width of their container.
- **Density:** We utilize a "Comfortable" density for general management and "Compact" density for data-heavy views like inventory lists.
- **Breakpoints:**
  - **Mobile (< 640px):** Sidebar converts to a bottom bar or hamburger menu. Margins reduce to 16px.
  - **Tablet (640px - 1024px):** Sidebar is collapsed to icons only.
  - **Desktop (> 1024px):** Expanded sidebar for full context.

## Elevation & Depth

This system avoids heavy shadows in favor of **Tonal Layers and Low-Contrast Outlines**.

1.  **Level 0 (Background):** The base application canvas uses the `surface_background` color.
2.  **Level 1 (Panels):** Sidebars and Header bars are flush with the background but separated by a 1px solid border (`border_subtle`).
3.  **Level 2 (Containers):** Cards, Data Tables, and Modals use a white surface. A very soft, 4% opacity neutral shadow is applied only to floating elements (modals and dropdowns) to distinguish them from the page.
4.  **Active States:** Navigation items and selected table rows use a subtle primary tint (Primary 10% opacity) rather than a shadow.

## Shapes

The shape language is **Soft and Professional**. 

- **Base Radius (4px):** Applied to buttons, input fields, and small UI controls to maintain a crisp, organized feel.
- **Large Radius (8px):** Applied to cards, table containers, and sidebar segments.
- **Pill (Full Round):** Exclusively reserved for status tags (e.g., "In Progress") and notification badges to make them instantly recognizable as distinct from interactive buttons.

## Components

### Status Indicators
Status tags use a "Subtle-Strong" contrast model. Use a light background of the semantic color with dark, bold text of the same hue (e.g., Light Green background with Dark Green text). This ensures the status is visible without dominating the visual hierarchy.

### Data Tables
Tables are the core of the canteen management system.
- **Header:** Light gray background (`neutral_color_hex`) with uppercase, mono-spaced labels.
- **Rows:** 56px height for touch-friendliness. 1px bottom border.
- **Alignment:** Numbers (quantities/prices) are right-aligned; text (food items/names) are left-aligned.

### Reduced Motion
All continuous animations (pulse rings, progress bars, loading spins) respect `prefers-reduced-motion: reduce` by falling back to a static state.

### Kiosk Typography
The POS kiosk uses an enlarged scale for arm's-length reading:
- `display-lg` 32px/700 for primary result headings.
- `display-md` 28px/700 for secondary headings.
- `kiosk-body` 18px/500 for body copy.
- `kiosk-label` 14px/500 for metadata and captions.

### Navigation Elements
- **Sidebar Items:** Use a 24px icon paired with a 14px label. The active state includes a subtle blue vertical bar on the leading edge and a light blue background fill.
- **Quick Search:** A persistent, high-visibility input in the sidebar or header to allow staff to quickly find orders or items.

### Cards
Cards are used for dashboard summaries (e.g., "Daily Revenue," "Active Orders"). They feature a 1px border and no shadow. Titles should be `body-md` in weight 600.

### Input Fields
Inputs are minimalist: 1px border with a `primary_color` stroke only on focus. Use placeholder text in `tertiary_color`.