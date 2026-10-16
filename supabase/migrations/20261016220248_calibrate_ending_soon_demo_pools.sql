-- Investor-demo pool calibration. Adjust fictional sample slots only; never
-- remove customer entries, outcomes, completion options, or ledger history.
begin;

do $$
declare
  v_target record;
  v_offer demo_private.preview_entry_offerings;
  v_active bigint;
  v_new_sample integer;
  v_best_buy jsonb;
begin
  if not coalesce((select preview_entries_enabled and environment = 'development-test'
      from demo_private.funding_config where singleton), false) then
    raise exception 'Preview pool calibration is unavailable outside the demo' using errcode = '42501';
  end if;

  for v_target in select * from (values
    ('netflix-25-gift-card', 4),
    ('homegoods-75-gift-card', 6),
    ('home-style-50-gift-card-bundle', 6),
    ('lowes-150-gift-card', 10)
  ) as requested(slug, remaining) order by slug
  loop
    select * into v_offer from demo_private.preview_entry_offerings
      where slug = v_target.slug for update;
    if not found or not v_offer.active or v_offer.repeatable_scenario
        or v_offer.forced_outcome <> 'active' then
      raise exception 'Demo offering % is not open for calibration', v_target.slug using errcode = 'P0001';
    end if;
    if exists (select 1 from public.entry_requests r
        where r.offering_slug = v_target.slug and r.status = 'validating')
        or exists (select 1 from demo_private.preview_offer_closures c
          where c.offering_slug = v_target.slug) then
      raise exception 'Demo offering % has a pending entry or closed pool', v_target.slug using errcode = 'P0001';
    end if;
    select count(*) into v_active from public.customer_entries e
      where e.offering_slug = v_target.slug
        and not exists (select 1 from public.demo_entry_reset_items reset
          where reset.customer_entry_id = e.id);
    v_new_sample := v_offer.capacity - v_active - v_target.remaining;
    if v_new_sample < 1 or v_new_sample > v_offer.capacity then
      raise exception 'Demo offering % cannot safely reach % slots left', v_target.slug, v_target.remaining using errcode = 'P0001';
    end if;
    update demo_private.preview_entry_offerings
      set sample_entries = v_new_sample, updated_at = now()
      where slug = v_target.slug;
    insert into demo_private.preview_pool_reset_events (
      offering_slug, requested_by, reset_source, prior_sample_entries,
      new_sample_entries, retained_customer_entries
    ) values (v_target.slug, null, 'manual', v_offer.sample_entries,
      v_new_sample, v_active::integer);
  end loop;

  -- This audited replay retains the two accounts' Best Buy entries and the
  -- already-posted outcomes while opening exactly one new demo slot.
  v_best_buy := demo_private.reset_full_preview_pool_to_one(
    'best-buy-100-gift-card', null, 'manual');
  if (v_best_buy->>'remaining')::integer <> 1 then
    raise exception 'Best Buy did not reopen with one slot' using errcode = 'P0001';
  end if;
end;
$$;

commit;
