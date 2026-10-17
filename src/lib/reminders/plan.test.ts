import { describe, expect, it } from "vitest";
import { buildDaySchedule, type DoseLog, type Recipient } from "@/lib/engine";
import { TUE, WED, at, eaten, makeInput, planned, taken } from "@/lib/engine/__tests__/fixtures";
import { desiredReminders } from "./plan";

const people: Recipient[] = [
  { id: "wife", role: "patient", push: true, email: true },
  { id: "ag", role: "caregiver", push: true, email: true },
];
const desired = (input: ReturnType<typeof makeInput>) => desiredReminders(input, buildDaySchedule(input), people, input.now);
const lunch = () => ({ breakfastSkipped: true, meals: [eaten("lunch", at(TUE, "12:42"))], doses: [taken("r-gav-l", at(TUE, "12:12")), taken("r-anmum", at(TUE, "10:00"))] as DoseLog[] });

describe("desiredReminders", () => {
  it("logging lunch plans Caltrate at +60: due push+email to both, nag push to both, escalation email to the caregiver", () => {
    const rows = desired(makeInput({ ...lunch(), now: at(TUE, "12:45") })).filter((r) => r.payload.itemKey === "caltrate-after-lunch#1");
    expect(rows.map((r) => `${r.kind}:${r.recipientId}:${r.channel}`).sort()).toEqual(
      ["due:ag:email", "due:ag:push", "due:wife:email", "due:wife:push", "escalation:ag:email", "nag:ag:push", "nag:wife:push"].sort(),
    );
    expect(rows.find((r) => r.kind === "due")!.dueAt).toEqual(at(TUE, "13:42"));
    expect(rows.find((r) => r.kind === "due")!.payload).toMatchObject({ title: "Time for Caltrate · 1 tablet", body: "After lunch · 1:42 PM", actionable: true });
  });

  it("once Caltrate is taken, none of its reminders are wanted (sync cancels the pending ones)", () => {
    const l = lunch();
    const rows = desired(makeInput({ ...l, doses: [...l.doses, taken("r-cal-l", at(TUE, "13:40"))], now: at(TUE, "13:41") }));
    expect(rows.some((r) => r.payload.itemKey === "caltrate-after-lunch#1")).toBe(false);
  });

  it("a snooze moves every reminder to the new time (new dedupe keys)", () => {
    const l = lunch();
    const before = desired(makeInput({ ...l, now: at(TUE, "13:42") })).filter((r) => r.payload.itemKey === "caltrate-after-lunch#1");
    const snoozed: DoseLog = { ruleId: "r-cal-l", occurrence: 1, status: "snoozed", takenAt: null, snoozedUntil: at(TUE, "13:52") };
    const after = desired(makeInput({ ...l, doses: [...l.doses, snoozed], now: at(TUE, "13:42") })).filter((r) => r.payload.itemKey === "caltrate-after-lunch#1");
    expect(after.find((r) => r.kind === "due")!.dueAt).toEqual(at(TUE, "13:52"));
    expect(after.some((r) => before.map((b) => b.dedupeKey).includes(r.dedupeKey))).toBe(false);
  });

  it("estimated items get no reminders, except one quiet bedtime push to her", () => {
    const rows = desired(makeInput({ breakfastSkipped: true, doses: [taken("r-anmum", at(TUE, "10:00"))], now: at(TUE, "09:00") }));
    expect(rows.some((r) => r.payload.itemKey.startsWith("gaviscon-before-lunch"))).toBe(false);
    const bed = rows.filter((r) => r.payload.itemKey === "gaviscon-bedtime#1");
    expect(bed).toHaveLength(1);
    expect(bed[0]).toMatchObject({ kind: "due", recipientId: "wife", channel: "push" });
    expect(bed[0]!.dueAt).toEqual(at(WED, "01:00"));
  });

  it("the fixed-time iron dose is planned even if nothing was logged", () => {
    const rows = desired(makeInput({ now: at(TUE, "09:00") }));
    expect(rows.some((r) => r.payload.itemKey === "iron-folic-afternoon#1" && r.kind === "due" && r.dueAt.getTime() === at(TUE, "17:00").getTime())).toBe(true);
  });

  it("'eating in ~30 min' plans a time-to-eat push for her", () => {
    const rows = desired(makeInput({ breakfastSkipped: true, meals: [planned("lunch", at(TUE, "11:00"))], doses: [taken("r-gav-l", at(TUE, "10:30"))], now: at(TUE, "10:31") }));
    expect(rows.filter((r) => r.kind === "eat_nudge").map((r) => [r.recipientId, r.channel, r.dueAt.toISOString()])).toEqual([["wife", "push", at(TUE, "11:00").toISOString()]]);
  });

  it("Anmum: a push to both at 21:00 while below the minimum, gone once taken", () => {
    const none = desired(makeInput({ now: at(TUE, "20:00") })).filter((r) => r.kind === "anmum");
    expect(none.map((r) => r.recipientId)).toEqual(["wife", "ag"]);
    expect(desired(makeInput({ doses: [taken("r-anmum", at(TUE, "15:00"))], now: at(TUE, "20:00") })).some((r) => r.kind === "anmum")).toBe(false);
  });

  it("never plans anything already in the past (nothing stale fires)", () => {
    const rows = desired(makeInput({ ...lunch(), now: at(TUE, "14:20") }));
    expect(rows.every((r) => r.dueAt.getTime() > at(TUE, "14:18").getTime())).toBe(true);
    // The escalation at 14:12 is past; the dose is overdue but nothing re-fires.
    expect(rows.some((r) => r.payload.itemKey === "caltrate-after-lunch#1")).toBe(false);
  });
});
