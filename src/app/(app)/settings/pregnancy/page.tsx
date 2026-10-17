import { PregnancyForm } from "@/components/settings/pregnancy-form";
import { SettingsPage } from "@/components/settings/settings-page";
import { requireMember } from "@/lib/auth/session";
import { currentCareDate } from "@/lib/data/day";
import { parseHouseholdSettings } from "@/lib/data/settings";
import { pregnancyWeek } from "@/lib/pregnancy";
import { fetchSnowflakeFeed, SNOWFLAKE_URL } from "@/lib/snowflake/feed";
import { saveDueDate, saveShareStreak } from "../actions";

export const metadata = { title: "Pregnancy · Bloom" };

export default async function Pregnancy() {
  const { household, profile } = await requireMember();
  const s = parseHouseholdSettings(household.tz, household.settings);
  const feed = await fetchSnowflakeFeed();
  const week = pregnancyWeek(s.dueDate ?? feed?.dueDate ?? null, currentCareDate(household, new Date()));
  return (
    <SettingsPage title="Pregnancy">
      <PregnancyForm dueDate={s.dueDate} weekLabel={week ? `Week ${week.weeks}${week.days ? `, day ${week.days}` : ""} · ${week.daysToGo} days to go` : null} save={saveDueDate} viewer={profile.role} snowflake={{ url: SNOWFLAKE_URL, siteDueDate: feed?.dueDate ?? null, shareStreak: s.shareStreak, saveShare: saveShareStreak }} />
    </SettingsPage>
  );
}
