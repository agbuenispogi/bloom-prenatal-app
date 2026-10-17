-- Bloom install bundle (6 migrations). Run ONCE in Supabase → SQL Editor on a project
-- that has no `bloom` schema yet. It only creates objects in the `bloom` schema, plus the pg_cron job
-- 'bloom-dispatch-reminders'. It doesn't touch `public` or other apps.
begin;
-- ===== 20261017000001_schema.sql =====
-- Bloom core schema. All timestamps are timestamptz (UTC). Wall-clock values (shifts, fixed times) are `time`
-- interpreted in households.tz (Asia/Manila).
--
-- Everything lives in its own `bloom` schema so Bloom can share a Supabase project with another app without
-- touching its `public` tables, permissions or sign-ups. Expose `bloom` in Project Settings → Data API.

create schema if not exists bloom;
grant usage on schema bloom to anon, authenticated, service_role;
alter default privileges in schema bloom grant all on tables to authenticated, service_role;
alter default privileges in schema bloom grant all on functions to authenticated, service_role;
alter default privileges in schema bloom grant all on sequences to authenticated, service_role;

create type bloom.profile_role as enum ('patient', 'caregiver');
create type bloom.rule_type as enum ('before_meal', 'after_meal', 'fixed_time', 'bedtime', 'daily_count');
create type bloom.meal_anchor as enum ('breakfast', 'lunch', 'dinner', 'snack', 'bedtime');
create type bloom.spacing_class as enum ('iron', 'calcium', 'antacid');
create type bloom.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type bloom.dose_status as enum ('pending', 'taken', 'skipped', 'snoozed', 'missed');
create type bloom.reminder_kind as enum ('due', 'nag', 'escalation', 'eat_nudge', 'anmum', 'summary');
create type bloom.reminder_channel as enum ('push', 'email');

-- Households -------------------------------------------------------------------------------------------------
create table bloom.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  tz text not null default 'Asia/Manila',
  settings jsonb not null default '{
    "anmum_deadline": "21:00",
    "summary_time": "09:00",
    "iron_spacing_min": 120,
    "nag_after_min": 15,
    "escalate_after_min": 30,
    "caregiver_can_log": false,
    "care_day_starts": "04:00",
    "meal_windows": {
      "breakfast": ["07:00", "10:00"],
      "lunch": ["10:00", "12:00"],
      "dinner": ["17:00", "22:00"]
    },
    "bedtime_default": "01:00"
  }'::jsonb,
  created_at timestamptz not null default now()
);

-- One profile per auth user. A profile exists only once the user belongs to a household.
create table bloom.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references bloom.households (id) on delete cascade,
  role bloom.profile_role not null,
  display_name text not null check (char_length(display_name) between 1 and 60),
  email text not null,
  notify_push boolean not null default true,
  notify_email boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, household_id)
);
create index profiles_household_idx on bloom.profiles (household_id);
-- At most one patient per household.
create unique index profiles_one_patient_idx on bloom.profiles (household_id) where role = 'patient';

create table bloom.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references bloom.households (id) on delete cascade,
  email text not null,
  role bloom.profile_role not null,
  token_hash text not null unique,
  invited_by uuid not null references bloom.profiles (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index household_invites_email_idx on bloom.household_invites (lower(email)) where accepted_at is null;

-- Medications: what she takes. Rules: when. (Gaviscon = 1 medication, 4 rules.) ------------------------------
create table bloom.medications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references bloom.households (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 80),
  dose_label text not null default '',
  color text not null default 'oat',
  icon text not null default 'pill',
  spacing_class bloom.spacing_class,
  active boolean not null default true,
  sort smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, slug),
  unique (id, household_id)
);

create table bloom.medication_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  medication_id uuid not null,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  label text not null,                 -- shown as the "why", e.g. "before lunch"
  rule_type bloom.rule_type not null,
  anchor bloom.meal_anchor,           -- before_meal / after_meal / bedtime
  offset_min integer not null default 0 check (offset_min between -720 and 720),
  fixed_time time,                     -- fixed_time (estimated, adjustable)
  min_per_day smallint not null default 1 check (min_per_day >= 0),
  max_per_day smallint not null default 1 check (max_per_day >= 1),
  deadline time,                       -- daily_count: remind if below min by this time
  active boolean not null default true,
  sort smallint not null default 0,
  created_at timestamptz not null default now(),
  foreign key (medication_id, household_id) references bloom.medications (id, household_id) on delete cascade,
  unique (household_id, slug),
  unique (id, household_id),
  check (max_per_day >= min_per_day),
  check (
    (rule_type in ('before_meal', 'after_meal') and anchor in ('breakfast', 'lunch', 'dinner', 'snack'))
    or (rule_type = 'bedtime' and anchor = 'bedtime')
    or (rule_type = 'fixed_time' and fixed_time is not null and anchor is null)
    or (rule_type = 'daily_count' and anchor is null)
  )
);

-- Work shifts -------------------------------------------------------------------------------------------------
create table bloom.work_schedule (
  household_id uuid not null references bloom.households (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday (JS getDay)
  start_time time,                                            -- null = day off
  end_time time,                                              -- '24:00' = midnight
  primary key (household_id, weekday),
  check ((start_time is null) = (end_time is null)),
  check (start_time is null or end_time > start_time)
);

create table bloom.schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references bloom.households (id) on delete cascade,
  date date not null,
  is_off boolean not null default false,
  start_time time,
  end_time time,
  note text,
  unique (household_id, date),
  check (is_off or (start_time is not null and end_time is not null and end_time > start_time))
);

-- Care days and logs -------------------------------------------------------------------------------------------
-- `date` is the care date: 04:00 → 03:59 next day, household time.
create table bloom.care_days (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references bloom.households (id) on delete cascade,
  date date not null,
  breakfast_skipped boolean not null default false,
  bedtime_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique (household_id, date),
  unique (id, household_id)
);

create table bloom.meal_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  care_day_id uuid not null,
  type bloom.meal_type not null,
  planned_at timestamptz,             -- "I'm eating in ~30 min"
  eaten_at timestamptz,
  logged_by uuid references bloom.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (care_day_id, household_id) references bloom.care_days (id, household_id) on delete cascade,
  check (planned_at is not null or eaten_at is not null)
);
create index meal_logs_care_day_idx on bloom.meal_logs (care_day_id);
-- One breakfast/lunch/dinner per care day; snacks are unlimited.
create unique index meal_logs_one_main_meal_idx on bloom.meal_logs (care_day_id, type) where type <> 'snack';

create table bloom.dose_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  care_day_id uuid not null,
  rule_id uuid not null,
  occurrence smallint not null default 1 check (occurrence >= 1), -- Anmum #1, #2
  target_at timestamptz,
  status bloom.dose_status not null default 'pending',
  taken_at timestamptz,
  snoozed_until timestamptz,
  reason text check (reason is null or char_length(reason) <= 200),
  logged_by uuid references bloom.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  foreign key (care_day_id, household_id) references bloom.care_days (id, household_id) on delete cascade,
  foreign key (rule_id, household_id) references bloom.medication_rules (id, household_id) on delete restrict,
  unique (care_day_id, rule_id, occurrence),
  check (status <> 'taken' or taken_at is not null),
  check (status <> 'snoozed' or snoozed_until is not null)
);
create index dose_logs_care_day_idx on bloom.dose_logs (care_day_id);

-- Notifications ------------------------------------------------------------------------------------------------
create table bloom.reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references bloom.households (id) on delete cascade,
  dose_log_id uuid references bloom.dose_logs (id) on delete cascade,
  meal_log_id uuid references bloom.meal_logs (id) on delete cascade,
  kind bloom.reminder_kind not null,
  recipient_id uuid not null,
  channel bloom.reminder_channel not null,
  due_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  cancelled_at timestamptz,
  attempts smallint not null default 0,
  last_error text,
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  foreign key (recipient_id, household_id) references bloom.profiles (id, household_id) on delete cascade
);
create index reminders_due_idx on bloom.reminders (due_at) where sent_at is null and cancelled_at is null;
create index reminders_dose_idx on bloom.reminders (dose_log_id) where sent_at is null and cancelled_at is null;

create table bloom.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references bloom.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  last_success_at timestamptz,
  created_at timestamptz not null default now()
);
create index push_subscriptions_profile_idx on bloom.push_subscriptions (profile_id);

create table bloom.daily_summaries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  care_day_id uuid not null unique,
  payload jsonb not null,
  adherence_pct numeric(5, 2) check (adherence_pct between 0 and 100),
  streak integer not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (care_day_id, household_id) references bloom.care_days (id, household_id) on delete cascade
);

-- Keep dose_logs.updated_at fresh.
create function bloom.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger dose_logs_touch before update on bloom.dose_logs
  for each row execute function bloom.touch_updated_at();

-- ===== 20261017000002_rls.sql =====
-- Row-level security: every row is visible only to members of its household.
-- Helpers are SECURITY DEFINER so policies on `profiles` don't recurse into themselves.

create function bloom.auth_household_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select household_id from bloom.profiles where id = auth.uid()
$$;

create function bloom.auth_role() returns bloom.profile_role
language sql stable security definer set search_path = '' as $$
  select role from bloom.profiles where id = auth.uid()
$$;

-- The patient can always log. The caregiver can log only when the household allows it.
create function bloom.auth_can_log() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.role = 'patient' or coalesce((h.settings ->> 'caregiver_can_log')::boolean, false)
       from bloom.profiles p join bloom.households h on h.id = p.household_id
      where p.id = auth.uid()),
    false)
$$;

revoke all on function bloom.auth_household_id() from public, anon;
revoke all on function bloom.auth_role() from public, anon;
revoke all on function bloom.auth_can_log() from public, anon;
grant execute on function bloom.auth_household_id(), bloom.auth_role(), bloom.auth_can_log() to authenticated;

alter table bloom.households         enable row level security;
alter table bloom.profiles           enable row level security;
alter table bloom.household_invites  enable row level security;
alter table bloom.medications        enable row level security;
alter table bloom.medication_rules   enable row level security;
alter table bloom.work_schedule      enable row level security;
alter table bloom.schedule_overrides enable row level security;
alter table bloom.care_days          enable row level security;
alter table bloom.meal_logs          enable row level security;
alter table bloom.dose_logs          enable row level security;
alter table bloom.reminders          enable row level security;
alter table bloom.push_subscriptions enable row level security;
alter table bloom.daily_summaries    enable row level security;

-- Nothing is reachable without signing in.
revoke all on all tables in schema bloom from anon;

-- households: members read; members update settings/name. Created only via create_household().
create policy households_select on bloom.households for select to authenticated
  using (id = bloom.auth_household_id());
create policy households_update on bloom.households for update to authenticated
  using (id = bloom.auth_household_id()) with check (id = bloom.auth_household_id());
revoke insert, delete on bloom.households from authenticated;
revoke update on bloom.households from authenticated;
grant update (name, settings) on bloom.households to authenticated;

-- profiles: members see each other; each user edits only their own display/notification fields.
create policy profiles_select on bloom.profiles for select to authenticated
  using (household_id = bloom.auth_household_id());
create policy profiles_update_self on bloom.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke insert, delete, update on bloom.profiles from authenticated;
grant update (display_name, notify_push, notify_email) on bloom.profiles to authenticated;

-- invites: members can see their household's invites. Created/accepted only via functions.
create policy invites_select on bloom.household_invites for select to authenticated
  using (household_id = bloom.auth_household_id());
revoke insert, update, delete on bloom.household_invites from authenticated;

-- Regimen config: any member may read and edit (Settings). Changes come from the OB.
create policy medications_all on bloom.medications for all to authenticated
  using (household_id = bloom.auth_household_id()) with check (household_id = bloom.auth_household_id());
create policy medication_rules_all on bloom.medication_rules for all to authenticated
  using (household_id = bloom.auth_household_id()) with check (household_id = bloom.auth_household_id());
create policy work_schedule_all on bloom.work_schedule for all to authenticated
  using (household_id = bloom.auth_household_id()) with check (household_id = bloom.auth_household_id());
create policy schedule_overrides_all on bloom.schedule_overrides for all to authenticated
  using (household_id = bloom.auth_household_id()) with check (household_id = bloom.auth_household_id());

-- Logs: members read; writers are the patient (and the caregiver if allowed). No deletes: logs are history.
create policy care_days_select on bloom.care_days for select to authenticated
  using (household_id = bloom.auth_household_id());
create policy care_days_insert on bloom.care_days for insert to authenticated
  with check (household_id = bloom.auth_household_id() and bloom.auth_can_log());
create policy care_days_update on bloom.care_days for update to authenticated
  using (household_id = bloom.auth_household_id() and bloom.auth_can_log())
  with check (household_id = bloom.auth_household_id());

create policy meal_logs_select on bloom.meal_logs for select to authenticated
  using (household_id = bloom.auth_household_id());
create policy meal_logs_insert on bloom.meal_logs for insert to authenticated
  with check (household_id = bloom.auth_household_id() and bloom.auth_can_log());
create policy meal_logs_update on bloom.meal_logs for update to authenticated
  using (household_id = bloom.auth_household_id() and bloom.auth_can_log())
  with check (household_id = bloom.auth_household_id());

create policy dose_logs_select on bloom.dose_logs for select to authenticated
  using (household_id = bloom.auth_household_id());
create policy dose_logs_insert on bloom.dose_logs for insert to authenticated
  with check (household_id = bloom.auth_household_id() and bloom.auth_can_log());
create policy dose_logs_update on bloom.dose_logs for update to authenticated
  using (household_id = bloom.auth_household_id() and bloom.auth_can_log())
  with check (household_id = bloom.auth_household_id());

revoke delete on bloom.care_days, bloom.meal_logs, bloom.dose_logs from authenticated;

-- Reminders and summaries are written by the server (service role) only; members can read them.
create policy reminders_select on bloom.reminders for select to authenticated
  using (household_id = bloom.auth_household_id());
revoke insert, update, delete on bloom.reminders from authenticated;

create policy daily_summaries_select on bloom.daily_summaries for select to authenticated
  using (household_id = bloom.auth_household_id());
revoke insert, update, delete on bloom.daily_summaries from authenticated;

-- Push subscriptions: strictly per user.
create policy push_subscriptions_own on bloom.push_subscriptions for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ===== 20261017000003_household_functions.sql =====
-- Household lifecycle: create (seeds the default regimen), invite, accept.
-- Invite-only lives here, not in a project-wide auth hook (the Supabase project is shared with another app):
-- only the very first household can be created; everyone after that joins by invite.

-- Default regimen and shifts. The OB's plan as of 2026-10; everything is editable afterwards in Settings.
create function bloom.seed_household_defaults(p_household uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  m_gaviscon uuid; m_caltrate uuid; m_iron uuid; m_anmum uuid;
begin
  insert into bloom.medications (household_id, slug, name, dose_label, color, icon, spacing_class, sort) values
    (p_household, 'gaviscon', 'Gaviscon', '10 ml', 'mint', 'bottle', 'antacid', 1) returning id into m_gaviscon;
  insert into bloom.medications (household_id, slug, name, dose_label, color, icon, spacing_class, sort) values
    (p_household, 'caltrate', 'Caltrate', '1 tablet', 'sky', 'tablet', 'calcium', 2) returning id into m_caltrate;
  insert into bloom.medications (household_id, slug, name, dose_label, color, icon, spacing_class, sort) values
    (p_household, 'iron-folic', 'Ferrous sulfate + Folic acid', '1 + 1 tablet', 'clay', 'capsule', 'iron', 3) returning id into m_iron;
  insert into bloom.medications (household_id, slug, name, dose_label, color, icon, spacing_class, sort) values
    (p_household, 'anmum', 'Anmum Materna', '1 glass', 'blush', 'cup', null, 4) returning id into m_anmum;

  insert into bloom.medication_rules
    (household_id, medication_id, slug, label, rule_type, anchor, offset_min, fixed_time, min_per_day, max_per_day, deadline, sort)
  values
    (p_household, m_gaviscon, 'gaviscon-before-breakfast', 'before breakfast', 'before_meal', 'breakfast', -30, null, 1, 1, null, 1),
    (p_household, m_gaviscon, 'gaviscon-before-lunch',     'before lunch',     'before_meal', 'lunch',     -30, null, 1, 1, null, 3),
    (p_household, m_caltrate, 'caltrate-after-lunch',      'after lunch',      'after_meal',  'lunch',      60, null, 1, 1, null, 5),
    (p_household, m_iron,     'iron-folic-afternoon',      'afternoon dose',   'fixed_time',  null,          0, '17:00', 1, 1, null, 6),
    (p_household, m_gaviscon, 'gaviscon-before-dinner',    'before dinner',    'before_meal', 'dinner',    -30, null, 1, 1, null, 7),
    (p_household, m_caltrate, 'caltrate-after-dinner',     'after dinner',     'after_meal',  'dinner',     60, null, 1, 1, null, 9),
    (p_household, m_gaviscon, 'gaviscon-bedtime',          'at bedtime',       'bedtime',     'bedtime',     0, null, 1, 1, null, 10),
    (p_household, m_anmum,    'anmum-daily',               'once or twice a day', 'daily_count', null,       0, null, 1, 2, '21:00', 11);

  -- 0 = Sunday. Mon 19:00–24:00, Tue–Fri 14:00–24:00, weekends off.
  insert into bloom.work_schedule (household_id, weekday, start_time, end_time) values
    (p_household, 0, null, null),
    (p_household, 1, '19:00', '24:00'),
    (p_household, 2, '14:00', '24:00'),
    (p_household, 3, '14:00', '24:00'),
    (p_household, 4, '14:00', '24:00'),
    (p_household, 5, '14:00', '24:00'),
    (p_household, 6, null, null);
end $$;
revoke all on function bloom.seed_household_defaults(uuid) from public, anon, authenticated;

-- First user: create the household, become its first member, seed defaults.
create function bloom.create_household(p_name text, p_display_name text, p_role bloom.profile_role)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_household uuid;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if exists (select 1 from bloom.profiles where id = v_uid) then
    raise exception 'already in a household' using errcode = '23505';
  end if;
  if exists (select 1 from bloom.households) then
    raise exception 'Bloom is invite-only. Ask for an invite link.' using errcode = '42501';
  end if;
  select email into v_email from auth.users where id = v_uid;

  insert into bloom.households (name) values (p_name) returning id into v_household;
  insert into bloom.profiles (id, household_id, role, display_name, email)
    values (v_uid, v_household, p_role, p_display_name, coalesce(v_email, ''));
  perform bloom.seed_household_defaults(v_household);
  return v_household;
end $$;
revoke all on function bloom.create_household(text, text, bloom.profile_role) from public, anon;
grant execute on function bloom.create_household(text, text, bloom.profile_role) to authenticated;

-- Returns the raw invite token once. Only its sha256 is stored.
create function bloom.create_invite(p_email text, p_role bloom.profile_role) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_household uuid := bloom.auth_household_id();
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if v_household is null then raise exception 'not in a household' using errcode = '42501'; end if;
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if p_role = 'patient' and exists (select 1 from bloom.profiles where household_id = v_household and role = 'patient') then
    raise exception 'household already has a patient' using errcode = '23505';
  end if;
  -- One live invite per email: replace older pending ones.
  delete from bloom.household_invites
   where household_id = v_household and lower(email) = lower(p_email) and accepted_at is null;
  insert into bloom.household_invites (household_id, email, role, token_hash, invited_by)
    values (v_household, lower(p_email), p_role, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), v_uid);
  return v_token;
end $$;
revoke all on function bloom.create_invite(text, bloom.profile_role) from public, anon;
grant execute on function bloom.create_invite(text, bloom.profile_role) to authenticated;

create function bloom.accept_invite(p_token text, p_display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_invite bloom.household_invites;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if exists (select 1 from bloom.profiles where id = v_uid) then
    raise exception 'already in a household' using errcode = '23505';
  end if;
  select email into v_email from auth.users where id = v_uid;

  select * into v_invite from bloom.household_invites
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
   for update;
  if not found or v_invite.accepted_at is not null or v_invite.expires_at < now() then
    raise exception 'invite is invalid or expired' using errcode = '22023';
  end if;
  if lower(v_invite.email) <> lower(coalesce(v_email, '')) then
    raise exception 'invite was sent to a different email' using errcode = '42501';
  end if;

  insert into bloom.profiles (id, household_id, role, display_name, email)
    values (v_uid, v_invite.household_id, v_invite.role, p_display_name, v_email);
  update bloom.household_invites set accepted_at = now(), accepted_by = v_uid where id = v_invite.id;
  return v_invite.household_id;
end $$;
revoke all on function bloom.accept_invite(text, text) from public, anon;
grant execute on function bloom.accept_invite(text, text) to authenticated;

-- Only the patient (or nobody, via SQL) may let the caregiver log doses.
create function bloom.guard_household_settings() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (old.settings -> 'caregiver_can_log') is distinct from (new.settings -> 'caregiver_can_log')
     and auth.uid() is not null
     and bloom.auth_role() is distinct from 'patient' then
    raise exception 'only the patient can change caregiver logging' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger households_guard_settings before update on bloom.households
  for each row execute function bloom.guard_household_settings();

-- ===== 20261017000004_settings_keys.sql =====
-- Engine settings that were hardcoded at first: lead time for "eating in ~N min" without a pre-meal rule,
-- and how long before a shift to suggest finishing a meal.
alter table bloom.households alter column settings set default (
  '{
    "anmum_deadline": "21:00",
    "summary_time": "09:00",
    "iron_spacing_min": 120,
    "nag_after_min": 15,
    "escalate_after_min": 30,
    "caregiver_can_log": false,
    "care_day_starts": "04:00",
    "meal_windows": {
      "breakfast": ["07:00", "10:00"],
      "lunch": ["10:00", "12:00"],
      "dinner": ["17:00", "22:00"]
    },
    "bedtime_default": "01:00",
    "late_grace_min": 15,
    "meal_lead_min": 30,
    "shift_prep_min": 30
  }'::jsonb
);

update bloom.households
   set settings = '{"late_grace_min": 15, "meal_lead_min": 30, "shift_prep_min": 30}'::jsonb || settings;

-- ===== 20261018000005_reminder_dispatch.sql =====
-- Reminder dispatch: atomic claiming for the minute-by-minute dispatcher, and the pg_cron job that calls it.

alter table bloom.reminders add column claimed_at timestamptz;

-- Claims up to p_limit due, unsent, uncancelled reminders. A claim expires after 2 minutes (a crashed run
-- gets retried) and a row is tried at most 5 times. SKIP LOCKED lets overlapping runs never double-send.
create function bloom.claim_due_reminders(p_limit integer default 100)
returns setof bloom.reminders
language sql security definer set search_path = '' as $$
  update bloom.reminders r
     set claimed_at = now(), attempts = r.attempts + 1
   where r.id in (
     select id from bloom.reminders
      where sent_at is null and cancelled_at is null and due_at <= now()
        and attempts < 5
        and (claimed_at is null or claimed_at < now() - interval '2 minutes')
      order by due_at
      limit p_limit
      for update skip locked)
  returning r.*;
$$;
revoke all on function bloom.claim_due_reminders(integer) from public, anon, authenticated;
grant execute on function bloom.claim_due_reminders(integer) to service_role;

-- pg_cron → pg_net → the app's dispatch route, every minute. URL and secret come from Supabase Vault:
--   select vault.create_secret('https://<your-app>/api/reminders/dispatch', 'bloom_dispatch_url');
--   select vault.create_secret('<CRON_SECRET>', 'bloom_cron_secret');
-- Skipped where the extensions don't exist (the local RLS test database).
do $do$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_cron;
    create extension if not exists pg_net;
    perform cron.schedule(
      'bloom-dispatch-reminders',
      '* * * * *',
      $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'bloom_dispatch_url'),
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'bloom_cron_secret')
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 25000
        );
      $job$
    );
  else
    raise notice 'pg_cron / pg_net not available: dispatch schedule not created.';
  end if;
end
$do$;

-- ===== 20261018000006_daily_summary_send.sql =====
-- Daily summary sending: claim + retry bookkeeping (the dispatcher sends one summary per household per day).
alter table bloom.daily_summaries
  add column claimed_at timestamptz,
  add column attempts smallint not null default 0,
  add column last_error text;

commit;
