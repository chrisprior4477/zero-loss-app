-- Verify an uncertain product suggestion without submitting it again.
create or replace function catalog_request_private.has_receipt(
  p_email text, p_requested_item text, p_notes text, p_source_query text, p_request_key uuid
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if p_request_key is null or length(v_email) > 254
    or length(coalesce(p_requested_item, '')) not between 2 and 160
    or length(coalesce(p_notes, '')) > 1000
    or length(coalesce(p_source_query, '')) > 512 then
    return false;
  end if;
  if v_uid is not null and not exists (select 1 from public.customers where id = v_uid) then
    v_uid := null;
  end if;

  -- Serialize against an existing submit using the same account and email scope.
  if v_uid is not null then perform pg_advisory_xact_lock(51901, hashtext(v_uid::text)); end if;
  perform pg_advisory_xact_lock(51902, hashtext(v_email));

  -- For a guest, the random receipt key and the exact submitted fields identify the request.
  -- Return only a boolean. Mismatches never reveal the saved contents or customer.
  return exists (
    select 1 from public.catalog_product_requests r
    where r.id = p_request_key and r.customer_id is not distinct from v_uid
      and r.email = v_email and r.requested_item = trim(coalesce(p_requested_item, ''))
      and r.notes is not distinct from nullif(trim(coalesce(p_notes, '')), '')
      and r.source_query is not distinct from nullif(trim(coalesce(p_source_query, '')), '')
  );
end;
$$;
revoke all on function catalog_request_private.has_receipt(text,text,text,text,uuid) from public, anon, authenticated, service_role;
grant execute on function catalog_request_private.has_receipt(text,text,text,text,uuid) to anon, authenticated;

create or replace function public.check_catalog_request_receipt(
  p_email text, p_requested_item text, p_notes text, p_source_query text, p_request_key uuid
) returns boolean
language sql security invoker set search_path = ''
as $$
  select catalog_request_private.has_receipt(p_email, p_requested_item, p_notes, p_source_query, p_request_key);
$$;
revoke all on function public.check_catalog_request_receipt(text,text,text,text,uuid) from public, anon, authenticated, service_role;
grant execute on function public.check_catalog_request_receipt(text,text,text,text,uuid) to anon, authenticated;
