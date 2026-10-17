import { describe, expect, it } from "vitest";
import { buildDaySchedule, type DoseLog } from "@/lib/engine";
import { MON, TUE, TZ, WED, at, eaten, makeInput, taken } from "@/lib/engine/__tests__/fixtures";
import { buildSummary, summaryDue } from "./daily";

const day = (date: string, next: string, extra: DoseLog[] = [], skip: string[] = []) => {
  const input = makeInput({
    date,
    breakfastSkipped: true,
    bedtimeAt: at(next, "00:40"),
    meals: [eaten("lunch", at(date, "11:00")), eaten("dinner", at(date, "19:00"))],
    doses: [
      taken("r-gav-l", at(date, "10:30")),
      taken("r-cal-l", at(date, "12:05")),
      taken("r-iron", at(date, "17:00")),
      taken("r-gav-d", at(date, "18:30")),
      taken("r-cal-d", at(date, "20:00")),
      taken("r-gav-bed", at(next, "00:42")),
    ]
      .filter((d) => !skip.includes(d.ruleId))
      .concat(extra),
    now: at(WED, "09:00"),
  });
  return { input, schedule: buildDaySchedule(input) };
};

describe("summaryDue", () => {
  it("is due from 9:00 Manila for the previous care day", () => {
    expect(summaryDue(at(WED, "08:59"), TZ, "04:00", "09:00")).toEqual({ due: false, careDate: TUE });
    expect(summaryDue(at(WED, "09:00"), TZ, "04:00", "09:00")).toEqual({ due: true, careDate: TUE });
  });

  it("just after midnight, 'yesterday' is still the day before, and it isn't due yet", () => {
    // 01:00 Wed is still Tuesday's care day, so the summary covers Monday and is due only from 9:00 Tuesday.
    expect(summaryDue(at(WED, "01:00"), TZ, "04:00", "09:00")).toEqual({ due: true, careDate: MON });
  });
});

describe("buildSummary", () => {
  it("lists every dose and meal with actual times, and the Anmum count", () => {
    const s = buildSummary([day(TUE, WED, [taken("r-anmum", at(TUE, "15:00"))]), day(MON, TUE, [taken("r-anmum", at(MON, "15:00"))])], "2027-02-05");
    expect(s).toMatchObject({ careDate: TUE, longLabel: "Tuesday, 20 October", pct: 100, streak: 2, anmumMissed: false, anmumLine: "Anmum Materna: 1 glass" });
    expect(s.tally).toBe("6 on time · none late, skipped or missed");
    expect(s.rows.map((r) => `${r.time} ${r.title} ${r.stateWord}`.trim())).toEqual([
      "Breakfast Skipped",
      "10:30 AM Gaviscon Taken",
      "11:00 AM Lunch Eaten",
      "12:05 PM Caltrate Taken",
      "5:00 PM Ferrous sulfate + Folic acid Taken",
      "6:30 PM Gaviscon Taken",
      "7:00 PM Dinner Eaten",
      "8:00 PM Caltrate Taken",
      "12:42 AM Gaviscon Taken",
    ]);
  });

  it("flags missing Anmum and shows missed and late doses plainly", () => {
    const late = taken("r-cal-l", at(TUE, "12:50"));
    const input = day(TUE, WED, [late], ["r-cal-d", "r-cal-l"]);
    const s = buildSummary([input], null);
    expect(s.anmumMissed).toBe(true);
    expect(s.anmumLine).toBe("Anmum Materna: not taken");
    expect(s.rows.find((r) => r.time === "8:00 PM")?.stateWord).toBe("Missed");
    expect(s.rows.find((r) => r.title === "Caltrate" && r.stateWord.includes("late"))?.stateWord).toBe("50 min late");
    expect(s.note).not.toMatch(/fail|forgot|should/i);
  });
});
