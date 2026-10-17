# Home / Next up (+ Done flow, Today timeline)

Scope: `/` for the patient (and the caregiver, read-only by default). Visitor mode: **Operate**. Mobile-first at 390 px, one-handed, often in the dark after midnight. Desktop: two columns (Next up | Today).

Audience/job: she glances, sees the single next thing, does it, taps once. Proof/content: real regimen from the engine (`buildDaySchedule`). Constraints: PRODUCT.md (calm motion, night-safe dark, AA, 48 px+ targets, no medical advice).

## Direction contract

THESIS: Each care day is a page in her keepsake pregnancy journal, filled in as she goes. It refuses the category default of white pill cards with checkboxes and a progress ring.

OWN-WORLD: Day pages are oat paper (#F4ECDF) with warm-brown ink. The Next up entry is set on blush book-cloth, and one plum-raspberry satin ribbon (#8C2F55) is the only confident accent. Medicines carry small cloth index-tab swatches (mint, sky, clay, blush). Night pages are a deep plum-brown cover (#1C1719) with dimmed oat ink, never black and never white blocks. Headings use Young Serif and UI uses Atkinson Hyperlegible Next with tabular numerals. Hairline rules replace shadows.

STORY: She sees today's date and pregnancy week, knows the one thing to do now, and why. One tap logs it, the entry is inked into today's page, and the page turns to what's next.

FIRST VIEWPORT (390×844): the serif date and "Week 24 · day 3" at the top. A blush cloth Next up entry takes about 55% of the height: the why, the medicine name in serif, the time at monumental tabular scale with a countdown, and a full-width Done in the thumb zone with Snooze and Skip beneath it. Today's first lines peek below the fold edge.

FORM: Keepsake Pregnancy Journal, candidate #1 of 7 (Impeccable's pick, chosen by the user); seed key a76f4478. Signature move: the satin **ribbon bookmark** marks "now" between Today's lines, and Done **inks a hand-drawn check** into the entry (slow stroke draw, no bounce). State is carried by form: solid ink = done, dashed = upcoming, ringed = due, struck through = skipped, hollow + word = missed. Times sit right-aligned in tabular numerals.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- Caregiver desktop view details (later screen).
- Reminder scheduling hooks into the Done actions in Phase 5.
