import { HistoryPage } from "@/components/history/history-page";
import { addDays } from "@/lib/engine";
import { requireMember } from "@/lib/auth/session";
import { currentCareDate, loadDays } from "@/lib/data/day";
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
  return <HistoryPage view={view} hrefFor={(d) => `/history/${d}`} />;
}
