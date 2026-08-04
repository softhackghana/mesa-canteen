/**
 * Zustand state stores for the MESA canteen management platform.
 *
 * Hooks exported by this module:
 * - useAuthStore        — InsForge auth session
 * - useLicenseStore     — license certificate + status
 * - usePeopleStore      — People Master CRUD
 * - useMealRulesStore   — meal rules CRUD
 * - usePosStore         — POS session, scan, offline queue
 * - useNotificationsStore — in-app alert feed
 * - useDevicesStore     — POS terminal management
 * - useSettingsStore    — global settings
 */

export { useAuthStore } from './auth-store';
export { useLicenseStore } from './license-store';
export { usePeopleStore } from './people-store';
export { useMealRulesStore } from './meal-rules-store';
export { usePosStore } from './pos-store';
export { useNotificationsStore } from './notifications-store';
export { useDevicesStore } from './devices-store';
export { useSettingsStore } from './settings-store';

export type { Notification, NotificationCategory, NotificationSeverity } from './notifications-store';
export type { PeopleFilters, PeoplePagination } from './people-store';
export type { OfflineTransaction, ScanResult, ScanResultStatus } from './pos-store';
export type { SettingsPatch } from './settings-store';
