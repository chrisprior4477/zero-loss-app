create or replace function public.set_in_app_alert_preference(p_key text, p_enabled boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_key is null or p_key not in ('purchase_options', 'reward_ready', 'reward_deadline',
    'order_updates', 'wallet_updates', 'crew_updates', 'support_replies', 'pool_progress',
    'direct_wins', 'direct_options', 'direct_entries', 'direct_support')
    or p_enabled is null then
    raise exception 'Invalid notification preference' using errcode = '22023';
  end if;
  insert into public.customer_communication_preferences(customer_id, in_app_alerts, updated_at)
    values (v_uid, jsonb_build_object(p_key, p_enabled), now())
  on conflict(customer_id) do update
    set in_app_alerts = public.customer_communication_preferences.in_app_alerts
      || jsonb_build_object(p_key, p_enabled), updated_at = now()
  returning in_app_alerts into v_result;
  return v_result;
end;
$$;
