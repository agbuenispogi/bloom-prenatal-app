# Bloom — Prenatal Medication Companion

Mobile-first PWA that helps the patient (Ag's wife) take her prenatal medications on time. It logs every dose and meal,
sends push + email reminders for the next dose to **both** the patient and the caregiver (Ag), and emails a daily
summary at 9:00 AM Manila.

> Bloom is a reminder and logging tool. It gives no medical advice. Regimen changes come only from her OB.

## Stack
- Next.js (latest stable, App Router, TypeScript `strict`) on **Vercel**
- **Supabase**: Postgres, Auth, Edge Functions, `pg_cron` + `pg_net`
- Sessions: `@supabase/ssr`, **httpOnly** cookies (all Supabase calls are server-side), `src/proxy.ts` (Next 16's renamed middleware) refreshes tokens via `getClaims()`, "Keep me signed in" = `bloom-remember` cookie (`0` → session cookies)
- Email: Resend + React Email. Push: Web Push (VAPID) + service worker, installable PWA
- Styling: Tailwind + hand-built components (no stock shadcn look)
- Time: `date-fns-tz`. All logic in **Asia/Manila**. Store `timestamptz` in UTC and render in Manila time
- Tests: Vitest (schedule engine), Playwright (core flows)

## Conventions
- Next.js 16: read `node_modules/next/dist/docs/` before using an API (see `AGENTS.md`). `cacheComponents` is **off** on purpose: all data is live and per-household.
- Supabase keys: publishable (`sb_publishable_…`) + secret (`sb_secret_…`), not the legacy anon/service_role names.
- DB access: `createClient()` from `src/lib/supabase/server.ts` (RLS as the user). `createAdminClient()` only after authorizing the caller. Household membership changes only via the `create_household` / `create_invite` / `accept_invite` RPCs.
- After a schema change: new migration in `supabase/migrations/`, extend `supabase/tests/rls_test.sql`, run `npm run test:rls`, regenerate `database.types.ts`.
- `src/lib/engine/` is the schedule engine. It is **pure**: no I/O, no `Date.now()` inside, and `now` is always a parameter. It must be 100% unit-tested.
- Medications and timing offsets are **data** (the `medications` table), never hardcoded. The defaults are seeded in a migration.
- Every table has RLS scoped to `household_id`. Service-role keys are used only in edge functions and server actions, never in the client.
- Minute-level reminders: `pg_cron` (every minute) → `pg_net` → the `dispatch-reminders` edge function, protected by the `CRON_SECRET` header. Vercel cron is not used (Hobby runs only once a day).
- Reminder sends are idempotent via `reminders.dedupe_key` (unique) + `sent_at`.
- Check current APIs in the docs (Next.js, Supabase SSR, web-push). Don't rely on memory.
- Never commit `.env*` (except `.env.example`), `.claude/memory/`, `.claude/mcp/.venv/`, `.claude/mcp/models/` or `.claude/settings.local.json`.

## Regimen rules (core logic)
**Care day** = 04:00 → 03:59 next day (Manila). A dose taken after midnight counts toward the previous care day.

**Default shifts** (editable, with per-date overrides): Mon 19:00–24:00, Tue–Fri 14:00–24:00, Sat–Sun off.

| # | Item | Rule |
|---|---|---|
| 1 | Gaviscon | 30 min before the **first meal** |
| 2 | Breakfast | Optional, one-tap skip. If skipped, lunch is the first meal |
| 3 | Gaviscon | 30 min before lunch |
| 4 | Lunch | ~10:00–12:00 (on waking) |
| 5 | Caltrate | Lunch + 60 min |
| 6 | Ferrous sulfate + Folic acid | ~17:00 (estimated, adjustable) |
| 7 | Gaviscon | 30 min before dinner |
| 8 | Dinner | ~17:00–22:00. Workday suggestions avoid the shift start |
| 9 | Caltrate | Dinner + 60 min |
| 10 | Gaviscon (bedtime) | Always at bedtime. Tied to the snack if a snack is logged |
| — | Anmum Materna | 1–2×/day at any time. Reminder if 0 by 21:00 (configurable). Flagged in the summary |

- Pre-meal Gaviscon is **intent-triggered**: "I'm eating in ~30 min" logs Gaviscon and schedules a "time to eat" nudge. Logging a meal schedules Caltrate for +60.
- "Next up" always resolves to exactly **one** action.
- Iron spacing guardrail: **warn only** if iron is within 2 h (configurable) of Caltrate or Gaviscon, with "confirm with your OB". Never auto-move a dose.
- A dose can be Taken, Skipped (optional reason) or Snoozed (10/20/30). Late doses show actual vs. target.
- Reminders per due item: push + email to both at due time → gentle nag at +15 if not logged → escalation email to caregiver only at +30. Logging cancels pending nags.

## Schedule engine (`src/lib/engine`)
- Entry point: `buildDaySchedule(input)` → `{ careDate, timeline, nextUp, anmum, warnings }`. Also `planMealIntent` ("eating in ~N min"), `resolveShift`, `careDateOf`, `describeNextUp` (card/push/email copy), `planDoseReminders` / `planEatNudge` / `planAnmumReminder`.
- `nextUp` is exactly one of `take | prep_meal | eat | bedtime | all_done`: the earliest open candidate wins. It is never `all_done` while an Anmum minimum is unmet.
- Unlogged lunch/dinner is "passed" (missed) once she moves on (a later meal or bedtime tap), so it never blocks the day.
- Bedtime: default 01:00 is an *estimate* until she taps "going to bed". It ties to a snack only if the snack is after dinner.
- Pre-meal doses target the planned meal time; after-meal doses target the eaten time.
- Tests: `src/lib/engine/__tests__/` (scenarios, edge cases, reviewer regressions). Coverage ~99%.

## Design (Impeccable)
- Product truth: `PRODUCT.md`. Visual system: `DESIGN.md` + `.impeccable/design.json` (the Keepsake Pregnancy Journal: oat paper, blush book-cloth Next up entry, one satin ribbon accent, inked checks, warm plum-brown night pages).
- Home's direction contract: `.impeccable/surfaces/src-app-page-tsx.md`. Roll record: `.impeccable/decision/roll.md`.
- Dev-only preview with synthetic data (no Supabase): `/dev/home?s=morning|caltrate|overdue|afternoon|night|anmum|done[&role=caregiver]`. Review captures: `node scripts/capture-review.mjs` (dev server running).
- Cloth textures are procedural: `python3 scripts/gen-textures.py`, then re-embed provenance.

## Run / test / deploy
```bash
npm install
npm run dev            # http://localhost:3000
npm test               # Vitest (engine + helpers)
npm run test:rls       # migrations + RLS tests on throwaway Postgres (Docker)
npm run test:e2e       # Playwright
npx supabase db push   # apply migrations (setup steps: docs/SETUP.md)
npx supabase functions deploy dispatch-reminders
npx vercel --prod
```
Env variable names are listed in `.env.example`. Real values live in Vercel and Supabase secrets only.

## Agents
- `.claude/agents/schedule-engine-reviewer.md`: reviews engine changes against the regimen rules above
- `.claude/agents/ui-critic.md`: reviews screens against the design direction in `docs/PLAN.md` §7
- Build-crew workflow: `docs/ai-agent-team.md`

## Project memory (isolated)

This project has its own memory store, separate from every other project: the MCP server in `.mcp.json`
(`.claude/mcp/qdrant-memory.sh`), Qdrant in embedded mode with data in `.claude/memory/qdrant`
(git-ignored, collection "bloom-prenatal-app").

- Search it with `qdrant-find` at the start of every session, before working.
- Save confirmed, durable decisions with `qdrant-store` (one fact per entry). Never store secrets or personal health data.
- Do not rely on memories from other projects for facts about this one.
- Facts waiting to be stored on the first session with the server loaded: `docs/memory-seed.md`.
