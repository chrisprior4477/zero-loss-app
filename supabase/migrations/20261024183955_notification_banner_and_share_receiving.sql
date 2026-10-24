begin;
alter table public.customer_profiles
  add column header_notifications_enabled boolean not null default true,
  add column notification_banner_style text not null default 'capsule' check (notification_banner_style in ('capsule','ribbon','medallion','ticket','glass','layers')),
  add column crew_find_real_name boolean not null default true,
  add column crew_find_email boolean not null default true,
  add column crew_find_phone boolean not null default true,
  alter column crew_discoverable set default true;
-- A received link establishes a receiving relationship, never reciprocal access.
alter table public.crew_invitations add column received_link_only boolean not null default false;
create table public.product_share_links (
  token uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.customers(id) on delete cascade,
  offering_slug text not null references demo_private.preview_entry_offerings(slug),
  scope_key text not null default 'crew',
  created_at timestamptz not null default now(),
  unique(owner_id,offering_slug,scope_key)
);
create table public.crew_receiving_preferences (
  owner_id uuid not null references public.customers(id) on delete cascade,
  recipient_id uuid not null references public.customers(id) on delete cascade,
  scope_key text not null default 'crew',
  receiving boolean not null default true,
  share_back boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(owner_id,recipient_id,scope_key), check(owner_id <> recipient_id)
);
create index crew_receiving_recipient on public.crew_receiving_preferences(recipient_id,owner_id);
create table public.received_product_shares (
  id uuid primary key default gen_random_uuid(),
  token uuid not null references public.product_share_links(token) on delete cascade,
  recipient_id uuid not null references public.customers(id) on delete cascade,
  created_at timestamptz not null default now(), unique(token,recipient_id)
);
create index received_product_shares_recipient on public.received_product_shares(recipient_id,created_at desc);
alter table public.product_share_links enable row level security;
alter table public.crew_receiving_preferences enable row level security;
alter table public.received_product_shares enable row level security;
revoke all on public.product_share_links,public.crew_receiving_preferences,public.received_product_shares from public,anon,authenticated;
grant select on public.product_share_links,public.crew_receiving_preferences,public.received_product_shares to authenticated;
create policy "Owners read their share links" on public.product_share_links for select to authenticated using(owner_id=(select auth.uid()));
create policy "Participants read receiving choices" on public.crew_receiving_preferences for select to authenticated using(owner_id=(select auth.uid()) or recipient_id=(select auth.uid()));
create policy "Recipients read their shared items" on public.received_product_shares for select to authenticated using(recipient_id=(select auth.uid()));

create function demo_private.set_notification_banner_style(p_style text,p_enabled boolean default true) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_style is null or p_style not in ('capsule','ribbon','medallion','ticket','glass','layers') then raise exception 'Invalid banner style' using errcode='22023'; end if;
  update public.customer_profiles set notification_banner_style=p_style,header_notifications_enabled=coalesce(p_enabled,true) where customer_id=auth.uid();
  if not found then raise exception 'Profile unavailable'; end if;
end; $$;
create function demo_private.save_crew_discovery(p_display boolean,p_real boolean,p_email boolean,p_phone boolean) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_display is null or p_real is null or p_email is null or p_phone is null then raise exception 'Choose all four preferences' using errcode='22023'; end if;
  update public.customer_profiles set crew_discoverable=p_display,crew_find_real_name=p_real,crew_find_email=p_email,crew_find_phone=p_phone where customer_id=auth.uid();
  if not found then raise exception 'Profile unavailable'; end if;
end; $$;
create function demo_private.create_product_share_link(p_slug text,p_group_id uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_token uuid; v_scope text:=coalesce(p_group_id::text,'crew');
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_group_id is not null and not exists(select 1 from public.crew_visibility_settings s,lateral jsonb_array_elements(s.groups) g where s.owner_id=auth.uid() and g->>'id'=p_group_id::text) then raise exception 'Group unavailable' using errcode='42501'; end if;
  insert into public.product_share_links(owner_id,offering_slug,scope_key) values(auth.uid(),p_slug,v_scope)
    on conflict(owner_id,offering_slug,scope_key) do update set scope_key=excluded.scope_key returning token into v_token;
  return v_token;
end; $$;
create function demo_private.product_share_context(p_token uuid,p_slug text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_link public.product_share_links%rowtype; v_name text; v_group text; v_pref public.crew_receiving_preferences%rowtype; v_connected boolean;
begin
  select * into v_link from public.product_share_links where token=p_token and offering_slug=p_slug;
  if not found then return null; end if;
  select coalesce(nullif(display_name,''),'A member') into v_name from public.customer_profiles where customer_id=v_link.owner_id;
  if v_link.scope_key<>'crew' then
    select g->>'name' into v_group from public.crew_visibility_settings s,lateral jsonb_array_elements(s.groups) g where s.owner_id=v_link.owner_id and g->>'id'=v_link.scope_key;
    if v_group is null then return null; end if;
  end if;
  select * into v_pref from public.crew_receiving_preferences where owner_id=v_link.owner_id and recipient_id=auth.uid() and scope_key=v_link.scope_key;
  select exists(select 1 from public.crew_invitations where status='accepted' and ((requester_id=v_link.owner_id and recipient_id=auth.uid()) or (recipient_id=v_link.owner_id and requester_id=auth.uid()))) into v_connected;
  return jsonb_build_object('token',v_link.token,'slug',v_link.offering_slug,'sender',v_name,'scope',coalesce(v_group,v_name||'’s Crew'),'isGroup',v_group is not null,'own',auth.uid()=v_link.owner_id,'receiving',coalesce(v_pref.receiving,v_connected) and v_connected,'shareBack',coalesce(v_pref.share_back,false),'hasChoice',v_pref.owner_id is not null);
end; $$;
create function demo_private.set_product_share_receiving(p_token uuid,p_receiving boolean,p_share_back boolean default null,p_only_if_new boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_link public.product_share_links%rowtype; v_user uuid:=auth.uid(); v_context jsonb; v_groups jsonb; v_name text;
begin
  if v_user is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_receiving is null then raise exception 'Choose whether to receive shares' using errcode='22023'; end if;
  select * into v_link from public.product_share_links where token=p_token;
  if not found or v_link.owner_id=v_user then raise exception 'Shared link unavailable' using errcode='42501'; end if;
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
end; $$;
create function demo_private.get_received_product_shares() returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'token',l.token,'slug',l.offering_slug,'title',o.title,'sender',coalesce(nullif(p.display_name,''),'A member'),'createdAt',s.created_at) order by s.created_at desc),'[]'::jsonb)
  from public.received_product_shares s join public.product_share_links l on l.token=s.token
  join demo_private.preview_entry_offerings o on o.slug=l.offering_slug
  join public.customer_profiles p on p.customer_id=l.owner_id
  where s.recipient_id=auth.uid() and not exists(select 1 from public.crew_receiving_preferences r where r.owner_id=l.owner_id and r.recipient_id=auth.uid() and r.scope_key in ('crew',l.scope_key) and not r.receiving);
$$;
-- Durable in-app delivery uses the existing share outbox. It sends no extra email.
create function demo_private.record_received_product_share() returns trigger language plpgsql security definer set search_path='' as $$
declare v_slug text; v_token uuid;
begin
  if tg_table_name='crew_prize_share_emails' then v_slug:=new.offering_slug;
  else select e.offering_slug into v_slug from public.customer_rewards r join public.customer_entries e on e.id=r.customer_entry_id where r.id=new.reward_id; end if;
  if exists(select 1 from public.crew_receiving_preferences where owner_id=new.sender_id and recipient_id=new.recipient_id and scope_key='crew' and not receiving) then return new; end if;
  insert into public.product_share_links(owner_id,offering_slug) values(new.sender_id,v_slug) on conflict(owner_id,offering_slug,scope_key) do update set scope_key=excluded.scope_key returning token into v_token;
  insert into public.received_product_shares(token,recipient_id) values(v_token,new.recipient_id) on conflict do nothing;
  return new;
end; $$;
create trigger record_shared_prize after insert on public.crew_prize_share_emails for each row execute function demo_private.record_received_product_share();
create trigger record_shared_win after insert on public.crew_win_share_emails for each row execute function demo_private.record_received_product_share();

CREATE OR REPLACE FUNCTION public.crew_can_view_shared_entry(p_owner_id uuid, p_entry_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_viewer uuid := auth.uid();
  v_settings public.crew_visibility_settings%rowtype;
  v_rule jsonb;
  v_group jsonb;
begin
  if v_viewer is null or p_owner_id is null or p_entry_id is null then return false; end if;
  if exists (select 1 from public.demo_entry_reset_items reset
    where reset.customer_entry_id = p_entry_id and reset.customer_id = p_owner_id) then return false; end if;
  if v_viewer = p_owner_id then return true; end if;
  if not exists (
    select 1 from public.crew_invitations c where c.status = 'accepted'
      and ((c.requester_id = p_owner_id and c.recipient_id = v_viewer)
        or (c.recipient_id = p_owner_id and c.requester_id = v_viewer))
  ) then return false; end if;
  -- Receiving a link never grants its sender access to the recipient's picks.
  if exists(select 1 from public.crew_invitations c where c.status='accepted' and c.received_link_only and ((c.recipient_id=p_owner_id and c.requester_id=v_viewer) or (c.requester_id=p_owner_id and c.recipient_id=v_viewer)))
    and exists(select 1 from public.crew_receiving_preferences r where r.owner_id=v_viewer and r.recipient_id=p_owner_id)
    and not exists(select 1 from public.crew_receiving_preferences r where r.owner_id=v_viewer and r.recipient_id=p_owner_id and r.share_back) then return false; end if;
  if exists(select 1 from public.crew_receiving_preferences r where r.owner_id=p_owner_id and r.recipient_id=v_viewer and r.scope_key='crew' and not r.receiving) then return false; end if;
  select * into v_settings from public.crew_visibility_settings where owner_id = p_owner_id;
  v_rule := coalesce(v_settings.entry_rules -> p_entry_id::text, v_settings.default_rule,
    '{"audience":"everyone"}'::jsonb);
  if v_rule->>'audience' = 'everyone' then return true; end if;
  if v_rule->>'audience' = 'people' then
    return coalesce(v_rule->'memberIds', '[]'::jsonb) ? v_viewer::text;
  end if;
  if v_rule->>'audience' = 'groups' then
    for v_group in select value from jsonb_array_elements(coalesce(v_settings.groups, '[]'::jsonb)) loop
      if coalesce(v_rule->'groupIds', '[]'::jsonb) ? (v_group->>'id')
        and coalesce(v_group->'memberIds', '[]'::jsonb) ? v_viewer::text
        and not exists(select 1 from public.crew_receiving_preferences r where r.owner_id=p_owner_id and r.recipient_id=v_viewer and r.scope_key=v_group->>'id' and not r.receiving) then
        return true;
      end if;
    end loop;
  end if;
  return false;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.search_crew_people(p_name text)
 RETURNS TABLE(member_id uuid, name text, avatar_reference text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_name text := btrim(coalesce(p_name, ''));
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if length(v_name) not between 3 and 254 then
    raise exception 'Use 3 to 254 characters for Crew search' using errcode = '22023';
  end if;
  if (select count(*) from public.crew_name_search_events e
      where e.searcher_id = auth.uid() and e.searched_at > now() - interval '1 hour') >= 30 then
    raise exception 'Crew search limit reached' using errcode = 'P0001';
  end if;
  insert into public.crew_name_search_events(searcher_id) values (auth.uid());

  return query
  select p.customer_id,
    coalesce(nullif(btrim(p.display_name), ''), p.legal_first_name || ' ' || left(p.legal_last_name, 1) || '.') as name,
    case when p.show_photo_to_crew and exists (
      select 1 from public.crew_invitations i
      where i.status = 'accepted' and (
        (i.requester_id = auth.uid() and i.recipient_id = p.customer_id) or
        (i.recipient_id = auth.uid() and i.requester_id = p.customer_id)
      )
    ) then p.avatar_reference else null end
  from public.customer_profiles p
  join public.customers c on c.id = p.customer_id and c.status = 'active'
  join auth.users u on u.id = p.customer_id and u.email_confirmed_at is not null
  where p.customer_id <> auth.uid() and (
    (p.crew_discoverable and position('@' in v_name)=0 and left(lower(p.display_name),length(v_name))=lower(v_name))
    or (p.crew_find_real_name and position('@' in v_name)=0 and left(lower(trim(concat_ws(' ',p.legal_first_name,p.legal_last_name))),length(v_name))=lower(v_name))
    or (p.crew_find_email and lower(u.email)=lower(v_name))
    or (p.crew_find_phone and length(regexp_replace(v_name,'[^0-9]','','g')) between 10 and 15 and regexp_replace(coalesce(p.phone_number,u.phone),'[^0-9]','','g')=regexp_replace(v_name,'[^0-9]','','g'))
  )
  order by lower(coalesce(nullif(btrim(p.display_name), ''), p.legal_first_name)), p.customer_id
  limit 8;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.request_crew_invitation(p_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_requester uuid := auth.uid();
  v_recipient uuid;
  v_requester_name text;
  v_recipient_name text;
begin
  if v_requester is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_email is null or length(trim(p_email)) not between 3 and 254 or position('@' in p_email) = 0 then
    raise exception 'Enter a valid email address' using errcode = '22023';
  end if;
  if (select count(*) from public.crew_invitations
      where requester_id = v_requester and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Crew invitation limit reached for today' using errcode = 'P0001';
  end if;
  select u.id into v_recipient from auth.users u
    join public.customers c on c.id = u.id
    join public.customer_profiles p on p.customer_id=u.id and p.crew_find_email
    where lower(u.email) = lower(trim(p_email)) and u.email_confirmed_at is not null;
  -- Do not disclose whether an email address belongs to an account.
  if v_recipient is null or v_recipient = v_requester then return 'accepted_for_delivery'; end if;
  if exists (select 1 from public.crew_invitations c
    where c.status in ('pending', 'accepted')
    and ((c.requester_id = v_requester and c.recipient_id = v_recipient)
      or (c.requester_id = v_recipient and c.recipient_id = v_requester))) then
    return 'accepted_for_delivery';
  end if;
  select coalesce(nullif(trim(p.display_name), ''), trim(p.legal_first_name), 'A member')
    into v_requester_name from public.customer_profiles p where p.customer_id = v_requester;
  select coalesce(nullif(trim(p.display_name), ''), trim(p.legal_first_name), 'A member')
    into v_recipient_name from public.customer_profiles p where p.customer_id = v_recipient;
  insert into public.crew_invitations(requester_id, recipient_id, requester_name, recipient_name)
    values (v_requester, v_recipient, coalesce(v_requester_name, 'A member'), coalesce(v_recipient_name, 'A member'));
  return 'accepted_for_delivery';
end;
$function$
;
CREATE OR REPLACE FUNCTION public.request_crew_invitation_by_id(p_member_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_requester uuid := auth.uid();
  v_recipient uuid;
  v_requester_name text;
  v_recipient_name text;
begin
  if v_requester is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if (select count(*) from public.crew_invitations
      where requester_id = v_requester and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Crew invitation limit reached for today' using errcode = 'P0001';
  end if;
  select u.id into v_recipient from auth.users u
    join public.customers c on c.id = u.id
    join public.customer_profiles p on p.customer_id=u.id where u.id=p_member_id and u.email_confirmed_at is not null and (p.crew_discoverable or p.crew_find_real_name or p.crew_find_email or p.crew_find_phone);
  -- Do not disclose whether an email address belongs to an account.
  if v_recipient is null or v_recipient = v_requester then return 'accepted_for_delivery'; end if;
  if exists (select 1 from public.crew_invitations c
    where c.status in ('pending', 'accepted')
    and ((c.requester_id = v_requester and c.recipient_id = v_recipient)
      or (c.requester_id = v_recipient and c.recipient_id = v_requester))) then
    return 'accepted_for_delivery';
  end if;
  select coalesce(nullif(trim(p.display_name), ''), trim(p.legal_first_name), 'A member')
    into v_requester_name from public.customer_profiles p where p.customer_id = v_requester;
  select coalesce(nullif(trim(p.display_name), ''), trim(p.legal_first_name), 'A member')
    into v_recipient_name from public.customer_profiles p where p.customer_id = v_recipient;
  insert into public.crew_invitations(requester_id, recipient_id, requester_name, recipient_name)
    values (v_requester, v_recipient, coalesce(v_requester_name, 'A member'), coalesce(v_recipient_name, 'A member'));
  return 'accepted_for_delivery';
end;
$function$
;
CREATE OR REPLACE FUNCTION public.request_crew_invitation_by_phone(p_phone text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'); v_recipient uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if length(v_digits) not between 10 and 15 then
    raise exception 'Enter a valid phone number with country code' using errcode = '22023';
  end if;
  select u.id into v_recipient from auth.users u
    join public.customers c on c.id = u.id and c.status = 'active'
    join public.customer_profiles p on p.customer_id=u.id and p.crew_find_phone
    where u.email_confirmed_at is not null
      and regexp_replace(coalesce(p.phone_number,u.phone, ''), '[^0-9]', '', 'g') = v_digits;
  if v_recipient is null then return 'accepted_for_delivery'; end if;
  return public.request_crew_invitation_by_id(v_recipient);
end;
$function$
;
create function demo_private.save_crew_display_preferences(p_default_rule jsonb,p_groups jsonb,p_entry_rules jsonb,p_discoverable boolean,p_real boolean,p_email boolean,p_phone boolean)
returns void language plpgsql security definer set search_path='' as $$ begin
  perform public.save_crew_visibility_settings(p_default_rule,p_groups,p_entry_rules,p_discoverable);
  perform demo_private.save_crew_discovery(p_discoverable,p_real,p_email,p_phone);
end; $$;
revoke all on function demo_private.set_notification_banner_style(text,boolean) from public,anon,authenticated,service_role;
grant execute on function demo_private.set_notification_banner_style(text,boolean) to authenticated;
create function public.set_notification_banner_style(p_style text,p_enabled boolean default true) returns void language sql security invoker set search_path='' as $$ select demo_private.set_notification_banner_style(p_style,p_enabled); $$;
revoke all on function public.set_notification_banner_style(text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.set_notification_banner_style(text,boolean) to authenticated;
revoke all on function demo_private.save_crew_discovery(boolean,boolean,boolean,boolean) from public,anon,authenticated,service_role;
grant execute on function demo_private.save_crew_discovery(boolean,boolean,boolean,boolean) to authenticated;
create function public.save_crew_discovery(p_display boolean,p_real boolean,p_email boolean,p_phone boolean) returns void language sql security invoker set search_path='' as $$ select demo_private.save_crew_discovery(p_display,p_real,p_email,p_phone); $$;
revoke all on function public.save_crew_discovery(boolean,boolean,boolean,boolean) from public,anon,authenticated,service_role;
grant execute on function public.save_crew_discovery(boolean,boolean,boolean,boolean) to authenticated;
revoke all on function demo_private.save_crew_display_preferences(jsonb,jsonb,jsonb,boolean,boolean,boolean,boolean) from public,anon,authenticated,service_role;
grant execute on function demo_private.save_crew_display_preferences(jsonb,jsonb,jsonb,boolean,boolean,boolean,boolean) to authenticated;
create function public.save_crew_display_preferences(p_default_rule jsonb,p_groups jsonb,p_entry_rules jsonb,p_discoverable boolean,p_real boolean,p_email boolean,p_phone boolean) returns void language sql security invoker set search_path='' as $$ select demo_private.save_crew_display_preferences(p_default_rule,p_groups,p_entry_rules,p_discoverable,p_real,p_email,p_phone); $$;
revoke all on function public.save_crew_display_preferences(jsonb,jsonb,jsonb,boolean,boolean,boolean,boolean) from public,anon,authenticated,service_role;
grant execute on function public.save_crew_display_preferences(jsonb,jsonb,jsonb,boolean,boolean,boolean,boolean) to authenticated;
revoke all on function demo_private.create_product_share_link(text,uuid) from public,anon,authenticated,service_role;
grant execute on function demo_private.create_product_share_link(text,uuid) to authenticated;
create function public.create_product_share_link(p_slug text,p_group_id uuid default null) returns uuid language sql security invoker set search_path='' as $$ select demo_private.create_product_share_link(p_slug,p_group_id); $$;
revoke all on function public.create_product_share_link(text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.create_product_share_link(text,uuid) to authenticated;
revoke all on function demo_private.product_share_context(uuid,text) from public,anon,authenticated,service_role;
grant execute on function demo_private.product_share_context(uuid,text) to authenticated;
create function public.product_share_context(p_token uuid,p_slug text) returns jsonb language sql security definer set search_path='' as $$ select demo_private.product_share_context(p_token,p_slug); $$;
revoke all on function public.product_share_context(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.product_share_context(uuid,text) to anon,authenticated;
revoke all on function demo_private.set_product_share_receiving(uuid,boolean,boolean,boolean) from public,anon,authenticated,service_role;
grant execute on function demo_private.set_product_share_receiving(uuid,boolean,boolean,boolean) to authenticated;
create function public.set_product_share_receiving(p_token uuid,p_receiving boolean,p_share_back boolean default null,p_only_if_new boolean default false) returns jsonb language sql security invoker set search_path='' as $$ select demo_private.set_product_share_receiving(p_token,p_receiving,p_share_back,p_only_if_new); $$;
revoke all on function public.set_product_share_receiving(uuid,boolean,boolean,boolean) from public,anon,authenticated,service_role;
grant execute on function public.set_product_share_receiving(uuid,boolean,boolean,boolean) to authenticated;
revoke all on function demo_private.get_received_product_shares() from public,anon,authenticated,service_role;
grant execute on function demo_private.get_received_product_shares() to authenticated;
create function public.get_received_product_shares() returns jsonb language sql security invoker set search_path='' as $$ select demo_private.get_received_product_shares(); $$;
revoke all on function public.get_received_product_shares() from public,anon,authenticated,service_role;
grant execute on function public.get_received_product_shares() to authenticated;
grant usage on schema demo_private to authenticated;
revoke all on function demo_private.record_received_product_share() from public,anon,authenticated,service_role;

-- Entry shares produce the same recipient feed as explicit prize shares. Each
-- existing audience is resolved without broadening it or sending another email.
create function demo_private.record_received_entry_share() returns trigger language plpgsql security definer set search_path='' as $$
declare v_slug text; v_rule jsonb; v_groups jsonb; v_recipient uuid; v_scope text; v_token uuid;
begin
  select offering_slug into v_slug from public.customer_entries where id=new.entry_id;
  select coalesce(entry_rules->new.entry_id::text,default_rule),groups into v_rule,v_groups from public.crew_visibility_settings where owner_id=new.owner_id;
  v_rule:=coalesce(v_rule,'{"audience":"everyone"}'::jsonb);
  for v_recipient in select case when requester_id=new.owner_id then recipient_id else requester_id end from public.crew_invitations where status='accepted' and new.owner_id in (requester_id,recipient_id) loop
    v_scope:=null;
    if v_rule->>'audience'='everyone' or (v_rule->>'audience'='people' and v_rule->'memberIds' ? v_recipient::text) then v_scope:='crew';
    elsif v_rule->>'audience'='groups' then
      select g->>'id' into v_scope from jsonb_array_elements(coalesce(v_groups,'[]')) g where v_rule->'groupIds' ? (g->>'id') and g->'memberIds' ? v_recipient::text
        and not exists(select 1 from public.crew_receiving_preferences r where r.owner_id=new.owner_id and r.recipient_id=v_recipient and r.scope_key=g->>'id' and not r.receiving) limit 1;
    end if;
    if v_scope is not null and not exists(select 1 from public.crew_receiving_preferences r where r.owner_id=new.owner_id and r.recipient_id=v_recipient and r.scope_key in ('crew',v_scope) and not r.receiving) then
      insert into public.product_share_links(owner_id,offering_slug,scope_key) values(new.owner_id,v_slug,v_scope) on conflict(owner_id,offering_slug,scope_key) do update set scope_key=excluded.scope_key returning token into v_token;
      insert into public.received_product_shares(token,recipient_id) values(v_token,v_recipient) on conflict do nothing;
    end if;
  end loop;
  return new;
end; $$;
revoke all on function demo_private.record_received_entry_share() from public,anon,authenticated,service_role;
create trigger record_shared_entry after insert on public.crew_entry_shares for each row execute function demo_private.record_received_entry_share();

notify pgrst,'reload schema';
commit;
