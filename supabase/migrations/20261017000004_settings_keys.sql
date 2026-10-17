-- Engine settings that were hardcoded at first: lead time for "eating in ~N min" without a pre-meal rule,
-- and how long before a shift to suggest finishing a meal.
alter table bloom.households alter column settings set default (
  '{
    "anmum_deadline": "21:00",
    "summary_time": "09:00",
    "iron_spacing_min": 120,
    "nag_after_min": 15,
    "escalate_after_min": 30,
    "caregiver_can_log": false,
    "care_day_starts": "04:00",
    "meal_windows": {
      "breakfast": ["07:00", "10:00"],
      "lunch": ["10:00", "12:00"],
      "dinner": ["17:00", "22:00"]
    },
    "bedtime_default": "01:00",
    "late_grace_min": 15,
    "meal_lead_min": 30,
    "shift_prep_min": 30
  }'::jsonb
);

update bloom.households
   set settings = '{"late_grace_min": 15, "meal_lead_min": 30, "shift_prep_min": 30}'::jsonb || settings;
