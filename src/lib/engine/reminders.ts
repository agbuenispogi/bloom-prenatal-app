import { addMinutes } from "./time";
import type { CareDate, EngineSettings } from "./types";

export type ReminderKind = "due" | "nag" | "escalation" | "eat_nudge" | "anmum";
export type Channel = "push" | "email";

export interface Recipient {
  id: string;
  role: "patient" | "caregiver";
  push: boolean;
  email: boolean;
}

export interface PlannedReminder {
  kind: ReminderKind;
  recipientId: string;
  channel: Channel;
  dueAt: Date;
  dedupeKey: string;
}

function key(careDate: CareDate, itemKey: string, kind: ReminderKind, r: Recipient, channel: Channel, dueAt: Date) {
  // dueAt is part of the key, so a snooze (new due time) produces new rows instead of colliding.
  return `${careDate}|${itemKey}|${kind}|${r.id}|${channel}|${dueAt.toISOString()}`;
}

function fanOut(
  careDate: CareDate,
  itemKey: string,
  kind: ReminderKind,
  dueAt: Date,
  recipients: Recipient[],
  channels: Channel[],
): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  for (const r of recipients) {
    for (const channel of channels) {
      if (channel === "push" && !r.push) continue;
      if (channel === "email" && !r.email) continue;
      out.push({ kind, recipientId: r.id, channel, dueAt, dedupeKey: key(careDate, itemKey, kind, r, channel, dueAt) });
    }
  }
  return out;
}

// Reminders for one due dose:
//   at due        → push + email to both
//   +nag (15)     → gentle push to both, if still not logged
//   +escalate (30)→ to the caregiver only (email, or push while email is off)
// Logging the dose cancels whatever hasn't been sent yet.
export function planDoseReminders(
  careDate: CareDate,
  itemKey: string,
  dueAt: Date,
  recipients: Recipient[],
  settings: Pick<EngineSettings, "nagAfterMin" | "escalateAfterMin">,
  escalationChannel: Channel = "email",
): PlannedReminder[] {
  const caregivers = recipients.filter((r) => r.role === "caregiver");
  return [
    ...fanOut(careDate, itemKey, "due", dueAt, recipients, ["push", "email"]),
    ...fanOut(careDate, itemKey, "nag", addMinutes(dueAt, settings.nagAfterMin), recipients, ["push"]),
    ...fanOut(careDate, itemKey, "escalation", addMinutes(dueAt, settings.escalateAfterMin), caregivers, [escalationChannel]),
  ];
}

// "Time to eat" nudge after she logs "eating in ~30 min": push to her only.
export function planEatNudge(careDate: CareDate, meal: string, plannedAt: Date, recipients: Recipient[]): PlannedReminder[] {
  const patient = recipients.filter((r) => r.role === "patient");
  return fanOut(careDate, `meal:${meal}`, "eat_nudge", plannedAt, patient, ["push"]);
}

// Anmum not taken by the deadline: push to both.
export function planAnmumReminder(careDate: CareDate, ruleSlug: string, deadline: Date, recipients: Recipient[]): PlannedReminder[] {
  return fanOut(careDate, ruleSlug, "anmum", deadline, recipients, ["push"]);
}
