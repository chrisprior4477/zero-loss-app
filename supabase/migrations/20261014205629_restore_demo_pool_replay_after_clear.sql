-- A cleared demo entry is immutable history, not an occupied current slot.
-- Keep availability and admission on the same current-entry accounting used
-- by the pool-closing trigger. Winner showcase pools remain repeatable.
begin;

create or replace function public.get_preview_offering_availability() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug', a.slug, 'capacity', a.capacity, 'sold', a.sold,
    'remaining', greatest(0, a.capacity - a.sold),
    'entryPriceCents', a.entry_price_cents,
    'repeatableScenario', a.repeatable_scenario
  ) order by a.slug), '[]'::jsonb)
  from (
    select o.slug, o.capacity, o.entry_price_cents, o.repeatable_scenario,
      least(o.capacity, o.sample_entries::bigint + case when o.repeatable_scenario then 0 else
        (select count(*) from public.customer_entries e
          where e.offering_slug = o.slug
            and not exists (select 1 from public.demo_entry_reset_items reset
              where reset.customer_entry_id = e.id)) +
        (select coalesce(sum(r.requested_quantity), 0) from public.entry_requests r
          where r.offering_slug = o.slug and r.status = 'validating') end) as sold
    from demo_private.preview_entry_offerings o
    where o.active and exists (select 1 from demo_private.funding_config
      where singleton and environment = 'development-test' and preview_entries_enabled
        and preview_issuer = 'https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1')
  ) a;
$$;

-- The private writer is reached through the recovery-aware public submit RPC.
-- Preserve its idempotency, per-customer rate limits, wallet checks, and hold
-- writer; change only the offer-capacity count to exclude cleared entries.
create or replace function demo_private.request_preview_entries_original(
  p_offering_slug text, p_quantity integer, p_idempotency_key text,
  p_share_with_crew boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_wallet uuid; r public.entry_requests; b public.preview_entry_batches;
  o demo_private.preview_entry_offerings; v_balance bigint; v_count bigint;
  v_now timestamptz; v_shared integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_quantity is null or p_quantity not between 1 and 10 or p_share_with_crew is null
    or p_offering_slug is null or p_offering_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid entry request' using errcode = '22023';
  end if;
  if not coalesce((select preview_entries_enabled and environment = 'development-test'
    and preview_issuer = auth.jwt()->>'iss'
    from demo_private.funding_config where singleton), false) then
    raise exception 'Preview entries unavailable' using errcode = '42501';
  end if;
  v_wallet := demo_private.lock_funding_wallet();
  select * into r from public.entry_requests
    where customer_id = auth.uid() and idempotency_key = p_idempotency_key;
  if found then
    if r.wallet_account_id <> v_wallet or r.offering_slug <> p_offering_slug
      or r.requested_quantity <> p_quantity or r.share_with_crew <> p_share_with_crew then
      raise exception 'Idempotency key belongs to a different entry request' using errcode = '22023';
    end if;
    return demo_private.entry_request_response(r.id, true);
  end if;
  select * into b from public.preview_entry_batches
    where customer_id = auth.uid() and idempotency_key = p_idempotency_key;
  if found then
    if b.wallet_account_id <> v_wallet or b.offering_slug <> p_offering_slug
      or b.quantity <> p_quantity then
      raise exception 'Idempotency key belongs to a different entry request' using errcode = '22023';
    end if;
    select count(s.entry_id) into v_shared from public.customer_entries e
      left join public.crew_entry_shares s on s.entry_id = e.id
      where e.preview_batch_id = b.id;
    if (p_share_with_crew and v_shared <> p_quantity)
      or (not p_share_with_crew and v_shared <> 0) then
      raise exception 'This entry was already saved with a different sharing choice. Review it in Your Crew.' using errcode = 'P0001';
    end if;
    return demo_private.preview_entry_batch_response(b.id, true);
  end if;
  select * into r from public.entry_requests where customer_id = auth.uid()
    and offering_slug = p_offering_slug and status = 'validating';
  if found then return demo_private.entry_request_response(r.id, true); end if;
  select * into o from demo_private.preview_entry_offerings
    where slug = p_offering_slug and active for update;
  if not found then raise exception 'This preview offering is unavailable' using errcode = '22023'; end if;
  -- Historical attempts continue to count toward abuse limits after a reset.
  select coalesce(sum(requested_quantity), 0) + (select count(*) from public.customer_entries e
    where e.customer_id = auth.uid() and e.created_at > clock_timestamp() - interval '1 minute'
      and not exists (select 1 from public.entry_requests x where x.preview_batch_id = e.preview_batch_id))
    into v_count from public.entry_requests
    where customer_id = auth.uid() and requested_at > clock_timestamp() - interval '1 minute';
  if v_count + p_quantity > 10 then
    raise exception 'Demo limit: ten entries per minute.' using errcode = 'P0001';
  end if;
  select coalesce(sum(requested_quantity), 0) + (select count(*) from public.customer_entries e
    where e.customer_id = auth.uid() and e.created_at > clock_timestamp() - interval '24 hours'
      and not exists (select 1 from public.entry_requests x where x.preview_batch_id = e.preview_batch_id))
    into v_count from public.entry_requests
    where customer_id = auth.uid() and requested_at > clock_timestamp() - interval '24 hours';
  if v_count + p_quantity > 100 then
    raise exception 'Demo limit: one hundred entries per day.' using errcode = 'P0001';
  end if;
  select (select count(*) from public.customer_entries e
      where e.offering_slug = p_offering_slug
        and not exists (select 1 from public.demo_entry_reset_items reset
          where reset.customer_entry_id = e.id))
    + coalesce(sum(requested_quantity), 0) into v_count
    from public.entry_requests
    where offering_slug = p_offering_slug and status = 'validating';
  if not o.repeatable_scenario and o.sample_entries::bigint + v_count + p_quantity > o.capacity then
    raise exception 'There are not enough entries remaining for that quantity.' using errcode = 'P0001';
  end if;
  select coalesce(sum(amount) filter(where balance_type = 'PLAYABLE'), 0) into v_balance
    from public.ledger_entries where customer_id = auth.uid() and wallet_account_id = v_wallet;
  if v_balance < o.entry_price_cents * p_quantity then
    raise exception 'Add demo funds before entering this quantity.' using errcode = 'P0001';
  end if;
  v_now := clock_timestamp();
  insert into public.entry_requests(customer_id, wallet_account_id, offering_slug,
    requested_quantity, unit_price_cents, idempotency_key, share_with_crew,
    requested_at, undo_until)
    values(auth.uid(), v_wallet, p_offering_slug, p_quantity, o.entry_price_cents,
      p_idempotency_key, p_share_with_crew, v_now, v_now + interval '30 seconds') returning * into r;
  insert into demo_private.entry_request_terms(request_id, value_cents, forced_outcome)
    values(r.id, o.value_cents, o.forced_outcome);
  perform demo_private.post_entry_request_hold(r.id, false);
  insert into public.entry_request_events(request_id, event_name, actor, reason_code)
    values(r.id, 'entry.requested', 'customer', 'undo_window');
  return demo_private.entry_request_response(r.id, false);
end;
$$;

-- Reconcile a previously full ordinary pool whose saved entries were still
-- active before this migration. The resolver is idempotent and gives each
-- nonwinner an independent purchase option, never a winner reward.
do $$
declare v_slug text;
begin
  for v_slug in select slug from demo_private.preview_entry_offerings
    where active and not repeatable_scenario and forced_outcome = 'active'
  loop
    perform demo_private.resolve_closed_preview_offer(v_slug);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
commit;
