"use client";

import { formatInTimeZone } from "date-fns-tz";
import { Snowflake } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { DayAction, DayActionResult, HomeView as View, NextUpView, TimelineRow } from "@/lib/view/home";
import { AlarmPrompt } from "./alarm-prompt";
import { ItemSheet } from "./item-sheet";
import { LogMealSheet } from "./log-meal-sheet";
import { INK_MS, NextUpCard } from "./next-up-card";
import { ServingsStrip } from "./servings-strip";
import { TodayPage } from "./today-page";
import { UndoToast } from "./undo-toast";
import type { Toast } from "./use-day";

export function HomeView({
  view,
  tz,
  run,
  toast = null,
  onUndo = () => {},
  onDismiss = () => {},
  calendarHref,
  alarmNow = false,
}: {
  view: View;
  tz: string;
  run: (a: DayAction) => Promise<DayActionResult>;
  toast?: Toast | null;
  onUndo?: () => void;
  onDismiss?: () => void;
  calendarHref?: string;
  alarmNow?: boolean;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openRow: TimelineRow | null = view.rows.find((r) => r.key === openKey) ?? null;
  const closeSheet = useCallback(() => setOpenKey(null), []);
  const nowLabel = formatInTimeZone(new Date(view.now), tz, "h:mm a");
  // While the check is being inked, keep showing the card she tapped; then the next item settles in.
  const [ink, setInk] = useState<{ view: NextUpView; label: string } | null>(null);
  useEffect(() => {
    if (!ink) return;
    const id = window.setTimeout(() => setInk(null), INK_MS);
    return () => window.clearTimeout(id);
  }, [ink]);
  const shown = ink?.view ?? view.nextUp;

  // In-app alarm: when the next timed dose comes due while Bloom is open, ring once for it.
  const [alarmFor, setAlarmFor] = useState<string | null>(alarmNow && view.nextUp.kind === "take" ? view.nextUp.key : null);
  const [rung, setRung] = useState<Set<string>>(() => new Set(alarmNow ? [view.nextUp.key] : []));
  useEffect(() => {
    const n = view.nextUp;
    if (n.kind !== "take" || !n.at || rung.has(n.key)) return;
    const wait = new Date(n.at).getTime() - new Date(view.now).getTime();
    if (wait <= 0) return; // already due when the page opened: the card itself says so
    const id = window.setTimeout(() => {
      setRung((s) => new Set(s).add(n.key));
      setAlarmFor(n.key);
    }, Math.min(wait, 2 ** 31 - 1));
    return () => window.clearTimeout(id);
  }, [view.nextUp, view.now, rung]);
  return (
    // Full-width wrapper clips the ribbon exactly at the page edge.
    <div className="w-full overflow-x-clip">
    <div className="mx-auto w-full max-w-[1120px] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="flex items-start justify-between gap-4 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 sm:px-6">
        <div>
          <h1 className="font-serif text-[1.875rem] leading-tight">{view.dateLabel}</h1>
          {view.weekLabel ? <p className="mt-1.5 inline-flex rounded-full bg-lemon px-3 py-1 font-serif text-[0.9375rem] font-medium text-ink">{view.weekLabel}</p> : null}
          {view.snowflake ? (
            <a href={view.snowflake.href} target="_blank" rel="noopener" className="mt-1 inline-flex min-h-10 items-center gap-1.5 text-[0.9375rem] text-ink-soft underline decoration-rule underline-offset-4">
              <Snowflake aria-hidden className="size-4 shrink-0" />
              <span>
                Baby Snowflake{view.snowflake.week ? ` · Week ${view.snowflake.week}` : ""}: {view.snowflake.title}
              </span>
            </a>
          ) : null}
        </div>

      </header>

      <div className="grid gap-7 md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] md:items-start md:gap-10 md:px-6">
        <div className="px-3 md:sticky md:top-6 md:px-0">
          <NextUpCard
            key={shown.key}
            view={shown}
            serverNow={view.now}
            canLog={view.canLog}
            role={view.role}
            run={run}
            inked={ink?.label ?? null}
            onInk={(label) => setInk(label ? { view: view.nextUp, label } : null)}
            calendarHref={calendarHref}
          />
        </div>
        <TodayPage
          rows={view.rows}
          ribbonBefore={view.ribbonBefore}
          nowLabel={nowLabel}
          progress={view.progress}
          onOpen={view.canLog ? (row) => setOpenKey(row.key) : undefined}
          action={<LogMealSheet view={view} tz={tz} run={run} />}
        >
          <ServingsStrip servings={view.servings} canLog={view.canLog} run={run} />
        </TodayPage>
      </div>
      <ItemSheet row={openRow} tz={tz} now={view.now} run={run} onClose={closeSheet} />
      <UndoToast toast={toast} onUndo={onUndo} onDismiss={onDismiss} />
      {alarmFor && alarmFor === view.nextUp.key ? <AlarmPrompt view={view.nextUp} run={run} onClose={() => setAlarmFor(null)} /> : null}
    </div>
    </div>
  );
}
