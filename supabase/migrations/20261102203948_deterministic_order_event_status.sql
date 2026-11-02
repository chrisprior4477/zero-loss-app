-- Checkout writes payment and fulfillment in one transaction; PostgreSQL's
-- now() gives both events the same timestamp. Random UUIDs are not chronology.
-- Resolve ties by lifecycle stage while retaining later-event precedence and
-- leaving the append-only history and ownership checks untouched.
begin;

create or replace function public.get_account_orders()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_wallet uuid := public.current_wallet_account_id(); v_rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc, x.order_number desc), '[]'::jsonb)
  into v_rows from (
    select o.order_number, e.offering_slug as reward_slug, r.id as reward_id, p.title, p.retailer,
      p.image_path as image, r.face_value_cents, o.total_cents as amount_paid_cents,
      coalesce((select oe.event_type from public.order_events oe
        where oe.order_id = o.id
        order by oe.created_at desc,
          case oe.event_type
            when 'corrected' then 6
            when 'cancelled' then 5
            when 'exception' then 4
            when 'fulfilled' then 3
            when 'issuance_pending' then 2
            when 'payment_confirmed' then 1
            else 0
          end desc, oe.id desc limit 1), 'payment_confirmed') as status,
      o.created_at
    from public.customer_orders o
    join public.customer_rewards r on r.id = o.reward_id
    join public.customer_entries e on e.id = r.customer_entry_id
    join demo_private.preview_entry_offerings p on p.slug = e.offering_slug
    where o.customer_id = auth.uid() and o.wallet_account_id = v_wallet
      and not exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = e.id)
  ) x;
  return v_rows;
end;
$$;

revoke all on function public.get_account_orders() from public, anon, authenticated, service_role;
grant execute on function public.get_account_orders() to authenticated;
notify pgrst, 'reload schema';
commit;
