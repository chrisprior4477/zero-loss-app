-- Private address-book labels on the existing owner settings. No profile or
-- verified account channel is changed by an owner's contact edits.
begin;
alter table public.crew_visibility_settings add column member_contacts jsonb not null default '{}'::jsonb
  check (jsonb_typeof(member_contacts) = 'object');

create function demo_private.save_crew_member_contact(p_member_id uuid, p_contact jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_contact jsonb;
begin
  if v_owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_member_id is null or jsonb_typeof(p_contact) is distinct from 'object'
    or jsonb_typeof(p_contact->'name') is distinct from 'string'
    or jsonb_typeof(p_contact->'phone') is distinct from 'string'
    or jsonb_typeof(p_contact->'email') is distinct from 'string'
    or length(btrim(p_contact->>'name')) not between 1 and 80
    or length(p_contact->>'phone') > 32 or length(p_contact->>'email') > 254
    or (p_contact->>'phone' <> '' and ((p_contact->>'phone') !~ '^\+?[0-9 ()-]+$'
      or length(regexp_replace(p_contact->>'phone', '[^0-9]', '', 'g')) not between 10 and 15))
    or (p_contact->>'email' <> '' and (p_contact->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  then raise exception 'Invalid contact details' using errcode = '22023'; end if;
  perform 1 from public.crew_invitations where status='accepted'
    and ((requester_id=v_owner and recipient_id=p_member_id) or (recipient_id=v_owner and requester_id=p_member_id)) for share;
  if not found then raise exception 'Crew member unavailable' using errcode = '42501'; end if;
  v_contact := jsonb_build_object('name',btrim(p_contact->>'name'),'phone',btrim(p_contact->>'phone'),'email',btrim(p_contact->>'email'));
  insert into public.crew_visibility_settings(owner_id,member_contacts) values(v_owner,jsonb_build_object(p_member_id::text,v_contact))
    on conflict(owner_id) do update set member_contacts=jsonb_set(crew_visibility_settings.member_contacts,array[p_member_id::text],v_contact,true),updated_at=now();
end;
$$;
revoke all on function demo_private.save_crew_member_contact(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function demo_private.save_crew_member_contact(uuid,jsonb) to authenticated;
create function public.save_crew_member_contact(p_member_id uuid,p_contact jsonb)
returns void language sql security invoker set search_path = '' as $$
  select demo_private.save_crew_member_contact(p_member_id,p_contact);
$$;
revoke all on function public.save_crew_member_contact(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.save_crew_member_contact(uuid,jsonb) to authenticated;

-- The viewer sees their own label throughout the existing Crew experience.
create or replace function public.get_crew_member_profiles()
returns table(member_id uuid,name text,avatar_reference text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  return query select p.customer_id,
    coalesce(nullif(btrim(s.member_contacts->p.customer_id::text->>'name'),''),nullif(btrim(p.display_name),''),p.legal_first_name || ' ' || left(p.legal_last_name,1) || '.'),
    case when p.show_photo_to_crew then p.avatar_reference else null end
  from public.crew_invitations i
  join public.customer_profiles p on p.customer_id=case when i.requester_id=auth.uid() then i.recipient_id else i.requester_id end
  left join public.crew_visibility_settings s on s.owner_id=auth.uid()
  where i.status='accepted' and (i.requester_id=auth.uid() or i.recipient_id=auth.uid()) order by i.created_at desc;
end;
$$;
notify pgrst,'reload schema';
commit;
