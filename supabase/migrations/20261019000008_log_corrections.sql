-- Corrections: Undo and "mark as not taken / not eaten" remove a log row. Same rule as writing:
-- the patient (or the caregiver, if she allowed it), inside her own household.
grant delete on bloom.meal_logs, bloom.dose_logs to authenticated;

create policy meal_logs_delete on bloom.meal_logs for delete to authenticated
  using (household_id = bloom.auth_household_id() and bloom.auth_can_log());
create policy dose_logs_delete on bloom.dose_logs for delete to authenticated
  using (household_id = bloom.auth_household_id() and bloom.auth_can_log());
