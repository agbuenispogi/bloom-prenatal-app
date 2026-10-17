import { weekdayOf } from "./time";
import type { CareDate, Shift, ShiftOverride, WeeklyShift } from "./types";

// The shift for a care day: a per-date override wins over the weekly schedule. null = day off.
export function resolveShift(date: CareDate, weekly: WeeklyShift[], overrides: ShiftOverride[]): Shift | null {
  const override = overrides.find((o) => o.date === date);
  if (override) {
    if (override.isOff || !override.start || !override.end) return null;
    return { start: override.start, end: override.end };
  }
  const day = weekly.find((w) => w.weekday === weekdayOf(date));
  if (!day?.start || !day.end) return null;
  return { start: day.start, end: day.end };
}
