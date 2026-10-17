import "server-only";
import type { Household } from "@/lib/auth/session";
import { parseHouseholdSettings } from "@/lib/data/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { planHousehold } from "./runtime";
import type { ActionClaims } from "./token";

export type TokenAction = "taken" | "snooze";

// Logs Taken / Snooze 10m from a notification button. The token proves who it was sent to; the household's
// own rules still apply (a caregiver can log only when she allowed it).
export async function logFromToken(claims: ActionClaims, action: TokenAction, now: Date): Promise<{ ok: boolean; message: string }> {
  const admin = createAdminClient();
  const [{ data: household }, { data: profile }] = await Promise.all([
    admin.from("households").select("*").eq("id", claims.h).single(),
    admin.from("profiles").select("id, role, household_id").eq("id", claims.p).single(),
  ]);
  if (!household || !profile || profile.household_id !== household.id) return { ok: false, message: "This reminder is no longer valid." };
  const settings = parseHouseholdSettings(household.tz, household.settings);
  if (profile.role !== "patient" && !settings.caregiverCanLog) return { ok: false, message: "Open Bloom to see her page." };

  const { data: day, error: dayErr } = await admin
    .from("care_days")
    .upsert({ household_id: household.id, date: claims.d }, { onConflict: "household_id,date" })
    .select("id")
    .single();
  if (dayErr) throw dayErr;

  const fields =
    action === "taken"
      ? { status: "taken" as const, taken_at: now.toISOString(), snoozed_until: null }
      : { status: "snoozed" as const, taken_at: null, snoozed_until: new Date(now.getTime() + 10 * 60_000).toISOString() };
  const { error } = await admin.from("dose_logs").upsert(
    {
      household_id: household.id,
      care_day_id: day.id,
      rule_id: claims.r,
      occurrence: claims.o,
      target_at: new Date(claims.at).toISOString(),
      logged_by: profile.id,
      reason: null,
      ...fields,
    },
    { onConflict: "care_day_id,rule_id,occurrence" },
  );
  if (error) throw error;
  await planHousehold(admin, household as Household, now);
  return { ok: true, message: action === "taken" ? `${claims.t} logged.` : `Snoozed. Bloom will remind you again in 10 minutes.` };
}
