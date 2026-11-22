begin;

create function demo_private.save_notification_banner_patch(
  p_style text, p_enabled boolean, p_speed integer, p_display_seconds integer, p_popup_style text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if p_style is not null and p_style not in ('capsule', 'ribbon', 'medallion', 'ticket', 'glass', 'layers')
    or p_speed is not null and p_speed not between 1 and 10
    or p_display_seconds is not null and p_display_seconds not between 1 and 10
    or p_popup_style is not null and p_popup_style not in ('rounded', 'ticket') then
    raise exception 'Invalid notification banner setting' using errcode = '22023';
  end if;

  update public.customer_profiles set
    notification_banner_style = coalesce(p_style, notification_banner_style),
    header_notifications_enabled = coalesce(p_enabled, header_notifications_enabled),
    notification_banner_speed = coalesce(p_speed, notification_banner_speed),
    notification_banner_display_seconds = coalesce(p_display_seconds, notification_banner_display_seconds),
    notification_popup_style = coalesce(p_popup_style, notification_popup_style)
  where customer_id = auth.uid();
end;
$$;

create function public.save_notification_banner_patch(
  p_style text, p_enabled boolean, p_speed integer, p_display_seconds integer, p_popup_style text
)
returns void language sql security invoker set search_path = ''
as $$ select demo_private.save_notification_banner_patch(p_style, p_enabled, p_speed, p_display_seconds, p_popup_style); $$;

revoke all on function demo_private.save_notification_banner_patch(text, boolean, integer, integer, text) from public, anon;
revoke all on function public.save_notification_banner_patch(text, boolean, integer, integer, text) from public, anon;
grant execute on function demo_private.save_notification_banner_patch(text, boolean, integer, integer, text) to authenticated;
grant execute on function public.save_notification_banner_patch(text, boolean, integer, integer, text) to authenticated;

create function demo_private.save_product_share_back(p_token uuid, p_share_back boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_link public.product_share_links%rowtype;
  v_context jsonb;
begin
  if v_user is null or p_share_back is null then
    raise exception 'Sign in and choose whether to share back' using errcode = '42501';
  end if;
  select * into v_link from public.product_share_links where token = p_token;
  if not found or v_link.owner_id = v_user then
    raise exception 'Shared link unavailable' using errcode = '42501';
  end if;
  perform 1 from public.customers where id in (v_user, v_link.owner_id) order by id for update;
  v_context := demo_private.product_share_context(p_token, v_link.offering_slug);
  if v_context is null then raise exception 'Shared link unavailable' using errcode = '42501'; end if;

  insert into public.crew_receiving_preferences(owner_id, recipient_id, scope_key, receiving, share_back)
  values(v_link.owner_id, v_user, v_link.scope_key, coalesce((v_context->>'receiving')::boolean, false), p_share_back)
  on conflict(owner_id, recipient_id, scope_key)
  do update set share_back = excluded.share_back, updated_at = now();

  return demo_private.product_share_context(p_token, v_link.offering_slug);
end;
$$;

create function public.save_product_share_back(p_token uuid, p_share_back boolean)
returns jsonb language sql security invoker set search_path = ''
as $$ select demo_private.save_product_share_back(p_token, p_share_back); $$;

revoke all on function demo_private.save_product_share_back(uuid, boolean) from public, anon;
revoke all on function public.save_product_share_back(uuid, boolean) from public, anon;
grant execute on function demo_private.save_product_share_back(uuid, boolean) to authenticated;
grant execute on function public.save_product_share_back(uuid, boolean) to authenticated;
create function demo_private.crew_invite_link_status(p_token uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null then 'unavailable'
    when exists (
      select 1 from public.crew_invite_links link
      join public.crew_invitations relation
        on relation.status = 'accepted'
        and ((relation.requester_id = link.owner_id and relation.recipient_id = auth.uid())
          or (relation.recipient_id = link.owner_id and relation.requester_id = auth.uid()))
      where link.token = p_token
    ) then 'joined'
    when exists (select 1 from public.crew_invite_links where token = p_token) then 'available'
    else 'unavailable' end;
$$;

create function public.crew_invite_link_status(p_token uuid)
returns text language sql stable security invoker set search_path = ''
as $$ select demo_private.crew_invite_link_status(p_token); $$;

revoke all on function demo_private.crew_invite_link_status(uuid) from public, anon;
revoke all on function public.crew_invite_link_status(uuid) from public, anon;
grant execute on function demo_private.crew_invite_link_status(uuid) to authenticated;
grant execute on function public.crew_invite_link_status(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
