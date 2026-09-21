-- Identity-owned demo verification. This is NOT a live identity provider.
-- No document, selfie, government identifier, tax number or legal name is accepted.
begin;
alter table demo_private.funding_config add column winner_verification_required boolean not null default false;

create table public.customer_verifications (
  id uuid primary key default gen_random_uuid(),
  verification_id text not null unique default ('ver_'||replace(gen_random_uuid()::text,'-','')),
  customer_id uuid not null references public.customers(id) on delete restrict,
  verification_type text not null default 'identity' check(verification_type='identity'),
  provider text not null default 'demo' check(provider='demo'),
  environment text not null default 'development-test' check(environment='development-test'),
  policy_version text not null default 'winner-identity-demo-v1' check(policy_version='winner-identity-demo-v1'),
  fixture_reference text not null default 'sample-adult-v1' check(fixture_reference='sample-adult-v1'),
  started_at timestamptz not null default clock_timestamp(),
  unique(id,customer_id)
);
create table public.customer_verification_events (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null,
  customer_id uuid not null,
  step text not null check(step in ('consent','details','document_front','document_back','selfie','submitted','demo_passed','requires_input','cancelled')),
  sequence integer not null check(sequence between 1 and 8),
  occurred_at timestamptz not null default clock_timestamp(),
  foreign key(verification_id,customer_id) references public.customer_verifications(id,customer_id) on delete restrict,
  unique(verification_id,step), unique(verification_id,sequence)
);
create unique index verification_one_terminal on public.customer_verification_events(verification_id)
  where step in ('demo_passed','requires_input','cancelled');
create index verification_owner_history on public.customer_verifications(customer_id,started_at desc);
alter table public.customer_verifications enable row level security;
alter table public.customer_verification_events enable row level security;
revoke all on public.customer_verifications,public.customer_verification_events from public,anon,authenticated,service_role;
grant select on public.customer_verifications,public.customer_verification_events to authenticated;
create policy verification_owner on public.customer_verifications for select to authenticated using(customer_id=(select auth.uid()));
create policy verification_events_owner on public.customer_verification_events for select to authenticated using(customer_id=(select auth.uid()));
create trigger verification_immutable before update or delete on public.customer_verifications for each row execute function public.reject_financial_history_mutation();
create trigger verification_no_truncate before truncate on public.customer_verifications for each statement execute function public.reject_financial_history_mutation();
create trigger verification_events_immutable before update or delete on public.customer_verification_events for each row execute function public.reject_financial_history_mutation();
create trigger verification_events_no_truncate before truncate on public.customer_verification_events for each statement execute function public.reject_financial_history_mutation();

create function demo_private.lock_identity_demo_customer() returns void
language plpgsql security definer set search_path='' as $$
begin
  perform demo_private.assert_card_environment();
  if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then
    raise exception 'An active, confirmed account is required.' using errcode='42501';
  end if;
  perform 1 from public.customers where id=auth.uid() and status='active' and verification_status='email_verified' for update;
  if not found then raise exception 'An active, confirmed account is required.' using errcode='42501'; end if;
end $$;
revoke all on function demo_private.lock_identity_demo_customer() from public,anon,authenticated,service_role;

-- Internal Identity interface. Never equate demo_passed with customer.verified.
create function demo_private.has_demo_identity_confirmation(p_customer uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.customer_verifications v join public.customer_verification_events e on e.verification_id=v.id
    where v.customer_id=p_customer and v.provider='demo' and v.environment='development-test'
      and v.policy_version='winner-identity-demo-v1' and e.step='demo_passed');
$$;
revoke all on function demo_private.has_demo_identity_confirmation(uuid) from public,anon,authenticated,service_role;
create function demo_private.verification_response(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',v.id,'reference',v.verification_id,'provider','demo',
    'step',coalesce((select e.step from public.customer_verification_events e where e.verification_id=v.id order by sequence desc limit 1),'start'))
  from public.customer_verifications v where v.id=p_id;
$$;
revoke all on function demo_private.verification_response(uuid) from public,anon,authenticated,service_role;

create function public.begin_demo_identity_verification(p_reward_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  perform demo_private.lock_identity_demo_customer();
  if not exists(select 1 from public.customer_rewards where id=p_reward_id and customer_id=auth.uid()
    and wallet_account_id=public.current_wallet_account_id() and source='winner') then
    raise exception 'This winner verification is unavailable.' using errcode='42501';
  end if;
  -- Resuming the same session survives reloads and interrupted replies.
  select v.id into v_id from public.customer_verifications v where v.customer_id=auth.uid()
    and not exists(select 1 from public.customer_verification_events e where e.verification_id=v.id and e.step in ('requires_input','cancelled'))
    order by v.started_at desc limit 1;
  if v_id is null then
    if (select count(*) from public.customer_verifications where customer_id=auth.uid() and started_at>clock_timestamp()-interval '1 hour')>=5 then
      raise exception 'Five demo verification attempts per hour. Please try again later.' using errcode='P0001';
    end if;
    insert into public.customer_verifications(customer_id) values(auth.uid()) returning id into v_id;
  end if;
  return demo_private.verification_response(v_id);
end $$;
revoke all on function public.begin_demo_identity_verification(uuid) from public,anon,authenticated,service_role;
grant execute on function public.begin_demo_identity_verification(uuid) to authenticated;

create function public.advance_demo_identity_verification(p_verification_id uuid,p_step text,p_fixture text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_previous text; v_sequence integer; v_expected text;
begin
  perform demo_private.lock_identity_demo_customer();
  perform 1 from public.customer_verifications where id=p_verification_id and customer_id=auth.uid() for update;
  if not found then raise exception 'Verification unavailable.' using errcode='42501'; end if;
  if p_fixture is distinct from 'sample-adult-v1' or p_step is null then
    raise exception 'Only the supplied sample identity is accepted in this demo.' using errcode='22023';
  end if;
  select step,sequence into v_previous,v_sequence from public.customer_verification_events where verification_id=p_verification_id order by sequence desc limit 1;
  -- Idempotent retry returns the actual latest state and never goes backwards.
  if exists(select 1 from public.customer_verification_events where verification_id=p_verification_id and step=p_step) then
    return demo_private.verification_response(p_verification_id);
  end if;
  v_expected:=case coalesce(v_previous,'start') when 'start' then 'consent' when 'consent' then 'details'
    when 'details' then 'document_front' when 'document_front' then 'document_back' when 'document_back' then 'selfie'
    when 'selfie' then 'submitted' when 'submitted' then 'demo_passed' end;
  if v_expected is null or (p_step<>v_expected and not (v_previous='submitted' and p_step='requires_input')) then
    raise exception 'Complete the previous verification step first.' using errcode='P0001';
  end if;
  insert into public.customer_verification_events(verification_id,customer_id,step,sequence)
    values(p_verification_id,auth.uid(),p_step,coalesce(v_sequence,0)+1);
  return demo_private.verification_response(p_verification_id);
end $$;
revoke all on function public.advance_demo_identity_verification(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.advance_demo_identity_verification(uuid,text,text) to authenticated;

-- Pools/fulfillment consults Identity before recording a NEW winner claim.
-- Existing claims and purchased gift cards keep their existing behavior.
create function demo_private.require_winner_identity_confirmation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.event_type='claimed' and (select winner_verification_required from demo_private.funding_config where singleton)
    and not exists(select 1 from public.reward_events where reward_id=new.reward_id and event_type='claimed')
    and exists(select 1 from public.customer_rewards where id=new.reward_id and source='winner') then
    perform demo_private.assert_card_environment();
    if not demo_private.has_demo_identity_confirmation(new.customer_id) then
      raise exception 'Complete the demo identity check before claiming this prize.' using errcode='P0001',detail='identity_verification_required';
    end if;
  end if;
  return new;
end $$;
revoke all on function demo_private.require_winner_identity_confirmation() from public,anon,authenticated,service_role;
create trigger winner_claim_identity before insert on public.reward_events for each row execute function demo_private.require_winner_identity_confirmation();
notify pgrst,'reload schema';
commit;
