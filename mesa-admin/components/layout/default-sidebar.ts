import type { SidebarSection } from "@/components/layout/app-shell";

/**
 * Default MESA sidebar groups (OPERATIONS / IDENTITY / POLICY / FINANCE /
 * SYSTEM), matching the mockups. Pass `activeHref` to AppShell to highlight
 * the current route.
 */
export const DEFAULT_SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    title: "OPERATIONS",
    items: [
      { label: "Dashboard", href: "/", icon: "dashboard", fillWhenActive: true },
      { label: "POS Terminals", href: "/pos", icon: "point_of_sale" },
    ],
  },
  {
    title: "IDENTITY",
    items: [
      { label: "People Master", href: "/people", icon: "group", fillWhenActive: true },
      { label: "Enrollment", href: "/enrollment", icon: "person_add" },
    ],
  },
  {
    title: "POLICY",
    items: [{ label: "Meal Rules", href: "/meal-rules", icon: "rule" }],
  },
  {
    title: "FINANCE",
    items: [
      { label: "Period-End", href: "/period-end", icon: "event_repeat" },
      { label: "Reports", href: "/reports", icon: "analytics" },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Devices", href: "/devices", icon: "devices" },
      { label: "Audit Log", href: "/audit-log", icon: "history" },
      { label: "Settings", href: "/settings", icon: "settings" },
    ],
  },
];
