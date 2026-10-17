import { HistoryPage } from "@/components/history/history-page";
import { addDays } from "@/lib/engine";
import { requireMember } from "@/lib/auth/session";
import { formatInTimeZone } from "date-fns-tz";
import { currentCareDate, loadDays } from "@/lib/data/day";
import { parseHouseholdSettings } from "@/lib/data/settings";
import { emailEnabled } from "@/lib/reminders/channels";
import { createClient } from "@/lib/supabase/server";
import { toHistoryView } from "@/lib/view/history";

export const metadata = { title: "History · Bloom" };

export default async function History() {
  const { profile, household } = await requireMember();
  const supabase = await createClient();
  const now = new Date();
  const today = currentCareDate(household, now);
  const firstDay = currentCareDate(household, new Date(household.created_at));
  const from = [addDays(today, -30), firstDay].sort().at(-1)!;
  const yesterday = addDays(today, -1);
  const days = yesterday >= from ? await loadDays(supabase, household, profile, now, from, yesterday) : [];
  const view = toHistoryView(days, days[0]?.settings.dueDate ?? null);

  // The 9 AM email is the same page; say whether it has gone out.
  let emailNote: string | null = null;
  if (days[0]?.careDayId) {
    const { data: sent } = await supabase.from("daily_summaries").select("sent_at").eq("care_day_id", days[0].careDayId).maybeSingle();
    const summaryTime = parseHouseholdSettings(household.tz, household.settings).summaryTime;
    const how = emailEnabled() ? "emailed" : "sent to your phones";
    emailNote = sent?.sent_at
      ? `This page was ${how} at ${formatInTimeZone(new Date(sent.sent_at), household.tz, "h:mm a")}.`
      : `This page is ${how} each morning at ${formatInTimeZone(new Date(`2000-01-01T${summaryTime}:00Z`), "UTC", "h:mm a")}.`;
  }
  return <HistoryPage view={view} hrefFor={(d) => `/history/${d}`} emailNote={emailNote} />;
}
