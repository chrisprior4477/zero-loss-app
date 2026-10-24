begin;
-- A signed-in member can restore only their own supplied notification receipts.
-- Keep DELETE off the public table; unrelated receipts and account data remain.
create function demo_private.restore_notification_banner(p_ids text[])
returns void language plpgsql security definer set search_path='' as $$
declare v_customer uuid := auth.uid();
begin
  if v_customer is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_ids is null or cardinality(p_ids)>10000 or exists(select 1 from unnest(p_ids) id where id is null or length(id) not between 1 and 160) then
    raise exception 'Invalid notifications' using errcode='22023';
  end if;
  delete from public.customer_notification_reads where customer_id=v_customer and notification_id=any(p_ids);
  update public.customer_profiles set header_notifications_enabled=true where customer_id=v_customer;
end; $$;
revoke all on function demo_private.restore_notification_banner(text[]) from public,anon,authenticated,service_role;
grant execute on function demo_private.restore_notification_banner(text[]) to authenticated;
create function public.restore_notification_banner(p_ids text[])
returns void language sql security invoker set search_path='' as $$ select demo_private.restore_notification_banner(p_ids); $$;
revoke all on function public.restore_notification_banner(text[]) from public,anon,authenticated,service_role;
grant execute on function public.restore_notification_banner(text[]) to authenticated;
notify pgrst,'reload schema';
commit;
