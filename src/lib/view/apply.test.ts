import { describe, expect, it } from "vitest";
import { buildDaySchedule, type EngineInput } from "@/lib/engine";
import { TUE, at, eaten, makeInput, taken } from "@/lib/engine/__tests__/fixtures";
import { applyAction, checkAction, inverseOf, labelOf } from "./apply";
import { toHomeView } from "./home";
import type { DayAction } from "./home";

// Applying an action and then its inverse must give back the same day.
function roundTrip(input: EngineInput, a: DayAction) {
  const now = input.now;
  const after = applyAction(input, a, now);
  const back = inverseOf(input, a, now).reduce((s, x) => applyAction(s, x, now), after);
  const norm = (i: EngineInput) => ({
    doses: [...i.doses].map((d) => ({ ...d, reason: d.reason ?? null })).sort((x, y) => (x.ruleId + x.occurrence).localeCompare(y.ruleId + y.occurrence)),
    meals: [...i.meals].sort((x, y) => (x.type + (x.eatenAt?.toISOString() ?? "")).localeCompare(y.type + (y.eatenAt?.toISOString() ?? ""))),
    careDay: i.careDay,
  });
  expect(norm(back)).toEqual(norm(input));
  return after;
}

const base = () => makeInput({ breakfastSkipped: true, meals: [eaten("lunch", at(TUE, "11:00"))], doses: [taken("r-gav-l", at(TUE, "10:30"))], now: at(TUE, "12:30") });

describe("manual logging, in any order", () => {
  it("logs a later dose before an earlier one (iron before Caltrate)", () => {
    const after = applyAction(base(), { type: "take", ruleId: "r-iron", occurrence: 1 }, at(TUE, "12:30"));
    const s = buildDaySchedule(after);
    expect(s.timeline.find((i) => i.kind === "dose" && i.key === "iron-folic-afternoon#1")).toMatchObject({ state: "done" });
    expect(s.timeline.find((i) => i.kind === "dose" && i.key === "caltrate-after-lunch#1")).toMatchObject({ state: "due" });
  });

  it("logs a dose at an earlier time", () => {
    const after = applyAction(base(), { type: "take", ruleId: "r-cal-l", occurrence: 1, time: "12:05" }, at(TUE, "12:30"));
    expect(after.doses.find((d) => d.ruleId === "r-cal-l")?.takenAt).toEqual(at(TUE, "12:05"));
  });

  it("marks a taken dose or an eaten meal as not done again", () => {
    const after = applyAction(base(), { type: "resetDose", ruleId: "r-gav-l", occurrence: 1 }, at(TUE, "12:30"));
    expect(after.doses.some((d) => d.ruleId === "r-gav-l")).toBe(false);
    const noLunch = applyAction(base(), { type: "resetMeal", meal: "lunch" }, at(TUE, "12:30"));
    expect(noLunch.meals.some((m) => m.type === "lunch")).toBe(false);
  });
});

describe("undo puts the day back exactly", () => {
  const actions: [string, DayAction][] = [
    ["take", { type: "take", ruleId: "r-cal-l", occurrence: 1 }],
    ["take earlier", { type: "take", ruleId: "r-iron", occurrence: 1, time: "12:00" }],
    ["re-take an already-taken dose", { type: "take", ruleId: "r-gav-l", occurrence: 1 }],
    ["snooze", { type: "snooze", ruleId: "r-cal-l", occurrence: 1, minutes: 10 }],
    ["skip", { type: "skip", ruleId: "r-cal-l", occurrence: 1, reason: "nauseous" }],
    ["reset a taken dose", { type: "resetDose", ruleId: "r-gav-l", occurrence: 1 }],
    ["eating soon (logs Gaviscon too)", { type: "intend", meal: "dinner" }],
    ["eat now", { type: "eat", meal: "dinner" }],
    ["un-eat lunch", { type: "resetMeal", meal: "lunch" }],
    ["un-skip breakfast", { type: "resetMeal", meal: "breakfast" }],
    ["snack", { type: "snack", time: "11:30" }],
    ["Anmum serving", { type: "serving", ruleId: "r-anmum" }],
    ["skip breakfast", { type: "skipBreakfast" }],
    ["going to bed", { type: "bed" }],
  ];
  for (const [name, a] of actions) it(name, () => roundTrip(base(), a));
});

describe("undo helpers", () => {
  it("removes a snack logged a few seconds apart from the server's clock", () => {
    const after = applyAction(base(), { type: "snack" }, at(TUE, "12:30"));
    const t = new Date(at(TUE, "12:30").getTime() + 20_000).toISOString();
    expect(applyAction(after, { type: "removeSnack", eatenAt: t }, at(TUE, "12:31")).meals.filter((m) => m.type === "snack")).toHaveLength(0);
  });

  it("refuses a time in the future or before the care day", () => {
    const now = at(TUE, "12:30");
    expect(checkAction(base(), { type: "eat", meal: "dinner", time: "18:00" }, now)).toMatch(/earlier today/);
    expect(checkAction(base(), { type: "take", ruleId: "r-iron", occurrence: 1, time: "12:00" }, now)).toBeNull();
  });

  it("names what was logged", () => {
    expect(labelOf(base(), { type: "take", ruleId: "r-iron", occurrence: 1 })).toMatch(/logged$/);
    expect(labelOf(base(), { type: "eat", meal: "dinner", time: "12:00" })).toBe("Dinner logged earlier");
    expect(labelOf(base(), { type: "putCareDay", breakfastSkipped: false, bedtimeAt: null })).toBeNull();
  });
});

describe("progress", () => {
  it("counts doses, main meals and minimum servings; items set aside with breakfast don't count", () => {
    const input = base();
    const v = toHomeView(input, buildDaySchedule(input), { dueDate: null, role: "patient", canLog: true });
    expect(v.progress.done).toBe(2); // lunch + Gaviscon before lunch
    expect(v.rows.some((r) => r.autoSkipped)).toBe(true);
    const after = applyAction(input, { type: "take", ruleId: "r-iron", occurrence: 1 }, input.now);
    expect(toHomeView(after, buildDaySchedule(after), { dueDate: null, role: "patient", canLog: true }).progress.done).toBe(3);
  });
});
