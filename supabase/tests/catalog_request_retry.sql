-- Verify retries as the caller. The suggestions and rate-limit usage roll back.
begin;
set local role anon;
do $$
declare
  k uuid := gen_random_uuid();
  email text := k::text || '@example.test';
  receipt uuid;
begin
  receipt := public.submit_catalog_request_once(email, 'Sample product', 'Note', 'search', k);
  if receipt <> k or public.submit_catalog_request_once(upper(email), ' Sample product ', 'Note', 'search', k) <> receipt then
    raise exception 'A matching retry did not return the first receipt.';
  end if;
  begin
    perform public.submit_catalog_request_once(email, 'Different product', 'Note', 'search', k);
    raise exception 'Changed content was accepted' using errcode = 'XX000';
  exception when raise_exception then
    if sqlerrm not like 'This request could not be confirmed.%' then raise; end if;
  end;
  begin
    perform public.submit_catalog_request_once('other-' || email, 'Sample product', 'Note', 'search', k);
    raise exception 'Different email could reuse a receipt' using errcode = 'XX000';
  exception when raise_exception then
    if sqlerrm not like 'This request could not be confirmed.%' then raise; end if;
  end;
  for i in 2..5 loop
    perform public.submit_catalog_request(email, 'Separate idea ' || i);
  end loop;
  if public.submit_catalog_request_once(email, 'Sample product', 'Note', 'search', k) <> receipt then
    raise exception 'A matching retry must still succeed at the daily limit.';
  end if;
  begin
    perform public.submit_catalog_request_once(email, 'Sixth idea', null, null, gen_random_uuid());
    raise exception 'Daily request limit bypassed' using errcode = 'XX000';
  exception when raise_exception then
    if sqlerrm not like 'We saved your recent requests.%' then raise; end if;
  end;
end;
$$;
rollback;
