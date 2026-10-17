import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, careDateOf } from "@/lib/engine";
import type { Household } from "@/lib/auth/session";
import { loadDays } from "@/lib/data/day";
import { parseHouseholdSettings } from "@/lib/data/settings";
import { publicEnv } from "@/lib/env";
import { sendSummaryEmail } from "@/lib/reminders/senders";
import type { Database, Json } from "@/lib/supabase/database.types";
import { buildSummary, summaryDue } from "./daily";

type Admin = SupabaseClient<Database>;
const MAX_ATTEMPTS = 5;

// Runs every minute from the dispatcher. For each household whose summary time has passed: builds yesterday's
// page from the engine, stores the snapshot (History shows it), and emails it once to each member who wants email.
export async function summaryPass(admin: Admin, now: Date) {
  const { data: households, error } = await admin.from("households").select("*");
  if (error) throw error;
  const report: { household: string; careDate: string; result: string }[] = [];

  for (const h of households as Household[]) {
    const settings = parseHouseholdSettings(h.tz, h.settings);
    const { due, careDate } = summaryDue(now, h.tz, settings.engine.careDayStarts, settings.summaryTime);
    const firstDay = careDateOf(new Date(h.created_at), h.tz, settings.engine.careDayStarts);
    if (!due || careDate < firstDay) continue;

    const { data: day, error: dayErr } = await admin
      .from("care_days")
      .upsert({ household_id: h.id, date: careDate }, { onConflict: "household_id,date" })
      .select("id")
      .single();
    if (dayErr) throw dayErr;

    const { data: existing } = await admin.from("daily_summaries").select("id, sent_at, attempts").eq("care_day_id", day.id).maybeSingle();
    if (existing?.sent_at || (existing && existing.attempts >= MAX_ATTEMPTS)) continue;

    // Snapshot yesterday (with up to 30 days before it for the streak).
    const from = [addDays(careDate, -30), firstDay].sort().at(-1)!;
    const days = await loadDays(admin, h, null, now, from, careDate);
    const summary = buildSummary(days, settings.dueDate);
    const { error: upErr } = await admin.from("daily_summaries").upsert(
      { household_id: h.id, care_day_id: day.id, payload: summary as unknown as NonNullable<Json>, adherence_pct: summary.pct, streak: summary.streak },
      { onConflict: "care_day_id" },
    );
    if (upErr) throw upErr;

    // Claim it so overlapping runs never double-send.
    const staleClaim = new Date(now.getTime() - 2 * 60_000).toISOString();
    const { data: claimed } = await admin
      .from("daily_summaries")
      .update({ claimed_at: now.toISOString(), attempts: (existing?.attempts ?? 0) + 1 })
      .eq("care_day_id", day.id)
      .is("sent_at", null)
      .or(`claimed_at.is.null,claimed_at.lt.${staleClaim}`)
      .select("id");
    if (!claimed?.length) continue;

    const { data: people } = await admin.from("profiles").select("id, email, display_name, notify_email").eq("household_id", h.id);
    const recipients = (people ?? []).filter((p) => p.notify_email && p.email);
    const failures: string[] = [];
    for (const p of recipients) {
      try {
        await sendSummaryEmail({ email: p.email, displayName: p.display_name }, summary, publicEnv.appUrl(), `summary-${careDate}-${p.id}`);
      } catch (e) {
        failures.push(e instanceof Error ? e.message : "send failed");
      }
    }
    // Partial delivery counts as sent: retrying would email the others twice.
    const sent = failures.length < recipients.length || recipients.length === 0;
    await admin
      .from("daily_summaries")
      .update(sent ? { sent_at: now.toISOString(), last_error: failures[0] ?? null } : { claimed_at: null, last_error: failures[0] ?? "send failed" })
      .eq("care_day_id", day.id);
    report.push({ household: h.id, careDate, result: sent ? `sent to ${recipients.length - failures.length}/${recipients.length}` : "failed, will retry" });
  }
  return report;
}
