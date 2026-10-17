# Supabase setup (Ag does these once)

You chose to install and sign in to tools yourself. These are the exact steps. Nothing here goes into the repo.

## 1. Create the project
1. supabase.com → New project. Region: **Southeast Asia (Singapore)**.
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
- **Hooks** → *Before User Created* → Postgres → `public.hook_before_user_created`. This makes signup invite-only: only the very first user, or an email with a pending invite, can sign up.
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
