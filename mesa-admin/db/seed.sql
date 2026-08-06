-- MESA — Meal Entitlement, Service & Access Platform
-- Seed script: realistic demo data matching the design-system mockups
-- (names, employee IDs, sites, cost centres from the HTML mocks).
-- Idempotent: every insert guards on a unique key so re-runs are safe.

-- =====================================================================
-- Organisational
-- =====================================================================

insert into public.departments (code, name, description)
values
  ('ENG', 'Engineering',     'Product and platform engineering'),
  ('HR',  'Human Resources', 'People operations and HR administration'),
  ('OPS', 'Operations',      'Site and canteen operations'),
  ('LOG', 'Logistics',       'Supply chain, distribution and warehousing'),
  ('FIN', 'Finance',         'Accounting, payroll and financial reporting')
on conflict (code) do nothing;

insert into public.cost_centres (code, name, department_id)
select cc.code, cc.name, d.id
from (values
  ('CC-ENG-01', 'Engineering Core',   'ENG'),
  ('CC-HR-01',  'People Operations',  'HR'),
  ('CC-OPS-04', 'Canteen Operations', 'OPS'),
  ('CC-LOG-02', 'Distribution West',  'LOG'),
  ('CC-210',    'HQ Administrative',  'FIN'),
  ('CC-890',    'Facilities',         'OPS')
) as cc(code, name, dep_code)
join public.departments d on d.code = cc.dep_code
on conflict (code) do nothing;

insert into public.sites (code, name, address)
values
  ('HQ', 'HQ Campus',        '1 Innovation Drive, North Campus'),
  ('NC', 'North Campus',     '2 North Campus Road'),
  ('SF', 'South Facility',   '15 South Facility Avenue'),
  ('TM', 'Tema Facility',    'Tema Industrial Area, Tema'),
  ('DW', 'Distribution West','Distribution Center West')
on conflict (code) do nothing;

-- =====================================================================
-- People Master — names/IDs from the design system mockups
-- =====================================================================

insert into public.people
  (employee_id, first_name, last_name, email, department_id, cost_centre_id, site_id,
   status, hire_date, hris_id, biometric_consent, consent_at)
select p.employee_id, p.first_name, p.last_name, p.email, d.id, cc.id, s.id,
       p.status, p.hire_date::date, p.hris_id, p.biometric_consent, p.consent_at
from (values
  ('EMP-10492', 'Marcus', 'Johnson', 'marcus.johnson@mesa.example', 'ENG', 'CC-ENG-01', 'HQ',
   'active', '2021-03-15', 'HRIS-10492', true, now()),
  ('EMP-8849',  'Robert', 'Chen',    'robert.chen.d@mesa.example',  'ENG', 'CC-ENG-01', 'HQ',
   'active', '2024-06-11', 'HRIS-08849', true, now()),
  ('EMP-5632',  'Daniel', 'Okafor',  'daniel.okafor@mesa.example',  'LOG', 'CC-LOG-02', 'HQ',
   'active', '2023-02-20', 'HRIS-05632', true, now()),
  ('EMP-10493', 'Sarah',  'Lopez',   'sarah.lopez@mesa.example',   'HR',  'CC-HR-01',  'NC',
   'active', '2022-07-04', 'HRIS-10493', true, now()),
  ('EMP-1120',  'Alex',   'Davis',   'alex.davis@mesa.example',    'OPS', 'CC-OPS-04', 'HQ',
   'active', '2020-01-20', 'HRIS-01120', true, now()),
  ('EMP-2099',  'Priya',  'Patel',   'priya.patel@mesa.example',   'LOG', 'CC-LOG-02', 'DW',
   'active', '2019-11-02', 'HRIS-02099', true, now()),
  ('EMP-3312',  'Robert', 'Chen',    'robert.chen@mesa.example',   'ENG', 'CC-ENG-01', 'SF',
   'active', '2023-05-10', 'HRIS-03312', true, now()),
  ('EMP-1042',  'Alice',  'Smith',   'alice.smith@mesa.example',   'FIN', 'CC-210',    'HQ',
   'active', '2018-09-01', 'HRIS-01042', true, now()),
  ('EMP-8831',  'Johnna', 'Smith',   'johnna.smith@mesa.example',  'OPS', 'CC-890',    'HQ',
   'pending_enrollment', '2026-02-17', 'HRIS-08831', false, null),
  ('EMP-84729', 'Sarah',  'Mensah',  'sarah.mensah@mesa.example',  'HR',  'CC-HR-01',  'TM',
   'active', '2021-08-30', 'HRIS-84729', true, now()),
  ('EMP-234',   'Tunde',  'Okafor',  'tunde.okafor@mesa.example',  'OPS', 'CC-OPS-04', 'TM',
   'active', '2022-04-12', 'HRIS-00234', true, now())
) as p(employee_id, first_name, last_name, email, dep_code, cc_code, site_code,
       status, hire_date, hris_id, biometric_consent, consent_at)
join public.departments d on d.code = p.dep_code
join public.cost_centres cc on cc.code = p.cc_code
join public.sites s on s.code = p.site_code
on conflict (employee_id) do nothing;

-- Portal user profile extras (roles from PRD section 7). No auth.users row
-- is created; user_profiles.auth_user_id stays null until SSO/InsForge auth
-- provisions real identities. ponytail: seeded as reference data only.
insert into public.user_profiles (full_name, email, role, person_id)
select u.full_name, u.email, u.role, pe.id
from (values
  ('Marcus Johnson', 'marcus.johnson@mesa.example', 'system_admin',      'EMP-10492'),
  ('Sarah Lopez',    'sarah.lopez@mesa.example',    'site_admin',        'EMP-10493'),
  ('Alex Davis',     'alex.davis@mesa.example',     'supervisor',        'EMP-1120'),
  ('Robert Chen',    'robert.chen@mesa.example',    'enrollment_officer','EMP-3312'),
  ('Alice Smith',    'alice.smith@mesa.example',    'finance_officer',   'EMP-1042')
) as u(full_name, email, role, emp_id)
join public.people pe on pe.employee_id = u.emp_id
on conflict (email) do nothing;

-- =====================================================================
-- Biometric templates + credentials — placeholder values; real templates
-- come from SourceAFIS capture. Encrypted at the app layer (AES-256).
-- =====================================================================

insert into public.biometric_templates (person_id, finger_position, template, vendor, quality_score)
select pe.id, t.pos, decode(t.hex, 'hex'), t.vendor, t.score
from (values
  ('EMP-10492', 'right_index',  '0000000000000000000000000000000000000000000000000000000000000000', 'digitalpersona', 98.50),
  ('EMP-10493', 'right_index',  '0000000000000000000000000000000000000000000000000000000000000000', 'suprema',        96.00),
  ('EMP-1120',  'right_index',  '0000000000000000000000000000000000000000000000000000000000000000', 'zkteco',         95.25),
  ('EMP-2099',  'right_index',  '0000000000000000000000000000000000000000000000000000000000000000', 'digitalpersona', 93.75),
  ('EMP-3312',  'right_index',  '0000000000000000000000000000000000000000000000000000000000000000', 'suprema',        97.10),
  ('EMP-1042',  'right_index',  '0000000000000000000000000000000000000000000000000000000000000000', 'zkteco',         94.60)
) as t(emp_id, pos, hex, vendor, score)
join public.people pe on pe.employee_id = t.emp_id
on conflict (person_id, finger_position) do nothing;

insert into public.credentials (person_id, credential_type, credential_value)
select pe.id, c.ctype, c.cvalue
from (values
  ('EMP-10492', 'rfid', 'CARD-0001'),
  ('EMP-10493', 'pin',  '$2b$10$placeholderhashplaceholderhashplaceholderhash'),  -- app-hashed; never plaintext
  ('EMP-1120',  'rfid', 'CARD-0002'),
  ('EMP-2099',  'pin',  '$2b$10$placeholderhashplaceholderhashplaceholderhash'),
  ('EMP-1042',  'rfid', 'CARD-0003')
) as c(emp_id, ctype, cvalue)
join public.people pe on pe.employee_id = c.emp_id
on conflict (credential_type, credential_value) do nothing;

-- =====================================================================
-- Meal rules (mockups: Breakfast 06:00-09:00, Lunch 11:00-14:00,
-- Dinner 17:30-20:00; default 75% company subsidy)
-- =====================================================================

insert into public.meal_rules
  (name, description, meal_period, max_meals, window_start, window_end,
   active_days, company_subsidy_pct, block_duplicate, is_active)
values
  ('Breakfast Rule', '1 meal per breakfast window (06:00-09:00)', 'breakfast', 1, '06:00', '09:00',
   '{1,2,3,4,5}', 75, true, true),
  ('Lunch Rule',    '1 meal per lunch window (11:00-14:00)',      'lunch',     1, '11:00', '14:00',
   '{1,2,3,4,5}', 75, true, true),
  ('Dinner Rule',   '1 meal per dinner window (17:30-20:00)',     'dinner',    1, '17:30', '20:00',
   '{1,2,3,4,5}', 75, true, true),
  ('Night Shift Snack', '2 meals per overnight window (22:00-05:00)', 'snack', 2, '22:00', '05:00',
   '{1,2,3,4,5,6,7}', 100, true, true)
on conflict (id) do nothing;

-- Global defaults (all scopes null)
insert into public.meal_rule_assignments (meal_rule_id)
select r.id from public.meal_rules r
where r.name in ('Breakfast Rule', 'Lunch Rule', 'Dinner Rule')
  and not exists (select 1 from public.meal_rule_assignments a where a.meal_rule_id = r.id and a.person_id is null and a.department_id is null and a.cost_centre_id is null and a.site_id is null);

-- Logistics gets the night-shift snack rule; overnight staff at Distribution West
insert into public.meal_rule_assignments (meal_rule_id, cost_centre_id)
select r.id, cc.id
from public.meal_rules r, public.cost_centres cc
where r.name = 'Night Shift Snack' and cc.code = 'CC-LOG-02'
  and not exists (select 1 from public.meal_rule_assignments a where a.meal_rule_id = r.id and a.cost_centre_id = cc.id);

-- =====================================================================
-- License (PRD 13: key hash + business name hash only; mockup business
-- name 'Global Canteen Services')
-- =====================================================================

insert into public.license_records
  (license_key_hash, business_name, business_name_hash, tier, status,
   issued_at, expires_at, grace_period_days, max_terminals, max_identities,
   activation_count, features)
values
  (encode(sha256('MESA-A3K9Z-BT2MQ-7XRPH-C4WNJ'::bytea), 'hex'),
   'Global Canteen Services',
   encode(sha256('global canteen services'::bytea), 'hex'),
   'professional', 'active',
   '2026-01-01', '2027-01-01', 7, 5, 1000,
   1,
   '["receipt_printing","hris_sync","reporting"]'::jsonb)
on conflict (license_key_hash) do nothing;

-- =====================================================================
-- Receipt templates (default + one site override for the template designer)
-- =====================================================================

insert into public.receipt_templates
  (code, name, description, is_default, is_active, site_id, footer_text, field_config)
values
  ('TPL-DEFAULT', 'Default Coupon', 'Read-only system default template (baseline)', true, true, null,
   'Thank you. Meal issued by MESA.',
   '[{"key":"business_name","label":"Business Name","align":"center","size":"medium","bold":true},' ||
   '{"key":"employee_name","label":"Employee Name","align":"left","size":"medium","bold":false},' ||
   '{"key":"employee_id","label":"Employee ID","align":"left","size":"small","bold":false},' ||
   '{"key":"department","label":"Department","align":"left","size":"small","bold":false},' ||
   '{"key":"meal_period","label":"Meal Period","align":"left","size":"small","bold":false},' ||
   '{"key":"date","label":"Date","align":"left","size":"small","bold":false},' ||
   '{"key":"time","label":"Time","align":"left","size":"small","bold":false},' ||
   '{"key":"transaction_ref","label":"Transaction Ref","align":"left","size":"small","bold":false},' ||
   '{"key":"subsidy_amount","label":"Subsidy Amount","align":"right","size":"small","bold":false},' ||
   '{"key":"employee_amount","label":"Employee-Paid","align":"right","size":"small","bold":false},' ||
   '{"key":"qr_code","label":"QR Code","align":"center","size":"medium","bold":false}]'::jsonb)
on conflict (code) do nothing;

insert into public.receipt_template_versions
  (receipt_template_id, version, field_config, footer_text)
select t.id, 1, t.field_config, t.footer_text
from public.receipt_templates t
where t.code = 'TPL-DEFAULT'
  and not exists (select 1 from public.receipt_template_versions v where v.receipt_template_id = t.id and v.version = 1);

-- =====================================================================
-- Terminal (mockup: TERM-NY-01, HQ Campus) + one heartbeat
-- =====================================================================

insert into public.terminals
  (terminal_code, name, site_id, ip_address, expected_ip, auth_token_hash,
   software_version, scanner_vendor, scanner_model, printer_name, status, last_heartbeat_at)
select 'TERM-NY-01', 'Main Cafeteria Kiosk', s.id, '10.20.30.40', '10.20.30.40',
       encode(sha256('mesa-terminal-token-placeholder'::bytea), 'hex'),
       '1.0.0', 'digitalpersona', 'U.are.U 5160', 'EPSON TM-T88V', 'online', now() - interval '5 seconds'
from public.sites s where s.code = 'HQ'
on conflict (terminal_code) do nothing;

insert into public.terminal_heartbeats (terminal_id, ip_address, status, software_version, printer_status, sync_pending_count)
select t.id, t.ip_address, 'online', t.software_version, 'online', 0
from public.terminals t
where t.terminal_code = 'TERM-NY-01'
  and not exists (select 1 from public.terminal_heartbeats h where h.terminal_id = t.id);

-- =====================================================================
-- Transactions — a few approved meals today. Each insert goes through the
-- meal-rule trigger, so transactions respect the seeded entitlement rules
-- (one per window per person). Use 07:30 breakfast and 11:30 lunch.
-- =====================================================================

insert into public.transactions
  (transaction_ref, person_id, terminal_id, site_id, meal_period, occurred_at,
   status, auth_method, subsidy_pct, gross_amount)
select 'TXN-' || to_char(p.ts::timestamptz, 'YYYYMMDD') || '-' || p.seq,
       pe.id, t.id, s.id, p.meal_period, p.ts::timestamptz,
       'approved', p.auth_method, 75, 12.00
from (values
  ('EMP-10492', 'breakfast', '2026-08-03 07:31:00+00', 'biometric', 1),
  ('EMP-10492', 'lunch',     '2026-08-03 12:15:00+00', 'biometric', 2),
  ('EMP-1120',  'breakfast', '2026-08-03 07:45:00+00', 'biometric', 3),
  ('EMP-10493', 'breakfast', '2026-08-03 08:02:00+00', 'rfid',      4),
  ('EMP-2099',  'breakfast', '2026-08-03 07:20:00+00', 'biometric', 5),
  ('EMP-1042',  'breakfast', '2026-08-03 07:55:00+00', 'biometric', 6),
  ('EMP-84729', 'breakfast', '2026-08-03 08:10:00+00', 'pin',       7)
) as p(emp_id, meal_period, ts, auth_method, seq)
join public.people pe on pe.employee_id = p.emp_id
join public.terminals t on t.terminal_code = 'TERM-NY-01'
join public.sites s on s.id = t.site_id
on conflict (transaction_ref) do nothing;

-- Print job for the most recent approved transaction (receipt flow)
insert into public.print_jobs (transaction_id, terminal_id, template_version_id, print_status, printed_at)
select tx.id, tx.terminal_id, tv.id, 'printed', tx.occurred_at + interval '2 seconds'
from public.transactions tx
join public.receipt_template_versions tv on true
where tx.transaction_ref = 'TXN-20260803-6'
  and not exists (select 1 from public.print_jobs p where p.transaction_id = tx.id);

-- =====================================================================
-- System settings (single global row, PRD 10.12)
-- =====================================================================
insert into public.settings (id, receipt_printing_enabled, default_template_id, site_template_overrides)
values ('global', true, 'TPL-DEFAULT', '{"HQ Campus": "TPL-DEFAULT"}'::jsonb)
on conflict (id) do nothing;
