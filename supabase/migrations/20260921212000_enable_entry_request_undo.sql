-- Schedule undo finalization only on the already-authorized preview project
-- after the compatible toast/app deployment is Ready. A fresh local/CI
-- database installs pg_cron for later migrations but leaves this job inert.
begin;
create extension if not exists pg_cron with schema pg_catalog;
do $$ begin
  if coalesce((select environment='development-test' and preview_entries_enabled
    and preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1'
    from demo_private.funding_config where singleton),false) then
    if exists(select 1 from cron.job where jobname='zero-loss-finalize-demo-entry-requests') then
      raise exception 'Entry scheduler already exists; inspect it before replacing anything';
    end if;
    perform cron.schedule('zero-loss-finalize-demo-entry-requests','5 seconds','select demo_private.finalize_due_entry_requests();');
    update demo_private.funding_config set entry_undo_required=true where singleton;
  end if;
end $$;
commit;
