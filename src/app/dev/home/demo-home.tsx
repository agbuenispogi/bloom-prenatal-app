"use client";

import { useCallback, useMemo, useState } from "react";
import { HomeView } from "@/components/day/home-view";
import { useDay } from "@/components/day/use-day";
import { AppFrame } from "@/components/shell/app-frame";
import type { EngineInput } from "@/lib/engine";
import { DEMO_DUE_DATE, SCENARIOS, type ScenarioKey } from "@/lib/demo/scenarios";
import { applyAction } from "@/lib/view/apply";
import type { DayAction, DayActionResult } from "@/lib/view/home";

// The demo's "server": applies the actions to the local day like runDayActions would, after a short network-like
// wait, and advances the scenario clock a minute so the next tap is later than the last.

export function DemoHome({ scenario, role, alarm = false }: { scenario: ScenarioKey; role: "patient" | "caregiver"; alarm?: boolean }) {
  const [input, setInput] = useState<EngineInput>(() => SCENARIOS[scenario].input());
  const opts = useMemo(() => ({ dueDate: DEMO_DUE_DATE, role, canLog: role === "patient" }), [role]);
  const save = useCallback(async (actions: DayAction[]): Promise<DayActionResult> => {
    await new Promise((r) => setTimeout(r, 400));
    setInput((cur) => {
      const now = new Date(cur.now.getTime() + 60_000);
      return actions.reduce((acc, a) => applyAction(acc, a, now), { ...cur, now });
    });
    return { ok: true };
  }, []);
  const { view, run, toast, undo, dismiss } = useDay(input, opts, save);
  return (
    <AppFrame hrefPrefix="/dev">
      <HomeView view={view} tz={input.settings.tz} run={run} toast={toast} onUndo={undo} onDismiss={dismiss} alarmNow={alarm} />
    </AppFrame>
  );
}
