param([ValidateSet('Inspect','DryRun','Apply','Test','Verify')][string]$Mode = 'Inspect')
$ErrorActionPreference = 'Stop'
$lifecycleRoot = Split-Path $PSScriptRoot
$lifecycleRef = 'ocgdfnvvjvutevgqzzgj'
$lifecycleVersion = '20260918193000'
$lifecycleToken = $null
Get-Content -LiteralPath (Join-Path $lifecycleRoot '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $lifecycleToken = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$lifecycleToken) { throw 'Management credential unavailable (value not logged).' }
function Invoke-LifecycleQuery([string]$Sql) {
  $lifecycleBytes = [System.Text.Encoding]::UTF8.GetBytes((@{query=$Sql} | ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$lifecycleRef/database/query" -Headers @{Authorization="Bearer $lifecycleToken"} -ContentType 'application/json; charset=utf-8' -Body $lifecycleBytes -TimeoutSec 120
}
try {
  $lifecycleProject = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$lifecycleRef" -Headers @{Authorization="Bearer $lifecycleToken"} -TimeoutSec 30
  if ($lifecycleProject.id -ne $lifecycleRef -or $lifecycleProject.name -ne 'zero-loss-app') { throw 'Project identity mismatch.' }
  if ($Mode -eq 'Inspect' -or $Mode -eq 'Verify') {
    Invoke-LifecycleQuery "select (select environment from demo_private.funding_config where singleton) as environment, (select preview_issuer from demo_private.funding_config where singleton) as issuer, exists(select 1 from supabase_migrations.schema_migrations where version='$lifecycleVersion') as applied, exists(select 1 from pg_available_extensions where name='pg_cron') as cron_available, (select count(*) from public.customer_entries) as entries, (select count(*) from public.customer_rewards) as rewards;" | ConvertTo-Json
    return
  }
  $lifecycleTest = Get-Content -Raw -LiteralPath (Join-Path $lifecycleRoot 'supabase/tests/account_lifecycle_test.sql')
  if ($Mode -eq 'Test') { Invoke-LifecycleQuery $lifecycleTest | ConvertTo-Json -Depth 6; return }
  $lifecycleSource = Get-Content -Raw -LiteralPath (Join-Path $lifecycleRoot "supabase/migrations/${lifecycleVersion}_account_lifecycle.sql")
  $lifecycleBody = $lifecycleSource -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
  $lifecycleGuard = @"
begin;
set local lock_timeout='5s';
set local statement_timeout='90s';
do `$$ begin
  if exists(select 1 from supabase_migrations.schema_migrations where version='$lifecycleVersion') then raise exception 'Lifecycle migration already applied'; end if;
  if not coalesce((select environment='development-test' and preview_issuer='https://$lifecycleRef.supabase.co/auth/v1' from demo_private.funding_config where singleton),false) then raise exception 'Preview environment mismatch'; end if;
end `$$;
"@
  if ($Mode -eq 'DryRun') {
    Invoke-LifecycleQuery ($lifecycleGuard + "`n" + $lifecycleBody + "`n" + ($lifecycleTest -replace '(?m)^begin;\s*$','')) | ConvertTo-Json -Depth 6
  } else {
    if ($lifecycleSource.Contains('$lifecycle_source$')) { throw 'SQL delimiter collision.' }
    Invoke-LifecycleQuery ($lifecycleGuard + "`n" + $lifecycleBody + "`ninsert into supabase_migrations.schema_migrations(version,name,statements) values ('$lifecycleVersion','account_lifecycle',ARRAY[`$lifecycle_source`$$lifecycleSource`$lifecycle_source`$]);`ncommit;") | ConvertTo-Json
  }
} finally { Remove-Variable lifecycleToken -ErrorAction SilentlyContinue }
