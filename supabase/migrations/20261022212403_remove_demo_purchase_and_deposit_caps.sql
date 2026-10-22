-- Owner-approved policy: remove artificial demo purchase/deposit quotas.
-- Preserve authorization, exact integer cents, locks, capacity, confirmation,
-- pending-payment reconciliation, and immutable/idempotent ledger posting.
begin;

alter table public.demo_funding_sessions drop constraint demo_funding_sessions_amount_check,
  add constraint demo_funding_sessions_amount_check check (amount >= 100);
alter table demo_private.funding_authorizations drop constraint funding_authorizations_amount_check,
  add constraint funding_authorizations_amount_check check (amount >= 100);
alter table demo_private.funding_authentication_attempts drop constraint funding_authentication_attempts_amount_check,
  add constraint funding_authentication_attempts_amount_check check (amount >= 100);
alter table public.preview_entry_batches drop constraint preview_entry_batches_quantity_check,
  add constraint preview_entry_batches_quantity_check check (quantity >= 1);
alter table public.entry_requests drop constraint entry_requests_requested_quantity_check,
  add constraint entry_requests_requested_quantity_check check (requested_quantity >= 1);
alter table demo_private.entry_request_attempts drop constraint entry_request_attempts_quantity_check,
  add constraint entry_request_attempts_quantity_check check (quantity >= 1);

CREATE OR REPLACE FUNCTION demo_private.create_preview_entries_immediate(p_offering_slug text, p_quantity integer, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_wallet uuid;
  v_offering demo_private.preview_entry_offerings;
  v_existing public.preview_entry_batches;
  v_batch public.preview_entry_batches;
  v_entry public.customer_entries;
  v_balance bigint;
  v_offering_entries bigint;
  v_issuer text := auth.jwt()->>'iss';
  v_index integer;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_offering_slug is null or p_offering_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$'
    or p_quantity is null or p_quantity < 1 then
    raise exception 'Invalid entry request' using errcode = '22023';
  end if;
  if not coalesce((select preview_entries_enabled and preview_issuer = v_issuer
    from demo_private.funding_config where singleton), false) then
    raise exception 'Preview entries are not permitted in this environment' using errcode = '42501';
  end if;

  -- Uses the established customer -> membership -> wallet lock order.
  v_wallet := demo_private.lock_funding_wallet();

  select * into v_existing from public.preview_entry_batches
    where customer_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.wallet_account_id <> v_wallet
      or v_existing.offering_slug <> p_offering_slug
      or v_existing.quantity <> p_quantity then
      raise exception 'Idempotency key belongs to a different entry request' using errcode = '22023';
    end if;
    return demo_private.preview_entry_batch_response(v_existing.id, true);
  end if;

  -- Serialize capacity checks across DIFFERENT customer wallets. A shared lock
  -- lets two buyers both count the same last slot before either entry commits.
  -- Keep the established customer -> membership -> wallet -> offering order.
  select * into v_offering from demo_private.preview_entry_offerings
    where slug = p_offering_slug and active for update;
  if not found then raise exception 'This preview offering is unavailable' using errcode = '22023'; end if;

  select (select count(*) from public.customer_entries e
      where e.offering_slug = p_offering_slug and not exists
        (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = e.id))
      + (select coalesce(sum(requested_quantity), 0) from public.entry_requests
        where offering_slug = p_offering_slug and status = 'validating') into v_offering_entries;
  if not v_offering.repeatable_scenario
    and v_offering.sample_entries::bigint + v_offering_entries + p_quantity > v_offering.capacity then
    raise exception 'There are not enough entries remaining for that quantity.' using errcode = 'P0001';
  end if;

  select coalesce(sum(amount) filter (where balance_type = 'PLAYABLE'), 0)
    into v_balance from public.ledger_entries
    where customer_id = v_uid and wallet_account_id = v_wallet;
  if v_balance < v_offering.entry_price_cents::bigint * p_quantity then
    raise exception 'Add demo funds before entering this quantity.' using errcode = 'P0001';
  end if;

  insert into public.preview_entry_batches(
    batch_id, customer_id, wallet_account_id, offering_slug, quantity, idempotency_key
  ) values (
    'bat_' || replace(gen_random_uuid()::text, '-', ''), v_uid, v_wallet,
    v_offering.slug, p_quantity, p_idempotency_key
  ) returning * into v_batch;

  for v_index in 1..p_quantity loop
    insert into public.customer_entries(
      entry_id, customer_id, wallet_account_id, offering_slug, amount,
      idempotency_key, outcome_status, preview_batch_id
    ) values (
      'ent_' || replace(gen_random_uuid()::text, '-', ''), v_uid, v_wallet,
      v_offering.slug, v_offering.entry_price_cents,
      'batch_' || md5(v_uid::text || ':' || p_idempotency_key || ':' || v_index::text),
      v_offering.forced_outcome, v_batch.id
    ) returning * into v_entry;

    insert into public.ledger_entries(
      ledger_entry_id, customer_id, entry_type, balance_type, amount, currency,
      source_event, related_pool_id, related_entry_id, wallet_account_id,
      wallet_scope, customer_entry_id
    ) values (
      'len_' || replace(gen_random_uuid()::text, '-', ''), v_uid,
      'ENTRY_DEBIT', 'PLAYABLE', -v_offering.entry_price_cents, 'USD',
      'preview_entry_' || v_entry.id::text, 'preview_' || v_offering.slug,
      v_entry.entry_id, v_wallet, 'demo', v_entry.id
    );

    if v_offering.forced_outcome in ('winner','not_selected') then
      insert into public.entry_outcomes(customer_entry_id, customer_id, wallet_account_id, outcome)
        values (v_entry.id, v_uid, v_wallet, v_offering.forced_outcome);
    end if;
    if v_offering.forced_outcome = 'winner' then
      insert into public.customer_rewards(customer_entry_id, customer_id, wallet_account_id)
        values (v_entry.id, v_uid, v_wallet);
    elsif v_offering.forced_outcome = 'not_selected' then
      insert into public.completion_options(
        customer_entry_id, customer_id, wallet_account_id, paid_cents, remaining_cents
      ) values (
        v_entry.id, v_uid, v_wallet, v_offering.entry_price_cents,
        greatest(v_offering.value_cents - v_offering.entry_price_cents, 0)
      );
    end if;
  end loop;

  return demo_private.preview_entry_batch_response(v_batch.id, false);
end;
$function$;

CREATE OR REPLACE FUNCTION demo_private.request_preview_entries_original(p_offering_slug text, p_quantity integer, p_idempotency_key text, p_share_with_crew boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_wallet uuid; r public.entry_requests; b public.preview_entry_batches;
  o demo_private.preview_entry_offerings; v_balance bigint; v_count bigint;
  v_now timestamptz; v_shared integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_quantity is null or p_quantity < 1 or p_share_with_crew is null
    or p_offering_slug is null or p_offering_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid entry request' using errcode = '22023';
  end if;
  if not coalesce((select preview_entries_enabled and environment = 'development-test'
    and preview_issuer = auth.jwt()->>'iss'
    from demo_private.funding_config where singleton), false) then
    raise exception 'Preview entries unavailable' using errcode = '42501';
  end if;
  v_wallet := demo_private.lock_funding_wallet();
  select * into r from public.entry_requests
    where customer_id = auth.uid() and idempotency_key = p_idempotency_key;
  if found then
    if r.wallet_account_id <> v_wallet or r.offering_slug <> p_offering_slug
      or r.requested_quantity <> p_quantity or r.share_with_crew <> p_share_with_crew then
      raise exception 'Idempotency key belongs to a different entry request' using errcode = '22023';
    end if;
    return demo_private.entry_request_response(r.id, true);
  end if;
  select * into b from public.preview_entry_batches
    where customer_id = auth.uid() and idempotency_key = p_idempotency_key;
  if found then
    if b.wallet_account_id <> v_wallet or b.offering_slug <> p_offering_slug
      or b.quantity <> p_quantity then
      raise exception 'Idempotency key belongs to a different entry request' using errcode = '22023';
    end if;
    select count(s.entry_id) into v_shared from public.customer_entries e
      left join public.crew_entry_shares s on s.entry_id = e.id
      where e.preview_batch_id = b.id;
    if (p_share_with_crew and v_shared <> p_quantity)
      or (not p_share_with_crew and v_shared <> 0) then
      raise exception 'This entry was already saved with a different sharing choice. Review it in Your Crew.' using errcode = 'P0001';
    end if;
    return demo_private.preview_entry_batch_response(b.id, true);
  end if;
  select * into r from public.entry_requests where customer_id = auth.uid()
    and offering_slug = p_offering_slug and status = 'validating';
  if found then return demo_private.entry_request_response(r.id, true); end if;
  select * into o from demo_private.preview_entry_offerings
    where slug = p_offering_slug and active for update;
  if not found then raise exception 'This preview offering is unavailable' using errcode = '22023'; end if;
  select (select count(*) from public.customer_entries e
      where e.offering_slug = p_offering_slug
        and not exists (select 1 from public.demo_entry_reset_items reset
          where reset.customer_entry_id = e.id))
    + coalesce(sum(requested_quantity), 0) into v_count
    from public.entry_requests
    where offering_slug = p_offering_slug and status = 'validating';
  if not o.repeatable_scenario and o.sample_entries::bigint + v_count + p_quantity > o.capacity then
    raise exception 'There are not enough entries remaining for that quantity.' using errcode = 'P0001';
  end if;
  select coalesce(sum(amount) filter(where balance_type = 'PLAYABLE'), 0) into v_balance
    from public.ledger_entries where customer_id = auth.uid() and wallet_account_id = v_wallet;
  if v_balance < o.entry_price_cents::bigint * p_quantity then
    raise exception 'Add demo funds before entering this quantity.' using errcode = 'P0001';
  end if;
  v_now := clock_timestamp();
  insert into public.entry_requests(customer_id, wallet_account_id, offering_slug,
    requested_quantity, unit_price_cents, idempotency_key, share_with_crew,
    requested_at, undo_until)
    values(auth.uid(), v_wallet, p_offering_slug, p_quantity, o.entry_price_cents,
      p_idempotency_key, p_share_with_crew, v_now, v_now + interval '30 seconds') returning * into r;
  insert into demo_private.entry_request_terms(request_id, value_cents, forced_outcome)
    values(r.id, o.value_cents, o.forced_outcome);
  perform demo_private.post_entry_request_hold(r.id, false);
  insert into public.entry_request_events(request_id, event_name, actor, reason_code)
    values(r.id, 'entry.requested', 'customer', 'undo_window');
  return demo_private.entry_request_response(r.id, false);
end;
$function$;

CREATE OR REPLACE FUNCTION public.authorize_demo_funding(p_amount integer, p_request_key text, p_make_default boolean, p_policy_version text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_wallet uuid; v_password_at timestamptz; v_session uuid; v_row demo_private.funding_authorizations;
begin
  perform demo_private.assert_card_environment();
  v_wallet:=demo_private.lock_funding_wallet();
  if p_amount is null or p_amount < 100
    or p_request_key is null or p_request_key !~ '^[A-Za-z0-9_-]{16,128}$'
    or p_make_default is null or p_policy_version is distinct from 'funding-confirmation-v1' then
    raise exception 'Invalid funding confirmation' using errcode='22023';
  end if;
  select max(to_timestamp((m->>'timestamp')::double precision)) into v_password_at
    from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) m where m->>'method'='password';
  v_session:=(auth.jwt()->>'session_id')::uuid;
  if v_session is null or v_password_at is null or v_password_at<clock_timestamp()-interval '60 seconds'
    or v_password_at>clock_timestamp()+interval '5 seconds' then
    raise exception 'Confirm this deposit with your password again.' using errcode='P0001';
  end if;
  select * into v_row from demo_private.funding_authorizations where customer_id=auth.uid() and request_key=p_request_key order by created_at desc limit 1 for update;
  if found then
    if v_row.amount<>p_amount or v_row.make_default<>p_make_default or v_row.wallet_account_id<>v_wallet then
      raise exception 'This confirmation belongs to a different deposit.' using errcode='22023';
    end if;
    if v_row.consumed_by is not null or v_row.expires_at>clock_timestamp() then return v_row.id; end if;
    -- Expired evidence is retained. A new password check creates a new record.
  end if;
  insert into demo_private.funding_authorizations(customer_id,wallet_account_id,request_key,amount,payment_method,
    make_default,policy_version,auth_session_id,authenticated_at)
    values(auth.uid(),v_wallet,p_request_key,p_amount,'demo_card_4242',p_make_default,p_policy_version,v_session,v_password_at)
    returning id into v_session;
  return v_session;
end $function$;

CREATE OR REPLACE FUNCTION public.authorize_demo_funding(p_amount integer, p_request_key text, p_payment_method text, p_make_default boolean, p_policy_version text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_wallet uuid; v_password_at timestamptz; v_session uuid; v_row demo_private.funding_authorizations;
begin
  perform demo_private.assert_card_environment();
  v_wallet:=demo_private.lock_funding_wallet();
  if p_amount is null or p_amount < 100 or p_request_key is null
    or p_request_key !~ '^[A-Za-z0-9_-]{16,128}$' or p_payment_method not in
      ('demo_card_4242','demo_card_5556','demo_card_1881','demo_card_0002')
    or p_make_default is null or p_policy_version is distinct from 'funding-confirmation-v1' then
    raise exception 'Invalid funding confirmation' using errcode='22023'; end if;
  select max(to_timestamp((m->>'timestamp')::double precision)) into v_password_at
    from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) m where m->>'method'='password';
  v_session:=(auth.jwt()->>'session_id')::uuid;
  if v_session is null or v_password_at is null or v_password_at<clock_timestamp()-interval '60 seconds'
    or v_password_at>clock_timestamp()+interval '5 seconds' then
    raise exception 'Confirm this deposit with your password again.' using errcode='P0001'; end if;
  select * into v_row from demo_private.funding_authorizations where customer_id=auth.uid()
    and request_key=p_request_key order by created_at desc limit 1 for update;
  if found then
    if v_row.amount<>p_amount or v_row.payment_method<>p_payment_method or v_row.make_default<>p_make_default
      or v_row.wallet_account_id<>v_wallet then
      raise exception 'This confirmation belongs to a different deposit.' using errcode='22023'; end if;
    if v_row.consumed_by is not null or v_row.expires_at>clock_timestamp() then return v_row.id; end if;
  end if;
  insert into demo_private.funding_authorizations(customer_id,wallet_account_id,request_key,amount,payment_method,
    make_default,policy_version,auth_session_id,authenticated_at)
    values(auth.uid(),v_wallet,p_request_key,p_amount,p_payment_method,p_make_default,p_policy_version,v_session,v_password_at)
    returning id into v_session;
  return v_session;
end $function$;

CREATE OR REPLACE FUNCTION public.begin_demo_funding_authentication(p_amount integer, p_request_key text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_wallet uuid; v_id uuid;
begin
  perform demo_private.assert_card_environment();
  v_wallet:=demo_private.lock_funding_wallet();
  if p_amount is null or p_amount < 100
    or p_request_key is null or p_request_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid funding confirmation' using errcode='22023';
  end if;
  if (select count(*) from demo_private.funding_authentication_attempts
    where customer_id=auth.uid() and created_at>clock_timestamp()-interval '15 minutes')>=5 then
    raise exception 'Too many deposit confirmation attempts. Wait 15 minutes before trying again.' using errcode='P0001';
  end if;
  insert into demo_private.funding_authentication_attempts(customer_id,wallet_account_id,request_key,amount)
    values(auth.uid(),v_wallet,p_request_key,p_amount) returning id into v_id;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.confirm_demo_checkbox_funding(p_amount integer, p_request_key text, p_payment_method text, p_make_default boolean, p_policy_version text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_wallet uuid;
  v_row demo_private.funding_authorizations;
  v_id uuid;
begin
  perform demo_private.assert_card_environment();
  v_wallet := demo_private.lock_funding_wallet();
  if p_amount is null or p_amount < 100
    or p_request_key is null or p_request_key !~ '^[A-Za-z0-9_-]{16,128}$'
    or p_payment_method not in ('demo_card_4242','demo_card_5556','demo_card_1881','demo_card_0002')
    or p_make_default is null or p_policy_version is distinct from 'funding-confirmation-v1' then
    raise exception 'Invalid demo deposit confirmation' using errcode = '22023';
  end if;

  select * into v_row from demo_private.funding_authorizations
    where customer_id = auth.uid() and request_key = p_request_key
    order by created_at desc limit 1 for update;
  if found then
    if v_row.amount <> p_amount or v_row.payment_method <> p_payment_method
      or v_row.make_default <> p_make_default or v_row.wallet_account_id <> v_wallet then
      raise exception 'This confirmation belongs to a different deposit.' using errcode = '22023';
    end if;
    if v_row.consumed_by is not null or v_row.expires_at > clock_timestamp() then
      return v_row.id;
    end if;
  end if;

  insert into demo_private.funding_authorizations (
    customer_id, wallet_account_id, request_key, amount, payment_method,
    make_default, policy_version, auth_session_id, authenticated_at, confirmation_method
  ) values (
    auth.uid(), v_wallet, p_request_key, p_amount, p_payment_method,
    p_make_default, p_policy_version, null, clock_timestamp(), 'checkbox'
  ) returning id into v_id;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.create_demo_funding_session(p_amount integer, p_idempotency_key text)
 RETURNS demo_funding_sessions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_wallet uuid := demo_private.lock_funding_wallet(); v_session public.demo_funding_sessions;
begin
  if p_amount is null or p_amount < 100 then
    raise exception 'Funding amount must be at least 100 cents' using errcode = '22023';
  end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid idempotency key' using errcode = '22023';
  end if;
  select * into v_session from public.demo_funding_sessions where customer_id = auth.uid() and idempotency_key = p_idempotency_key;
  if found then
    if v_session.amount <> p_amount or v_session.wallet_account_id <> v_wallet then
      raise exception 'Idempotency key belongs to a different funding request' using errcode = '22023';
    end if;
    return v_session;
  end if;
  -- Uncertain payments still require reconciliation; completed deposits have no quotas.
  if (select count(*) from public.demo_funding_sessions where customer_id = auth.uid() and status in ('created','processing','timed_out')) >= 3 then
    raise exception 'Resolve your pending demo payments before starting another.' using errcode = 'P0001';
  end if;
  insert into public.demo_funding_sessions(customer_id, amount, idempotency_key, wallet_account_id)
    values (auth.uid(), p_amount, p_idempotency_key, v_wallet) returning * into v_session;
  return v_session;
end $function$;

CREATE OR REPLACE FUNCTION public.submit_preview_entries(p_offering_slug text, p_quantity integer, p_idempotency_key text, p_share_with_crew boolean, p_previous_request_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.entry_requests; a demo_private.entry_request_attempts; v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_quantity is null or p_quantity < 1 or p_share_with_crew is null
    or p_offering_slug is null or p_offering_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid entry request' using errcode='22023'; end if;
  if not coalesce((select entry_undo_required and preview_entries_enabled and environment='development-test' and preview_issuer=auth.jwt()->>'iss'
    from demo_private.funding_config where singleton),false) then raise exception 'Preview entries unavailable' using errcode='42501'; end if;
  -- Same lock as the writer and worker; compare and create cannot race.
  perform demo_private.lock_funding_wallet();
  select * into a from demo_private.entry_request_attempts where customer_id=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    if a.offering_slug<>p_offering_slug or a.quantity<>p_quantity or a.share_with_crew<>p_share_with_crew
      or a.previous_request_id is distinct from p_previous_request_id then
      raise exception 'Idempotency key belongs to a different entry request' using errcode='22023'; end if;
    return demo_private.entry_request_response(a.request_id,true);
  end if;
  -- Preserve replay of pre-upgrade requests before consulting the latest record.
  if exists(select 1 from public.entry_requests where customer_id=auth.uid() and idempotency_key=p_idempotency_key)
    or exists(select 1 from public.preview_entry_batches where customer_id=auth.uid() and idempotency_key=p_idempotency_key) then
    return demo_private.request_preview_entries_original(p_offering_slug,p_quantity,p_idempotency_key,p_share_with_crew);
  end if;
  if p_previous_request_id is not null and not exists(select 1 from public.entry_requests
    where id=p_previous_request_id and customer_id=auth.uid() and offering_slug=p_offering_slug) then
    raise exception 'Entry request unavailable' using errcode='42501'; end if;
  select * into r from public.entry_requests where customer_id=auth.uid() and offering_slug=p_offering_slug
    order by requested_at desc,id desc limit 1;
  if found and (r.status='validating' or r.id is distinct from p_previous_request_id) then
    v_result:=demo_private.entry_request_response(r.id,true);
  else
    v_result:=demo_private.request_preview_entries_original(p_offering_slug,p_quantity,p_idempotency_key,p_share_with_crew);
    if p_previous_request_id is not null then
      insert into public.entry_request_receipt_acknowledgments(request_id,customer_id)
        values(p_previous_request_id,auth.uid()) on conflict do nothing;
    end if;
  end if;
  insert into demo_private.entry_request_attempts(customer_id,idempotency_key,offering_slug,quantity,share_with_crew,previous_request_id,request_id)
    values(auth.uid(),p_idempotency_key,p_offering_slug,p_quantity,p_share_with_crew,p_previous_request_id,(v_result->>'requestId')::uuid);
  return v_result;
end $function$;

notify pgrst, 'reload schema';
commit;
