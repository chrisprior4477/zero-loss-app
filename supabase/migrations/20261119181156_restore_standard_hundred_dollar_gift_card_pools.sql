-- Restore the standard $1 entry flow for the listings switched to direct
-- checkout. Only fictional pool occupancy and future demo outcomes change.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '45s';

do $$
declare
  v_target record;
  v_retained integer;
  v_remaining integer;
  v_sample_entries integer;
begin
  if not exists (select 1 from demo_private.preview_entry_offerings where direct_checkout) then
    return;
  end if;
  if not coalesce((select environment = 'development-test'
      from demo_private.funding_config where singleton), false) then
    raise exception 'Gift card pool calibration is demo-only' using errcode = '42501';
  end if;

  -- Serialize with both entry confirmation and the retiring checkout. A
  -- previously committed checkout remains readable and can still be replayed.
  perform 1 from demo_private.preview_entry_offerings
    where direct_checkout order by slug for update;

  for v_target in
    with ranked as (
      select o.slug, o.capacity, o.entry_price_cents, o.sample_entries,
        row_number() over (order by
          case o.slug when 'amazon-100-gift-card' then 0 when 'walmart-100-gift-card' then 1 else 2 end,
          gen_random_uuid()) - 1 as position
      from demo_private.preview_entry_offerings o
      where o.direct_checkout
    )
    select *, case when position % 3 = 1 then 'winner'
      when position % 3 = 0 then 'purchase_option'
      when (position / 3) % 2 = 0 then 'winner'
      else 'purchase_option' end as closing_outcome
    from ranked order by slug
  loop
    if v_target.entry_price_cents <> 100 or exists (
      select 1 from public.entry_requests
      where offering_slug = v_target.slug and status = 'validating'
    ) then
      raise exception 'Gift card % has an unexpected price or a pending entry', v_target.slug;
    end if;

    select count(*) into v_retained
    from public.customer_entries e
    where e.offering_slug = v_target.slug
      and not exists (select 1 from public.demo_entry_reset_items r where r.customer_entry_id = e.id);

    if v_target.position % 3 = 2 then
      -- Leave 45–75% available, including on pools with saved entries.
      v_remaining := ceil(v_target.capacity * (45 + (v_target.position / 3) % 31) / 100.0);
    else
      v_remaining := (array[1, 2, 5])[(v_target.position / 3) % 3 + 1];
    end if;
    v_sample_entries := v_target.capacity - v_retained - v_remaining;
    if v_sample_entries < 1 then
      raise exception 'Gift card % cannot be recalibrated without affecting saved entries', v_target.slug;
    end if;

    insert into demo_private.preview_popular_reward_scenarios(offering_slug, brand_slug, closing_outcome)
      values (v_target.slug, v_target.slug, v_target.closing_outcome)
    on conflict (offering_slug) do update
      set closing_outcome = excluded.closing_outcome, assigned_at = now();

    update demo_private.preview_entry_offerings
    set direct_checkout = false, active = true, repeatable_scenario = false,
      forced_outcome = 'active', sample_entries = v_sample_entries, updated_at = now()
    where slug = v_target.slug;

    if v_target.sample_entries <> v_sample_entries then
      insert into demo_private.preview_pool_reset_events (
        offering_slug, requested_by, reset_source, prior_sample_entries,
        new_sample_entries, retained_customer_entries
      ) values (v_target.slug, null, 'manual', v_target.sample_entries, v_sample_entries, v_retained);
    end if;
  end loop;
end;
$$;

commit;
