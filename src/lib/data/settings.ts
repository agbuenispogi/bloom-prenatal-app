import { z } from "zod";
import type { EngineSettings } from "@/lib/engine";

const hhmm = z.string().regex(/^\d{1,2}:\d{2}$/);
const window = z.tuple([hhmm, hhmm]);

// households.settings (jsonb, snake_case) → typed settings. Missing keys fall back to the seeded defaults,
// so older rows and partial edits never break the engine.
const schema = z.object({
  care_day_starts: hhmm.default("04:00"),
  meal_windows: z
    .object({ breakfast: window, lunch: window, dinner: window })
    .default({ breakfast: ["07:00", "10:00"], lunch: ["10:00", "12:00"], dinner: ["17:00", "22:00"] }),
  bedtime_default: hhmm.default("01:00"),
  iron_spacing_min: z.number().int().min(0).max(720).default(120),
  anmum_deadline: hhmm.default("21:00"),
  late_grace_min: z.number().int().min(0).max(120).default(15),
  nag_after_min: z.number().int().min(1).max(240).default(15),
  escalate_after_min: z.number().int().min(1).max(480).default(30),
  meal_lead_min: z.number().int().min(5).max(120).default(30),
  shift_prep_min: z.number().int().min(0).max(240).default(30),
  summary_time: hhmm.default("09:00"),
  caregiver_can_log: z.boolean().default(false),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
});

export interface HouseholdSettings {
  engine: EngineSettings;
  summaryTime: string;
  caregiverCanLog: boolean;
  dueDate: string | null;
}

export function parseHouseholdSettings(tz: string, raw: unknown): HouseholdSettings {
  const s = schema.parse(raw ?? {});
  return {
    engine: {
      tz,
      careDayStarts: s.care_day_starts,
      mealWindows: s.meal_windows,
      bedtimeDefault: s.bedtime_default,
      ironSpacingMin: s.iron_spacing_min,
      anmumDeadline: s.anmum_deadline,
      lateGraceMin: s.late_grace_min,
      nagAfterMin: s.nag_after_min,
      escalateAfterMin: s.escalate_after_min,
      mealLeadMin: s.meal_lead_min,
      shiftPrepMin: s.shift_prep_min,
    },
    summaryTime: s.summary_time,
    caregiverCanLog: s.caregiver_can_log,
    dueDate: s.due_date,
  };
}
