begin;
alter table public.customer_profiles add column notification_banner_speed smallint not null default 5 check(notification_banner_speed between 1 and 10);
create function demo_private.save_notification_banner_preferences(p_style text,p_enabled boolean,p_speed integer)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_speed is null or p_speed not between 1 and 10 or p_enabled is null then raise exception 'Choose a speed from 1 to 10' using errcode='22023'; end if;
  perform demo_private.set_notification_banner_style(p_style,p_enabled);
  update public.customer_profiles set notification_banner_speed=p_speed where customer_id=auth.uid();
end; $$;
revoke all on function demo_private.save_notification_banner_preferences(text,boolean,integer) from public,anon,authenticated,service_role;
grant execute on function demo_private.save_notification_banner_preferences(text,boolean,integer) to authenticated;
create function public.save_notification_banner_preferences(p_style text,p_enabled boolean,p_speed integer)
returns void language sql security invoker set search_path='' as $$ select demo_private.save_notification_banner_preferences(p_style,p_enabled,p_speed); $$;
revoke all on function public.save_notification_banner_preferences(text,boolean,integer) from public,anon,authenticated,service_role;
grant execute on function public.save_notification_banner_preferences(text,boolean,integer) to authenticated;
notify pgrst,'reload schema';
commit;
