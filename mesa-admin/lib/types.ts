/**
 * MESA canonical domain types, mirroring the backend schema
 * (db/migrations/001_init.sql — PRD section 19).
 *
 * Row types are write-shaped: nullable columns are `T | null` (not optional),
 * id/timestamps use UUID/ISO-8601 strings. A few POS-era legacy types
 * (PosOperator, PosTransaction, Settings, Device) are retained for the stores
 * that already use them; their shapes are intentionally unchanged.
 */

// ---------------------------------------------------------------------------
// Organisational
// ---------------------------------------------------------------------------

export interface Department {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CostCentre {
  id: string;
  code: string;
  name: string;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// People Master & identity (PRD 10.1/10.2)
// ---------------------------------------------------------------------------

export type PersonStatus = 'active' | 'pending_enrollment' | 'inactive' | 'terminated';

export interface Person {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  department_id: string | null;
  cost_centre_id: string | null;
  site_id: string | null;
  status: PersonStatus;
  hire_date: string | null;
  hris_id: string | null;
  biometric_consent: boolean;
  consent_at: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export type FingerPosition =
  | 'right_thumb' | 'right_index' | 'right_middle' | 'right_ring' | 'right_little'
  | 'left_thumb' | 'left_index' | 'left_middle' | 'left_ring' | 'left_little';

export interface BiometricTemplate {
  id: string;
  person_id: string;
  finger_position: FingerPosition;
  /** AES-256 encrypted SourceAFIS minutiae template. */
  template: ArrayBuffer;
  vendor: 'digitalpersona' | 'suprema' | 'zkteco';
  quality_score: number;
  is_active: boolean;
  captured_at: string;
  created_at: string;
}

export type CredentialType = 'rfid' | 'pin' | 'qr';

export interface Credential {
  id: string;
  person_id: string;
  credential_type: CredentialType;
  /** PINs are hashed at the app layer; never plaintext. */
  credential_value: string;
  is_active: boolean;
  issued_at: string;
  expires_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Meal rules (PRD 10.4)
// ---------------------------------------------------------------------------

export type MealPeriod = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'custom';

export interface MealRule {
  id: string;
  name: string;
  description: string | null;
  meal_period: MealPeriod;
  max_meals: number;
  /** "HH:MM" 24-hour, local time. */
  window_start: string;
  /** "HH:MM" 24-hour, local time. */
  window_end: string;
  /** postgres dow: 0=Sunday..6=Saturday. */
  active_days: number[];
  company_subsidy_pct: number;
  block_duplicate: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Sites/devices (PRD 10.6)
// ---------------------------------------------------------------------------

export type TerminalStatus = 'online' | 'offline' | 'error' | 'maintenance';

export interface Terminal {
  id: string;
  terminal_code: string;
  name: string;
  site_id: string | null;
  ip_address: string | null;
  expected_ip: string | null;
  auth_token_hash: string | null;
  software_version: string | null;
  scanner_vendor: string | null;
  scanner_model: string | null;
  printer_name: string | null;
  status: TerminalStatus;
  last_heartbeat_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Transactions & print jobs (PRD 10.3, 10.12)
// ---------------------------------------------------------------------------

export type TransactionStatus = 'approved' | 'denied' | 'override' | 'queued' | 'synced';
export type AuthMethod = 'biometric' | 'rfid' | 'pin' | 'qr' | 'supervisor_override';

export interface Transaction {
  id: string;
  transaction_ref: string;
  person_id: string;
  terminal_id: string;
  site_id: string;
  meal_rule_id: string | null;
  meal_period: string;
  occurred_at: string;
  status: TransactionStatus;
  auth_method: AuthMethod;
  subsidy_pct: number | null;
  gross_amount: number | null;
  subsidy_amount: number | null;
  employee_amount: number | null;
  supervisor_id: string | null;
  override_reason: string | null;
  is_closed: boolean;
  closed_period: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PrintStatus = 'queued' | 'printed' | 'failed' | 'reprint' | 'disabled';

export interface PrintJob {
  id: string;
  transaction_id: string;
  terminal_id: string;
  template_version_id: string | null;
  print_status: PrintStatus;
  reprint_count: number;
  is_reprint: boolean;
  error_message: string | null;
  printed_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Sync jobs (offline reconciliation — PRD 14.5)
// ---------------------------------------------------------------------------

export type SyncJobType = 'transaction_push' | 'template_pull' | 'template_cache_clear' | 'config_push' | 'heartbeat';
export type SyncJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SyncJob {
  id: string;
  terminal_id: string | null;
  job_type: SyncJobType;
  status: SyncJobStatus;
  items_count: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Licensing (PRD 13)
// ---------------------------------------------------------------------------

export type LicenseTier = 'starter' | 'professional' | 'enterprise';
export type LicenseStatus = 'inactive' | 'active' | 'grace' | 'expired' | 'revoked';

export interface LicenseRecord {
  id: string;
  /** SHA-256 of the opaque key; plaintext never stored. */
  license_key_hash: string;
  /** Display only. */
  business_name: string;
  /** SHA-256 of the NORMALISED business name (FR-LIC-002/003). */
  business_name_hash: string;
  tier: LicenseTier;
  status: LicenseStatus;
  issued_at: string;
  expires_at: string;
  grace_period_days: number;
  max_terminals: number;
  max_identities: number;
  activation_count: number;
  features: string[];
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Audit logs (PRD 10.10) — append-only
// ---------------------------------------------------------------------------

export type AuditActorType = 'user' | 'system' | 'terminal';

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  actor_type: AuditActorType;
  entity_type: string;
  entity_id: string;
  action: string;
  delta: Record<string, unknown> | null;
  ip_address: string | null;
  occurred_at: string;
}

// ---------------------------------------------------------------------------
// Receipt templates (PRD 10.13)
// ---------------------------------------------------------------------------

export interface ReceiptTemplate {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  /** NULL = global template; a site id is a site-level override. */
  site_id: string | null;
  logo_url: string | null;
  footer_text: string | null;
  field_config: unknown[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// POS-era legacy types — retained for stores/ that already import them.
// ---------------------------------------------------------------------------

export interface PosOperator {
  id: string;
  name: string;
  role: 'operator' | 'supervisor' | 'site_admin' | 'admin';
}

export interface Device {
  id: string;
  name: string;
  site: string;
  ip_address: string;
  version: string;
  scanner_vendor?: string;
  scanner_model?: string;
  last_heartbeat?: string;
  status: 'online' | 'offline' | 'error';
  created_at?: string;
}

export interface PosTransaction {
  id: string;
  person_id: string;
  person_name: string;
  operator_id: string;
  terminal_id: string;
  meal_period: 'breakfast' | 'lunch' | 'dinner';
  status: 'approved' | 'denied';
  scanned_at: string;
  synced_at?: string;
}

export interface Settings {
  receipt_printing_enabled: boolean;
  default_template_id: string;
  site_template_overrides: Record<string, string>;
  updated_at?: string;
}
