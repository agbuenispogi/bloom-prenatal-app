# QA report (Phase 7, 2026-10-18)

Everything here ran locally against the real UI and engine. The `/dev/*` demo routes use synthetic data in the
browser, so no Supabase project was needed. Live delivery (push, email, cron) is verified only after provisioning
(SETUP.md §5).

## Automated

| Suite | Command | Result |
|---|---|---|
| Unit (engine, reminders, summary, tokens, ics, emails, helpers) | `npm test` | 132 passed |
| Database: migrations + RLS + reminder claiming (Postgres 17 in Docker) | `npm run test:rls` | all passed |
| E2E, iPhone 15 profile (`e2e/loop.spec.ts`) | `npm run test:e2e` | 12 passed |
| Accessibility, axe WCAG 2.1 AA, 14 pages × light/dark (`e2e/a11y.spec.ts`) | `npm run test:e2e` | 28 passed, 0 violations |
| Desktop two-column layout (`e2e/desktop.spec.ts`) | `npm run test:e2e` | 1 passed |

The e2e loop covers:
- a whole care day driven through the UI (skip breakfast → "eating in ~30 min" → eat → every dose → dinner → Anmum → going to bed → bedtime dose → "All done for today")
- snooze, and skip with a reason
- the log-meal sheet at an earlier time
- Anmum
- the in-app alarm prompt
- caregiver read-only
- History and past pages, settings save, iPhone onboarding
- auth redirects
- PWA assets (manifest, icons, service worker)
- refusal of unauthenticated or forged reminder API calls

## Lighthouse 13.5 (mobile, simulated slow 4G, production QA build)

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Home (Next up) | 91 | **100** | 100 | 54* |
| History | 98 | **100** | 100 | 54* |
| Settings → Medicines | 100 | **100** | 100 | 54* |
| Onboarding | 98 | **100** | 100 | 54* |
| Login | 98 | **100** | 100 | 54* |

\* SEO is low on purpose: Bloom is a private health app, so `robots.txt` disallows everything and pages are
`noindex`. Lighthouse 12+ removed the PWA category. Installability is checked in e2e instead (manifest with
`display: standalone`, 192/512/maskable icons, apple-touch-icon, a service worker with push and notification
handlers).

QA build: `BLOOM_DEMO=1 npx next build && BLOOM_DEMO=1 npx next start -p 3200` (demo pages exist only with that
flag; never set it on Vercel). Reports are in `.impeccable/review/lighthouse/` (git-ignored).

## Mobile visual review (390×844, iPhone UA, light and dark, 32 captures)

`node scripts/capture-qa.mjs` against the QA build. Fixed during review:
- The "All done for today" entry kept its full 55% height with nothing in it; it now sizes to its content.
- Login and Welcome still had interim Phase 2 styling (sans headings, a browser-blue checkbox, an opacity-faded
  footer). They now use the serif heading, the satin checkbox and faded-ink text.
- Pages had no `<main>` landmark (Lighthouse accessibility 98 → 100).

Known and accepted:
- Home's LCP is ~3.6 s under simulated slow 4G (score 91).
- iOS shows web push without action buttons, so Taken/Snooze from the notification works on Android and desktop only.
- Not verifiable without provisioning: real push delivery to her iPhone, email delivery, pg_cron timing (~1 min),
  the "< 2 s to schedule" target against the real database, and long-lived sessions over weeks.
