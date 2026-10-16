-- One-ticket-left Popular Rewards demo. The result shown when the last ticket
-- closes a pool is a private, one-time randomized preview scenario, not a
-- production draw. Existing entries, outcomes, rewards, and ledger rows stay
-- immutable; only fictional sample occupancy and future demo behavior change.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table demo_private.preview_popular_reward_scenarios (
  offering_slug text primary key references demo_private.preview_entry_offerings(slug) on delete restrict,
  brand_slug text not null,
  closing_outcome text not null check (closing_outcome in ('winner', 'purchase_option')),
  assigned_at timestamptz not null default now()
);
alter table demo_private.preview_popular_reward_scenarios enable row level security;
revoke all on demo_private.preview_popular_reward_scenarios from public, anon, authenticated, service_role;

-- The existing close trigger runs before this one. Thus a result inserted here
-- sees the recorded closure and uses the normal outcome-email and reward flows.
create function demo_private.resolve_popular_reward_winner(
  p_slug text, p_closing_entry_id uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_offer demo_private.preview_entry_offerings;
  v_closing public.customer_entries;
  v_saved bigint;
  v_entry public.customer_entries;
begin
  if not coalesce((select preview_entries_enabled and environment = 'development-test'
      from demo_private.funding_config where singleton), false) then return; end if;
  select * into v_offer from demo_private.preview_entry_offerings
    where slug = p_slug for update;
  if not found or not v_offer.active or v_offer.repeatable_scenario
      or v_offer.forced_outcome <> 'active' then return; end if;
  if not exists (select 1 from demo_private.preview_popular_reward_scenarios
      where offering_slug = p_slug and closing_outcome = 'winner') then
    raise exception 'No winner scenario for this demo offer' using errcode = 'P0001';
  end if;
  select * into v_closing from public.customer_entries
    where id = p_closing_entry_id and offering_slug = p_slug and outcome_status = 'active';
  if not found or exists (select 1 from public.demo_entry_reset_items r
      where r.customer_entry_id = p_closing_entry_id) then
    raise exception 'Closing demo entry is unavailable' using errcode = 'P0001';
  end if;
  select count(*) into v_saved from public.customer_entries e
    where e.offering_slug = p_slug and not exists (
      select 1 from public.demo_entry_reset_items r where r.customer_entry_id = e.id);
  if v_offer.sample_entries::bigint + v_saved < v_offer.capacity then return; end if;

  -- The closing customer's ticket is the winner for this scripted preview;
  -- any other unresolved customer tickets get their own purchase options.
  insert into public.entry_outcomes(customer_entry_id, customer_id, wallet_account_id, outcome)
    values(v_closing.id, v_closing.customer_id, v_closing.wallet_account_id, 'winner');
  insert into public.customer_rewards(customer_entry_id, customer_id, wallet_account_id)
    values(v_closing.id, v_closing.customer_id, v_closing.wallet_account_id);
  for v_entry in select e.* from public.customer_entries e
    where e.offering_slug = p_slug and e.id <> v_closing.id and e.outcome_status = 'active'
      and not exists (select 1 from public.entry_outcomes x where x.customer_entry_id = e.id)
      and not exists (select 1 from public.demo_entry_reset_items r where r.customer_entry_id = e.id)
    order by e.created_at, e.id
  loop
    insert into public.entry_outcomes(customer_entry_id, customer_id, wallet_account_id, outcome)
      values(v_entry.id, v_entry.customer_id, v_entry.wallet_account_id, 'not_selected');
    insert into public.completion_options(
      customer_entry_id, customer_id, wallet_account_id, paid_cents, remaining_cents
    ) values(v_entry.id, v_entry.customer_id, v_entry.wallet_account_id, v_entry.amount,
      greatest(v_offer.value_cents - v_entry.amount, 0));
  end loop;
end;
$$;
revoke all on function demo_private.resolve_popular_reward_winner(text,uuid)
  from public, anon, authenticated, service_role;

create or replace function demo_private.resolve_preview_offer_after_entry()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_scenario text;
begin
  select closing_outcome into v_scenario from demo_private.preview_popular_reward_scenarios
    where offering_slug = new.offering_slug;
  if v_scenario = 'winner' then
    perform demo_private.resolve_popular_reward_winner(new.offering_slug, new.id);
  else
    perform demo_private.resolve_closed_preview_offer(new.offering_slug);
  end if;
  return new;
end;
$$;
revoke all on function demo_private.resolve_preview_offer_after_entry()
  from public, anon, authenticated, service_role;

-- Store two randomly placed winner scenarios per brand, with the other two
-- amounts giving the normal purchase-option result. No amount order is fixed.
with brands(brand_slug) as (values
  ('amazon'), ('walmart'), ('starbucks'), ('doordash'), ('home-depot'),
  ('nintendo'), ('cvs'), ('uber-eats'), ('adidas'), ('petsmart')
), ranked as (
  select b.brand_slug, o.slug,
    row_number() over (partition by b.brand_slug order by gen_random_uuid()) as position
  from brands b cross join (values (100), (75), (50), (25)) amounts(amount)
  join demo_private.preview_entry_offerings o
    on o.slug = b.brand_slug || '-' || amounts.amount || '-gift-card'
)
insert into demo_private.preview_popular_reward_scenarios(offering_slug, brand_slug, closing_outcome)
select slug, brand_slug, case when position <= 2 then 'winner' else 'purchase_option' end
from ranked;

do $$
declare
  v_offer demo_private.preview_entry_offerings;
  v_target record;
  v_saved bigint;
  v_new_sample integer;
begin
  if not coalesce((select preview_entries_enabled and environment = 'development-test'
      from demo_private.funding_config where singleton), false) then
    raise exception 'Popular reward calibration is demo-only' using errcode = '42501';
  end if;
  if (select count(*) from demo_private.preview_popular_reward_scenarios) <> 40
      or exists (select 1 from demo_private.preview_popular_reward_scenarios
        group by brand_slug having count(*) <> 4 or
          count(*) filter (where closing_outcome = 'winner') <> 2) then
    raise exception 'Expected four randomized demo scenarios per brand' using errcode = 'P0001';
  end if;
  for v_target in select offering_slug from demo_private.preview_popular_reward_scenarios
      order by offering_slug
  loop
    select * into v_offer from demo_private.preview_entry_offerings
      where slug = v_target.offering_slug for update;
    if not found or not v_offer.active or v_offer.entry_price_cents <> 100
        or not (
          (v_offer.slug = 'walmart-100-gift-card' and v_offer.repeatable_scenario
            and v_offer.forced_outcome = 'winner')
          or (v_offer.slug <> 'walmart-100-gift-card' and not v_offer.repeatable_scenario
            and v_offer.forced_outcome = 'active')
        ) then
      raise exception 'Popular reward % has unexpected demo configuration', v_target.offering_slug
        using errcode = 'P0001';
    end if;
    if exists (select 1 from public.entry_requests r
        where r.offering_slug = v_offer.slug and r.status = 'validating') then
      raise exception 'Popular reward % has a pending entry', v_offer.slug using errcode = 'P0001';
    end if;
    select count(*) into v_saved from public.customer_entries e
      where e.offering_slug = v_offer.slug and not exists (
        select 1 from public.demo_entry_reset_items r where r.customer_entry_id = e.id);
    v_new_sample := v_offer.capacity::bigint - v_saved - 1;
    if v_new_sample < 1 or v_new_sample >= v_offer.capacity then
      raise exception 'Popular reward % cannot safely have one slot left', v_offer.slug
        using errcode = 'P0001';
    end if;
    if v_offer.sample_entries <> v_new_sample or v_offer.repeatable_scenario
        or v_offer.forced_outcome <> 'active' then
      update demo_private.preview_entry_offerings
        set sample_entries = v_new_sample, repeatable_scenario = false,
            forced_outcome = 'active', updated_at = now()
        where slug = v_offer.slug;
      insert into demo_private.preview_pool_reset_events(
        offering_slug, requested_by, reset_source, prior_sample_entries,
        new_sample_entries, retained_customer_entries
      ) values(v_offer.slug, null, 'manual', v_offer.sample_entries,
        v_new_sample, v_saved::integer);
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
commit;
