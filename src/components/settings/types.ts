import type { ActionState } from "@/lib/auth/action-state";

export type FormAction = (prev: ActionState, form: FormData) => Promise<ActionState>;
export type Tab = "mint" | "sky" | "clay" | "blush" | "oat";

export interface RuleData {
  id: string;
  label: string;
  ruleType: "before_meal" | "after_meal" | "fixed_time" | "bedtime" | "daily_count";
  anchor: "breakfast" | "lunch" | "dinner" | "snack" | "bedtime" | null;
  minutes: number;          // |offset|
  fixedTime: string | null; // "HH:mm"
  minPerDay: number;
  maxPerDay: number;
  deadline: string | null;
  active: boolean;
}

export interface MedData {
  id: string;
  name: string;
  doseLabel: string;
  color: Tab;
  active: boolean;
  rules: RuleData[];
}

export interface ShiftDay {
  weekday: number;
  start: string | null;
  end: string | null;
}

export interface OverrideData {
  id: string;
  date: string;
  label: string; // "Sat 24 Oct"
  isOff: boolean;
  start: string | null;
  end: string | null;
  note: string | null;
}

export interface ReminderTimes {
  anmumDeadline: string;
  summaryTime: string;
  bedtimeDefault: string;
  nagAfter: number;
  escalateAfter: number;
  ironSpacing: number;
}
