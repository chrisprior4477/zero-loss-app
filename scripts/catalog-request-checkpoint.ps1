param([ValidateSet('Inspect','DryRun','Apply','Verify')][string]$Mode = 'Inspect')
$ErrorActionPreference = 'Stop'
$requestRoot = Split-Path $PSScriptRoot
$requestRef = 'ocgdfnvvjvutevgqzzgj'
$requestVersion = '20260918235500'
$requestPreviousVersion = '20260918234500'
$requestToken = $null

Get-Content -LiteralPath (Join-Path $requestRoot '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $requestToken = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$requestToken) { throw 'Management credential is unavailable (value not logged).' }

function Invoke-RequestQuery([string]$Sql) {
  $requestBytes = [System.Text.Encoding]::UTF8.GetBytes((@{query=$Sql} | ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$requestRef/database/query" `
    -Headers @{Authorization="Bearer $requestToken"} -ContentType 'application/json; charset=utf-8' `
    -Body $requestBytes -TimeoutSec 120
}

function Assert-RequestProject {
  $requestProject = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$requestRef" `
    -Headers @{Authorization="Bearer $requestToken"} -TimeoutSec 30
  if ($requestProject.id -ne $requestRef -or $requestProject.name -ne 'zero-loss-app') { throw 'Project identity mismatch; stop.' }
  return $requestProject
}

function Get-RequestMigrationSql {
  Get-Content -Raw -LiteralPath (Join-Path $requestRoot "supabase/migrations/${requestVersion}_catalog_product_requests.sql")
}

try {
  $requestProject = Assert-RequestProject
  if ($Mode -eq 'Inspect') {
    [pscustomobject]@{project=$requestProject.name;reference=$requestProject.id;region=$requestProject.region;status=$requestProject.status} | ConvertTo-Json
    Invoke-RequestQuery @"
select
  exists(select 1 from supabase_migrations.schema_migrations where version='$requestVersion') as migration_applied,
  to_regclass('public.catalog_product_requests') is not null as request_table_exists;
"@ | ConvertTo-Json
  } elseif ($Mode -eq 'DryRun') {
    $requestBody = (Get-RequestMigrationSql) -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
    Invoke-RequestQuery @"
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
$requestBody
set local role anon;
select public.submit_catalog_request('checkpoint@example.com','Checkpoint product',null,'checkpoint');
rollback;
"@ | ConvertTo-Json -Depth 6
  } elseif ($Mode -eq 'Apply') {
    $requestSource = Get-RequestMigrationSql
    if ($requestSource.Contains('$request_source$')) { throw 'SQL delimiter collision.' }
    $requestBody = $requestSource -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
    $requestSql = @"
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do `$$ begin
  if not exists(select 1 from supabase_migrations.schema_migrations where version='$requestPreviousVersion') then raise exception 'Previous checkpoint is missing'; end if;
  if exists(select 1 from supabase_migrations.schema_migrations where version='$requestVersion') then raise exception 'Catalog request migration is already applied'; end if;
end `$$;
$requestBody
insert into supabase_migrations.schema_migrations(version,name,statements)
values ('$requestVersion','catalog_product_requests',ARRAY[`$request_source`$$requestSource`$request_source`$]);
commit;
"@
    Invoke-RequestQuery $requestSql | ConvertTo-Json -Depth 6
  } else {
    Invoke-RequestQuery @"
select
  exists(select 1 from supabase_migrations.schema_migrations where version='$requestVersion') as migration_applied,
  c.relrowsecurity as rls_enabled,
  has_function_privilege('anon','public.submit_catalog_request(text,text,text,text)','execute') as anon_can_submit,
  has_function_privilege('authenticated','public.submit_catalog_request(text,text,text,text)','execute') as authenticated_can_submit,
  has_table_privilege('anon','public.catalog_product_requests','select') as anon_can_read,
  (select count(*) from public.catalog_product_requests) as stored_requests
from pg_class c
where c.oid='public.catalog_product_requests'::regclass;
"@ | ConvertTo-Json -Depth 6
  }
} finally {
  Remove-Variable requestToken -ErrorAction SilentlyContinue
}
