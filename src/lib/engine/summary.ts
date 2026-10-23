import { servingWords } from "@/lib/servings-words";
import type { DaySchedule, DoseItem } from "./types";

// A care day's adherence, for History and the 9 AM summary email. Pure.
export interface DaySummary {
  careDate: string;
  scheduled: number;     // timed doses that applied today (not skipped-with-breakfast, not any-time)
  onTime: number;
  late: number;
  skipped: number;       // she chose to skip
  missed: number;
  open: number;          // still pending (today, not over yet)
  adherencePct: number;  // on time / scheduled, 0–100
  servings: { name: string; doseLabel: string; taken: number; min: number; missed: boolean }[]; // any-time items
  servingsMissed: boolean; // some any-time item below its minimum and not skipped (meaningful once the day is over)
  clean: boolean;          // nothing missed and every any-time item met (or deliberately skipped)
}

export function summarizeDay(schedule: DaySchedule): DaySummary {
  const doses = schedule.timeline.filter(
    (i): i is DoseItem => i.kind === "dose" && i.rule.ruleType !== "daily_count" && i.reason !== "breakfast skipped",
  );
  const onTime = doses.filter((d) => d.state === "done" && !d.lateByMin).length;
  const late = doses.filter((d) => d.state === "done" && Boolean(d.lateByMin)).length;
  const skipped = doses.filter((d) => d.state === "skipped").length;
  const missed = doses.filter((d) => d.state === "missed").length;
  const open = doses.length - onTime - late - skipped - missed;
  const servings = schedule.anmum.map((a) => ({
    name: a.medication.name,
    doseLabel: a.medication.doseLabel,
    taken: a.taken,
    min: a.min,
    missed: !a.skipped && a.taken < a.min,
  }));
  const servingsMissed = servings.some((x) => x.missed);
  return {
    careDate: schedule.careDate,
    scheduled: doses.length,
    onTime,
    late,
    skipped,
    missed,
    open,
    adherencePct: doses.length ? Math.round((onTime / doses.length) * 100) : 100,
    servings,
    servingsMissed,
    clean: missed === 0 && open === 0 && !servingsMissed,
  };
}

// One line per any-time item: "Anmum Materna: 1 glass", "Gaviscon: not taken".
export function servingLines(s: DaySummary): { text: string; missed: boolean }[] {
  return s.servings.map((x) => ({ text: x.missed ? `${x.name}: not taken` : `${x.name}: ${servingWords(x.name, x.doseLabel).count(x.taken)}`, missed: x.missed }));
}

// Consecutive clean days, counting back from the most recent finished day. `days` newest first.
export function streak(days: DaySummary[]): number {
  let n = 0;
  for (const d of days) {
    if (!d.clean) break;
    n++;
  }
  return n;
}

// A short, kind note. Never guilt: missed things are named plainly, with something to hold onto.
// "recent" = yesterday (History's top, the morning email); "past" = an older page read later.
export function gentleNote(s: DaySummary, streakDays: number, when: "recent" | "past" = "recent"): string {
  if (s.scheduled === 0) return "A quiet page. Rest is part of the plan too.";
  if (when === "past") {
    if (s.clean && s.late === 0) return "Every dose on time that day.";
    if (s.clean) return "Everything taken that day, a few a little late.";
    if (s.missed <= 1 && !s.servingsMissed) return "One slipped by that day, and that's okay.";
    return "A few things slipped by that day. It happens.";
  }
  if (s.clean && s.late === 0) {
    return streakDays > 1 ? `Every dose on time, ${streakDays} days in a row. You and baby are in good rhythm.` : "Every dose on time. That's a beautiful page.";
  }
  if (s.clean) return "Everything taken, a few a little late. Late still counts. Well done.";
  if (s.missed <= 1 && !s.servingsMissed) return "Nearly everything taken. One slipped by, and that's okay. Today is a fresh page.";
  return "Some doses slipped by. That happens. Today is a fresh page, and Bloom will be right there with you.";
}
