begin;

-- A self-demo may use any catalog prize, but it must retain its isolated scope.
-- The canonical offering foreign key and all owner/recipient policies stay intact.
alter table public.product_share_links drop constraint demo_share_item;
alter table public.product_share_links add constraint demo_share_item
  check (not demo_self or scope_key = 'demo-self');

create or replace function demo_private.send_demo_product_share(p_request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_token uuid;
  v_share uuid;
  v_slug text;
  v_activity jsonb;
begin
  if v_user is null or p_request_id is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if not coalesce((select preview_entries_enabled and preview_issuer = auth.jwt()->>'iss'
    from demo_private.funding_config where singleton), false)
    or not exists (select 1 from public.wallet_accounts
      where customer_id = v_user and scope = 'demo' and closed_at is null) then
    raise exception 'Demo sharing is unavailable' using errcode = '42501';
  end if;
  perform 1 from public.customers where id = v_user for update;

  -- Replay the saved receipt before choosing another prize, even if its pool
  -- closed since the first response. The UI independently checks availability.
  select s.id into v_share
  from public.received_product_shares s
  join public.product_share_links l on l.token = s.token
  where s.recipient_id = v_user and l.owner_id = v_user
    and l.demo_self and s.demo_request_id = p_request_id;
  if v_share is not null then return v_share; end if;

  v_activity := public.get_account_activity();
  select a->>'slug' into v_slug
  from jsonb_array_elements(public.get_preview_offering_availability()) a
  where (a->>'remaining')::bigint > 0
    and not exists (select 1 from jsonb_array_elements(v_activity) item
      where item->>'slug' = a->>'slug' and item->>'status' in ('prize', 'completion', 'completed'))
  order by (a->>'slug' = 'walmart-100-gift-card') desc,
    (a->>'slug' like '%-gift-card') desc, a->>'slug'
  limit 1;
  if v_slug is null then
    raise exception 'No open demo prize is available to share right now.' using errcode = 'P0001';
  end if;

  -- Entry writers lock the offering too. Recheck after the lock so a concurrent
  -- final entry cannot turn a newly-created demo share into a closed-pool link.
  perform 1 from demo_private.preview_entry_offerings where slug = v_slug for update;
  if not exists (select 1 from jsonb_array_elements(public.get_preview_offering_availability()) a
    where a->>'slug' = v_slug and (a->>'remaining')::bigint > 0) then
    raise exception 'That demo prize just closed. Please try again.' using errcode = 'P0001';
  end if;

  insert into public.product_share_links(owner_id, offering_slug, scope_key, demo_self)
    values (v_user, v_slug, 'demo-self', true)
    on conflict (owner_id, offering_slug, scope_key) do update set demo_self = true
    returning token into v_token;
  insert into public.received_product_shares(token, recipient_id, demo_request_id)
    values (v_token, v_user, p_request_id)
    on conflict (token, recipient_id) do update set created_at = clock_timestamp(),
      demo_receiving = true, demo_share_back = false, demo_request_id = p_request_id
    returning id into v_share;
  delete from public.customer_notification_reads
    where customer_id = v_user and notification_id = 'shared-' || v_share::text;
  return v_share;
end;
$$;

-- CREATE OR REPLACE retains the existing private-function grants; the public
-- wrapper remains SECURITY INVOKER and available only to authenticated callers.
notify pgrst, 'reload schema';
commit;
