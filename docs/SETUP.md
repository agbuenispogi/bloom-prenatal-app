# Supabase setup (Ag does these once)

> The complete, ordered walkthrough (GitHub → Supabase → Resend → Vercel → cron → first run) is **[DEPLOY.md](DEPLOY.md)**. This file keeps the Supabase details.

You chose to install and sign in to tools yourself. These are the exact steps. Nothing here goes into the repo.

## 1. Create the project
1. (Bloom now reuses the existing Tokyo project; see DEPLOY.md Step 2.) For a dedicated project: supabase.com → New project.
2. Project Settings → API Keys: copy the **URL**, the **publishable key** (`sb_publishable_…`) and a **secret key** (`sb_secret_…`).
3. Put them in `.env.local` (copy `.env.example`) and later in Vercel env vars.

## 2. Apply the migrations
```bash
npx supabase login
```
```bash
npx supabase link --project-ref <your-project-ref>
```
```bash
npx supabase db push
```
Before pushing, you can run the same migrations plus RLS tests locally (needs Docker): `npm run test:rls`.

Regenerate the TypeScript types after any schema change:
```bash
npx supabase gen types typescript --linked --schema public > src/lib/supabase/database.types.ts
```

## 3. Auth settings (Dashboard → Authentication)
- **URL Configuration** → Site URL: your Vercel URL. Redirect URLs: `http://localhost:3000/**` and `https://<your-vercel-domain>/**`.
- (Removed) There's no auth hook: invite-only is enforced inside Bloom (only the first household can be created, and sign-up is checked server-side). Bloom shares a Supabase project, so it changes no project-wide auth settings. **DEPLOY.md is the current guide.**
- **Sessions**: leave refresh-token expiry off/unlimited and keep "Detect and revoke compromised refresh tokens" on. The app's proxy refreshes the session on every visit, so she stays signed in for weeks.
- **Email Templates** (so links work even if her email app opens a different browser):
  - *Confirm signup*: `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Confirm your email</a>`
  - *Magic Link*: `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Sign in to Bloom</a>`
  - The app always sends a RedirectTo of the form `…/auth/confirm?next=…`, so appending `&token_hash=…` is safe.
- Optional for later: Auth → SMTP → use Resend, so auth emails come from your domain.

## 4. First run
1. `npm run dev`, open http://localhost:3000, then **Create the household** (sign up).
2. Choose "caregiver", then go to Household & invites and enter her email to get an invite link.
3. Send her the link. She signs up with that email and joins as the patient.

**iPhone:** an installed Home Screen app has its own cookie jar, separate from Safari. She should sign in *inside the installed app* once. Onboarding (Phase 4) walks her through this.

## 5. Reminders (Phase 5)

How it works: Supabase **pg_cron** runs every minute → **pg_net** POSTs to the app's `/api/reminders/dispatch`
with `Authorization: Bearer <CRON_SECRET>` → the route re-plans today's reminders from the schedule engine and
sends whatever is due (Web Push + Resend email). Logging in the app re-plans immediately.

1. **Secrets** (Vercel → Project → Settings → Environment Variables, and `.env.local` for dev):
   - `SUPABASE_SECRET_KEY`: the server reads and writes reminder rows with it.
   - `CRON_SECRET`: a long random string. Generate one:
     ```bash
     openssl rand -base64 36
     ```
   - VAPID keys for Web Push. Generate a pair, then set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT=mailto:you@yourdomain`:
     ```bash
     npx web-push generate-vapid-keys
     ```
   - `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `Bloom <bloom@yourdomain.com>`). Verify the domain in Resend first,
     or Resend will only deliver to your own address.
   - `NEXT_PUBLIC_APP_URL`: your production URL.
2. **Enable extensions**: Dashboard → Database → Extensions → enable `pg_cron` and `pg_net` (before `db push`,
   so migration `…05_reminder_dispatch.sql` can schedule the job).
3. **Vault secrets** for the cron job (SQL editor; values never go in the repo):
   ```sql
   select vault.create_secret('https://<your-app>.vercel.app/api/reminders/dispatch', 'bloom_dispatch_url');
   select vault.create_secret('<the same CRON_SECRET>', 'bloom_cron_secret');
   ```
4. Check it runs: `select * from cron.job_run_details order by start_time desc limit 5;` and the
   `reminders` table (`sent_at`, `last_error`).

**iPhone notes:** push only reaches her once Bloom is installed to the Home Screen and alarms are turned on
(Settings → Install & alarms). iOS shows reminder notifications without the Taken/Snooze buttons. Tapping opens
Bloom, where Done is one tap. Android and desktop show the buttons.
