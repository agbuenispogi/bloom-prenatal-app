# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Mobile-first installable PWA. The patient uses an **iPhone**, with Bloom added to the Home Screen (needed for Web Push on iOS 16.4+). The caregiver also uses it on desktop.

## Users

- **The patient (Ag's wife):** pregnant and taking a prenatal regimen several times a day. She works a mid-shift (Mon 7 PM–12 AM, Tue–Fri 2 PM–12 AM, weekends off), so her day runs past midnight and her meals move around. She needs one clear "what now" at any moment, a one-tap log, and reminders she can't miss. She often uses it one-handed, in the dark, or between work calls.
- **The caregiver (Ag):** gets the same reminders and emails, watches her timeline (read-only by default), and receives an escalation if a dose goes unlogged for 30 min. Uses phone and desktop.

## Product Purpose

Help her take every prenatal dose at the right moment relative to her meals and shift, and give both of them confidence that nothing was missed. Success: doses on time without nagging her into resentment, she stays signed in for weeks, and a calm 9 AM summary of yesterday.

## Positioning

Not a generic pill reminder. Bloom's schedule is **event-driven around her meals and her work shift**. Gaviscon is 30 min before whatever meal she actually eats, Caltrate is an hour after, and bedtime falls after midnight but counts toward the right day. The care day runs 04:00–03:59. It is built for exactly two people: one who takes the doses and one who cares.

## Operating Context

- Home screen loop: Next up card → she takes it → taps Done → the next item is scheduled, with push + email to both, a +15 nag and a +30 caregiver escalation.
- "I'm eating in ~30 min" logs the pre-meal Gaviscon and schedules a "time to eat" nudge. Breakfast is skippable with one tap.
- Bedtime is estimated at 01:00 until she taps "going to bed". A post-dinner snack ties to it.
- Anmum Materna: 1–2 a day at any time, with a reminder if none by 9 PM.
- Daily summary email at 9 AM Manila covering the previous care day.
- All times are in Asia/Manila.

## Capabilities and Constraints

- Regimen and timing offsets are data (editable in Settings), and changes come only from her OB.
- Iron spacing: warn only, never move a dose. Always add "confirm with your OB".
- The schedule engine already exists (`src/lib/engine`). The UI renders its `nextUp`, `timeline`, `anmum` and `warnings`.
- Auth: invite-only household of two, httpOnly cookie sessions, "Keep me signed in".
- **New:** she'll enter her due date in Settings, and Bloom shows the current pregnancy week as a gentle touch (Home, summaries).
- Not decided yet: the Resend sending domain, and her email address for the invite.

## Brand Commitments

- Name: **Bloom**.
- Voice: warm, simple **English**. Encouraging, never guilt-inducing, never clinical. A missed dose is stated plainly and kindly.
- The feel the user asked for: a beautiful, calm, tender journal, not a hospital app. It should make her smile.
- No medical advice. Bloom is a reminder and logging tool.

## Evidence on Hand

No photography, illustration or brand assets exist. Don't fabricate testimonials or clinical claims.

## Product Principles

1. **One clear action.** At any moment, the home screen answers "what do I do now?" with a single thing.
2. **Kind persistence.** Reminders are reliable and escalate, but the tone stays gentle. Logging late is always welcome.
3. **Her day, not the clock's.** Meals, shift and bedtime define the schedule, not fixed hours.
4. **Shared, not surveilled.** The caregiver sees and is alerted, but the patient owns her log and her settings.
5. **The OB decides.** Bloom warns and records. It never changes the regimen by itself.

## Accessibility & Inclusion

- WCAG AA contrast, visible focus states, screen-reader labels on every action, and 48 px+ tap targets for one-handed use.
- **Nausea / motion sensitivity:** motion must be minimal and slow. No bounce, spin, parallax or large movement. Respect `prefers-reduced-motion` fully.
- **Night use:** dark mode must be very low-glare for after-midnight doses: warm, dim, no pure white blocks.
- Haptics on Done are welcome where supported, but must not be relied on.
