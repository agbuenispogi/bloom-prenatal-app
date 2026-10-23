// The 9 AM daily summary: when it's due and what it says. Pure (no I/O); the dispatcher sends it.
import { addDays, careDateOf, servingLines, wallTime, type DaySchedule, type EngineInput, type ItemState } from "@/lib/engine";
import { dayRows, tally, toHistoryView } from "@/lib/view/history";

const STATE_WORD: Record<ItemState, string> = { done: "Taken", due: "Not logged", upcoming: "Not logged", snoozed: "Not logged", skipped: "Skipped", missed: "Missed" };

export interface SummaryRow {
  time: string;
  title: string;
  note: string | null;
  kind: "dose" | "meal";
  state: ItemState;
  stateWord: string;   // dose: Taken / Late / Skipped / Missed; meal: Eaten / Skipped
  estimated: boolean;
}

export interface SummaryPayload {
  careDate: string;
  longLabel: string;     // "Monday, 19 October"
  weekLabel: string | null;
  pct: number;
  tally: string;         // "6 on time · none late, skipped or missed"
  note: string;          // the gentle note
  streak: number;
  servingLines: { text: string; missed: boolean }[]; // "Anmum Materna: 1 glass", one per any-time item
  servingsMissed: boolean;
  empty: boolean;
  rows: SummaryRow[];
}

// The summary for the previous care day is due from `summaryTime` (household time) until the current care day ends.
export function summaryDue(now: Date, tz: string, careDayStarts: string, summaryTime: string): { due: boolean; careDate: string } {
  const today = careDateOf(now, tz, careDayStarts);
  const from = wallTime(today, summaryTime, tz, careDayStarts);
  return { due: now >= from, careDate: addDays(today, -1) };
}

// `days`: finished care days, newest first; days[0] is the one being summarized.
export function buildSummary(days: { input: EngineInput; schedule: DaySchedule }[], dueDate: string | null): SummaryPayload {
  const history = toHistoryView(days, dueDate);
  const card = history.yesterday!;
  const s = card.summary;
  const rows = dayRows(days[0]!.input, days[0]!.schedule)
    .filter((r) => !(r.kind === "dose" && r.note === "skipped with breakfast"))
    .map((r) => ({
      // A suggested time that never happened isn't a fact worth printing.
      time: r.estimated && r.state !== "done" ? "" : (r.timeLabel ?? ""),
      title: r.title,
      note: r.kind === "dose" ? r.note : null,
      kind: r.kind,
      state: r.state,
      stateWord: r.kind === "meal" ? (r.state === "done" ? "Eaten" : r.state === "skipped" ? "Skipped" : "Not logged") : r.lateByMin ? `${r.lateByMin} min late` : STATE_WORD[r.state],
      estimated: r.estimated,
    }));
  return {
    careDate: card.careDate,
    longLabel: card.longLabel,
    weekLabel: card.weekLabel,
    pct: s.adherencePct,
    tally: tally(card),
    note: card.note,
    streak: history.streak,
    servingLines: servingLines(s),
    servingsMissed: s.servingsMissed,
    empty: card.empty,
    rows,
  };
}
