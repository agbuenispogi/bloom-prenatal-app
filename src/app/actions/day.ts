"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { careDayBounds, planMealIntent, wallTime, type DoseItem, type MainMeal } from "@/lib/engine";
import { requireMember } from "@/lib/auth/session";
import { loadDay, type LoadedDay } from "@/lib/data/day";
import { replanQuietly } from "@/lib/reminders/runtime";
import { createClient } from "@/lib/supabase/server";

// Every action re-reads the day on the server, authorizes, writes, and revalidates Home.
// Reminder rows (push/email/nag/escalation) are planned here in Phase 5.

import type { DayActionResult } from "@/lib/view/home";

const mainMeal = z.enum(["breakfast", "lunch", "dinner"]);
const ruleRef = z.object({ ruleId: z.string().uuid(), occurrence: z.number().int().min(1).max(10) });

async function withDay(work: (ctx: { supabase: Awaited<ReturnType<typeof createClient>>; day: LoadedDay; profileId: string; householdId: string; now: Date; careDayId: () => Promise<string> }) => Promise<void>): Promise<DayActionResult> {
  const { profile, household } = await requireMember();
  const supabase = await createClient();
  const now = new Date();
  const day = await loadDay(supabase, household, profile, now);
  if (!day.canLog) return { ok: false, error: "Only she can log doses right now. She can allow you in Settings." };

  let cached = day.careDayId;
  const careDayId = async () => {
    if (cached) return cached;
    const { data, error } = await supabase
      .from("care_days")
      .upsert({ household_id: household.id, date: day.input.careDay.date }, { onConflict: "household_id,date" })
      .select("id")
      .single();
    if (error) throw error;
    cached = data.id;
    return cached;
  };

  try {
    await work({ supabase, day, profileId: profile.id, householdId: household.id, now, careDayId });
  } catch (e) {
    if (e instanceof RangeError) return { ok: false, error: "Pick a time earlier today, not in the future." };
    console.error("day action failed", e);
    return { ok: false, error: "That didn't save. Check your connection and try again." };
  }
  // Withdraw nags for what she just logged and schedule the next item's reminders (target: under 2 s).
  await replanQuietly(household.id);
  revalidatePath("/");
  return { ok: true };
}

function findDose(day: LoadedDay, ruleId: string, occurrence: number): DoseItem | undefined {
  return day.schedule.timeline.find((i): i is DoseItem => i.kind === "dose" && i.rule.id === ruleId && i.occurrence === occurrence);
}

async function upsertDose(
  ctx: Parameters<Parameters<typeof withDay>[0]>[0],
  ruleId: string,
  occurrence: number,
  fields: { status: "taken" | "skipped" | "snoozed"; taken_at?: string | null; snoozed_until?: string | null; reason?: string | null },
) {
  const item = findDose(ctx.day, ruleId, occurrence);
  const { error } = await ctx.supabase.from("dose_logs").upsert(
    {
      household_id: ctx.householdId,
      care_day_id: await ctx.careDayId(),
      rule_id: ruleId,
      occurrence,
      target_at: item?.targetAt && !item.estimated ? item.targetAt.toISOString() : null,
      logged_by: ctx.profileId,
      taken_at: null,
      snoozed_until: null,
      reason: null,
      ...fields,
    },
    { onConflict: "care_day_id,rule_id,occurrence" },
  );
  if (error) throw error;
}

export async function takeDose(ref: { ruleId: string; occurrence: number }): Promise<DayActionResult> {
  const { ruleId, occurrence } = ruleRef.parse(ref);
  return withDay(async (ctx) => {
    await upsertDose(ctx, ruleId, occurrence, { status: "taken", taken_at: ctx.now.toISOString() });
  });
}

export async function snoozeDose(ref: { ruleId: string; occurrence: number; minutes: number }): Promise<DayActionResult> {
  const { ruleId, occurrence } = ruleRef.parse(ref);
  const minutes = z.union([z.literal(10), z.literal(20), z.literal(30)]).parse(ref.minutes);
  return withDay(async (ctx) => {
    const until = new Date(ctx.now.getTime() + minutes * 60_000);
    await upsertDose(ctx, ruleId, occurrence, { status: "snoozed", snoozed_until: until.toISOString() });
  });
}

export async function skipDose(ref: { ruleId: string; occurrence: number; reason?: string }): Promise<DayActionResult> {
  const { ruleId, occurrence } = ruleRef.parse(ref);
  const reason = z.string().trim().max(200).optional().parse(ref.reason) || null;
  return withDay(async (ctx) => {
    await upsertDose(ctx, ruleId, occurrence, { status: "skipped", reason });
  });
}

// One more serving of an any-time item (Anmum).
export async function logServing(ref: { ruleId: string }): Promise<DayActionResult> {
  const ruleId = z.string().uuid().parse(ref.ruleId);
  return withDay(async (ctx) => {
    const status = ctx.day.schedule.anmum.find((a) => a.rule.id === ruleId);
    if (!status?.canTakeMore) return;
    await upsertDose(ctx, ruleId, status.taken + 1, { status: "taken", taken_at: ctx.now.toISOString() });
  });
}

async function upsertMainMeal(ctx: Parameters<Parameters<typeof withDay>[0]>[0], meal: MainMeal, fields: { planned_at?: string; eaten_at?: string }) {
  const careDayId = await ctx.careDayId();
  // meal_logs has a partial unique index (one per main meal), which PostgREST upsert can't target: read, then write.
  const { data: existing, error: readError } = await ctx.supabase
    .from("meal_logs")
    .select("id")
    .eq("care_day_id", careDayId)
    .eq("type", meal)
    .maybeSingle();
  if (readError) throw readError;
  const { error } = existing
    ? await ctx.supabase.from("meal_logs").update(fields).eq("id", existing.id)
    : await ctx.supabase.from("meal_logs").insert({ household_id: ctx.householdId, care_day_id: careDayId, type: meal, logged_by: ctx.profileId, ...fields });
  if (error) throw error;
}

// "I'm eating in ~30 min": logs the pre-meal dose now and plans the meal.
export async function intendMeal(ref: { meal: MainMeal; minutes?: number }): Promise<DayActionResult> {
  const meal = mainMeal.parse(ref.meal);
  const minutes = z.number().int().min(0).max(180).optional().parse(ref.minutes);
  return withDay(async (ctx) => {
    const plan = planMealIntent(ctx.day.input, meal, minutes);
    await upsertMainMeal(ctx, meal, { planned_at: plan.plannedAt.toISOString() });
    if (plan.preMealDose) {
      await upsertDose(ctx, plan.preMealDose.ruleId, plan.preMealDose.occurrence, { status: "taken", taken_at: ctx.now.toISOString() });
    }
  });
}

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

// "HH:mm" within the current care day → instant. Must not be in the future (a minute of slack for clocks).
function resolveTime(day: LoadedDay, now: Date, time?: string): Date {
  if (!time) return now;
  const { tz, careDayStarts } = day.input.settings;
  const at = wallTime(day.input.careDay.date, hhmm.parse(time), tz, careDayStarts);
  const { start } = careDayBounds(day.input.careDay.date, tz, careDayStarts);
  if (at < start || at.getTime() > now.getTime() + 60_000) throw new RangeError("time outside today");
  return at;
}

export async function eatMeal(ref: { meal: MainMeal; time?: string }): Promise<DayActionResult> {
  const meal = mainMeal.parse(ref.meal);
  return withDay(async (ctx) => {
    const at = resolveTime(ctx.day, ctx.now, ref.time);
    await upsertMainMeal(ctx, meal, { eaten_at: at.toISOString() });
  });
}

export async function logSnack(ref: { time?: string } = {}): Promise<DayActionResult> {
  return withDay(async (ctx) => {
    const at = resolveTime(ctx.day, ctx.now, ref.time);
    const { error } = await ctx.supabase.from("meal_logs").insert({
      household_id: ctx.householdId,
      care_day_id: await ctx.careDayId(),
      type: "snack",
      eaten_at: at.toISOString(),
      logged_by: ctx.profileId,
    });
    if (error) throw error;
  });
}

export async function skipBreakfast(): Promise<DayActionResult> {
  return withDay(async (ctx) => {
    const { error } = await ctx.supabase.from("care_days").update({ breakfast_skipped: true }).eq("id", await ctx.careDayId());
    if (error) throw error;
  });
}

export async function goingToBed(): Promise<DayActionResult> {
  return withDay(async (ctx) => {
    const { error } = await ctx.supabase.from("care_days").update({ bedtime_at: ctx.now.toISOString() }).eq("id", await ctx.careDayId());
    if (error) throw error;
  });
}
