begin;

create function purchase_private.read_checkout_receipt(p_request_id uuid, p_slug text)
returns jsonb language sql stable security definer set search_path='' as $$
  select r.result
  from purchase_private.bulk_checkout_receipts r
  where r.customer_id = auth.uid()
    and r.request_id = p_request_id
    and r.request->>'slug' = p_slug
$$;

create function public.read_preview_checkout_receipt(p_request_id uuid, p_slug text)
returns jsonb language sql stable security invoker set search_path='' as $$
  select purchase_private.read_checkout_receipt(p_request_id, p_slug)
$$;

create function demo_private.read_wallet_history_reset(p_kind text, p_request_key text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'hiddenCount', (select count(*) from demo_private.wallet_history_archives a where a.reset_id = r.id
      and case when p_kind = 'deposits' then a.funding_session_id is not null else a.ledger_entry_id is not null end),
    'clearedCents', r.cleared_cents::text)
  from demo_private.wallet_history_reset_requests r
  where r.customer_id = auth.uid()
    and r.wallet_account_id = public.current_wallet_account_id()
    and r.kind = p_kind
    and r.request_key = p_request_key
$$;

create function public.read_demo_wallet_history_reset(p_kind text, p_request_key text)
returns jsonb language sql stable security invoker set search_path='' as $$
  select demo_private.read_wallet_history_reset(p_kind, p_request_key)
$$;

revoke all on function purchase_private.read_checkout_receipt(uuid, text), public.read_preview_checkout_receipt(uuid, text),
  demo_private.read_wallet_history_reset(text, text), public.read_demo_wallet_history_reset(text, text)
  from public, anon, authenticated, service_role;
grant execute on function purchase_private.read_checkout_receipt(uuid, text), public.read_preview_checkout_receipt(uuid, text),
  demo_private.read_wallet_history_reset(text, text), public.read_demo_wallet_history_reset(text, text)
  to authenticated;

notify pgrst, 'reload schema';
commit;
