begin;

create function public.get_own_demo_activity_reset_receipt(p_request_key text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('clearedCount', reset.entry_count, 'clearedCents', reset.cleared_cents::text)
  from demo_private.all_activity_reset_requests as reset
  join public.wallet_accounts as wallet on wallet.id = reset.wallet_account_id
  where reset.customer_id = (select auth.uid())
    and reset.request_key = p_request_key
    and reset.wallet_account_id = (select public.current_wallet_account_id())
    and wallet.customer_id = reset.customer_id and wallet.scope = 'demo' and wallet.closed_at is null;
$$;

revoke all on function public.get_own_demo_activity_reset_receipt(text) from public, anon, authenticated, service_role;
grant execute on function public.get_own_demo_activity_reset_receipt(text) to authenticated;
notify pgrst, 'reload schema';
commit;
