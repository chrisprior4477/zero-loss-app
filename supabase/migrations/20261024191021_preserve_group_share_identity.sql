begin;
-- Preserve which group the sender chose without changing delivery or email limits.
alter table public.crew_prize_share_emails add column scope_key text not null default 'crew';
drop function public.share_prize_with_crew(text,uuid[]);
CREATE OR REPLACE FUNCTION public.share_prize_with_crew(p_offering_slug text, p_recipient_ids uuid[], p_group_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_sender uuid:=auth.uid(); v_count integer; v_new_count integer; v_inserted integer; v_group jsonb;
begin
  if v_sender is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_offering_slug is null or not exists(select 1 from demo_private.preview_entry_offerings where slug=p_offering_slug) then
    raise exception 'Prize unavailable' using errcode='22023';
  end if;
  if p_recipient_ids is null or cardinality(p_recipient_ids) not between 1 and 20 or
    exists(select 1 from unnest(p_recipient_ids) id where id is null or id=v_sender) or
    (select count(distinct id) from unnest(p_recipient_ids) id)<>cardinality(p_recipient_ids) then
    raise exception 'Choose 1 to 20 different Crew members' using errcode='22023';
  end if;
  if not exists(select 1 from auth.users where id=v_sender and email_confirmed_at is not null) then
    raise exception 'Confirm your email before sharing' using errcode='42501';
  end if;
  -- Serialize this sender's batches so the daily cap cannot be raced.
  perform 1 from public.customers where id=v_sender for update;
  if p_group_id is not null then
    select g into v_group from public.crew_visibility_settings s, lateral jsonb_array_elements(s.groups) g
      where s.owner_id=v_sender and g->>'id'=p_group_id::text;
    if v_group is null or exists(select 1 from unnest(p_recipient_ids) r where not coalesce(v_group->'memberIds','[]'::jsonb) ? r::text) then
      raise exception 'Choose members of your selected group' using errcode='42501';
    end if;
  end if;
  if exists(select 1 from public.crew_receiving_preferences p where p.owner_id=v_sender and p.recipient_id=any(p_recipient_ids) and p.scope_key in ('crew',coalesce(p_group_id::text,'crew')) and not p.receiving) then
    raise exception 'A selected member has stopped receiving these shares' using errcode='42501';
  end if;
  if exists(
    select 1 from unnest(p_recipient_ids) recipient(id)
    where not exists(
      select 1 from public.crew_invitations c join auth.users u on u.id=recipient.id and u.email_confirmed_at is not null
      where c.status='accepted' and
        ((c.requester_id=v_sender and c.recipient_id=recipient.id) or
         (c.recipient_id=v_sender and c.requester_id=recipient.id))
    )
  ) then raise exception 'Choose only approved Crew members' using errcode='42501'; end if;
  select count(*) into v_count from public.crew_prize_share_emails
    where sender_id=v_sender and created_at>now()-interval '1 day';
  select count(*) into v_new_count from unnest(p_recipient_ids) recipient(id)
    where not exists(select 1 from public.crew_prize_share_emails s
      where s.sender_id=v_sender and s.recipient_id=recipient.id and s.offering_slug=p_offering_slug);
  if v_count+v_new_count>20 then
    raise exception 'Crew email limit reached for today' using errcode='P0001';
  end if;
  insert into public.crew_prize_share_emails(sender_id,recipient_id,offering_slug,scope_key)
    select v_sender,id,p_offering_slug,coalesce(p_group_id::text,'crew') from unnest(p_recipient_ids) id
    on conflict(sender_id,recipient_id,offering_slug) do nothing;
  get diagnostics v_inserted=row_count;
  return jsonb_build_object('queued',v_inserted,'alreadyShared',cardinality(p_recipient_ids)-v_inserted);
end;
$function$
;
revoke all on function public.share_prize_with_crew(text,uuid[],uuid) from public,anon,authenticated,service_role;
grant execute on function public.share_prize_with_crew(text,uuid[],uuid) to authenticated;
create or replace function demo_private.record_received_product_share() returns trigger language plpgsql security definer set search_path='' as $$
declare v_slug text; v_token uuid; v_scope text:='crew';
begin
  if tg_table_name='crew_prize_share_emails' then v_slug:=new.offering_slug; v_scope:=new.scope_key;
  else select e.offering_slug into v_slug from public.customer_rewards r join public.customer_entries e on e.id=r.customer_entry_id where r.id=new.reward_id; end if;
  if exists(select 1 from public.crew_receiving_preferences where owner_id=new.sender_id and recipient_id=new.recipient_id and scope_key in ('crew',v_scope) and not receiving) then return new; end if;
  insert into public.product_share_links(owner_id,offering_slug,scope_key) values(new.sender_id,v_slug,v_scope) on conflict(owner_id,offering_slug,scope_key) do update set scope_key=excluded.scope_key returning token into v_token;
  insert into public.received_product_shares(token,recipient_id) values(v_token,new.recipient_id) on conflict do nothing;
  return new;
end; $$;

CREATE OR REPLACE FUNCTION public.get_crew_prize_share_email_payload(p_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'recipientId',s.recipient_id,
    'senderName',coalesce(nullif(btrim(p.display_name),''),nullif(btrim(p.legal_first_name),''),'A Crew member'),
    'title',o.title,
    'slug',s.offering_slug,
    'shareToken',(select l.token from public.product_share_links l where l.owner_id=s.sender_id and l.offering_slug=s.offering_slug and l.scope_key=s.scope_key),
    'eligible',not exists(select 1 from public.crew_receiving_preferences r where r.owner_id=s.sender_id and r.recipient_id=s.recipient_id and r.scope_key in ('crew',s.scope_key) and not r.receiving)
      and (s.scope_key='crew' or exists(select 1 from public.crew_visibility_settings v,lateral jsonb_array_elements(v.groups) g where v.owner_id=s.sender_id and g->>'id'=s.scope_key and g->'memberIds' ? s.recipient_id::text))
      and s.status='processing' and u.email is not null and u.email_confirmed_at is not null
      and exists(select 1 from public.crew_invitations c where c.status='accepted' and
        ((c.requester_id=s.sender_id and c.recipient_id=s.recipient_id) or
         (c.recipient_id=s.sender_id and c.requester_id=s.recipient_id)))
  )
  from public.crew_prize_share_emails s
  join demo_private.preview_entry_offerings o on o.slug=s.offering_slug
  left join public.customer_profiles p on p.customer_id=s.sender_id
  left join auth.users u on u.id=s.recipient_id
  where s.id=p_id and s.status='processing';
$function$
;

notify pgrst,'reload schema';
commit;
