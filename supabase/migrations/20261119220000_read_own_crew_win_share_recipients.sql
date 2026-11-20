begin;

create function public.get_crew_win_share_recipients(p_reward_id uuid)
returns uuid[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(share.recipient_id), array[]::uuid[])
  from public.crew_win_share_emails as share
  where share.sender_id = (select auth.uid())
    and share.reward_id = p_reward_id
    and exists (
      select 1 from public.customer_rewards as reward
      where reward.id = share.reward_id and reward.customer_id = share.sender_id
        and reward.source = 'winner'
    );
$$;

revoke all on function public.get_crew_win_share_recipients(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_crew_win_share_recipients(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
