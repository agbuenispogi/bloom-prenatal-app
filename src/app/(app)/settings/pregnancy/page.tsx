import { PregnancyForm } from "@/components/settings/pregnancy-form";
import { SettingsPage } from "@/components/settings/settings-page";
import { requireMember } from "@/lib/auth/session";
import { currentCareDate } from "@/lib/data/day";
import { parseHouseholdSettings } from "@/lib/data/settings";
import { pregnancyWeek } from "@/lib/pregnancy";
import { saveDueDate } from "../actions";

export const metadata = { title: "Pregnancy · Bloom" };

export default async function Pregnancy() {
  const { household, profile } = await requireMember();
  const s = parseHouseholdSettings(household.tz, household.settings);
  const week = pregnancyWeek(s.dueDate, currentCareDate(household, new Date()));
  return (
    <SettingsPage title="Pregnancy">
      <PregnancyForm dueDate={s.dueDate} weekLabel={week ? `Week ${week.weeks}${week.days ? `, day ${week.days}` : ""} · ${week.daysToGo} days to go` : null} save={saveDueDate} viewer={profile.role} />
    </SettingsPage>
  );
}
