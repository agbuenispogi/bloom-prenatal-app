import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import type { MedData, OverrideData, RuleData, ShiftDay, Tab } from "@/components/settings/types";
import type { Database } from "@/lib/supabase/database.types";

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);
const TABS = new Set(["mint", "sky", "clay", "blush", "oat"]);

export function toMedData(meds: Row<"medications">[], rules: Row<"medication_rules">[]): MedData[] {
  return [...meds]
    .sort((a, b) => a.sort - b.sort)
    .map((m) => ({
      id: m.id,
      name: m.name,
      doseLabel: m.dose_label,
      color: (TABS.has(m.color) ? m.color : "oat") as Tab,
      active: m.active,
      rules: rules
        .filter((r) => r.medication_id === m.id)
        .sort((a, b) => a.sort - b.sort)
        .map(
          (r): RuleData => ({
            id: r.id,
            label: r.label,
            ruleType: r.rule_type,
            anchor: r.anchor,
            minutes: Math.abs(r.offset_min),
            fixedTime: hhmm(r.fixed_time),
            minPerDay: r.min_per_day,
            maxPerDay: r.max_per_day,
            deadline: hhmm(r.deadline),
            active: r.active,
          }),
        ),
    }));
}

export function toShiftDays(rows: Row<"work_schedule">[]): ShiftDay[] {
  return rows.map((w) => ({ weekday: w.weekday, start: hhmm(w.start_time), end: hhmm(w.end_time) }));
}

export function toOverrides(rows: Row<"schedule_overrides">[]): OverrideData[] {
  return [...rows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((o) => ({
      id: o.id,
      date: o.date,
      label: formatInTimeZone(new Date(`${o.date}T12:00:00Z`), "UTC", "EEE d MMM"),
      isOff: o.is_off,
      start: hhmm(o.start_time),
      end: hhmm(o.end_time),
      note: o.note,
    }));
}
