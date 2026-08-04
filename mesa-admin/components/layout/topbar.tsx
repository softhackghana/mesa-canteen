"use client";

import type * as React from "react";
import { cn } from "@/lib/cn";

export interface TopbarProps {
  /** Page title shown next to the breadcrumb. */
  title?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  search?: React.ReactNode;
  notifications?: React.ReactNode;
  notificationsCount?: number;
  onNotificationsClick?: () => void;
  avatar?: React.ReactNode;
  avatarLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * 64px header bar: breadcrumb/page title on the left, search + notifications
 * + avatar on the right. Rendered inside AppShell's topbar slot.
 */
export function Topbar({
  title,
  breadcrumb,
  search,
  notifications,
  notificationsCount,
  onNotificationsClick,
  avatar,
  avatarLabel = "JD",
  actions,
  className,
}: TopbarProps) {
  return (
    <div className={cn("flex w-full items-center justify-between gap-6", className)}>
      <div className="flex min-w-0 items-center gap-6">
        {breadcrumb && (
          <nav aria-label="Breadcrumb" className="hidden font-data-mono text-[11px] uppercase tracking-wider text-on-surface-variant lg:block">
            {breadcrumb}
          </nav>
        )}
        {title && (
          <h1 className="truncate whitespace-nowrap font-headline-md text-headline-md font-bold text-on-surface">
            {title}
          </h1>
        )}
        {actions}
      </div>

      <div className="flex items-center gap-4">
        {search}
        <button
          type="button"
          onClick={onNotificationsClick}
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-[22px]" aria-hidden>
            notifications
          </span>
          {(notificationsCount ?? 0) > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error" />
          )}
        </button>
        {notifications}
        {avatar ?? (
          <div
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-outline-variant bg-primary-container font-nav-item text-nav-item font-bold text-on-primary-container transition-shadow hover:ring-2 hover:ring-primary/30"
            aria-label="Account"
          >
            {avatarLabel}
          </div>
        )}
      </div>
    </div>
  );
}
