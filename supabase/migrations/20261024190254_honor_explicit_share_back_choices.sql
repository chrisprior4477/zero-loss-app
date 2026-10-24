begin;
-- A saved sharing choice applies to established connections as well as new ones.
CREATE OR REPLACE FUNCTION public.crew_can_view_shared_entry(p_owner_id uuid, p_entry_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_viewer uuid := auth.uid();
  v_settings public.crew_visibility_settings%rowtype;
  v_rule jsonb;
  v_group jsonb;
begin
  if v_viewer is null or p_owner_id is null or p_entry_id is null then return false; end if;
  if exists (select 1 from public.demo_entry_reset_items reset
    where reset.customer_entry_id = p_entry_id and reset.customer_id = p_owner_id) then return false; end if;
  if v_viewer = p_owner_id then return true; end if;
  if not exists (
    select 1 from public.crew_invitations c where c.status = 'accepted'
      and ((c.requester_id = p_owner_id and c.recipient_id = v_viewer)
        or (c.recipient_id = p_owner_id and c.requester_id = v_viewer))
  ) then return false; end if;
  -- Receiving a link never grants its sender access to the recipient's picks.
  if exists(select 1 from public.crew_receiving_preferences r where r.owner_id=v_viewer and r.recipient_id=p_owner_id)
    and not exists(select 1 from public.crew_receiving_preferences r where r.owner_id=v_viewer and r.recipient_id=p_owner_id and r.share_back) then return false; end if;
  if exists(select 1 from public.crew_receiving_preferences r where r.owner_id=p_owner_id and r.recipient_id=v_viewer and r.scope_key='crew' and not r.receiving) then return false; end if;
  select * into v_settings from public.crew_visibility_settings where owner_id = p_owner_id;
  v_rule := coalesce(v_settings.entry_rules -> p_entry_id::text, v_settings.default_rule,
    '{"audience":"everyone"}'::jsonb);
  if v_rule->>'audience' = 'everyone' then return true; end if;
  if v_rule->>'audience' = 'people' then
    return coalesce(v_rule->'memberIds', '[]'::jsonb) ? v_viewer::text;
  end if;
  if v_rule->>'audience' = 'groups' then
    for v_group in select value from jsonb_array_elements(coalesce(v_settings.groups, '[]'::jsonb)) loop
      if coalesce(v_rule->'groupIds', '[]'::jsonb) ? (v_group->>'id')
        and coalesce(v_group->'memberIds', '[]'::jsonb) ? v_viewer::text
        and not exists(select 1 from public.crew_receiving_preferences r where r.owner_id=p_owner_id and r.recipient_id=v_viewer and r.scope_key=v_group->>'id' and not r.receiving) then
        return true;
      end if;
    end loop;
  end if;
  return false;
end;
$function$
;
notify pgrst,'reload schema';
commit;
