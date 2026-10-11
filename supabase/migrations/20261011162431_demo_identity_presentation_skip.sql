-- A preview-only presentation shortcut is an explicit terminal demo result,
-- not a false claim that the illustrated identity steps were completed.
begin;

alter table public.customer_verification_events
  drop constraint customer_verification_events_step_check;
alter table public.customer_verification_events
  add constraint customer_verification_events_step_check
  check (step in ('consent','details','document_front','document_back','selfie',
    'submitted','demo_passed','demo_skipped','requires_input','cancelled'));

drop index public.verification_one_terminal;
create unique index verification_one_terminal
  on public.customer_verification_events(verification_id)
  where step in ('demo_passed','demo_skipped','requires_input','cancelled');

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
      and event.step in ('demo_passed','demo_skipped')
      and verification.started_at > coalesce(
        demo_private.latest_winner_demo_restart_at(p_customer, public.current_wallet_account_id()),
        '-infinity'::timestamptz
      )
  );
$$;
revoke all on function demo_private.has_demo_identity_confirmation(uuid)
  from public, anon, authenticated, service_role;

create function public.skip_demo_identity_for_presentation(p_reward_id uuid, p_verification_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_wallet uuid;
  v_started timestamptz;
  v_previous text;
  v_sequence integer;
begin
  perform demo_private.lock_identity_demo_customer();
  v_wallet := public.current_wallet_account_id();
  perform 1 from public.customer_rewards reward
    where reward.id = p_reward_id and reward.customer_id = auth.uid()
      and reward.wallet_account_id = v_wallet and reward.source = 'winner'
    for update;
  if not found then
    raise exception 'This winner verification is unavailable.' using errcode = '42501';
  end if;

  select verification.started_at into v_started
  from public.customer_verifications verification
  where verification.id = p_verification_id and verification.customer_id = auth.uid()
    and verification.provider = 'demo'
    and verification.environment = 'development-test'
    and verification.policy_version = 'winner-identity-demo-v1'
  for update;
  if v_started is null or v_started <= coalesce(
    demo_private.latest_winner_demo_restart_at(auth.uid(), v_wallet), '-infinity'::timestamptz
  ) then
    raise exception 'This demo session is no longer available.' using errcode = '42501';
  end if;

  select event.step, event.sequence into v_previous, v_sequence
  from public.customer_verification_events event
  where event.verification_id = p_verification_id
  order by event.sequence desc limit 1;
  if v_previous = 'demo_skipped' then
    return demo_private.verification_response(p_verification_id);
  end if;
  if v_previous in ('demo_passed','requires_input','cancelled') then
    raise exception 'This demo attempt has ended. Reopen the check to continue.' using errcode = 'P0001';
  end if;
  if demo_private.reward_status(p_reward_id) is distinct from 'ready'
    or exists (select 1 from public.reward_events event
      where event.reward_id = p_reward_id and event.event_type = 'claimed') then
    raise exception 'This reward is no longer ready to claim.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from demo_private.reward_credentials credential
    where credential.reward_id = p_reward_id and credential.redeemable is false) then
    raise exception 'Only a non-redeemable sample reward can use this shortcut.' using errcode = '42501';
  end if;

  insert into public.customer_verification_events(verification_id, customer_id, step, sequence)
    values (p_verification_id, auth.uid(), 'demo_skipped', coalesce(v_sequence, 0) + 1);
  return demo_private.verification_response(p_verification_id);
end $$;
revoke all on function public.skip_demo_identity_for_presentation(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.skip_demo_identity_for_presentation(uuid, uuid) to authenticated;

-- A replay after using the shortcut must start a fresh sample walkthrough.
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
        and event.step in ('requires_input', 'cancelled', 'demo_passed', 'demo_skipped')
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
