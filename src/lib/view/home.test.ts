import { describe, expect, it } from "vitest";
import { buildDaySchedule } from "@/lib/engine";
import { TUE, at, makeInput, taken } from "@/lib/engine/__tests__/fixtures";
import { toHomeView } from "./home";

const view = (input: ReturnType<typeof makeInput>) => toHomeView(input, buildDaySchedule(input), { dueDate: null, role: "patient", canLog: true });
const timeOf = (v: ReturnType<typeof view>, key: string) => v.rows.find((r) => r.key === key)?.timeLabel;

describe("Today's suggested times", () => {
  it("at 9:08 with breakfast pending: breakfast first, lunch at least 3 h later, each Gaviscon right before its meal", () => {
    const v = view(makeInput({ now: at(TUE, "09:08") }));
    expect(v.rows.slice(0, 5).map((r) => `${r.timeLabel} ${r.title}${r.note ? ` (${r.note})` : ""}`)).toEqual([
      "9:08 AM Gaviscon (before breakfast)",
      "9:38 AM Breakfast",
      "12:08 PM Gaviscon (before lunch)",
      "12:38 PM Lunch",
      "1:38 PM Caltrate (after lunch)",
    ]);
  });

  it("with breakfast skipped, lunch keeps its usual window", () => {
    const v = view(makeInput({ breakfastSkipped: true, now: at(TUE, "08:00") }));
    expect(timeOf(v, "meal:lunch")).toBe("10:00 AM");
    expect(timeOf(v, "gaviscon-before-lunch#1")).toBe("9:30 AM");
  });

  it("dinner is never suggested earlier than 3 h after a late lunch suggestion", () => {
    const v = view(makeInput({ breakfastSkipped: true, doses: [taken("r-anmum", at(TUE, "10:00"))], now: at(TUE, "15:00") }));
    // lunch slipped → 15:30; dinner ≥ 18:30 instead of 17:00
    expect(timeOf(v, "meal:lunch")).toBe("3:30 PM");
    expect(timeOf(v, "meal:dinner")).toBe("6:30 PM");
    expect(timeOf(v, "gaviscon-before-dinner#1")).toBe("6:00 PM");
  });
});
