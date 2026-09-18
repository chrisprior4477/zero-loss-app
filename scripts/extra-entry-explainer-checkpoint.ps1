param([ValidateSet('Inspect','DryRun','Apply','Test','Verify')][string]$Mode = 'Inspect')
$ErrorActionPreference = 'Stop'
$explainerRoot = Split-Path $PSScriptRoot
$explainerRef = 'ocgdfnvvjvutevgqzzgj'
$explainerVersion = '20260918233000'
$explainerToken = $null
Get-Content -LiteralPath (Join-Path $explainerRoot '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $explainerToken = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$explainerToken) { throw 'Management credential unavailable (value not logged).' }
function Invoke-ExplainerQuery([string]$Sql) {
  $explainerBytes = [System.Text.Encoding]::UTF8.GetBytes((@{query=$Sql} | ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$explainerRef/database/query" -Headers @{Authorization="Bearer $explainerToken"} -ContentType 'application/json; charset=utf-8' -Body $explainerBytes -TimeoutSec 120
}
try {
  $explainerProject = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$explainerRef" -Headers @{Authorization="Bearer $explainerToken"} -TimeoutSec 30
  if ($explainerProject.id -ne $explainerRef -or $explainerProject.name -ne 'zero-loss-app') { throw 'Project identity mismatch.' }
  if ($Mode -eq 'Inspect' -or $Mode -eq 'Verify') {
    Invoke-ExplainerQuery "select (select environment from demo_private.funding_config where singleton) as environment, exists(select 1 from supabase_migrations.schema_migrations where version='$explainerVersion') as applied, exists(select 1 from information_schema.columns where table_schema='public' and table_name='customer_profiles' and column_name='extra_entry_explainer_acknowledged_at') as column_ready, to_regprocedure('public.acknowledge_extra_entry_explainer()') is not null as function_ready;" | ConvertTo-Json
    return
  }
  $explainerTest = Get-Content -Raw -LiteralPath (Join-Path $explainerRoot 'supabase/tests/extra_entry_explainer_preference_test.sql')
  if ($Mode -eq 'Test') { Invoke-ExplainerQuery $explainerTest | ConvertTo-Json -Depth 6; return }
  $explainerSource = Get-Content -Raw -LiteralPath (Join-Path $explainerRoot "supabase/migrations/${explainerVersion}_extra_entry_explainer_preference.sql")
  $explainerBody = $explainerSource -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
  $explainerGuard = @"
begin;
set local lock_timeout='5s';
set local statement_timeout='90s';
do `$$ begin
  if exists(select 1 from supabase_migrations.schema_migrations where version='$explainerVersion') then raise exception 'Explainer preference migration already applied'; end if;
  if not exists(select 1 from supabase_migrations.schema_migrations where version='20260918223000') then raise exception 'Multi-entry checkpoint missing'; end if;
  if not coalesce((select environment='development-test' and preview_issuer='https://$explainerRef.supabase.co/auth/v1' from demo_private.funding_config where singleton),false) then raise exception 'Preview environment mismatch'; end if;
end `$$;
"@
  if ($Mode -eq 'DryRun') {
    Invoke-ExplainerQuery ($explainerGuard + "`n" + $explainerBody + "`n" + ($explainerTest -replace '(?m)^begin;\s*$','')) | ConvertTo-Json -Depth 6
  } else {
    if ($explainerSource.Contains('$explainer_source$')) { throw 'SQL delimiter collision.' }
    Invoke-ExplainerQuery ($explainerGuard + "`n" + $explainerBody + "`ninsert into supabase_migrations.schema_migrations(version,name,statements) values ('$explainerVersion','extra_entry_explainer_preference',ARRAY[`$explainer_source`$$explainerSource`$explainer_source`$]);`ncommit;") | ConvertTo-Json
  }
} finally { Remove-Variable explainerToken -ErrorAction SilentlyContinue }
