"use client";

import type * as React from "react";
import { useEffect } from "react";
import { AppShell, DropdownMenu, Topbar, ToastProvider, type SidebarSection } from "@/components";
import { AuthGate } from "./auth-gate";
import { useLicenseStore } from "@/stores/license-store";
import { useNotificationsStore } from "@/stores/notifications-store";
import { cn } from "@/lib/cn";

const ADMIN_SECTIONS: SidebarSection[] = [
  {
    title: "OPERATIONS",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "dashboard", fillWhenActive: true },
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
      { label: "Finance & Period Close", href: "/finance", icon: "payments", fillWhenActive: true },
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
  const items = useNotificationsStore((s) => s.items);
  const hydrate = useNotificationsStore((s) => s.hydrate);
  const markRead = useNotificationsStore((s) => s.markRead);
  const dismiss = useNotificationsStore((s) => s.dismiss);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  useEffect(() => {
    loadLicense();
    void hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fallow-ignore-next-line complexity
  const notificationsPanel = (
    <DropdownMenu
      trigger={
        <span
          className="material-symbols-outlined text-headline-md"
          aria-hidden
        >
          notifications
        </span>
      }
      align="end"
      className="w-96"
    >
      <div className="flex flex-col gap-1 p-2">
        {items.length === 0 ? (
          <p className="px-3 py-2 font-body-md text-body-md text-on-surface-variant">No notifications.</p>
        ) : (
          // fallow-ignore-next-line complexity
          items.slice(0, 6).map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex items-start gap-3 rounded-lg p-2 transition-colors",
                !n.read && "bg-surface-container-low",
              )}
            >
              <span
                className={cn(
                  "material-symbols-outlined mt-0.5 text-body-lg",
                  n.severity === "critical" ? "text-error" : n.severity === "warning" ? "text-warning" : "text-on-surface-variant",
                )}
                aria-hidden
              >
                {n.severity === "critical" ? "error" : n.severity === "warning" ? "warning" : "info"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center justify-between gap-2 font-body-md text-body-md font-medium text-on-surface">
                  {n.title}
                  {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-error" aria-hidden />}
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant">{n.message}</p>
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => {
                  markRead(n.id);
                  dismiss(n.id);
                }}
                className="rounded text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-body-md" aria-hidden>
                  close
                </span>
              </button>
            </div>
          ))
        )}
      </div>
    </DropdownMenu>
  );

  return (
    <AuthGate>
      <AppShell
        sections={ADMIN_SECTIONS}
        activeHref="auto"
        topbar={
          <Topbar
            title="MESA"
            avatarLabel="AJ"
            notifications={notificationsPanel}
            notificationsCount={unreadCount()}
          />
        }
      >
        <ToastProvider>{children}</ToastProvider>
      </AppShell>
    </AuthGate>
  );
}
