-- Reminder dispatch: atomic claiming for the minute-by-minute dispatcher, and the pg_cron job that calls it.

alter table public.reminders add column claimed_at timestamptz;

-- Claims up to p_limit due, unsent, uncancelled reminders. A claim expires after 2 minutes (a crashed run
-- gets retried) and a row is tried at most 5 times. SKIP LOCKED lets overlapping runs never double-send.
create function public.claim_due_reminders(p_limit integer default 100)
returns setof public.reminders
language sql security definer set search_path = '' as $$
  update public.reminders r
     set claimed_at = now(), attempts = r.attempts + 1
   where r.id in (
     select id from public.reminders
      where sent_at is null and cancelled_at is null and due_at <= now()
        and attempts < 5
        and (claimed_at is null or claimed_at < now() - interval '2 minutes')
      order by due_at
      limit p_limit
      for update skip locked)
  returning r.*;
$$;
revoke all on function public.claim_due_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_due_reminders(integer) to service_role;

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
