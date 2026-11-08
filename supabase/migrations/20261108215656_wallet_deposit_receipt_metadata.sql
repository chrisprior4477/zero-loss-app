-- Add receipt display fields to the existing account-scoped history read.
create or replace function public.get_demo_funding_requests() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_wallet uuid:=public.current_wallet_account_id(); v_rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc),'[]'::jsonb) into v_rows from (
    select s.id,s.amount,s.currency,s.status,s.created_at,
      s.idempotency_key as "idempotencyKey",
      m.provider_token as "sampleCard", l.created_at as "postedAt",
      case when p.event_id is null and a.event_id is null and l.id is null and s.status='created' then 'not_processed'
        when p.event_id is not null and a.event_id is null and l.id is null and s.status in ('created','processing','timed_out') then 'credit_pending'
        when p.event_id=a.event_id and a.ledger_id=l.id and s.status='succeeded'
          and s.provider_event_id=p.event_id::text and l.amount=s.amount and l.currency=s.currency
          and l.wallet_account_id=s.wallet_account_id and l.customer_id=s.customer_id then 'reconciled'
        else 'discrepancy' end as reconciliation
    from public.demo_funding_sessions s
    left join demo_private.provider_receipts p on p.session_id=s.id
    left join demo_private.accepted_events a on a.session_id=s.id
    left join public.ledger_entries l on l.demo_funding_session_id=s.id
    left join demo_private.funding_payment_methods m on m.session_id=s.id and m.customer_id=s.customer_id
    where s.customer_id=auth.uid() and s.wallet_account_id=v_wallet
  ) r;
  return v_rows;
end $$;

notify pgrst,'reload schema';
