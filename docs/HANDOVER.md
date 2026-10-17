# Bloom handover

For you (the caregiver). Read once, then keep it for when something changes.
Bloom is a reminder and logging tool. It gives no medical advice, and changes to her regimen come only from her OB.

---

## 1. Invite your wife

1. Open Bloom → **Settings → Household**.
2. Under **Invite her**, type **her** email address → **Create invite link** → **Copy link**.
3. Send the link by text or Messenger. It works **once**, for **7 days**, and only for that email address.
4. On her phone she opens the link → creates a password → confirms the email Bloom sends → chooses what Bloom
   should call her. She's now in your household as the one taking the medicines.

Do this **on her iPhone, in Safari**, then go straight on to step 2.

## 2. Install on her iPhone (needed for alarms)

iPhone only allows web-app alarms when Bloom is opened from the **Home Screen** (iOS 16.4 or newer).

1. In **Safari**, open Bloom (your Vercel URL).
2. Tap **Share** → **Add to Home Screen** → **Add**. A blush journal icon with a ribbon appears.
3. **Open Bloom from that icon** and sign in **once more there**. The Home Screen app keeps its own sign-in,
   separate from Safari. Leave **Keep me signed in** ticked.
4. Bloom's setup screen walks her through **Turn on alarms** → **Allow**, then **Send a test alarm**. Lock
   the phone to see it arrive.
5. Tap **Also add Calendar alarms (backup)** → **Subscribe**. A private "Bloom" calendar now rings a native
   alert for each upcoming timed dose, even if a notification is missed. Taken doses drop off by themselves.
   For quick updates, set iPhone **Settings → Calendar → Accounts → Fetch New Data** to every 15 minutes.
   This is also in Bloom under Settings → Reminders.
6. If she uses Focus or Sleep modes at night, add **Bloom** to the allowed apps so bedtime reminders come through.

Do the same on your own phone (steps 2–4) so you get the same alarms. Desktop Chrome works too.

## 3. What she does each day

- The big entry at the top is always **the one thing to do now**:
  - **Done**: took it. A check is inked onto the page and the next item appears.
  - **I'm eating in ~30 min**: logs her Gaviscon now and nudges her when it's time to eat.
  - **Eating now**: logs the meal. Caltrate is then scheduled for an hour later.
  - **Skip breakfast**: lunch becomes the first meal.
  - **Going to bed**: confirms bedtime (it's estimated at 1:00 AM until she taps), then the bedtime Gaviscon.
  - **Snooze** (10/20/30 min) or **Skip** (with an optional reason) when needed.
- **Anmum Materna**: tap **Had a glass**, once or twice a day. If there's none by 9 PM, Bloom reminds you both.
- **Log a meal** (next to Today): for a meal or snack logged now or earlier.
- After midnight it's still the same day's page until 4 AM, so a 12:40 AM bedtime dose counts for "yesterday".

Late is always fine. Bloom shows how late, kindly, and never nags in a scolding way.

## 4. What you get (phone notifications, email on hold)

- The same push alarm at each dose time, and a gentle repeat after 15 minutes if it isn't logged.
- A **heads-up push just to you** if a dose is still unlogged after 30 minutes, so you can check in kindly.
- **Every morning at 9:00**: a "Yesterday: …" notification on both phones that opens History, with each dose
  and meal and its time, how much was on time, Anmum, and a gentle note.
- Your own "Bloom" calendar (Settings → Reminders → Add to my phone's Calendar) for native alerts.
- For one specific dose, **Add an alarm to my calendar** under Next up adds just that one.
- When you add Resend later, the same things also arrive by email (see DEPLOY.md, Step 3).
- Her page, read-only. She can let you log for her: **her** Settings → Reminders → *Let Ag log doses for me*.

## 5. Editing medicines (when her OB changes the plan)

**Settings → Medicines**, then tap a medicine to open it.

- **Name / Dose / Colour tab**: what shows on the page.
- Each **timing** has:
  - *Shown on the page as*: the reason she sees, e.g. "after lunch".
  - *When*: before or after a meal (with minutes and which meal), at a set time, at bedtime, or any time with a
    count per day (with "remind by").
  - *Use this timing*: switch one timing off without deleting it.
- **In your regimen**: switch a whole medicine off (its history stays).
- **Add a medicine** at the bottom: name, dose, colour, and its first timing.
- **Save** takes effect from the next dose. Reminders re-plan straight away.

Iron spacing: if iron lands within 2 hours of Caltrate or Gaviscon, Bloom shows a note saying to confirm with
the OB. It never moves a dose by itself. Settings → Reminders → *Iron spacing note* (0 turns it off).

## 6. Other settings

- **Work shifts**: her weekly shifts (Mon 7 PM–12 AM, Tue–Fri 2 PM–12 AM by default) and **one-off changes**
  (a check-up day off, an extra shift). Meal suggestions follow these.
- **Pregnancy**: her due date. Bloom shows the week on each page and in the summary.
- **Reminders**: your own push/email on or off, plus the shared timings: the repeat after N minutes, your
  heads-up after N minutes, the Anmum reminder time, the morning summary time and usual bedtime.

## 7. If something goes wrong

| What | Do this |
|---|---|
| No alarms on her iPhone | Open Bloom **from the Home Screen icon**. iPhone Settings → Notifications → Bloom → Allow. Check Focus modes. Settings → Install & alarms → test again |
| She got signed out | Sign in again **inside the Home Screen app** with *Keep me signed in* ticked |
| Calendar alerts don't update | iPhone Settings → Calendar → Accounts → Fetch New Data → every 15 min. Remove and re-add the subscription from Settings → Reminders if needed |
| A dose shows at the wrong time | Check Work shifts (one-off changes) and the medicine's timing in Settings → Medicines |
| Something else | `reminders` and `daily_summaries` in Supabase show what was sent and any `last_error` |

The technical setup is in [DEPLOY.md](DEPLOY.md), and how it works is in the project's `CLAUDE.md`.
