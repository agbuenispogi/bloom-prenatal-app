"use client";

import { useMemo, useState } from "react";
import { HomeView } from "@/components/day/home-view";
import { AppNav } from "@/components/shell/app-nav";
import { buildDaySchedule, planMealIntent, wallTime, type EngineInput } from "@/lib/engine";
import { DEMO_DUE_DATE, SCENARIOS, type ScenarioKey } from "@/lib/demo/scenarios";
import { toHomeView, type DayAction, type DayActionResult } from "@/lib/view/home";

// Applies an action to the local demo day exactly like the server would, then advances the clock a minute.
function apply(input: EngineInput, a: DayAction): EngineInput {
  const now = input.now;
  const next: EngineInput = { ...input, meals: [...input.meals], doses: input.doses.filter(() => true), careDay: { ...input.careDay }, now: new Date(now.getTime() + 60_000) };
  const setDose = (ruleId: string, occurrence: number, patch: Partial<EngineInput["doses"][number]>) => {
    next.doses = next.doses.filter((d) => !(d.ruleId === ruleId && d.occurrence === occurrence));
    next.doses.push({ ruleId, occurrence, status: "taken", takenAt: null, snoozedUntil: null, ...patch });
  };
  const setMeal = (type: "breakfast" | "lunch" | "dinner", patch: { plannedAt?: Date; eatenAt?: Date }) => {
    const prev = next.meals.find((m) => m.type === type);
    next.meals = next.meals.filter((m) => m.type !== type);
    next.meals.push({ type, plannedAt: prev?.plannedAt ?? null, eatenAt: prev?.eatenAt ?? null, ...patch });
  };
  const at = (time?: string) => (time ? wallTime(input.careDay.date, time, input.settings.tz, input.settings.careDayStarts) : now);
  switch (a.type) {
    case "take": setDose(a.ruleId, a.occurrence, { status: "taken", takenAt: now }); break;
    case "snooze": setDose(a.ruleId, a.occurrence, { status: "snoozed", snoozedUntil: new Date(now.getTime() + a.minutes * 60_000) }); break;
    case "skip": setDose(a.ruleId, a.occurrence, { status: "skipped", reason: a.reason ?? null }); break;
    case "intend": {
      const plan = planMealIntent(input, a.meal, a.minutes);
      setMeal(a.meal, { plannedAt: plan.plannedAt });
      if (plan.preMealDose) setDose(plan.preMealDose.ruleId, 1, { status: "taken", takenAt: now });
      break;
    }
    case "eat": setMeal(a.meal, { eatenAt: at(a.time) }); break;
    case "snack": next.meals.push({ type: "snack", plannedAt: null, eatenAt: at(a.time) }); break;
    case "skipBreakfast": next.careDay.breakfastSkipped = true; break;
    case "bed": next.careDay.bedtimeAt = now; break;
    case "serving": {
      const s = buildDaySchedule(input).anmum.find((x) => x.rule.id === a.ruleId);
      if (s?.canTakeMore) setDose(a.ruleId, s.taken + 1, { status: "taken", takenAt: now });
      break;
    }
  }
  return next;
}

export function DemoHome({ scenario, role }: { scenario: ScenarioKey; role: "patient" | "caregiver" }) {
  const [input, setInput] = useState<EngineInput>(() => SCENARIOS[scenario].input());
  const view = useMemo(
    () => toHomeView(input, buildDaySchedule(input), { dueDate: DEMO_DUE_DATE, role, canLog: role === "patient" }),
    [input, role],
  );
  const run = async (a: DayAction): Promise<DayActionResult> => {
    await new Promise((r) => setTimeout(r, 250));
    setInput((cur) => apply(cur, a));
    return { ok: true };
  };
  return (
    <div className="relative flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <HomeView view={view} tz={input.settings.tz} run={run} />
      <AppNav hrefPrefix="/dev" />
    </div>
  );
}
