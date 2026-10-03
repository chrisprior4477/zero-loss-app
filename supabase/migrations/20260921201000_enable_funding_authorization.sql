-- Enable only on the already-authorized preview project after the matching
-- confirmation UI and server action are deployed. A clean local/CI database
-- intentionally leaves this switch off.
begin;
update demo_private.funding_config set funding_reauth_required=true
where singleton and environment='development-test'
  and preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1';
commit;
