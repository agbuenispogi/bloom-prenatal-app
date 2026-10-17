"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/auth/action-state";
import { requireMember } from "@/lib/auth/session";
import type { Json } from "@/lib/supabase/database.types";
import { replanQuietly } from "@/lib/reminders/runtime";
import { createClient } from "@/lib/supabase/server";

// Settings writes. RLS limits every write to the member's household; these add validation and friendly errors.

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 17:00.");
const color = z.enum(["mint", "sky", "clay", "blush", "oat"]);
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "item";
const checkbox = (v: FormDataEntryValue | null) => v === "on";
const saved = (message = "Saved."): ActionState => ({ message });
const failed = (e: unknown, fallback = "That didn't save. Try again."): ActionState => {
  if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? fallback };
  console.error("settings action failed", e);
  return { error: fallback };
};

async function mergeHouseholdSettings(patch: Record<string, Json>) {
  const { household } = await requireMember();
  const supabase = await createClient();
  const current = (household.settings ?? {}) as Record<string, Json>;
  const { error } = await supabase.from("households").update({ settings: { ...current, ...patch } }).eq("id", household.id);
  if (error) throw error;
}

// ── Medications ─────────────────────────────────────────────────────────────────────────────────────

const ruleSchema = z
  .object({
    id: z.string().uuid(),
    label: z.string().trim().min(1, "Every timing needs a short label.").max(60),
    ruleType: z.enum(["before_meal", "after_meal", "fixed_time", "bedtime", "daily_count"]),
    anchor: z.enum(["breakfast", "lunch", "dinner", "snack"]).nullable(),
    minutes: z.coerce.number().int().min(0).max(720).nullable(),
    fixedTime: time.nullable(),
    minPerDay: z.coerce.number().int().min(0).max(10).nullable(),
    maxPerDay: z.coerce.number().int().min(1).max(10).nullable(),
    deadline: time.nullable(),
    active: z.boolean(),
  })
  .superRefine((r, ctx) => {
    if ((r.ruleType === "before_meal" || r.ruleType === "after_meal") && (!r.anchor || r.minutes === null)) ctx.addIssue({ code: "custom", message: "Choose a meal and minutes." });
    if (r.ruleType === "fixed_time" && !r.fixedTime) ctx.addIssue({ code: "custom", message: "Choose a time." });
    if (r.ruleType === "daily_count" && (r.minPerDay === null || r.maxPerDay === null || r.maxPerDay < r.minPerDay)) ctx.addIssue({ code: "custom", message: "Check the servings per day." });
  });

function ruleFromForm(form: FormData, id: string) {
  const g = (k: string) => {
    const v = form.get(`rule.${id}.${k}`);
    return v === null || v === "" ? null : String(v);
  };
  return ruleSchema.parse({
    id,
    label: g("label"),
    ruleType: g("ruleType"),
    anchor: g("anchor"),
    minutes: g("minutes"),
    fixedTime: g("fixedTime"),
    minPerDay: g("minPerDay"),
    maxPerDay: g("maxPerDay"),
    deadline: g("deadline"),
    active: checkbox(form.get(`rule.${id}.active`)),
  });
}

function ruleColumns(r: z.infer<typeof ruleSchema>) {
  const timed = r.ruleType === "before_meal" || r.ruleType === "after_meal";
  return {
    label: r.label,
    rule_type: r.ruleType,
    anchor: timed ? r.anchor : r.ruleType === "bedtime" ? ("bedtime" as const) : null,
    offset_min: timed ? (r.ruleType === "before_meal" ? -1 : 1) * (r.minutes ?? 0) : 0,
    fixed_time: r.ruleType === "fixed_time" ? r.fixedTime : null,
    min_per_day: r.ruleType === "daily_count" ? (r.minPerDay ?? 1) : 1,
    max_per_day: r.ruleType === "daily_count" ? (r.maxPerDay ?? 1) : 1,
    deadline: r.ruleType === "daily_count" ? r.deadline : null,
    active: r.active,
  };
}

export async function saveMedication(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireMember();
    const supabase = await createClient();
    const id = z.string().uuid().parse(form.get("id"));
    const med = z
      .object({ name: z.string().trim().min(1, "Give it a name.").max(80), doseLabel: z.string().trim().max(40), color, active: z.boolean() })
      .parse({ name: form.get("name"), doseLabel: form.get("doseLabel") ?? "", color: form.get("color"), active: checkbox(form.get("active")) });
    const ruleIds = form.getAll("ruleId").map(String);
    const rules = ruleIds.map((rid) => ruleFromForm(form, rid));

    const { error } = await supabase.from("medications").update({ name: med.name, dose_label: med.doseLabel, color: med.color, active: med.active }).eq("id", id);
    if (error) throw error;
    for (const r of rules) {
      const { error: e } = await supabase.from("medication_rules").update(ruleColumns(r)).eq("id", r.id).eq("medication_id", id);
      if (e) throw e;
    }
    await replanQuietly((await requireMember()).household.id);
    revalidatePath("/", "layout");
    return saved(`${med.name} saved.`);
  } catch (e) {
    return failed(e);
  }
}

export async function addMedication(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { household } = await requireMember();
    const supabase = await createClient();
    const name = z.string().trim().min(1, "Give it a name.").max(80).parse(form.get("name"));
    const doseLabel = z.string().trim().max(40).parse(form.get("doseLabel") ?? "");
    const tab = color.parse(form.get("color"));
    const r = ruleFromForm(form, "00000000-0000-4000-8000-000000000000");
    const slug = `${slugify(name)}-${Date.now().toString(36)}`;

    const { data: med, error } = await supabase
      .from("medications")
      .insert({ household_id: household.id, slug, name, dose_label: doseLabel, color: tab, sort: 50 })
      .select("id")
      .single();
    if (error) throw error;
    const { error: e } = await supabase
      .from("medication_rules")
      .insert({ household_id: household.id, medication_id: med.id, slug: `${slug}-1`, sort: 50, ...ruleColumns(r) });
    if (e) throw e;
    await replanQuietly((await requireMember()).household.id);
    revalidatePath("/", "layout");
    return saved(`${name} added. It appears on today's page.`);
  } catch (e) {
    return failed(e);
  }
}

// ── Shifts ──────────────────────────────────────────────────────────────────────────────────────────

export async function saveWeeklyShifts(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { household } = await requireMember();
    const supabase = await createClient();
    const rows = [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
      const off = checkbox(form.get(`off.${weekday}`));
      if (off) return { household_id: household.id, weekday, start_time: null, end_time: null };
      const start = time.parse(form.get(`start.${weekday}`));
      const endRaw = String(form.get(`end.${weekday}`) ?? "");
      const end = endRaw === "00:00" ? "24:00" : time.parse(endRaw); // a shift ending at midnight
      if (end !== "24:00" && end <= start) throw new z.ZodError([{ code: "custom", path: [], message: "A shift has to end after it starts (overnight shifts aren't supported yet)." }]);
      return { household_id: household.id, weekday, start_time: start, end_time: end };
    });
    const { error } = await supabase.from("work_schedule").upsert(rows, { onConflict: "household_id,weekday" });
    if (error) throw error;
    await replanQuietly((await requireMember()).household.id);
    revalidatePath("/", "layout");
    return saved("Shifts saved.");
  } catch (e) {
    return failed(e);
  }
}

export async function addOverride(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { household } = await requireMember();
    const supabase = await createClient();
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.").parse(form.get("date"));
    const off = checkbox(form.get("off"));
    const start = off ? null : time.parse(form.get("start"));
    const endRaw = off ? null : String(form.get("end") ?? "");
    const end = endRaw === "00:00" ? "24:00" : endRaw ? time.parse(endRaw) : null;
    if (!off && end && end !== "24:00" && start && end <= start) throw new z.ZodError([{ code: "custom", path: [], message: "The shift has to end after it starts." }]);
    const note = z.string().trim().max(80).parse(form.get("note") ?? "") || null;
    const { error } = await supabase
      .from("schedule_overrides")
      .upsert({ household_id: household.id, date, is_off: off, start_time: start, end_time: end, note }, { onConflict: "household_id,date" });
    if (error) throw error;
    await replanQuietly((await requireMember()).household.id);
    revalidatePath("/", "layout");
    return saved("Change saved for that day.");
  } catch (e) {
    return failed(e);
  }
}

export async function removeOverride(id: string): Promise<void> {
  await requireMember();
  const supabase = await createClient();
  await supabase.from("schedule_overrides").delete().eq("id", z.string().uuid().parse(id));
  await replanQuietly((await requireMember()).household.id);
  revalidatePath("/", "layout");
}

// ── Pregnancy, reminders, notifications ─────────────────────────────────────────────────────────────

export async function saveDueDate(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const raw = String(form.get("dueDate") ?? "");
    const due = raw ? z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(raw) : null;
    await mergeHouseholdSettings({ due_date: due });
    revalidatePath("/", "layout");
    return saved(due ? "Due date saved." : "Due date cleared.");
  } catch (e) {
    return failed(e);
  }
}

export async function saveReminderTimes(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const n = (k: string, min: number, max: number) => z.coerce.number().int().min(min).max(max).parse(form.get(k));
    await mergeHouseholdSettings({
      anmum_deadline: time.parse(form.get("anmumDeadline")),
      summary_time: time.parse(form.get("summaryTime")),
      bedtime_default: time.parse(form.get("bedtimeDefault")),
      nag_after_min: n("nagAfter", 5, 120),
      escalate_after_min: n("escalateAfter", 10, 240),
      iron_spacing_min: n("ironSpacing", 0, 360),
    });
    await replanQuietly((await requireMember()).household.id);
    revalidatePath("/", "layout");
    return saved("Reminder timing saved.");
  } catch (e) {
    return failed(e);
  }
}

export async function saveMyNotifications(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { profile } = await requireMember();
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ notify_push: checkbox(form.get("push")), notify_email: checkbox(form.get("email")) })
      .eq("id", profile.id);
    if (error) throw error;
    await replanQuietly(profile.household_id);
    revalidatePath("/settings", "layout");
    return saved("Your notifications are saved.");
  } catch (e) {
    return failed(e);
  }
}

export async function saveCaregiverLogging(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { profile } = await requireMember();
    if (profile.role !== "patient") return { error: "Only she can change this." };
    await mergeHouseholdSettings({ caregiver_can_log: checkbox(form.get("caregiverCanLog")) });
    revalidatePath("/", "layout");
    return saved("Saved.");
  } catch (e) {
    return failed(e);
  }
}

// Baby Snowflake: share the gentle streak line publicly. Her data, her choice: patient only.
export async function saveShareStreak(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { profile } = await requireMember();
    if (profile.role !== "patient") return { error: "Only she can change this." };
    const on = checkbox(form.get("shareStreak"));
    await mergeHouseholdSettings({ share_streak: on });
    revalidatePath("/settings", "layout");
    return saved(on ? "Baby Snowflake can now show your caring streak." : "Sharing is off. Baby Snowflake shows nothing from Bloom.");
  } catch (e) {
    return failed(e);
  }
}
