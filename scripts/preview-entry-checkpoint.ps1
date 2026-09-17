param([ValidateSet('Inspect','DryRun','Apply','Test','Verify')][string]$Mode = 'Inspect')
$ErrorActionPreference = 'Stop'
$entryRoot = Split-Path $PSScriptRoot
$entryRef = 'ocgdfnvvjvutevgqzzgj'
$entryIssuer = "https://$entryRef.supabase.co/auth/v1"
$entryVersion = '20260917170000'
$entryToken = $null

Get-Content -LiteralPath (Join-Path $entryRoot '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $entryToken = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$entryToken) { throw 'Management credential is unavailable (value not logged).' }

function Invoke-EntryQuery([string]$Sql) {
  $entryBytes = [System.Text.Encoding]::UTF8.GetBytes((@{query=$Sql} | ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$entryRef/database/query" `
    -Headers @{Authorization="Bearer $entryToken"} -ContentType 'application/json; charset=utf-8' `
    -Body $entryBytes -TimeoutSec 120
}

function Assert-EntryProject {
  $entryProject = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$entryRef" `
    -Headers @{Authorization="Bearer $entryToken"} -TimeoutSec 30
  if ($entryProject.id -ne $entryRef -or $entryProject.name -ne 'zero-loss-app') { throw 'Project identity mismatch; stop.' }
  return $entryProject
}

function Get-EntryCatalogJson {
  $entryJson = & node (Join-Path $entryRoot 'scripts/export-demo-offerings.cjs')
  if ($LASTEXITCODE -ne 0 -or !$entryJson) { throw 'Could not export the preview catalog.' }
  $entryRecords = $entryJson | ConvertFrom-Json
  if ($entryRecords.Count -lt 10) { throw 'Preview catalog export is unexpectedly incomplete.' }
  if ($entryJson.Contains('$entry_catalog$')) { throw 'Catalog delimiter collision.' }
  return $entryJson
}

function Get-EntrySeedSql {
  $entryCatalog = Get-EntryCatalogJson
  return @"
with incoming as (
  select * from jsonb_to_recordset(`$entry_catalog`$$entryCatalog`$entry_catalog`$::jsonb) as x(
    slug text,title text,retailer text,category text,image_path text,
    value_cents integer,entry_price_cents integer,capacity integer,forced_outcome text
  )
)
insert into demo_private.preview_entry_offerings(
  slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,forced_outcome,active,updated_at
)
select slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,forced_outcome,true,clock_timestamp()
from incoming
on conflict (slug) do update set
  title=excluded.title,retailer=excluded.retailer,category=excluded.category,image_path=excluded.image_path,
  value_cents=excluded.value_cents,entry_price_cents=excluded.entry_price_cents,capacity=excluded.capacity,
  forced_outcome=excluded.forced_outcome,active=true,updated_at=clock_timestamp();
update demo_private.funding_config set preview_entries_enabled=true
where singleton and enabled and preview_provisioning_enabled and environment='development-test'
  and preview_issuer='$entryIssuer';
"@
}

function Get-EntryTest {
  $entryTest = Get-Content -Raw -LiteralPath (Join-Path $entryRoot 'supabase/tests/preview_entry_lifecycle_test.sql')
  $entryHarness = @'
create temporary table checkpoint_tap_results(tap text);
grant all on checkpoint_tap_results to authenticated, anon, service_role;
create function pg_temp.checkpoint_assert_tap() returns trigger language plpgsql as $$ begin
  if new.tap like 'not ok%' or new.tap like '# Looks like%' then raise exception 'Checkpoint assertion failed: %',new.tap; end if;
  return new;
end $$;
create trigger checkpoint_fail_fast before insert on checkpoint_tap_results
for each row execute function pg_temp.checkpoint_assert_tap();
'@
  $entryTest = $entryTest -replace '(?m)^begin;\s*',("begin;`n"+$entryHarness.Replace('$','$$')+"`n")
  $entryTest = $entryTest -replace '(?im)^select (is\(|isnt\(|ok\(|throws_ok\(|lives_ok\(|policies_are\(|is_definer\(|function_privs_are\(|has_[a-z_]+\(|col_[a-z_]+\(|table_[a-z_]+\()', 'insert into checkpoint_tap_results(tap) select $1'
  $entryTest = $entryTest -replace '(?im)^select \* from finish\(\);', 'insert into checkpoint_tap_results(tap) select * from finish();'
  return ($entryTest -replace '(?im)^rollback;', "select count(*) as passed_assertions from checkpoint_tap_results where tap like 'ok%';`nrollback;")
}

try {
  $entryProject = Assert-EntryProject
  if ($Mode -eq 'Inspect') {
    [pscustomobject]@{project=$entryProject.name;reference=$entryProject.id;region=$entryProject.region;status=$entryProject.status;environment='development-test'} | ConvertTo-Json
    Invoke-EntryQuery @"
select exists(select 1 from supabase_migrations.schema_migrations where version='$entryVersion') as migration_applied,
  to_regclass('public.customer_entries') is not null as entry_table_exists,
  coalesce((select preview_entries_enabled from demo_private.funding_config where singleton),false) as entries_enabled;
"@ | ConvertTo-Json
  } elseif ($Mode -eq 'DryRun') {
    $entrySource = Get-Content -Raw -LiteralPath (Join-Path $entryRoot "supabase/migrations/${entryVersion}_preview_entry_lifecycle.sql")
    $entryBody = $entrySource -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
    $entrySql = "begin;`n$entryBody`n" + (Get-EntrySeedSql) + "`n" + ((Get-EntryTest) -replace '(?m)^begin;\s*$','')
    Invoke-EntryQuery $entrySql | ConvertTo-Json -Depth 6
  } elseif ($Mode -eq 'Apply') {
    $entrySource = Get-Content -Raw -LiteralPath (Join-Path $entryRoot "supabase/migrations/${entryVersion}_preview_entry_lifecycle.sql")
    if ($entrySource.Contains('$entry_source$')) { throw 'SQL delimiter collision.' }
    $entryBody = $entrySource -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
    $entrySql = @"
begin;
set local lock_timeout='5s';
set local statement_timeout='90s';
do `$$ begin
  if exists(select 1 from supabase_migrations.schema_migrations where version='$entryVersion') then raise exception 'Entry migration is already applied'; end if;
  if not exists(select 1 from supabase_migrations.schema_migrations where version='20260917150000') then raise exception 'Preview provisioning checkpoint is missing'; end if;
end `$$;
$entryBody
"@
    $entrySql += "`n" + (Get-EntrySeedSql)
    $entrySql += "`ninsert into supabase_migrations.schema_migrations(version,name,statements) values ('$entryVersion','preview_entry_lifecycle',ARRAY[`$entry_source`$$entrySource`$entry_source`$]);`ncommit;"
    Invoke-EntryQuery $entrySql | ConvertTo-Json -Depth 6
  } elseif ($Mode -eq 'Test') {
    Invoke-EntryQuery (Get-EntryTest) | ConvertTo-Json -Depth 6
  } else {
    Invoke-EntryQuery @"
select
  (select count(*) from demo_private.preview_entry_offerings where active) as active_offerings,
  (select count(*) from demo_private.preview_entry_offerings where forced_outcome='winner') as forced_winners,
  (select count(*) from demo_private.preview_entry_offerings where forced_outcome='not_selected') as forced_non_selected,
  (select preview_entries_enabled from demo_private.funding_config where singleton) as entries_enabled,
  (select count(*) from public.customer_entries) as customer_entries,
  (select count(*) from public.ledger_entries where customer_entry_id is not null) as entry_debits,
  (select count(*) from public.entry_outcomes) as outcomes,
  (select count(*) from public.customer_rewards) as rewards,
  (select count(*) from public.completion_options) as completion_options;
"@ | ConvertTo-Json -Depth 6
  }
} finally { Remove-Variable entryToken -ErrorAction SilentlyContinue }
