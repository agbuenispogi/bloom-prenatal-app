-- Row-level security: every row is visible only to members of its household.
-- Helpers are SECURITY DEFINER so policies on `profiles` don't recurse into themselves.

create function public.auth_household_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select household_id from public.profiles where id = auth.uid()
$$;

create function public.auth_role() returns public.profile_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

-- The patient can always log. The caregiver can log only when the household allows it.
create function public.auth_can_log() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.role = 'patient' or coalesce((h.settings ->> 'caregiver_can_log')::boolean, false)
       from public.profiles p join public.households h on h.id = p.household_id
      where p.id = auth.uid()),
    false)
$$;

revoke all on function public.auth_household_id() from public, anon;
revoke all on function public.auth_role() from public, anon;
revoke all on function public.auth_can_log() from public, anon;
grant execute on function public.auth_household_id(), public.auth_role(), public.auth_can_log() to authenticated;

alter table public.households         enable row level security;
alter table public.profiles           enable row level security;
alter table public.household_invites  enable row level security;
alter table public.medications        enable row level security;
alter table public.medication_rules   enable row level security;
alter table public.work_schedule      enable row level security;
alter table public.schedule_overrides enable row level security;
alter table public.care_days          enable row level security;
alter table public.meal_logs          enable row level security;
alter table public.dose_logs          enable row level security;
alter table public.reminders          enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.daily_summaries    enable row level security;

-- Nothing is reachable without signing in.
revoke all on all tables in schema public from anon;

-- households: members read; members update settings/name. Created only via create_household().
create policy households_select on public.households for select to authenticated
  using (id = public.auth_household_id());
create policy households_update on public.households for update to authenticated
  using (id = public.auth_household_id()) with check (id = public.auth_household_id());
revoke insert, delete on public.households from authenticated;
revoke update on public.households from authenticated;
grant update (name, settings) on public.households to authenticated;

-- profiles: members see each other; each user edits only their own display/notification fields.
create policy profiles_select on public.profiles for select to authenticated
  using (household_id = public.auth_household_id());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke insert, delete, update on public.profiles from authenticated;
grant update (display_name, notify_push, notify_email) on public.profiles to authenticated;

-- invites: members can see their household's invites. Created/accepted only via functions.
create policy invites_select on public.household_invites for select to authenticated
  using (household_id = public.auth_household_id());
revoke insert, update, delete on public.household_invites from authenticated;

-- Regimen config: any member may read and edit (Settings). Changes come from the OB.
create policy medications_all on public.medications for all to authenticated
  using (household_id = public.auth_household_id()) with check (household_id = public.auth_household_id());
create policy medication_rules_all on public.medication_rules for all to authenticated
  using (household_id = public.auth_household_id()) with check (household_id = public.auth_household_id());
create policy work_schedule_all on public.work_schedule for all to authenticated
  using (household_id = public.auth_household_id()) with check (household_id = public.auth_household_id());
create policy schedule_overrides_all on public.schedule_overrides for all to authenticated
  using (household_id = public.auth_household_id()) with check (household_id = public.auth_household_id());

-- Logs: members read; writers are the patient (and the caregiver if allowed). No deletes: logs are history.
create policy care_days_select on public.care_days for select to authenticated
  using (household_id = public.auth_household_id());
create policy care_days_insert on public.care_days for insert to authenticated
  with check (household_id = public.auth_household_id() and public.auth_can_log());
create policy care_days_update on public.care_days for update to authenticated
  using (household_id = public.auth_household_id() and public.auth_can_log())
  with check (household_id = public.auth_household_id());

create policy meal_logs_select on public.meal_logs for select to authenticated
  using (household_id = public.auth_household_id());
create policy meal_logs_insert on public.meal_logs for insert to authenticated
  with check (household_id = public.auth_household_id() and public.auth_can_log());
create policy meal_logs_update on public.meal_logs for update to authenticated
  using (household_id = public.auth_household_id() and public.auth_can_log())
  with check (household_id = public.auth_household_id());

create policy dose_logs_select on public.dose_logs for select to authenticated
  using (household_id = public.auth_household_id());
create policy dose_logs_insert on public.dose_logs for insert to authenticated
  with check (household_id = public.auth_household_id() and public.auth_can_log());
create policy dose_logs_update on public.dose_logs for update to authenticated
  using (household_id = public.auth_household_id() and public.auth_can_log())
  with check (household_id = public.auth_household_id());

revoke delete on public.care_days, public.meal_logs, public.dose_logs from authenticated;

-- Reminders and summaries are written by the server (service role) only; members can read them.
create policy reminders_select on public.reminders for select to authenticated
  using (household_id = public.auth_household_id());
revoke insert, update, delete on public.reminders from authenticated;

create policy daily_summaries_select on public.daily_summaries for select to authenticated
  using (household_id = public.auth_household_id());
revoke insert, update, delete on public.daily_summaries from authenticated;

-- Push subscriptions: strictly per user.
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
