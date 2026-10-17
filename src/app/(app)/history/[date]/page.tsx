import { notFound } from "next/navigation";
import { DayPage } from "@/components/history/day-page";
import { requireMember } from "@/lib/auth/session";
import { currentCareDate, loadDay } from "@/lib/data/day";
import { createClient } from "@/lib/supabase/server";
import { dayCard, dayRows } from "@/lib/view/history";

export default async function HistoryDay({ params }: PageProps<"/history/[date]">) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const { profile, household } = await requireMember();
  const now = new Date();
  if (date >= currentCareDate(household, now)) notFound();
  const supabase = await createClient();
  const day = await loadDay(supabase, household, profile, now, date);
  return <DayPage card={dayCard(day.input, day.schedule, day.settings.dueDate)} rows={dayRows(day.input, day.schedule)} backHref="/history" />;
}
