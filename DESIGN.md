---
name: Bloom
description: The Baby Snowflake family's medicine companion. A soft cream page with pink and lilac washes that tells her the one thing to do now, and lets her log anything in any order.
colors:
  paper: "#fffbfd"
  paper-sunk: "#fff3f8"
  card: "#ffffff"
  rule: "#f1dce7"
  ink: "#5b4664"
  ink-soft: "#6a5673"
  cloth-rule: "#ffd6e6"
  ribbon: "#a8457a"
  fill-a: "#ffb3d0"
  fill-b: "#cdb9f2"
  ribbon-fill-ink: "#4a3553"
  wash-a: "#ffd6e6"
  wash-b: "#e4dafa"
  lemon: "#fff0cf"
  mint: "#cdf0df"
  mint-ink: "#2b6e55"
  tab-mint: "#8fd9b9"
  tab-sky: "#9fd3f2"
  tab-clay: "#f2b49a"
  tab-blush: "#f7a8c8"
  tab-oat: "#ecd9a0"
  night-paper: "#241c29"
  night-card: "#31263a"
  night-rule: "#463852"
  night-ink: "#f6e9f2"
  night-ink-soft: "#c7b4cf"
  night-ribbon: "#ffb3d0"
  night-fill-a: "#e79bbe"
  night-fill-b: "#b7a2e6"
  night-ribbon-fill-ink: "#2a1a28"
typography:
  display: "Fredoka 600 (next/font, --font-display; the .font-serif class)"
  ui: "Nunito (next/font, --font-ui)"
radius:
  card: 26px
  row: 18px
  sheet: 28px
  input: 16px
  button: 9999px
shadow: "0 6px 26px rgb(180 140 175 / 0.16); night: 0 6px 26px rgb(0 0 0 / 0.35)"
---

# Bloom design: the Baby Snowflake family

Bloom now belongs visually to [Baby Snowflake](https://baby-snowflake.vercel.app/), the family's pregnancy site:
the same cream page, pink/lilac/lemon/mint pastels, Fredoka headings and soft round white cards. Approved by the
user on 2026-10-19 (direction A of `design-preview/revamp.html`). It replaces the earlier keepsake-journal look
(book-cloth card, satin ribbon, Young Serif); none of that remains.

## Atmosphere
- Gentle and friendly, never clinical. Pastels carry warmth; dark plum ink carries all text.
- Two soft radial washes (pink top-right, lilac left) sit on the body, like the family site.
- Night (device dark mode) is deep plum, not black or white: calm at 1 AM, buttons slightly dimmer pastels.

## Colour rules
- Text is always plum (`ink`, `ink-soft`) on cream/white, or cream on plum. Never white text on pastel.
- The primary action is the pink-to-lilac pill (`bg-ribbon-fill` adds the `fill-a → fill-b` gradient) with
  `ribbon-fill-ink` text. One primary per view.
- `ribbon` is the accent for small text, "due" marks and focus rings (5.4:1 on paper).
- Medicines keep a pastel swatch (`tab-*`), shown as a small rounded pill beside the name.
- Done = mint dot with a check (`mint` / `mint-ink`); state is also carried by shape (dashed = upcoming,
  ringed = due, struck = skipped, hollow = missed, dotted = snoozed), never colour alone.
- Week badge uses `lemon`.

## Type
- Fredoka 600 for headings, the big Next-up time, primary buttons, nav labels and pills (`font-serif` maps here).
- Nunito for body and UI. Times use `tnum`.

## Components
- **Next up card**: `cloth` utility (white card + soft shadow), 26px radius, a 6px `wash` band on the top edge,
  "NEXT UP" eyebrow, medicine name in Fredoka, very large time, pastel pill Done, outlined pill Snooze/Skip.
- **Today**: heading + "3 of 10 done" + a gradient progress bar; each item is a white rounded row card (time,
  state mark, swatch, name). Rows are buttons that open the item sheet. "Now" is a pastel pill with a fading line.
- **Sheets** (item sheet, log a meal): bottom sheets, 28px top radius, plum-tinted backdrop, pill primary,
  white rounded option rows.
- **Undo toast**: plum pill at the foot of the page with a pastel "Undo" pill, 7 seconds.
- **Nav**: phones, a rounded white bottom bar with the active icon in a pastel pill; desktop, a floating pill
  bar at the top right.

## Don'ts
- No paper textures, satin ribbons, serif type or sharp corners.
- No saturated reds or alarm colours; late is still good, and the copy says so.
- No medicine names, doses or times on the public site (Baby Snowflake only shows the gentle streak).
