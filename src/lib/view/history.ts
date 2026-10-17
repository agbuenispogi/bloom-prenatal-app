// Pure view model for History: day summaries, streak, gentle notes. Runs on server or client (demo).
import { formatInTimeZone } from "date-fns-tz";
import { gentleNote, streak, summarizeDay, type DaySchedule, type DaySummary, type EngineInput } from "@/lib/engine";
import { pregnancyWeek } from "@/lib/pregnancy";
import { toHomeView, type TimelineRow } from "./home";

export interface DayCard {
  careDate: string;
  dateLabel: string;     // "Mon 19 Oct"
  longLabel: string;     // "Monday, 19 October"
  weekLabel: string | null;
  summary: DaySummary;
  note: string;
  empty: boolean;        // nothing logged at all
}

export interface HistoryView {
  yesterday: DayCard | null;
  earlier: DayCard[];
  streak: number;
}

const noon = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, day!, 12));
};

export function dayCard(input: EngineInput, schedule: DaySchedule, dueDate: string | null, when: "recent" | "past" = "past"): DayCard {
  const summary = summarizeDay(schedule);
  const week = pregnancyWeek(dueDate, schedule.careDate);
  const empty = input.meals.length === 0 && input.doses.length === 0;
  return {
    careDate: schedule.careDate,
    dateLabel: formatInTimeZone(noon(schedule.careDate), "UTC", "EEE d MMM"),
    longLabel: formatInTimeZone(noon(schedule.careDate), "UTC", "EEEE, d MMMM"),
    weekLabel: week ? `Week ${week.weeks}${week.days ? ` · day ${week.days}` : ""}` : null,
    summary,
    // The streak is stated once, in History's subtitle, so notes don't repeat it.
    note: empty ? "Nothing was logged on this page." : gentleNote(summary, 0, when),
    empty,
  };
}

// `days` newest first, all finished (before today).
export function toHistoryView(days: { input: EngineInput; schedule: DaySchedule }[], dueDate: string | null): HistoryView {
  const summaries = days.map((d) => summarizeDay(d.schedule));
  const s = streak(summaries);
  const cards = days.map((d, i) => dayCard(d.input, d.schedule, dueDate, i === 0 ? "recent" : "past"));
  return { yesterday: cards[0] ?? null, earlier: cards.slice(1), streak: s };
}

export function dayRows(input: EngineInput, schedule: DaySchedule): TimelineRow[] {
  return toHomeView(input, schedule, { dueDate: null, role: "caregiver", canLog: false }).rows;
}

// What happened, in the list rows' voice: "6 on time · none late, skipped or missed".
export function tally(card: DayCard): string {
  const s = card.summary;
  const rest = [
    s.late ? `${s.late} late` : null,
    s.skipped ? `${s.skipped} skipped` : null,
    s.missed ? `${s.missed} missed` : null,
  ].filter(Boolean);
  return `${s.onTime} on time · ${rest.length ? rest.join(" · ") : "none late, skipped or missed"}`;
}

// The list-row form, short enough for one line at 390px: "All 6 on time", "5 of 6 on time · 1 late".
export function shortTally(card: DayCard): string {
  const s = card.summary;
  if (s.onTime === s.scheduled) return `All ${s.scheduled} on time`;
  const rest = [s.late ? `${s.late} late` : null, s.skipped ? `${s.skipped} skipped` : null, s.missed ? `${s.missed} missed` : null].filter(Boolean);
  return [`${s.onTime} of ${s.scheduled} on time`, ...rest].join(" · ");
}
