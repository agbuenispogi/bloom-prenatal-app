import "server-only";
import {
  addDays as addCareDays,
  buildDaySchedule,
  careDateOf,
  resolveShift,
  type CareDate,
  type DaySchedule,
  type EngineInput,
  type MealType,
} from "@/lib/engine";
import type { Household, Profile } from "@/lib/auth/session";
import type { Database } from "@/lib/supabase/database.types";
import type { createClient } from "@/lib/supabase/server";
import { parseHouseholdSettings, type HouseholdSettings } from "./settings";

type Client = Awaited<ReturnType<typeof createClient>>;
type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);
const date = (t: string | null) => (t ? new Date(t) : null);

export interface LoadedDay {
  input: EngineInput;
  schedule: DaySchedule;
  settings: HouseholdSettings;
  careDayId: string | null;
  canLog: boolean;
}

interface Regimen {
  meds: Row<"medications">[];
  rules: Row<"medication_rules">[];
  weekly: Row<"work_schedule">[];
}

async function loadRegimen(supabase: Client): Promise<Regimen> {
  const [meds, rules, weekly] = await Promise.all([
    supabase.from("medications").select("*"),
    supabase.from("medication_rules").select("*"),
    supabase.from("work_schedule").select("*"),
  ]);
  for (const r of [meds, rules, weekly]) if (r.error) throw r.error;
  return { meds: meds.data!, rules: rules.data!, weekly: weekly.data! };
}

function toInput(
  settings: HouseholdSettings,
  regimen: Regimen,
  day: CareDate,
  overrides: Row<"schedule_overrides">[],
  careDay: Row<"care_days"> | undefined,
  meals: Row<"meal_logs">[],
  doses: Row<"dose_logs">[],
  now: Date,
): EngineInput {
  return {
    settings: settings.engine,
    medications: regimen.meds.map((m) => ({
      id: m.id,
      slug: m.slug,
      name: m.name,
      doseLabel: m.dose_label,
      color: m.color,
      spacingClass: m.spacing_class,
      active: m.active,
    })),
    rules: regimen.rules.map((r) => ({
      id: r.id,
      medicationId: r.medication_id,
      slug: r.slug,
      label: r.label,
      ruleType: r.rule_type,
      anchor: r.anchor,
      offsetMin: r.offset_min,
      fixedTime: hhmm(r.fixed_time),
      minPerDay: r.min_per_day,
      maxPerDay: r.max_per_day,
      deadline: hhmm(r.deadline),
      active: r.active,
      sort: r.sort,
    })),
    shift: resolveShift(
      day,
      regimen.weekly.map((w) => ({ weekday: w.weekday, start: hhmm(w.start_time), end: hhmm(w.end_time) })),
      overrides.map((o) => ({ date: o.date, isOff: o.is_off, start: hhmm(o.start_time), end: hhmm(o.end_time) })),
    ),
    careDay: {
      date: day,
      breakfastSkipped: careDay?.breakfast_skipped ?? false,
      bedtimeAt: date(careDay?.bedtime_at ?? null),
    },
    meals: meals.map((m) => ({ type: m.type as MealType, plannedAt: date(m.planned_at), eatenAt: date(m.eaten_at) })),
    doses: doses.map((d) => ({
      ruleId: d.rule_id,
      occurrence: d.occurrence,
      status: d.status,
      takenAt: date(d.taken_at),
      snoozedUntil: date(d.snoozed_until),
      reason: d.reason,
    })),
    now,
  };
}

export function currentCareDate(household: Household, now: Date): CareDate {
  const settings = parseHouseholdSettings(household.tz, household.settings);
  return careDateOf(now, household.tz, settings.engine.careDayStarts);
}

// Loads care days `from`..`to` (inclusive) in a fixed number of queries and runs the engine over each.
export async function loadDays(supabase: Client, household: Household, profile: Profile, now: Date, from: CareDate, to: CareDate): Promise<LoadedDay[]> {
  const settings = parseHouseholdSettings(household.tz, household.settings);
  const [regimen, overrides, careDays] = await Promise.all([
    loadRegimen(supabase),
    supabase.from("schedule_overrides").select("*").gte("date", from).lte("date", to),
    supabase.from("care_days").select("*").gte("date", from).lte("date", to),
  ]);
  if (overrides.error) throw overrides.error;
  if (careDays.error) throw careDays.error;

  const ids = careDays.data.map((c) => c.id);
  const [meals, doses] = ids.length
    ? await Promise.all([
        supabase.from("meal_logs").select("*").in("care_day_id", ids),
        supabase.from("dose_logs").select("*").in("care_day_id", ids),
      ])
    : [{ data: [] as Row<"meal_logs">[], error: null }, { data: [] as Row<"dose_logs">[], error: null }];
  if (meals.error) throw meals.error;
  if (doses.error) throw doses.error;

  const canLog = profile.role === "patient" || settings.caregiverCanLog;
  const out: LoadedDay[] = [];
  for (let day = to; day >= from; day = addCareDays(day, -1)) {
    const careDay = careDays.data.find((c) => c.date === day);
    const input = toInput(
      settings,
      regimen,
      day,
      overrides.data.filter((o) => o.date === day),
      careDay,
      careDay ? meals.data!.filter((m) => m.care_day_id === careDay.id) : [],
      careDay ? doses.data!.filter((d) => d.care_day_id === careDay.id) : [],
      now,
    );
    out.push({ input, schedule: buildDaySchedule(input), settings, careDayId: careDay?.id ?? null, canLog });
  }
  return out; // newest first
}

// One care day (today by default).
export async function loadDay(supabase: Client, household: Household, profile: Profile, now: Date, careDate?: CareDate): Promise<LoadedDay> {
  const day = careDate ?? currentCareDate(household, now);
  const [loaded] = await loadDays(supabase, household, profile, now, day, day);
  return loaded!;
}
