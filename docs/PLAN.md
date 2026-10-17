# Bloom: plan, schema and screens (Phase 1 checkpoint)

Status: plan approved 2026-10-17. Phase 2 done; see `docs/SETUP.md` for provisioning. The regimen rules live in `CLAUDE.md`.

## 1. Architecture

```
Phone (PWA, service worker) ──► Next.js on Vercel ──► Supabase Postgres (RLS)
   ▲  push (VAPID)                 server actions:          │
   │                               logDose / logMeal /      │ pg_cron, every minute
   │                               intendMeal / snooze      ▼
   └──────────── web push ◄── dispatch-reminders (Edge Function, CRON_SECRET)
                 email ◄────── Resend ◄─┘        pg_cron 09:00 Manila → daily-summary
```

- **Engine (`src/lib/engine`)**: pure TS. Input: medication config, shift for the date, the care day's meal/dose logs and `now`. Output: `timeline[]`, `nextUp`, `warnings[]` and the `reminderPlan[]` for the next due item.
- **Write path (target < 2 s):** a server action writes the log → runs the engine → in one transaction, cancels stale reminders for that slot and upserts the new reminder rows (`dedupe_key`) → returns the new `nextUp`. Nothing is sent from the request itself.
- **Send path:** `pg_cron` every minute → `pg_net.http_post` → `dispatch-reminders`. It claims due rows with `FOR UPDATE SKIP LOCKED`, sends them, then sets `sent_at` (or bumps `attempts` and `last_error`). Typical delay is ≤ 60 s.
- **Push actions:** the notification has "Taken" and "Snooze 10m" buttons. The service worker POSTs to `/api/notify-action` with a short-lived signed token in the payload, so it works without an open tab.
- **Sessions:** `@supabase/ssr` cookies. Middleware refreshes them. "Keep me signed in" means a long refresh-token lifetime (set in Supabase Auth settings) and persistent cookies; unchecked means session cookies.

## 2. Data model (refined)

All tables have `household_id` + RLS policies of the form `household_id = auth_household_id()` (a `security definer` helper that reads `profiles`). Caregiver write access is limited by a role check in the policies (read-only by default, with a toggle).

| Table | Key columns | Notes |
|---|---|---|
| `households` | id, name, tz (`Asia/Manila`), settings jsonb | settings: `anmum_deadline` 21:00, `summary_time` 09:00, `iron_spacing_min` 120, `nag_after_min` 15, `escalate_after_min` 30, `caregiver_can_log` false |
| `profiles` | id (= auth.users), household_id, role `patient\|caregiver`, display_name, email, notify_push, notify_email | |
| `household_invites` | id, household_id, email, role, token_hash, expires_at, accepted_at | Invite-only signup |
| `medications` | id, household_id, slug, name, dose_label, color, icon, spacing_class `iron\|calcium\|antacid\|null`, active, sort | What she takes (4 seeded) |
| `medication_rules` | id, medication_id, slug, label ("before lunch"), **rule_type** `before_meal\|after_meal\|fixed_time\|bedtime\|daily_count`, **anchor** `breakfast\|lunch\|dinner\|snack\|bedtime`, offset_min, fixed_time, min/max_per_day, deadline, active, sort | When she takes it (8 seeded; Gaviscon has 4). Skipping breakfast just drops its slot |
| `work_schedule` | household_id, weekday 0–6, start_time, end_time (null = off) | unique(household_id, weekday) |
| `schedule_overrides` | household_id, date, start_time, end_time, is_off, note | unique(household_id, date) |
| `care_days` | id, household_id, date, breakfast_skipped, bedtime_at, notes | `date` = the 04:00-based care date. unique(household_id, date) |
| `meal_logs` | id, care_day_id, type `breakfast\|lunch\|dinner\|snack`, planned_at, eaten_at, logged_by | `planned_at` comes from "eating in ~30 min" |
| `dose_logs` | id, care_day_id, **rule_id**, **occurrence** (Anmum #1/#2), target_at, status `pending\|taken\|skipped\|snoozed\|missed`, taken_at, snoozed_until, reason, logged_by | unique(care_day_id, rule_id, occurrence) |
| `reminders` | id, dose_log_id?, meal_log_id?, kind `due\|nag\|escalation\|eat_nudge\|anmum\|summary`, recipient_id, channel `push\|email`, due_at, sent_at, cancelled_at, attempts, last_error, **dedupe_key unique** | partial index `(due_at) where sent_at is null and cancelled_at is null` |
| `push_subscriptions` | id, profile_id, endpoint unique, p256dh, auth, user_agent, last_success_at | Pruned on a 404/410 from the push service |
| `daily_summaries` | id, household_id, care_day_id, payload jsonb, adherence_pct, streak, sent_at | unique(care_day_id) |

Changes from the brief's starting point: `household_invites`, `medication_rules` split from `medications` with `rule_id + occurrence` on dose logs (so "Gaviscon before lunch" and "Gaviscon at bedtime" stay distinct and idempotent), `spacing_class` (makes the iron guardrail data-driven), `kind` and `attempts` on reminders, and `bedtime_at` on care days.

## 3. Screens

1. **Login**: email + password or magic link, "Keep me signed in".
2. **Accept invite / create household**: the first user creates the household; the second joins by invite link.
3. **Onboarding**: role, add to Home Screen (iOS-specific guide), enable notifications, test alarm.
4. **Home / Next up**: dominant card with countdown, reason and Done; "I'm eating in ~30 min"; skip breakfast; Today timeline below.
5. **Log meal sheet**: bottom sheet with meal type, now or a picked time, "eating in…" presets.
6. **Dose actions**: Taken / Skip (reason) / Snooze 10·20·30, late badge (actual vs. target).
7. **In-app alarm**: full-screen prompt + chime when a reminder comes due with the app open.
8. **History**: list of care days → daily summary (timeline, adherence ring, streak, Anmum flag, gentle note).
9. **Caregiver view**: same data, read-only by default, two-column layout on desktop.
10. **Settings**: medications (edit offsets, anchors, colors), shifts + date overrides, notification times and thresholds, recipients and channels, household members/invite.

## 4. Phases

| # | Phase | Checkpoint output |
|---|---|---|
| 1 | Setup: `.claude/` isolation, memory, Project Hub, repo, env names | ✅ |
| 2 | Schema + RLS + auth + seed migration | ✅ migrations, `npm run test:rls` green; live login waits on the Supabase project |
| 3 | Schedule engine + Vitest | ✅ 96 tests, ~99% engine coverage, reviewer pass after 2 fix rounds |
| 4 | UI: Home, Done flow, timeline (Impeccable teach → critique/audit per screen) | ✅ Home / Next up / Done / Today shipped (finish review: ship after 1 rebuild + 1 fix round), DESIGN.md written. Remaining screens: onboarding, log-meal sheet, history, settings |
| 5 | Reminders: pg_cron → edge fn, push, Resend, nag/escalation, .ics | end-to-end alarm on a real phone |
| 6 | Daily summary email + History | 9 AM email received |
| 7 | QA: Playwright e2e, Lighthouse ≥ 95, `/polish` | report |
| 8 | Deploy + handover | prod URL, Hub + memory updated, handover note |

## 5. Things Ag needs to provide (you chose to install tools yourself)

- **Supabase project** (free tier is fine, `pg_cron` + `pg_net` enabled) → project ref, URL, anon key, service-role key.
- **Vercel project** linked to the repo, plus a **GitHub repo** (`gh` isn't installed here).
- **Resend** account + **verified sending domain**. Without one, Resend only delivers to the account owner's address, so your wife wouldn't get emails.
- Optional MCPs for later phases: Context7 (docs), Playwright MCP (screenshots), Supabase MCP, Vercel MCP.

## 6. Open questions

1. Your wife's email address (for the invite, entered by you in Settings, not stored in the repo).
2. Sending domain for Resend?
3. ~~Caregiver logging~~ Built as read-only by default; only the patient can switch on `caregiver_can_log`.
4. ~~Bedtime~~ Default 01:00 as an estimate; she taps "going to bed" to confirm.
