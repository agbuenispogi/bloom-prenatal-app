import { describe, expect, it } from "vitest";
import { buildDaySchedule, gentleNote, streak, summarizeDay } from "..";
import type { DaySummary, DoseLog } from "..";
import { TUE, WED, at, eaten, makeInput, taken } from "./fixtures";

const fullDayDoses = (late = false): DoseLog[] => [
  taken("r-gav-l", at(TUE, "10:30")),
  taken("r-cal-l", at(TUE, late ? "12:40" : "12:00")),
  taken("r-iron", at(TUE, "17:00")),
  taken("r-gav-d", at(TUE, "18:30")),
  taken("r-cal-d", at(TUE, "20:00")),
  taken("r-gav-bed", at(TUE, "23:00")),
  taken("r-anmum", at(TUE, "15:00")),
];
const fullDay = (late = false) =>
  makeInput({
    breakfastSkipped: true,
    bedtimeAt: at(TUE, "23:00"),
    meals: [eaten("lunch", at(TUE, "11:00")), eaten("dinner", at(TUE, "19:00"))],
    doses: fullDayDoses(late),
    now: at(WED, "09:00"),
  });

describe("summarizeDay", () => {
  it("a perfect day: 6 scheduled (breakfast Gaviscon excluded), all on time, Anmum met", () => {
    const s = summarizeDay(buildDaySchedule(fullDay()));
    expect(s).toMatchObject({ scheduled: 6, onTime: 6, late: 0, missed: 0, open: 0, adherencePct: 100, anmumTaken: 1, anmumMissed: false, clean: true });
  });

  it("late doses count as taken but not on time", () => {
    const s = summarizeDay(buildDaySchedule(fullDay(true)));
    expect(s).toMatchObject({ onTime: 5, late: 1, adherencePct: 83, clean: true });
  });

  it("missed doses and missing Anmum after the day ends", () => {
    const input = fullDay();
    input.doses = input.doses.filter((d) => d.ruleId !== "r-cal-d" && d.ruleId !== "r-anmum");
    const s = summarizeDay(buildDaySchedule(input));
    expect(s).toMatchObject({ missed: 1, anmumTaken: 0, anmumMissed: true, clean: false });
  });

  it("a day still in progress has open doses and isn't clean yet", () => {
    const s = summarizeDay(buildDaySchedule(makeInput({ now: at(TUE, "09:00") })));
    expect(s.open).toBeGreaterThan(0);
    expect(s.clean).toBe(false);
  });
});

describe("streak and note", () => {
  const day = (clean: boolean, late = 0): DaySummary => ({ careDate: "x", scheduled: 6, onTime: 6 - late, late, skipped: 0, missed: clean ? 0 : 1, open: 0, adherencePct: 100, anmumTaken: 1, anmumMin: 1, anmumMissed: false, clean });

  it("counts consecutive clean days from the newest", () => {
    expect(streak([day(true), day(true), day(false), day(true)])).toBe(2);
    expect(streak([day(false), day(true)])).toBe(0);
  });

  it("is always gentle", () => {
    expect(gentleNote(day(true), 3)).toMatch(/3 days in a row/);
    expect(gentleNote(day(true, 1), 0)).toMatch(/Late still counts/);
    expect(gentleNote(day(false), 0)).toMatch(/fresh page/);
    for (const n of [gentleNote(day(false), 0), gentleNote({ ...day(false), missed: 4, anmumMissed: true }, 0)]) {
      expect(n).not.toMatch(/fail|forgot|should|bad/i);
    }
  });
});
