import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadDay } from "@/lib/data/day";
import { publicEnv } from "@/lib/env";
import type { Household } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { ClaimedReminder, DispatchDeps } from "./dispatch";
import type { ReminderPayload } from "./plan";
import { sendReminderEmail, sendWebPush } from "./senders";
import { syncReminders } from "./sync";
import { signAction } from "./token";

type Admin = SupabaseClient<Database, "bloom">;

export function cronSecret(): string {
  const s = process.env.CRON_SECRET;
  if (!s || s.length < 24) throw new Error("CRON_SECRET must be set (24+ chars)");
  return s;
}

// Re-plans today's reminders for every household (cheap at this scale: one or two households).
export async function planAll(admin: Admin, now: Date) {
  const { data: households, error } = await admin.from("households").select("*");
  if (error) throw error;
  const out = [];
  for (const h of households) {
    const day = await loadDay(admin, h as Household, null, now);
    out.push(await syncReminders(admin, h.id, day, now));
  }
  return out;
}

// Re-plans one household's current care day (after a log from the app or a notification button).
export async function planHousehold(admin: Admin, household: Household, now: Date) {
  const day = await loadDay(admin, household, null, now);
  return syncReminders(admin, household.id, day, now);
}

// Best-effort re-plan from a user action: never fails the action itself.
export async function replanQuietly(householdId: string) {
  if (!process.env.SUPABASE_SECRET_KEY) return;
  try {
    const admin = createAdminClient();
    const { data: h } = await admin.from("households").select("*").eq("id", householdId).single();
    if (h) await planHousehold(admin, h as Household, new Date());
  } catch (e) {
    console.error("reminder re-plan failed", e);
  }
}

export function realDispatchDeps(admin: Admin): DispatchDeps {
  const secret = cronSecret();
  return {
    now: () => new Date(),
    appUrl: publicEnv.appUrl(),
    claim: async (limit) => {
      const { data, error } = await admin.rpc("claim_due_reminders", { p_limit: limit });
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, payload: r.payload as unknown as ReminderPayload })) as ClaimedReminder[];
    },
    recipient: async (id) => {
      const { data } = await admin.from("profiles").select("email, display_name, role").eq("id", id).maybeSingle();
      return data ? { email: data.email, displayName: data.display_name, role: data.role } : null;
    },
    subscriptions: async (id) => {
      const { data } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("profile_id", id);
      return data ?? [];
    },
    sendPush: sendWebPush,
    removeSubscription: async (id) => void (await admin.from("push_subscriptions").delete().eq("id", id)),
    markSubscriptionOk: async (id, at) => void (await admin.from("push_subscriptions").update({ last_success_at: at.toISOString() }).eq("id", id)),
    sendEmail: sendReminderEmail,
    markSent: async (id, at, note) => void (await admin.from("reminders").update({ sent_at: at.toISOString(), last_error: note ?? null }).eq("id", id)),
    markFailed: async (id, error) => void (await admin.from("reminders").update({ last_error: error, claimed_at: null }).eq("id", id)),
    markCancelled: async (id, at, reason) => void (await admin.from("reminders").update({ cancelled_at: at.toISOString(), last_error: reason }).eq("id", id)),
    actionToken: (r: ClaimedReminder) => {
      const p = r.payload;
      if (!p.ruleId || !p.occurrence) return null;
      const at = new Date(r.due_at).getTime();
      return signAction({ h: r.household_id, p: r.recipient_id, d: p.careDate, r: p.ruleId, o: p.occurrence, t: p.title.replace(/^Time for |^Still time for /, ""), at, exp: at + 12 * 3_600_000 }, secret);
    },
  };
}
