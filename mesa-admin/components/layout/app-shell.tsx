"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export interface SidebarItem {
  label: string;
  href: string;
  icon: string;
  /** Render the icon filled when active (matches mocks). */
  fillWhenActive?: boolean;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

export interface AppShellProps {
  /** Sections, in order: OPERATIONS / IDENTITY / POLICY / FINANCE / SYSTEM. */
  sections: SidebarSection[];
  footerItems?: SidebarItem[];
  /** Optional extra footer items below the main footer (e.g. Settings). */
  activeHref?: string;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Rendered when collapsed (e.g. an icon). */
  brand?: React.ReactNode;
  brandLabel?: string;
  brandSub?: string;
  topbar?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const DEFAULT_FOOTER: SidebarItem[] = [
  { label: "Support", href: "/support", icon: "help" },
  { label: "User Guide", href: "/guide", icon: "description" },
  { label: "Logout", href: "/logout", icon: "logout" },
];

/**
 * Fixed app shell. Sidebar: 240px expanded / 72px collapsed, section groups
 * with mono uppercase headers, active item = 3px primary left border +
 * primary-container/10 bg. Header: 64px with breadcrumb, search, notifications,
 * avatar. Content area offset by sidebar width + header height.
 */
export function AppShell({
  sections,
  footerItems = DEFAULT_FOOTER,
  activeHref,
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  brand,
  brandLabel = "MESA",
  brandSub = "Meal Entitlement Platform",
  topbar,
  children,
  className,
}: AppShellProps) {
  const [internalCollapsed, setInternalCollapsed] = React.useState(defaultCollapsed);
  const isCollapsed = collapsed !== undefined ? collapsed : internalCollapsed;

  const setCollapsed = React.useCallback(
    (next: boolean) => {
      if (collapsed === undefined) setInternalCollapsed(next);
      onCollapsedChange?.(next);
    },
    [collapsed, onCollapsedChange],
  );

  const sidebarWidth = isCollapsed ? "w-sidebar-collapsed" : "w-sidebar-expanded";

  const NavLink = ({ item, isFooter = false }: { item: SidebarItem; isFooter?: boolean }) => {
    const isActive =
      item.active ??
      (activeHref !== undefined
        ? item.href === activeHref
        : item.href !== "/logout" && item.href !== "/support" && item.href !== "/guide" &&
          typeof window !== "undefined" &&
          window.location.pathname === item.href);

    const content = (
      <>
        <span
          className={cn(
            "material-symbols-outlined shrink-0 text-[22px]",
            item.fillWhenActive && isActive && "fill",
          )}
          aria-hidden
        >
          {item.icon}
        </span>
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate text-left font-nav-item text-nav-item">
              {item.label}
            </span>
            {item.badge && (
              <span className="rounded-full bg-error-container px-1.5 py-0.5 font-data-mono text-[10px] text-on-error-container">
                {item.badge}
              </span>
            )}
          </>
        )}
      </>
    );

    const cls = cn(
      "flex h-10 items-center gap-3 px-3 transition-colors duration-150",
      isCollapsed && "justify-center px-0",
      isFooter
        ? cn("rounded-lg", item.label === "Logout" && "text-error hover:bg-error-container/20")
        : isActive
          ? "rounded-r-lg border-l-[3px] border-primary bg-primary-container/10 text-primary"
          : "rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
    );

    return (
      <Link href={item.href} onClick={item.onClick} className={cls} aria-current={isActive ? "page" : undefined}>
        {content}
      </Link>
    );
  };

  return (
    <div className={cn("min-h-screen bg-surface", className)}>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full flex-col overflow-y-auto border-r border-outline-variant",
          "bg-surface-container-lowest py-4 transition-[width] duration-200",
          sidebarWidth,
        )}
      >
        {/* Brand */}
        <div className={cn("mb-8 flex items-center px-3", isCollapsed && "justify-center px-0")}>
          {brand ?? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary font-headline-md text-headline-md font-bold text-on-primary">
              M
            </div>
          )}
          {!isCollapsed && (
            <div className="ml-3">
              <div className="font-headline-md text-headline-md font-bold text-on-surface">
                {brandLabel}
              </div>
              <div className="font-data-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                {brandSub}
              </div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          type="button"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed(!isCollapsed)}
          className={cn(
            "mb-2 flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant",
            "transition-colors hover:bg-surface-container hover:text-on-surface",
            isCollapsed ? "mx-auto" : "ml-3",
          )}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            {isCollapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1">
          {sections.map((section, index) => (
            <React.Fragment key={index}>
              {section.title && !isCollapsed && (
                <div className="mb-1 mt-4 px-3">
                  <span className="font-data-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                    {section.title}
                  </span>
                </div>
              )}
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </React.Fragment>
          ))}
        </nav>

        {/* Footer */}
        <div className="mt-auto flex flex-col gap-1 border-t border-outline-variant/40 pt-4">
          {footerItems.map((item) => (
            <NavLink key={item.href} item={item} isFooter />
          ))}
        </div>
      </aside>

      {/* Topbar */}
      {topbar && (
        <div className="fixed left-0 right-0 top-0 z-40 ml-sidebar-expanded">
          <div className="flex h-header-height items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-margin-page">
            {topbar}
          </div>
        </div>
      )}

      {/* Main content */}
      <main
        className={cn(
          "p-margin-page transition-[margin] duration-200",
          isCollapsed ? "ml-sidebar-collapsed" : "ml-sidebar-expanded",
          topbar ? "mt-header-height" : "mt-0",
        )}
      >
        {children}
      </main>
    </div>
  );
}
