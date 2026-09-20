param([ValidateSet('Inspect','DryRun','Apply','Verify')][string]$Mode = 'Inspect')
$ErrorActionPreference = 'Stop'
$readRoot = Split-Path $PSScriptRoot
$readRef = 'ocgdfnvvjvutevgqzzgj'
$readVersion = '20260920120000'
$readPreviousVersion = '20260919190000'
$readToken = $null

Get-Content -LiteralPath (Join-Path $readRoot '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $readToken = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$readToken) { throw 'Management credential is unavailable (value not logged).' }

function Invoke-ReadQuery([string]$Sql) {
  $readBytes = [System.Text.Encoding]::UTF8.GetBytes((@{query=$Sql} | ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$readRef/database/query" `
    -Headers @{Authorization="Bearer $readToken"} -ContentType 'application/json; charset=utf-8' `
    -Body $readBytes -TimeoutSec 120
}

function Get-ReadMigrationSql {
  Get-Content -Raw -LiteralPath (Join-Path $readRoot "supabase/migrations/${readVersion}_customer_notification_reads.sql")
}

try {
  $readProject = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$readRef" `
    -Headers @{Authorization="Bearer $readToken"} -TimeoutSec 30
  if ($readProject.id -ne $readRef -or $readProject.name -ne 'zero-loss-app') { throw 'Project identity mismatch; stop.' }
  if ($Mode -eq 'Inspect') {
    [pscustomobject]@{project=$readProject.name;reference=$readProject.id;status=$readProject.status} | ConvertTo-Json
    Invoke-ReadQuery @"
select (select environment from demo_private.funding_config where singleton) as environment,
  exists(select 1 from supabase_migrations.schema_migrations where version='$readPreviousVersion') as previous_migration_applied,
  exists(select 1 from supabase_migrations.schema_migrations where version='$readVersion') as migration_applied,
  to_regclass('public.customer_notification_reads') is not null as table_exists;
"@ | ConvertTo-Json
  } elseif ($Mode -eq 'DryRun') {
    $readBody = (Get-ReadMigrationSql) -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
    Invoke-ReadQuery @"
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
$readBody
select c.relrowsecurity as rls_enabled,
  has_table_privilege('anon','public.customer_notification_reads','select') as anon_can_read,
  has_table_privilege('authenticated','public.customer_notification_reads','insert') as authenticated_can_insert,
  (select count(*) from pg_policies where schemaname='public' and tablename='customer_notification_reads') as policy_count
from pg_class c where c.oid='public.customer_notification_reads'::regclass;
rollback;
"@ | ConvertTo-Json -Depth 6
  } elseif ($Mode -eq 'Apply') {
    $readSource = Get-ReadMigrationSql
    if ($readSource.Contains('$read_source$')) { throw 'SQL delimiter collision.' }
    $readBody = $readSource -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
    Invoke-ReadQuery @"
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do `$$ begin
  if not exists(select 1 from supabase_migrations.schema_migrations where version='$readPreviousVersion') then raise exception 'Previous checkpoint is missing'; end if;
  if exists(select 1 from supabase_migrations.schema_migrations where version='$readVersion') then raise exception 'Notification-read migration is already applied'; end if;
  if (select environment from demo_private.funding_config where singleton) <> 'development-test' then raise exception 'This checkpoint is only for the preview database'; end if;
end `$$;
$readBody
insert into supabase_migrations.schema_migrations(version,name,statements)
values ('$readVersion','customer_notification_reads',ARRAY[`$read_source`$$readSource`$read_source`$]);
commit;
"@ | ConvertTo-Json -Depth 6
  } else {
    Invoke-ReadQuery @"
select exists(select 1 from supabase_migrations.schema_migrations where version='$readVersion') as migration_applied,
  c.relrowsecurity as rls_enabled,
  has_table_privilege('anon','public.customer_notification_reads','select') as anon_can_read,
  has_table_privilege('authenticated','public.customer_notification_reads','select') as authenticated_can_read,
  has_table_privilege('authenticated','public.customer_notification_reads','insert') as authenticated_can_insert,
  has_table_privilege('authenticated','public.customer_notification_reads','delete') as authenticated_can_delete,
  (select count(*) from pg_policies where schemaname='public' and tablename='customer_notification_reads') as policy_count,
  (select count(*) from public.customer_notification_reads) as stored_read_receipts
from pg_class c where c.oid='public.customer_notification_reads'::regclass;
"@ | ConvertTo-Json -Depth 6
  }
} finally {
  Remove-Variable readToken -ErrorAction SilentlyContinue
}
