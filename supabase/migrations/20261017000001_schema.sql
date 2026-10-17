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
