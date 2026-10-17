import { notFound } from "next/navigation";
import { demoAllowed } from "@/lib/demo/allowed";
import { DayPage } from "@/components/history/day-page";
import { AppFrame } from "@/components/shell/app-frame";
import { buildDaySchedule } from "@/lib/engine";
import { DEMO_DUE_DATE, demoPastDays } from "@/lib/demo/scenarios";
import { dayCard, dayRows } from "@/lib/view/history";

export default async function DevHistoryDay({ params }: PageProps<"/dev/history/[date]">) {
  if (!demoAllowed()) notFound();
  const { date } = await params;
  const input = demoPastDays().find((d) => d.careDay.date === date);
  if (!input) notFound();
  const schedule = buildDaySchedule(input);
  return (
    <AppFrame hrefPrefix="/dev">
      <DayPage card={dayCard(input, schedule, DEMO_DUE_DATE)} rows={dayRows(input, schedule)} backHref="/dev/history" />
    </AppFrame>
  );
}
