-- Automatic Crew connections reuse the existing membership and directional
-- receiving preferences. No legacy requests or sharing choices are migrated.
alter table public.crew_invitations add column automatic_connection boolean not null default false;

create or replace function demo_private.add_crew_connection(p_kind text, p_value text)
returns text language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid := auth.uid(); v_other uuid; v_existing public.crew_invitations%rowtype;
  v_actor_name text; v_other_name text; v_sender uuid; v_receiver uuid;
  v_private boolean := p_kind in ('email','phone');
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not exists(select 1 from public.customers where id=v_actor and status='active') then
    raise exception 'Active account required' using errcode='42501';
  end if;
  if p_kind='email' then
    if p_value is null or length(trim(p_value)) not between 3 and 254 or position('@' in p_value)=0 then raise exception 'Invalid email' using errcode='22023'; end if;
    select u.id into v_other from auth.users u join public.customers c on c.id=u.id and c.status='active'
      join public.customer_profiles p on p.customer_id=u.id and p.crew_find_email
      where lower(u.email)=lower(trim(p_value)) and u.email_confirmed_at is not null;
  elsif p_kind='phone' then
    if length(regexp_replace(coalesce(p_value,''),'[^0-9]','','g')) not between 10 and 15 then raise exception 'Invalid phone' using errcode='22023'; end if;
    select u.id into v_other from auth.users u join public.customers c on c.id=u.id and c.status='active'
      join public.customer_profiles p on p.customer_id=u.id and p.crew_find_phone
      where u.email_confirmed_at is not null and regexp_replace(coalesce(p.phone_number,u.phone,''),'[^0-9]','','g')=regexp_replace(p_value,'[^0-9]','','g');
  elsif p_kind='member' then
    select u.id into v_other from auth.users u join public.customers c on c.id=u.id and c.status='active'
      join public.customer_profiles p on p.customer_id=u.id
      where u.id=p_value::uuid and u.email_confirmed_at is not null and (p.crew_discoverable or p.crew_find_real_name);
  elsif p_kind='link' then
    select l.owner_id into v_other from public.crew_invite_links l join public.customers c on c.id=l.owner_id and c.status='active' where l.token=p_value::uuid;
  else raise exception 'Invalid connection method' using errcode='22023'; end if;
  if v_other is null then return case when v_private then 'accepted_for_delivery' else 'unavailable' end; end if;
  if v_other=v_actor then return case when v_private then 'accepted_for_delivery' else 'self' end; end if;
  -- Same lock order as shared-link receiving: concurrent adds/leaves serialize.
  perform 1 from public.customers where id in (v_actor,v_other) order by id for update;
  select * into v_existing from public.crew_invitations where status in ('pending','accepted')
    and least(requester_id,recipient_id)=least(v_actor,v_other) and greatest(requester_id,recipient_id)=greatest(v_actor,v_other) for update;
  if v_existing.status='accepted' then return case when v_private then 'accepted_for_delivery' else 'connected' end; end if;
  -- Adding again must never reverse either person's previous opt-out.
  if exists(select 1 from public.crew_receiving_preferences where scope_key='crew' and not receiving
      and least(owner_id,recipient_id)=least(v_actor,v_other) and greatest(owner_id,recipient_id)=greatest(v_actor,v_other))
    or exists(select 1 from public.crew_invitations where status in ('declined','removed')
      and least(requester_id,recipient_id)=least(v_actor,v_other) and greatest(requester_id,recipient_id)=greatest(v_actor,v_other)) then
    return case when v_private then 'accepted_for_delivery' else 'unavailable' end;
  end if;
  if (select count(*) from public.crew_invitations where requester_id=v_actor and created_at>now()-interval '1 day')>=10 then
    raise exception 'Crew invitation limit reached for today' using errcode='P0001';
  end if;
  select coalesce(nullif(trim(display_name),''),nullif(trim(legal_first_name),''),'A member') into v_actor_name from public.customer_profiles where customer_id=v_actor;
  select coalesce(nullif(trim(display_name),''),nullif(trim(legal_first_name),''),'A member') into v_other_name from public.customer_profiles where customer_id=v_other;
  v_sender := case when p_kind='link' then v_other else v_actor end;
  v_receiver := case when p_kind='link' then v_actor else v_other end;
  insert into public.crew_receiving_preferences(owner_id,recipient_id,scope_key,receiving,share_back)
    values(v_sender,v_receiver,'crew',true,false) on conflict(owner_id,recipient_id,scope_key) do nothing;
  if v_existing.id is not null then
    update public.crew_invitations set requester_id=v_actor,recipient_id=v_other,requester_name=coalesce(v_actor_name,'A member'),recipient_name=coalesce(v_other_name,'A member'),status='accepted',automatic_connection=true,responded_at=now() where id=v_existing.id;
  else
    insert into public.crew_invitations(requester_id,recipient_id,requester_name,recipient_name,status,automatic_connection,responded_at)
      values(v_actor,v_other,coalesce(v_actor_name,'A member'),coalesce(v_other_name,'A member'),'accepted',true,now());
  end if;
  return case when v_private then 'accepted_for_delivery' else 'connected' end;
end; $$;
revoke all on function demo_private.add_crew_connection(text,text) from public,anon,authenticated;
grant execute on function demo_private.add_crew_connection(text,text) to authenticated;

create or replace function public.request_crew_invitation(p_email text) returns text language sql security invoker set search_path='' as $$ select demo_private.add_crew_connection('email',p_email); $$;
create or replace function public.request_crew_invitation_by_phone(p_phone text) returns text language sql security invoker set search_path='' as $$ select demo_private.add_crew_connection('phone',p_phone); $$;
create or replace function public.request_crew_invitation_by_id(p_member_id uuid) returns text language sql security invoker set search_path='' as $$ select demo_private.add_crew_connection('member',p_member_id::text); $$;
create or replace function public.request_crew_invitation_from_link(p_token uuid) returns text language sql security invoker set search_path='' as $$ select demo_private.add_crew_connection('link',p_token::text); $$;

create or replace function demo_private.leave_crew_connection(p_invitation_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_pair public.crew_invitations%rowtype; v_other uuid;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into v_pair from public.crew_invitations where id=p_invitation_id and v_actor in (requester_id,recipient_id);
  if v_pair.id is null then raise exception 'Connection unavailable' using errcode='42501'; end if;
  v_other:=case when v_pair.requester_id=v_actor then v_pair.recipient_id else v_pair.requester_id end;
  perform 1 from public.customers where id in (v_actor,v_other) order by id for update;
  insert into public.crew_receiving_preferences(owner_id,recipient_id,scope_key,receiving,share_back)
    values(v_other,v_actor,'crew',false,false) on conflict(owner_id,recipient_id,scope_key)
    do update set receiving=false,share_back=false,updated_at=now();
  update public.crew_invitations set status='removed',responded_at=now() where id=p_invitation_id and status in ('pending','accepted');
end; $$;
revoke all on function demo_private.leave_crew_connection(uuid) from public,anon,authenticated;
grant execute on function demo_private.leave_crew_connection(uuid) to authenticated;
create or replace function public.remove_crew_connection(p_invitation_id uuid) returns void language sql security invoker set search_path='' as $$ select demo_private.leave_crew_connection(p_invitation_id); $$;

create or replace function demo_private.set_crew_share_back(p_invitation_id uuid,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_pair public.crew_invitations%rowtype; v_other uuid;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_enabled is null then raise exception 'Choose sharing preference' using errcode='22023'; end if;
  select * into v_pair from public.crew_invitations where id=p_invitation_id and v_actor in (requester_id,recipient_id);
  if v_pair.id is null then raise exception 'Connection unavailable' using errcode='42501'; end if;
  v_other:=case when v_pair.requester_id=v_actor then v_pair.recipient_id else v_pair.requester_id end;
  perform 1 from public.customers where id in (v_actor,v_other) order by id for update;
  if not exists(select 1 from public.crew_invitations where id=p_invitation_id and status='accepted') then raise exception 'Connection unavailable' using errcode='42501'; end if;
  insert into public.crew_receiving_preferences(owner_id,recipient_id,scope_key,receiving,share_back)
    values(v_other,v_actor,'crew',true,p_enabled) on conflict(owner_id,recipient_id,scope_key)
    do update set share_back=p_enabled,updated_at=now();
end; $$;
revoke all on function demo_private.set_crew_share_back(uuid,boolean) from public,anon,authenticated;
grant execute on function demo_private.set_crew_share_back(uuid,boolean) to authenticated;
create function public.set_crew_share_back(p_invitation_id uuid,p_enabled boolean) returns void language sql security invoker set search_path='' as $$ select demo_private.set_crew_share_back(p_invitation_id,p_enabled); $$;
revoke all on function public.set_crew_share_back(uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_crew_share_back(uuid,boolean) to authenticated;

create or replace function demo_private.queue_crew_invitation_email()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (new.status='pending' or (new.status='accepted' and new.automatic_connection))
    and exists(select 1 from auth.users where id=new.recipient_id and email is not null and email_confirmed_at is not null) then
    insert into public.crew_invitation_email_deliveries(invitation_id) values(new.id) on conflict(invitation_id) do nothing;
  end if;
  return new;
end; $$;
create trigger queue_crew_connection_email_after_update after update of status on public.crew_invitations for each row when (new.automatic_connection and new.status='accepted' and old.status is distinct from new.status) execute function demo_private.queue_crew_invitation_email();
-- Worker-only payload; the existing service-role-only grants are retained.
create or replace function public.get_crew_invitation_email_payload(p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('recipientId',i.recipient_id,'requesterName',i.requester_name,'automatic',i.automatic_connection,
    'eligible',(i.status='pending' or (i.status='accepted' and i.automatic_connection)) and u.email is not null and u.email_confirmed_at is not null)
  from public.crew_invitation_email_deliveries d join public.crew_invitations i on i.id=d.invitation_id
  left join auth.users u on u.id=i.recipient_id where d.id=p_id and d.status='processing';
$$;
