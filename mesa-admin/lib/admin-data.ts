/**
 * Admin Portal demo data (dashboard, people, meal rules, reports, devices,
 * audit, settings, receipt templates).
 *
 * These are throwaway fixtures that mirror `db/seed.sql` (names, employee IDs,
 * sites, cost centres) so the Admin UI renders without a live InsForge
 * backend. Swap each `DEMO_*` array for a real fetch from `lib/insforge.ts`
 * when the API/data worker lands — the shapes intentionally match the PRD
 * data model.
 *
 * ponytail: no live backend yet, so pages read these fixtures directly. When
 * the data worker ships, replace with `insforge.database.from(...)` queries.
 */

import type {
  Person,
  MealRule,
  Device,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// People (PRD 10.2 / FR-PM-001..004)
// ---------------------------------------------------------------------------

export interface AdminPerson extends Person {
  /** Enrolled when >= 1 active biometric template exists. */
  biometricStatus: "enrolled" | "pending";
  biometricTemplates: number;
  credential?: "RFID" | "PIN" | "QR" | "None";
  credentialValue?: string;
  mealRule?: string;
  /** Display-only joins (fixtures carry names, live data resolves via *_id). */
  department?: string;
  cost_centre?: string;
  site?: string;
}

/**
 * Fixture builder: fills canonical Person fields (email, *_id joins, consent,
 * timestamps) with plausible defaults so pages only specify display data.
 * ponytail: when the data worker ships, delete this and query the DB.
 */
type PersonSeed = Omit<AdminPerson, "email" | "department_id" | "cost_centre_id" | "site_id" | "biometric_consent" | "consent_at" | "photo_url" | "created_at" | "updated_at" | "hris_id">;
function mkPerson(seed: PersonSeed): AdminPerson {
  return {
    email: null,
    department_id: null,
    cost_centre_id: null,
    site_id: null,
    biometric_consent: true,
    consent_at: new Date().toISOString(),
    photo_url: null,
    hris_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...seed,
  };
}

const DEMO_PEOPLE: AdminPerson[] = [
  mkPerson({
    id: "p-10492",
    employee_id: "EMP-10492",
    first_name: "Marcus",
    last_name: "Johnson",
    department: "Engineering",
    cost_centre: "CC-ENG-01",
    site: "HQ Campus",
    status: "active",
    hire_date: "2021-03-15",
    biometricStatus: "enrolled",
    biometricTemplates: 1,
    credential: "RFID",
    credentialValue: "CARD-0001",
    mealRule: "Standard Shift (1 Meal)",
  }),
  mkPerson({
    id: "p-10493",
    employee_id: "EMP-10493",
    first_name: "Sarah",
    last_name: "Lopez",
    department: "Human Resources",
    cost_centre: "CC-HR-01",
    site: "North Campus",
    status: "active",
    hire_date: "2022-07-04",
    biometricStatus: "enrolled",
    biometricTemplates: 1,
    credential: "PIN",
    credentialValue: "••••",
    mealRule: "Standard Shift (1 Meal)",
  }),
  mkPerson({
    id: "p-1120",
    employee_id: "EMP-1120",
    first_name: "Alex",
    last_name: "Davis",
    department: "Operations",
    cost_centre: "CC-OPS-04",
    site: "HQ Campus",
    status: "active",
    hire_date: "2020-01-20",
    biometricStatus: "enrolled",
    biometricTemplates: 1,
    credential: "RFID",
    credentialValue: "CARD-0002",
    mealRule: "Standard Shift (1 Meal)",
  }),
  mkPerson({
    id: "p-2099",
    employee_id: "EMP-2099",
    first_name: "Priya",
    last_name: "Patel",
    department: "Logistics",
    cost_centre: "CC-LOG-02",
    site: "Distribution West",
    status: "active",
    hire_date: "2019-11-02",
    biometricStatus: "enrolled",
    biometricTemplates: 1,
    credential: "PIN",
    credentialValue: "••••",
    mealRule: "Night Shift (2 Meals)",
  }),
  mkPerson({
    id: "p-3312",
    employee_id: "EMP-3312",
    first_name: "Robert",
    last_name: "Chen",
    department: "Engineering",
    cost_centre: "CC-ENG-01",
    site: "South Facility",
    status: "active",
    hire_date: "2023-05-10",
    biometricStatus: "enrolled",
    biometricTemplates: 1,
    credential: "RFID",
    credentialValue: "CARD-0004",
    mealRule: "Standard Shift (1 Meal)",
  }),
  mkPerson({
    id: "p-1042",
    employee_id: "EMP-1042",
    first_name: "Alice",
    last_name: "Smith",
    department: "Finance",
    cost_centre: "CC-210",
    site: "HQ Campus",
    status: "active",
    hire_date: "2018-09-01",
    biometricStatus: "enrolled",
    biometricTemplates: 1,
    credential: "RFID",
    credentialValue: "CARD-0003",
    mealRule: "Standard Shift (1 Meal)",
  }),
  mkPerson({
    id: "p-8831",
    employee_id: "EMP-8831",
    first_name: "Johnna",
    last_name: "Smith",
    department: "Operations",
    cost_centre: "CC-890",
    site: "HQ Campus",
    status: "inactive",
    hire_date: "2026-02-17",
    biometricStatus: "pending",
    biometricTemplates: 0,
    credential: "None",
    mealRule: "Standard Shift (1 Meal)",
  }),
  mkPerson({
    id: "p-84729",
    employee_id: "EMP-84729",
    first_name: "Sarah",
    last_name: "Mensah",
    department: "Human Resources",
    cost_centre: "CC-HR-01",
    site: "Tema Facility",
    status: "active",
    hire_date: "2021-08-30",
    biometricStatus: "enrolled",
    biometricTemplates: 2,
    credential: "RFID",
    credentialValue: "CARD-0005",
    mealRule: "Standard Shift (1 Meal)",
  }),
  mkPerson({
    id: "p-234",
    employee_id: "EMP-234",
    first_name: "Tunde",
    last_name: "Okafor",
    department: "Operations",
    cost_centre: "CC-OPS-04",
    site: "Tema Facility",
    status: "active",
    hire_date: "2022-04-12",
    biometricStatus: "enrolled",
    biometricTemplates: 1,
    credential: "PIN",
    credentialValue: "••••",
    mealRule: "Standard Shift (1 Meal)",
  }),
];

// ---------------------------------------------------------------------------
// Meal rules (PRD 10.4)
// ---------------------------------------------------------------------------

export const DEMO_MEAL_RULES: MealRule[] = [
  {
    id: "mr-10492",
    name: "Breakfast Rule",
    description: "Standard breakfast entitlement",
    meal_period: "breakfast",
    max_meals: 1,
    window_start: "06:00",
    window_end: "09:00",
    active_days: [1, 2, 3, 4, 5],
    company_subsidy_pct: 75,
    block_duplicate: true,
    is_active: true,
    created_by: "Marcus Johnson",
    created_at: "2026-01-10T09:00:00Z",
    updated_at: "2026-07-01T09:00:00Z",
  },
  {
    id: "mr-10493",
    name: "Lunch Rule",
    description: "Standard lunch entitlement",
    meal_period: "lunch",
    max_meals: 1,
    window_start: "11:00",
    window_end: "14:00",
    active_days: [1, 2, 3, 4, 5],
    company_subsidy_pct: 75,
    block_duplicate: true,
    is_active: true,
    created_by: "Marcus Johnson",
    created_at: "2026-01-10T09:00:00Z",
    updated_at: "2026-07-01T09:00:00Z",
  },
  {
    id: "mr-10494",
    name: "Dinner Rule",
    description: "Standard dinner entitlement",
    meal_period: "dinner",
    max_meals: 1,
    window_start: "17:30",
    window_end: "20:00",
    active_days: [1, 2, 3, 4, 5],
    company_subsidy_pct: 75,
    block_duplicate: true,
    is_active: true,
    created_by: "Marcus Johnson",
    created_at: "2026-01-10T09:00:00Z",
    updated_at: "2026-07-01T09:00:00Z",
  },
  {
    id: "mr-10495",
    name: "Night Shift Snack",
    description: "Overnight snack for logistics crews",
    meal_period: "snack",
    max_meals: 2,
    window_start: "22:00",
    window_end: "05:00",
    active_days: [0, 1, 2, 3, 4, 5, 6],
    company_subsidy_pct: 100,
    block_duplicate: false,
    is_active: true,
    created_by: "Sarah Lopez",
    created_at: "2026-02-02T10:00:00Z",
    updated_at: "2026-06-15T10:00:00Z",
  },
  {
    id: "mr-10496",
    name: "Executive Lounge Lunch",
    description: "Executive-tier lunch in the lounge",
    meal_period: "custom",
    max_meals: 1,
    window_start: "11:30",
    window_end: "14:30",
    active_days: [1, 2, 3, 4, 5],
    company_subsidy_pct: 50,
    block_duplicate: true,
    is_active: false,
    created_by: "Marcus Johnson",
    created_at: "2026-03-01T09:00:00Z",
    updated_at: "2026-03-01T09:00:00Z",
  },
];

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function dayRange(days: number[]): string {
  if (days.length === 7) return "Daily";
  return DAY_LABELS.filter((_, i) => days.includes(i)).join(", ");
}

// ---------------------------------------------------------------------------
// Devices / terminals (PRD 10.6)
// ---------------------------------------------------------------------------

export interface AdminDevice extends Device {
  printer: {
    name: string;
    status: "online" | "paper_out" | "cover_open" | "error" | "offline";
    type: "NETWORK" | "USB";
    width: string;
    detail: string;
  };
  syncBacklog: number;
  outlet: string;
}

export const DEMO_DEVICES: AdminDevice[] = [
  {
    id: "dev-1",
    name: "TERM-CA-01",
    site: "HQ Campus",
    ip_address: "10.20.30.41",
    version: "1.0.0",
    scanner_vendor: "DigitalPersona",
    scanner_model: "U.are.U 5160",
    last_heartbeat: new Date(Date.now() - 2000).toISOString(),
    status: "online",
    printer: { name: "PRT-CENT-001", status: "online", type: "NETWORK", width: "80mm", detail: "IP: 192.168.1.145" },
    syncBacklog: 0,
    outlet: "Main Cafeteria",
  },
  {
    id: "dev-2",
    name: "TERM-CA-02",
    site: "HQ Campus",
    ip_address: "10.20.30.42",
    version: "1.0.0",
    scanner_vendor: "Suprema",
    scanner_model: "BioMini Slim 2",
    last_heartbeat: new Date(Date.now() - 4000).toISOString(),
    status: "online",
    printer: { name: "PRT-CENT-002", status: "paper_out", type: "NETWORK", width: "80mm", detail: "IP: 192.168.1.146" },
    syncBacklog: 0,
    outlet: "Grab & Go Kiosk",
  },
  {
    id: "dev-3",
    name: "TERM-NY-01",
    site: "North Campus",
    ip_address: "10.20.30.40",
    version: "1.0.0",
    scanner_vendor: "DigitalPersona",
    scanner_model: "U.are.U 5160",
    last_heartbeat: new Date(Date.now() - 5000).toISOString(),
    status: "online",
    printer: { name: "PRT-WEST-042", status: "online", type: "USB", width: "58mm", detail: "ID: BUS-002-DEV-01" },
    syncBacklog: 0,
    outlet: "West Wing Bistro",
  },
  {
    id: "dev-4",
    name: "TERM-NY-02",
    site: "North Campus",
    ip_address: "10.20.30.43",
    version: "1.0.1",
    scanner_vendor: "ZKTeco",
    scanner_model: "SLK20R",
    last_heartbeat: new Date(Date.now() - 1000).toISOString(),
    status: "online",
    printer: { name: "PRT-EXEC-009", status: "online", type: "NETWORK", width: "80mm", detail: "IP: 192.168.2.009" },
    syncBacklog: 0,
    outlet: "Executive Lounge",
  },
  {
    id: "dev-5",
    name: "TERM-TX-03",
    site: "Tema Facility",
    ip_address: "10.20.30.44",
    version: "1.0.0",
    scanner_vendor: "DigitalPersona",
    scanner_model: "U.are.U 4500",
    last_heartbeat: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    status: "offline",
    printer: { name: "PRT-TX-003", status: "offline", type: "NETWORK", width: "80mm", detail: "IP: 192.168.3.003" },
    syncBacklog: 12,
    outlet: "Tema Canteen",
  },
  {
    id: "dev-6",
    name: "TERM-DW-01",
    site: "Distribution West",
    ip_address: "10.20.30.45",
    version: "1.0.0",
    scanner_vendor: "Suprema",
    scanner_model: "BioMini Slim 3",
    last_heartbeat: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: "error",
    printer: { name: "PRT-DW-001", status: "error", type: "NETWORK", width: "80mm", detail: "IP: 192.168.4.001" },
    syncBacklog: 34,
    outlet: "Distribution Canteen",
  },
];

// ---------------------------------------------------------------------------
// Transactions (PRD 10.5 reporting)
// ---------------------------------------------------------------------------

export interface AdminTransaction {
  id: string;
  transaction_ref: string;
  person_name: string;
  employee_id: string;
  department: string;
  cost_centre: string;
  site: string;
  meal_period: "breakfast" | "lunch" | "dinner" | "snack";
  status: "approved" | "denied" | "override" | "queued";
  auth_method: "biometric" | "rfid" | "pin" | "qr" | "supervisor_override";
  subsidy_amount: number;
  employee_amount: number;
  gross_amount: number;
  occurred_at: string;
  terminal: string;
}

/** Seed a few days of transactions from the PRD/mock data. */
export function demoTransactions(): AdminTransaction[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const txs: AdminTransaction[] = [];
  const people = DEMO_PEOPLE.slice(0, 6);
  const periods: Array<{ p: AdminTransaction["meal_period"]; h: number }> = [
    { p: "breakfast", h: 7 },
    { p: "lunch", h: 12 },
    { p: "dinner", h: 18 },
  ];
  for (let d = 0; d < 7; d++) {
    for (const person of people) {
      for (const { p, h } of periods) {
        const gross = 12 + ((d + h) % 3);
        const subsidy = Math.round(gross * 0.75 * 100) / 100;
        txs.push({
          id: `tx-${d}-${person.id}-${p}`,
          transaction_ref: `TXN-${String(20260804 - d)}-${person.employee_id}`,
          person_name: `${person.first_name} ${person.last_name}`,
          employee_id: person.employee_id,
          department: person.department ?? "",
          cost_centre: person.cost_centre ?? "",
          site: person.site ?? "",
          meal_period: p,
          status: "approved",
          auth_method: "biometric",
          subsidy_amount: subsidy,
          employee_amount: Math.round((gross - subsidy) * 100) / 100,
          gross_amount: gross,
          occurred_at: new Date(now - d * day - h * 60 * 60 * 1000).toISOString(),
          terminal: "TERM-CA-01",
        });
      }
    }
  }
  // A couple of exceptions
  txs.push({
    id: "tx-ex-1",
    transaction_ref: "TXN-EX-0001",
    person_name: "Sarah Lopez",
    employee_id: "EMP-10493",
    department: "Human Resources",
    cost_centre: "CC-HR-01",
    site: "North Campus",
    meal_period: "lunch",
    status: "override",
    auth_method: "supervisor_override",
    subsidy_amount: 9.0,
    employee_amount: 3.0,
    gross_amount: 12.0,
    occurred_at: new Date(now - 3 * day).toISOString(),
    terminal: "TERM-NY-01",
  });
  return txs;
}

// ---------------------------------------------------------------------------
// Audit log (PRD 10.10)
// ---------------------------------------------------------------------------

export interface AdminAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorType: "user" | "system" | "terminal";
  entityType: string;
  entityId: string;
  action: string;
  delta: string;
  source: "portal" | "terminal" | "system";
  ip?: string;
}

export function demoAudit(): AdminAuditEntry[] {
  return [
    { id: "a1", timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), actor: "Marcus Johnson", actorType: "user", entityType: "meal_rule", entityId: "MR-10492", action: "meal_rule.update", delta: "max_meals 1 → 2", source: "portal", ip: "10.0.0.12" },
    { id: "a2", timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(), actor: "TERM-NY-01", actorType: "terminal", entityType: "transaction", entityId: "TXN-20260803-6", action: "supervisor_override", delta: "reason=card_lost", source: "terminal" },
    { id: "a3", timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(), actor: "Sarah Lopez", actorType: "user", entityType: "person", entityId: "EMP-8831", action: "person.update", delta: "status active → inactive", source: "portal", ip: "10.0.0.22" },
    { id: "a4", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), actor: "System", actorType: "system", entityType: "terminal", entityId: "TERM-TX-03", action: "terminal.heartbeat_timeout", delta: "no heartbeat > 90s", source: "system" },
    { id: "a5", timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), actor: "Marcus Johnson", actorType: "user", entityType: "receipt_template", entityId: "TPL-DEFAULT", action: "template.activate", delta: "site HQ Campus", source: "portal", ip: "10.0.0.12" },
    { id: "a6", timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), actor: "System", actorType: "system", entityType: "license", entityId: "MES-4920-X9-AL", action: "license.validate", delta: "status=active", source: "system" },
    { id: "a7", timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), actor: "Alice Smith", actorType: "user", entityType: "sync_job", entityId: "SJ-882", action: "sync.retry", delta: "items 12 → 0", source: "portal", ip: "10.0.0.31" },
    { id: "a8", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), actor: "System", actorType: "system", entityType: "fiscal_period", entityId: "FP-2026-07", action: "period.close", delta: "period closed", source: "system" },
  ];
}

// ---------------------------------------------------------------------------
// Receipt templates (PRD 10.13 / FR-TPL)
// ---------------------------------------------------------------------------

export interface TemplateField {
  key: string;
  label: string;
  align: "left" | "center" | "right";
  size: "small" | "medium" | "large";
  bold: boolean;
}

export const AVAILABLE_FIELDS: TemplateField[] = [
  { key: "business_name", label: "Business Name", align: "center", size: "medium", bold: true },
  { key: "site_name", label: "Site Name", align: "left", size: "medium", bold: false },
  { key: "employee_name", label: "Employee Name", align: "left", size: "medium", bold: false },
  { key: "employee_id", label: "Employee ID", align: "left", size: "small", bold: false },
  { key: "department", label: "Department", align: "left", size: "small", bold: false },
  { key: "cost_centre", label: "Cost Centre", align: "left", size: "small", bold: false },
  { key: "meal_period", label: "Meal Period", align: "left", size: "small", bold: false },
  { key: "date", label: "Date", align: "left", size: "small", bold: false },
  { key: "time", label: "Time", align: "left", size: "small", bold: false },
  { key: "transaction_ref", label: "Transaction Ref", align: "left", size: "small", bold: false },
  { key: "subsidy_amount", label: "Subsidy Amount", align: "right", size: "small", bold: false },
  { key: "employee_amount", label: "Employee-Paid", align: "right", size: "small", bold: false },
  { key: "barcode", label: "1D Barcode", align: "center", size: "medium", bold: false },
  { key: "qr_code", label: "QR Code", align: "center", size: "medium", bold: false },
  { key: "cashier_name", label: "Cashier Name", align: "left", size: "small", bold: false },
  { key: "terminal_id", label: "Terminal ID", align: "left", size: "small", bold: false },
  { key: "custom_message", label: "Custom Message", align: "left", size: "small", bold: false },
];

// ---------------------------------------------------------------------------
// Settings (PRD 10.12 receipt printing)
// ---------------------------------------------------------------------------

export interface SitePrintOverride {
  site: string;
  enabled: boolean;
  printer: string;
  printerStatus: "online" | "paper_out" | "offline" | "error";
  template: string;
}

export const DEMO_SITE_PRINT_OVERRIDES: SitePrintOverride[] = [
  { site: "Central Cafeteria A", enabled: true, printer: "PRT-CENT-001", printerStatus: "online", template: "Standard V2" },
  { site: "West Wing Bistro", enabled: true, printer: "PRT-WEST-042", printerStatus: "paper_out", template: "Bistro-Compact" },
  { site: "Executive Lounge", enabled: true, printer: "PRT-EXEC-009", printerStatus: "online", template: "Premium-Gold" },
  { site: "Tema Facility", enabled: false, printer: "PRT-TX-003", printerStatus: "offline", template: "Standard V2" },
];

// ---------------------------------------------------------------------------
// License usage (mirrors license-store + PRD 10.11)
// ---------------------------------------------------------------------------

export interface LicenseUsage {
  businessName: string;
  tier: string;
  activationDate: string;
  expiryDate: string;
  terminalsUsed: number;
  terminalsLimit: number;
  identitiesUsed: number;
  identitiesLimit: number;
  maxSites: number;
  dataRetention: string;
  systemId: string;
  regionalNode: string;
}

export function demoLicenseUsage(): LicenseUsage {
  return {
    businessName: "Global Canteen Services",
    tier: "Professional",
    activationDate: "2026-01-01",
    expiryDate: "2027-01-01",
    terminalsUsed: 5,
    terminalsLimit: 5,
    identitiesUsed: 847,
    identitiesLimit: 1000,
    maxSites: 5,
    dataRetention: "24 months",
    systemId: "MES-4920-X9-AL",
    regionalNode: "North America - Central",
  };
}

// ---------------------------------------------------------------------------
// Dashboard aggregates
// ---------------------------------------------------------------------------

export interface DashboardMetrics {
  mealsToday: number;
  mealsTrend: string;
  biometricSuccessRate: number;
  activeTerminals: number;
  totalTerminals: number;
  offlineCount: number;
  totalDailyCost: number;
  syncBacklog: number;
}

export function demoDashboardMetrics(): DashboardMetrics {
  return {
    mealsToday: 1847,
    mealsTrend: "+3.2%",
    biometricSuccessRate: 97.4,
    activeTerminals: 12,
    totalTerminals: 14,
    offlineCount: 2,
    totalDailyCost: 15242.5,
    syncBacklog: 34,
  };
}

export const WEEK_MEALS = [
  { day: "Mon", value: 1240 },
  { day: "Tue", value: 1510 },
  { day: "Wed", value: 1380 },
  { day: "Thu", value: 1620 },
  { day: "Fri", value: 1847 },
  { day: "Sat", value: 620 },
  { day: "Sun", value: 340 },
];
