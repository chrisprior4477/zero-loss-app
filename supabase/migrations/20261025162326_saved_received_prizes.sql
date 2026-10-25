begin;
-- Receiving history and explicit favorites remain separate. Extend the existing
-- receipt rather than creating another copy of the share or its audience.
alter table public.received_product_shares
  add column product_slug text references demo_private.preview_entry_offerings(slug),
  add column viewed_at timestamptz,
  add column saved_at timestamptz,
  add column declined_at timestamptz,
  alter column token drop not null,
  add constraint received_share_has_product check (token is not null or product_slug is not null);
create unique index received_legacy_product_once on public.received_product_shares(recipient_id,product_slug) where token is null;
create index received_product_slug_idx on public.received_product_shares(product_slug) where product_slug is not null;

-- A history reader deliberately does not filter out receiving opt-outs. It does
-- not expose private entry details, or grant current access to a sender's Crew.
create function demo_private.get_saved_product_shares() returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'token',s.token,'slug',o.slug,'title',o.title,
    'sender',case when l.demo_self then 'Chris' else coalesce(nullif(p.display_name,''),'Someone') end,
    'createdAt',s.created_at,'viewedAt',s.viewed_at,'savedAt',s.saved_at,'declinedAt',s.declined_at,
    'demo',coalesce(l.demo_self,false)
  ) order by s.created_at desc,s.id),'[]'::jsonb)
  from public.received_product_shares s
  left join public.product_share_links l on l.token=s.token
  join demo_private.preview_entry_offerings o on o.slug=coalesce(l.offering_slug,s.product_slug)
  left join public.customer_profiles p on p.customer_id=l.owner_id
  where s.recipient_id=auth.uid() and (not coalesce(l.demo_self,false) or l.owner_id=auth.uid());
$$;

create function demo_private.record_saved_product_share(p_slug text,p_token uuid default null,p_save boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_link public.product_share_links%rowtype; v_id uuid;
begin
  if v_user is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_save is null or p_slug is null or not exists(select 1 from demo_private.preview_entry_offerings where slug=p_slug) then
    raise exception 'Shared product unavailable' using errcode='22023';
  end if;
  if p_token is not null then
    select * into v_link from public.product_share_links where token=p_token and offering_slug=p_slug;
    if not found or (v_link.demo_self and v_link.owner_id<>v_user) or (not v_link.demo_self and v_link.owner_id=v_user) then
      raise exception 'Shared link unavailable' using errcode='42501';
    end if;
    -- Link possession saves the public product only. No Crew membership,
    -- receiving preference, email, or reciprocal sharing is changed here.
    insert into public.received_product_shares(token,recipient_id,viewed_at,saved_at)
      values(p_token,v_user,now(),case when p_save then now() end)
      on conflict(token,recipient_id) do update set
        viewed_at=coalesce(received_product_shares.viewed_at,excluded.viewed_at),
        saved_at=coalesce(received_product_shares.saved_at,excluded.saved_at)
      returning id into v_id;
  else
    -- Older public links did not identify the sender. Keep that fact honest.
    select s.id into v_id from public.received_product_shares s left join public.product_share_links l on l.token=s.token
      where s.recipient_id=v_user and coalesce(l.offering_slug,s.product_slug)=p_slug order by s.created_at desc limit 1;
    if v_id is not null then
      update public.received_product_shares set viewed_at=coalesce(viewed_at,now()),saved_at=case when p_save then coalesce(saved_at,now()) else saved_at end where id=v_id and recipient_id=v_user;
    else
      insert into public.received_product_shares(product_slug,recipient_id,viewed_at,saved_at)
        values(p_slug,v_user,now(),case when p_save then now() end)
        on conflict(recipient_id,product_slug) where token is null do update set
          viewed_at=coalesce(received_product_shares.viewed_at,excluded.viewed_at),saved_at=coalesce(received_product_shares.saved_at,excluded.saved_at)
        returning id into v_id;
    end if;
  end if;
  return v_id;
end; $$;

create function demo_private.set_saved_product_share_state(p_id uuid,p_state text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_row public.received_product_shares%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_state is null or p_state not in ('viewed','declined','restore') then raise exception 'Invalid share state' using errcode='22023'; end if;
  update public.received_product_shares set viewed_at=coalesce(viewed_at,now()),
    declined_at=case when p_state='declined' then coalesce(declined_at,now()) when p_state='restore' then null else declined_at end
    where id=p_id and recipient_id=auth.uid() returning * into v_row;
  if not found then raise exception 'Shared item unavailable' using errcode='42501'; end if;
  return jsonb_build_object('id',v_row.id,'viewedAt',v_row.viewed_at,'savedAt',v_row.saved_at,'declinedAt',v_row.declined_at);
end; $$;

revoke all on function demo_private.get_saved_product_shares(),demo_private.record_saved_product_share(text,uuid,boolean),demo_private.set_saved_product_share_state(uuid,text) from public,anon,authenticated,service_role;
grant execute on function demo_private.get_saved_product_shares(),demo_private.record_saved_product_share(text,uuid,boolean),demo_private.set_saved_product_share_state(uuid,text) to authenticated;
create function public.get_saved_product_shares() returns jsonb language sql security invoker set search_path='' as $$ select demo_private.get_saved_product_shares(); $$;
create function public.record_saved_product_share(p_slug text,p_token uuid default null,p_save boolean default false) returns uuid language sql security invoker set search_path='' as $$ select demo_private.record_saved_product_share(p_slug,p_token,p_save); $$;
create function public.set_saved_product_share_state(p_id uuid,p_state text) returns jsonb language sql security invoker set search_path='' as $$ select demo_private.set_saved_product_share_state(p_id,p_state); $$;
revoke all on function public.get_saved_product_shares(),public.record_saved_product_share(text,uuid,boolean),public.set_saved_product_share_state(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.get_saved_product_shares(),public.record_saved_product_share(text,uuid,boolean),public.set_saved_product_share_state(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
