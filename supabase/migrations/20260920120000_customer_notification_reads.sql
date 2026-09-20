-- Read receipts belong to the signed-in customer; notification content remains derived from account records.
begin;

create table public.customer_notification_reads (
  customer_id uuid not null references public.customers(id) on delete cascade,
  notification_id text not null check (length(notification_id) between 1 and 160),
  read_at timestamptz not null default now(),
  primary key (customer_id, notification_id)
);

alter table public.customer_notification_reads enable row level security;
revoke all on public.customer_notification_reads from public, anon, authenticated, service_role;
grant select, insert on public.customer_notification_reads to authenticated;

create policy "Customers can see their notification reads"
  on public.customer_notification_reads for select to authenticated
  using (customer_id = (select auth.uid()));

create policy "Customers can mark their own notifications read"
  on public.customer_notification_reads for insert to authenticated
  with check (customer_id = (select auth.uid()));

commit;
