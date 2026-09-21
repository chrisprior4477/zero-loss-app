-- Replay only the sample walkthrough; never revoke a passed result or reissue a prize.
begin;
create function public.restart_demo_identity_verification(p_reward_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  perform demo_private.lock_identity_demo_customer();
  if not exists(select 1 from public.customer_rewards where id=p_reward_id and customer_id=auth.uid()
    and wallet_account_id=public.current_wallet_account_id() and source='winner') then
    raise exception 'This winner verification is unavailable.' using errcode='42501';
  end if;
  select v.id into v_id from public.customer_verifications v where v.customer_id=auth.uid()
    and not exists(select 1 from public.customer_verification_events e where e.verification_id=v.id
      and e.step in ('requires_input','cancelled','demo_passed'))
    order by v.started_at desc limit 1;
  if v_id is null then
    if (select count(*) from public.customer_verifications where customer_id=auth.uid() and started_at>clock_timestamp()-interval '1 hour')>=5 then
      raise exception 'Five demo verification attempts per hour. Please try again later.' using errcode='P0001';
    end if;
    insert into public.customer_verifications(customer_id) values(auth.uid()) returning id into v_id;
  end if;
  return demo_private.verification_response(v_id);
end $$;
revoke all on function public.restart_demo_identity_verification(uuid) from public,anon,authenticated,service_role;
grant execute on function public.restart_demo_identity_verification(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
