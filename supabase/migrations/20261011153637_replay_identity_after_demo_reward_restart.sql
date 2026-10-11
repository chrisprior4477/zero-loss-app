-- A winner-reward restart begins a new *demo presentation* cycle. Keep every
-- previous verification and prize record immutable; require a fresh sample
-- pass only for future, unclaimed winner rewards in this wallet.
begin;

create function demo_private.latest_winner_demo_restart_at(p_customer uuid, p_wallet uuid)
returns timestamptz language sql stable security definer set search_path = '' as $$
  select max(restart.created_at)
  from public.demo_reward_restarts restart
  join public.customer_rewards reward on reward.id = restart.reward_id
  where restart.customer_id = p_customer and restart.wallet_account_id = p_wallet
    and reward.customer_id = p_customer and reward.wallet_account_id = p_wallet
    and reward.source = 'winner';
$$;
revoke all on function demo_private.latest_winner_demo_restart_at(uuid, uuid)
  from public, anon, authenticated, service_role;

create or replace function demo_private.has_demo_identity_confirmation(p_customer uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.customer_verifications verification
    join public.customer_verification_events event on event.verification_id = verification.id
    where verification.customer_id = p_customer
      and verification.provider = 'demo'
      and verification.environment = 'development-test'
      and verification.policy_version = 'winner-identity-demo-v1'
      and event.step = 'demo_passed'
      and verification.started_at > coalesce(
        demo_private.latest_winner_demo_restart_at(p_customer, public.current_wallet_account_id()),
        '-infinity'::timestamptz
      )
  );
$$;
revoke all on function demo_private.has_demo_identity_confirmation(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.begin_demo_identity_verification(p_reward_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_wallet uuid; v_cutoff timestamptz;
begin
  perform demo_private.lock_identity_demo_customer();
  v_wallet := public.current_wallet_account_id();
  if not exists (
    select 1 from public.customer_rewards
    where id = p_reward_id and customer_id = auth.uid()
      and wallet_account_id = v_wallet and source = 'winner'
  ) then
    raise exception 'This winner verification is unavailable.' using errcode = '42501';
  end if;
  v_cutoff := demo_private.latest_winner_demo_restart_at(auth.uid(), v_wallet);
  -- Resume only a session from this presentation cycle. Earlier passes and
  -- interrupted attempts remain in the account's immutable audit history.
  select verification.id into v_id
  from public.customer_verifications verification
  where verification.customer_id = auth.uid()
    and verification.started_at > coalesce(v_cutoff, '-infinity'::timestamptz)
    and not exists (
      select 1 from public.customer_verification_events event
      where event.verification_id = verification.id
        and event.step in ('requires_input', 'cancelled')
    )
  order by verification.started_at desc limit 1;
  if v_id is null then
    if (select count(*) from public.customer_verifications
      where customer_id = auth.uid() and started_at > clock_timestamp() - interval '1 hour') >= 5 then
      raise exception 'Five demo verification attempts per hour. Please try again later.' using errcode = 'P0001';
    end if;
    insert into public.customer_verifications(customer_id)
      values (auth.uid()) returning id into v_id;
  end if;
  return demo_private.verification_response(v_id);
end $$;
revoke all on function public.begin_demo_identity_verification(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.begin_demo_identity_verification(uuid) to authenticated;

create or replace function public.restart_demo_identity_verification(p_reward_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_wallet uuid; v_cutoff timestamptz;
begin
  perform demo_private.lock_identity_demo_customer();
  v_wallet := public.current_wallet_account_id();
  if not exists (
    select 1 from public.customer_rewards
    where id = p_reward_id and customer_id = auth.uid()
      and wallet_account_id = v_wallet and source = 'winner'
  ) then
    raise exception 'This winner verification is unavailable.' using errcode = '42501';
  end if;
  v_cutoff := demo_private.latest_winner_demo_restart_at(auth.uid(), v_wallet);
  select verification.id into v_id
  from public.customer_verifications verification
  where verification.customer_id = auth.uid()
    and verification.started_at > coalesce(v_cutoff, '-infinity'::timestamptz)
    and not exists (
      select 1 from public.customer_verification_events event
      where event.verification_id = verification.id
        and event.step in ('requires_input', 'cancelled', 'demo_passed')
    )
  order by verification.started_at desc limit 1;
  if v_id is null then
    if (select count(*) from public.customer_verifications
      where customer_id = auth.uid() and started_at > clock_timestamp() - interval '1 hour') >= 5 then
      raise exception 'Five demo verification attempts per hour. Please try again later.' using errcode = 'P0001';
    end if;
    insert into public.customer_verifications(customer_id)
      values (auth.uid()) returning id into v_id;
  end if;
  return demo_private.verification_response(v_id);
end $$;
revoke all on function public.restart_demo_identity_verification(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.restart_demo_identity_verification(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
