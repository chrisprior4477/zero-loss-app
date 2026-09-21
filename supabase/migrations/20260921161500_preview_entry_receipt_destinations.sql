-- Return exact, stable destinations for the confirmed batch. Product slugs
-- alone become ambiguous when a customer owns more than one matching entry.
begin;

create or replace function demo_private.preview_entry_batch_response(p_batch_id uuid, p_duplicate boolean default false)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'batchId', b.batch_id,
    'offeringSlug', b.offering_slug,
    'quantity', b.quantity,
    'status', min(e.outcome_status),
    'amountCents', coalesce(sum(e.amount), 0),
    'duplicate', p_duplicate,
    'entryId', (array_agg(e.entry_id order by e.created_at,e.id))[1],
    'rewardId', (array_agg(r.id order by e.created_at,e.id) filter(where r.id is not null))[1]
  )
  from public.preview_entry_batches b
  join public.customer_entries e on e.preview_batch_id = b.id
  left join public.customer_rewards r on r.customer_entry_id = e.id
  where b.id = p_batch_id
  group by b.id, b.batch_id, b.offering_slug, b.quantity;
$$;

-- Remains private; only the authenticated, owner-checking purchase RPC calls it.
revoke all on function demo_private.preview_entry_batch_response(uuid,boolean)
  from public, anon, authenticated, service_role;
notify pgrst, 'reload schema';
commit;
