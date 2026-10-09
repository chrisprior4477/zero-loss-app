-- Demo-only replay of a full offer. Keep customer entries, outcomes, wallet
-- ledger, and prior closure records intact; adjust only fictional sample slots.
begin;

create table demo_private.preview_pool_reset_events (
  id uuid primary key default gen_random_uuid(),
  offering_slug text not null references demo_private.preview_entry_offerings(slug) on delete restrict,
  requested_by uuid references public.customers(id) on delete restrict,
  reset_source text not null check (reset_source in ('initial_sweep', 'manual')),
  prior_sample_entries integer not null check (prior_sample_entries >= 0),
  new_sample_entries integer not null check (new_sample_entries >= 0),
  retained_customer_entries integer not null check (retained_customer_entries >= 0),
  created_at timestamptz not null default now()
);
create index preview_pool_reset_events_offering_idx
  on demo_private.preview_pool_reset_events(offering_slug, created_at desc);
alter table demo_private.preview_pool_reset_events enable row level security;
revoke all on demo_private.preview_pool_reset_events from public, anon, authenticated, service_role;

create function demo_private.reset_full_preview_pool_to_one(
  p_slug text, p_requested_by uuid, p_source text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_offer demo_private.preview_entry_offerings;
  v_saved bigint;
  v_new_sample integer;
  v_remaining bigint;
begin
  if not coalesce((select preview_entries_enabled and environment = 'development-test'
      from demo_private.funding_config where singleton), false) then
    raise exception 'Demo pool reset is unavailable' using errcode = '42501';
  end if;
  if p_source not in ('initial_sweep', 'manual') then
    raise exception 'Invalid pool reset source' using errcode = '22023';
  end if;
  -- Entry submission and confirmation lock this same row before capacity
  -- checks, so a reset cannot race a completed entry.
  select * into v_offer from demo_private.preview_entry_offerings
    where slug = p_slug for update;
  if not found or not v_offer.active or v_offer.repeatable_scenario
      or v_offer.forced_outcome <> 'active' then
    raise exception 'This demo pool cannot be reset' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.entry_requests
      where offering_slug = p_slug and status = 'validating') then
    raise exception 'An entry is being confirmed. Try again after its countdown.' using errcode = 'P0001';
  end if;
  select count(*) into v_saved from public.customer_entries e
    where e.offering_slug = p_slug
      and not exists (select 1 from public.demo_entry_reset_items r
        where r.customer_entry_id = e.id);
  v_remaining := greatest(0, v_offer.capacity::bigint - v_offer.sample_entries::bigint - v_saved);
  if v_remaining > 0 then
    return jsonb_build_object('remaining', v_remaining, 'alreadyOpen', true);
  end if;
  v_new_sample := v_offer.capacity::bigint - v_saved - 1;
  -- Retain at least one fictional slot for the already-selected demo winner.
  -- Never enlarge capacity or delete anyone's paid entry to force a replay.
  if v_new_sample < 1 then
    raise exception 'This pool has too many saved demo entries to reset safely.' using errcode = 'P0001';
  end if;
  update demo_private.preview_entry_offerings
    set sample_entries = v_new_sample, updated_at = now()
    where slug = p_slug;
  insert into demo_private.preview_pool_reset_events (
    offering_slug, requested_by, reset_source, prior_sample_entries,
    new_sample_entries, retained_customer_entries
  ) values (p_slug, p_requested_by, p_source, v_offer.sample_entries,
    v_new_sample, v_saved::integer);
  return jsonb_build_object('remaining', 1, 'alreadyOpen', false);
end;
$$;
revoke all on function demo_private.reset_full_preview_pool_to_one(text,uuid,text)
  from public, anon, authenticated, service_role;

create function public.reset_demo_pool(p_offering_slug text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform demo_private.assert_card_environment();
  if auth.uid() is null or p_offering_slug is null
      or p_offering_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid demo pool reset request' using errcode = '22023';
  end if;
  if not exists (select 1 from public.customers c
      where c.id = auth.uid() and c.status = 'active'
        and c.verification_status = 'email_verified')
      or public.current_wallet_account_id() is null then
    raise exception 'Sign in with a confirmed demo account to reset this pool.' using errcode = '42501';
  end if;
  return demo_private.reset_full_preview_pool_to_one(p_offering_slug, auth.uid(), 'manual');
end;
$$;
revoke all on function public.reset_demo_pool(text) from public, anon, authenticated, service_role;
grant execute on function public.reset_demo_pool(text) to authenticated;

-- Older closure-email logic must use the same current-entry accounting as
-- availability and pool resolution after an account-scoped demo entry reset.
create or replace function demo_private.close_full_preview_offering() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_offering demo_private.preview_entry_offerings; v_real bigint;
begin
  select * into v_offering from demo_private.preview_entry_offerings where slug = new.offering_slug;
  if not found or v_offering.repeatable_scenario then return new; end if;
  select count(*) into v_real from public.customer_entries e
    where e.offering_slug = new.offering_slug
      and not exists (select 1 from public.demo_entry_reset_items r
        where r.customer_entry_id = e.id);
  if v_offering.sample_entries::bigint + v_real >= v_offering.capacity then
    insert into demo_private.preview_offer_closures(offering_slug,close_reason)
    values(new.offering_slug, 'capacity') on conflict(offering_slug) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function demo_private.close_full_preview_offering()
  from public, anon, authenticated, service_role;

-- Reopen every currently full non-showcase pool, not just the examples seen
-- in the browser. On live preview data this includes Dunkin', DoorDash, Amazon.
do $$
declare v_slug text;
begin
  if coalesce((select preview_entries_enabled and environment = 'development-test'
      from demo_private.funding_config where singleton), false) then
    for v_slug in select o.slug from demo_private.preview_entry_offerings o
      where o.active and not o.repeatable_scenario and o.forced_outcome = 'active'
        and o.sample_entries::bigint + (
          select count(*) from public.customer_entries e
          where e.offering_slug = o.slug
            and not exists (select 1 from public.demo_entry_reset_items r
              where r.customer_entry_id = e.id)
        ) >= o.capacity
      order by o.slug
    loop
      perform demo_private.reset_full_preview_pool_to_one(v_slug, null, 'initial_sweep');
    end loop;
  end if;
end;
$$;

commit;
