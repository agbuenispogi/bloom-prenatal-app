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
