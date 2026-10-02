-- Outcomes are account-service notifications by default. The authenticated
-- customer can opt out at any time; an explicit false always wins. There were
-- no existing preference rows when this migration was applied to the MVP.
begin;

alter table public.customer_communication_preferences
  alter column entry_outcome_email_enabled set default true;

create or replace function public.get_entry_outcome_email_enabled() returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  return coalesce((select entry_outcome_email_enabled from public.customer_communication_preferences where customer_id = auth.uid()), true);
end;
$$;

create or replace function demo_private.queue_outcome_email(p_outcome_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_outcome public.entry_outcomes; v_entry public.customer_entries;
begin
  select * into v_outcome from public.entry_outcomes where id=p_outcome_id;
  if not found then return; end if;
  select * into v_entry from public.customer_entries where id=v_outcome.customer_entry_id;
  if not found or not exists (select 1 from demo_private.preview_offer_closures where offering_slug=v_entry.offering_slug) then return; end if;
  if not coalesce((select entry_outcome_email_enabled from public.customer_communication_preferences where customer_id=v_outcome.customer_id),true) then return; end if;
  insert into public.entry_outcome_email_deliveries(entry_outcome_id,customer_id,kind)
  values(v_outcome.id,v_outcome.customer_id,case when v_outcome.outcome='winner' then 'winner' else 'paid_not_selected' end)
  on conflict(entry_outcome_id) do nothing;
end;
$$;

create or replace function public.get_outcome_email_payload(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'customerId',d.customer_id,
    'kind',d.kind,
    'entryId',e.entry_id,
    'slug',e.offering_slug,
    'title',f.title,
    'retailer',f.retailer,
    'valueCents',f.value_cents,
    'paidCents',e.amount,
    'completionCents',c.remaining_cents,
    'completionDeadline',c.expires_at,
    'rewardId',r.id,
    'eligible',
      coalesce(p.entry_outcome_email_enabled,true)
      and x.outcome=case when d.kind='winner' then 'winner' else 'not_selected' end
      and (d.kind='winner' and r.id is not null
        or d.kind='paid_not_selected' and c.id is not null and c.expires_at>now()
          and not exists(select 1 from public.completion_option_events ev
            where ev.completion_option_id=c.id and ev.event_type in ('declined','purchased','cancelled','expired')))
  )
  from public.entry_outcome_email_deliveries d
  join public.entry_outcomes x on x.id=d.entry_outcome_id
  join public.customer_entries e on e.id=x.customer_entry_id and e.customer_id=d.customer_id
  join demo_private.preview_entry_offerings f on f.slug=e.offering_slug
  join demo_private.preview_offer_closures closure on closure.offering_slug=e.offering_slug
  left join public.customer_communication_preferences p on p.customer_id=d.customer_id
  left join public.completion_options c on c.customer_entry_id=e.id
  left join public.customer_rewards r on r.customer_entry_id=e.id
  where d.id=p_id and d.status='processing';
$$;

commit;
