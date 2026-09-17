-- Preview-customer provisioning.
--
-- Installation is inert by default. An operator must activate it for the
-- verified preview project by setting the exact Auth issuer. Production and
-- copied databases therefore fail closed.
begin;

alter table demo_private.funding_config
  add column preview_provisioning_enabled boolean not null default false,
  add column preview_issuer text;

alter table demo_private.funding_config
  add constraint preview_provisioning_environment_check check (
    not preview_provisioning_enabled
    or (
      environment = 'development-test'
      and preview_issuer ~ '^https://[a-z0-9]+[.]supabase[.]co/auth/v1$'
    )
  );

-- Private foundation writer. The public wrapper below is the only client
-- entry point and supplies auth.uid(); no caller-controlled identity, email,
-- wallet scope or environment flag is accepted.
create function demo_private.ensure_preview_customer_for(p_customer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user auth.users;
  v_customer public.customers;
  v_wallet_id uuid;
  v_metadata jsonb;
  v_first_name text;
  v_last_name text;
  v_date_of_birth date;
  v_terms_accepted_at timestamptz;
  v_run_number bigint;
  v_run_key text;
begin
  if p_customer_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not coalesce((
    select preview_provisioning_enabled and environment = 'development-test'
      and preview_issuer is not null
    from demo_private.funding_config
    where singleton
  ), false) then
    raise exception 'Preview customer provisioning is disabled' using errcode = '42501';
  end if;

  -- Serializes both the missing-row case and retries from simultaneous
  -- requests. Table uniqueness remains the final integrity boundary.
  perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text, 0));

  select * into v_user
  from auth.users
  where id = p_customer_id and email_confirmed_at is not null
  for update;
  if not found then
    raise exception 'A confirmed account is required' using errcode = '42501';
  end if;

  v_metadata := coalesce(v_user.raw_user_meta_data, '{}'::jsonb);
  v_first_name := nullif(trim(coalesce(v_metadata->>'legal_first_name', '')), '');
  v_last_name := nullif(trim(coalesce(v_metadata->>'legal_last_name', '')), '');
  begin
    v_date_of_birth := nullif(v_metadata->>'date_of_birth', '')::date;
  exception when invalid_text_representation or datetime_field_overflow then
    v_date_of_birth := null;
  end;
  begin
    v_terms_accepted_at := coalesce(
      nullif(v_metadata->>'terms_accepted_at', '')::timestamptz,
      v_user.created_at,
      clock_timestamp()
    );
  exception when invalid_text_representation or datetime_field_overflow then
    v_terms_accepted_at := coalesce(v_user.created_at, clock_timestamp());
  end;

  select * into v_customer from public.customers where id = p_customer_id for update;
  if not found then
    if v_first_name is null or v_last_name is null or v_date_of_birth is null then
      raise exception 'Required customer profile metadata is unavailable' using errcode = '22023';
    end if;
    insert into public.customers (
      id, customer_id, status, verification_status, security_status,
      terms_accepted_at, record_version
    ) values (
      p_customer_id,
      'cus_' || replace(gen_random_uuid()::text, '-', ''),
      'active', 'email_verified', 'normal', v_terms_accepted_at, 1
    ) returning * into v_customer;
  elsif v_customer.status = 'pending' and v_customer.verification_status = 'email_pending' then
    update public.customers
      set status = 'active', verification_status = 'email_verified'
      where id = p_customer_id
      returning * into v_customer;
  end if;

  if v_customer.status <> 'active' or v_customer.verification_status <> 'email_verified' then
    raise exception 'An active, confirmed customer is required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.customer_profiles where customer_id = p_customer_id) then
    if v_first_name is null or v_last_name is null or v_date_of_birth is null then
      raise exception 'Required customer profile metadata is unavailable' using errcode = '22023';
    end if;
    insert into public.customer_profiles (
      customer_profile_id, customer_id, display_name, legal_first_name,
      legal_last_name, date_of_birth, record_version
    ) values (
      'cpf_' || replace(gen_random_uuid()::text, '-', ''),
      p_customer_id, null, v_first_name, v_last_name, v_date_of_birth, 1
    );
  end if;

  if exists (
    select 1 from public.ledger_entries
    where customer_id = p_customer_id and wallet_scope = 'production'
  ) then
    raise exception 'Production financial history cannot be provisioned as preview' using errcode = '55000';
  end if;

  insert into public.demo_payment_accounts(customer_id, enabled, funding_enabled)
    values (p_customer_id, true, true)
  on conflict (customer_id) do update
    set enabled = true, funding_enabled = true;

  select id into v_wallet_id
  from public.wallet_accounts
  where customer_id = p_customer_id and scope = 'demo' and closed_at is null
  for update;

  if v_wallet_id is null then
    select count(*) + 1 into v_run_number
    from public.wallet_accounts
    where customer_id = p_customer_id and scope = 'demo';
    v_run_key := 'preview_bootstrap_' || replace(p_customer_id::text, '-', '') || '_' || v_run_number::text;
    insert into public.wallet_accounts(customer_id, scope, run_key)
      values (p_customer_id, 'demo', v_run_key)
      returning id into v_wallet_id;
  end if;

  return v_wallet_id;
end;
$$;

revoke all on function demo_private.ensure_preview_customer_for(uuid)
  from public, anon, authenticated, service_role;

create function public.ensure_preview_customer()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_issuer text := auth.jwt()->>'iss';
  v_expected_issuer text;
  v_enabled boolean;
  v_wallet_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select preview_provisioning_enabled, preview_issuer
    into v_enabled, v_expected_issuer
  from demo_private.funding_config
  where singleton;

  if not coalesce(v_enabled, false)
    or v_expected_issuer is null
    or v_issuer is distinct from v_expected_issuer then
    raise exception 'Preview customer provisioning is not permitted in this environment' using errcode = '42501';
  end if;

  v_wallet_id := demo_private.ensure_preview_customer_for(v_uid);
  return jsonb_build_object(
    'walletAccountId', v_wallet_id,
    'scope', 'demo',
    'fundingAvailable', public.is_demo_payment_enabled()
  );
end;
$$;

revoke all on function public.ensure_preview_customer()
  from public, anon, authenticated, service_role;
grant execute on function public.ensure_preview_customer() to authenticated;

notify pgrst, 'reload schema';
commit;
