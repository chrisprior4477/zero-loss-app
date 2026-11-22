begin;

create function public.submit_reviewed_preview_entries(
  p_offering_slug text,
  p_quantity integer,
  p_idempotency_key text,
  p_share_with_crew boolean,
  p_previous_request_id uuid,
  p_entry_price_cents integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price integer;
begin
  if auth.uid() is null or not coalesce((
    select entry_undo_required and preview_entries_enabled
      and environment = 'development-test' and preview_issuer = auth.jwt()->>'iss'
    from demo_private.funding_config where singleton
  ), false) then
    raise exception 'Preview entries unavailable' using errcode = '42501';
  end if;
  if p_entry_price_cents is null or p_entry_price_cents < 1 then
    raise exception 'Invalid reviewed entry price' using errcode = '22023';
  end if;

  -- Keep the writer's wallet-before-offering lock order. Existing request keys
  -- still recover their original receipts after a catalog price change.
  perform demo_private.lock_funding_wallet();
  if not (
    exists (select 1 from demo_private.entry_request_attempts
      where customer_id = auth.uid() and idempotency_key = p_idempotency_key) or
    exists (select 1 from public.entry_requests
      where customer_id = auth.uid() and idempotency_key = p_idempotency_key) or
    exists (select 1 from public.preview_entry_batches
      where customer_id = auth.uid() and idempotency_key = p_idempotency_key)
  ) then
    select entry_price_cents into v_price from demo_private.preview_entry_offerings
      where slug = p_offering_slug for update;
    if not found or v_price is distinct from p_entry_price_cents then
      raise exception 'Review the updated entry price.' using errcode = 'P0001';
    end if;
  end if;

  return public.submit_preview_entries(
    p_offering_slug, p_quantity, p_idempotency_key, p_share_with_crew, p_previous_request_id
  );
end;
$$;

revoke all on function public.submit_reviewed_preview_entries(text, integer, text, boolean, uuid, integer) from public, anon;
grant execute on function public.submit_reviewed_preview_entries(text, integer, text, boolean, uuid, integer) to authenticated;

notify pgrst, 'reload schema';
commit;
