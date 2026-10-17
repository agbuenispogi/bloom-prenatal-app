import { formatClock } from "./time";
import type { DoseItem, NextAction } from "./types";

// Plain-language copy for the "Next up" card, push titles and emails. Gentle, never guilt-inducing.
export interface ActionCopy {
  title: string;
  detail: string;
  why: string | null;
}

function doseName(d: DoseItem): string {
  return d.medication.doseLabel ? `${d.medication.name} · ${d.medication.doseLabel}` : d.medication.name;
}

export function describeNextUp(action: NextAction, now: Date, tz: string): ActionCopy {
  switch (action.type) {
    case "take": {
      const when = action.dueAt <= now ? (action.overdue ? `Was due at ${formatClock(action.dueAt, tz)}. Whenever you're ready` : "Take it now") : `at ${formatClock(action.dueAt, tz)}`;
      return { title: doseName(action.dose), detail: when, why: action.dose.rule.label };
    }
    case "prep_meal": {
      const meal = action.meal;
      if (action.gaviscon) {
        const when = action.suggestedAt <= now ? "" : ` around ${formatClock(action.suggestedAt, tz)}`;
        return {
          title: `Eating ${meal} soon?`,
          detail: `Take ${action.gaviscon.medication.name} now → eat in ${Math.abs(action.gaviscon.rule.offsetMin)} min${when ? `. Suggested${when}` : ""}`,
          why: action.gaviscon.rule.label,
        };
      }
      return { title: `${capitalize(meal)} next`, detail: `Log it when you eat`, why: null };
    }
    case "eat":
      return {
        title: action.at <= now ? `Time to eat ${action.meal}` : `Eat ${action.meal} at ${formatClock(action.at, tz)}`,
        detail: "Tap when you start eating",
        why: null,
      };
    case "bedtime":
      return {
        title: "Going to bed?",
        detail: `Take ${action.dose.medication.name} at bedtime. Usually around ${formatClock(action.estimatedAt, tz)}`,
        why: action.dose.rule.label,
      };
    case "all_done":
      return { title: "All done for today", detail: "Rest well. Bloom will remind you tomorrow.", why: null };
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
