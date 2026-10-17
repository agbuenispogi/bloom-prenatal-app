// Synthetic demo data for /dev/home (development only): the seeded regimen and a few moments of a Tuesday.
// Never shown in production; mirrors supabase seed_household_defaults.
import { fromZonedTime } from "date-fns-tz";
import type { DoseLog, EngineInput, MealLog, Medication, MedicationRule } from "@/lib/engine";

const TZ = "Asia/Manila";
export const DEMO_DUE_DATE = "2027-02-05";
const TUE = "2026-10-20";
const WED = "2026-10-21";
export const at = (date: string, time: string) => fromZonedTime(`${date}T${time}:00`, TZ);

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const M = { gav: id(1), cal: id(2), iron: id(3), anmum: id(4) };
const R = { gavB: id(11), gavL: id(12), calL: id(13), iron: id(14), gavD: id(15), calD: id(16), bed: id(17), anmum: id(18) };

const medications: Medication[] = [
  { id: M.gav, slug: "gaviscon", name: "Gaviscon", doseLabel: "10 ml", color: "mint", spacingClass: "antacid", active: true },
  { id: M.cal, slug: "caltrate", name: "Caltrate", doseLabel: "1 tablet", color: "sky", spacingClass: "calcium", active: true },
  { id: M.iron, slug: "iron-folic", name: "Ferrous sulfate + Folic acid", doseLabel: "1 + 1 tablet", color: "clay", spacingClass: "iron", active: true },
  { id: M.anmum, slug: "anmum", name: "Anmum Materna", doseLabel: "1 glass", color: "blush", spacingClass: null, active: true },
];
const rule = (r: Partial<MedicationRule> & Pick<MedicationRule, "id" | "medicationId" | "slug" | "label" | "ruleType" | "sort">): MedicationRule => ({
  anchor: null, offsetMin: 0, fixedTime: null, minPerDay: 1, maxPerDay: 1, deadline: null, active: true, ...r,
});
const rules: MedicationRule[] = [
  rule({ id: R.gavB, medicationId: M.gav, slug: "gaviscon-before-breakfast", label: "before breakfast", ruleType: "before_meal", anchor: "breakfast", offsetMin: -30, sort: 1 }),
  rule({ id: R.gavL, medicationId: M.gav, slug: "gaviscon-before-lunch", label: "before lunch", ruleType: "before_meal", anchor: "lunch", offsetMin: -30, sort: 3 }),
  rule({ id: R.calL, medicationId: M.cal, slug: "caltrate-after-lunch", label: "after lunch", ruleType: "after_meal", anchor: "lunch", offsetMin: 60, sort: 5 }),
  rule({ id: R.iron, medicationId: M.iron, slug: "iron-folic-afternoon", label: "afternoon dose", ruleType: "fixed_time", fixedTime: "17:00", sort: 6 }),
  rule({ id: R.gavD, medicationId: M.gav, slug: "gaviscon-before-dinner", label: "before dinner", ruleType: "before_meal", anchor: "dinner", offsetMin: -30, sort: 7 }),
  rule({ id: R.calD, medicationId: M.cal, slug: "caltrate-after-dinner", label: "after dinner", ruleType: "after_meal", anchor: "dinner", offsetMin: 60, sort: 9 }),
  rule({ id: R.bed, medicationId: M.gav, slug: "gaviscon-bedtime", label: "at bedtime", ruleType: "bedtime", anchor: "bedtime", sort: 10 }),
  rule({ id: R.anmum, medicationId: M.anmum, slug: "anmum-daily", label: "once or twice a day", ruleType: "daily_count", minPerDay: 1, maxPerDay: 2, deadline: "21:00", sort: 11 }),
];

const taken = (ruleId: string, t: Date, occurrence = 1): DoseLog => ({ ruleId, occurrence, status: "taken", takenAt: t, snoozedUntil: null });
const ate = (type: MealLog["type"], t: Date, plannedAt: Date | null = null): MealLog => ({ type, eatenAt: t, plannedAt });

function base(now: Date, extra: Partial<EngineInput> & { breakfastSkipped?: boolean; bedtimeAt?: Date | null } = {}): EngineInput {
  return {
    settings: {
      tz: TZ, careDayStarts: "04:00",
      mealWindows: { breakfast: ["07:00", "10:00"], lunch: ["10:00", "12:00"], dinner: ["17:00", "22:00"] },
      bedtimeDefault: "01:00", ironSpacingMin: 120, anmumDeadline: "21:00", lateGraceMin: 15,
      nagAfterMin: 15, escalateAfterMin: 30, mealLeadMin: 30, shiftPrepMin: 30,
    },
    medications, rules,
    shift: { start: "14:00", end: "24:00" },
    careDay: { date: TUE, breakfastSkipped: extra.breakfastSkipped ?? false, bedtimeAt: extra.bedtimeAt ?? null },
    meals: extra.meals ?? [],
    doses: extra.doses ?? [],
    now,
  };
}

const lunchDone = { meals: [ate("lunch", at(TUE, "11:40"), at(TUE, "11:40"))], doses: [taken(R.gavL, at(TUE, "11:10")), taken(R.calL, at(TUE, "12:44"))] };

export const SCENARIOS = {
  morning: { label: "Morning, nothing logged", input: () => base(at(TUE, "09:05")) },
  caltrate: { label: "Caltrate due after lunch", input: () => base(at(TUE, "12:31"), { breakfastSkipped: true, meals: [ate("lunch", at(TUE, "11:42"), at(TUE, "11:40"))], doses: [taken(R.gavL, at(TUE, "11:10")), taken(R.anmum, at(TUE, "10:20"))] }) },
  overdue: { label: "Caltrate overdue", input: () => base(at(TUE, "13:25"), { breakfastSkipped: true, meals: [ate("lunch", at(TUE, "11:42"))], doses: [taken(R.gavL, at(TUE, "11:12"))] }) },
  afternoon: { label: "Afternoon, dinner next", input: () => base(at(TUE, "15:10"), { breakfastSkipped: true, ...lunchDone }) },
  night: { label: "After midnight, bedtime", input: () => base(at(WED, "00:20"), { breakfastSkipped: true, meals: [...lunchDone.meals, ate("dinner", at(TUE, "19:30"), at(TUE, "19:30"))], doses: [...lunchDone.doses, taken(R.iron, at(TUE, "17:05")), taken(R.gavD, at(TUE, "19:00")), { ruleId: R.calD, occurrence: 1, status: "skipped", takenAt: null, snoozedUntil: null, reason: "felt full" }, taken(R.anmum, at(TUE, "16:00"))] }) },
  anmum: { label: "9:30 PM, no Anmum yet", input: () => base(at(TUE, "21:30"), { breakfastSkipped: true, meals: [...lunchDone.meals, ate("dinner", at(TUE, "18:00"), at(TUE, "18:00"))], doses: [...lunchDone.doses, taken(R.iron, at(TUE, "17:00")), taken(R.gavD, at(TUE, "17:30")), taken(R.calD, at(TUE, "19:10"))] }) },
  done: { label: "All done", input: () => base(at(WED, "01:30"), { breakfastSkipped: true, bedtimeAt: at(WED, "01:10"), meals: [...lunchDone.meals, ate("dinner", at(TUE, "18:00"), at(TUE, "18:00"))], doses: [...lunchDone.doses, taken(R.iron, at(TUE, "17:00")), taken(R.gavD, at(TUE, "17:30")), taken(R.calD, at(TUE, "19:10")), taken(R.anmum, at(TUE, "15:00")), taken(R.anmum, at(TUE, "22:00"), 2), taken(R.bed, at(WED, "01:12"))] }) },
} as const;

export type ScenarioKey = keyof typeof SCENARIOS;
