import { notFound } from "next/navigation";
import { HistoryPage } from "@/components/history/history-page";
import { AppNav } from "@/components/shell/app-nav";
import { buildDaySchedule } from "@/lib/engine";
import { DEMO_DUE_DATE, demoPastDays } from "@/lib/demo/scenarios";
import { toHistoryView } from "@/lib/view/history";

// Development-only History with synthetic days. 404 in production.
export default function DevHistory() {
  if (process.env.NODE_ENV === "production") notFound();
  const days = demoPastDays().map((input) => ({ input, schedule: buildDaySchedule(input) }));
  return (
    <div className="relative flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <HistoryPage view={toHistoryView(days, DEMO_DUE_DATE)} hrefFor={(d) => `/dev/history/${d}`} emailNote="This page was emailed at 9:00 AM." />
      <AppNav hrefPrefix="/dev" />
    </div>
  );
}
