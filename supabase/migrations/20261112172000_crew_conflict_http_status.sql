begin;

-- A stale editor needs to reload its baseline. Retrying the same write at the
-- database gateway cannot resolve it, so return a PostgREST conflict directly.
create or replace function public.save_crew_group_checked(p_group jsonb, p_remove boolean, p_expected jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform demo_private.save_crew_group_checked(p_group, p_remove, p_expected);
exception when serialization_failure then
  raise exception '%', sqlerrm using errcode = 'PT409';
end;
$$;

create or replace function public.save_crew_visibility_group(p_group jsonb, p_remove boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'Refresh the page before saving a Crew group' using errcode = 'PT409';
end;
$$;

create or replace function public.patch_crew_display_preferences(p_expected jsonb, p_desired jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  if p_expected->'groups' is distinct from p_desired->'groups' then
    raise exception 'Save group changes separately from Privacy settings' using errcode = 'PT409';
  end if;
  return demo_private.patch_crew_display_preferences(p_expected, p_desired);
exception when serialization_failure then
  raise exception '%', sqlerrm using errcode = 'PT409';
end;
$$;

notify pgrst, 'reload schema';
commit;
