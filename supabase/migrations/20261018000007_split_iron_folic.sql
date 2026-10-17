-- Ferrous sulfate and folic acid are two separate tablets (both ~5 PM): seed them as two medicines.
-- Only affects households created from now on; an existing household is changed in Settings → Medicines.
create or replace function bloom.seed_household_defaults(p_household uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  m_gaviscon uuid; m_caltrate uuid; m_iron uuid; m_folic uuid; m_anmum uuid;
begin
  insert into bloom.medications (household_id, slug, name, dose_label, color, icon, spacing_class, sort) values
    (p_household, 'gaviscon', 'Gaviscon', '10 ml', 'mint', 'bottle', 'antacid', 1) returning id into m_gaviscon;
  insert into bloom.medications (household_id, slug, name, dose_label, color, icon, spacing_class, sort) values
    (p_household, 'caltrate', 'Caltrate', '1 tablet', 'sky', 'tablet', 'calcium', 2) returning id into m_caltrate;
  insert into bloom.medications (household_id, slug, name, dose_label, color, icon, spacing_class, sort) values
    (p_household, 'ferrous-sulfate', 'Ferrous sulfate', '1 tablet', 'clay', 'capsule', 'iron', 3) returning id into m_iron;
  insert into bloom.medications (household_id, slug, name, dose_label, color, icon, spacing_class, sort) values
    (p_household, 'folic-acid', 'Folic acid', '1 tablet', 'oat', 'tablet', null, 4) returning id into m_folic;
  insert into bloom.medications (household_id, slug, name, dose_label, color, icon, spacing_class, sort) values
    (p_household, 'anmum', 'Anmum Materna', '1 glass', 'blush', 'cup', null, 5) returning id into m_anmum;

  insert into bloom.medication_rules
    (household_id, medication_id, slug, label, rule_type, anchor, offset_min, fixed_time, min_per_day, max_per_day, deadline, sort)
  values
    (p_household, m_gaviscon, 'gaviscon-before-breakfast',  'before breakfast', 'before_meal', 'breakfast', -30, null, 1, 1, null, 1),
    (p_household, m_gaviscon, 'gaviscon-before-lunch',      'before lunch',     'before_meal', 'lunch',     -30, null, 1, 1, null, 3),
    (p_household, m_caltrate, 'caltrate-after-lunch',       'after lunch',      'after_meal',  'lunch',      60, null, 1, 1, null, 5),
    (p_household, m_iron,     'ferrous-sulfate-afternoon',  'afternoon dose',   'fixed_time',  null,          0, '17:00', 1, 1, null, 6),
    (p_household, m_folic,    'folic-acid-afternoon',       'afternoon dose',   'fixed_time',  null,          0, '17:00', 1, 1, null, 7),
    (p_household, m_gaviscon, 'gaviscon-before-dinner',     'before dinner',    'before_meal', 'dinner',    -30, null, 1, 1, null, 8),
    (p_household, m_caltrate, 'caltrate-after-dinner',      'after dinner',     'after_meal',  'dinner',     60, null, 1, 1, null, 9),
    (p_household, m_gaviscon, 'gaviscon-bedtime',           'at bedtime',       'bedtime',     'bedtime',     0, null, 1, 1, null, 10),
    (p_household, m_anmum,    'anmum-daily',                'once or twice a day', 'daily_count', null,       0, null, 1, 2, '21:00', 11);

  -- 0 = Sunday. Mon 19:00–24:00, Tue–Fri 14:00–24:00, weekends off.
  insert into bloom.work_schedule (household_id, weekday, start_time, end_time) values
    (p_household, 0, null, null),
    (p_household, 1, '19:00', '24:00'),
    (p_household, 2, '14:00', '24:00'),
    (p_household, 3, '14:00', '24:00'),
    (p_household, 4, '14:00', '24:00'),
    (p_household, 5, '14:00', '24:00'),
    (p_household, 6, null, null);
end $$;
revoke all on function bloom.seed_household_defaults(uuid) from public, anon, authenticated;
