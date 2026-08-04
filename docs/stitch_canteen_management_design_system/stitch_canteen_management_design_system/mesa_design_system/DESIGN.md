---
name: MESA Design System
colors:
  surface: '#f6fafe'
  surface-dim: '#d6dade'
  surface-bright: '#f6fafe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4f8'
  surface-container: '#eaeef2'
  surface-container-high: '#e5e9ed'
  surface-container-highest: '#dfe3e7'
  on-surface: '#171c1f'
  on-surface-variant: '#444653'
  inverse-surface: '#2c3134'
  inverse-on-surface: '#edf1f5'
  outline: '#757684'
  outline-variant: '#c5c5d5'
  surface-tint: '#3f54c1'
  primary: '#16309f'
  on-primary: '#ffffff'
  primary-container: '#344ab7'
  on-primary-container: '#bec7ff'
  inverse-primary: '#bac3ff'
  secondary: '#3f54c1'
  on-secondary: '#ffffff'
  secondary-container: '#7c90ff'
  on-secondary-container: '#00208f'
  tertiary: '#3b3d49'
  on-tertiary: '#ffffff'
  tertiary-container: '#535461'
  on-tertiary-container: '#c9c9d8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dee0ff'
  primary-fixed-dim: '#bac3ff'
  on-primary-fixed: '#00115a'
  on-primary-fixed-variant: '#233aa8'
  secondary-fixed: '#dee0ff'
  secondary-fixed-dim: '#bac3ff'
  on-secondary-fixed: '#00115a'
  on-secondary-fixed-variant: '#233aa8'
  tertiary-fixed: '#e1e1f1'
  tertiary-fixed-dim: '#c5c5d5'
  on-tertiary-fixed: '#191b26'
  on-tertiary-fixed-variant: '#444653'
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
  nav-item:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '450'
    lineHeight: 18px
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar-expanded: 240px
  sidebar-collapsed: 72px
  header-height: 64px
  gutter: 1rem
  margin-page: 1.5rem
  stack-sm: 0.5rem
  stack-md: 1rem
---

## Brand & Style

The design system is anchored in a **Corporate Modern** aesthetic characterized by restraint, precision, and high utility. It is designed for the Meal Entitlement, Service & Access Platform (MESA), prioritizing reliability and a calm user experience over decorative flourishes. 

The visual language follows a "Data-First" philosophy, where the interface recedes to allow critical information—entitlements, service statuses, and access logs—to take center stage. The style utilizes a structured grid, consistent line weights, and a sophisticated neutral palette to evoke a sense of institutional stability and operational efficiency.

## Colors

The color palette is built on a foundation of "Service Blue" and a nuanced scale of cool grays. 

### Core Palette
- **Primary:** Used for main actions and brand presence.
- **Surface Scale:** A 5-tier system of neutrals (Lowest to Highest) used to create hierarchy without relying on shadows.
- **Outlines:** Used for structural division and component boundaries to maintain a flat, utilitarian feel.

### Status System
The system employs a specific semantic palette for real-time status tracking:
- **Active/Success:** Emerald tones for positive system states.
- **Offline/Error:** Red tones for critical failures or blocked access.
- **Warning/Pending:** Amber tones for cautionary states.
- **Processing/Syncing:** Blue tones for active background tasks.
- **Inactive/Closed:** Neutral grays for historical or disabled data.

## Typography

This design system uses a dual-font strategy to balance readability with technical precision.

- **Primary (Manrope):** Applied to all interface prose, navigation, and headers. It provides a modern, approachable, yet professional tone.
- **Technical (JetBrains Mono):** A monospaced font reserved strictly for "Data Entities." This includes IDs, order numbers, currency values, table cell data, and timestamps. The monospaced nature ensures that columns of numbers remain aligned for quick scanning.

**Hierarchy Rules:**
- Use `Headline LG` for page titles.
- Use `Body MD` as the default size for form labels and standard UI text.
- Navigation items use a medium weight (`500`) to differentiate them from body copy.

## Layout & Spacing

The layout is governed by a strict **Fixed-Fluid Hybrid** model. 

### Structural Layout
- **Sidebar:** A persistent navigation element. It alternates between an expanded state (240px) for high discovery and a collapsed state (72px) for focused work.
- **Grid:** Content is housed within a 12-column fluid grid with 16px gutters.
- **Vertical Rhythm:** A base 4px/8px increment system is used for all internal component spacing and padding.

### Adaptability
- **Desktop:** Sidebar remains visible; content utilizes the full width up to a 1440px max-container.
- **Tablet:** Sidebar collapses to the icon-only state (72px). Gutters reduce to 12px.
- **Mobile:** Sidebar transitions to a bottom navigation bar or a hidden drawer. Page margins reduce to 16px.

## Elevation & Depth

To maintain a utilitarian and "flat" aesthetic, the design system avoids ambient shadows for standard UI elements. 

- **Tonal Elevation:** Depth is communicated through the `surface-container` tokens. Backgrounds use `surface`, while cards and content areas use `surface-container-lowest` (pure white).
- **Hard Boundaries:** 1px borders using the `outline-variant` color are the primary method of separation for headers, sidebars, and cards.
- **Overlay Exception:** Modals and dropdown menus are the only elements permitted to use shadows. They should utilize a subtle 4% neutral shadow (e.g., `0 4px 20px rgba(23, 28, 31, 0.04)`) to lift them above the base interface without breaking the restrained aesthetic.

## Shapes

The shape language is "Soft-Geometric," using subtle rounding to prevent the interface from feeling sharp or aggressive while maintaining a professional structure.

- **Small Controls (4px):** Applied to buttons, input fields, checkboxes, and small dropdowns.
- **Containers/Cards (8px):** Applied to main content cards, dashboard widgets, and modal containers.
- **Status Tags (9999px):** Status indicators and chips use a pill shape to instantly differentiate them from interactive buttons or static containers.

## Components

### Buttons
- **Primary:** Solid `#344AB7` background with white text. 4px radius.
- **Secondary:** Outlined with `outline` token. 
- **Ghost:** No background or border, used for low-priority actions in headers.

### Status Tags
- Must use the pill shape (9999px radius).
- Background should be the "Container" version of the semantic color (e.g., `success-container`).
- Text must use the high-contrast "On" version (e.g., `success`).

### Input Fields
- 1px border using `outline`.
- 4px corner radius.
- Background uses `surface-container-lowest` (White).
- Focused state: 2px border using `primary`.

### Cards
- White background (`surface-container-lowest`).
- 1px border (`outline-variant`).
- 8px corner radius.
- No shadow.

### Lists & Tables
- Table headers use `Body MD` with 600 weight.
- Table body data uses `data-mono` (JetBrains Mono).
- Row separators use a 1px `outline-variant` bottom border.