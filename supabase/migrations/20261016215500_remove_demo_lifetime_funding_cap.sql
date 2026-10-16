-- Allow any cumulative demo wallet balance while retaining the $500 limit
-- on each request, request-rate limits, idempotency and ledger-only crediting.
create or replace function public.create_demo_funding_session(p_amount integer, p_idempotency_key text)
returns public.demo_funding_sessions language plpgsql security definer set search_path = '' as $$
declare v_wallet uuid := demo_private.lock_funding_wallet(); v_session public.demo_funding_sessions;
begin
  if p_amount is null or p_amount < 100 or p_amount > 50000 then
    raise exception 'Funding amount must be between 100 and 50000 cents' using errcode = '22023';
  end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid idempotency key' using errcode = '22023';
  end if;
  select * into v_session from public.demo_funding_sessions where customer_id = auth.uid() and idempotency_key = p_idempotency_key;
  if found then
    if v_session.amount <> p_amount or v_session.wallet_account_id <> v_wallet then
      raise exception 'Idempotency key belongs to a different funding request' using errcode = '22023';
    end if;
    return v_session;
  end if;
  -- Serialize under the customer lock and retain abuse limits without a total-dollar cap.
  if (select count(*) from public.demo_funding_sessions where customer_id = auth.uid() and created_at > clock_timestamp() - interval '1 minute') >= 3 then
    raise exception 'Demo limit: three new requests per minute. Retry this request later.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.demo_funding_sessions where customer_id = auth.uid() and created_at > clock_timestamp() - interval '24 hours') >= 20 then
    raise exception 'Demo limit: twenty new requests per day.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.demo_funding_sessions where customer_id = auth.uid() and status in ('created','processing','timed_out')) >= 3 then
    raise exception 'Resolve your pending demo payments before starting another.' using errcode = 'P0001';
  end if;
  insert into public.demo_funding_sessions(customer_id, amount, idempotency_key, wallet_account_id)
    values (auth.uid(), p_amount, p_idempotency_key, v_wallet) returning * into v_session;
  return v_session;
end $$;
revoke all on function public.create_demo_funding_session(integer,text) from public, anon, authenticated, service_role;
grant execute on function public.create_demo_funding_session(integer,text) to authenticated;
