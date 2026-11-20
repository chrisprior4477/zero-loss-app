begin;

-- Keep the original Browse search separately from the customer’s shorter item name.
alter table public.catalog_product_requests
  drop constraint catalog_product_requests_source_query_check,
  add constraint catalog_product_requests_source_query_check
    check (source_query is null or length(source_query) <= 512);

create or replace function catalog_request_private.submit_once(
  p_email text, p_requested_item text, p_notes text,
  p_source_query text, p_request_key uuid
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_item text := trim(coalesce(p_requested_item, ''));
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
  v_source text := nullif(trim(coalesce(p_source_query, '')), '');
  v_prior public.catalog_product_requests%rowtype;
  v_id uuid;
begin
  if length(v_email) not between 3 and 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Enter a valid email address.';
  end if;
  if length(v_item) not between 2 and 160 then
    raise exception 'Tell us what you would like to see in 2–160 characters.';
  end if;
  if length(coalesce(v_notes, '')) > 1000 then
    raise exception 'Keep the extra details under 1,000 characters.';
  end if;
  if length(coalesce(v_source, '')) > 512 then
    raise exception 'Shorten the original search before submitting this request.';
  end if;
  if p_request_key is null then raise exception 'Refresh the request form and try again.'; end if;
  if v_uid is not null and not exists (select 1 from public.customers where id = v_uid) then
    v_uid := null;
  end if;

  -- Serialize the two scopes used by the existing five-per-day limit. Acquire
  -- them in the same order for every caller, including anonymous requests.
  if v_uid is not null then perform pg_advisory_xact_lock(51901, hashtext(v_uid::text)); end if;
  perform pg_advisory_xact_lock(51902, hashtext(v_email));

  select * into v_prior from public.catalog_product_requests where id = p_request_key;
  if found then
    if v_prior.customer_id is not distinct from v_uid and v_prior.email = v_email
      and v_prior.requested_item = v_item and v_prior.notes is not distinct from v_notes
      and v_prior.source_query is not distinct from v_source then
      return v_prior.id;
    end if;
    raise exception 'This request could not be confirmed. Refresh the form before starting a new suggestion.';
  end if;
  if (select count(*) from public.catalog_product_requests r
      where r.created_at > clock_timestamp() - interval '24 hours'
        and ((v_uid is not null and r.customer_id = v_uid) or lower(r.email) = v_email)) >= 5 then
    raise exception 'We saved your recent requests. Please try again tomorrow.';
  end if;
  insert into public.catalog_product_requests(id,customer_id,email,requested_item,notes,source_query)
    values (p_request_key,v_uid,v_email,v_item,v_notes,v_source)
    on conflict (id) do nothing returning id into v_id;
  if v_id is null then
    raise exception 'This request could not be confirmed. Refresh the form before starting a new suggestion.';
  end if;
  return v_id;
end;
$$;

commit;
