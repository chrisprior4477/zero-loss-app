begin;

create schema business_private;
revoke all on schema business_private from public, anon, authenticated;
grant usage on schema business_private to authenticated;

-- An application is private intake for review. It is never a published offer or a billing instruction.
create table public.business_applications (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  document jsonb not null,
  revision integer not null default 1 check (revision > 0),
  status text not null default 'draft' check (status in ('draft','submitted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  check ((status = 'submitted') = (submitted_at is not null))
);
alter table public.business_applications enable row level security;
revoke all on public.business_applications from public, anon, authenticated;
grant select on public.business_applications to authenticated;
create policy "Read own business application" on public.business_applications
  for select to authenticated using (owner_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-materials','business-materials',false,52428800,
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','text/csv','video/mp4','video/quicktime',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
create policy "Read own business materials" on storage.objects for select to authenticated
  using (bucket_id = 'business-materials' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Upload private business materials" on storage.objects for insert to authenticated
  with check (bucket_id = 'business-materials' and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}$'
    and not exists (select 1 from public.business_applications where owner_id = (select auth.uid()) and status = 'submitted'));

create function business_private.save_business_application(p_document jsonb, p_revision integer, p_submit boolean)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  v jsonb := p_document->'values';
  files jsonb := p_document->'files';
  listings jsonb := p_document->'listings';
  required text[];
  existing public.business_applications%rowtype;
  new_status text := case when p_submit then 'submitted' else 'draft' end;
begin
  if actor is null or not exists (select 1 from auth.users where id = actor and email_confirmed_at is not null) then
    raise exception 'A verified account is required' using errcode='42501';
  end if;
  if p_revision is null or p_revision < 0 or p_submit is null
    or jsonb_typeof(p_document) is distinct from 'object' or octet_length(p_document::text) > 1048576
    or p_document->'version' is distinct from '1'::jsonb or not coalesce(p_document->'step' in ('0','1','2','3','4'),false)
    or jsonb_typeof(v) is distinct from 'object' or jsonb_typeof(files) is distinct from 'array'
    or jsonb_typeof(listings) is distinct from 'array'
    or not coalesce(v->>'partnership' in ('products','campaign','fulfillment','other'),false)
    or exists (select 1 from jsonb_each(v) x where jsonb_typeof(x.value) <>
      case when x.key in ('auto_relist','card_billing','asset_rights','submit_authority','capacity_ack','creator_notice','proof_generated')
        then 'boolean' else 'string' end)
  then raise exception 'Invalid application document' using errcode='22023'; end if;

  if exists (select 1 from jsonb_array_elements(listings) as r(item) where
    jsonb_typeof(item) is distinct from 'object'
    or exists (select 1 from unnest(array['title','brand','category','summary','fulfillment','availability']) k where jsonb_typeof(item->k) is distinct from 'string')
    or exists (select 1 from unnest(array['value','entryPrice','capacity']) k where jsonb_typeof(item->k) is distinct from 'number')
    or exists (select 1 from unnest(array['highlights','included','specifications']) k where jsonb_typeof(item->k) is distinct from 'array')
    or exists (select 1 from jsonb_array_elements((item->'highlights') || (item->'included')) x where jsonb_typeof(x) <> 'string')
    or exists (select 1 from jsonb_array_elements(item->'specifications') x where jsonb_typeof(x) <> 'array' or jsonb_array_length(x) <> 2
      or jsonb_typeof(x->0) <> 'string' or jsonb_typeof(x->1) <> 'string'))
  then raise exception 'Invalid product listing' using errcode='22023'; end if;

  if exists (select 1 from jsonb_array_elements(files) as r(f) where
    not coalesce((f->>'id') ~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$',false)
    or jsonb_typeof(f->'name') is distinct from 'string' or char_length(f->>'name') not between 1 and 255
    or not (f ? 'listingIndex') or (f->'listingIndex' <> 'null'::jsonb and
      (jsonb_typeof(f->'listingIndex') <> 'number' or (f->>'listingIndex') !~ '^[0-9]+$' or (f->>'listingIndex')::numeric >= jsonb_array_length(listings)))
    or not exists (select 1 from storage.objects o where o.bucket_id='business-materials' and o.name=actor::text || '/' || (f->>'id')))
    or (select count(distinct f->>'id') from jsonb_array_elements(files) f) <> jsonb_array_length(files)
  then raise exception 'An attachment is missing or invalid' using errcode='22023'; end if;

  if p_submit then
    required := array['business_name','address_line_1','city','region','postal_code','country','contact_name','work_email','business_type','service_area'] ||
      case v->>'partnership'
        when 'products' then array['offer_name','offer_type','description','retail_value','quantity','relationship','fulfillment_owner']
        when 'fulfillment' then array['provider_name','reward_types','coverage','delivery_method','delivery_time','pricing_terms','technical_contact']
        when 'campaign' then array['campaign_name','campaign_offer','objective','relationship','campaign_supply','audience']
        else array['other_partnership'] end;
    if exists (select 1 from unnest(required) k where jsonb_typeof(v->k) is distinct from 'string' or btrim(v->>k) = '')
      or not coalesce((v->>'work_email') ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$',false)
      or v->'capacity_ack' is distinct from 'true'::jsonb or v->'submit_authority' is distinct from 'true'::jsonb
      or (jsonb_array_length(files)>0 and v->'asset_rights' is distinct from 'true'::jsonb)
      or (v->'auto_relist'='true'::jsonb and v->'card_billing' is distinct from 'true'::jsonb)
    then raise exception 'Complete the required fields and authorizations' using errcode='22023'; end if;
  end if;

  -- Serialize first saves as well as edits, across tabs and devices.
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 1971));
  select * into existing from public.business_applications where owner_id=actor for update;
  if found and existing.document=p_document and existing.status=new_status then return existing.revision; end if;
  if existing.status='submitted' or coalesce(existing.revision,0) <> p_revision then
    raise exception 'Application changed in another session' using errcode='PT409';
  end if;
  insert into public.business_applications(owner_id,document,revision,status,submitted_at)
    values(actor,p_document,p_revision+1,new_status,case when p_submit then now() end)
    on conflict(owner_id) do update set document=excluded.document,revision=excluded.revision,
      status=excluded.status,submitted_at=excluded.submitted_at,updated_at=now();
  return p_revision+1;
end $$;
create function public.save_business_application(p_document jsonb, p_revision integer, p_submit boolean)
returns integer language sql security invoker set search_path='' as $$
  select business_private.save_business_application(p_document,p_revision,p_submit);
$$;
revoke all on function business_private.save_business_application(jsonb,integer,boolean), public.save_business_application(jsonb,integer,boolean) from public,anon,authenticated;
grant execute on function business_private.save_business_application(jsonb,integer,boolean), public.save_business_application(jsonb,integer,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
