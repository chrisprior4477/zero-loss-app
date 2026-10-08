-- Let a confirmed preview customer replay the extra-entry explanation without
-- changing entries, wallet funds, or another customer's preference.
begin;

create function public.reset_extra_entry_explainer()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.wallet_accounts as w
    where w.customer_id = caller and w.scope = 'demo' and w.closed_at is null
  ) then
    raise exception 'Demo wallet required' using errcode = '42501';
  end if;

  update public.customer_profiles as p
  set extra_entry_explainer_acknowledged_at = null
  where p.customer_id = caller;

  if not found then
    raise exception 'No customer profile for the current user' using errcode = 'P0002';
  end if;

  return true;
end;
$$;

comment on function public.reset_extra_entry_explainer() is
  'Clears only the authenticated demo customer''s extra-entry explainer acknowledgment for preview replay.';
revoke all on function public.reset_extra_entry_explainer()
  from public, anon, authenticated, service_role;
grant execute on function public.reset_extra_entry_explainer() to authenticated;

notify pgrst, 'reload schema';
commit;
