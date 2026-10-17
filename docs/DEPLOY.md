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

- Accounts: **GitHub**, **Supabase**, **Vercel** (Hobby is fine), **Resend**.
- **A domain you control** (e.g. from Cloudflare or Namecheap) for sending email. Resend only delivers to
  your own address until a domain is verified, and Supabase needs it for her sign-up email too.
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

## Step 2 · Supabase project + database

1. supabase.com → **New project** → region **Southeast Asia (Singapore)** → a strong database password (keep it
   in your password manager).
2. **Project Settings → API Keys** → copy into `.env.local`:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - A **secret** key (`sb_secret_…`) → `SUPABASE_SECRET_KEY`
3. **Database → Extensions**: turn on **pg_cron** and **pg_net**.
4. Apply the migrations (log in, link to the project ref from the dashboard URL, then push):
   ```bash
   npx supabase login
   ```
   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```
   ```bash
   npx supabase db push
   ```
✔ Check: **Table Editor** lists `households`, `medications`, `dose_logs`, `reminders`, etc., each with a
green "RLS enabled" badge. **Integrations → Cron** shows `bloom-dispatch-reminders`. It will fail until
Step 6, which is expected.

## Step 3 · Resend (email)

1. resend.com → **Domains → Add domain** (e.g. `yourdomain.com`) → add the DNS records it shows at your
   registrar → wait for **Verified**.
2. **API Keys → Create** (permission: Sending access) → `RESEND_API_KEY` in `.env.local`.
3. In `.env.local`:
   - `EMAIL_FROM=Bloom <bloom@yourdomain.com>`
   - `VAPID_SUBJECT=mailto:you@yourdomain.com`
✔ Check: `npm run check:env` now only lists the Vercel URL as missing (or nothing).

## Step 4 · Supabase Auth settings

Dashboard → **Authentication**:

1. **Emails → SMTP Settings → Enable custom SMTP.** *Required*: Supabase's built-in mailer only delivers to
   your own team, so her sign-up email would never arrive.
   - Host `smtp.resend.com` · Port `465` · Username `resend` · Password: your Resend API key
   - Sender email `bloom@yourdomain.com` · Sender name `Bloom`
2. **Emails → Templates**:
   - *Confirm signup*: set the link to `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Confirm your email</a>`
   - *Magic Link*: set the link to `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Sign in to Bloom</a>`
3. **Hooks → Add hook → Before User Created → Postgres → `public.hook_before_user_created`**. This makes sign-up
   invite-only: the first person, then only invited emails.
4. **URL Configuration**: for now, Site URL `http://localhost:3000` and Redirect URL `http://localhost:3000/**`.
   You'll add the Vercel URL in Step 5.
5. **Sessions**: leave refresh tokens without a time limit. That's what keeps her signed in for weeks.
✔ Check (optional, local): `npm run dev`, open http://localhost:3000, and sign up as yourself. The
confirmation email arrives from your domain. You can also do this after deploying.

## Step 5 · Vercel (deploy)

1. vercel.com → **Add New → Project → Import** `bloom-prenatal-app` from GitHub. Keep the defaults (Next.js).
2. **Before the first deploy**, open **Environment Variables** and add every line from `.env.local` for
   **Production**, except:
   - `NEXT_PUBLIC_APP_URL` → your production URL, e.g. `https://bloom-prenatal-app.vercel.app`
   - **Never** add `BLOOM_DEMO`.
3. **Deploy.** Functions run in Singapore (`vercel.json`), next to the database.
4. Back in Supabase → **Authentication → URL Configuration**:
   - Site URL: `https://<your-app>.vercel.app`
   - Redirect URLs: add `https://<your-app>.vercel.app/**` (keep the localhost one for development)
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
- [ ] She taps **Done** and the next item appears straight away. In Supabase → `reminders`, new rows exist for
      the next dose: push + email for both of you, a +15 nag, and a +30 email to you.
- [ ] At a dose's time, push arrives on both phones and the email lands in both inboxes within about a minute.
- [ ] A bedtime dose taken after midnight shows under the previous day in History.
- [ ] Next morning at 9:00, both of you get "Yesterday's page" listing every dose and meal with times. A day
      without Anmum says so.
- [ ] Weeks later, she's still signed in.

## If something's off

| Symptom | Likely cause |
|---|---|
| Her confirmation email never arrives | Step 4.1 SMTP not set, or the Resend domain isn't verified yet |
| "Bloom is invite-only" on her sign-up | She used a different email than the invite, or the invite is older than 7 days. Create a new one |
| No alarms on iPhone | Not opened from the Home Screen icon, notifications not allowed (iPhone Settings → Notifications → Bloom), or a Focus mode |
| `net._http_response` shows 401 | The Vault `bloom_cron_secret` doesn't match Vercel's `CRON_SECRET` |
| Reminders rows have `last_error` | Read it: VAPID or Resend configuration is usually named there |
| Emails only reach you, not her | The Resend domain isn't verified |
