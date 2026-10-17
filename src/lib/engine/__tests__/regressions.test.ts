// Regressions from the schedule-engine-reviewer pass (Phase 3). Each block names the defect it pins down.
import { describe, expect, it } from "vitest";
import { buildDaySchedule, careDateOf, describeNextUp, planMealIntent } from "..";
import type { DoseItem, DoseLog, EngineInput, MealItem, NextAction } from "..";
import { MON, MON_SHIFT, TUE, TZ, WED, at, eaten, makeInput, planned, rules, settings, taken } from "./fixtures";

const sched = (i: EngineInput) => buildDaySchedule(i);
const dose = (i: EngineInput, key: string) => sched(i).timeline.find((x): x is DoseItem => x.kind === "dose" && x.key === key)!;
const meal = (i: EngineInput, key: string) => sched(i).timeline.find((x): x is MealItem => x.kind === "meal" && x.key === key)!;
function as<T extends NextAction["type"]>(a: NextAction, type: T) {
  expect(a.type).toBe(type);
  return a as Extract<NextAction, { type: T }>;
}
const snooze = (ruleId: string, until: Date): DoseLog => ({ ruleId, occurrence: 1, status: "snoozed", takenAt: null, snoozedUntil: until });

describe("an unlogged meal never blocks the rest of the day", () => {
  it("'going to bed' wins even if dinner was never logged; dinner and its doses read as missed", () => {
    const input = makeInput({
      breakfastSkipped: true,
      meals: [eaten("lunch", at(TUE, "11:00"))],
      doses: [taken("r-gav-l", at(TUE, "10:30")), taken("r-cal-l", at(TUE, "12:00")), taken("r-iron", at(TUE, "17:00")), taken("r-gav-d", at(TUE, "20:00")), taken("r-anmum", at(TUE, "15:00"))],
      bedtimeAt: at(WED, "00:20"),
      now: at(WED, "00:25"),
    });
    const a = as(sched(input).nextUp, "take");
    expect(a.dose.rule.slug).toBe("gaviscon-bedtime");
    expect(meal(input, "dinner").state).toBe("missed");
    expect(dose(input, "caltrate-after-dinner#1").state).toBe("missed");
  });

  it("planning dinner moves past an unlogged lunch", () => {
    const input = makeInput({
      breakfastSkipped: true,
      meals: [planned("dinner", at(TUE, "18:30"))],
      doses: [taken("r-gav-d", at(TUE, "18:00")), taken("r-iron", at(TUE, "17:00"))],
      now: at(TUE, "18:10"),
    });
    const a = as(sched(input).nextUp, "eat");
    expect(a.meal).toBe("dinner");
    expect(meal(input, "lunch").state).toBe("missed");
  });

  it("past the estimated bedtime, bedtime shows even with dinner unlogged", () => {
    const input = makeInput({
      breakfastSkipped: true,
      meals: [eaten("lunch", at(TUE, "11:00"))],
      doses: [taken("r-gav-l", at(TUE, "10:30")), taken("r-cal-l", at(TUE, "12:00")), taken("r-iron", at(TUE, "17:00")), taken("r-anmum", at(TUE, "15:00"))],
      now: at(WED, "01:30"),
    });
    const a = as(sched(input).nextUp, "bedtime");
    expect(a.estimatedAt).toEqual(at(WED, "01:00"));
  });
});

describe("bedtime ties only to a late snack", () => {
  it("an afternoon snack does not move bedtime or cause spacing warnings", () => {
    const input = makeInput({ meals: [eaten("snack", at(TUE, "15:00")), eaten("dinner", at(TUE, "19:00"))], now: at(TUE, "20:00") });
    const bed = dose(input, "gaviscon-bedtime#1");
    expect(bed.targetAt).toEqual(at(WED, "01:00"));
    expect(bed.estimated).toBe(true);
    expect(sched(input).warnings.some((w) => w.otherKey === "gaviscon-bedtime#1")).toBe(false);
  });

  it("a snack after dinner ties it, before or after the 01:00 default", () => {
    for (const t of [at(TUE, "22:30"), at(WED, "01:30")]) {
      const input = makeInput({ meals: [eaten("dinner", at(TUE, "19:00")), eaten("snack", t)], now: t });
      expect(dose(input, "gaviscon-bedtime#1").targetAt).toEqual(t);
    }
  });

  it("before dinner is logged, a snack (even in the dinner window) leaves bedtime at its estimate", () => {
    const input = makeInput({ breakfastSkipped: true, meals: [eaten("lunch", at(TUE, "11:00")), eaten("snack", at(TUE, "17:30"))], now: at(TUE, "18:00") });
    const bed = dose(input, "gaviscon-bedtime#1");
    expect(bed.targetAt).toEqual(at(WED, "01:00"));
    expect(bed.estimated).toBe(true);
    expect(bed.state).toBe("upcoming");
    expect(sched(input).nextUp.type).not.toBe("bedtime");
  });
});

describe("never 'all done' while Anmum is below its minimum", () => {
  const fullDay = (): Pick<EngineInput, "meals" | "doses"> & { bedtimeAt: Date } => ({
    meals: [eaten("lunch", at(TUE, "11:00")), eaten("dinner", at(TUE, "19:00"))],
    doses: [
      taken("r-gav-l", at(TUE, "10:30")), taken("r-cal-l", at(TUE, "12:00")), taken("r-iron", at(TUE, "17:00")),
      taken("r-gav-d", at(TUE, "18:30")), taken("r-cal-d", at(TUE, "20:00")), taken("r-gav-bed", at(TUE, "23:00")),
    ],
    bedtimeAt: at(TUE, "23:00"),
  });

  it("0 of 1 at 23:00: Anmum is next up, overdue since 21:00", () => {
    const input = makeInput({ ...fullDay(), breakfastSkipped: true, now: at(TUE, "23:05") });
    const a = as(sched(input).nextUp, "take");
    expect(a.dose.rule.slug).toBe("anmum-daily");
    expect(a.dueAt).toEqual(at(TUE, "21:00"));
    expect(a.overdue).toBe(true);
  });

  it("0 of 1 early in the evening with nothing else left: Anmum shows at 9 PM, not overdue", () => {
    const input = makeInput({ ...fullDay(), breakfastSkipped: true, now: at(TUE, "20:00") });
    const a = as(sched(input).nextUp, "take");
    expect(a.dose.rule.slug).toBe("anmum-daily");
    expect(a.overdue).toBe(false);
  });

  it("with a minimum of 2, one serving still isn't enough", () => {
    const twice = rules.map((r) => (r.id === "r-anmum" ? { ...r, minPerDay: 2 } : r));
    const input = makeInput({ ...fullDay(), rules: twice, breakfastSkipped: true, doses: [...fullDay().doses, taken("r-anmum", at(TUE, "10:00"))], now: at(TUE, "23:05") });
    expect(as(sched(input).nextUp, "take").dose.key).toBe("anmum-daily#2");
    expect(sched(input).anmum[0]!.needsReminder).toBe(true);
  });

  it("an overdue Anmum never hides the bedtime dose she just tapped", () => {
    const f = fullDay();
    const input = makeInput({
      ...f,
      breakfastSkipped: true,
      doses: f.doses.filter((d) => d.ruleId !== "r-gav-bed"),
      bedtimeAt: at(TUE, "22:30"),
      now: at(TUE, "22:35"),
    });
    expect(as(sched(input).nextUp, "take").dose.rule.slug).toBe("gaviscon-bedtime");
  });

  it("skipping Anmum for the day clears the card and the nag, but the status still says so", () => {
    const skip: DoseLog = { ruleId: "r-anmum", occurrence: 1, status: "skipped", takenAt: null, snoozedUntil: null, reason: "nauseous" };
    const input = makeInput({ ...fullDay(), breakfastSkipped: true, doses: [...fullDay().doses, skip], now: at(TUE, "23:05") });
    const s = sched(input);
    expect(s.nextUp.type).toBe("all_done");
    expect(s.anmum[0]).toMatchObject({ taken: 0, skipped: true, needsReminder: false });
    expect(dose(input, "anmum-daily#1").reason).toBe("nauseous");
  });

  it("once taken, the day is complete", () => {
    const input = makeInput({ ...fullDay(), breakfastSkipped: true, doses: [...fullDay().doses, taken("r-anmum", at(TUE, "22:00"))], now: at(TUE, "23:05") });
    expect(sched(input).nextUp.type).toBe("all_done");
  });
});

describe("snoozes are respected everywhere", () => {
  it("a snoozed pre-meal Gaviscon pushes the meal prompt back", () => {
    const input = makeInput({ breakfastSkipped: true, doses: [snooze("r-gav-l", at(TUE, "10:30"))], now: at(TUE, "10:00") });
    const a = as(sched(input).nextUp, "prep_meal");
    expect(a.suggestedAt).toEqual(at(TUE, "10:30"));
  });

  it("a snoozed bedtime dose is due at the snooze end", () => {
    const input = makeInput({
      meals: [eaten("dinner", at(TUE, "19:00"))],
      breakfastSkipped: true,
      bedtimeAt: at(WED, "00:30"),
      doses: [taken("r-anmum", at(TUE, "15:00")), snooze("r-gav-bed", at(WED, "00:50"))],
      now: at(WED, "00:35"),
    });
    const s = sched(input);
    const bed = s.timeline.find((x) => x.key === "gaviscon-bedtime#1") as DoseItem;
    expect(bed.state).toBe("snoozed");
  });
});

describe("offsets come from data, not code", () => {
  const gav45 = rules.map((r) => (r.ruleType === "before_meal" ? { ...r, offsetMin: -45 } : r));

  it("an OB change to 45 min flows through the intent, the target and the copy", () => {
    const now = at(TUE, "10:00");
    const input = makeInput({ rules: gav45, breakfastSkipped: true, now });
    const intent = planMealIntent(input, "lunch");
    expect(intent.plannedAt).toEqual(at(TUE, "10:45"));

    const after = makeInput({ rules: gav45, breakfastSkipped: true, meals: [planned("lunch", intent.plannedAt)], doses: [taken("r-gav-l", now)], now });
    expect(dose(after, "gaviscon-before-lunch#1").targetAt).toEqual(now);
    expect(dose(after, "gaviscon-before-lunch#1").lateByMin).toBeNull();

    const prompt = sched(makeInput({ rules: gav45, breakfastSkipped: true, now: at(TUE, "09:00") })).nextUp;
    expect(describeNextUp(prompt, at(TUE, "09:00"), TZ).detail).toMatch(/eat in 45 min/);
  });

  it("without a pre-meal rule, the intent uses the household's lead-time setting", () => {
    const noGav = rules.filter((r) => r.id !== "r-gav-l");
    const intent = planMealIntent(makeInput({ rules: noGav, settings: { ...settings, mealLeadMin: 20 }, now: at(TUE, "11:00") }), "lunch");
    expect(intent.plannedAt).toEqual(at(TUE, "11:20"));
    expect(intent.preMealDose).toBeNull();
  });

  it("the shift buffer is a setting", () => {
    const input = makeInput({ date: MON, shift: MON_SHIFT, settings: { ...settings, shiftPrepMin: 60 }, now: at(MON, "15:00") });
    expect(meal(input, "dinner").window!.end).toEqual(at(MON, "18:00"));
  });
});

describe("lateness of a pre-meal dose", () => {
  it("eating earlier than planned does not make an on-time Gaviscon late", () => {
    const input = makeInput({
      breakfastSkipped: true,
      meals: [eaten("lunch", at(TUE, "12:10"), at(TUE, "12:30"))],
      doses: [taken("r-gav-l", at(TUE, "12:00"))],
      now: at(TUE, "12:15"),
    });
    const g = dose(input, "gaviscon-before-lunch#1");
    expect(g.targetAt).toEqual(at(TUE, "12:00"));
    expect(g.lateByMin).toBeNull();
    // …while Caltrate follows the actual meal time.
    expect(dose(input, "caltrate-after-lunch#1").targetAt).toEqual(at(TUE, "13:10"));
  });
});

describe("care-day edges", () => {
  it("03:59:59 belongs to the previous day; open doses become missed exactly at 04:00", () => {
    expect(careDateOf(new Date(at(WED, "04:00").getTime() - 1000), TZ, "04:00")).toBe(TUE);
    const before = makeInput({ breakfastSkipped: true, meals: [eaten("lunch", at(TUE, "11:00"))], now: new Date(at(WED, "04:00").getTime() - 1000) });
    expect(dose(before, "caltrate-after-lunch#1").state).toBe("due");
    expect(dose({ ...before, now: at(WED, "04:00") }, "caltrate-after-lunch#1").state).toBe("missed");
  });

  it("Monday's care day at 00:30 Tuesday still uses Monday's shift and deadline", () => {
    const input = makeInput({ date: MON, shift: MON_SHIFT, now: at(TUE, "00:30") });
    expect(sched(input).careDate).toBe(MON);
    expect(sched(input).anmum[0]!.deadline).toEqual(at(MON, "21:00"));
  });
});
