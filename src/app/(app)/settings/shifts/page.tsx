import { SettingsPage } from "@/components/settings/settings-page";
import { ShiftsForm } from "@/components/settings/shifts-form";
import { requireMember } from "@/lib/auth/session";
import { currentCareDate } from "@/lib/data/day";
import { toOverrides, toShiftDays } from "@/lib/data/settings-view";
import { createClient } from "@/lib/supabase/server";
import { addOverride, removeOverride, saveWeeklyShifts } from "../actions";

export const metadata = { title: "Work shifts · Bloom" };

export default async function Shifts() {
  const { household, profile } = await requireMember();
  const supabase = await createClient();
  const today = currentCareDate(household, new Date());
  const [weekly, overrides] = await Promise.all([
    supabase.from("work_schedule").select("*"),
    supabase.from("schedule_overrides").select("*").gte("date", today),
  ]);
  return (
    <SettingsPage title="Work shifts" intro={`${profile.role === "patient" ? "Your" : "Her"} meal and dose suggestions follow these.`}>
      <ShiftsForm weekly={toShiftDays(weekly.data ?? [])} overrides={toOverrides(overrides.data ?? [])} saveWeekly={saveWeeklyShifts} addOverride={addOverride} removeOverride={removeOverride} />
    </SettingsPage>
  );
}
