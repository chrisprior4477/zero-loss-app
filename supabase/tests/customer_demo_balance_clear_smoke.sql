-- Rollback-only smoke test for a linked project without pgTAP installed.
begin;
update demo_private.funding_config set enabled=true, preview_provisioning_enabled=true,
  preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1', environment='development-test'
  where singleton;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  ('98999999-9999-4999-8999-999999999961','clear-smoke-one@example.test',now(),'{"legal_first_name":"Demo","legal_last_name":"One","date_of_birth":"1990-01-01"}'::jsonb),
  ('98999999-9999-4999-8999-999999999962','clear-smoke-two@example.test',now(),'{"legal_first_name":"Demo","legal_last_name":"Two","date_of_birth":"1990-01-01"}'::jsonb),
  ('98999999-9999-4999-8999-999999999963','clear-smoke-prod@example.test',now(),'{"legal_first_name":"Demo","legal_last_name":"Prod","date_of_birth":"1990-01-01"}'::jsonb);
update public.customers set status='active', verification_status='email_verified'
  where id in ('98999999-9999-4999-8999-999999999961','98999999-9999-4999-8999-999999999962','98999999-9999-4999-8999-999999999963');
select demo_private.ensure_preview_customer_for('98999999-9999-4999-8999-999999999961');
select demo_private.ensure_preview_customer_for('98999999-9999-4999-8999-999999999962');
insert into public.ledger_entries(ledger_entry_id,customer_id,wallet_account_id,wallet_scope,
  entry_type,balance_type,amount,currency,source_event)
select 'len_'||replace(gen_random_uuid()::text,'-',''),customer_id,id,'demo',
  'CORRECTION','PLAYABLE',1700,'USD','clear_smoke_seed_01'
from public.wallet_accounts where customer_id='98999999-9999-4999-8999-999999999961'
  and scope='demo' and closed_at is null;

set local role authenticated;
select set_config('request.jwt.claim.sub','98999999-9999-4999-8999-999999999961',true);
select set_config('request.jwt.claims','{"sub":"98999999-9999-4999-8999-999999999961","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
do $$ begin
  if public.get_wallet_snapshot()->>'balanceCents' <> '1700' then raise exception 'seed balance failed'; end if;
  begin
    perform public.clear_demo_playable_balance(1600,'clear_smoke_key_01');
    raise exception 'stale balance accepted' using errcode = 'ZX001';
  exception when sqlstate 'P0001' then null;
  end;
  if public.get_wallet_snapshot()->>'balanceCents' <> '1700' then raise exception 'stale clear changed funds'; end if;
  if public.clear_demo_playable_balance(1700,'clear_smoke_key_01')->>'clearedCents' <> '1700' then raise exception 'clear failed'; end if;
  if public.get_wallet_snapshot()->>'balanceCents' <> '0' then raise exception 'balance not zero'; end if;
  if public.get_wallet_snapshot()->>'transactionCount' <> '2' then raise exception 'history changed'; end if;
  if public.clear_demo_playable_balance(1700,'clear_smoke_key_01')->>'alreadyApplied' <> 'true' then raise exception 'replay not idempotent'; end if;
  if public.get_wallet_snapshot()->>'transactionCount' <> '2' then raise exception 'replay posted a debit'; end if;
  if public.clear_demo_playable_balance(0,'clear_smoke_key_02')->>'clearedCents' <> '0' then raise exception 'zero no-op failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','98999999-9999-4999-8999-999999999962',true);
select set_config('request.jwt.claims','{"sub":"98999999-9999-4999-8999-999999999962","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
do $$ begin
  if public.get_wallet_snapshot()->>'balanceCents' <> '0' then raise exception 'other wallet changed'; end if;
  begin
    perform public.clear_demo_playable_balance(1700,'clear_smoke_key_01');
    raise exception 'cross-account amount accepted' using errcode = 'ZX001';
  exception when sqlstate 'P0001' then null;
  end;
end $$;
select set_config('request.jwt.claims','{"sub":"98999999-9999-4999-8999-999999999962","iss":"https://wrong.supabase.co/auth/v1"}',true);
do $$ begin
  begin
    perform public.clear_demo_playable_balance(0,'clear_smoke_key_03');
    raise exception 'wrong issuer accepted' using errcode = 'ZX001';
  exception when sqlstate '42501' then null;
  end;
end $$;
select set_config('request.jwt.claim.sub','98999999-9999-4999-8999-999999999963',true);
select set_config('request.jwt.claims','{"sub":"98999999-9999-4999-8999-999999999963","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
do $$ begin
  begin
    perform public.clear_demo_playable_balance(0,'clear_smoke_key_04');
    raise exception 'production wallet accepted' using errcode = 'ZX001';
  exception when sqlstate '42501' then null;
  end;
end $$;
set local role anon;
do $$ begin
  begin
    perform public.clear_demo_playable_balance(0,'clear_smoke_key_05');
    raise exception 'anonymous request accepted' using errcode = 'ZX001';
  exception when sqlstate '42501' then null;
  end;
end $$;
reset role;
do $$ begin
  if exists(select 1 from public.customer_entries where customer_id='98999999-9999-4999-8999-999999999961')
    or exists(select 1 from public.customer_rewards where customer_id='98999999-9999-4999-8999-999999999961')
  then raise exception 'entry or reward was changed'; end if;
end $$;
rollback;
