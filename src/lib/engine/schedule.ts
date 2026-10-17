import { addMinutes, careDayBounds, minutesBetween, wallTime } from "./time";
import type {
  AnmumStatus,
  DaySchedule,
  DoseItem,
  DoseLog,
  EngineInput,
  ItemState,
  MainMeal,
  MealItem,
  MealLog,
  MealType,
  Medication,
  MedicationRule,
  NextAction,
  SpacingWarning,
  SuggestedWindow,
  TimelineItem,
} from "./types";

const MAIN_MEALS: MainMeal[] = ["breakfast", "lunch", "dinner"];
// Per the regimen only breakfast is optional; lunch and dinner are never skipped with one tap.
const SKIPPABLE: ReadonlySet<MainMeal> = new Set(["breakfast"]);
const MEAL_LABEL: Record<MealType, string> = { breakfast: "breakfast", lunch: "lunch", dinner: "dinner", snack: "snack" };

// Everything the rest of the engine derives from one care day's input.
function context(input: EngineInput) {
  const { settings, careDay, now } = input;
  const at = (time: string) => wallTime(careDay.date, time, settings.tz, settings.careDayStarts);
  const { start: dayStart, end: dayEnd } = careDayBounds(careDay.date, settings.tz, settings.careDayStarts);
  const dayOver = now.getTime() >= dayEnd.getTime();

  const mainMeal = (type: MainMeal): MealLog | undefined => input.meals.find((m) => m.type === type);
  const snacks = input.meals
    .filter((m) => m.type === "snack" && m.eatenAt)
    .sort((a, b) => a.eatenAt!.getTime() - b.eatenAt!.getTime());
  const hasActivity = (type: MainMeal) => Boolean(mainMeal(type)?.eatenAt || mainMeal(type)?.plannedAt);

  // Breakfast counts as skipped if she tapped skip, or moved on to a later meal without it.
  const breakfastSkipped =
    careDay.breakfastSkipped || (!hasActivity("breakfast") && (hasActivity("lunch") || hasActivity("dinner")));

  // A lunch/dinner never logged is "passed" once she has moved on (a later meal, or bedtime), so it can't
  // block the rest of the day. Its anchored doses become missed rather than hidden.
  const mealPassed = (meal: MainMeal): boolean => {
    if (meal === "breakfast" || hasActivity(meal)) return false;
    const later = MAIN_MEALS.slice(MAIN_MEALS.indexOf(meal) + 1);
    return later.some(hasActivity) || Boolean(careDay.bedtimeAt);
  };

  // Only a snack after a logged dinner is a bedtime snack. Before dinner is logged, a snack is just a snack
  // and bedtime stays at its estimate (she can still tap "going to bed").
  const dinnerEatenAt = mainMeal("dinner")?.eatenAt ?? null;
  const bedtimeSnack = dinnerEatenAt ? snacks.filter((s) => s.eatenAt! > dinnerEatenAt).at(-1) : undefined;

  const medById = new Map(input.medications.map((m) => [m.id, m]));
  const rules = input.rules
    .filter((r) => r.active && medById.get(r.medicationId)?.active)
    .sort((a, b) => a.sort - b.sort);

  return { input, settings, now, at, dayStart, dayEnd, dayOver, mainMeal, snacks, bedtimeSnack, breakfastSkipped, mealPassed, medById, rules };
}
type Ctx = ReturnType<typeof context>;

// ── Meal windows ─────────────────────────────────────────────────────────────────────────────────────

// Suggested window for a meal, nudged around her work shift: if the shift starts inside the window,
// suggest eating at least 30 min before it; if the window is entirely inside the shift, it's a break meal.
export function suggestWindow(ctx: Ctx, meal: MainMeal): SuggestedWindow {
  const [from, to] = ctx.settings.mealWindows[meal];
  const start = ctx.at(from);
  const end = ctx.at(to);
  const shift = ctx.input.shift;
  if (!shift) return { start, end, note: null };

  const shiftStart = ctx.at(shift.start);
  const shiftEnd = ctx.at(shift.end);
  const overlaps = start < shiftEnd && end > shiftStart;
  if (!overlaps) return { start, end, note: null };

  const prepEnd = addMinutes(shiftStart, -ctx.settings.shiftPrepMin);
  if (minutesBetween(start, prepEnd) >= ctx.settings.shiftPrepMin) {
    return { start, end: prepEnd < end ? prepEnd : end, note: "before_shift" };
  }
  return { start, end, note: "during_break" };
}

// ── Meals ────────────────────────────────────────────────────────────────────────────────────────────

function mealState(ctx: Ctx, log: MealLog | undefined, target: Date, skipped: boolean, passed: boolean): ItemState {
  if (log?.eatenAt) return "done";
  if (skipped) return "skipped";
  if (ctx.dayOver || passed) return "missed";
  // A meal is only "due" once she's said when; a suggested window is still just coming up.
  if (!log?.plannedAt) return "upcoming";
  return target <= ctx.now ? "due" : "upcoming";
}

function buildMeals(ctx: Ctx): MealItem[] {
  const items: MealItem[] = MAIN_MEALS.map((meal) => {
    const log = ctx.mainMeal(meal);
    const window = suggestWindow(ctx, meal);
    const target = log?.eatenAt ?? log?.plannedAt ?? window.start;
    const skipped = meal === "breakfast" && ctx.breakfastSkipped;
    return {
      kind: "meal",
      key: meal,
      meal,
      targetAt: target,
      estimated: !log?.eatenAt && !log?.plannedAt,
      state: mealState(ctx, log, target, skipped, ctx.mealPassed(meal)),
      eatenAt: log?.eatenAt ?? null,
      plannedAt: log?.plannedAt ?? null,
      window,
    };
  });
  ctx.snacks.forEach((snack, i) => {
    items.push({
      kind: "meal",
      key: `snack#${i + 1}`,
      meal: "snack",
      targetAt: snack.eatenAt,
      estimated: false,
      state: "done",
      eatenAt: snack.eatenAt,
      plannedAt: null,
      window: null,
    });
  });
  return items;
}

// ── Doses ────────────────────────────────────────────────────────────────────────────────────────────

interface Target {
  at: Date | null;
  estimated: boolean;
  // Unlogged meal she has moved past.
  mealPassed?: boolean;
  // Why the dose can't happen as intended, if so (e.g. breakfast skipped).
  skippedBecause?: string;
  // The anchor meal was eaten without this pre-meal dose.
  anchorPassed?: boolean;
}

// Pre-meal doses follow the *planned* time (what she committed to when she tapped "eating in ~30 min"),
// so eating a bit earlier than planned never makes an on-time dose look late. After-meal doses follow
// the actual eaten time.
function mealTime(ctx: Ctx, meal: MainMeal, prefer: "planned" | "eaten"): { at: Date; estimated: boolean } {
  const log = ctx.mainMeal(meal);
  const first = prefer === "planned" ? log?.plannedAt : log?.eatenAt;
  const second = prefer === "planned" ? log?.eatenAt : log?.plannedAt;
  if (first) return { at: first, estimated: false };
  if (second) return { at: second, estimated: false };
  return { at: suggestWindow(ctx, meal).start, estimated: true };
}

function targetFor(ctx: Ctx, rule: MedicationRule): Target {
  switch (rule.ruleType) {
    case "before_meal":
    case "after_meal": {
      if (rule.anchor === "snack") {
        const snack = ctx.snacks.at(-1);
        return snack ? { at: addMinutes(snack.eatenAt!, rule.offsetMin), estimated: false } : { at: null, estimated: true };
      }
      const meal = rule.anchor as MainMeal;
      if (meal === "breakfast" && ctx.breakfastSkipped) {
        // Keep a display time so the skipped dose sits in the morning of the timeline.
        const t = suggestWindow(ctx, "breakfast").start;
        return { at: addMinutes(t, rule.offsetMin), estimated: true, skippedBecause: "breakfast skipped" };
      }
      const t = mealTime(ctx, meal, rule.ruleType === "before_meal" ? "planned" : "eaten");
      const log = ctx.mainMeal(meal);
      return {
        at: addMinutes(t.at, rule.offsetMin),
        estimated: t.estimated,
        anchorPassed: rule.ruleType === "before_meal" && Boolean(log?.eatenAt),
        mealPassed: ctx.mealPassed(meal),
      };
    }
    case "fixed_time":
      return { at: ctx.at(rule.fixedTime ?? "00:00"), estimated: false };
    case "bedtime": {
      // Tapped "going to bed" wins; a logged snack ties it to the snack; else the default (an estimate).
      if (ctx.input.careDay.bedtimeAt) return { at: addMinutes(ctx.input.careDay.bedtimeAt, rule.offsetMin), estimated: false };
      const snack = ctx.bedtimeSnack;
      if (snack) return { at: addMinutes(snack.eatenAt!, rule.offsetMin), estimated: false };
      return { at: ctx.at(ctx.settings.bedtimeDefault), estimated: true };
    }
    case "daily_count":
      return { at: null, estimated: false };
  }
}

function doseState(ctx: Ctx, log: DoseLog | undefined, target: Target): ItemState {
  if (log?.status === "taken") return "done";
  if (log?.status === "skipped") return "skipped";
  if (target.skippedBecause) return "skipped";
  if (log?.status === "missed") return "missed";
  if (target.anchorPassed || target.mealPassed || ctx.dayOver) return "missed";
  if (log?.status === "snoozed" && log.snoozedUntil && log.snoozedUntil > ctx.now) return "snoozed";
  if (log?.status === "snoozed") return "due";
  if (!target.at || target.estimated) return "upcoming";
  return target.at <= ctx.now ? "due" : "upcoming";
}

function lateBy(ctx: Ctx, target: Target, takenAt: Date | null): number | null {
  if (!takenAt || !target.at || target.estimated) return null;
  const late = minutesBetween(target.at, takenAt);
  return late > ctx.settings.lateGraceMin ? late : null;
}

function doseItem(ctx: Ctx, rule: MedicationRule, med: Medication, occurrence: number, target: Target, log?: DoseLog): DoseItem {
  return {
    kind: "dose",
    key: `${rule.slug}#${occurrence}`,
    rule,
    medication: med,
    occurrence,
    targetAt: target.at,
    estimated: target.estimated,
    state: doseState(ctx, log, target),
    takenAt: log?.status === "taken" ? log.takenAt : null,
    snoozedUntil: log?.status === "snoozed" ? log.snoozedUntil : null,
    lateByMin: log?.status === "taken" ? lateBy(ctx, target, log.takenAt) : null,
    reason: log?.reason ?? target.skippedBecause ?? null,
  };
}

function buildDoses(ctx: Ctx): DoseItem[] {
  const items: DoseItem[] = [];
  for (const rule of ctx.rules) {
    const med = ctx.medById.get(rule.medicationId)!;
    const logs = ctx.input.doses.filter((d) => d.ruleId === rule.id);

    if (rule.ruleType === "daily_count") {
      const taken = logs.filter((d) => d.status === "taken").sort((a, b) => a.occurrence - b.occurrence);
      taken.forEach((log, i) => {
        const t: Target = { at: log.takenAt, estimated: false };
        items.push(doseItem(ctx, rule, med, i + 1, t, log));
      });
      // Placeholders for the required servings not yet taken. A skipped log dismisses one.
      const skipped = logs.filter((d) => d.status === "skipped");
      for (let n = taken.length + 1; n <= rule.minPerDay; n++) {
        items.push(doseItem(ctx, rule, med, n, { at: null, estimated: false }, skipped[n - taken.length - 1]));
      }
      continue;
    }

    const log = logs.find((d) => d.occurrence === 1);
    items.push(doseItem(ctx, rule, med, 1, targetFor(ctx, rule), log));
  }
  return items;
}

// ── Timeline ─────────────────────────────────────────────────────────────────────────────────────────

function sortTime(item: TimelineItem): number {
  const t =
    item.kind === "dose"
      ? (item.takenAt ?? item.snoozedUntil ?? item.targetAt)
      : (item.eatenAt ?? item.plannedAt ?? item.targetAt);
  return t ? t.getTime() : Number.POSITIVE_INFINITY;
}

function byTime(a: TimelineItem, b: TimelineItem): number {
  const diff = sortTime(a) - sortTime(b);
  if (diff !== 0) return diff;
  if (a.kind !== b.kind) return a.kind === "meal" ? -1 : 1; // snack, then the dose tied to it
  if (a.kind === "dose" && b.kind === "dose") return a.rule.sort - b.rule.sort;
  return 0;
}

// ── Next up: always exactly one action ───────────────────────────────────────────────────────────────

type Candidate = { at: Date; rank: number; action: NextAction };

function preMealDose(doses: DoseItem[], meal: MainMeal): DoseItem | null {
  return doses.find((d) => d.rule.ruleType === "before_meal" && d.rule.anchor === meal) ?? null;
}

function isOpen(d: DoseItem): boolean {
  return d.state === "due" || d.state === "upcoming" || d.state === "snoozed";
}

function computeNextUp(ctx: Ctx, meals: MealItem[], doses: DoseItem[]): NextAction {
  if (ctx.dayOver) return { type: "all_done" };
  const candidates: Candidate[] = [];
  const grace = ctx.settings.lateGraceMin;

  // Doses with a known (non-estimated) time: after-meal, fixed-time, pre-meal once the meal is planned.
  for (const d of doses) {
    if (!isOpen(d) || d.estimated || !d.targetAt) continue;
    if (d.rule.ruleType === "bedtime" || d.rule.ruleType === "daily_count") continue;
    const dueAt = d.snoozedUntil ?? d.targetAt;
    candidates.push({
      at: dueAt,
      rank: 0,
      action: { type: "take", dose: d, dueAt, overdue: minutesBetween(dueAt, ctx.now) > grace },
    });
  }

  // The current meal: the first main meal that isn't eaten or skipped.
  const stage = MAIN_MEALS.map((m) => meals.find((i) => i.meal === m)!).find((i) => i.state !== "done" && i.state !== "skipped" && i.state !== "missed");
  if (stage) {
    const meal = stage.meal as MainMeal;
    const gaviscon = preMealDose(doses, meal);
    if (stage.plannedAt) {
      // She said "eating in ~30 min". If the pre-meal dose is still open it's already a candidate above.
      if (!gaviscon || !isOpen(gaviscon)) {
        candidates.push({ at: stage.plannedAt, rank: 1, action: { type: "eat", meal, at: stage.plannedAt } });
      }
    } else {
      const window = stage.window!;
      const lead = gaviscon && isOpen(gaviscon) ? gaviscon.rule.offsetMin : 0; // -30
      const ideal = addMinutes(window.start, Math.min(lead, 0));
      // A snoozed pre-meal dose pushes the prompt back until the snooze ends.
      const snoozedUntil = gaviscon?.state === "snoozed" ? gaviscon.snoozedUntil : null;
      const suggestedAt = latest(ideal, snoozedUntil, ctx.now);
      candidates.push({
        at: suggestedAt,
        rank: 1,
        action: {
          type: "prep_meal",
          meal,
          gaviscon: gaviscon && isOpen(gaviscon) ? gaviscon : null,
          suggestedAt,
          window,
          canSkip: SKIPPABLE.has(meal),
        },
      });
    }
  }

  // Bedtime: after the last meal, or as soon as she taps "going to bed" / the estimate has passed,
  // even if a meal was never logged.
  const bedtime = doses.find((d) => d.rule.ruleType === "bedtime" && isOpen(d));
  if (bedtime?.targetAt && (!stage || !bedtime.estimated || bedtime.targetAt <= ctx.now)) {
    const at = bedtime.snoozedUntil ?? bedtime.targetAt;
    if (bedtime.estimated) {
      candidates.push({ at, rank: 2, action: { type: "bedtime", dose: bedtime, estimatedAt: at } });
    } else {
      candidates.push({ at, rank: 0, action: { type: "take", dose: bedtime, dueAt: at, overdue: minutesBetween(at, ctx.now) > grace } });
    }
  }

  // Anmum is any-time, so it only takes the card at its deadline, or when nothing else is left.
  // The day is never "all done" while a daily minimum is unmet.
  for (const d of doses) {
    if (d.rule.ruleType !== "daily_count" || !isOpen(d)) continue;
    const deadline = ctx.at(d.rule.deadline ?? ctx.settings.anmumDeadline);
    // Once overdue it sits at "now", so anything already due (e.g. the bedtime dose she just tapped) comes first.
    candidates.push({ at: latest(deadline, ctx.now), rank: 3, action: { type: "take", dose: d, dueAt: deadline, overdue: minutesBetween(deadline, ctx.now) > grace } });
    break;
  }

  if (candidates.length === 0) return { type: "all_done" };
  candidates.sort((a, b) => a.at.getTime() - b.at.getTime() || a.rank - b.rank);
  return candidates[0]!.action;
}

function latest(...dates: (Date | null)[]): Date {
  return dates.filter((d): d is Date => d !== null).reduce((a, b) => (b > a ? b : a));
}

// ── Anmum (any-time, counted) ────────────────────────────────────────────────────────────────────────

function computeAnmum(ctx: Ctx, doses: DoseItem[]): AnmumStatus[] {
  return ctx.rules
    .filter((r) => r.ruleType === "daily_count")
    .map((rule) => {
      const mine = doses.filter((d) => d.rule.id === rule.id);
      const taken = mine.filter((d) => d.state === "done").length;
      const skipped = mine.some((d) => d.state === "skipped");
      const deadline = ctx.at(rule.deadline ?? ctx.settings.anmumDeadline);
      return {
        rule,
        medication: ctx.medById.get(rule.medicationId)!,
        taken,
        min: rule.minPerDay,
        max: rule.maxPerDay,
        deadline,
        skipped,
        needsReminder: taken < rule.minPerDay && !skipped && ctx.now >= deadline && !ctx.dayOver,
        canTakeMore: taken < rule.maxPerDay,
      };
    });
}

// ── Iron spacing guardrail (warn only, never moves a dose) ───────────────────────────────────────────

function doseTime(d: DoseItem): Date | null {
  if (d.state === "skipped" || d.state === "missed") return null;
  return d.takenAt ?? d.snoozedUntil ?? d.targetAt;
}

function computeWarnings(ctx: Ctx, doses: DoseItem[]): SpacingWarning[] {
  const warnings: SpacingWarning[] = [];
  const limit = ctx.settings.ironSpacingMin;
  if (limit <= 0) return warnings;
  for (const iron of doses.filter((d) => d.medication.spacingClass === "iron")) {
    const ironAt = doseTime(iron);
    if (!ironAt) continue;
    for (const other of doses) {
      const cls = other.medication.spacingClass;
      if (cls !== "calcium" && cls !== "antacid") continue;
      const otherAt = doseTime(other);
      if (!otherAt) continue;
      const apart = Math.abs(minutesBetween(ironAt, otherAt));
      if (apart >= limit) continue;
      warnings.push({
        ironKey: iron.key,
        otherKey: other.key,
        otherClass: cls,
        minutesApart: apart,
        estimated: iron.estimated || other.estimated,
        message:
          `${iron.medication.name} is ${apart} min from ${other.medication.name} (${other.rule.label}). ` +
          `Calcium and antacids can reduce iron absorption. Confirm the spacing with your OB.`,
      });
    }
  }
  return warnings;
}

// ── Public entry point ───────────────────────────────────────────────────────────────────────────────

export function buildDaySchedule(input: EngineInput): DaySchedule {
  const ctx = context(input);
  const meals = buildMeals(ctx);
  const doses = buildDoses(ctx);
  const timeline: TimelineItem[] = [...meals, ...doses].sort(byTime);
  return {
    careDate: input.careDay.date,
    timeline,
    nextUp: computeNextUp(ctx, meals, doses),
    anmum: computeAnmum(ctx, doses),
    warnings: computeWarnings(ctx, doses),
  };
}

// "I'm eating in ~30 min": what to write. Logs the pre-meal dose now (if still open) and the planned meal time.
// The lead time comes from the pre-meal rule (e.g. Gaviscon -30 → eat in 30 min), so an OB change to the
// offset flows through without code changes. `minutesUntilMeal` lets her pick a different time.
export function planMealIntent(
  input: EngineInput,
  meal: MainMeal,
  minutesUntilMeal?: number,
): { plannedAt: Date; preMealDose: { ruleId: string; occurrence: number; takenAt: Date } | null } {
  const schedule = buildDaySchedule(input);
  const dose = schedule.timeline.find(
    (i): i is DoseItem => i.kind === "dose" && i.rule.ruleType === "before_meal" && i.rule.anchor === meal,
  );
  const lead = minutesUntilMeal ?? (dose ? Math.abs(dose.rule.offsetMin) : input.settings.mealLeadMin);
  return {
    plannedAt: addMinutes(input.now, lead),
    preMealDose: dose && isOpen(dose) ? { ruleId: dose.rule.id, occurrence: dose.occurrence, takenAt: input.now } : null,
  };
}

export { MEAL_LABEL };
