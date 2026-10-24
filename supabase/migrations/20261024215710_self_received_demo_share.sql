begin;
-- Reuse the canonical received-share records. No email, SMS, entry or Crew
-- membership is created by this explicitly requested self-demo.
alter table public.product_share_links add column demo_self boolean not null default false;
alter table public.product_share_links add constraint demo_share_item check(not demo_self or (offering_slug='walmart-100-gift-card' and scope_key='demo-self'));
alter table public.received_product_shares add column demo_receiving boolean not null default true, add column demo_share_back boolean not null default false, add column demo_request_id uuid;
create function demo_private.send_demo_product_share(p_request_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_token uuid; v_share uuid; v_existing uuid;
begin
  if v_user is null or p_request_id is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not coalesce((select preview_entries_enabled and preview_issuer=auth.jwt()->>'iss' from demo_private.funding_config where singleton),false)
    or not exists(select 1 from public.wallet_accounts where customer_id=v_user and scope='demo' and closed_at is null)
    then raise exception 'Demo sharing is unavailable' using errcode='42501'; end if;
  perform 1 from public.customers where id=v_user for update;
  insert into public.product_share_links(owner_id,offering_slug,scope_key,demo_self) values(v_user,'walmart-100-gift-card','demo-self',true)
    on conflict(owner_id,offering_slug,scope_key) do update set demo_self=true returning token into v_token;
  select id,demo_request_id into v_share,v_existing from public.received_product_shares where token=v_token and recipient_id=v_user;
  if v_share is not null and v_existing=p_request_id then return v_share; end if;
  insert into public.received_product_shares(token,recipient_id,demo_request_id) values(v_token,v_user,p_request_id)
    on conflict(token,recipient_id) do update set created_at=clock_timestamp(),demo_receiving=true,demo_share_back=false,demo_request_id=p_request_id returning id into v_share;
  delete from public.customer_notification_reads where customer_id=v_user and notification_id='shared-'||v_share::text;
  return v_share;
end; $$;
revoke all on function demo_private.send_demo_product_share(uuid) from public,anon,authenticated,service_role;
grant execute on function demo_private.send_demo_product_share(uuid) to authenticated;
create function public.send_demo_product_share(p_request_id uuid) returns uuid language sql security invoker set search_path='' as $$ select demo_private.send_demo_product_share(p_request_id); $$;
revoke all on function public.send_demo_product_share(uuid) from public,anon,authenticated,service_role;
grant execute on function public.send_demo_product_share(uuid) to authenticated;
CREATE OR REPLACE FUNCTION demo_private.product_share_context(p_token uuid, p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_link public.product_share_links%rowtype; v_name text; v_group text; v_pref public.crew_receiving_preferences%rowtype; v_connected boolean;
begin
  select * into v_link from public.product_share_links where token=p_token and offering_slug=p_slug;
  if not found then return null; end if;
  if v_link.demo_self then
    if auth.uid() is distinct from v_link.owner_id then return null; end if;
    return (select jsonb_build_object('token',v_link.token,'slug',v_link.offering_slug,'sender','Chris','scope','Chris’s Crew','isGroup',false,'own',false,'receiving',s.demo_receiving,'shareBack',s.demo_share_back,'hasChoice',true,'demo',true)
      from public.received_product_shares s where s.token=p_token and s.recipient_id=auth.uid());
  end if;
  select coalesce(nullif(display_name,''),'A member') into v_name from public.customer_profiles where customer_id=v_link.owner_id;
  if v_link.scope_key<>'crew' then
    select g->>'name' into v_group from public.crew_visibility_settings s,lateral jsonb_array_elements(s.groups) g where s.owner_id=v_link.owner_id and g->>'id'=v_link.scope_key;
    if v_group is null then return null; end if;
  end if;
  select * into v_pref from public.crew_receiving_preferences where owner_id=v_link.owner_id and recipient_id=auth.uid() and scope_key=v_link.scope_key;
  select exists(select 1 from public.crew_invitations where status='accepted' and ((requester_id=v_link.owner_id and recipient_id=auth.uid()) or (recipient_id=v_link.owner_id and requester_id=auth.uid()))) into v_connected;
  return jsonb_build_object('token',v_link.token,'slug',v_link.offering_slug,'sender',v_name,'scope',coalesce(v_group,v_name||'’s Crew'),'isGroup',v_group is not null,'own',auth.uid()=v_link.owner_id,'receiving',coalesce(v_pref.receiving,v_connected) and v_connected,'shareBack',coalesce(v_pref.share_back,false),'hasChoice',v_pref.owner_id is not null);
end; $function$
;
CREATE OR REPLACE FUNCTION demo_private.set_product_share_receiving(p_token uuid, p_receiving boolean, p_share_back boolean DEFAULT NULL::boolean, p_only_if_new boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_link public.product_share_links%rowtype; v_user uuid:=auth.uid(); v_context jsonb; v_groups jsonb; v_name text;
begin
  if v_user is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_receiving is null then raise exception 'Choose whether to receive shares' using errcode='22023'; end if;
  select * into v_link from public.product_share_links where token=p_token;
  if not found then raise exception 'Shared link unavailable' using errcode='42501'; end if;
  if v_link.demo_self then
    if v_link.owner_id<>v_user then raise exception 'Shared link unavailable' using errcode='42501'; end if;
    if not p_only_if_new then
      update public.received_product_shares set demo_receiving=p_receiving,demo_share_back=coalesce(p_share_back,demo_share_back) where token=p_token and recipient_id=v_user;
    end if;
    return demo_private.product_share_context(p_token,v_link.offering_slug);
  end if;
  if v_link.owner_id=v_user then raise exception 'Shared link unavailable' using errcode='42501'; end if;
  -- Lock the pair in a consistent order. Retried claims cannot undo an opt-out.
  perform 1 from public.customers where id in (v_user,v_link.owner_id) order by id for update;
  v_context:=demo_private.product_share_context(p_token,v_link.offering_slug);
  if v_context is null then raise exception 'This group is no longer available'; end if;
  if p_only_if_new and (v_context->>'hasChoice')::boolean then return v_context; end if;
  if p_only_if_new and exists(select 1 from public.crew_receiving_preferences where owner_id=v_link.owner_id and recipient_id=v_user and scope_key='crew' and not receiving) then return v_context; end if;
  if p_receiving then
    if not p_only_if_new then update public.crew_receiving_preferences set receiving=true,updated_at=now() where owner_id=v_link.owner_id and recipient_id=v_user and scope_key='crew'; end if;
    if exists(select 1 from public.crew_invitations where status='pending' and ((requester_id=v_link.owner_id and recipient_id=v_user) or (recipient_id=v_link.owner_id and requester_id=v_user))) then
      update public.crew_invitations set status='accepted',received_link_only=true,responded_at=now() where status='pending' and ((requester_id=v_link.owner_id and recipient_id=v_user) or (recipient_id=v_link.owner_id and requester_id=v_user));
    elsif not exists(select 1 from public.crew_invitations where status='accepted' and ((requester_id=v_link.owner_id and recipient_id=v_user) or (recipient_id=v_link.owner_id and requester_id=v_user))) then
      select coalesce(nullif(display_name,''),'A member') into v_name from public.customer_profiles where customer_id=v_user;
      insert into public.crew_invitations(requester_id,recipient_id,requester_name,recipient_name,status,received_link_only,responded_at) values(v_link.owner_id,v_user,v_context->>'sender',coalesce(v_name,'A member'),'accepted',true,now());
    end if;
  elsif v_link.scope_key='crew' then
    update public.crew_invitations set status='removed',responded_at=now() where status in ('pending','accepted') and ((requester_id=v_link.owner_id and recipient_id=v_user) or (recipient_id=v_link.owner_id and requester_id=v_user));
  end if;
  insert into public.crew_receiving_preferences(owner_id,recipient_id,scope_key,receiving,share_back) values(v_link.owner_id,v_user,v_link.scope_key,p_receiving,coalesce(p_share_back,false))
    on conflict(owner_id,recipient_id,scope_key) do update set receiving=excluded.receiving,share_back=coalesce(p_share_back,crew_receiving_preferences.share_back),updated_at=now();
  if v_link.scope_key<>'crew' then
    select jsonb_agg(case when g->>'id'=v_link.scope_key then jsonb_set(g,'{memberIds}',case when p_receiving then (select coalesce(jsonb_agg(distinct value),'[]') from jsonb_array_elements(coalesce(g->'memberIds','[]')||jsonb_build_array(v_user::text))) else coalesce(g->'memberIds','[]')-v_user::text end) else g end) into v_groups
      from public.crew_visibility_settings s,lateral jsonb_array_elements(s.groups) g where s.owner_id=v_link.owner_id;
    update public.crew_visibility_settings set groups=v_groups,updated_at=now() where owner_id=v_link.owner_id;
  end if;
  insert into public.received_product_shares(token,recipient_id) values(p_token,v_user) on conflict do nothing;
  return demo_private.product_share_context(p_token,v_link.offering_slug);
end; $function$
;
CREATE OR REPLACE FUNCTION demo_private.get_received_product_shares()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'token',l.token,'slug',l.offering_slug,'title',o.title,'sender',case when l.demo_self then 'Chris' else coalesce(nullif(p.display_name,''),'A member') end,'createdAt',s.created_at) order by s.created_at desc),'[]'::jsonb)
  from public.received_product_shares s join public.product_share_links l on l.token=s.token
  join demo_private.preview_entry_offerings o on o.slug=l.offering_slug
  join public.customer_profiles p on p.customer_id=l.owner_id
  where s.recipient_id=auth.uid() and (not l.demo_self or (l.owner_id=auth.uid() and s.demo_receiving)) and not exists(select 1 from public.crew_receiving_preferences r where r.owner_id=l.owner_id and r.recipient_id=auth.uid() and r.scope_key in ('crew',l.scope_key) and not r.receiving);
$function$
;
commit;
