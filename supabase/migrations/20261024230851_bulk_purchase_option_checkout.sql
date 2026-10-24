begin;

-- A command receipt, not a second financial balance or order store. All money,
-- rewards and declines still go through their existing domain writers below.
create schema if not exists purchase_private;
revoke all on schema purchase_private from public, anon;
grant usage on schema purchase_private to authenticated;
create table purchase_private.bulk_checkout_receipts (
  customer_id uuid not null references public.customers(id),
  request_id uuid not null,
  wallet_account_id uuid not null references public.wallet_accounts(id),
  request jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (customer_id, request_id)
);
alter table purchase_private.bulk_checkout_receipts enable row level security;
revoke all on purchase_private.bulk_checkout_receipts from public, anon, authenticated, service_role;
create trigger bulk_checkout_receipts_immutable before update or delete on purchase_private.bulk_checkout_receipts
  for each row execute function public.reject_financial_history_mutation();

create function purchase_private.complete_options(
  p_slug text, p_purchase_ids uuid[], p_decline_ids uuid[], p_expected_total bigint, p_request_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid(); wallet uuid; purchase_ids uuid[]; decline_ids uuid[]; all_ids uuid[];
  requested jsonb; saved purchase_private.bulk_checkout_receipts; option_row record;
  total bigint := 0; found_count integer := 0; option_id uuid; receipt jsonb; result jsonb;
  rewards jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not coalesce((select enabled and preview_entries_enabled and environment='development-test'
    and preview_issuer=auth.jwt()->>'iss' from demo_private.funding_config where singleton), false) then
    raise exception 'Preview checkout unavailable' using errcode='42501'; end if;
  if p_request_id is null or p_slug is null or p_slug !~ '^[a-z0-9-]{1,120}$'
    or p_expected_total is null or p_expected_total < 0
    or p_purchase_ids is null or cardinality(p_purchase_ids)=0 or p_decline_ids is null
    or array_position(p_purchase_ids,null) is not null or array_position(p_decline_ids,null) is not null then
    raise exception 'Invalid purchase selection' using errcode='22023'; end if;
  select array_agg(id order by id) into purchase_ids from (select distinct unnest(p_purchase_ids) id) ids;
  select coalesce(array_agg(id order by id),'{}'::uuid[]) into decline_ids from (select distinct unnest(p_decline_ids) id) ids;
  if cardinality(purchase_ids)<>cardinality(p_purchase_ids) or cardinality(decline_ids)<>cardinality(p_decline_ids)
    or purchase_ids && decline_ids then raise exception 'Invalid purchase selection' using errcode='22023'; end if;
  requested := jsonb_build_object('slug',p_slug,'purchaseIds',purchase_ids,'declineIds',decline_ids,'total',p_expected_total);
  -- The same wallet lock as single checkout serializes balance checks and retries.
  wallet := demo_private.lock_funding_wallet();
  select * into saved from purchase_private.bulk_checkout_receipts where customer_id=caller and request_id=p_request_id;
  if found then
    if saved.wallet_account_id<>wallet or saved.request<>requested then
      raise exception 'Request key reused' using errcode='22023'; end if;
    return saved.result || jsonb_build_object('duplicate',true);
  end if;
  all_ids := purchase_ids || decline_ids;
  for option_row in
    select c.*, e.offering_slug from public.completion_options c
      join public.customer_entries e on e.id=c.customer_entry_id
      where c.id=any(all_ids) and c.customer_id=caller and c.wallet_account_id=wallet
        and c.wallet_scope='demo' and c.currency='USD' and e.offering_slug=p_slug
      order by c.id for update of c
  loop
    found_count := found_count+1;
    if demo_private.option_status(option_row.id)<>'available'
      or exists(select 1 from public.demo_entry_reset_items r where r.customer_entry_id=option_row.customer_entry_id) then
      raise exception 'Purchase selection changed. Refresh your options.' using errcode='P0001'; end if;
    if option_row.id=any(purchase_ids) then total := total+option_row.remaining_cents; end if;
  end loop;
  if found_count<>cardinality(all_ids) then raise exception 'Purchase option unavailable' using errcode='42501'; end if;
  if total<>p_expected_total then raise exception 'Purchase total changed. Refresh your options.' using errcode='P0001'; end if;
  if total>(select coalesce(sum(amount) filter(where balance_type='PLAYABLE'),0) from public.ledger_entries where wallet_account_id=wallet) then
    raise exception 'Add demo funds before completing these options.' using errcode='P0001'; end if;
  foreach option_id in array purchase_ids loop
    receipt := public.purchase_preview_gift_card(option_id,'checkout_'||replace(option_id::text,'-',''));
    if receipt->>'status' is distinct from 'purchased' then raise exception 'Purchase not confirmed'; end if;
    if receipt ? 'rewardId' then rewards := rewards || jsonb_build_array(receipt->>'rewardId'); end if;
  end loop;
  -- Runs only after every selected purchase succeeds, in the same transaction.
  -- Any error rolls back ALL purchases and declines, not a partially spent batch.
  foreach option_id in array decline_ids loop
    receipt := public.decline_purchase_option(option_id,'decline_'||replace(option_id::text,'-',''));
    if receipt->>'status' is distinct from 'declined' then raise exception 'Decline not confirmed'; end if;
  end loop;
  result := jsonb_build_object('status','purchased','purchasedCount',cardinality(purchase_ids),
    'declinedCount',cardinality(decline_ids),'totalCents',total,'rewardIds',rewards,'duplicate',false);
  insert into purchase_private.bulk_checkout_receipts(customer_id,request_id,wallet_account_id,request,result)
    values(caller,p_request_id,wallet,requested,result);
  return result;
end;
$$;
revoke all on function purchase_private.complete_options(text,uuid[],uuid[],bigint,uuid) from public,anon,authenticated,service_role;
grant execute on function purchase_private.complete_options(text,uuid[],uuid[],bigint,uuid) to authenticated;
create function public.complete_preview_purchase_options(
  p_slug text, p_purchase_ids uuid[], p_decline_ids uuid[], p_expected_total bigint, p_request_id uuid
) returns jsonb language sql security invoker set search_path = '' as $$
  select purchase_private.complete_options(p_slug,p_purchase_ids,p_decline_ids,p_expected_total,p_request_id);
$$;
revoke all on function public.complete_preview_purchase_options(text,uuid[],uuid[],bigint,uuid) from public,anon,authenticated,service_role;
grant execute on function public.complete_preview_purchase_options(text,uuid[],uuid[],bigint,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
