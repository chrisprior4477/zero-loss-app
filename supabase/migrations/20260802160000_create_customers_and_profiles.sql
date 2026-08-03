-- Identity foundation: Customer + Customer Profile
-- Aligned with enterprise-data-dictionary.md and identity-and-profile.md
-- customers.id = auth.users.id (UUID) for RLS via auth.uid()
-- Canonical identifiers customer_id (cus_...) and customer_profile_id (cpf_...) stored separately

create extension if not exists pgcrypto;

create table public.customers (
  id uuid primary key references auth.users (id) on delete cascade,
  customer_id text not null unique,
  status text not null,
  verification_status text not null,
  security_status text not null,
  preferred_locale text,
  terms_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  anonymized_at timestamptz,
  record_version integer not null default 1,
  constraint customers_status_check
    check (status in ('pending', 'active', 'restricted', 'suspended', 'closed')),
  constraint customers_verification_status_check
    check (verification_status in ('email_pending', 'email_verified')),
  constraint customers_security_status_check
    check (security_status in ('normal')),
  constraint customers_customer_id_format_check
    check (customer_id ~ '^cus_[0-9a-f]+$'),
  constraint customers_record_version_check
    check (record_version >= 1)
);

create table public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id text not null unique,
  customer_id uuid not null unique references public.customers (id) on delete cascade,
  display_name text,
  legal_first_name text not null,
  legal_last_name text not null,
  date_of_birth date not null,
  preferred_locale text,
  timezone text,
  avatar_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  record_version integer not null default 1,
  constraint customer_profiles_profile_id_format_check
    check (customer_profile_id ~ '^cpf_[0-9a-f]+$'),
  constraint customer_profiles_record_version_check
    check (record_version >= 1),
  constraint customer_profiles_legal_first_name_not_blank
    check (length(trim(legal_first_name)) > 0),
  constraint customer_profiles_legal_last_name_not_blank
    check (length(trim(legal_last_name)) > 0)
);

create index customer_profiles_customer_id_idx
  on public.customer_profiles (customer_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customers_set_updated_at
  before update on public.customers
  for each row
  execute function public.set_updated_at();

create trigger customer_profiles_set_updated_at
  before update on public.customer_profiles
  for each row
  execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_customer_id text;
  new_profile_id text;
  first_name text;
  last_name text;
  dob date;
  terms_at timestamptz;
begin
  first_name := nullif(trim(coalesce(new.raw_user_meta_data->>'legal_first_name', '')), '');
  last_name := nullif(trim(coalesce(new.raw_user_meta_data->>'legal_last_name', '')), '');
  dob := nullif(new.raw_user_meta_data->>'date_of_birth', '')::date;
  terms_at := coalesce(
    nullif(new.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz,
    now()
  );

  if first_name is null or last_name is null or dob is null then
    raise exception 'Missing required profile metadata for new user';
  end if;

  new_customer_id := 'cus_' || replace(gen_random_uuid()::text, '-', '');
  new_profile_id := 'cpf_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.customers (
    id,
    customer_id,
    status,
    verification_status,
    security_status,
    terms_accepted_at,
    record_version
  )
  values (
    new.id,
    new_customer_id,
    'pending',
    'email_pending',
    'normal',
    terms_at,
    1
  );

  insert into public.customer_profiles (
    customer_profile_id,
    customer_id,
    legal_first_name,
    legal_last_name,
    date_of_birth,
    record_version
  )
  values (
    new_profile_id,
    new.id,
    first_name,
    last_name,
    dob,
    1
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create or replace function public.handle_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.customers
    set
      status = 'active',
      verification_status = 'email_verified',
      updated_at = now()
    where id = new.id
      and verification_status = 'email_pending';
  end if;

  return new;
end;
$$;

create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  execute function public.handle_email_confirmed();

alter table public.customers enable row level security;
alter table public.customer_profiles enable row level security;

create policy "Customers can select own record"
  on public.customers
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Customers can update own record"
  on public.customers
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Customer profiles can select own record"
  on public.customer_profiles
  for select
  to authenticated
  using (auth.uid() = customer_id);

create policy "Customer profiles can update own record"
  on public.customer_profiles
  for update
  to authenticated
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);

-- Inserts are performed by security definer triggers only (no direct client inserts).

grant select, update on public.customers to authenticated;
grant select, update on public.customer_profiles to authenticated;
