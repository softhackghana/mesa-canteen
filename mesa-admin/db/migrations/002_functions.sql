-- MESA — Meal Entitlement, Service & Access Platform
-- Migration 002: functions, triggers, and enforcement logic.
-- Covers: meal rule evaluation, duplicate meal attempt detection,
-- period-end close, audit log append, and immutability guards.

-- =====================================================================
-- 1. Meal rule evaluation — check entitlement BEFORE a transaction insert.
--    Finds the person's applicable meal rule for the window that covers
--    the given instant, counts approved/override transactions within that
--    window, and denies when the max is reached. Returns a JSONB verdict:
--      { allowed, reason, meal_rule_id, meal_period, used, max }
--    Invoke: select public.evaluate_meal_rule(<person_id>, <at timestamptz>);
-- =====================================================================

create or replace function public.evaluate_meal_rule(
  p_person_id uuid,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_day        smallint := extract(dow from p_at)::smallint;
  v_time       time    := p_at::time;
  v_rule       record;
  v_start_adj  timestamptz;
  v_end_adj    timestamptz;
  v_used       integer;
  v_allowed    boolean;
  v_reason     text;
  v_period     text;
begin
  -- Choose the first active rule assigned to this person (person > department
  -- > cost centre > site > global), whose window covers p_at. ponytail:
  -- first-match by assignment priority is a deliberate simplification; a
  -- rule-conflict resolution policy can be layered on later.
  select r.*
    into v_rule
    from public.meal_rules r
    where r.is_active
      and exists (
        select 1 from public.meal_rule_assignments a
        where a.meal_rule_id = r.id
          and (a.person_id = p_person_id
               or a.department_id = (select department_id from public.people where id = p_person_id)
               or a.cost_centre_id = (select cost_centre_id from public.people where id = p_person_id)
               or a.site_id = (select site_id from public.people where id = p_person_id)
               or (a.person_id is null and a.department_id is null and a.cost_centre_id is null and a.site_id is null))
      )
      and (r.active_days is null or v_day = any (r.active_days))
      and case when r.window_start <= r.window_end
               then v_time >= r.window_start and v_time < r.window_end
               else v_time >= r.window_start or v_time < r.window_end end  -- overnight window
    order by
      case
        when exists (select 1 from public.meal_rule_assignments a where a.meal_rule_id = r.id and a.person_id = p_person_id) then 1
        when exists (select 1 from public.meal_rule_assignments a where a.meal_rule_id = r.id and a.department_id = (select department_id from public.people where id = p_person_id)) then 2
        when exists (select 1 from public.meal_rule_assignments a where a.meal_rule_id = r.id and a.cost_centre_id = (select cost_centre_id from public.people where id = p_person_id)) then 3
        when exists (select 1 from public.meal_rule_assignments a where a.meal_rule_id = r.id and a.site_id = (select site_id from public.people where id = p_person_id)) then 4
        else 5
      end,
      r.created_at
    limit 1;

  if v_rule is null then
    return jsonb_build_object('allowed', false, 'reason', 'NO_RULE', 'meal_rule_id', null, 'meal_period', null, 'used', 0, 'max', 0);
  end if;

  -- Window start/end as timestamps anchored to p_at's date; an overnight
  -- window (start > end) spans the previous day's start to today's end.
  if v_rule.window_start <= v_rule.window_end then
    v_start_adj := (p_at::date + v_rule.window_start)::timestamptz;
    v_end_adj   := (p_at::date + v_rule.window_end)::timestamptz;
  else
    v_start_adj := (p_at::date - 1 + v_rule.window_start)::timestamptz;
    v_end_adj   := (p_at::date + v_rule.window_end)::timestamptz;
  end if;

  select count(*) into v_used
    from public.transactions t
    where t.person_id = p_person_id
      and t.status in ('approved', 'override')
      and t.occurred_at >= v_start_adj
      and t.occurred_at < v_end_adj;

  v_allowed := v_used < v_rule.max_meals;
  v_period  := v_rule.meal_period;
  v_reason  := case when v_allowed then 'OK' else 'MAX_REACHED' end;

  return jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'meal_rule_id', v_rule.id,
    'meal_period', v_period,
    'used', v_used,
    'max', v_rule.max_meals
  );
end;
$$;

-- Trigger function: before INSERT into transactions, run the rule evaluation
-- and reject (raise) when the person is not entitled. This is the database
-- level duplicate/entitlement guard (FR-MRE-001/002).
create or replace function public.enforce_meal_rule_before_insert()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_verdict jsonb;
begin
  v_verdict := public.evaluate_meal_rule(new.person_id, new.occurred_at);

  if not (v_verdict->>'allowed')::boolean then
    raise exception 'Meal entitlement check failed: % (meal_period: %, used: %, max: %)',
      v_verdict->>'reason', coalesce(v_verdict->>'meal_period', 'none'),
      v_verdict->>'used', v_verdict->>'max'
      using errcode = 'P0001';
  end if;

  -- Populate rule-derived fields on the inserted row.
  new.meal_rule_id := (v_verdict->>'meal_rule_id')::uuid;
  new.meal_period  := coalesce(new.meal_period, v_verdict->>'meal_period');
  if new.subsidy_pct is null then
    new.subsidy_pct := (select r.company_subsidy_pct from public.meal_rules r where r.id = new.meal_rule_id);
  end if;
  if new.gross_amount is not null and new.subsidy_pct is not null then
    new.subsidy_amount  := round(new.gross_amount * new.subsidy_pct / 100, 2);
    new.employee_amount := round(new.gross_amount - new.subsidy_amount, 2);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_meal_rule_before_insert on public.transactions;
create trigger trg_enforce_meal_rule_before_insert
  before insert on public.transactions
  for each row
  when (new.status in ('approved', 'override'))  -- queued/denied rows skip enforcement
  execute function public.enforce_meal_rule_before_insert();

-- =====================================================================
-- 2. Duplicate meal attempt detection — explicit check the API can call
--    BEFORE any insert (including queued offline transactions), returning
--    a human-readable verdict rather than raising:
--      select * from public.check_duplicate_meal_attempt(<person_id>, <at>);
--    Same underlying logic as evaluate_meal_rule (ponytail: the two share
--    one core query path via evaluate_meal_rule).
-- =====================================================================

create or replace function public.check_duplicate_meal_attempt(
  p_person_id uuid,
  p_at timestamptz default now()
)
returns table (
  is_duplicate boolean,
  reason       text,
  meal_rule_id uuid,
  meal_period  text,
  used         integer,
  max_meals    integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_verdict jsonb := public.evaluate_meal_rule(p_person_id, p_at);
begin
  is_duplicate := not (v_verdict->>'allowed')::boolean;
  reason       := v_verdict->>'reason';
  meal_rule_id := (v_verdict->>'meal_rule_id')::uuid;
  meal_period  := v_verdict->>'meal_period';
  used         := (v_verdict->>'used')::integer;
  max_meals    := (v_verdict->>'max')::integer;
  return next;
end;
$$;

-- =====================================================================
-- 3. Period-end close — tag all approved/override transactions up to the
--    cutoff into a closed fiscal period. Immutable afterwards.
--    Usage:
--      select * from public.close_fiscal_period('2026-07', now(), <closed_by?>);
--    Returns rows in JSON for the reconciliation summary (FR-FIN-004).
--    RLS: run as service_role / a security-definer context; ponytail:
--    the function is declared security definer so a finance role (app
--    calling through authenticated) can close without owning the table.
-- =====================================================================

create or replace function public.close_fiscal_period(
  p_period_key text,           -- e.g. '2026-07'
  p_cutoff     timestamptz,
  p_closed_by  uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_id uuid;
  v_start     date;
  v_end       date;
  v_count     integer;
  v_sum       numeric;
  v_verdict   jsonb;
  v_locked    integer;
begin
  if p_period_key !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Invalid period key: %', p_period_key using errcode = 'P0001';
  end if;

  v_start := (p_period_key || '-01')::date;
  v_end   := (v_start + interval '1 month' - interval '1 day')::date;

  select id into v_period_id
    from public.fiscal_periods
    where period_key = p_period_key;

  if v_period_id is not null then
    -- Period row exists (possibly from a previous partial run): keep it
    -- closed if it already is; otherwise it stays open and gets tagged now.
    select 1 into v_locked
      from public.fiscal_periods
     where id = v_period_id and closed_at is not null
     for update;
    if v_locked is not null then
      raise exception 'Fiscal period % is already closed', p_period_key using errcode = 'P0001';
    end if;
  end if;

  update public.transactions
     set is_closed = true, closed_period = p_period_key
   where status in ('approved', 'override')
     and occurred_at < p_cutoff
     and is_closed = false;

  get diagnostics v_count = row_count;

  select coalesce(sum(coalesce(employee_amount, 0)), 0) into v_sum
    from public.transactions
   where closed_period = p_period_key and is_closed;

  insert into public.fiscal_periods (id, period_key, start_date, end_date, closed_at, closed_by, reconciliation)
  values (gen_random_uuid(), p_period_key, v_start, v_end, now(), p_closed_by,
          jsonb_build_object('cutoff', p_cutoff, 'transactions_tagged', v_count,
                             'employee_amount_total', v_sum))
  on conflict (period_key) do update
    set closed_at = excluded.closed_at,
        closed_by  = excluded.closed_by,
        reconciliation = excluded.reconciliation;

  select jsonb_build_object(
    'period_key', p_period_key,
    'start_date', v_start,
    'end_date', v_end,
    'cutoff', p_cutoff,
    'transactions_tagged', v_count,
    'employee_amount_total', v_sum
  ) into v_verdict;

  perform public.append_audit_log(null, 'system', 'fiscal_period', p_period_key,
                                  'period_close', jsonb_build_object('transactions_tagged', v_count));

  return v_verdict;
end;
$$;

-- Immutability guard for closed-period transactions (FR-FIN-003):
-- forbid UPDATE or DELETE of any row where is_closed = true.
create or replace function public.guard_closed_transactions()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.is_closed then
    raise exception 'Transactions in closed fiscal period % are immutable (id: %)', old.closed_period, old.id
      using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' then
    return new;
  end if;
  return old;  -- DELETE
end;
$$;

drop trigger if exists trg_guard_closed_transactions on public.transactions;
create trigger trg_guard_closed_transactions
  before update or delete on public.transactions
  for each row
  execute function public.guard_closed_transactions();

-- =====================================================================
-- 4. Audit log append — single entry point for all audit writes.
--    Logs are immutable: no UPDATE/DELETE policies exist and a trigger
--    blocks any post-insert modification or deletion (PRD 10.10).
-- =====================================================================

create or replace function public.append_audit_log(
  p_actor_id    uuid default null,
  p_actor_type  text default 'user',
  p_entity_type text default null,
  p_entity_id   text default null,
  p_action      text default null,
  p_delta       jsonb default null,
  p_ip_address  inet default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.audit_logs (actor_id, actor_type, entity_type, entity_id, action, delta, ip_address)
  values (p_actor_id, p_actor_type, p_entity_type, p_entity_id, p_action, p_delta, p_ip_address)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.guard_audit_logs()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'Audit logs are immutable; update/delete is not permitted' using errcode = 'P0001';
end;
$$;

drop trigger if exists trg_guard_audit_logs on public.audit_logs;
create trigger trg_guard_audit_logs
  before update or delete on public.audit_logs
  for each row
  execute function public.guard_audit_logs();

-- Audit key lifecycle events automatically. ponytail: limited to the two
-- highest-value events (transaction override, template activation); extend
-- the trigger surface when the API layer needs more.
create or replace function public.audit_transaction_override()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status = 'override' and old.status is distinct from 'override' then
    perform public.append_audit_log(
      new.supervisor_id, 'user', 'transaction', new.transaction_ref, 'supervisor_override',
      jsonb_build_object('reason', new.override_reason, 'terminal_id', new.terminal_id, 'supervisor_id', new.supervisor_id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_transaction_override on public.transactions;
create trigger trg_audit_transaction_override
  after update on public.transactions
  for each row
  execute function public.audit_transaction_override();
