begin;

create function demo_private.demo_entry_reset_revision(p_wallet uuid)
returns text language sql stable set search_path = '' as $$
  select encode(sha256(convert_to(coalesce(string_agg(e.id::text, ',' order by e.id), ''), 'UTF8')), 'hex')
  from public.customer_entries e
  where e.customer_id = auth.uid() and e.wallet_account_id = p_wallet
    and not exists (select 1 from public.demo_entry_reset_items r where r.customer_entry_id = e.id)
$$;

create or replace function public.get_demo_entry_reset_preview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_wallet uuid; v_count integer; v_pending boolean;
begin
  perform demo_private.assert_card_environment();
  if not coalesce((select preview_entries_enabled from demo_private.funding_config where singleton), false) then
    raise exception 'Demo entry reset is unavailable' using errcode = '42501';
  end if;
  v_wallet := public.current_wallet_account_id();
  if v_wallet is null then raise exception 'Demo wallet is unavailable' using errcode = '42501'; end if;
  select count(*) into v_count from public.customer_entries e
    where e.customer_id = auth.uid() and e.wallet_account_id = v_wallet
      and not exists (select 1 from public.demo_entry_reset_items r where r.customer_entry_id = e.id);
  select exists (select 1 from public.entry_requests r
    where r.customer_id = auth.uid() and r.wallet_account_id = v_wallet and r.status = 'validating') into v_pending;
  return jsonb_build_object('entryCount', v_count, 'pending', v_pending,
    'revision', demo_private.demo_entry_reset_revision(v_wallet));
end;
$$;

-- The existing financial writers remain available inside the atomic full-account reset.
create function public.clear_own_demo_entries(p_expected_count integer, p_request_key text, p_expected_revision text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_wallet uuid;
begin
  if p_expected_revision is null or p_expected_revision !~ '^[0-9a-f]{64}$' then
    raise exception 'Review your current entries before clearing.' using errcode = '22023';
  end if;
  perform demo_private.assert_card_environment();
  v_wallet := demo_private.lock_funding_wallet();
  if not exists (select 1 from public.demo_entry_reset_events
    where customer_id = auth.uid() and wallet_account_id = v_wallet and request_key = p_request_key)
    and demo_private.demo_entry_reset_revision(v_wallet) is distinct from p_expected_revision then
    raise exception 'Your entries changed. Review them again before clearing.' using errcode = '40001';
  end if;
  return public.clear_own_demo_entries(p_expected_count, p_request_key);
end;
$$;

create function public.get_demo_transaction_clear_preview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_wallet uuid;
begin
  perform demo_private.assert_card_environment();
  v_wallet := public.current_wallet_account_id();
  if v_wallet is null then raise exception 'Demo wallet is unavailable' using errcode = '42501'; end if;
  return (select jsonb_build_object(
    'balanceCents', coalesce(sum(l.amount) filter (where l.balance_type = 'PLAYABLE'), 0)::text,
    'revision', encode(sha256(convert_to(coalesce(string_agg(l.id::text, ',' order by l.id)
      filter (where a.ledger_entry_id is null), ''), 'UTF8')), 'hex'))
    from public.ledger_entries l
    left join demo_private.wallet_history_archives a on a.ledger_entry_id = l.id
    where l.customer_id = auth.uid() and l.wallet_account_id = v_wallet);
end;
$$;

create function public.clear_reviewed_demo_transactions(p_expected_balance_cents bigint, p_request_key text, p_expected_revision text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_wallet uuid;
begin
  if p_expected_revision is null or p_expected_revision !~ '^[0-9a-f]{64}$' then
    raise exception 'Review your current transactions before clearing.' using errcode = '22023';
  end if;
  perform demo_private.assert_card_environment();
  v_wallet := demo_private.lock_funding_wallet();
  if not exists (select 1 from demo_private.wallet_history_reset_requests
    where customer_id = auth.uid() and wallet_account_id = v_wallet and kind = 'transactions' and request_key = p_request_key)
    and public.get_demo_transaction_clear_preview()->>'revision' is distinct from p_expected_revision then
    raise exception 'Your transactions changed. Review them again before clearing.' using errcode = '40001';
  end if;
  return public.clear_demo_wallet_history('transactions', p_expected_balance_cents, p_request_key);
end;
$$;

create function public.clear_reviewed_demo_deposits(p_expected_balance_cents bigint, p_request_key text)
returns jsonb language sql security definer set search_path = '' as $$
  select public.clear_demo_wallet_history('deposits', p_expected_balance_cents, p_request_key);
$$;

revoke execute on function public.clear_own_demo_entries(integer,text), public.clear_demo_wallet_history(text,bigint,text) from authenticated;
revoke all on function demo_private.demo_entry_reset_revision(uuid) from public, anon, authenticated, service_role;
revoke all on function public.clear_own_demo_entries(integer,text,text),
  public.get_demo_transaction_clear_preview(), public.clear_reviewed_demo_transactions(bigint,text,text),
  public.clear_reviewed_demo_deposits(bigint,text) from public, anon, authenticated, service_role;
grant execute on function public.clear_own_demo_entries(integer,text,text),
  public.get_demo_transaction_clear_preview(), public.clear_reviewed_demo_transactions(bigint,text,text),
  public.clear_reviewed_demo_deposits(bigint,text) to authenticated;

create or replace function demo_private.ensure_preview_customer_for(p_customer_id uuid)
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

  -- Returning customers already have everything the bootstrap would repair.
  select w.id into v_wallet_id
  from public.wallet_accounts w
  join auth.users u on u.id = w.customer_id and u.email_confirmed_at is not null
  join public.customers c on c.id = w.customer_id and c.status = 'active' and c.verification_status = 'email_verified'
  join public.customer_profiles p on p.customer_id = w.customer_id
  join public.demo_payment_accounts a on a.customer_id = w.customer_id and a.enabled and a.funding_enabled
  where w.customer_id = p_customer_id and w.scope = 'demo' and w.closed_at is null
    and not exists (select 1 from public.ledger_entries l where l.customer_id = p_customer_id and l.wallet_scope = 'production');
  if v_wallet_id is not null then return v_wallet_id; end if;

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
    set enabled = true, funding_enabled = true
    where not public.demo_payment_accounts.enabled or not public.demo_payment_accounts.funding_enabled;

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

notify pgrst, 'reload schema';
commit;
