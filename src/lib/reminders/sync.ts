import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Recipient } from "@/lib/engine";
import type { LoadedDay } from "@/lib/data/day";
import type { Database, Json } from "@/lib/supabase/database.types";
import { desiredReminders } from "./plan";

type Admin = SupabaseClient<Database>;

export async function householdRecipients(admin: Admin, householdId: string): Promise<Recipient[]> {
  const { data, error } = await admin.from("profiles").select("id, role, notify_push, notify_email").eq("household_id", householdId);
  if (error) throw error;
  return data.map((p) => ({ id: p.id, role: p.role, push: p.notify_push, email: p.notify_email }));
}

// Makes the unsent reminder rows for one care day match what the schedule wants right now:
// cancels the ones no longer wanted (dose logged, skipped, snoozed to a new time), revives ones wanted again,
// and inserts new ones. Idempotent: dedupe_key is unique.
export async function syncReminders(admin: Admin, householdId: string, day: LoadedDay, now: Date) {
  const recipients = await householdRecipients(admin, householdId);
  const desired = desiredReminders(day.input, day.schedule, recipients, now);
  const want = new Map(desired.map((d) => [d.dedupeKey, d]));

  const { data: existing, error } = await admin
    .from("reminders")
    .select("id, dedupe_key, cancelled_at")
    .eq("household_id", householdId)
    .is("sent_at", null)
    .like("dedupe_key", `${day.input.careDay.date}|%`);
  if (error) throw error;

  const cancel = existing.filter((e) => !e.cancelled_at && !want.has(e.dedupe_key)).map((e) => e.id);
  const revive = existing.filter((e) => e.cancelled_at && want.has(e.dedupe_key)).map((e) => e.id);
  const have = new Set(existing.map((e) => e.dedupe_key));
  const insert = desired.filter((d) => !have.has(d.dedupeKey));

  if (cancel.length) {
    const r = await admin.from("reminders").update({ cancelled_at: now.toISOString() }).in("id", cancel);
    if (r.error) throw r.error;
  }
  if (revive.length) {
    const r = await admin.from("reminders").update({ cancelled_at: null, claimed_at: null }).in("id", revive);
    if (r.error) throw r.error;
  }
  if (insert.length) {
    const r = await admin.from("reminders").upsert(
      insert.map((d) => ({
        household_id: householdId,
        kind: d.kind,
        recipient_id: d.recipientId,
        channel: d.channel,
        due_at: d.dueAt.toISOString(),
        dedupe_key: d.dedupeKey,
        payload: d.payload as unknown as NonNullable<Json>,
      })),
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    );
    if (r.error) throw r.error;
  }
  return { wanted: desired.length, inserted: insert.length, cancelled: cancel.length, revived: revive.length };
}
