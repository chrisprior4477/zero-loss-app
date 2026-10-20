-- now() is fixed at transaction start. Decline/revive actions in one
-- transaction therefore tied and option_status fell back to random UUID order.
-- These actions already lock their parent completion option before inserting.
-- Timestamp new events at insertion; preserve every existing history row.
alter table public.completion_option_events
  alter column created_at set default clock_timestamp();
