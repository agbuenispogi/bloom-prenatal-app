-- One-time fix for households created before migration 0007: split the combined
-- "Ferrous sulfate + Folic acid" medicine into two (both at 17:00). Safe to run twice.
-- Run in Supabase → SQL Editor. Only touches the `bloom` schema.
do $$
declare
  r record;
  m_folic uuid;
begin
  for r in select id, household_id from bloom.medications where slug = 'iron-folic' loop
    update bloom.medications
       set slug = 'ferrous-sulfate', name = 'Ferrous sulfate', dose_label = '1 tablet'
     where id = r.id;
    update bloom.medication_rules
       set slug = 'ferrous-sulfate-afternoon'
     where medication_id = r.id and slug = 'iron-folic-afternoon';

    if not exists (select 1 from bloom.medications where household_id = r.household_id and lower(name) = 'folic acid') then
      insert into bloom.medications (household_id, slug, name, dose_label, color, icon, spacing_class, sort)
        values (r.household_id, 'folic-acid', 'Folic acid', '1 tablet', 'oat', 'tablet', null, 4)
        returning id into m_folic;
      insert into bloom.medication_rules (household_id, medication_id, slug, label, rule_type, fixed_time, sort)
        values (r.household_id, m_folic, 'folic-acid-afternoon', 'afternoon dose', 'fixed_time', '17:00', 7);
    end if;
  end loop;
end $$;

-- Check: should list Ferrous sulfate and Folic acid as separate rows.
select m.name, m.dose_label, r.label, r.fixed_time
  from bloom.medications m join bloom.medication_rules r on r.medication_id = m.id
 where r.rule_type = 'fixed_time' order by m.sort;
