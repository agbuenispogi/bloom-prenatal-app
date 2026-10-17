import { NotificationsForm } from "@/components/settings/notifications-form";
import { SettingsPage } from "@/components/settings/settings-page";
import { requireMember } from "@/lib/auth/session";
import { parseHouseholdSettings } from "@/lib/data/settings";
import { createClient } from "@/lib/supabase/server";
import { saveCaregiverLogging, saveMyNotifications, saveReminderTimes } from "../actions";

export const metadata = { title: "Reminders · Bloom" };

export default async function Notifications() {
  const { profile, household } = await requireMember();
  const s = parseHouseholdSettings(household.tz, household.settings);
  const supabase = await createClient();
  const { data: caregiver } = await supabase.from("profiles").select("display_name").eq("role", "caregiver").maybeSingle();
  return (
    <SettingsPage title="Reminders">
      <NotificationsForm
        role={profile.role}
        caregiverName={caregiver?.display_name ?? null}
        my={{ push: profile.notify_push, email: profile.notify_email }}
        times={{
          anmumDeadline: s.engine.anmumDeadline,
          summaryTime: s.summaryTime,
          bedtimeDefault: s.engine.bedtimeDefault,
          nagAfter: s.engine.nagAfterMin,
          escalateAfter: s.engine.escalateAfterMin,
          ironSpacing: s.engine.ironSpacingMin,
        }}
        caregiverCanLog={s.caregiverCanLog}
        saveMine={saveMyNotifications}
        saveTimes={saveReminderTimes}
        saveCaregiver={saveCaregiverLogging}
      />
    </SettingsPage>
  );
}
