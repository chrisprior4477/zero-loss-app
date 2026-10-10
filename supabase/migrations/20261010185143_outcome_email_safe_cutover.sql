-- Do not replay results recorded while outcome mail was disabled. The owner
-- approved future emails, not a retroactive batch when the worker starts.
begin;

update public.entry_outcome_email_deliveries
set status = 'cancelled',
    last_error = 'Delivery was inactive when this result was recorded; no retroactive email',
    updated_at = now()
where status = 'pending'
  and not exists (
    select 1 from demo_private.outcome_email_worker_config
    where singleton = true and enabled = true
  );

commit;
