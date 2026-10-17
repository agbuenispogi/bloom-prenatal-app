import { describe, expect, it } from "vitest";
import { pregnancyWeek } from "./pregnancy";

describe("pregnancyWeek", () => {
  it("computes weeks + days from the due date", () => {
    expect(pregnancyWeek("2027-02-02", "2026-10-20")).toEqual({ weeks: 25, days: 0, daysToGo: 105 });
    expect(pregnancyWeek("2027-02-02", "2026-10-23")).toEqual({ weeks: 25, days: 3, daysToGo: 102 });
    expect(pregnancyWeek("2026-10-20", "2026-10-20")).toEqual({ weeks: 40, days: 0, daysToGo: 0 });
  });

  it("returns null when unknown or implausible", () => {
    expect(pregnancyWeek(null, "2026-10-20")).toBeNull();
    expect(pregnancyWeek("not-a-date", "2026-10-20")).toBeNull();
    expect(pregnancyWeek("2028-01-01", "2026-10-20")).toBeNull();
  });
});
