begin;

-- One outbox row per recipient and prize, with independent receipts for
-- every allowed group. The existing outbox worker checks the email's scope
-- again at delivery time.
create function demo_private.queue_crew_prize_share(
  p_offering_slug text, p_recipient_ids uuid[], p_group_id uuid, p_groups jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_sender uuid := auth.uid();
  v_group_request boolean := p_groups is not null;
  v_saved_groups jsonb;
  v_requested_groups integer;
  v_requested_pairs integer;
  v_eligible jsonb;
  v_group_count integer;
  v_recipient_count integer;
  v_daily_count integer;
  v_new_count integer;
  v_queued integer;
begin
  if v_sender is null or not exists (
    select 1 from auth.users where id = v_sender and email_confirmed_at is not null
  ) then raise exception 'Confirm your email before sharing' using errcode = '42501'; end if;
  if not exists (select 1 from demo_private.preview_entry_offerings where slug = p_offering_slug)
  then raise exception 'Prize unavailable' using errcode = '22023'; end if;

  if not v_group_request then
    if p_recipient_ids is null or cardinality(p_recipient_ids) not between 1 and 20
      or exists (select 1 from unnest(p_recipient_ids) id where id is null or id = v_sender)
      or (select count(distinct id) from unnest(p_recipient_ids) id) <> cardinality(p_recipient_ids)
    then raise exception 'Choose 1 to 20 different Crew members' using errcode = '22023'; end if;
    p_groups := jsonb_build_object(coalesce(p_group_id::text, 'crew'), to_jsonb(p_recipient_ids));
  end if;
  if jsonb_typeof(p_groups) is distinct from 'object'
  then raise exception 'Choose saved Crew groups' using errcode = '22023'; end if;
  select count(*) into v_requested_groups from jsonb_object_keys(p_groups);
  if v_requested_groups not between 1 and 500
    or exists (select 1 from jsonb_each(p_groups) as scope where jsonb_typeof(scope.value) <> 'array')
  then raise exception 'Choose saved Crew groups' using errcode = '22023'; end if;
  select coalesce(sum(jsonb_array_length(scope.value)), 0) into v_requested_pairs from jsonb_each(p_groups) scope;

  -- Serialize outbox writes and keep the owner’s group membership stable
  -- through receipt creation.
  perform 1 from public.customers where id = v_sender for update;
  if v_group_request or p_group_id is not null then
    select groups into v_saved_groups from public.crew_visibility_settings where owner_id = v_sender for share;
    if (select count(*) from jsonb_array_elements(v_saved_groups) g where p_groups ? (g->>'id')) <> v_requested_groups
    then raise exception 'Selected Crew group changed' using errcode = 'PT409'; end if;
  end if;

  select coalesce(jsonb_agg(to_jsonb(allowed)), '[]'::jsonb),
    count(distinct allowed.scope_key), count(distinct allowed.recipient_id)
  into v_eligible, v_group_count, v_recipient_count
  from (
    select distinct scope.key as scope_key, u.id as recipient_id
    from jsonb_each(p_groups) scope
    cross join lateral jsonb_array_elements_text(scope.value) requested(id)
    join auth.users u on u.id = requested.id::uuid and u.email_confirmed_at is not null
    where u.id <> v_sender
      and ((not v_group_request and p_group_id is null) or exists (
        select 1 from jsonb_array_elements(v_saved_groups) g
        where g->>'id' = scope.key and g->'memberIds' ? u.id::text
      ))
      and exists (
        select 1 from public.crew_invitations c where c.status = 'accepted'
          and ((c.requester_id = v_sender and c.recipient_id = u.id)
            or (c.recipient_id = v_sender and c.requester_id = u.id))
      )
      and not exists (
        select 1 from public.crew_receiving_preferences p
        where p.owner_id = v_sender and p.recipient_id = u.id
          and p.scope_key in ('crew', scope.key) and not p.receiving
      )
  ) allowed;

  if v_recipient_count = 0 or (not v_group_request and v_recipient_count <> v_requested_pairs)
  then raise exception 'No eligible delivery for the selected Crew audience' using errcode = 'PT409'; end if;

  select count(*) into v_daily_count from public.crew_prize_share_emails
    where sender_id = v_sender and created_at > now() - interval '1 day';
  select count(distinct allowed.recipient_id) into v_new_count
    from jsonb_to_recordset(v_eligible) as allowed(scope_key text, recipient_id uuid)
    where not exists (select 1 from public.crew_prize_share_emails s
      where s.sender_id = v_sender and s.recipient_id = allowed.recipient_id and s.offering_slug = p_offering_slug);
  if v_daily_count + v_new_count > 20
  then raise exception 'Crew email limit reached for today' using errcode = 'P0001'; end if;

  insert into public.crew_prize_share_emails(sender_id, recipient_id, offering_slug, scope_key)
    select distinct on (allowed.recipient_id) v_sender, allowed.recipient_id, p_offering_slug, allowed.scope_key
    from jsonb_to_recordset(v_eligible) as allowed(scope_key text, recipient_id uuid)
    order by allowed.recipient_id, allowed.scope_key
    on conflict(sender_id, recipient_id, offering_slug) do nothing;
  get diagnostics v_queued = row_count;

  if v_group_request then
    -- The outbox trigger creates the first receipt. Add each remaining
    -- allowed scope, including on a later share that needs no second email.
    insert into public.product_share_links(owner_id, offering_slug, scope_key)
      select distinct v_sender, p_offering_slug, allowed.scope_key
      from jsonb_to_recordset(v_eligible) as allowed(scope_key text, recipient_id uuid)
      on conflict(owner_id, offering_slug, scope_key) do nothing;
    insert into public.received_product_shares(token, recipient_id)
      select link.token, allowed.recipient_id
      from jsonb_to_recordset(v_eligible) as allowed(scope_key text, recipient_id uuid)
      join public.product_share_links link on link.owner_id = v_sender
        and link.offering_slug = p_offering_slug and link.scope_key = allowed.scope_key
      on conflict(token, recipient_id) do nothing;
  end if;

  return jsonb_build_object('queued', v_queued, 'alreadyShared', v_recipient_count - v_queued,
    'groupCount', v_group_count, 'partial', jsonb_array_length(v_eligible) < v_requested_pairs
      or v_group_count < v_requested_groups);
end;
$$;
revoke all on function demo_private.queue_crew_prize_share(text, uuid[], uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function demo_private.queue_crew_prize_share(text, uuid[], uuid, jsonb) to authenticated;

create or replace function public.share_prize_with_crew(p_offering_slug text, p_recipient_ids uuid[], p_group_id uuid default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select demo_private.queue_crew_prize_share(p_offering_slug, p_recipient_ids, p_group_id, null);
$$;

create function public.share_prize_with_crew_groups(p_offering_slug text, p_groups jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select demo_private.queue_crew_prize_share(p_offering_slug, null, null, coalesce(p_groups, 'null'::jsonb));
$$;
revoke all on function public.share_prize_with_crew_groups(text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.share_prize_with_crew_groups(text, jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
