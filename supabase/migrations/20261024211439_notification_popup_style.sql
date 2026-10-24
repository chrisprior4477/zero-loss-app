begin;
alter table public.customer_profiles add column notification_popup_style text not null default 'rounded' check(notification_popup_style in ('rounded','ticket'));
-- Older open tabs keep their existing save overload and cannot overwrite this choice.
create function demo_private.save_notification_banner_preferences(p_style text,p_enabled boolean,p_speed integer,p_display_seconds integer,p_popup_style text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_popup_style is null or p_popup_style not in ('rounded','ticket') then raise exception 'Choose rounded edges or ticket' using errcode='22023'; end if;
  perform demo_private.save_notification_banner_preferences(p_style,p_enabled,p_speed,p_display_seconds);
  update public.customer_profiles set notification_popup_style=p_popup_style where customer_id=auth.uid();
end; $$;
revoke all on function demo_private.save_notification_banner_preferences(text,boolean,integer,integer,text) from public,anon,authenticated,service_role;
grant execute on function demo_private.save_notification_banner_preferences(text,boolean,integer,integer,text) to authenticated;
create function public.save_notification_banner_preferences(p_style text,p_enabled boolean,p_speed integer,p_display_seconds integer,p_popup_style text)
returns void language sql security invoker set search_path='' as $$ select demo_private.save_notification_banner_preferences(p_style,p_enabled,p_speed,p_display_seconds,p_popup_style); $$;
revoke all on function public.save_notification_banner_preferences(text,boolean,integer,integer,text) from public,anon,authenticated,service_role;
grant execute on function public.save_notification_banner_preferences(text,boolean,integer,integer,text) to authenticated;
notify pgrst,'reload schema';
commit;
