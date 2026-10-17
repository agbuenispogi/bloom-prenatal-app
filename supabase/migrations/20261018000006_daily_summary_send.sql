-- Daily summary sending: claim + retry bookkeeping (the dispatcher sends one summary per household per day).
alter table bloom.daily_summaries
  add column claimed_at timestamptz,
  add column attempts smallint not null default 0,
  add column last_error text;
