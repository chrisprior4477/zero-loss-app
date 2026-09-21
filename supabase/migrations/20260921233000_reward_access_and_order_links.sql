-- Add exact reward references to the existing order projection, and apply the
-- same current-state checks to both credential reads and claim retries.
-- No customer rows, credentials, history, balances or sample records change.
begin;

create or replace function public.get_account_orders()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_wallet uuid := public.current_wallet_account_id(); v_rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc, x.order_number desc), '[]'::jsonb)
  into v_rows from (
    select o.order_number, e.offering_slug as reward_slug, r.id as reward_id, p.title, p.retailer,
      p.image_path as image, r.face_value_cents, o.total_cents as amount_paid_cents,
      coalesce((select oe.event_type from public.order_events oe
        where oe.order_id = o.id order by oe.created_at desc, oe.id desc limit 1), 'payment_confirmed') as status,
      o.created_at
    from public.customer_orders o
    join public.customer_rewards r on r.id = o.reward_id
    join public.customer_entries e on e.id = r.customer_entry_id
    join demo_private.preview_entry_offerings p on p.slug = e.offering_slug
    where o.customer_id = auth.uid() and o.wallet_account_id = v_wallet
  ) x;
  return v_rows;
end;
$$;
revoke all on function public.get_account_orders() from public, anon, authenticated, service_role;
grant execute on function public.get_account_orders() to authenticated;

create or replace function public.claim_preview_reward(p_reward_id uuid, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_reward public.customer_rewards;
  v_existing public.reward_events;
  v_credential demo_private.reward_credentials;
  v_inserted integer;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid request' using errcode = '22023';
  end if;

  -- Replays do not grant enduring access: re-check owner, current wallet and
  -- lifecycle before returning a credential, even for an already-used key.
  select * into v_reward from public.customer_rewards
    where id = p_reward_id and customer_id = v_uid
      and wallet_account_id = public.current_wallet_account_id() for update;
  if not found then raise exception 'Reward unavailable' using errcode = '42501'; end if;
  if demo_private.reward_status(v_reward.id) is distinct from 'ready' then
    raise exception 'This reward is not available to claim or use. Refresh to see its current status.' using errcode = 'P0001';
  end if;
  select * into v_credential from demo_private.reward_credentials where reward_id = v_reward.id;
  if not found or nullif(trim(v_credential.credential), '') is null then
    raise exception 'Your gift-card number is unavailable. Please try again or contact support.' using errcode = 'P0001';
  end if;

  select * into v_existing from public.reward_events where customer_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.reward_id <> p_reward_id or v_existing.event_type <> 'claimed' then
      raise exception 'Request key reused for another action' using errcode = '22023';
    end if;
    return jsonb_build_object('status','claimed','duplicate',true,'credential',v_credential.credential,'redeemable',v_credential.redeemable);
  end if;

  -- The existing identity-verification trigger still authorizes new wins.
  insert into public.reward_events(reward_id, customer_id, event_type, idempotency_key)
  values (v_reward.id, v_uid, 'claimed', p_idempotency_key)
  on conflict (reward_id) where event_type = 'claimed' do nothing;
  get diagnostics v_inserted = row_count;
  update public.reward_claim_reminders set status = 'cancelled', updated_at = now()
    where reward_id = v_reward.id and status = 'pending';
  return jsonb_build_object('status','claimed','duplicate',v_inserted = 0,
    'credential',v_credential.credential,'redeemable',v_credential.redeemable,
    'claimExpiresAt',demo_private.reward_deadline(v_reward.id));
end;
$$;
revoke all on function public.claim_preview_reward(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.claim_preview_reward(uuid,text) to authenticated;

create or replace function public.get_claimed_reward(p_reward_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_reward public.customer_rewards; v_credential demo_private.reward_credentials;
begin
  select * into v_reward from public.customer_rewards where id = p_reward_id and customer_id = auth.uid()
    and wallet_account_id = public.current_wallet_account_id();
  if not found then raise exception 'Reward unavailable' using errcode = '42501'; end if;
  if not exists(select 1 from public.reward_events where reward_id = v_reward.id and event_type = 'claimed')
    or demo_private.reward_status(v_reward.id) is distinct from 'ready' then return null; end if;
  select * into v_credential from demo_private.reward_credentials where reward_id = v_reward.id;
  if not found or nullif(trim(v_credential.credential), '') is null then return null; end if;
  return jsonb_build_object('code',v_credential.credential,'redeemable',v_credential.redeemable,'provider',v_credential.provider);
end;
$$;
revoke all on function public.get_claimed_reward(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_claimed_reward(uuid) to authenticated;

commit;
