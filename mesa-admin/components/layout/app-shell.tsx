"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  /** Href to highlight, or "auto" to derive it from the current route. */
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

  // usePathname is SSR-safe and matches on both renders, unlike window.location.
  const pathname = usePathname();
  const currentHref = activeHref === undefined || activeHref === "auto" ? pathname : activeHref;

  const NavLink = ({ item, isFooter = false }: { item: SidebarItem; isFooter?: boolean }) => {
    const isActive = item.active ?? item.href === currentHref;

    const content = (
      <>
        <span
          className={cn(
            "material-symbols-outlined shrink-0 text-headline-md",
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
              <span className="rounded-full bg-error-container px-1.5 py-0.5 font-data-mono text-data-mono text-on-error-container">
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
    <div className={cn("flex min-h-screen bg-surface", className)}>
      {/* Sidebar */}
      <aside
        className={cn(
          "sticky top-0 z-50 flex h-screen flex-col overflow-y-auto border-r border-outline-variant",
          "bg-surface-container-lowest py-4 transition-[width] duration-200",
          sidebarWidth,
        )}
      >
        {/* Brand */}
        <div className={cn("mb-stack-md flex items-center px-3", isCollapsed && "justify-center px-0")}>
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
              <div className="font-data-mono text-data-mono uppercase tracking-wider text-on-surface-variant">
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
          <span className="material-symbols-outlined text-body-lg" aria-hidden>
            {isCollapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1">
          {sections.map((section, index) => (
            <React.Fragment key={index}>
              {section.title && !isCollapsed && (
                <div className="mb-1 mt-stack-md px-3">
                  <span className="font-data-mono text-data-mono uppercase tracking-wider text-on-surface-variant">
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

      {/* Content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        {topbar && (
          <div className="sticky top-0 z-40 flex h-header-height items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-4">
            {topbar}
          </div>
        )}

        {/* Main content */}
        <main className="page-container flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
