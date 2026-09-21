-- Apply only after the matching claim-dialog app has deployed to the preview alias.
begin;
do $$ begin
  if not coalesce((select environment='development-test' and preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1'
    and enabled and preview_entries_enabled from demo_private.funding_config where singleton),false) then
    raise exception 'Only the approved development-test environment may enable this demo';
  end if;
  if to_regprocedure('public.advance_demo_identity_verification(uuid,text,text)') is null then
    raise exception 'Demo verification schema is missing';
  end if;
end $$;
update demo_private.funding_config set winner_verification_required=true where singleton;
commit;
