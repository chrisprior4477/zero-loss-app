begin;

-- Sample visitors use in-app activity. Keep their synthetic identities out
-- of Crew search and email delivery while retaining the normal wallet.
create function demo_private.prepare_personal_demo_profile()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from demo_private.personal_demos where subject=new.customer_id) then
    new.crew_discoverable := false;
    new.crew_find_real_name := false;
    new.crew_find_email := false;
    new.crew_find_phone := false;
    if tg_op='INSERT' then
      insert into public.customer_communication_preferences(customer_id,
        purchase_option_email_enabled,entry_outcome_email_enabled,favorite_alert_email_enabled,crew_win_email_enabled)
      values (new.customer_id,false,false,false,false) on conflict(customer_id) do nothing;
    end if;
  end if;
  return new;
end $$;
revoke all on function demo_private.prepare_personal_demo_profile() from public,anon,authenticated,service_role;
create trigger personal_demo_profile_defaults before insert or update of crew_discoverable,crew_find_real_name,crew_find_email,crew_find_phone on public.customer_profiles
  for each row execute function demo_private.prepare_personal_demo_profile();

create function demo_private.personal_demo_email_defaults()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from demo_private.personal_demos where subject=new.customer_id) then
    new.purchase_option_email_enabled := false;
    new.entry_outcome_email_enabled := false;
    new.favorite_alert_email_enabled := false;
    new.crew_win_email_enabled := false;
  end if;
  return new;
end $$;
revoke all on function demo_private.personal_demo_email_defaults() from public,anon,authenticated,service_role;
create trigger personal_demo_email_defaults before insert or update on public.customer_communication_preferences
  for each row execute function demo_private.personal_demo_email_defaults();

update public.customer_profiles p set crew_discoverable=false,crew_find_real_name=false,crew_find_email=false,crew_find_phone=false
from demo_private.personal_demos d where p.customer_id=d.subject;
insert into public.customer_communication_preferences(customer_id,purchase_option_email_enabled,entry_outcome_email_enabled,favorite_alert_email_enabled,crew_win_email_enabled)
select p.customer_id,false,false,false,false from public.customer_profiles p join demo_private.personal_demos d on p.customer_id=d.subject
on conflict(customer_id) do update set purchase_option_email_enabled=false,entry_outcome_email_enabled=false,favorite_alert_email_enabled=false,crew_win_email_enabled=false;
commit;
