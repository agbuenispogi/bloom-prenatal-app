# Memory seed (collection: bloom-prenatal-app)

The Qdrant server loads on the next session in this folder. Store each line below with `qdrant-store`, then delete this file.

- Decision: minute-level reminders use Supabase pg_cron → pg_net → the dispatch-reminders edge function with a CRON_SECRET header, not Vercel cron (Hobby runs only once a day).
- Decision: the care day runs 04:00–03:59 Asia/Manila. Timestamps are stored as UTC timestamptz.
- Decision: the schedule engine is pure TS in src/lib/engine. `now` is a parameter. Medications are data, seeded in a migration.
- Decision: medications (what) are split from medication_rules (when). dose_logs are unique on (care_day_id, rule_id, occurrence). Reminders use a unique dedupe_key.
- Decision: Next.js 16 uses src/proxy.ts (renamed middleware). cacheComponents is off because all data is live.
- Decision: auth cookies are httpOnly and all Supabase access is server-side. "Keep me signed in" off = the bloom-remember=0 cookie strips maxAge.
- Decision: invite-only signup via the Supabase "Before User Created" hook public.hook_before_user_created (first user, or an email with a pending invite).
- Decision: the caregiver is read-only by default. Only the patient can turn on settings.caregiver_can_log (DB trigger).
- Decision: RLS is verified by npm run test:rls (plain Postgres 17 + auth stub in Docker).
- Decision: the iron spacing guardrail only warns (default 120 min vs. calcium/antacid) and never moves doses.
- Schema summary: households, profiles, household_invites, medications, work_schedule, schedule_overrides, care_days, meal_logs, dose_logs, reminders, push_subscriptions, daily_summaries. All have RLS by household_id.
- Env var names: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, RESEND_API_KEY, EMAIL_FROM, CRON_SECRET, NEXT_PUBLIC_APP_URL.
- Preference: Ag installs the Supabase/Vercel/MCP tooling; Claude gives exact commands.
- Project Hub entry: ~/.local/share/project-hub/corpus/bloom-prenatal-app/folder.md (update the status lines at each phase).
- Decision: the bedtime default is 01:00, treated as an estimate until she taps "going to bed". It ties to a snack only when the snack is after dinner.
- Decision: nextUp is the earliest open candidate (take/prep_meal/eat/bedtime) and is never all_done while Anmum is below its minimum. An unlogged lunch/dinner is "passed" once a later meal or bedtime exists.
- Decision: pre-meal dose targets use the planned meal time (no false "late"). After-meal targets use the eaten time.
- Decision: household settings gained late_grace_min, meal_lead_min and shift_prep_min (migration 0004). Overnight shifts (end < start) are not supported (DB check).
- Open questions: wife's email, Resend sending domain.
