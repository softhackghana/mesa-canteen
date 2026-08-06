-- MESA — Meal Entitlement, Service & Access Platform
-- Migration 001: initial schema (idempotent).
-- Follows PRD v1.3 section 19 (data model), 12 (biometric), 13 (licensing).
-- RLS: every table enables row level security. Policies grant the
-- `authenticated` role; `service_role` bypasses RLS by platform design
-- (BYPASSRLS), so no service-role policy is strictly needed, but roles are
-- listed explicitly per the migration convention.

create extension if not exists pgcrypto;

-- =====================================================================
-- Organisational
-- =====================================================================

create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.departments enable row level security;

create table if not exists public.cost_centres (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null,
  department_id uuid references public.departments(id) on delete set null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.cost_centres enable row level security;

create table if not exists public.sites (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  address     text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.sites enable row level security;

-- =====================================================================
-- People Master (PRD 10.2 / FR-PM-001..004)
-- =====================================================================

create table if not exists public.people (
  id                 uuid primary key default gen_random_uuid(),
  employee_id        text not null unique,              -- unique across active AND inactive (FR-PM-004)
  first_name         text not null,
  last_name          text not null,
  email              text,
  department_id      uuid references public.departments(id) on delete set null,
  cost_centre_id     uuid references public.cost_centres(id) on delete set null,
  site_id            uuid references public.sites(id) on delete set null,
  status             text not null default 'active'
                     check (status in ('active','pending_enrollment','inactive','terminated')),
  hire_date          date,
  hris_id            text,                              -- HRIS mapping field (FR-INT-001)
  biometric_consent  boolean not null default false,    -- GDPR/POPIA consent tracking
  consent_at         timestamptz,
  photo_url          text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.people enable row level security;

-- =====================================================================
-- User profile extras (RBAC roles for portal users; auth.users is the base)
-- =====================================================================

create table if not exists public.user_profiles (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  person_id    uuid references public.people(id) on delete set null,
  full_name    text not null,
  email        text unique,
  role         text not null default 'cashier'
               check (role in ('system_admin','site_admin','enrollment_officer','cashier','supervisor','finance_officer')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

-- =====================================================================
-- Biometric templates (PRD 10.1 / FR-IM-001..006, section 12)
-- Only encrypted SourceAFIS minutiae templates are stored; raw images are
-- discarded after extraction. Up to 3 templates per person (app-enforced;
-- ponytail: no trigger capping at 3 — add a count trigger if the API layer
-- cannot be trusted to enforce it).
-- =====================================================================

create table if not exists public.biometric_templates (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references public.people(id) on delete cascade,
  finger_position text not null
                  check (finger_position in ('right_thumb','right_index','right_middle','right_ring','right_little',
                                             'left_thumb','left_index','left_middle','left_ring','left_little')),
  template       bytea not null,                          -- AES-256 encrypted SourceAFIS minutiae template
  vendor         text not null check (vendor in ('digitalpersona','suprema','zkteco')),
  quality_score  numeric(5,2) not null check (quality_score >= 0 and quality_score <= 100),
  is_active      boolean not null default true,
  captured_at    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  unique (person_id, finger_position)  -- one template per finger per person
);

alter table public.biometric_templates enable row level security;

create index if not exists idx_biometric_templates_person on public.biometric_templates(person_id);
create index if not exists idx_biometric_templates_active on public.biometric_templates(person_id) where is_active;

-- =====================================================================
-- Credentials (biometric fallbacks: RFID card / PIN / QR — FR-PM-003)
-- =====================================================================

create table if not exists public.credentials (
  id               uuid primary key default gen_random_uuid(),
  person_id        uuid not null references public.people(id) on delete cascade,
  credential_type  text not null check (credential_type in ('rfid','pin','qr')),
  credential_value text not null,          -- PINs are hashed at the app layer; never plaintext
  is_active        boolean not null default true,
  issued_at        timestamptz not null default now(),
  expires_at       timestamptz,
  created_at       timestamptz not null default now(),
  unique (credential_type, credential_value)
);

alter table public.credentials enable row level security;

create index if not exists idx_credentials_person on public.credentials(person_id);

-- =====================================================================
-- Meal Rules Engine (PRD 10.4 / FR-MRE-001..004)
-- =====================================================================

create table if not exists public.meal_rules (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null unique,
  description          text,
  meal_period          text not null check (meal_period in ('breakfast','lunch','dinner','snack','custom')),
  max_meals            integer not null check (max_meals > 0),
  window_start         time not null,
  window_end           time not null,
  active_days          smallint[] not null default '{1,2,3,4,5}',  -- postgres dow: 0=Sunday..6=Saturday
  company_subsidy_pct  numeric(5,2) not null default 75 check (company_subsidy_pct >= 0 and company_subsidy_pct <= 100),
  block_duplicate      boolean not null default true,
  is_active            boolean not null default true,
  created_by           uuid references public.user_profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.meal_rules enable row level security;

create table if not exists public.meal_rule_assignments (
  id            uuid primary key default gen_random_uuid(),
  meal_rule_id  uuid not null references public.meal_rules(id) on delete cascade,
  person_id     uuid references public.people(id) on delete cascade,
  department_id uuid references public.departments(id) on delete cascade,
  cost_centre_id uuid references public.cost_centres(id) on delete cascade,
  site_id       uuid references public.sites(id) on delete cascade,
  created_at    timestamptz not null default now()
  -- scope: one or more of person/department/cost_centre/site; a row where
  -- ALL four are null is the GLOBAL default assignment for the rule.
);

alter table public.meal_rule_assignments enable row level security;

create index if not exists idx_meal_rule_assignments_rule on public.meal_rule_assignments(meal_rule_id);
create index if not exists idx_meal_rule_assignments_scope on public.meal_rule_assignments(person_id, department_id, cost_centre_id, site_id);

-- =====================================================================
-- Receipt / coupon templates (PRD 10.13 / FR-TPL-001..008)
-- site_id NULL = global template; a row with a site = site-level override
-- =====================================================================

create table if not exists public.receipt_templates (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  description  text,
  is_default   boolean not null default false,
  is_active    boolean not null default true,
  site_id      uuid references public.sites(id) on delete cascade,
  logo_url     text,
  footer_text  text,
  field_config jsonb not null default '[]',   -- [{key,label,align,size,bold}...]
  created_by   uuid references public.user_profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.receipt_templates enable row level security;

create table if not exists public.receipt_template_versions (
  id                  uuid primary key default gen_random_uuid(),
  receipt_template_id uuid not null references public.receipt_templates(id) on delete cascade,
  version             integer not null,
  field_config        jsonb not null default '[]',
  logo_url            text,
  footer_text         text,
  created_by          uuid references public.user_profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  unique (receipt_template_id, version)
);

alter table public.receipt_template_versions enable row level security;

create index if not exists idx_receipt_template_versions_tpl on public.receipt_template_versions(receipt_template_id);

-- =====================================================================
-- POS terminals & health (PRD 10.6 / FR-ADM-002, FR-RCP-003)
-- =====================================================================

create table if not exists public.terminals (
  id               uuid primary key default gen_random_uuid(),
  terminal_code    text not null unique,
  name             text not null,
  site_id          uuid references public.sites(id) on delete set null,
  ip_address       inet,
  expected_ip      inet,                     -- optional IP lock (terminal registration modal)
  auth_token_hash  text,                     -- device trust token hash, never plaintext
  software_version text,
  scanner_vendor   text,
  scanner_model    text,
  printer_name     text,
  status           text not null default 'offline'
                   check (status in ('online','offline','error','maintenance')),
  last_heartbeat_at timestamptz,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.terminals enable row level security;

create index if not exists idx_terminals_site on public.terminals(site_id);

create table if not exists public.terminal_heartbeats (
  id                  uuid primary key default gen_random_uuid(),
  terminal_id         uuid not null references public.terminals(id) on delete cascade,
  heartbeat_at        timestamptz not null default now(),
  ip_address          inet,
  status              text check (status in ('online','offline','error','maintenance')),
  software_version    text,
  printer_status      text check (printer_status in ('online','paper_out','cover_open','error')),
  sync_pending_count  integer not null default 0 check (sync_pending_count >= 0),
  created_at          timestamptz not null default now()
);

alter table public.terminal_heartbeats enable row level security;

create index if not exists idx_terminal_heartbeats_terminal on public.terminal_heartbeats(terminal_id, heartbeat_at desc);

-- =====================================================================
-- Fiscal periods (PRD 10.7 / FR-FIN-001..004)
-- =====================================================================

create table if not exists public.fiscal_periods (
  id            uuid primary key default gen_random_uuid(),
  period_key    text not null unique check (period_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  start_date    date not null,
  end_date      date not null,
  closed_at     timestamptz,
  closed_by     uuid references public.user_profiles(id) on delete set null,
  reconciliation jsonb,
  created_at    timestamptz not null default now()
);

alter table public.fiscal_periods enable row level security;

-- =====================================================================
-- Transactions (PRD 10.3 / FR-POS, FR-MRE-002)
-- is_closed/closed_period tag a transaction to a closed fiscal period;
-- those rows are immutable (trigger in 002_functions.sql).
-- =====================================================================

create table if not exists public.transactions (
  id              uuid primary key default gen_random_uuid(),
  transaction_ref text not null unique,
  person_id       uuid not null references public.people(id) on delete restrict,
  terminal_id     uuid not null references public.terminals(id) on delete restrict,
  site_id         uuid not null references public.sites(id) on delete restrict,
  meal_rule_id    uuid references public.meal_rules(id) on delete set null,
  meal_period     text not null,
  occurred_at     timestamptz not null default now(),
  status          text not null default 'approved'
                  check (status in ('approved','denied','override','queued','synced')),
  auth_method     text not null default 'biometric'
                  check (auth_method in ('biometric','rfid','pin','qr','supervisor_override')),
  subsidy_pct     numeric(5,2) check (subsidy_pct >= 0 and subsidy_pct <= 100),
  gross_amount    numeric(12,2) check (gross_amount >= 0),
  subsidy_amount  numeric(12,2) check (subsidy_amount >= 0),
  employee_amount numeric(12,2) check (employee_amount >= 0),
  supervisor_id   uuid references public.people(id) on delete set null,
  override_reason text,
  is_closed       boolean not null default false,
  closed_period   text,
  synced_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.transactions enable row level security;

create index if not exists idx_transactions_person_time on public.transactions(person_id, occurred_at);
create index if not exists idx_transactions_terminal_time on public.transactions(terminal_id, occurred_at);
create index if not exists idx_transactions_site_time on public.transactions(site_id, occurred_at);
create index if not exists idx_transactions_closed on public.transactions(closed_period) where is_closed;
create index if not exists idx_transactions_status on public.transactions(status);

-- =====================================================================
-- Print jobs (PRD 10.12 / FR-RCP-001..006)
-- =====================================================================

create table if not exists public.print_jobs (
  id                  uuid primary key default gen_random_uuid(),
  transaction_id      uuid not null references public.transactions(id) on delete cascade,
  terminal_id         uuid not null references public.terminals(id) on delete cascade,
  template_version_id uuid references public.receipt_template_versions(id) on delete set null,
  print_status        text not null default 'queued'
                      check (print_status in ('queued','printed','failed','reprint','disabled')),
  reprint_count       integer not null default 0 check (reprint_count >= 0),
  is_reprint          boolean not null default false,
  error_message       text,
  printed_at          timestamptz,
  created_at          timestamptz not null default now()
);

alter table public.print_jobs enable row level security;

create index if not exists idx_print_jobs_transaction on public.print_jobs(transaction_id);
create index if not exists idx_print_jobs_terminal on public.print_jobs(terminal_id);

-- =====================================================================
-- Sync jobs (offline reconciliation — PRD 14.5)
-- =====================================================================

create table if not exists public.sync_jobs (
  id           uuid primary key default gen_random_uuid(),
  terminal_id  uuid references public.terminals(id) on delete set null,
  job_type     text not null check (job_type in ('transaction_push','template_pull','template_cache_clear','config_push','heartbeat')),
  status       text not null default 'pending' check (status in ('pending','running','completed','failed')),
  items_count  integer not null default 0,
  error_message text,
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.sync_jobs enable row level security;

create index if not exists idx_sync_jobs_terminal on public.sync_jobs(terminal_id, created_at desc);
create index if not exists idx_sync_jobs_status on public.sync_jobs(status);

-- =====================================================================
-- Licensing (PRD 10.11 / section 13 / FR-LIC-001..010)
-- =====================================================================

create table if not exists public.license_records (
  id                uuid primary key default gen_random_uuid(),
  license_key_hash  text not null unique,       -- SHA-256 of the opaque key; plaintext never stored
  business_name     text not null,              -- display only
  business_name_hash text not null,             -- SHA-256 of the NORMALISED name (FR-LIC-002/003)
  tier              text not null default 'starter' check (tier in ('starter','professional','enterprise')),
  status            text not null default 'inactive'
                    check (status in ('inactive','active','grace','expired','revoked')),
  issued_at         date not null default current_date,
  expires_at        date not null,
  grace_period_days integer not null default 7 check (grace_period_days >= 0),
  max_terminals     integer not null default 1 check (max_terminals >= 1),
  max_identities    integer not null default 100 check (max_identities >= 1),
  activation_count  integer not null default 0 check (activation_count >= 0),
  features          jsonb not null default '[]',
  revoked_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.license_records enable row level security;

create table if not exists public.license_activations (
  id                   uuid primary key default gen_random_uuid(),
  license_record_id    uuid not null references public.license_records(id) on delete cascade,
  certificate_jwt      text not null,           -- ES256 certificate from the licensing server
  business_name_entered text,
  client_ip            inet,
  activated_by         uuid references public.user_profiles(id) on delete set null,
  is_active            boolean not null default true,
  activated_at         timestamptz not null default now(),
  deactivated_at       timestamptz
);

alter table public.license_activations enable row level security;

create index if not exists idx_license_activations_record on public.license_activations(license_record_id);

-- =====================================================================
-- Audit logs (PRD 10.10) — append-only. Immutability is enforced by the
-- trg_guard_audit_logs trigger in 002_functions.sql (raises on UPDATE/DELETE
-- for every role, including the owner). Plain RLS (not FORCE) so the
-- service role can append via BYPASSRLS while authenticated users are
-- limited to SELECT + INSERT by the policies below.
-- =====================================================================

create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.user_profiles(id) on delete set null,
  actor_type  text not null default 'user' check (actor_type in ('user','system','terminal')),
  entity_type text not null,
  entity_id   text not null,
  action      text not null,
  delta       jsonb,
  ip_address  inet,
  occurred_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_id);
create index if not exists idx_audit_logs_time on public.audit_logs(occurred_at desc);

-- =====================================================================
-- System settings (single-row global config, PRD 10.12 receipt printing)
-- Likely written-only by admins and read by terminals/POS; kept wide open
-- under the same convention as other MESA tables.
-- =====================================================================

create table if not exists public.settings (
  id                      text primary key,          -- fixed 'global'
  receipt_printing_enabled boolean not null default true,
  default_template_id     text,                      -- receipt template id/label
  site_template_overrides jsonb not null default '{}'::jsonb,
  updated_at              timestamptz not null default now()
);

alter table public.settings enable row level security;

-- =====================================================================
-- RLS policies
-- Convention: authenticated users get full CRUD on MESA tables (fine-grained
-- RBAC is applied at the API layer; ponytail: replace with role-based
-- policies when the RBAC matrix in PRD section 16 is implemented).
-- audit_logs gets SELECT + INSERT only.
-- =====================================================================

-- departments
drop policy if exists "mesa_departments_all" on public.departments;
create policy "mesa_departments_all" on public.departments
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- cost_centres
drop policy if exists "mesa_cost_centres_all" on public.cost_centres;
create policy "mesa_cost_centres_all" on public.cost_centres
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- sites
drop policy if exists "mesa_sites_all" on public.sites;
create policy "mesa_sites_all" on public.sites
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- people
drop policy if exists "mesa_people_all" on public.people;
create policy "mesa_people_all" on public.people
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- user_profiles
drop policy if exists "mesa_user_profiles_all" on public.user_profiles;
create policy "mesa_user_profiles_all" on public.user_profiles
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- biometric_templates
drop policy if exists "mesa_biometric_templates_all" on public.biometric_templates;
create policy "mesa_biometric_templates_all" on public.biometric_templates
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- credentials
drop policy if exists "mesa_credentials_all" on public.credentials;
create policy "mesa_credentials_all" on public.credentials
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- meal_rules
drop policy if exists "mesa_meal_rules_all" on public.meal_rules;
create policy "mesa_meal_rules_all" on public.meal_rules
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- meal_rule_assignments
drop policy if exists "mesa_meal_rule_assignments_all" on public.meal_rule_assignments;
create policy "mesa_meal_rule_assignments_all" on public.meal_rule_assignments
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- receipt_templates
drop policy if exists "mesa_receipt_templates_all" on public.receipt_templates;
create policy "mesa_receipt_templates_all" on public.receipt_templates
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- receipt_template_versions
drop policy if exists "mesa_receipt_template_versions_all" on public.receipt_template_versions;
create policy "mesa_receipt_template_versions_all" on public.receipt_template_versions
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- terminals
drop policy if exists "mesa_terminals_all" on public.terminals;
create policy "mesa_terminals_all" on public.terminals
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- terminal_heartbeats
drop policy if exists "mesa_terminal_heartbeats_all" on public.terminal_heartbeats;
create policy "mesa_terminal_heartbeats_all" on public.terminal_heartbeats
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- fiscal_periods
drop policy if exists "mesa_fiscal_periods_all" on public.fiscal_periods;
create policy "mesa_fiscal_periods_all" on public.fiscal_periods
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- transactions
drop policy if exists "mesa_transactions_all" on public.transactions;
create policy "mesa_transactions_all" on public.transactions
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- print_jobs
drop policy if exists "mesa_print_jobs_all" on public.print_jobs;
create policy "mesa_print_jobs_all" on public.print_jobs
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- sync_jobs
drop policy if exists "mesa_sync_jobs_all" on public.sync_jobs;
create policy "mesa_sync_jobs_all" on public.sync_jobs
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- license_records
drop policy if exists "mesa_license_records_all" on public.license_records;
create policy "mesa_license_records_all" on public.license_records
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- license_activations
drop policy if exists "mesa_license_activations_all" on public.license_activations;
create policy "mesa_license_activations_all" on public.license_activations
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- audit_logs: read + append only; immutability also enforced by trigger
drop policy if exists "mesa_audit_logs_read" on public.audit_logs;
create policy "mesa_audit_logs_read" on public.audit_logs
  for select to authenticated, anon
  using (auth.uid() is not null);

drop policy if exists "mesa_audit_logs_insert" on public.audit_logs;
create policy "mesa_audit_logs_insert" on public.audit_logs
  for insert to authenticated, anon
  with check (auth.uid() is not null);

-- settings
drop policy if exists "mesa_settings_all" on public.settings;
create policy "mesa_settings_all" on public.settings
  for all to authenticated, anon
  using (auth.uid() is not null) with check (auth.uid() is not null);
