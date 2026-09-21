-- Read-only operational inspection. No raw credentials, receipts, or customer PII.
begin read only;
select jsonb_build_object(
  'environment', (select jsonb_build_object('name',environment,'fundingEnabled',enabled,
    'entriesEnabled',preview_entries_enabled,'issuer',preview_issuer)
    from demo_private.funding_config where singleton),
  'migrations', (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
  'tables', (select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'rls',c.relrowsecurity)
    order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relkind='r' and n.nspname in ('public','demo_private')),
  'entryLock', case when pg_get_functiondef('public.create_preview_entries(text,integer,text)'::regprocedure)
    like '%where slug = p_offering_slug and active for update%' then 'exclusive'
    else 'inspect-required' end,
  'entryCount', (select count(*) from public.customer_entries),
  'purchasedOfferings', (select jsonb_agg(x) from (
    select e.offering_slug, count(*) as purchases, o.capacity, o.sample_entries, o.repeatable_scenario
    from public.customer_entries e join demo_private.preview_entry_offerings o on o.slug=e.offering_slug
    group by e.offering_slug,o.capacity,o.sample_entries,o.repeatable_scenario order by e.offering_slug
  ) x),
  'entryDebitMismatches', (select count(*) from public.customer_entries e
    where (select count(*) from public.ledger_entries l where l.customer_entry_id=e.id)<>1
       or (select coalesce(sum(l.amount),0) from public.ledger_entries l where l.customer_entry_id=e.id)<>-e.amount),
  'batchCountMismatches', (select count(*) from public.preview_entry_batches b
    where b.quantity<>(select count(*) from public.customer_entries e where e.preview_batch_id=b.id)),
  'overCapacityOfferings', (select count(*) from demo_private.preview_entry_offerings o
    where not o.repeatable_scenario and o.capacity<(select count(*) from public.customer_entries e where e.offering_slug=o.slug)),
  'availability', public.get_preview_offering_availability(),
  'fundingPostingMismatches', (select count(*) from public.demo_funding_sessions s
    where s.status='succeeded' and (select count(*) from public.ledger_entries l
      where l.demo_funding_session_id=s.id and l.amount=s.amount and l.customer_id=s.customer_id
        and l.wallet_account_id=s.wallet_account_id)<>1),
  'negativePlayableWallets', (select count(*) from (select wallet_account_id from public.ledger_entries
    where balance_type='PLAYABLE' group by wallet_account_id having sum(amount)<0) x),
  'recentTestFunding', (select jsonb_agg(jsonb_build_object('id',s.id,'amountCents',s.amount,
    'status',s.status,'ledgerCredits',(select count(*) from public.ledger_entries l where l.demo_funding_session_id=s.id)))
    from public.demo_funding_sessions s where s.id in ('ce17d4e8-a6b2-4712-ae2e-6bdf1cde25b9','d0c66618-02bf-413b-990e-8426d612c9c0'))
) as audit;
rollback;
