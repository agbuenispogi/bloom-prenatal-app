// Pure view model for Home: engine output → serializable, display-ready rows. Runs on server or client.
import { formatInTimeZone } from "date-fns-tz";
import { describeNextUp, formatClock, type DaySchedule, type DoseItem, type EngineInput, type ItemState, type MainMeal, type MealItem } from "@/lib/engine";
import { pregnancyWeek } from "@/lib/pregnancy";

export type Tab = "mint" | "sky" | "clay" | "blush" | "oat";

export type DayAction =
  | { type: "take"; ruleId: string; occurrence: number }
  | { type: "snooze"; ruleId: string; occurrence: number; minutes: 10 | 20 | 30 }
  | { type: "skip"; ruleId: string; occurrence: number; reason?: string }
  | { type: "intend"; meal: MainMeal; minutes?: number }
  | { type: "eat"; meal: MainMeal; time?: string } // time: "HH:mm" earlier today (care day), default now
  | { type: "snack"; time?: string }
  | { type: "skipBreakfast" }
  | { type: "bed" }
  | { type: "serving"; ruleId: string };

export type DayActionResult = { ok: true } | { ok: false; error: string };

export interface NextUpView {
  key: string;
  kind: "take" | "prep_meal" | "eat" | "bedtime" | "all_done";
  title: string;
  detail: string;
  why: string | null;
  medName: string | null;
  doseLabel: string | null;
  tab: Tab;
  at: string | null;          // ISO, for the countdown
  timeLabel: string | null;   // "1:42 PM"
  overdue: boolean;
  estimated: boolean;
  ruleId: string | null;
  occurrence: number | null;
  meal: MainMeal | null;
  canSkip: boolean;
  leadMin: number;
  hasPreMealDose: boolean;
}

export interface TimelineRow {
  key: string;
  kind: "dose" | "meal";
  title: string;
  note: string | null;
  tab: Tab;
  state: ItemState;
  timeLabel: string | null;
  at: string | null;
  estimated: boolean;
  lateByMin: number | null;
  targetLabel: string | null;
  reason: string | null;
  warning: string | null;
}

export interface ServingView {
  ruleId: string;
  name: string;
  doseLabel: string;
  tab: Tab;
  taken: number;
  min: number;
  max: number;
  deadlineLabel: string;
  needsReminder: boolean;
  canTakeMore: boolean;
  skipped: boolean;
}

export interface HomeView {
  careDate: string;
  dateLabel: string;
  weekLabel: string | null;
  now: string;
  nextUp: NextUpView;
  rows: TimelineRow[];
  ribbonBefore: string | null; // row key the "now" ribbon sits above; null = after the last row
  servings: ServingView[];
  canLog: boolean;
  role: "patient" | "caregiver";
  snowflake: { title: string; week: number | null; dateLabel: string; href: string } | null;
  meals: { meal: MainMeal; eaten: boolean; eatenLabel: string | null; planned: boolean; skipped: boolean; preMealOpen: boolean; leadMin: number }[];
}

// Minimum gap between suggested meals (no "~10 AM lunch" right after a 9:38 breakfast).
const MEAL_GAP_MIN = 180;

const TABS: ReadonlySet<string> = new Set(["mint", "sky", "clay", "blush", "oat"]);
const tabOf = (color: string): Tab => (TABS.has(color) ? (color as Tab) : "oat");

const MEAL_TITLE: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

function rowTime(item: DoseItem | MealItem): Date | null {
  return item.kind === "dose" ? (item.takenAt ?? item.snoozedUntil ?? item.targetAt) : (item.eatenAt ?? item.plannedAt ?? item.targetAt);
}

export function toHomeView(
  input: EngineInput,
  schedule: DaySchedule,
  opts: {
    dueDate: string | null;
    role: "patient" | "caregiver";
    canLog: boolean;
    snowflake?: { title: string; week?: number; date: string; href: string } | null;
  },
): HomeView {
  const tz = input.settings.tz;
  const now = input.now;
  const clock = (d: Date | null) => (d ? formatClock(d, tz) : null);
  // Spacing notes live on the iron row only, naming each neighbour once.
  const nameOf = new Map(schedule.timeline.filter((i): i is DoseItem => i.kind === "dose").map((d) => [d.key, `${d.medication.name} ${d.rule.label}`]));
  const near = new Map<string, string[]>();
  for (const w of schedule.warnings) near.set(w.ironKey, [...(near.get(w.ironKey) ?? []), `${w.minutesApart} min from ${nameOf.get(w.otherKey)}`]);
  const warningFor = new Map<string, string>();
  for (const [key, list] of near) {
    warningFor.set(key, `This is ${list.join(" and ")}. Calcium and antacids can lower iron absorption. Confirm the spacing with your OB.`);
  }

  const rows: TimelineRow[] = [];
  for (const item of schedule.timeline) {
    if (item.kind === "dose" && item.rule.ruleType === "daily_count") continue; // shown in the servings strip
    const t = rowTime(item);
    if (item.kind === "dose") {
      rows.push({
        key: item.key,
        kind: "dose",
        title: item.medication.name,
        tab: tabOf(item.medication.color),
        state: item.state,
        timeLabel: clock(t),
        at: t?.toISOString() ?? null,
        estimated: item.estimated && !item.takenAt,
        lateByMin: item.lateByMin,
        targetLabel: item.lateByMin ? clock(item.targetAt) : null,
        // "breakfast skipped" comes from the engine, not from her: say it plainly instead of quoting it.
        reason: item.reason === "breakfast skipped" ? null : item.reason,
        note: item.reason === "breakfast skipped" ? "skipped with breakfast" : item.rule.label,
        warning: warningFor.get(item.key) ?? null,
      });
    } else {
      rows.push({
        key: `meal:${item.key}`,
        kind: "meal",
        title: MEAL_TITLE[item.meal] ?? item.meal,
        note: item.plannedAt && !item.eatenAt ? "planned" : null,
        tab: "oat",
        state: item.state,
        timeLabel: clock(t),
        at: t?.toISOString() ?? null,
        estimated: item.estimated,
        lateByMin: null,
        targetLabel: null,
        reason: null,
        warning: null,
      });
    }
  }
  // Suggested (estimated) meal times are chained so the page reads in a sensible order:
  //  - a suggestion that has already slipped by moves to now (+ the pre-meal lead), never "~6:30 AM" at 9 AM;
  //  - a later meal is never suggested before an earlier one: at least MEAL_GAP_MIN after it;
  //  - estimated doses tied to a meal move with it (pre-meal = meal - lead, after-meal = meal + offset).
  // These are only display estimates: no reminders are planned for estimated times.
  const open = (r: TimelineRow) => r.state === "due" || r.state === "upcoming" || r.state === "snoozed";
  const doseByKey = new Map(schedule.timeline.filter((i): i is DoseItem => i.kind === "dose").map((d) => [d.key, d]));
  const leadFor = new Map<string, number>();
  for (const d of doseByKey.values()) {
    if (d.rule.ruleType === "before_meal" && d.rule.anchor && (d.state === "upcoming" || d.state === "due")) leadFor.set(d.rule.anchor, Math.abs(d.rule.offsetMin));
  }
  const setTime = (r: TimelineRow, t: Date) => {
    r.at = t.toISOString();
    r.timeLabel = clock(t);
  };
  const mealAt = new Map<string, Date>();
  let prev: Date | null = null;
  for (const meal of ["breakfast", "lunch", "dinner"] as const) {
    const r = rows.find((x) => x.key === `meal:${meal}`);
    if (!r || !r.at) continue;
    let t = new Date(r.at);
    if (r.estimated && open(r)) {
      if (t < now) t = new Date(now.getTime() + (leadFor.get(meal) ?? 0) * 60_000);
      if (prev && t.getTime() < prev.getTime() + MEAL_GAP_MIN * 60_000) t = new Date(prev.getTime() + MEAL_GAP_MIN * 60_000);
      setTime(r, t);
    }
    mealAt.set(meal, t);
    if (r.state !== "skipped" && r.state !== "missed") prev = t;
  }
  for (const r of rows) {
    if (r.kind !== "dose" || !open(r) || !r.estimated || !r.at) continue;
    const d = doseByKey.get(r.key);
    const anchorAt = d?.rule.anchor ? mealAt.get(d.rule.anchor) : undefined;
    if (d && anchorAt && (d.rule.ruleType === "before_meal" || d.rule.ruleType === "after_meal")) {
      setTime(r, new Date(anchorAt.getTime() + d.rule.offsetMin * 60_000));
    } else if (new Date(r.at) < now) {
      setTime(r, now);
    }
  }
  rows.sort((a, b) => (a.at ? new Date(a.at).getTime() : Infinity) - (b.at ? new Date(b.at).getTime() : Infinity));
  // The ribbon sits by time: above the first open item at or after now. Overdue items stay above it, ringed.
  const upcoming = rows.find((r) => open(r) && (!r.at || new Date(r.at) >= now));

  const a = schedule.nextUp;
  const copy = describeNextUp(a, now, tz);
  const base: NextUpView = {
    key: a.type,
    kind: a.type,
    title: copy.title,
    detail: copy.detail,
    why: copy.why,
    medName: null,
    doseLabel: null,
    tab: "oat",
    at: null,
    timeLabel: null,
    overdue: false,
    estimated: false,
    ruleId: null,
    occurrence: null,
    meal: null,
    canSkip: false,
    leadMin: input.settings.mealLeadMin,
    hasPreMealDose: false,
  };
  let nextUp: NextUpView = base;
  if (a.type === "take") {
    nextUp = { ...base, key: `take:${a.dose.key}`, medName: a.dose.medication.name, doseLabel: a.dose.medication.doseLabel, tab: tabOf(a.dose.medication.color), at: a.dueAt.toISOString(), timeLabel: clock(a.dueAt), overdue: a.overdue, ruleId: a.dose.rule.id, occurrence: a.dose.occurrence };
  } else if (a.type === "prep_meal") {
    nextUp = { ...base, key: `prep:${a.meal}`, meal: a.meal, canSkip: a.canSkip, at: a.suggestedAt.toISOString(), timeLabel: clock(a.suggestedAt), hasPreMealDose: Boolean(a.gaviscon), medName: a.gaviscon?.medication.name ?? null, doseLabel: a.gaviscon?.medication.doseLabel ?? null, tab: a.gaviscon ? tabOf(a.gaviscon.medication.color) : "oat", leadMin: a.gaviscon ? Math.abs(a.gaviscon.rule.offsetMin) : input.settings.mealLeadMin, estimated: true };
  } else if (a.type === "eat") {
    nextUp = { ...base, key: `eat:${a.meal}`, meal: a.meal, at: a.at.toISOString(), timeLabel: clock(a.at) };
  } else if (a.type === "bedtime") {
    nextUp = { ...base, key: "bedtime", medName: a.dose.medication.name, doseLabel: a.dose.medication.doseLabel, tab: tabOf(a.dose.medication.color), at: a.estimatedAt.toISOString(), timeLabel: clock(a.estimatedAt), estimated: true, ruleId: a.dose.rule.id, occurrence: a.dose.occurrence };
  }

  const week = pregnancyWeek(opts.dueDate, schedule.careDate);
  const [y, m, d] = schedule.careDate.split("-").map(Number);
  const dateLabel = formatInTimeZone(new Date(Date.UTC(y!, m! - 1, d!, 12)), "UTC", "EEEE, d MMMM");

  return {
    careDate: schedule.careDate,
    dateLabel,
    weekLabel: week ? `Week ${week.weeks}${week.days ? ` · day ${week.days}` : ""}` : null,
    now: now.toISOString(),
    nextUp,
    rows,
    ribbonBefore: upcoming?.key ?? null,
    // When an any-time item is the Next up card, the strip doesn't repeat it.
    servings: schedule.anmum.filter((s) => !(nextUp.kind === "take" && nextUp.ruleId === s.rule.id)).map((s) => ({
      ruleId: s.rule.id,
      name: s.medication.name,
      doseLabel: s.medication.doseLabel,
      tab: tabOf(s.medication.color),
      taken: s.taken,
      min: s.min,
      max: s.max,
      deadlineLabel: formatClock(s.deadline, tz),
      needsReminder: s.needsReminder,
      canTakeMore: s.canTakeMore,
      skipped: s.skipped,
    })),
    canLog: opts.canLog,
    role: opts.role,
    snowflake: opts.snowflake
      ? {
          title: opts.snowflake.title,
          week: opts.snowflake.week ?? null,
          dateLabel: formatInTimeZone(new Date(`${opts.snowflake.date}T12:00:00Z`), "UTC", "d MMM"),
          href: opts.snowflake.href,
        }
      : null,
    meals: (["breakfast", "lunch", "dinner"] as const).map((meal) => {
      const item = schedule.timeline.find((i): i is MealItem => i.kind === "meal" && i.meal === meal);
      const pre = schedule.timeline.find((i): i is DoseItem => i.kind === "dose" && i.rule.ruleType === "before_meal" && i.rule.anchor === meal);
      return {
        meal,
        eaten: item?.state === "done",
        eatenLabel: item?.eatenAt ? clock(item.eatenAt) : null,
        planned: Boolean(item?.plannedAt && !item.eatenAt),
        skipped: item?.state === "skipped",
        preMealOpen: Boolean(pre && (pre.state === "upcoming" || pre.state === "due" || pre.state === "snoozed")),
        leadMin: pre ? Math.abs(pre.rule.offsetMin) : input.settings.mealLeadMin,
      };
    }),
  };
}
