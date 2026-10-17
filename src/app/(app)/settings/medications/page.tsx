import { MedicationsForm } from "@/components/settings/medications-form";
import { SettingsPage } from "@/components/settings/settings-page";
import { requireMember } from "@/lib/auth/session";
import { toMedData } from "@/lib/data/settings-view";
import { createClient } from "@/lib/supabase/server";
import { addMedication, saveMedication } from "../actions";

export const metadata = { title: "Medicines · Bloom" };

export default async function Medicines() {
  const { profile } = await requireMember();
  const supabase = await createClient();
  const [meds, rules] = await Promise.all([supabase.from("medications").select("*"), supabase.from("medication_rules").select("*")]);
  return (
    <SettingsPage title="Medicines" intro={`Change these only as ${profile.role === "patient" ? "your" : "her"} OB advises. Changes apply from the next dose.`}>
      <MedicationsForm meds={toMedData(meds.data ?? [], rules.data ?? [])} save={saveMedication} add={addMedication} viewer={profile.role} />
    </SettingsPage>
  );
}
