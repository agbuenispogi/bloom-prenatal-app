"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { careDayBounds, planMealIntent, wallTime, type DoseItem, type MainMeal } from "@/lib/engine";
import { requireMember } from "@/lib/auth/session";
import { loadDay, type LoadedDay } from "@/lib/data/day";
import { replanQuietly } from "@/lib/reminders/runtime";
import { createClient } from "@/lib/supabase/server";
import { actionSchema, dayActionsSchema } from "@/lib/view/action-schema";
import { SNACK_MATCH_MS } from "@/lib/view/apply";
import type { DayAction, DayActionResult } from "@/lib/view/home";

// One endpoint for every change to today's page. The screen has already applied the actions optimistically
// (src/lib/view/apply.ts); this saves them, then re-plans reminders AFTER the response so taps never wait.

type Ctx = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  day: LoadedDay;
  profileId: string;
  householdId: string;
  now: Date;
  careDayId: () => Promise<string>;
};

// "HH:mm" within the current care day → instant. Must not be in the future (a minute of slack for clocks).
function resolveTime(day: LoadedDay, now: Date, time?: string): Date {
  if (!time) return now;
  const { tz, careDayStarts } = day.input.settings;
  const at = wallTime(day.input.careDay.date, time, tz, careDayStarts);
  const { start } = careDayBounds(day.input.careDay.date, tz, careDayStarts);
  if (at < start || at.getTime() > now.getTime() + 60_000) throw new RangeError("time outside today");
  return at;
}

function findDose(day: LoadedDay, ruleId: string, occ: number): DoseItem | undefined {
  return day.schedule.timeline.find((i): i is DoseItem => i.kind === "dose" && i.rule.id === ruleId && i.occurrence === occ);
}

type DoseFields = { status: "taken" | "skipped" | "snoozed" | "pending" | "missed"; taken_at?: string | null; snoozed_until?: string | null; reason?: string | null };

async function putDose(ctx: Ctx, ruleId: string, occ: number, fields: DoseFields) {
  const item = findDose(ctx.day, ruleId, occ);
  const { error } = await ctx.supabase.from("dose_logs").upsert(
    {
      household_id: ctx.householdId,
      care_day_id: await ctx.careDayId(),
      rule_id: ruleId,
      occurrence: occ,
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

// "Not taken yet": the row stays but goes back to pending, which the schedule treats exactly like no log.
// An update, the same write as logging it, so Undo works wherever Done does.
async function resetDose(ctx: Ctx, ruleId: string, occ: number) {
  if (!ctx.day.careDayId) return;
  const { error } = await ctx.supabase
    .from("dose_logs")
    .update({ status: "pending", taken_at: null, snoozed_until: null, reason: null, logged_by: ctx.profileId })
    .eq("care_day_id", ctx.day.careDayId)
    .eq("rule_id", ruleId)
    .eq("occurrence", occ);
  if (error) throw error;
}

// meal_logs has a partial unique index (one per main meal), which PostgREST upsert can't target: read, then write.
// Fields left out keep their value; when neither time remains the row is deleted ("not eaten yet").
async function putMeal(ctx: Ctx, type: MainMeal, fields: { planned_at?: string | null; eaten_at?: string | null }) {
  const careDayId = await ctx.careDayId();
  const { data: existing, error: readError } = await ctx.supabase.from("meal_logs").select("id, planned_at, eaten_at").eq("care_day_id", careDayId).eq("type", type).maybeSingle();
  if (readError) throw readError;
  const planned = "planned_at" in fields ? (fields.planned_at ?? null) : (existing?.planned_at ?? null);
  const eaten = "eaten_at" in fields ? (fields.eaten_at ?? null) : (existing?.eaten_at ?? null);
  if (!planned && !eaten) {
    if (!existing) return;
    const { error } = await ctx.supabase.from("meal_logs").delete().eq("id", existing.id);
    if (error) throw error;
    return;
  }
  const { error } = existing
    ? await ctx.supabase.from("meal_logs").update({ planned_at: planned, eaten_at: eaten }).eq("id", existing.id)
    : await ctx.supabase.from("meal_logs").insert({ household_id: ctx.householdId, care_day_id: careDayId, type, planned_at: planned, eaten_at: eaten, logged_by: ctx.profileId });
  if (error) throw error;
}

async function updateCareDay(ctx: Ctx, fields: { breakfast_skipped?: boolean; bedtime_at?: string | null }) {
  const { error } = await ctx.supabase.from("care_days").update(fields).eq("id", await ctx.careDayId());
  if (error) throw error;
}

async function applyOne(ctx: Ctx, a: z.infer<typeof actionSchema>) {
  const nowIso = ctx.now.toISOString();
  const at = (time?: string) => resolveTime(ctx.day, ctx.now, time).toISOString();
  switch (a.type) {
    case "take":
      return putDose(ctx, a.ruleId, a.occurrence, { status: "taken", taken_at: at(a.time) });
    case "snooze":
      return putDose(ctx, a.ruleId, a.occurrence, { status: "snoozed", snoozed_until: new Date(ctx.now.getTime() + a.minutes * 60_000).toISOString() });
    case "skip":
      return putDose(ctx, a.ruleId, a.occurrence, { status: "skipped", reason: a.reason || null });
    case "resetDose":
      return resetDose(ctx, a.ruleId, a.occurrence);
    case "putDose":
      if (a.status === "pending") return resetDose(ctx, a.ruleId, a.occurrence);
      return putDose(ctx, a.ruleId, a.occurrence, { status: a.status, taken_at: a.takenAt, snoozed_until: a.snoozedUntil, reason: a.reason });
    case "intend": {
      const plan = planMealIntent(ctx.day.input, a.meal, a.minutes);
      await putMeal(ctx, a.meal, { planned_at: plan.plannedAt.toISOString() });
      if (plan.preMealDose) await putDose(ctx, plan.preMealDose.ruleId, plan.preMealDose.occurrence, { status: "taken", taken_at: nowIso });
      return;
    }
    case "eat":
      return putMeal(ctx, a.meal, { eaten_at: at(a.time) });
    case "resetMeal":
      await putMeal(ctx, a.meal, { planned_at: null, eaten_at: null });
      if (a.meal === "breakfast" && ctx.day.input.careDay.breakfastSkipped) await updateCareDay(ctx, { breakfast_skipped: false });
      return;
    case "putMeal":
      return putMeal(ctx, a.meal, { planned_at: a.plannedAt, eaten_at: a.eatenAt });
    case "snack": {
      const { error } = await ctx.supabase.from("meal_logs").insert({ household_id: ctx.householdId, care_day_id: await ctx.careDayId(), type: "snack", eaten_at: at(a.time), logged_by: ctx.profileId });
      if (error) throw error;
      return;
    }
    case "removeSnack": {
      // The screen's clock and the server's differ by a few seconds: remove the nearest snack within a couple of minutes.
      if (!ctx.day.careDayId) return;
      const { data: snacks, error } = await ctx.supabase.from("meal_logs").select("id, eaten_at").eq("care_day_id", ctx.day.careDayId).eq("type", "snack");
      if (error) throw error;
      const want = new Date(a.eatenAt).getTime();
      const target = (snacks ?? [])
        .filter((s) => s.eaten_at && Math.abs(new Date(s.eaten_at).getTime() - want) <= SNACK_MATCH_MS)
        .sort((x, y) => Math.abs(new Date(x.eaten_at!).getTime() - want) - Math.abs(new Date(y.eaten_at!).getTime() - want))[0];
      if (!target) return;
      const { error: delError } = await ctx.supabase.from("meal_logs").delete().eq("id", target.id);
      if (delError) throw delError;
      return;
    }
    case "skipBreakfast":
      return updateCareDay(ctx, { breakfast_skipped: true });
    case "bed":
      return updateCareDay(ctx, { bedtime_at: nowIso });
    case "putCareDay":
      return updateCareDay(ctx, { breakfast_skipped: a.breakfastSkipped, bedtime_at: a.bedtimeAt });
    case "serving": {
      const status = ctx.day.schedule.anmum.find((x) => x.rule.id === a.ruleId);
      if (!status?.canTakeMore) return;
      return putDose(ctx, a.ruleId, status.taken + 1, { status: "taken", taken_at: at(a.time) });
    }
  }
}

export async function runDayActions(raw: DayAction[]): Promise<DayActionResult> {
  const parsed = dayActionsSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("day action rejected", JSON.stringify(raw), parsed.error.issues);
    return { ok: false, error: "That didn't save. Please try again. (bad request)" };
  }

  const { profile, household } = await requireMember();
  const supabase = await createClient();
  const now = new Date();
  const day = await loadDay(supabase, household, profile, now);
  if (!day.canLog) return { ok: false, error: "Only she can log right now. She can allow you in Settings." };

  let cached = day.careDayId;
  const ctx: Ctx = {
    supabase,
    day,
    profileId: profile.id,
    householdId: household.id,
    now,
    careDayId: async () => {
      if (cached) return cached;
      const { data, error } = await supabase
        .from("care_days")
        .upsert({ household_id: household.id, date: day.input.careDay.date }, { onConflict: "household_id,date" })
        .select("id")
        .single();
      if (error) throw error;
      cached = data.id;
      return cached;
    },
  };

  try {
    for (const a of parsed.data) await applyOne(ctx, a);
  } catch (e) {
    if (e instanceof RangeError) return { ok: false, error: "Pick a time earlier today, not in the future." };
    console.error("day action failed", JSON.stringify(parsed.data), e);
    // A short code (e.g. 42501 = not allowed) so a screenshot is enough to tell what went wrong.
    const code = e && typeof e === "object" && "code" in e && e.code ? ` (${String(e.code)})` : "";
    return { ok: false, error: `That didn't save. Check your connection and try again.${code}` };
  }

  // Withdraw nags for what she just logged and schedule the next item's reminders, after the response is sent.
  after(() => replanQuietly(household.id));
  revalidatePath("/");
  return { ok: true };
}
