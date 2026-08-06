/**
 * Zustand state stores for the MESA canteen management platform.
 *
 * Hooks exported by this module:
 * - useAuthStore        — InsForge auth session
 * - useLicenseStore     — license certificate + status
 * - usePeopleStore      — People Master CRUD (live `people` table)
 * - useMealRulesStore   — meal rules CRUD (live `meal_rules` table)
 * - useNotificationsStore — in-app alert feed
 * - useSettingsStore    — global settings (live `settings` table)
 * - useTemplatesStore   — receipt template management
 */

export { useAuthStore } from './auth-store';
export { useLicenseStore } from './license-store';
export { usePeopleStore } from './people-store';
export { useMealRulesStore } from './meal-rules-store';
export { useNotificationsStore } from './notifications-store';
export { useSettingsStore } from './settings-store';
export { useTemplatesStore } from './templates-store';

export type { Notification, NotificationCategory, NotificationSeverity } from './notifications-store';
export type { PeopleFilters } from './people-store';
export type { SettingsPatch } from './settings-store';
