# Deploying Bloom: step by step

About an hour, mostly waiting on DNS. Do the steps in order; each ends with a check. Commands run from the
project folder. **Secrets never go in chat, in the repo, or in this file.** They live in `.env.local` (git-ignored),
in Vercel's environment variables, and in Supabase Vault.

Already done for you: `.env.local` exists with a fresh `CRON_SECRET` and VAPID key pair. Check what's still
missing at any point:

```bash
npm run check:env
```

---

## Step 0 · What you need

- Accounts: **GitHub**, **Supabase**, **Vercel** (Hobby is fine).
- **Email is on hold.** Bloom sends everything to your phones instead: push alarms, the caregiver heads-up and
  the 9 AM summary, plus native alarms through a subscribed **Calendar**. Resend and a domain can be added any
  time later (Step 3); email switches on by itself once `RESEND_API_KEY` and `EMAIL_FROM` are set.
- Her email address (for the invite). You type it into Bloom, never into a file.

## Step 1 · Private GitHub repo

1. github.com → New repository → name `bloom-prenatal-app` → **Private** → create it (no README).
2. Push the code:
   ```bash
   git remote add origin git@github.com:<your-username>/bloom-prenatal-app.git
   ```
   ```bash
   git push -u origin main
   ```
✔ Check: the repo shows the commits, and there's **no** `.env.local` in it.

## Step 2 · Supabase: your existing project (shared with another app)

Bloom reuses **agbuenispogi's Project** (`uhwrolvwvuouajxgkkwv`, Tokyo `ap-northeast-1`) and keeps clear of the
other app:
- Everything Bloom creates lives in its own **`bloom` schema**. It never touches `public`.
- There's **no** project-wide auth hook, and no changes to email settings or the Site URL.
- Accounts are created by Bloom's server, already confirmed, after it checks the invite.

1. **Project Settings → API Keys** → copy into `.env.local`:
   - Project URL (`https://uhwrolvwvuouajxgkkwv.supabase.co`) → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Create a **new secret key just for Bloom** (`sb_secret_…`) → `SUPABASE_SECRET_KEY`. You can revoke it
     without affecting the other app.
2. **Database → Extensions**: make sure **pg_cron** and **pg_net** are on (turning them on doesn't change the
   other app).
3. **Install the database** (once). Build the bundle, then paste `supabase/bloom-install.sql` into
   **SQL Editor → New query → Run**:
   ```bash
   npm run db:bundle
   ```
   This avoids `supabase db push`, which would compare against the other app's migration history. The bundle
   runs in one transaction: it either fully succeeds or changes nothing.
4. **Expose the `bloom` schema**: open
   `https://supabase.com/dashboard/project/uhwrolvwvuouajxgkkwv/settings/api`. Under **Data API Settings**, in
   **Exposed schemas**, add **`bloom`** (keep the existing ones) → **Save**. If that page has no
   "Exposed schemas" box, use the left sidebar: **Integrations → Data API → Settings**.
   Without this the app gets "schema must be one of …" errors.
✔ Check: **Table Editor → schema `bloom`** lists `households`, `medications`, `dose_logs`, `reminders`…, each
with RLS enabled. The `public` tables of the other app are unchanged. **Integrations → Cron** (or
`select jobname from cron.job;`) shows `bloom-dispatch-reminders`. It will fail until Step 6, which is expected.

## Step 3 · Resend (email): on hold, skip for now

Skip this step until you want email. When you do, add the two variables in Vercel and redeploy.

1. resend.com → **Domains → Add domain** (e.g. `yourdomain.com`) → add the DNS records it shows in
   Cloudflare → DNS → wait for **Verified**.
2. **API Keys → Create** (permission: Sending access) → `RESEND_API_KEY` in `.env.local`.
3. In `.env.local` and Vercel: `EMAIL_FROM=Bloom <bloom@yourdomain.com>`. Bloom sends through Resend's API
   directly. Don't change the shared project's Supabase SMTP settings (that would change the other app's emails).

**Do this now, even with email on hold:** in `.env.local` set `VAPID_SUBJECT=mailto:<any email you read>` (your
Gmail is fine). Push services use it only as a contact address.
✔ Check: `npm run check:env` shows Resend as "off (optional)" and nothing else missing.

## Step 4 · Supabase Auth: nothing to change (skip)

Bloom leaves the shared project's auth settings alone: no hook, no "Confirm email", no SMTP, no Site URL, and
no Redirect URLs. Accounts are created and confirmed by Bloom's server, and sign-in uses a password, so nothing
here needs changing while email is on hold.

Only once email is turned on later (magic-link sign-in) add the app's address to the redirect list: open
`https://supabase.com/dashboard/project/uhwrolvwvuouajxgkkwv/auth/url-configuration` → **Redirect URLs** →
**Add URL** → `https://<your-app>.vercel.app/**`.

Good to know:
- Someone who already has an account in this project (e.g. from the other app) signs in to Bloom with that
  same password. Bloom then asks for an invite before showing anything.
- Session length is project-wide. The default (no refresh-token time limit) is what keeps her signed in for
  weeks.

## Step 5 · Vercel (deploy)

1. vercel.com → **Add New → Project → Import** `bloom-prenatal-app` from GitHub. Keep the defaults (Next.js).
2. **Before the first deploy**, open **Environment Variables** and add every line from `.env.local` for
   **Production**, except:
   - `NEXT_PUBLIC_APP_URL` → your production URL, e.g. `https://bloom-prenatal-app.vercel.app`
   - **Never** add `BLOOM_DEMO`.
3. **Deploy.** Functions run in Tokyo (`vercel.json`, `hnd1`), next to the database.
✔ Check: opening `https://<your-app>.vercel.app` redirects to **Sign in**. `/dev/home` must also redirect to
sign in (the demo is off in production).

## Step 6 · Turn on the reminder clock

Supabase → **SQL Editor** → run this with your real values. They're stored encrypted in Vault, not in a migration:

```sql
select vault.create_secret('https://<your-app>.vercel.app/api/reminders/dispatch', 'bloom_dispatch_url');
select vault.create_secret('<the CRON_SECRET from .env.local>', 'bloom_cron_secret');
```

✔ Check after a minute:

```sql
select status, return_message, start_time from cron.job_run_details order by start_time desc limit 3;
```

`succeeded` means pg_net sent the request. For the app's answer:

```sql
select status_code, content from net._http_response order by created desc limit 3;
```

You should see `200` and `{"ok":true,…}`. A `401` means the Vault secret doesn't match Vercel's `CRON_SECRET`.

## Step 7 · First run, end to end

1. Open the Vercel URL → **Create the household** → sign up with your email → confirm → choose **"The
   caregiver"** → name the household.
2. **Settings → Pregnancy**: add her due date. **Settings → Work shifts**: check the defaults.
3. Invite her and set up her iPhone. See [HANDOVER.md](HANDOVER.md).
✔ Final checks (the brief's acceptance criteria):
- [ ] On her iPhone, from the Home Screen icon, the test alarm arrives.
- [ ] Settings → Reminders → **Add to my phone's Calendar** → Subscribe. A "Bloom" calendar shows her next
      timed doses with alerts (do this on your phone too).
- [ ] She taps **Done** and the next item appears straight away. In Supabase → `reminders`, new rows exist for
      the next dose: push to both of you, a +15 nag, and a +30 heads-up push to you.
- [ ] At a dose's time, push arrives on both phones within about a minute, and the Calendar alert rings.
- [ ] A bedtime dose taken after midnight shows under the previous day in History.
- [ ] Next morning at 9:00, both phones get a "Yesterday: …" notification that opens History, which lists every
      dose and meal with times. A day without Anmum says so.
- [ ] Weeks later, she's still signed in.

## If something's off

| Symptom | Likely cause |
|---|---|
| "schema must be one of …" / 406 errors | Step 2.4: add `bloom` to Exposed schemas |
| Her sign-up says the email already has an account | She has an account in this project already. Tap **Sign in instead** and use that password |
| No Calendar alerts | Calendar subscribed? iPhone Settings → Calendar → Accounts → Fetch New Data → every 15 min; Calendar notifications allowed |
| "Bloom is invite-only" / "different email" on her sign-up | She must use the exact invited email, within 7 days. Create a new invite if needed |
| No alarms on iPhone | Not opened from the Home Screen icon, notifications not allowed (iPhone Settings → Notifications → Bloom), or a Focus mode |
| `net._http_response` shows 401 | The Vault `bloom_cron_secret` doesn't match Vercel's `CRON_SECRET` |
| Reminders rows have `last_error` | Read it: VAPID or Resend configuration is usually named there |
| (Later) Emails only reach you, not her | The Resend domain isn't verified |
