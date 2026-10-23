// Calendar-feed events from schedules: every open dose with a known time (logged meals, fixed times, snoozes,
// a tapped bedtime), plus the Anmum check-in while it's below its minimum. Taken or skipped doses disappear
// from the feed, so the phone's alarm for them goes away on the next refresh. Pure.
import { servingWords } from "@/lib/servings-words";
import type { DaySchedule, DoseItem } from "@/lib/engine";
import type { IcsEvent } from "@/lib/reminders/ics";

export function feedEvents(schedules: DaySchedule[], now: Date, appUrl: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  for (const s of schedules) {
    for (const item of s.timeline) {
      if (item.kind !== "dose") continue;
      const d = item as DoseItem;
      if (d.estimated || d.rule.ruleType === "daily_count") continue;
      if (d.state !== "upcoming" && d.state !== "due" && d.state !== "snoozed") continue;
      const start = d.snoozedUntil ?? d.targetAt;
      if (!start || start.getTime() < now.getTime() - 60 * 60_000) continue;
      events.push({
        uid: `${s.careDate}-${d.rule.id}-${d.occurrence}@bloom`,
        title: `${d.medication.name}${d.medication.doseLabel ? ` · ${d.medication.doseLabel}` : ""}`,
        description: `${d.rule.label[0]!.toUpperCase()}${d.rule.label.slice(1)}. Tap Done in Bloom when you've taken it.`,
        start,
        durationMin: 10,
        url: appUrl,
        now,
      });
    }
    for (const a of s.anmum) {
      if (a.taken >= a.min || a.skipped || a.deadline.getTime() < now.getTime() - 60 * 60_000) continue;
      events.push({ uid: `${s.careDate}-${a.rule.id}-anmum@bloom`, title: `${a.medication.name} today?`, description: servingWords(a.medication.name, a.medication.doseLabel).drink ? "None logged yet today. A glass before bed counts." : "None logged yet today. Taking it before bed counts.", start: a.deadline, durationMin: 10, url: appUrl, now });
    }
  }
  return events.sort((x, y) => x.start.getTime() - y.start.getTime());
}
