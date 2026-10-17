import { describe, expect, it } from "vitest";
import { buildDaySchedule, describeNextUp, planAnmumReminder, planEatNudge } from "..";
import type { DoseItem, EngineInput, MedicationRule, NextAction } from "..";
import { parseHHmm } from "../time";
import { TUE, TZ, WED, at, eaten, makeInput, rules, taken } from "./fixtures";

const doseKeys = (input: EngineInput) =>
  buildDaySchedule(input).timeline.filter((i): i is DoseItem => i.kind === "dose").map((d) => d.key);

describe("regimen changes from the OB (data, not code)", () => {
  const snackRule: MedicationRule = {
    id: "r-gav-s", medicationId: "m-gav", slug: "gaviscon-after-snack", label: "after a snack", ruleType: "after_meal",
    anchor: "snack", offsetMin: 15, fixedTime: null, minPerDay: 1, maxPerDay: 1, deadline: null, active: true, sort: 12,
  };

  it("a snack-anchored rule waits for a snack, then follows the latest one", () => {
    const none = buildDaySchedule(makeInput({ rules: [...rules, snackRule], now: at(TUE, "15:00") }));
    const pending = none.timeline.find((i) => i.key === "gaviscon-after-snack#1") as DoseItem;
    expect(pending.targetAt).toBeNull();
    expect(pending.state).toBe("upcoming");

    const withSnacks = makeInput({
      rules: [...rules, snackRule],
      meals: [eaten("snack", at(TUE, "22:30")), eaten("snack", at(TUE, "15:00"))],
      now: at(TUE, "22:31"),
    });
    const s = buildDaySchedule(withSnacks);
    expect((s.timeline.find((i) => i.key === "gaviscon-after-snack#1") as DoseItem).targetAt).toEqual(at(TUE, "22:45"));
    // Snacks are listed in the order they were eaten.
    expect(s.timeline.filter((i) => i.kind === "meal" && i.meal === "snack").map((i) => i.key)).toEqual(["snack#1", "snack#2"]);
  });

  it("two doses at the same time keep the configured order", () => {
    const folicSplit: MedicationRule = { ...rules.find((r) => r.id === "r-iron")!, id: "r-folic", slug: "folic-afternoon", sort: 5 };
    const keys = doseKeys(makeInput({ rules: [...rules, folicSplit] }));
    expect(keys.indexOf("folic-afternoon#1")).toBeLessThan(keys.indexOf("iron-folic-afternoon#1"));
  });

  it("an explicit 'missed' status is respected", () => {
    const input = makeInput({ doses: [{ ruleId: "r-iron", occurrence: 1, status: "missed", takenAt: null, snoozedUntil: null }], now: at(TUE, "18:00") });
    expect((buildDaySchedule(input).timeline.find((i) => i.key === "iron-folic-afternoon#1") as DoseItem).state).toBe("missed");
  });

  it("without a pre-meal rule, the meal prompt is just 'log it when you eat'", () => {
    const noGav = rules.filter((r) => r.id !== "r-gav-l");
    const a = buildDaySchedule(makeInput({ rules: noGav, breakfastSkipped: true, now: at(TUE, "11:00") })).nextUp;
    expect(a.type).toBe("prep_meal");
    expect(describeNextUp(a, at(TUE, "11:00"), TZ)).toEqual({ title: "Lunch next", detail: "Log it when you eat", why: null });
  });
});

describe("copy", () => {
  it("suggests a time when the meal window hasn't opened yet", () => {
    const now = at(TUE, "08:00");
    const a = buildDaySchedule(makeInput({ breakfastSkipped: true, now })).nextUp;
    expect(describeNextUp(a, now, TZ).detail).toBe("Take Gaviscon now → eat in 30 min. Suggested around 9:30 AM");
  });

  it("'time to eat' once the planned time arrives, and a calm all-done", () => {
    const eat: NextAction = { type: "eat", meal: "dinner", at: at(TUE, "18:00") };
    expect(describeNextUp(eat, at(TUE, "18:01"), TZ).title).toBe("Time to eat dinner");
    expect(describeNextUp({ type: "all_done" }, at(WED, "01:00"), TZ).title).toBe("All done for today");
  });

  it("a dose due right now says 'Take it now'", () => {
    const input = makeInput({ breakfastSkipped: true, meals: [eaten("lunch", at(TUE, "11:00"))], doses: [taken("r-gav-l", at(TUE, "10:30"))], now: at(TUE, "12:05") });
    const a = buildDaySchedule(input).nextUp;
    expect(describeNextUp(a, input.now, TZ).detail).toBe("Take it now");
  });
});

describe("other reminders", () => {
  const people = [
    { id: "wife", role: "patient" as const, push: true, email: true },
    { id: "ag", role: "caregiver" as const, push: true, email: true },
  ];

  it("the 'time to eat' nudge goes to her only, by push", () => {
    const plan = planEatNudge(TUE, "lunch", at(TUE, "11:00"), people);
    expect(plan.map((r) => [r.kind, r.recipientId, r.channel])).toEqual([["eat_nudge", "wife", "push"]]);
  });

  it("the Anmum reminder goes to both by push", () => {
    const plan = planAnmumReminder(TUE, "anmum-daily", at(TUE, "21:00"), people);
    expect(plan.map((r) => r.recipientId)).toEqual(["wife", "ag"]);
  });
});

describe("time parsing", () => {
  it.each(["25:00", "24:30", "7", "ab:cd", "12:60"])("rejects %s", (bad) => {
    expect(() => parseHHmm(bad)).toThrow();
  });

  it("accepts Postgres 'time' strings with seconds", () => {
    expect(parseHHmm("17:00:00")).toBe(17 * 60);
  });
});
