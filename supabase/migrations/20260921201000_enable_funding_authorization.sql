-- Enable only after the matching confirmation UI and server action are deployed.
begin;
do $$ begin
  if not coalesce((select environment='development-test' and preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1'
    from demo_private.funding_config where singleton),false) then
    raise exception 'Demo environment mismatch';
  end if;
end $$;
update demo_private.funding_config set funding_reauth_required=true where singleton;
commit;
