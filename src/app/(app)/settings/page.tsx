import { signOut } from "@/app/(auth)/actions";
import { SettingsHub } from "@/components/settings/settings-hub";
import { requireMember } from "@/lib/auth/session";
import { formatInTimeZone } from "date-fns-tz";
import { voice } from "@/components/settings/voice";
import { currentCareDate } from "@/lib/data/day";
import { parseHouseholdSettings } from "@/lib/data/settings";
import { pregnancyWeek } from "@/lib/pregnancy";

export const metadata = { title: "Settings · Bloom" };

export default async function Settings() {
  const { profile, household } = await requireMember();
  const s = parseHouseholdSettings(household.tz, household.settings);
  const v = voice(profile.role);
  const week = pregnancyWeek(s.dueDate, currentCareDate(household, new Date()));
  const due = s.dueDate ? `Due ${formatInTimeZone(new Date(`${s.dueDate}T12:00:00Z`), "UTC", "d MMMM yyyy")}${week ? ` · Week ${week.weeks}` : ""}` : null;
  return (
    <SettingsHub
      viewer={profile.role}
      items={[
        { href: "/settings/medications", title: "Medicines", detail: `What ${v.subjTakes} and when, as ${v.your} OB set it.` },
        { href: "/settings/shifts", title: "Work shifts", detail: `${v.Your} weekly shifts and one-off changes.` },
        { href: "/settings/pregnancy", title: "Pregnancy", detail: due ?? `Add ${v.your} due date to see the week.` },
        { href: "/settings/notifications", title: "Reminders", detail: "Alarms, emails, nags and the morning summary." },
        { href: "/onboarding", title: "Install & alarms", detail: "Add Bloom to the Home Screen and turn on alarms." },
        { href: "/settings/household", title: "Household", detail: `${household.name} · invites` },
      ]}
      footer={
        <form action={signOut} className="mt-4">
          <button type="submit" className="min-h-12 text-base text-ink underline">
            Sign out {profile.display_name}
          </button>
        </form>
      }
    />
  );
}
