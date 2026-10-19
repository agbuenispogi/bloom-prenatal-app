"use client";

import { runDayActions } from "@/app/actions/day";
import type { EngineInput } from "@/lib/engine";
import { HomeView } from "./home-view";
import { useDay, type ViewOpts } from "./use-day";

// Live Home: taps update the screen at once; runDayActions saves them and the server streams the saved day back.
export function HomeLive({ input, opts, tz }: { input: EngineInput; opts: ViewOpts; tz: string }) {
  const { view, run, toast, undo, dismiss } = useDay(input, opts, runDayActions);
  return <HomeView view={view} tz={tz} run={run} toast={toast} onUndo={undo} onDismiss={dismiss} calendarHref="/api/ics/next" />;
}
