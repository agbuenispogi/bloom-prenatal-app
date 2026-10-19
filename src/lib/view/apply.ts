// Applies a day action to an engine input exactly as the server will, so the screen updates instantly
// (optimistic UI) and the dev demo works without a database. Pure.
import { buildDaySchedule, planMealIntent, wallTime, type EngineInput } from "@/lib/engine";
import type { DayAction } from "./home";

// The screen's clock and the server's differ by seconds: a snack is matched to within two minutes.
export const SNACK_MATCH_MS = 120_000;

function nearestSnack(meals: EngineInput["meals"], isoTime: string): number {
  const want = new Date(isoTime).getTime();
  let best = -1;
  let bestGap = SNACK_MATCH_MS + 1;
  meals.forEach((m, i) => {
    if (m.type !== "snack" || !m.eatenAt) return;
    const gap = Math.abs(m.eatenAt.getTime() - want);
    if (gap < bestGap) {
      best = i;
      bestGap = gap;
    }
  });
  return best;
}

export function applyAction(input: EngineInput, a: DayAction, now: Date): EngineInput {
  const next: EngineInput = { ...input, meals: [...input.meals], doses: [...input.doses], careDay: { ...input.careDay }, now };
  const at = (time?: string) => (time ? wallTime(input.careDay.date, time, input.settings.tz, input.settings.careDayStarts) : now);
  const setDose = (ruleId: string, occurrence: number, patch: Partial<EngineInput["doses"][number]>) => {
    next.doses = next.doses.filter((d) => !(d.ruleId === ruleId && d.occurrence === occurrence));
    next.doses.push({ ruleId, occurrence, status: "taken", takenAt: null, snoozedUntil: null, reason: null, ...patch });
  };
  const clearDose = (ruleId: string, occurrence: number) => {
    next.doses = next.doses.filter((d) => !(d.ruleId === ruleId && d.occurrence === occurrence));
  };
  const setMeal = (type: "breakfast" | "lunch" | "dinner", patch: { plannedAt?: Date | null; eatenAt?: Date | null }) => {
    const prev = next.meals.find((m) => m.type === type);
    next.meals = next.meals.filter((m) => m.type !== type);
    const merged = { type, plannedAt: prev?.plannedAt ?? null, eatenAt: prev?.eatenAt ?? null, ...patch };
    if (merged.plannedAt || merged.eatenAt) next.meals.push(merged);
  };

  switch (a.type) {
    case "take":
      setDose(a.ruleId, a.occurrence, { status: "taken", takenAt: at(a.time) });
      break;
    case "snooze":
      setDose(a.ruleId, a.occurrence, { status: "snoozed", snoozedUntil: new Date(now.getTime() + a.minutes * 60_000) });
      break;
    case "skip":
      setDose(a.ruleId, a.occurrence, { status: "skipped", reason: a.reason ?? null });
      break;
    case "resetDose":
      clearDose(a.ruleId, a.occurrence);
      break;
    case "intend": {
      const plan = planMealIntent(input, a.meal, a.minutes);
      setMeal(a.meal, { plannedAt: plan.plannedAt });
      if (plan.preMealDose) setDose(plan.preMealDose.ruleId, 1, { status: "taken", takenAt: now });
      break;
    }
    case "eat":
      setMeal(a.meal, { eatenAt: at(a.time) });
      break;
    case "resetMeal":
      setMeal(a.meal, { plannedAt: null, eatenAt: null });
      if (a.meal === "breakfast") next.careDay.breakfastSkipped = false;
      break;
    case "snack":
      next.meals.push({ type: "snack", plannedAt: null, eatenAt: at(a.time) });
      break;
    case "removeSnack": {
      const i = nearestSnack(next.meals, a.eatenAt);
      if (i >= 0) next.meals.splice(i, 1);
      break;
    }
    case "skipBreakfast":
      next.careDay.breakfastSkipped = true;
      break;
    case "bed":
      next.careDay.bedtimeAt = now;
      break;
    case "serving": {
      const s = buildDaySchedule(input).anmum.find((x) => x.rule.id === a.ruleId);
      if (s?.canTakeMore) setDose(a.ruleId, s.taken + 1, { status: "taken", takenAt: at(a.time) });
      break;
    }
    case "putDose":
      setDose(a.ruleId, a.occurrence, {
        status: a.status,
        takenAt: a.takenAt ? new Date(a.takenAt) : null,
        snoozedUntil: a.snoozedUntil ? new Date(a.snoozedUntil) : null,
        reason: a.reason,
      });
      break;
    case "putMeal":
      setMeal(a.meal, { plannedAt: a.plannedAt ? new Date(a.plannedAt) : null, eatenAt: a.eatenAt ? new Date(a.eatenAt) : null });
      break;
    case "putCareDay":
      next.careDay.breakfastSkipped = a.breakfastSkipped;
      next.careDay.bedtimeAt = a.bedtimeAt ? new Date(a.bedtimeAt) : null;
      break;
  }
  return next;
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

// The actions that put the day back exactly as it was before `a` (for Undo). Pure.
export function inverseOf(prev: EngineInput, a: DayAction, now: Date): DayAction[] {
  const at = (time?: string) => (time ? wallTime(prev.careDay.date, time, prev.settings.tz, prev.settings.careDayStarts) : now);
  const doseBack = (ruleId: string, occurrence: number): DayAction => {
    const d = prev.doses.find((x) => x.ruleId === ruleId && x.occurrence === occurrence);
    return d
      ? { type: "putDose", ruleId, occurrence, status: d.status, takenAt: iso(d.takenAt), snoozedUntil: iso(d.snoozedUntil), reason: d.reason ?? null }
      : { type: "resetDose", ruleId, occurrence };
  };
  const mealBack = (meal: "breakfast" | "lunch" | "dinner"): DayAction => {
    const m = prev.meals.find((x) => x.type === meal);
    return m ? { type: "putMeal", meal, plannedAt: iso(m.plannedAt), eatenAt: iso(m.eatenAt) } : { type: "resetMeal", meal };
  };
  const careDayBack: DayAction = { type: "putCareDay", breakfastSkipped: prev.careDay.breakfastSkipped, bedtimeAt: iso(prev.careDay.bedtimeAt) };

  switch (a.type) {
    case "take":
    case "snooze":
    case "skip":
    case "resetDose":
    case "putDose":
      return [doseBack(a.ruleId, a.occurrence)];
    case "serving": {
      const s = buildDaySchedule(prev).anmum.find((x) => x.rule.id === a.ruleId);
      return s?.canTakeMore ? [{ type: "resetDose", ruleId: a.ruleId, occurrence: s.taken + 1 }] : [];
    }
    case "intend": {
      const plan = planMealIntent(prev, a.meal, a.minutes);
      return [mealBack(a.meal), ...(plan.preMealDose ? [doseBack(plan.preMealDose.ruleId, plan.preMealDose.occurrence)] : [])];
    }
    case "eat":
    case "putMeal":
      return [mealBack(a.meal)];
    case "resetMeal":
      return a.meal === "breakfast" ? [mealBack(a.meal), careDayBack] : [mealBack(a.meal)];
    case "snack":
      return [{ type: "removeSnack", eatenAt: at(a.time).toISOString() }];
    case "removeSnack": {
      const t = new Date(a.eatenAt);
      const hhmm = new Intl.DateTimeFormat("en-GB", { timeZone: prev.settings.tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(t);
      return [{ type: "snack", time: hhmm }];
    }
    case "skipBreakfast":
    case "bed":
    case "putCareDay":
      return [careDayBack];
  }
}

// A logged time must fall inside today and not in the future (a minute of slack). Mirrors the server.
export function checkAction(input: EngineInput, a: DayAction, now: Date): string | null {
  const time = "time" in a ? a.time : undefined;
  if (!time) return null;
  const { tz, careDayStarts } = input.settings;
  const at = wallTime(input.careDay.date, time, tz, careDayStarts);
  const start = wallTime(input.careDay.date, careDayStarts, tz, careDayStarts);
  if (at < start || at.getTime() > now.getTime() + 60_000) return "Pick a time earlier today, not in the future.";
  return null;
}

const MEAL_NAME = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" } as const;

// What the Undo toast says about an action, e.g. "Caltrate logged". Null for actions that offer no undo.
export function labelOf(input: EngineInput, a: DayAction): string | null {
  const med = (ruleId: string) => {
    const rule = input.rules.find((r) => r.id === ruleId);
    return input.medications.find((m) => m.id === rule?.medicationId)?.name ?? "Dose";
  };
  switch (a.type) {
    case "take":
      return `${med(a.ruleId)} logged${a.time ? " earlier" : ""}`;
    case "serving":
      return `${med(a.ruleId)} logged`;
    case "snooze":
      return `${med(a.ruleId)} snoozed ${a.minutes} min`;
    case "skip":
      return `${med(a.ruleId)} skipped`;
    case "resetDose":
      return `${med(a.ruleId)} marked not taken`;
    case "intend": {
      const plan = planMealIntent(input, a.meal, a.minutes);
      return plan.preMealDose ? `${med(plan.preMealDose.ruleId)} logged` : `${MEAL_NAME[a.meal]} planned`;
    }
    case "eat":
      return `${MEAL_NAME[a.meal]} logged${a.time ? " earlier" : ""}`;
    case "resetMeal":
      return `${MEAL_NAME[a.meal]} marked not eaten`;
    case "snack":
      return "Snack logged";
    case "removeSnack":
      return "Snack removed";
    case "skipBreakfast":
      return "Breakfast skipped";
    case "bed":
      return "Good night";
    case "putDose":
    case "putMeal":
    case "putCareDay":
      return null;
  }
}
