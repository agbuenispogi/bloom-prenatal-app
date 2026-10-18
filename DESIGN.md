---
name: Bloom
description: A keepsake pregnancy journal that tells her the one thing to do now, one page per care day.
colors:
  paper: "#f4ecdf"
  rule: "#d6c6ad"
  ink: "#3b2b2a"
  ink-soft: "#6b5650"
  cloth: "#ebc0b3"
  cloth-ink: "#3b2226"
  cloth-soft: "#64393f"
  cloth-rule: "#d49f92"
  cloth-spine: "#dba699"
  spine-crease: "#b8837a"
  ribbon: "#8c2f55"
  ribbon-press: "#74244a"
  ribbon-fill-ink: "#fff6f2"
  ribbon-shade: "#6a2141"
  ribbon-sheen: "#a2486f"
  margin: "#e3b7b2"
  tab-mint: "#a9d3c0"
  tab-sky: "#afc8e4"
  tab-clay: "#d49a7e"
  tab-blush: "#edb7c0"
  tab-oat: "#d8c7a8"
  selection: "#e9c3cf"
  night-paper: "#1c1719"
  night-rule: "#3d3235"
  night-ink: "#e6dacc"
  night-ink-soft: "#b3a398"
  night-cloth: "#3e262d"
  night-cloth-ink: "#f1ddd8"
  night-cloth-soft: "#d2b4b4"
  night-cloth-rule: "#5a3a42"
  night-ribbon: "#d9799a"
  night-ribbon-fill: "#6e2843"
  night-ribbon-fill-ink: "#ebd9cf"
  night-ribbon-press: "#5e2139"
  night-margin: "#4a3036"
typography:
  display:
    fontFamily: "Young Serif, Georgia, serif"
    fontSize: "4.25rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Young Serif, Georgia, serif"
    fontSize: "2.125rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Young Serif, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 400
    lineHeight: 1.25
  section:
    fontFamily: "Young Serif, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.33
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "tnum, lnum"
  note:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
  action:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  tab: "3px"
  cloth: "6px"
  quiet: "8px"
  primary: "10px"
  field: "12px"
  strip: "16px"
  full: "9999px"
spacing:
  gutter: "20px"
  gutter-wide: "24px"
  entry-inset: "36px"
  entry: "24px"
  row: "12px"
  stack: "12px"
  section: "28px"
  column: "40px"
components:
  button-primary:
    backgroundColor: "{colors.ribbon}"
    textColor: "{colors.ribbon-fill-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.primary}"
    padding: "0 24px"
    height: "64px"
  button-primary-active:
    backgroundColor: "{colors.ribbon-press}"
  button-quiet:
    textColor: "{colors.cloth-ink}"
    rounded: "{rounded.quiet}"
    padding: "0 16px"
    height: "48px"
  field:
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0 16px"
    height: "48px"
  next-up-entry:
    backgroundColor: "{colors.cloth}"
    textColor: "{colors.cloth-ink}"
    rounded: "{rounded.cloth}"
    padding: "24px 24px 24px 36px"
  med-tab:
    rounded: "{rounded.tab}"
    width: "10px"
    height: "24px"
  servings-strip:
    textColor: "{colors.ink}"
    rounded: "{rounded.strip}"
    padding: "12px 16px"
  ribbon-bookmark:
    textColor: "{colors.ribbon-fill-ink}"
    height: "32px"
  button-primary-form:
    backgroundColor: "{colors.ribbon}"
    textColor: "{colors.ribbon-fill-ink}"
    rounded: "{rounded.primary}"
    padding: "0 24px"
    height: "56px"
  button-quiet-page:
    textColor: "{colors.ink}"
    rounded: "{rounded.quiet}"
    padding: "0 20px"
    height: "48px"
  nav-tab:
    textColor: "{colors.ink-soft}"
    typography: "{typography.caption}"
    height: "64px"
  nav-tab-active:
    textColor: "{colors.ink}"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.strip}"
    padding: "20px 20px 24px"
  choice-chip:
    textColor: "{colors.ink}"
    rounded: "{rounded.quiet}"
    padding: "0 12px"
    height: "48px"
  choice-chip-selected:
    backgroundColor: "{colors.cloth}"
    textColor: "{colors.cloth-ink}"
  adherence-ring:
    textColor: "{colors.ink}"
    size: "88px"
  adherence-ring-list:
    textColor: "{colors.ink}"
    size: "44px"
  tab-picker-option:
    rounded: "{rounded.quiet}"
    size: "48px"
  toggle:
    backgroundColor: "{colors.ribbon}"
    size: "24px"
---

# Design System: Bloom

## Overview

**Creative North Star: "The Keepsake Pregnancy Journal"**

Each care day is a page in her keepsake journal, filled in as she goes. Day pages are warm oat paper with brown ink; night pages are a deep plum-brown cover with dimmed oat ink. The one thing to do now is set on a blush book-cloth entry with a folded spine, and a single plum-raspberry satin ribbon is the only confident accent: it fills the Done action, rings what is due, and lies across Today's lines as the "now" bookmark.

The system is made of book materials rather than app chrome. Depth comes from hairline rules, the woven cloth texture and the shading inside the materials themselves (the spine's fold, the ribbon's satin sheen), never from drop shadows. State is carried by form so it reads without colour: an inked check, a dashed ring, a ringed dot, a struck line, a hollow ring with its word. Times sit right-aligned in tabular numerals; headings are set in a handset serif.

Density is calm and one-handed: one entry fills the first viewport on a phone, targets are 48px and up, and motion is slow and small (an ink stroke drawing in, an entry settling 6px). The light and dark pages follow the device and are both first-class; the night page never uses black or white blocks.

**Key Characteristics:**
- Oat paper and warm-brown ink by day; plum-brown cover and dimmed oat ink by night.
- One blush book-cloth entry with a folded spine holds the next action.
- One satin ribbon accent: Done, due, the "now" bookmark, focus, warnings' icon.
- State by form, not colour alone.
- Hairlines and material shading instead of shadows.
- Young Serif for headings and the monumental time; Atkinson Hyperlegible Next for UI.

## Colors

A warm, low-glare paper-and-cloth palette with a single deep satin accent, mirrored into a dim night page.

### Primary
- **Plum-Raspberry Satin** (ribbon): the only confident accent. Fills the primary action, rings and dots the due mark, colours the reminder line and error text, the warning icon, the focus outline and the input caret. At night the stroke/text form lifts to **Night Satin Pink** (night-ribbon) for legibility while filled surfaces drop to **Night Satin** (night-ribbon-fill) so the button never glows.
- **Pressed Satin** (ribbon-press): the primary action while held.
- **Satin Shade / Satin Sheen** (ribbon-shade, ribbon-sheen): the band edges and the off-centre highlight of the ribbon bookmark's gradient; used nowhere else.
- **Ribbon Cream** (ribbon-fill-ink): text set on the satin.

### Secondary
- **Blush Book-Cloth** (cloth): the Next up entry's ground, always carrying the woven texture. Its family: **Cloth Ink** (cloth-ink) for text on cloth, **Cloth Soft** (cloth-soft) for secondary text on cloth, **Cloth Rule** (cloth-rule) for the entry's hairline ring and quiet-button borders, **Spine** (cloth-spine) and **Spine Crease** (spine-crease) for the folded spine.

### Tertiary
- **Index-Tab Swatches** (tab-mint, tab-sky, tab-clay, tab-blush, tab-oat): one per medicine, a small vertical swatch beside its name. Oat is the fallback when a medicine has no colour. Swatches identify, they never carry state.

### Neutral
- **Oat Paper** (paper): the page; also the browser theme colour.
- **Warm-Brown Ink** (ink): body text, the done check.
- **Faded Ink** (ink-soft): secondary lines, times that are estimates, quiet state marks, inactive navigation, sub-page back links and intros.
- **Page Rule** (rule): row dividers (at 70%), servings-strip and its button borders, scrollbar.
- **Margin Rule** (margin): the vertical margin line through Today and the hairline above a margin note.
- **Selection Blush** (selection): text selection.

### Named Rules
**The One Ribbon Rule.** The satin is the only saturated colour on the page. It marks what to do now (Done, due, the "now" bookmark) and things she should notice (reminder line, error, warning icon); nothing decorative is satin.

**The Night Cover Rule.** Night pages are plum-brown (night-paper), never black, and nothing is pure white. Every token has a night value; the night accent splits into a lighter stroke tone and a darker fill tone.

## Typography

**Display Font:** Young Serif 400 (with Georgia, serif)
**Body Font:** Atkinson Hyperlegible Next (with system-ui, sans-serif)

**Character:** A handset journal serif for what she reads as the page (the date, the medicine, the time, meal names) over a hyperlegible UI face for everything she acts on, legible at 1 AM.

### Hierarchy
- **Display** (400, 4.25rem, 1, -0.02em): the monumental next-dose time in the Next up entry; the AM/PM suffix drops to 1.75rem at normal tracking.
- **Headline** (400, 2.125rem, 1.1, -0.01em, balanced wrap): the medicine or action name in Next up.
- **Title** (400, 1.75rem, tight): the page date at the top. The inked confirmation line uses the serif at 1.5rem.
- **Section** (400, 1.5rem): section headings such as "Today". Meal rows set their name in the serif at 1.125rem so meals read as page headings between doses.
- **Body** (400, 1.0625rem, 1.5): base text, row titles (500 for medicine names), Next up's why line.
- **Label** (400, 0.9375rem, tabular lining numerals): times, row notes, counts, the ribbon text (600, 0.01em), list-row details in History and Settings.
- **Note** (400, 0.875rem, 1.5): margin notes, field hints, toggle hints and field sub-labels, always in faded ink.
- **Caption** (400, 0.8125rem): the phone tab-bar labels and the "Logged 11:42 AM" line on a logged meal chip (tabular there). The smallest step; nothing she must act on is set this small.
- **Action** (600, 1.1875rem): the primary action label; quiet actions use 1rem at 500.

### Named Rules
**The Tabular Time Rule.** Every UI-face number that can change or line up (times, countdowns, counts, snooze minutes) uses tabular lining numerals; timeline times are right-aligned in a fixed 5.25rem column.

**The Two Voices Rule.** Serif for things on the page (date, names, meals, the big time); sans for anything she taps or scans as data. Never set an action in the serif.

## Layout

Mobile-first at 390px, one-handed. The page has a 20px gutter (24px from 640px). On a phone the Next up entry sits nearly edge to edge (12px inset) and fills about 55% of the viewport height (min(55svh, 32rem)), with its actions pushed to the bottom into the thumb zone; Today begins below it after a 28px gap.

From 768px the page becomes two columns inside a 1120px container: Next up at up to 26rem, sticky 24px from the top, and Today in the remaining width, with a 40px column gap. The entry then sizes to its content.

Today is a three-column grid: a 5.25rem right-aligned time column, a 22px state-mark column, and the entry, with 14px between them and 12px of vertical padding per row. The margin rule runs down through the mark column; each mark sits on a paper cut-out so the rule passes behind it. Stacks of controls use 12px gaps. The header respects the safe-area insets.

Each section keeps its own page column: Home 1120px, History 720px, Settings 640px, Onboarding 448px, all with the same 20px/24px gutter and a 1.25rem (or safe-area) top. On a phone the page reserves 4rem plus the bottom safe-area inset for the tab bar; from 768px that reserve drops and navigation moves into the page's top-right corner, aligned to that section's column edge.

## Elevation & Depth

Bloom has no drop shadows. Depth comes from material: hairlines (a 1px cloth-rule ring around the entry, 1px rules between rows), the woven cloth texture tiled at 192px, and shading that lives inside an object: the spine's fold gradient (light at the outer edge, darkening to a hard crease) and the ribbon's satin gradient (shade, fill, off-centre sheen, fill, shade). The inked confirmation lays an 85% cloth veil over the entry rather than raising anything.

### Named Rules
**The Material Depth Rule.** Depth is drawn as the material would actually shade (a fold, a satin sheen, a weave), never as a box-shadow that lifts a card off the page.

## Shapes

Small, book-like corners that scale with the object's role: index tabs 3px, the cloth entry 6px (a bound board, nearly square), quiet actions 8px, the primary action 10px, inline fields and confirm buttons 12px, the servings strip 16px. The only round shapes are the 48px close and remove targets, the state marks and the adherence ring. The log-meal sheet rounds only its top corners (16px) on a phone, all four from 640px. The ribbon bookmark is cut with a swallowtail notch at the page edge and runs off the other edge of the viewport; it is clipped by the page, never contained in a box.

## Components

### Buttons
Tactile and quiet, with one confident action per entry.
- **Shape:** gently rounded (primary 10px, quiet 8px).
- **Primary:** full-width satin fill with cream text, 64px tall, 24px side padding, a 24px icon before the label (Done, Eating now, Going to bed). One per entry.
- **Active:** pressed satin and a 0.985 scale over 150ms; disabled at 70% opacity.
- **Quiet:** 48px tall, cloth-rule border over a 40% cloth tint, cloth-ink text; they sit in pairs beneath the primary (Snooze, Skip) or in rows of three for minute choices. Pressed state takes a 10% cloth-ink wash.
- **Confirm (destructive-ish):** the skip confirmation inverts to a cloth-ink fill with cloth text, 12px corners.
- **Text link:** "Never mind" is an underlined cloth-soft line at 48px height.
- **Focus:** a 2.5px satin outline, offset 3px, 6px corners, on every focusable element.

- **Form primary:** on paper forms (sign-in, welcome, a single settings form, an opened medicine) the satin primary drops to 56px with 1.0625rem 600 text.
- **Quiet on paper:** off the cloth, quiet actions are 48px, 8px corners, a page-rule border, ink text at 1rem 500, no fill.

### Chips
- **Style:** choice chips in the log-meal sheet are 48px tall, 8px corners, a page-rule border and ink text at 1rem, laid out two-up or in a row of equal widths. They are radio inputs; focus shows the satin outline on the chip.
- **Selected:** woven blush book-cloth with a cloth-rule border and semibold cloth-ink text, the same material as the Next up entry rather than a satin fill.
- **Disabled / already logged:** 70% opacity with a small check before the name and a faded caption line beneath ("Logged 11:42 AM").

### Inputs / Fields
- **Style:** 48px tall, 12px corners, cloth-rule border over a 60% paper tint, ink text, faded-ink placeholder, the label stacked above in cloth-soft.
- **Focus:** the global satin outline; the caret is satin.

### Next Up Entry (signature)
The page's single action, set on blush book-cloth. A 16px folded spine runs down the left edge (hence the 36px left inset). Top: the medicine's index tab and the serif headline, with the why and dose beneath in cloth-soft. Then the monumental time with a live countdown ("in 11 min", tabular). When overdue, a kind line follows: "Whenever you're ready. Late is still good." Actions sit at the bottom. For a caregiver who can't log, the actions are replaced by a hairline-topped note. Enters with the settle-in motion.

### Inked Check (signature)
Tapping Done draws a hand-drawn satin check over the entry (700ms stroke draw on the soft ease-out, no bounce) with a serif "Caltrate logged" line; the entry holds for 750ms, then the next item settles in. The same check, smaller and in ink, stays on the Today row as the done mark. A 12ms vibration accompanies it where supported.

### Ribbon Bookmark (signature)
A 32px satin band that lies between Today's rows at the current moment, with a swallowtail end at the left page edge and the band running off the right edge. It reads "Now · 12:31 PM" in 600-weight tabular cream text. There is exactly one per page.

### Today Timeline
Rows: right-aligned time (prefixed "~" and faded when estimated, "Any time" when untimed), the state mark, then the title with a small index tab (4px by 16px) for doses or the serif for meals, and a faded line joining note, state word, lateness and her quoted reason. Skipped rows strike through; skipped and missed rows fade to ink-soft. Warnings render as a margin note: a margin-rule hairline above, a satin info icon, 0.875rem faded ink. It informs, it doesn't alarm.

### State Marks
22px drawn marks, one per state: done is the ink check; due is a satin ring with a satin centre; upcoming is a dashed faded ring; snoozed is a dotted satin ring; skipped is a faded ring struck through; missed is a hollow faded ring. Each is paired with its word in the row.

### Servings Strip
Any-time items (counts toward a daily range) sit above the timeline in a 16px-cornered strip with a page-rule border: index tab, name, "1 of 1–2 today · By 9:00 PM", and an outlined "+ Had a glass" button (12px corners, 48px). Past the deadline the count line turns satin with a gentle prompt.

### Log-Meal Sheet
A native dialog that rises as a bottom sheet: paper ground, 16px top corners, a page-rule hairline along its top edge (a full border and centred, max 28rem, from 640px), over a scrim of the night paper at 45%. Inside, 20px padding (24px or the safe-area at the bottom) and 24px between groups: a serif "Log a meal" title with a 48px round close target, the meal chips, the when chips, an optional time field, then one satin primary with a leading 24px icon. The form settles in on open. No shadow; the scrim and the hairline do the separating.

### Adherence Ring (History)
The share of doses taken on time, drawn in ink on a page-rule track (2.5px stroke on a 36-unit box, round cap, from 12 o'clock) with the percentage in 600 tabular ink at its centre. It is deliberately ink, not satin: a finished day is a record, and satin stays reserved for now. 88px in the day summary, 44px in list rows; a day with nothing logged shows a dashed page-rule circle with a dash instead.

### History Pages
The page subtitle under the serif "History" states the streak once ("6 clean days in a row") and nowhere else. The day summary pairs the large ring with a gentle note in the serif at 1.25rem (snug, pretty wrap), then a hairline and a one-line tabular tally in full form ("6 on time · none late, skipped or missed"), then the Anmum line, which turns satin only when it was not taken. List rows (64px, page-rule dividers at 70%) carry the small ring, the date in the serif at 1.125rem, the short tally in faded label text ("All 6 on time", "5 of 6 on time · 1 late") and a faded chevron. Past pages speak in the past tense.

### Settings
- **Sub-page chrome:** a 48px faded-ink back link with a leading chevron, the serif page title (1.75rem), and an optional faded intro line beneath.
- **Hub rows:** 64px rows between page-rule hairlines (70%): a serif title at 1.125rem, a faded detail line beneath, a faded chevron at the right. Medicine rows lead with their index tab and open in place.
- **Colour-tab picker:** 48px squares with 8px corners and a page-rule border, each holding the 10px by 24px index swatch; the checked square takes an ink border.
- **Toggles:** a 24px native checkbox filled with the satin fill tone (the night fill at night), its label in body ink and an optional faded note beneath.
- **Saves:** a page of several always-open sections (Notifications) gives each section a quiet-on-paper save, so no satin competes down the page; a single form or an opened medicine takes the form primary.
- **Voice:** copy addresses whoever is reading: "you/your" for her, "she/her" when the caregiver reads, and the caregiver is always named by display name.

### Onboarding Progress
Three steps (install, alarms, test) shown with the existing state marks in a row: done steps take the ink check, the current step the satin due ring, later steps the dashed upcoming ring, each with its word for screen readers. Steps use the headline serif (2.125rem) over a faded body intro, with the satin primary and any quiet-on-paper action pushed to the bottom.

### Navigation
The page header holds only the serif date and the pregnancy week beneath it in faded ink; it carries no settings control.
- **Phone:** a bottom tab bar (Today, History, Settings) on the paper ground with a page-rule hairline along its top and safe-area padding beneath. Each tab is a 64px target stacking a 24px outline icon over a caption-sized label.
- **Active:** shown by form, not colour: semibold ink, a heavier icon stroke, and a 2px underline under the label. Inactive tabs are faded ink.
- **From 768px:** the bar becomes quiet top-right links (48px, icon beside a 1rem label, 1px underline when active), on no ground, ending on the right edge of the current section's page column.

### App Icon
Procedural, drawn from the materials: a blush book-cloth journal with a satin swallowtail ribbon hanging past its lower edge, set on oat paper, with a maskable variant that keeps the journal inside the safe zone.

## Do's and Don'ts

### Do:
- **Do** give every surface a night value from the night-* tokens and check it on the plum-brown page; the night accent fill is night-ribbon-fill, its strokes and text night-ribbon.
- **Do** keep one satin primary action per entry, full width, 64px tall, in the thumb zone.
- **Do** carry state by form plus a word (check, dashed, ringed, dotted, struck, hollow), never by colour alone.
- **Do** set times and counts in tabular lining numerals and right-align timeline times in the 5.25rem column.
- **Do** keep targets at 48px or larger and motion slow and small: 700ms ink draw, 420ms settle from 55% opacity and 6px, the soft ease-out cubic-bezier(0.16, 1, 0.3, 1), all collapsed under reduced motion.
- **Do** write margin notes and late states kindly and plainly, in faded ink with a hairline, not in alert boxes.

### Don't:
- **Don't** use drop shadows to lift cards; use hairlines, the cloth weave, or shading drawn inside the material.
- **Don't** introduce a second saturated accent or use satin decoratively.
- **Don't** use pure black or pure white surfaces, on day or night pages.
- **Don't** use bounce, spin, parallax or large movement, and never animate content in from zero opacity.
- **Don't** use a medicine's index-tab colour to signal its state.
