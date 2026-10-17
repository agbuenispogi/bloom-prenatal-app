import { fromZonedTime } from "date-fns-tz";
import type { DoseLog, EngineInput, EngineSettings, MealLog, Medication, MedicationRule, Shift, WeeklyShift } from "../types";

// Mirrors supabase/migrations/…_household_functions.sql (seed_household_defaults).
export const TZ = "Asia/Manila";

export const settings: EngineSettings = {
  tz: TZ,
  careDayStarts: "04:00",
  mealWindows: { breakfast: ["07:00", "10:00"], lunch: ["10:00", "12:00"], dinner: ["17:00", "22:00"] },
  bedtimeDefault: "01:00",
  mealLeadMin: 30,
  shiftPrepMin: 30,
  ironSpacingMin: 120,
  anmumDeadline: "21:00",
  lateGraceMin: 15,
  nagAfterMin: 15,
  escalateAfterMin: 30,
};

export const medications: Medication[] = [
  { id: "m-gav", slug: "gaviscon", name: "Gaviscon", doseLabel: "10 ml", color: "mint", spacingClass: "antacid", active: true },
  { id: "m-cal", slug: "caltrate", name: "Caltrate", doseLabel: "1 tablet", color: "sky", spacingClass: "calcium", active: true },
  { id: "m-iron", slug: "iron-folic", name: "Ferrous sulfate + Folic acid", doseLabel: "1 + 1 tablet", color: "clay", spacingClass: "iron", active: true },
  { id: "m-anmum", slug: "anmum", name: "Anmum Materna", doseLabel: "1 glass", color: "blush", spacingClass: null, active: true },
];

const rule = (r: Partial<MedicationRule> & Pick<MedicationRule, "id" | "medicationId" | "slug" | "label" | "ruleType" | "sort">): MedicationRule => ({
  anchor: null,
  offsetMin: 0,
  fixedTime: null,
  minPerDay: 1,
  maxPerDay: 1,
  deadline: null,
  active: true,
  ...r,
});

export const rules: MedicationRule[] = [
  rule({ id: "r-gav-b", medicationId: "m-gav", slug: "gaviscon-before-breakfast", label: "before breakfast", ruleType: "before_meal", anchor: "breakfast", offsetMin: -30, sort: 1 }),
  rule({ id: "r-gav-l", medicationId: "m-gav", slug: "gaviscon-before-lunch", label: "before lunch", ruleType: "before_meal", anchor: "lunch", offsetMin: -30, sort: 3 }),
  rule({ id: "r-cal-l", medicationId: "m-cal", slug: "caltrate-after-lunch", label: "after lunch", ruleType: "after_meal", anchor: "lunch", offsetMin: 60, sort: 5 }),
  rule({ id: "r-iron", medicationId: "m-iron", slug: "iron-folic-afternoon", label: "afternoon dose", ruleType: "fixed_time", fixedTime: "17:00", sort: 6 }),
  rule({ id: "r-gav-d", medicationId: "m-gav", slug: "gaviscon-before-dinner", label: "before dinner", ruleType: "before_meal", anchor: "dinner", offsetMin: -30, sort: 7 }),
  rule({ id: "r-cal-d", medicationId: "m-cal", slug: "caltrate-after-dinner", label: "after dinner", ruleType: "after_meal", anchor: "dinner", offsetMin: 60, sort: 9 }),
  rule({ id: "r-gav-bed", medicationId: "m-gav", slug: "gaviscon-bedtime", label: "at bedtime", ruleType: "bedtime", anchor: "bedtime", sort: 10 }),
  rule({ id: "r-anmum", medicationId: "m-anmum", slug: "anmum-daily", label: "once or twice a day", ruleType: "daily_count", minPerDay: 1, maxPerDay: 2, deadline: "21:00", sort: 11 }),
];

export const weekly: WeeklyShift[] = [
  { weekday: 0, start: null, end: null },
  { weekday: 1, start: "19:00", end: "24:00" },
  { weekday: 2, start: "14:00", end: "24:00" },
  { weekday: 3, start: "14:00", end: "24:00" },
  { weekday: 4, start: "14:00", end: "24:00" },
  { weekday: 5, start: "14:00", end: "24:00" },
  { weekday: 6, start: null, end: null },
];

// Week of 2026-10-19: Mon 19, Tue 20, … Sat 24, Sun 25.
export const MON = "2026-10-19";
export const TUE = "2026-10-20";
export const WED = "2026-10-21";
export const SAT = "2026-10-24";

/** Manila wall time → instant. `at(TUE, "13:30")`. */
export const at = (date: string, time: string) => fromZonedTime(`${date}T${time}:00`, TZ);

export const TUE_SHIFT: Shift = { start: "14:00", end: "24:00" };
export const MON_SHIFT: Shift = { start: "19:00", end: "24:00" };

export const taken = (ruleId: string, takenAt: Date, occurrence = 1): DoseLog => ({
  ruleId, occurrence, status: "taken", takenAt, snoozedUntil: null,
});
export const eaten = (type: MealLog["type"], eatenAt: Date, plannedAt: Date | null = null): MealLog => ({ type, eatenAt, plannedAt });
export const planned = (type: MealLog["type"], plannedAt: Date): MealLog => ({ type, eatenAt: null, plannedAt });

export function makeInput(over: Partial<Omit<EngineInput, "careDay">> & { date?: string; breakfastSkipped?: boolean; bedtimeAt?: Date | null } = {}): EngineInput {
  const date = over.date ?? TUE;
  return {
    settings: over.settings ?? settings,
    medications: over.medications ?? medications,
    rules: over.rules ?? rules,
    shift: over.shift === undefined ? TUE_SHIFT : over.shift,
    careDay: { date, breakfastSkipped: over.breakfastSkipped ?? false, bedtimeAt: over.bedtimeAt ?? null },
    meals: over.meals ?? [],
    doses: over.doses ?? [],
    now: over.now ?? at(date, "09:00"),
  };
}
