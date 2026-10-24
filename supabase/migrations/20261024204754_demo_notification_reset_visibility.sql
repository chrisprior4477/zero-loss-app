-- Reuse the atomic full-reset record as the notification cutoff. No activity,
-- membership, messages or financial audit records are deleted or rewritten.
begin;
create or replace function demo_private.get_demo_wallet_history_visibility() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_wallet uuid := public.current_wallet_account_id();
begin
  if auth.uid() is null or not exists (
    select 1 from public.wallet_accounts
    where id = v_wallet and customer_id = auth.uid() and scope = 'demo' and closed_at is null
  ) then
    raise exception 'Demo wallet unavailable' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'ledgerEntryIds', coalesce((select jsonb_agg(a.ledger_entry_id)
      from demo_private.wallet_history_archives a
      where a.wallet_account_id = v_wallet and a.customer_id = auth.uid()
        and a.ledger_entry_id is not null), '[]'::jsonb),
    'fundingSessionIds', coalesce((select jsonb_agg(a.funding_session_id)
      from demo_private.wallet_history_archives a
      where a.wallet_account_id = v_wallet and a.customer_id = auth.uid()
        and a.funding_session_id is not null), '[]'::jsonb),
    'notificationResetAt', (select max(r.created_at) from demo_private.all_activity_reset_requests r
      where r.wallet_account_id = v_wallet and r.customer_id = auth.uid()),
    'fullReset', exists (select 1 from demo_private.all_activity_reset_requests r
      where r.wallet_account_id = v_wallet and r.customer_id = auth.uid())
  );
end;
$$;


revoke all on function demo_private.get_demo_wallet_history_visibility() from public, anon, authenticated, service_role;
grant execute on function demo_private.get_demo_wallet_history_visibility() to authenticated;
create or replace function public.get_demo_wallet_history_visibility() returns jsonb
language sql stable security invoker set search_path='' as $$
  select demo_private.get_demo_wallet_history_visibility();
$$;
revoke all on function public.get_demo_wallet_history_visibility() from public, anon, authenticated, service_role;
grant execute on function public.get_demo_wallet_history_visibility() to authenticated;
notify pgrst, 'reload schema';
commit;
