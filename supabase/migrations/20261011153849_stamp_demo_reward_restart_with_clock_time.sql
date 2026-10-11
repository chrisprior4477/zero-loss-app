-- A demo restart is an event boundary, including when tests or future
-- orchestration perform multiple actions inside one database transaction.
-- now() is fixed at transaction start and can predate a verification that
-- actually occurred before the restart.
begin;
alter table public.demo_reward_restarts
  alter column created_at set default clock_timestamp();
commit;
