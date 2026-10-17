// Bloom schedule engine: input/output types. The engine is pure: no I/O, no clock. `now` is always passed in.
// Wall-clock strings are "HH:mm" in the household time zone. "24:00" means midnight at the end of the day.

export type HHmm = string;
export type CareDate = string; // "YYYY-MM-DD", the care day (04:00 → 03:59 next day)

export type MainMeal = "breakfast" | "lunch" | "dinner";
export type MealType = MainMeal | "snack";
export type RuleType = "before_meal" | "after_meal" | "fixed_time" | "bedtime" | "daily_count";
export type Anchor = MealType | "bedtime";
export type SpacingClass = "iron" | "calcium" | "antacid";
export type DoseStatus = "pending" | "taken" | "skipped" | "snoozed" | "missed";

export interface EngineSettings {
  tz: string;
  careDayStarts: HHmm;          // "04:00"
  mealWindows: Record<MainMeal, [HHmm, HHmm]>;
  bedtimeDefault: HHmm;         // "01:00", an estimate until she taps "going to bed"
  mealLeadMin: number;          // default "eating in ~N min" when a meal has no pre-meal rule (30)
  shiftPrepMin: number;         // suggest finishing a meal this long before a shift starts (30)
  ironSpacingMin: number;       // warn if iron is closer than this to calcium/antacid
  anmumDeadline: HHmm;          // default deadline for daily_count rules without their own
  lateGraceMin: number;         // taken more than this after target → "late"
  nagAfterMin: number;
  escalateAfterMin: number;
}

export interface Medication {
  id: string;
  slug: string;
  name: string;
  doseLabel: string;
  color: string;
  spacingClass: SpacingClass | null;
  active: boolean;
}

export interface MedicationRule {
  id: string;
  medicationId: string;
  slug: string;
  label: string;                // the "why": "before lunch"
  ruleType: RuleType;
  anchor: Anchor | null;
  offsetMin: number;
  fixedTime: HHmm | null;
  minPerDay: number;
  maxPerDay: number;
  deadline: HHmm | null;
  active: boolean;
  sort: number;
}

export interface Shift {
  start: HHmm;
  end: HHmm;
}

export interface WeeklyShift {
  weekday: number; // 0 = Sunday
  start: HHmm | null;
  end: HHmm | null;
}

export interface ShiftOverride {
  date: CareDate;
  isOff: boolean;
  start: HHmm | null;
  end: HHmm | null;
}

export interface CareDayState {
  date: CareDate;
  breakfastSkipped: boolean;
  bedtimeAt: Date | null;       // set when she taps "going to bed"
}

export interface MealLog {
  type: MealType;
  plannedAt: Date | null;       // "I'm eating in ~30 min"
  eatenAt: Date | null;
}

export interface DoseLog {
  ruleId: string;
  occurrence: number;
  status: DoseStatus;
  takenAt: Date | null;
  snoozedUntil: Date | null;
  reason?: string | null;
}

export interface EngineInput {
  settings: EngineSettings;
  medications: Medication[];
  rules: MedicationRule[];
  shift: Shift | null;          // resolved for this care day (see resolveShift)
  careDay: CareDayState;
  meals: MealLog[];
  doses: DoseLog[];
  now: Date;
}

// ── Outputs ───────────────────────────────────────────────────────────────────────────────────────────

export type ItemState =
  | "done"      // dose taken / meal eaten
  | "skipped"
  | "due"       // target reached, not logged
  | "upcoming"
  | "snoozed"
  | "missed";   // can no longer happen as intended (care day over, or meal eaten without its pre-meal dose)

export interface DoseItem {
  kind: "dose";
  key: string;                  // `${ruleSlug}#${occurrence}`
  rule: MedicationRule;
  medication: Medication;
  occurrence: number;
  targetAt: Date | null;        // null = any time (daily_count)
  estimated: boolean;           // target derived from a suggested window, not a logged event
  state: ItemState;
  takenAt: Date | null;
  snoozedUntil: Date | null;
  lateByMin: number | null;     // taken late vs target (beyond grace)
  reason: string | null;
}

export interface MealItem {
  kind: "meal";
  key: string;                  // meal type, or `snack#n`
  meal: MealType;
  targetAt: Date | null;
  estimated: boolean;
  state: ItemState;
  eatenAt: Date | null;
  plannedAt: Date | null;
  window: SuggestedWindow | null;
}

export type TimelineItem = DoseItem | MealItem;

export interface SuggestedWindow {
  start: Date;
  end: Date;
  note: "before_shift" | "during_break" | null;
}

export type NextAction =
  | { type: "take"; dose: DoseItem; dueAt: Date; overdue: boolean }
  | { type: "prep_meal"; meal: MainMeal; gaviscon: DoseItem | null; suggestedAt: Date; window: SuggestedWindow; canSkip: boolean }
  | { type: "eat"; meal: MainMeal; at: Date }
  | { type: "bedtime"; dose: DoseItem; estimatedAt: Date }
  | { type: "all_done" };

export interface AnmumStatus {
  rule: MedicationRule;
  medication: Medication;
  taken: number;
  min: number;
  max: number;
  deadline: Date;
  skipped: boolean;             // she chose to skip today; no nag, but the summary still flags it
  needsReminder: boolean;       // below min, not skipped, past deadline
  canTakeMore: boolean;
}

export interface SpacingWarning {
  ironKey: string;
  otherKey: string;
  otherClass: Exclude<SpacingClass, "iron">;
  minutesApart: number;
  estimated: boolean;           // at least one side is a projected time, not a logged one
  message: string;
}

export interface DaySchedule {
  careDate: CareDate;
  timeline: TimelineItem[];
  nextUp: NextAction;
  anmum: AnmumStatus[];
  warnings: SpacingWarning[];
}
