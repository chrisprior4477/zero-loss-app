-- Retrying an idempotent entry must never silently change or misstate its sharing choice.
begin;

create or replace function public.create_preview_entries_with_sharing(
  p_offering_slug text, p_quantity integer, p_idempotency_key text, p_share_with_crew boolean
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb;
  v_total integer;
  v_shared integer;
begin
  if p_share_with_crew is null then
    raise exception 'Choose whether to share this pick' using errcode = '22023';
  end if;
  v_result := public.create_preview_entries(p_offering_slug, p_quantity, p_idempotency_key);

  if coalesce((v_result->>'duplicate')::boolean, false) then
    select count(*), count(s.entry_id) into v_total, v_shared
      from public.customer_entries e
      join public.preview_entry_batches b on b.id = e.preview_batch_id
      left join public.crew_entry_shares s on s.entry_id = e.id
      where b.batch_id = v_result->>'batchId' and b.customer_id = auth.uid();
    if v_total <> p_quantity or (p_share_with_crew and v_shared <> v_total)
      or (not p_share_with_crew and v_shared <> 0) then
      raise exception 'This entry was already saved with a different sharing choice. Review it in Your Crew.'
        using errcode = 'P0001';
    end if;
  elsif p_share_with_crew then
    insert into public.crew_entry_shares(entry_id, owner_id)
      select e.id, auth.uid() from public.customer_entries e
      join public.preview_entry_batches b on b.id = e.preview_batch_id
      where b.batch_id = v_result->>'batchId' and b.customer_id = auth.uid();
  end if;
  return v_result;
end;
$$;

notify pgrst, 'reload schema';
commit;
