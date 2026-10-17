import "server-only";
import {
  buildDaySchedule,
  careDateOf,
  resolveShift,
  type CareDate,
  type DaySchedule,
  type EngineInput,
  type MealType,
} from "@/lib/engine";
import type { Household, Profile } from "@/lib/auth/session";
import type { createClient } from "@/lib/supabase/server";
import { parseHouseholdSettings, type HouseholdSettings } from "./settings";

type Client = Awaited<ReturnType<typeof createClient>>;

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);
const date = (t: string | null) => (t ? new Date(t) : null);

export interface LoadedDay {
  input: EngineInput;
  schedule: DaySchedule;
  settings: HouseholdSettings;
  careDayId: string | null;
  canLog: boolean;
}

// Loads one care day for the household (RLS-scoped) and runs the engine over it.
export async function loadDay(supabase: Client, household: Household, profile: Profile, now: Date, careDate?: CareDate): Promise<LoadedDay> {
  const settings = parseHouseholdSettings(household.tz, household.settings);
  const day = careDate ?? careDateOf(now, household.tz, settings.engine.careDayStarts);

  const [meds, rules, weekly, overrides, careDay] = await Promise.all([
    supabase.from("medications").select("*"),
    supabase.from("medication_rules").select("*"),
    supabase.from("work_schedule").select("*"),
    supabase.from("schedule_overrides").select("*").eq("date", day),
    supabase.from("care_days").select("*").eq("date", day).maybeSingle(),
  ]);
  for (const r of [meds, rules, weekly, overrides, careDay]) if (r.error) throw r.error;

  const careDayId = careDay.data?.id ?? null;
  const [meals, doses] = careDayId
    ? await Promise.all([
        supabase.from("meal_logs").select("*").eq("care_day_id", careDayId),
        supabase.from("dose_logs").select("*").eq("care_day_id", careDayId),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (meals.error) throw meals.error;
  if (doses.error) throw doses.error;

  const input: EngineInput = {
    settings: settings.engine,
    medications: meds.data!.map((m) => ({
      id: m.id,
      slug: m.slug,
      name: m.name,
      doseLabel: m.dose_label,
      color: m.color,
      spacingClass: m.spacing_class,
      active: m.active,
    })),
    rules: rules.data!.map((r) => ({
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
      weekly.data!.map((w) => ({ weekday: w.weekday, start: hhmm(w.start_time), end: hhmm(w.end_time) })),
      overrides.data!.map((o) => ({ date: o.date, isOff: o.is_off, start: hhmm(o.start_time), end: hhmm(o.end_time) })),
    ),
    careDay: {
      date: day,
      breakfastSkipped: careDay.data?.breakfast_skipped ?? false,
      bedtimeAt: date(careDay.data?.bedtime_at ?? null),
    },
    meals: meals.data!.map((m) => ({ type: m.type as MealType, plannedAt: date(m.planned_at), eatenAt: date(m.eaten_at) })),
    doses: doses.data!.map((d) => ({
      ruleId: d.rule_id,
      occurrence: d.occurrence,
      status: d.status,
      takenAt: date(d.taken_at),
      snoozedUntil: date(d.snoozed_until),
      reason: d.reason,
    })),
    now,
  };

  return {
    input,
    schedule: buildDaySchedule(input),
    settings,
    careDayId,
    canLog: profile.role === "patient" || settings.caregiverCanLog,
  };
}
