begin;

create table public.catalog_product_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  email text not null check (length(email) between 3 and 254),
  requested_item text not null check (length(requested_item) between 2 and 160),
  notes text check (notes is null or length(notes) <= 1000),
  source_query text check (source_query is null or length(source_query) <= 160),
  status text not null default 'new' check (status in ('new','reviewing','planned','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index catalog_product_requests_created_idx on public.catalog_product_requests(created_at desc);
create index catalog_product_requests_customer_idx on public.catalog_product_requests(customer_id, created_at desc)
  where customer_id is not null;
create index catalog_product_requests_email_idx on public.catalog_product_requests(lower(email), created_at desc);

alter table public.catalog_product_requests enable row level security;
revoke all on public.catalog_product_requests from public, anon, authenticated, service_role;

create function public.submit_catalog_request(
  p_email text,
  p_requested_item text,
  p_notes text default null,
  p_source_query text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_item text := trim(coalesce(p_requested_item, ''));
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
  v_source text := nullif(trim(coalesce(p_source_query, '')), '');
  v_id uuid;
begin
  if length(v_email) not between 3 and 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Enter a valid email address.' using errcode = 'P0001';
  end if;
  if length(v_item) not between 2 and 160 then
    raise exception 'Tell us what you would like to see in 2–160 characters.' using errcode = 'P0001';
  end if;
  if length(coalesce(v_notes, '')) > 1000 or length(coalesce(v_source, '')) > 160 then
    raise exception 'Keep the extra details under 1,000 characters.' using errcode = 'P0001';
  end if;

  if v_uid is not null and not exists(select 1 from public.customers where id = v_uid) then
    v_uid := null;
  end if;

  if (
    select count(*)
    from public.catalog_product_requests r
    where r.created_at > clock_timestamp() - interval '24 hours'
      and ((v_uid is not null and r.customer_id = v_uid) or lower(r.email) = v_email)
  ) >= 5 then
    raise exception 'We saved your recent requests. Please try again tomorrow.' using errcode = 'P0001';
  end if;

  insert into public.catalog_product_requests(customer_id,email,requested_item,notes,source_query)
  values (v_uid,v_email,v_item,v_notes,v_source)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.submit_catalog_request(text,text,text,text) from public;
grant execute on function public.submit_catalog_request(text,text,text,text) to anon, authenticated;

commit;
