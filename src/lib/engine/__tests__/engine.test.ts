import { describe, expect, it } from "vitest";
import { buildDaySchedule, careDateOf, describeNextUp, planDoseReminders, planMealIntent, resolveShift, wallTime } from "..";
import type { DoseItem, DoseLog, EngineInput, MealItem, NextAction } from "..";
import { MON, MON_SHIFT, SAT, TUE, TZ, WED, at, eaten, makeInput, planned, rules, settings, taken, weekly } from "./fixtures";

const dose = (input: EngineInput, slug: string, occurrence = 1) =>
  buildDaySchedule(input).timeline.find((i): i is DoseItem => i.kind === "dose" && i.key === `${slug}#${occurrence}`);
const meal = (input: EngineInput, key: string) =>
  buildDaySchedule(input).timeline.find((i): i is MealItem => i.kind === "meal" && i.key === key);
const next = (input: EngineInput) => buildDaySchedule(input).nextUp;
function expectType<T extends NextAction["type"]>(a: NextAction, type: T): Extract<NextAction, { type: T }> {
  expect(a.type).toBe(type);
  return a as Extract<NextAction, { type: T }>;
}

// A full, normal Tuesday up to dinner.
const lunchDone = (): Pick<EngineInput, "meals" | "doses"> => ({
  meals: [eaten("lunch", at(TUE, "11:00"), at(TUE, "11:00"))],
  doses: [taken("r-gav-l", at(TUE, "10:30")), taken("r-cal-l", at(TUE, "12:00"))],
});

describe("care day boundary (04:00 → 03:59, Manila)", () => {
  it("counts 00:30 and 03:59 toward the previous day", () => {
    expect(careDateOf(at(WED, "00:30"), TZ, "04:00")).toBe(TUE);
    expect(careDateOf(at(WED, "03:59"), TZ, "04:00")).toBe(TUE);
    expect(careDateOf(at(WED, "04:00"), TZ, "04:00")).toBe(WED);
  });

  it("places 01:00 and 24:00 on the next calendar day", () => {
    expect(wallTime(TUE, "01:00", TZ, "04:00")).toEqual(at(WED, "01:00"));
    expect(wallTime(TUE, "24:00", TZ, "04:00")).toEqual(at(WED, "00:00"));
    expect(wallTime(TUE, "13:00", TZ, "04:00")).toEqual(at(TUE, "13:00"));
  });

  it("stores instants in UTC: 13:00 Manila is 05:00Z", () => {
    expect(at(TUE, "13:00").toISOString()).toBe("2026-10-20T05:00:00.000Z");
  });
});

describe("work shifts", () => {
  it("resolves Monday, Tue–Fri and weekends", () => {
    expect(resolveShift(MON, weekly, [])).toEqual({ start: "19:00", end: "24:00" });
    expect(resolveShift(TUE, weekly, [])).toEqual({ start: "14:00", end: "24:00" });
    expect(resolveShift(SAT, weekly, [])).toBeNull();
    expect(resolveShift("2026-10-25", weekly, [])).toBeNull();
  });

  it("lets a per-date override win", () => {
    expect(resolveShift(TUE, weekly, [{ date: TUE, isOff: true, start: null, end: null }])).toBeNull();
    expect(resolveShift(SAT, weekly, [{ date: SAT, isOff: false, start: "09:00", end: "15:00" }])).toEqual({ start: "09:00", end: "15:00" });
  });

  it("Monday: suggests dinner before the 7 PM shift (17:00–18:30)", () => {
    const d = meal(makeInput({ date: MON, shift: MON_SHIFT, now: at(MON, "15:00") }), "dinner")!;
    expect(d.window).toEqual({ start: at(MON, "17:00"), end: at(MON, "18:30"), note: "before_shift" });
  });

  it("Tue–Fri: dinner falls inside the 2 PM–12 AM shift, so it's a break meal", () => {
    const d = meal(makeInput({ now: at(TUE, "15:00") }), "dinner")!;
    expect(d.window).toEqual({ start: at(TUE, "17:00"), end: at(TUE, "22:00"), note: "during_break" });
  });

  it("weekends: plain windows, no shift notes", () => {
    const input = makeInput({ date: SAT, shift: resolveShift(SAT, weekly, []), now: at(SAT, "15:00") });
    expect(meal(input, "dinner")!.window!.note).toBeNull();
    expect(meal(input, "lunch")!.window!.note).toBeNull();
  });
});

describe("breakfast and the pre-meal flow", () => {
  it("morning: next up is breakfast prep with Gaviscon, and breakfast can be skipped", () => {
    const a = expectType(next(makeInput({ now: at(TUE, "09:00") })), "prep_meal");
    expect(a.meal).toBe("breakfast");
    expect(a.gaviscon?.rule.slug).toBe("gaviscon-before-breakfast");
    expect(a.canSkip).toBe(true);
    expect(a.suggestedAt).toEqual(at(TUE, "09:00")); // window already open → now
  });

  it("skipped breakfast: lunch becomes the first meal and its Gaviscon is 30 min before", () => {
    const input = makeInput({ breakfastSkipped: true, now: at(TUE, "08:00") });
    const a = expectType(next(input), "prep_meal");
    expect(a.meal).toBe("lunch");
    expect(a.canSkip).toBe(false);
    expect(a.suggestedAt).toEqual(at(TUE, "09:30"));
    const gb = dose(input, "gaviscon-before-breakfast")!;
    expect(gb.state).toBe("skipped");
    expect(gb.reason).toBe("breakfast skipped");
    expect(meal(input, "breakfast")!.state).toBe("skipped");
  });

  it("planning lunch without breakfast counts breakfast as skipped", () => {
    const input = makeInput({ meals: [planned("lunch", at(TUE, "11:00"))], now: at(TUE, "10:30") });
    expect(dose(input, "gaviscon-before-breakfast")!.state).toBe("skipped");
  });

  it("'I'm eating in ~30 min' logs Gaviscon now and plans the meal", () => {
    const now = at(TUE, "10:30");
    const intent = planMealIntent(makeInput({ breakfastSkipped: true, now }), "lunch");
    expect(intent.plannedAt).toEqual(at(TUE, "11:00"));
    expect(intent.preMealDose).toEqual({ ruleId: "r-gav-l", occurrence: 1, takenAt: now });
  });

  it("after the intent tap, next up is 'eat lunch' at the planned time", () => {
    const input = makeInput({
      breakfastSkipped: true,
      meals: [planned("lunch", at(TUE, "11:00"))],
      doses: [taken("r-gav-l", at(TUE, "10:30"))],
      now: at(TUE, "10:31"),
    });
    const a = expectType(next(input), "eat");
    expect(a.meal).toBe("lunch");
    expect(a.at).toEqual(at(TUE, "11:00"));
    expect(describeNextUp(a, input.now, TZ).title).toBe("Eat lunch at 11:00 AM");
  });

  it("intent does not re-log a Gaviscon she already took", () => {
    const input = makeInput({ breakfastSkipped: true, doses: [taken("r-gav-l", at(TUE, "10:00"))], now: at(TUE, "10:30") });
    expect(planMealIntent(input, "lunch").preMealDose).toBeNull();
  });

  it("meal eaten without its pre-meal Gaviscon: that dose is missed, not nagged", () => {
    const input = makeInput({ breakfastSkipped: true, meals: [eaten("lunch", at(TUE, "11:00"))], now: at(TUE, "11:05") });
    expect(dose(input, "gaviscon-before-lunch")!.state).toBe("missed");
    const a = expectType(next(input), "take");
    expect(a.dose.rule.slug).toBe("caltrate-after-lunch");
  });
});

describe("after-meal and fixed-time doses", () => {
  it("logging lunch schedules Caltrate for +60 min", () => {
    const input = makeInput({
      meals: [eaten("lunch", at(TUE, "12:42"))],
      doses: [taken("r-gav-l", at(TUE, "12:12"))],
      breakfastSkipped: true,
      now: at(TUE, "12:45"),
    });
    const a = expectType(next(input), "take");
    expect(a.dose.rule.slug).toBe("caltrate-after-lunch");
    expect(a.dueAt).toEqual(at(TUE, "13:42"));
    const copy = describeNextUp(a, input.now, TZ);
    expect(copy).toEqual({ title: "Caltrate · 1 tablet", detail: "at 1:42 PM", why: "after lunch" });
  });

  it("iron + folic acid is at 17:00 by default and editable as data", () => {
    expect(dose(makeInput(), "iron-folic-afternoon")!.targetAt).toEqual(at(TUE, "17:00"));
    const moved = rules.map((r) => (r.id === "r-iron" ? { ...r, fixedTime: "19:00" } : r));
    expect(dose(makeInput({ rules: moved }), "iron-folic-afternoon")!.targetAt).toEqual(at(TUE, "19:00"));
  });

  it("inactive rules disappear from the day", () => {
    const off = rules.map((r) => (r.id === "r-cal-d" ? { ...r, active: false } : r));
    expect(dose(makeInput({ rules: off }), "caltrate-after-dinner")).toBeUndefined();
  });

  it("Tuesday afternoon: dinner prep (16:30) comes before iron (17:00), then iron", () => {
    const base = lunchDone();
    const a = expectType(next(makeInput({ ...base, now: at(TUE, "13:00") })), "prep_meal");
    expect(a.meal).toBe("dinner");
    expect(a.suggestedAt).toEqual(at(TUE, "16:30"));
    expect(a.window.note).toBe("during_break");

    const afterIntent = makeInput({
      meals: [...base.meals, planned("dinner", at(TUE, "17:30"))],
      doses: [...base.doses, taken("r-gav-d", at(TUE, "17:00"))],
      now: at(TUE, "17:00"),
    });
    const b = expectType(next(afterIntent), "take");
    expect(b.dose.rule.slug).toBe("iron-folic-afternoon");
  });
});

describe("late, skipped and snoozed doses", () => {
  const lunchAt1105 = () => ({
    breakfastSkipped: true,
    meals: [eaten("lunch", at(TUE, "11:05"))],
    doses: [taken("r-gav-l", at(TUE, "10:35"))] as DoseLog[],
  });

  it("shows how late a dose was (actual vs target), beyond a 15-min grace", () => {
    const late = makeInput({ ...lunchAt1105(), doses: [...lunchAt1105().doses, taken("r-cal-l", at(TUE, "12:45"))], now: at(TUE, "13:00") });
    const cal = dose(late, "caltrate-after-lunch")!;
    expect(cal.state).toBe("done");
    expect(cal.targetAt).toEqual(at(TUE, "12:05"));
    expect(cal.lateByMin).toBe(40);

    const onTime = makeInput({ ...lunchAt1105(), doses: [...lunchAt1105().doses, taken("r-cal-l", at(TUE, "12:15"))], now: at(TUE, "13:00") });
    expect(dose(onTime, "caltrate-after-lunch")!.lateByMin).toBeNull();
  });

  it("an overdue dose stays next up and is flagged overdue, gently", () => {
    const input = makeInput({ ...lunchAt1105(), now: at(TUE, "12:40") });
    const a = expectType(next(input), "take");
    expect(a.dose.rule.slug).toBe("caltrate-after-lunch");
    expect(a.overdue).toBe(true);
    expect(describeNextUp(a, input.now, TZ).detail).toBe("Was due at 12:05 PM. Whenever you're ready");
  });

  it("snooze moves the due time; after it passes the dose is due again", () => {
    const snoozed: DoseLog = { ruleId: "r-cal-l", occurrence: 1, status: "snoozed", takenAt: null, snoozedUntil: at(TUE, "12:25") };
    const during = makeInput({ ...lunchAt1105(), doses: [...lunchAt1105().doses, snoozed], now: at(TUE, "12:10") });
    expect(dose(during, "caltrate-after-lunch")!.state).toBe("snoozed");
    const a = expectType(next(during), "take");
    expect(a.dueAt).toEqual(at(TUE, "12:25"));
    expect(a.overdue).toBe(false);

    const after = { ...during, now: at(TUE, "12:30") };
    expect(dose(after, "caltrate-after-lunch")!.state).toBe("due");
  });

  it("a skipped dose keeps its reason and is not next up", () => {
    const skipped: DoseLog = { ruleId: "r-cal-l", occurrence: 1, status: "skipped", takenAt: null, snoozedUntil: null, reason: "felt nauseous" };
    const input = makeInput({ ...lunchAt1105(), doses: [...lunchAt1105().doses, skipped], now: at(TUE, "12:10") });
    expect(dose(input, "caltrate-after-lunch")!.reason).toBe("felt nauseous");
    expect(next(input).type).toBe("prep_meal");
  });

  it("anything still open when the care day ends is missed", () => {
    const input = makeInput({ ...lunchAt1105(), now: at(WED, "04:00") });
    expect(dose(input, "caltrate-after-lunch")!.state).toBe("missed");
    expect(meal(input, "dinner")!.state).toBe("missed");
    expect(next(input).type).toBe("all_done");
  });
});

describe("bedtime after midnight", () => {
  const evening = (): Pick<EngineInput, "meals" | "doses"> => ({
    meals: [...lunchDone().meals, eaten("dinner", at(TUE, "20:00"))],
    doses: [
      ...lunchDone().doses,
      taken("r-iron", at(TUE, "17:00")),
      taken("r-gav-d", at(TUE, "19:30")),
      taken("r-cal-d", at(TUE, "21:00")),
      taken("r-anmum", at(TUE, "15:00")),
    ],
  });

  it("after dinner, next up is bedtime, estimated at the 01:00 default", () => {
    const a = expectType(next(makeInput({ ...evening(), now: at(TUE, "23:00") })), "bedtime");
    expect(a.estimatedAt).toEqual(at(WED, "01:00"));
    expect(describeNextUp(a, at(TUE, "23:00"), TZ).detail).toBe("Take Gaviscon at bedtime. Usually around 1:00 AM");
  });

  it("tapping 'going to bed' at 00:40 confirms it under Tuesday's care day", () => {
    const tapped = at(WED, "00:40");
    expect(careDateOf(tapped, TZ, "04:00")).toBe(TUE);
    const input = makeInput({ ...evening(), bedtimeAt: tapped, now: at(WED, "00:41") });
    const a = expectType(next(input), "take");
    expect(a.dose.rule.slug).toBe("gaviscon-bedtime");
    expect(a.dueAt).toEqual(tapped);
  });

  it("the 00:42 bedtime dose is logged in Tuesday's timeline and the day is complete", () => {
    const e = evening();
    const input = makeInput({
      ...e,
      bedtimeAt: at(WED, "00:40"),
      doses: [...e.doses, taken("r-gav-bed", at(WED, "00:42"))],
      now: at(WED, "00:43"),
    });
    const schedule = buildDaySchedule(input);
    expect(schedule.careDate).toBe(TUE);
    expect(dose(input, "gaviscon-bedtime")!.state).toBe("done");
    expect(schedule.timeline.at(-1)!.key).toBe("gaviscon-bedtime#1");
    expect(schedule.nextUp.type).toBe("all_done");
  });

  it("a logged midnight snack ties the bedtime Gaviscon to the snack", () => {
    const e = evening();
    const input = makeInput({ ...e, meals: [...e.meals, eaten("snack", at(WED, "00:15"))], now: at(WED, "00:16") });
    const bed = dose(input, "gaviscon-bedtime")!;
    expect(bed.targetAt).toEqual(at(WED, "00:15"));
    expect(bed.estimated).toBe(false);
    expect(expectType(next(input), "take").dose.rule.slug).toBe("gaviscon-bedtime");
    // The snack sorts right before its Gaviscon.
    const keys = buildDaySchedule(input).timeline.map((i) => i.key);
    expect(keys.indexOf("snack#1")).toBe(keys.indexOf("gaviscon-bedtime#1") - 1);
  });
});

describe("Anmum Materna (0 / 1 / 2 a day)", () => {
  const anmum = (input: EngineInput) => buildDaySchedule(input).anmum[0]!;

  it("0 taken: reminder only from 21:00", () => {
    expect(anmum(makeInput({ now: at(TUE, "20:59") })).needsReminder).toBe(false);
    const s = anmum(makeInput({ now: at(TUE, "21:00") }));
    expect(s).toMatchObject({ taken: 0, min: 1, max: 2, needsReminder: true, canTakeMore: true });
    expect(s.deadline).toEqual(at(TUE, "21:00"));
    expect(dose(makeInput(), "anmum-daily")!.state).toBe("upcoming");
  });

  it("1 taken: no reminder, a second serving is still allowed", () => {
    const s = anmum(makeInput({ doses: [taken("r-anmum", at(TUE, "10:00"))], now: at(TUE, "22:00") }));
    expect(s).toMatchObject({ taken: 1, needsReminder: false, canTakeMore: true });
  });

  it("2 taken: that's the max for the day", () => {
    const input = makeInput({ doses: [taken("r-anmum", at(TUE, "10:00")), taken("r-anmum", at(TUE, "16:00"), 2)], now: at(TUE, "22:00") });
    expect(anmum(input)).toMatchObject({ taken: 2, canTakeMore: false });
    expect(dose(input, "anmum-daily", 2)!.state).toBe("done");
  });

  it("the deadline is configurable", () => {
    const later = rules.map((r) => (r.id === "r-anmum" ? { ...r, deadline: "22:30" } : r));
    expect(anmum(makeInput({ rules: later, now: at(TUE, "22:00") })).needsReminder).toBe(false);
  });

  it("0 at the end of the day shows as missed (for the summary flag)", () => {
    expect(dose(makeInput({ now: at(WED, "04:00") }), "anmum-daily")!.state).toBe("missed");
  });
});

describe("iron spacing guardrail (warn only)", () => {
  const dinnerAt1730 = () => {
    const base = lunchDone();
    return makeInput({ meals: [...base.meals, eaten("dinner", at(TUE, "17:30"))], doses: [...base.doses, taken("r-gav-d", at(TUE, "17:00"))], now: at(TUE, "17:35") });
  };

  it("warns when iron is within 2 h of Gaviscon or Caltrate, and says to check with the OB", () => {
    const { warnings } = buildDaySchedule(dinnerAt1730());
    expect(warnings.map((w) => [w.otherKey, w.minutesApart])).toEqual([
      ["gaviscon-before-dinner#1", 0],
      ["caltrate-after-dinner#1", 90],
    ]);
    expect(warnings[0]!.message).toMatch(/Confirm the spacing with your OB/);
    expect(warnings.every((w) => !w.estimated)).toBe(true);
  });

  it("never moves the iron dose", () => {
    expect(dose(dinnerAt1730(), "iron-folic-afternoon")!.targetAt).toEqual(at(TUE, "17:00"));
  });

  it("does not warn when doses are 2 h or more apart", () => {
    const { warnings } = buildDaySchedule(makeInput({ ...lunchDone(), now: at(TUE, "12:30") }));
    expect(warnings.find((w) => w.otherKey.startsWith("caltrate-after-lunch"))).toBeUndefined();
  });

  it("flags projected conflicts as estimated, and can be turned off", () => {
    const morning = buildDaySchedule(makeInput({ now: at(TUE, "09:00") })).warnings;
    expect(morning.length).toBeGreaterThan(0);
    expect(morning.every((w) => w.estimated)).toBe(true);
    expect(buildDaySchedule(makeInput({ settings: { ...settings, ironSpacingMin: 0 } })).warnings).toEqual([]);
  });

  it("ignores skipped doses", () => {
    const input = dinnerAt1730();
    input.doses.push({ ruleId: "r-cal-d", occurrence: 1, status: "skipped", takenAt: null, snoozedUntil: null });
    expect(buildDaySchedule(input).warnings.map((w) => w.otherKey)).toEqual(["gaviscon-before-dinner#1"]);
  });
});

describe("reminder plan", () => {
  const people = [
    { id: "wife", role: "patient" as const, push: true, email: true },
    { id: "ag", role: "caregiver" as const, push: true, email: true },
  ];
  const due = at(TUE, "13:42");

  it("due → push + email to both; +15 nag push to both; +30 escalation email to caregiver only", () => {
    const plan = planDoseReminders(TUE, "caltrate-after-lunch#1", due, people, settings);
    const summary = plan.map((r) => [r.kind, r.recipientId, r.channel, r.dueAt.toISOString()]);
    expect(summary).toEqual([
      ["due", "wife", "push", due.toISOString()],
      ["due", "wife", "email", due.toISOString()],
      ["due", "ag", "push", due.toISOString()],
      ["due", "ag", "email", due.toISOString()],
      ["nag", "wife", "push", at(TUE, "13:57").toISOString()],
      ["nag", "ag", "push", at(TUE, "13:57").toISOString()],
      ["escalation", "ag", "email", at(TUE, "14:12").toISOString()],
    ]);
    expect(new Set(plan.map((r) => r.dedupeKey)).size).toBe(plan.length);
  });

  it("respects notification preferences", () => {
    const plan = planDoseReminders(TUE, "x#1", due, [{ ...people[0]!, email: false }, { ...people[1]!, push: false }], settings);
    expect(plan.some((r) => r.recipientId === "wife" && r.channel === "email")).toBe(false);
    expect(plan.some((r) => r.recipientId === "ag" && r.channel === "push")).toBe(false);
  });

  it("is idempotent for the same due time and distinct after a snooze", () => {
    const a = planDoseReminders(TUE, "x#1", due, people, settings).map((r) => r.dedupeKey);
    const b = planDoseReminders(TUE, "x#1", due, people, settings).map((r) => r.dedupeKey);
    const snoozed = planDoseReminders(TUE, "x#1", at(TUE, "13:52"), people, settings).map((r) => r.dedupeKey);
    expect(a).toEqual(b);
    expect(snoozed.some((k) => a.includes(k))).toBe(false);
  });
});

describe("next up is always exactly one action", () => {
  it("holds across a whole care day in 15-min steps, for several states", () => {
    const states: Pick<EngineInput, "meals" | "doses">[] = [
      { meals: [], doses: [] },
      lunchDone(),
      { meals: [...lunchDone().meals, eaten("dinner", at(TUE, "19:00"))], doses: lunchDone().doses },
    ];
    const valid = new Set(["take", "prep_meal", "eat", "bedtime", "all_done"]);
    for (const s of states) {
      for (let t = at(TUE, "04:00").getTime(); t < at(WED, "04:00").getTime(); t += 15 * 60_000) {
        const action = next(makeInput({ ...s, now: new Date(t) }));
        expect(valid.has(action.type)).toBe(true);
        expect(describeNextUp(action, new Date(t), TZ).title.length).toBeGreaterThan(0);
      }
    }
  });
});
