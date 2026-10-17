"use client";

import { Settings2 } from "lucide-react";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { useEffect, useState } from "react";
import type { DayAction, DayActionResult, HomeView as View, NextUpView } from "@/lib/view/home";
import { INK_MS, NextUpCard } from "./next-up-card";
import { ServingsStrip } from "./servings-strip";
import { TodayPage } from "./today-page";

export function HomeView({ view, tz, run, settingsHref = "/settings/household" }: { view: View; tz: string; run: (a: DayAction) => Promise<DayActionResult>; settingsHref?: string }) {
  const nowLabel = formatInTimeZone(new Date(view.now), tz, "h:mm a");
  // While the check is being inked, keep showing the card she tapped; then the next item settles in.
  const [ink, setInk] = useState<{ view: NextUpView; label: string } | null>(null);
  useEffect(() => {
    if (!ink) return;
    const id = window.setTimeout(() => setInk(null), INK_MS);
    return () => window.clearTimeout(id);
  }, [ink]);
  const shown = ink?.view ?? view.nextUp;
  return (
    // Full-width wrapper clips the ribbon exactly at the page edge.
    <div className="w-full overflow-x-clip">
    <div className="mx-auto w-full max-w-[1120px] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="flex items-start justify-between gap-4 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 sm:px-6">
        <div>
          <h1 className="font-serif text-[1.75rem] leading-tight">{view.dateLabel}</h1>
          {view.weekLabel ? <p className="text-base text-ink-soft">{view.weekLabel}</p> : null}
        </div>
        <Link href={settingsHref} aria-label="Settings" className="-mr-2 flex size-12 items-center justify-center rounded-full text-ink-soft">
          <Settings2 aria-hidden className="size-6" />
        </Link>
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
          />
        </div>
        <TodayPage rows={view.rows} ribbonBefore={view.ribbonBefore} nowLabel={nowLabel}>
          <ServingsStrip servings={view.servings} canLog={view.canLog} run={run} />
        </TodayPage>
      </div>
    </div>
    </div>
  );
}
