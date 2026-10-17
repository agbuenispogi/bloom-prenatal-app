import { notFound } from "next/navigation";
import { DayPage } from "@/components/history/day-page";
import { AppNav } from "@/components/shell/app-nav";
import { buildDaySchedule } from "@/lib/engine";
import { DEMO_DUE_DATE, demoPastDays } from "@/lib/demo/scenarios";
import { dayCard, dayRows } from "@/lib/view/history";

export default async function DevHistoryDay({ params }: PageProps<"/dev/history/[date]">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { date } = await params;
  const input = demoPastDays().find((d) => d.careDay.date === date);
  if (!input) notFound();
  const schedule = buildDaySchedule(input);
  return (
    <div className="relative flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <DayPage card={dayCard(input, schedule, DEMO_DUE_DATE)} rows={dayRows(input, schedule)} backHref="/dev/history" />
      <AppNav hrefPrefix="/dev" />
    </div>
  );
}
