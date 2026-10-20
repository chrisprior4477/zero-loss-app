-- Change only the future demo entry price. Existing entry requests retain
-- their quoted unit_price_cents; accepted entries, ledger debits, and their
-- individual completion-option credits remain unchanged.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare v_price integer;
begin
  -- A fresh replay may initialize fictional catalog slots while all demo
  -- funding remains disabled. Existing accounts retain the original guard.
  if not coalesce((select environment = 'development-test' and (
      preview_entries_enabled or (
        not enabled and not preview_provisioning_enabled
        and not exists (select 1 from public.customers)
        and not exists (select 1 from public.ledger_entries)
      )) from demo_private.funding_config where singleton), false) then
    raise exception 'Lowe''s demo price change is unavailable outside the demo' using errcode = '42501';
  end if;
  select entry_price_cents into v_price
    from demo_private.preview_entry_offerings
    where slug = 'lowes-150-gift-card' and active for update;
  if not found or v_price not in (100, 200) then
    raise exception 'Unexpected Lowe''s demo entry price' using errcode = 'P0001';
  end if;
  if v_price = 200 then
    update demo_private.preview_entry_offerings
      set entry_price_cents = 100, updated_at = now()
      where slug = 'lowes-150-gift-card';
  end if;
end;
$$;

commit;
