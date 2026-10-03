-- Enable only on the already-authorized preview project after its matching
-- claim-dialog app has deployed. A fresh local/CI database replays the schema
-- but must not activate this demo feature or fail because it has no live issuer.
begin;
do $$ begin
  if to_regprocedure('public.advance_demo_identity_verification(uuid,text,text)') is null then
    raise exception 'Demo verification schema is missing';
  end if;
end $$;
update demo_private.funding_config set winner_verification_required=true
where singleton and environment='development-test'
  and preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1'
  and enabled and preview_entries_enabled;
commit;
