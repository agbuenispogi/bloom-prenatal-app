// Turns one care day's schedule into the exact set of reminder rows that should exist right now. Pure.
// Syncing (sync.ts) then cancels unsent rows that are no longer wanted and inserts the missing ones,
// so logging, snoozing or skipping a dose automatically withdraws its pending nags.
import {
  formatClock,
  planAnmumReminder,
  planDoseReminders,
  planEatNudge,
  type DaySchedule,
  type DoseItem,
  type EngineInput,
  type MealItem,
  type PlannedReminder,
  type Recipient,
} from "@/lib/engine";

export interface ReminderPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
  careDate: string;
  itemKey: string;
  ruleId?: string;
  occurrence?: number;
  dueLabel: string;         // "1:42 PM"
  actionable: boolean;      // push shows Taken / Snooze
}

export interface DesiredReminder extends PlannedReminder {
  payload: ReminderPayload;
}

// Reminders whose time passed more than this long ago are never (re)planned: nothing stale fires.
const STALE_MS = 2 * 60_000;

function doseTitle(d: DoseItem) {
  return d.medication.doseLabel ? `${d.medication.name} · ${d.medication.doseLabel}` : d.medication.name;
}

function payloadFor(r: PlannedReminder, d: DoseItem, careDate: string, tz: string): ReminderPayload {
  const at = formatClock(d.snoozedUntil ?? d.targetAt!, tz);
  const base = { url: "/", tag: `dose:${careDate}:${d.key}`, careDate, itemKey: d.key, ruleId: d.rule.id, occurrence: d.occurrence, dueLabel: at };
  switch (r.kind) {
    case "nag":
      return { ...base, title: `Still time for ${d.medication.name}`, body: `It was due at ${at} (${d.rule.label}). Late is still good.`, actionable: true };
    case "escalation":
      return { ...base, title: `${d.medication.name} not logged yet`, body: `It was due at ${at} (${d.rule.label}) and hasn't been logged after ${Math.round((r.dueAt.getTime() - (d.snoozedUntil ?? d.targetAt!).getTime()) / 60_000)} minutes.`, actionable: false };
    default:
      return { ...base, title: `Time for ${doseTitle(d)}`, body: `${d.rule.label[0]!.toUpperCase()}${d.rule.label.slice(1)} · ${at}`, actionable: true };
  }
}

export function desiredReminders(input: EngineInput, schedule: DaySchedule, recipients: Recipient[], now: Date): DesiredReminder[] {
  const { tz, nagAfterMin, escalateAfterMin } = input.settings;
  const careDate = schedule.careDate;
  const out: DesiredReminder[] = [];
  const open = (d: DoseItem) => d.state === "due" || d.state === "upcoming" || d.state === "snoozed";

  for (const item of schedule.timeline) {
    if (item.kind !== "dose" || !open(item) || item.rule.ruleType === "daily_count") continue;
    const dueAt = item.snoozedUntil ?? item.targetAt;
    if (!dueAt) continue;

    if (item.estimated) {
      // Only bedtime gets a reminder from an estimate: one quiet push to her, no email in the night.
      if (item.rule.ruleType !== "bedtime") continue;
      const patient = recipients.filter((r) => r.role === "patient");
      for (const r of planDoseReminders(careDate, item.key, dueAt, patient, { nagAfterMin, escalateAfterMin })) {
        if (r.kind !== "due" || r.channel !== "push") continue;
        out.push({ ...r, payload: { title: "Going to bed?", body: `${doseTitle(item)} at bedtime. Tap when you're heading to sleep.`, url: "/", tag: `dose:${careDate}:${item.key}`, careDate, itemKey: item.key, ruleId: item.rule.id, occurrence: item.occurrence, dueLabel: formatClock(dueAt, tz), actionable: false } });
      }
      continue;
    }

    for (const r of planDoseReminders(careDate, item.key, dueAt, recipients, { nagAfterMin, escalateAfterMin })) {
      out.push({ ...r, payload: payloadFor(r, item, careDate, tz) });
    }
  }

  // "Time to eat" after she said "eating in ~30 min".
  for (const item of schedule.timeline) {
    if (item.kind !== "meal") continue;
    const m = item as MealItem;
    if (!m.plannedAt || m.eatenAt || m.meal === "snack" || m.state === "missed") continue;
    for (const r of planEatNudge(careDate, m.meal, m.plannedAt, recipients)) {
      out.push({ ...r, payload: { title: `Time to eat ${m.meal}`, body: "Tap when you start eating, and Bloom will time the next dose.", url: "/", tag: `meal:${careDate}:${m.meal}`, careDate, itemKey: `meal:${m.meal}`, dueLabel: formatClock(m.plannedAt, tz), actionable: false } });
    }
  }

  // Anmum below its minimum at the deadline.
  for (const a of schedule.anmum) {
    if (a.taken >= a.min || a.skipped) continue;
    for (const r of planAnmumReminder(careDate, a.rule.slug, a.deadline, recipients)) {
      out.push({ ...r, payload: { title: `${a.medication.name} today?`, body: `None yet today. A glass before bed counts.`, url: "/", tag: `anmum:${careDate}`, careDate, itemKey: a.rule.slug, dueLabel: formatClock(a.deadline, tz), actionable: false } });
    }
  }

  return out.filter((r) => r.dueAt.getTime() > now.getTime() - STALE_MS);
}
