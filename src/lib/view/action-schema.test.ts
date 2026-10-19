import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { EngineInput } from "@/lib/engine";
import { TUE, at, eaten, makeInput, taken } from "@/lib/engine/__tests__/fixtures";
import { dayActionsSchema } from "./action-schema";
import { applyAction, inverseOf } from "./apply";
import type { DayAction } from "./home";

// Production ids are UUIDs: give the fixture's rules real ones.
function withUuids(input: EngineInput): EngineInput {
  const ids = new Map(input.rules.map((r) => [r.id, randomUUID()]));
  return {
    ...input,
    rules: input.rules.map((r) => ({ ...r, id: ids.get(r.id)! })),
    doses: input.doses.map((d) => ({ ...d, ruleId: ids.get(d.ruleId) ?? d.ruleId })),
  };
}

describe("every action the screen sends, and its Undo, passes the server's validation", () => {
  const input = withUuids(
    makeInput({ meals: [eaten("lunch", at(TUE, "11:00"))], doses: [taken("r-gav-l", at(TUE, "10:30"))], now: at(TUE, "19:41") }),
  );
  const rule = (slug: string) => input.rules.find((r) => r.slug === slug)!.id;
  const anmum = input.rules.find((r) => r.ruleType === "daily_count")!.id;
  const actions: DayAction[] = [
    { type: "take", ruleId: rule("caltrate-after-lunch"), occurrence: 1 },
    { type: "take", ruleId: rule("caltrate-after-lunch"), occurrence: 1, time: "19:00" },
    { type: "take", ruleId: input.doses[0]!.ruleId, occurrence: 1 }, // already taken: Undo puts the old time back
    { type: "snooze", ruleId: rule("caltrate-after-lunch"), occurrence: 1, minutes: 10 },
    { type: "skip", ruleId: rule("caltrate-after-lunch"), occurrence: 1, reason: "felt full" },
    { type: "resetDose", ruleId: input.doses[0]!.ruleId, occurrence: 1 },
    { type: "intend", meal: "dinner" },
    { type: "eat", meal: "dinner" },
    { type: "eat", meal: "lunch", time: "11:30" },
    { type: "resetMeal", meal: "lunch" },
    { type: "snack" },
    { type: "snack", time: "15:00" },
    { type: "skipBreakfast" },
    { type: "bed" },
    { type: "serving", ruleId: anmum },
  ];

  for (const a of actions) {
    it(`${a.type}${"time" in a && a.time ? " (earlier)" : ""}`, () => {
      expect(dayActionsSchema.safeParse([a]).success).toBe(true);
      const undo = inverseOf(input, a, input.now);
      expect(undo.length).toBeGreaterThan(0);
      const r = dayActionsSchema.safeParse(undo);
      expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
      // And the Undo of the Undo (Undo of a removed snack) is valid too.
      const after = applyAction(input, a, input.now);
      for (const u of undo) expect(dayActionsSchema.safeParse(inverseOf(after, u, input.now)).success).toBe(true);
    });
  }
});
