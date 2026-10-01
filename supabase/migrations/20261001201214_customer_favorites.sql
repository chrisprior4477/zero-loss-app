-- Customer-saved catalog products. This is account state, not an entry or a prize.
begin;

create table public.customer_favorites (
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_slug text not null check (
    length(product_slug) between 1 and 120
    and product_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  created_at timestamptz not null default now(),
  primary key (customer_id, product_slug)
);

create index customer_favorites_recent_idx
  on public.customer_favorites (customer_id, created_at desc);

alter table public.customer_favorites enable row level security;
revoke all on public.customer_favorites from public, anon, authenticated, service_role;
grant select, insert, delete on public.customer_favorites to authenticated;

create policy "Customers can read their own favorites"
  on public.customer_favorites for select to authenticated
  using (customer_id = (select auth.uid()));

create policy "Customers can save their own favorites"
  on public.customer_favorites for insert to authenticated
  with check (customer_id = (select auth.uid()));

create policy "Customers can remove their own favorites"
  on public.customer_favorites for delete to authenticated
  using (customer_id = (select auth.uid()));

commit;
