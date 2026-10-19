-- RLS + household function tests. Any failed assertion raises and aborts with a non-zero exit (ON_ERROR_STOP).
\set ON_ERROR_STOP on
set client_min_messages = warning;

-- Users: Ag (caregiver, household A), Wife (patient, invited into A), Eve (household B), Mallory (no invite).
insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a', 'ag@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'wife@example.com'),
  ('00000000-0000-0000-0000-00000000000e', 'eve@example.com'),
  ('00000000-0000-0000-0000-00000000000f', 'mallory@example.com');

create function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end $$;

create function pg_temp.check(cond boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;
set client_min_messages = notice;

-- 2. Ag creates household A as caregiver; defaults are seeded.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select bloom.create_household('Our home', 'Ag', 'caregiver') as hh_a \gset
select set_config('bloom.hh_a', :'hh_a', false);
select pg_temp.check((select count(*) from bloom.medications) = 5, 'five default medications (ferrous sulfate and folic acid separate)');
select pg_temp.check((select count(*) from bloom.medication_rules) = 9, 'nine default rules');
select pg_temp.check((select count(*) from bloom.work_schedule) = 7, 'seven weekdays of shifts');
select pg_temp.check((select end_time from bloom.work_schedule where weekday = 1) = '24:00', 'Monday shift ends at midnight');

-- 3. Invite-only: once a household exists, nobody else can create one (they need an invite).
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
do $$ begin
  perform bloom.create_household('Another home', 'Mallory', 'patient');
  raise exception 'FAIL: a second household was created';
exception when insufficient_privilege then raise notice 'ok - only the first household can be created';
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select bloom.create_invite('Wife@Example.com', 'patient') as token \gset
reset role;

-- 4. Wrong user can't use the invite; right user can, once.
-- (psql vars aren't visible inside DO blocks; pass values through GUCs.)
select set_config('bloom.token', :'token', false);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
do $$ begin
  perform bloom.accept_invite(current_setting('bloom.token'), 'Mallory');
  raise exception 'FAIL: mallory accepted wife''s invite';
exception when insufficient_privilege then raise notice 'ok - invite bound to its email (real token)';
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.check(bloom.accept_invite(:'token', 'Love') = :'hh_a'::uuid, 'wife joins household A');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  perform bloom.accept_invite(current_setting('bloom.token'), 'Again');
  raise exception 'FAIL: invite reused';
exception when unique_violation then raise notice 'ok - cannot join twice';
end $$;

-- 5. Eve (household B, created directly as service setup) sees nothing of household A.
reset role;
insert into bloom.households (id, name) values ('00000000-0000-0000-0000-0000000000bb', 'Other home');
insert into bloom.profiles (id, household_id, role, display_name, email)
  values ('00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-0000000000bb', 'patient', 'Eve', 'eve@example.com');
select bloom.seed_household_defaults('00000000-0000-0000-0000-0000000000bb');

-- Wife logs a care day, a meal and a dose in A.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into bloom.care_days (household_id, date) values (:'hh_a', '2026-10-19') returning id as cd_a \gset
select set_config('bloom.cd_a', :'cd_a', false);
insert into bloom.meal_logs (household_id, care_day_id, type, eaten_at) values (:'hh_a', :'cd_a', 'lunch', now());
insert into bloom.dose_logs (household_id, care_day_id, rule_id, status, taken_at)
  select :'hh_a', :'cd_a', id, 'taken', now() from bloom.medication_rules where slug = 'gaviscon-before-lunch';
select pg_temp.check((select count(*) from bloom.dose_logs) = 1, 'patient sees her dose');
select pg_temp.check((select count(*) from bloom.profiles) = 2, 'patient sees both household members');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select pg_temp.check((select count(*) from bloom.households) = 1, 'eve sees only her household');
select pg_temp.check((select count(*) from bloom.medications) = 5, 'eve sees only her 5 medications');
select pg_temp.check((select count(*) from bloom.care_days) = 0, 'eve sees no care days from A');
select pg_temp.check((select count(*) from bloom.dose_logs) = 0, 'eve sees no doses from A');
select pg_temp.check((select count(*) from bloom.profiles) = 1, 'eve sees only herself');
select pg_temp.check((select count(*) from bloom.household_invites) = 0, 'eve sees no invites from A');

-- Eve can't write into A, even with A's ids.
do $$ begin
  insert into bloom.care_days (household_id, date) values (current_setting('bloom.hh_a')::uuid, '2026-10-20');
  raise exception 'FAIL: eve wrote into A';
exception when insufficient_privilege then raise notice 'ok - eve cannot insert into A';
end $$;

-- 6. Caregiver is read-only by default; can't flip the switch; patient can.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) from bloom.dose_logs) = 1, 'caregiver reads the dose');
do $$ begin
  insert into bloom.care_days (household_id, date) values (current_setting('bloom.hh_a')::uuid, '2026-10-21');
  raise exception 'FAIL: caregiver logged while read-only';
exception when insufficient_privilege then raise notice 'ok - caregiver read-only by default';
end $$;
do $$ begin
  update bloom.households set settings = jsonb_set(settings, '{caregiver_can_log}', 'true');
  raise exception 'FAIL: caregiver enabled own logging';
exception when insufficient_privilege then raise notice 'ok - caregiver cannot enable own logging';
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
update bloom.households set settings = jsonb_set(settings, '{caregiver_can_log}', 'true');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into bloom.care_days (household_id, date) values (:'hh_a', '2026-10-21');
select pg_temp.check(true, 'caregiver logs once patient allows it');

-- 7. Column guards: can't move yourself to another household or change role; can't write reminders.
do $$ begin
  update bloom.profiles set household_id = '00000000-0000-0000-0000-0000000000bb' where id = auth.uid();
  raise exception 'FAIL: changed own household';
exception when insufficient_privilege then raise notice 'ok - household_id is not updatable';
end $$;
do $$ begin
  update bloom.profiles set role = 'patient' where id = auth.uid();
  raise exception 'FAIL: changed own role';
exception when insufficient_privilege then raise notice 'ok - role is not updatable';
end $$;
update bloom.profiles set display_name = 'Ag ✿' where id = auth.uid();
select pg_temp.check((select display_name from bloom.profiles where id = auth.uid()) = 'Ag ✿', 'can edit own display name');
do $$ begin
  insert into bloom.reminders (household_id, kind, recipient_id, channel, due_at, dedupe_key)
    values (current_setting('bloom.hh_a')::uuid, 'due', auth.uid(), 'push', now(), 'x');
  raise exception 'FAIL: client wrote a reminder';
exception when insufficient_privilege then raise notice 'ok - reminders are server-only';
end $$;
-- Corrections (undo): a member who can log may delete their own household's logs; others can't touch them.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
delete from bloom.dose_logs;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) from bloom.dose_logs) = 1, 'another household cannot delete her logs');
reset role;
update bloom.households set settings = jsonb_set(settings, '{caregiver_can_log}', 'false') where id = current_setting('bloom.hh_a')::uuid;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
delete from bloom.dose_logs;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) from bloom.dose_logs) = 1, 'a read-only caregiver cannot delete her logs');
delete from bloom.meal_logs where type = 'lunch';
select pg_temp.check((select count(*) from bloom.meal_logs where type = 'lunch') = 0, 'she can undo her own meal log');

-- 8. Anonymous users see nothing.
reset role;
select set_config('request.jwt.claims', '', false);
set role anon;
do $$ begin
  perform 1 from bloom.medications;
  raise exception 'FAIL: anon read medications';
exception when insufficient_privilege then raise notice 'ok - anon has no table access';
end $$;
select pg_temp.check((select count(*) from public.other_app_posts) = 1, 'the other app''s public table is still readable by anon');

-- 9. Data integrity: a dose can't point at another household's rule.
reset role;
do $$ begin
  insert into bloom.dose_logs (household_id, care_day_id, rule_id)
    select current_setting('bloom.hh_a')::uuid, current_setting('bloom.cd_a')::uuid, id
      from bloom.medication_rules where household_id = '00000000-0000-0000-0000-0000000000bb' limit 1;
  raise exception 'FAIL: cross-household rule accepted';
exception when foreign_key_violation then raise notice 'ok - cross-household rule rejected by FK';
end $$;

-- 10. Reminder claiming is server-only and atomic.
reset role;
insert into bloom.reminders (household_id, kind, recipient_id, channel, due_at, dedupe_key)
  values (current_setting('bloom.hh_a')::uuid, 'due', '00000000-0000-0000-0000-00000000000b', 'push', now() - interval '1 minute', 'k-due'),
         (current_setting('bloom.hh_a')::uuid, 'due', '00000000-0000-0000-0000-00000000000b', 'push', now() + interval '1 hour', 'k-later');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  perform bloom.claim_due_reminders(10);
  raise exception 'FAIL: a member claimed reminders';
exception when insufficient_privilege then raise notice 'ok - members cannot claim reminders';
end $$;
reset role;
set role service_role;
select pg_temp.check((select count(*) from bloom.claim_due_reminders(10)) = 1, 'service role claims only the due row');
select pg_temp.check((select count(*) from bloom.claim_due_reminders(10)) = 0, 'a claimed row is not claimed again within 2 minutes');
reset role;

\echo 'ALL RLS TESTS PASSED'
