import { notFound } from "next/navigation";
import { demoAllowed } from "@/lib/demo/allowed";
import { HistoryPage } from "@/components/history/history-page";
import { AppFrame } from "@/components/shell/app-frame";
import { buildDaySchedule } from "@/lib/engine";
import { DEMO_DUE_DATE, demoPastDays } from "@/lib/demo/scenarios";
import { toHistoryView } from "@/lib/view/history";

// Development-only History with synthetic days. 404 in production.
export default function DevHistory() {
  if (!demoAllowed()) notFound();
  const days = demoPastDays().map((input) => ({ input, schedule: buildDaySchedule(input) }));
  return (
    <AppFrame hrefPrefix="/dev">
      <HistoryPage view={toHistoryView(days, DEMO_DUE_DATE)} hrefFor={(d) => `/dev/history/${d}`} emailNote="This page was emailed at 9:00 AM." />
    </AppFrame>
  );
}
