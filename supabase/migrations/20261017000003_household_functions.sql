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
