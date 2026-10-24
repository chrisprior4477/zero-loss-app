begin;
alter table public.customer_profiles add column notification_banner_display_seconds smallint not null default 6 check(notification_banner_display_seconds between 1 and 10);
-- Keep the three-argument function available for already-open browser tabs.
create function demo_private.save_notification_banner_preferences(p_style text,p_enabled boolean,p_speed integer,p_display_seconds integer)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_display_seconds is null or p_display_seconds not between 1 and 10 then raise exception 'Choose a display time from 1 to 10 seconds' using errcode='22023'; end if;
  perform demo_private.save_notification_banner_preferences(p_style,p_enabled,p_speed);
  update public.customer_profiles set notification_banner_display_seconds=p_display_seconds where customer_id=auth.uid();
end; $$;
revoke all on function demo_private.save_notification_banner_preferences(text,boolean,integer,integer) from public,anon,authenticated,service_role;
grant execute on function demo_private.save_notification_banner_preferences(text,boolean,integer,integer) to authenticated;
create function public.save_notification_banner_preferences(p_style text,p_enabled boolean,p_speed integer,p_display_seconds integer)
returns void language sql security invoker set search_path='' as $$ select demo_private.save_notification_banner_preferences(p_style,p_enabled,p_speed,p_display_seconds); $$;
revoke all on function public.save_notification_banner_preferences(text,boolean,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.save_notification_banner_preferences(text,boolean,integer,integer) to authenticated;
notify pgrst,'reload schema';
commit;
