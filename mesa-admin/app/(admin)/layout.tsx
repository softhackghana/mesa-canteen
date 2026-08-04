"use client";

import type * as React from "react";
import { useEffect } from "react";
import { AppShell, Topbar, ToastProvider, type SidebarSection } from "@/components";
import { AuthGate } from "./auth-gate";
import { useLicenseStore } from "@/stores/license-store";

const ADMIN_SECTIONS: SidebarSection[] = [
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
      { label: "Enrollment", href: "/people/enroll", icon: "person_add", fillWhenActive: true },
    ],
  },
  {
    title: "POLICY",
    items: [{ label: "Meal Rules", href: "/meal-rules", icon: "rule", fillWhenActive: true }],
  },
  {
    title: "FINANCE",
    items: [
      { label: "Reports", href: "/reports", icon: "analytics", fillWhenActive: true },
      { label: "Receipt Templates", href: "/templates", icon: "receipt_long", fillWhenActive: true },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Devices", href: "/devices", icon: "devices", fillWhenActive: true },
      { label: "License", href: "/license", icon: "verified_user", fillWhenActive: true },
      { label: "Audit Log", href: "/audit", icon: "history", fillWhenActive: true },
      { label: "Settings", href: "/settings", icon: "settings", fillWhenActive: true },
    ],
  },
];

/**
 * Admin shell (dashboard/people/reports/...). The global auth wrapper and root
 * layout are owned by the coordinator — this layout only provides the shared
 * sidebar + topbar chrome inside the authenticated area.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const loadLicense = useLicenseStore((s) => s.load);
  useEffect(() => {
    loadLicense();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthGate>
      <AppShell
        sections={ADMIN_SECTIONS}
        activeHref="auto"
        topbar={<Topbar title="MESA" avatarLabel="AJ" />}
      >
        <ToastProvider>{children}</ToastProvider>
      </AppShell>
    </AuthGate>
  );
}
