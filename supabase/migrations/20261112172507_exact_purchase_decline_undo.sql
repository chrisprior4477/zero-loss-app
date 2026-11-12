begin;

create function demo_private.write_purchase_option_decline(
  p_completion_option_id uuid, p_idempotency_key text, p_with_receipt boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_option public.completion_options;
  v_event uuid;
  v_event_key text;
  v_key text;
  v_revive uuid;
  v_status text;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid request' using errcode = '22023'; end if;
  select * into v_option from public.completion_options
    where id = p_completion_option_id and customer_id = v_uid
      and wallet_account_id = public.current_wallet_account_id() for update;
  if not found then raise exception 'Purchase option unavailable' using errcode = '42501'; end if;
  if p_with_receipt and (
    not coalesce((select preview_entries_enabled and environment = 'development-test'
      and preview_issuer = auth.jwt()->>'iss' from demo_private.funding_config where singleton), false)
    or not exists (select 1 from public.wallet_accounts where id = v_option.wallet_account_id and scope = 'demo')
  ) then raise exception 'Demo option decline unavailable' using errcode = '42501'; end if;

  v_status := demo_private.option_status(v_option.id);
  if v_status = 'declined' then
    if not p_with_receipt then
      return jsonb_build_object('status','declined','duplicate',true,'entryRefunded',false);
    end if;
    select id, idempotency_key into v_event, v_event_key from public.completion_option_events
      where completion_option_id = v_option.id and event_type = 'declined'
      order by created_at desc, id desc limit 1;
    if v_event_key is distinct from p_idempotency_key then
      raise exception 'This offer was already declined in another action' using errcode = 'PT409';
    end if;
    return jsonb_build_object('status','declined','duplicate',true,'entryRefunded',false,'declineEventId',v_event);
  end if;
  if v_status <> 'available' then
    raise exception 'Purchase option is no longer available' using errcode = 'P0001'; end if;
  if not p_with_receipt then
    select id into v_revive from public.completion_option_events
      where completion_option_id = v_option.id and event_type = 'revived'
      order by created_at desc, id desc limit 1;
  end if;
  -- Receipt-producing declines use a fresh request key for each review.
  -- A retry of an older request cannot decline the offer again after revival.
  v_key := case when v_revive is null then p_idempotency_key
    else 'decline_' || md5(p_idempotency_key || ':' || v_revive::text) end;
  if exists (select 1 from public.completion_option_events where customer_id = v_uid and idempotency_key = v_key) then
    raise exception 'Request key reused for another action' using errcode = '22023'; end if;
  insert into public.completion_option_events(completion_option_id,customer_id,wallet_account_id,event_type,idempotency_key,reason)
    values(v_option.id,v_uid,v_option.wallet_account_id,'declined',v_key,'Customer declined optional retailer gift card')
    returning id into v_event;
  update public.completion_option_reminders set status = 'cancelled', updated_at = now()
    where completion_option_id = v_option.id and status = 'pending';
  return jsonb_build_object('status','declined','duplicate',false,'entryRefunded',false)
    || case when p_with_receipt then jsonb_build_object('declineEventId',v_event) else '{}'::jsonb end;
end;
$$;
revoke all on function demo_private.write_purchase_option_decline(uuid,text,boolean) from public, anon, authenticated, service_role;
grant execute on function demo_private.write_purchase_option_decline(uuid,text,boolean) to authenticated;

create or replace function public.decline_purchase_option(p_completion_option_id uuid, p_idempotency_key text)
returns jsonb language sql security invoker set search_path = '' as $$
  select demo_private.write_purchase_option_decline(p_completion_option_id, p_idempotency_key, false);
$$;

create function public.decline_preview_purchase_option_with_receipt(p_completion_option_id uuid, p_idempotency_key text)
returns jsonb language sql security invoker set search_path = '' as $$
  select demo_private.write_purchase_option_decline(p_completion_option_id, p_idempotency_key, true);
$$;
revoke all on function public.decline_preview_purchase_option_with_receipt(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.decline_preview_purchase_option_with_receipt(uuid,text) to authenticated;

create function demo_private.undo_preview_purchase_option_decline(p_completion_option_id uuid, p_decline_event_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_latest_decline uuid;
begin
  if auth.uid() is null or p_decline_event_id is null then
    raise exception 'Decline receipt required' using errcode = '42501'; end if;
  perform 1 from public.completion_options
    where id = p_completion_option_id and customer_id = auth.uid()
      and wallet_account_id = public.current_wallet_account_id() for update;
  if not found then raise exception 'Purchase option unavailable' using errcode = '42501'; end if;
  select id into v_latest_decline from public.completion_option_events
    where completion_option_id = p_completion_option_id and event_type = 'declined'
    order by created_at desc, id desc limit 1;
  if v_latest_decline is distinct from p_decline_event_id then
    raise exception 'This decline was replaced by a newer action' using errcode = 'PT409'; end if;
  -- The option lock also covers the canonical revival and its deadline checks.
  return public.revive_preview_purchase_option(p_completion_option_id, 'undo_' || replace(p_decline_event_id::text, '-', ''));
end;
$$;
revoke all on function demo_private.undo_preview_purchase_option_decline(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function demo_private.undo_preview_purchase_option_decline(uuid,uuid) to authenticated;

create function public.undo_preview_purchase_option_decline(p_completion_option_id uuid, p_decline_event_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select demo_private.undo_preview_purchase_option_decline(p_completion_option_id, p_decline_event_id);
$$;
revoke all on function public.undo_preview_purchase_option_decline(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function public.undo_preview_purchase_option_decline(uuid,uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
