param([ValidateSet('Inspect','DryRun','Apply','Test','Verify')][string]$Mode = 'Inspect')
$ErrorActionPreference = 'Stop'
$batchRoot = Split-Path $PSScriptRoot
$batchRef = 'ocgdfnvvjvutevgqzzgj'
$batchVersion = '20260918223000'
$batchToken = $null
Get-Content -LiteralPath (Join-Path $batchRoot '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $batchToken = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$batchToken) { throw 'Management credential unavailable (value not logged).' }
function Invoke-BatchQuery([string]$Sql) {
  $batchBytes = [System.Text.Encoding]::UTF8.GetBytes((@{query=$Sql} | ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$batchRef/database/query" -Headers @{Authorization="Bearer $batchToken"} -ContentType 'application/json; charset=utf-8' -Body $batchBytes -TimeoutSec 120
}
try {
  $batchProject = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$batchRef" -Headers @{Authorization="Bearer $batchToken"} -TimeoutSec 30
  if ($batchProject.id -ne $batchRef -or $batchProject.name -ne 'zero-loss-app') { throw 'Project identity mismatch.' }
  if ($Mode -eq 'Inspect' -or $Mode -eq 'Verify') {
    Invoke-BatchQuery "select (select environment from demo_private.funding_config where singleton) as environment, (select preview_issuer from demo_private.funding_config where singleton) as issuer, exists(select 1 from supabase_migrations.schema_migrations where version='$batchVersion') as applied, to_regclass('public.preview_entry_batches') is not null as table_ready, to_regprocedure('public.create_preview_entries(text,integer,text)') is not null as function_ready;" | ConvertTo-Json
    return
  }
  $batchTest = Get-Content -Raw -LiteralPath (Join-Path $batchRoot 'supabase/tests/preview_entry_lifecycle_test.sql')
  if ($Mode -eq 'Test') { Invoke-BatchQuery $batchTest | ConvertTo-Json -Depth 6; return }
  $batchSource = Get-Content -Raw -LiteralPath (Join-Path $batchRoot "supabase/migrations/${batchVersion}_preview_multi_entry_batches.sql")
  $batchBody = $batchSource -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
  $batchGuard = @"
begin;
set local lock_timeout='5s';
set local statement_timeout='90s';
do `$$ begin
  if exists(select 1 from supabase_migrations.schema_migrations where version='$batchVersion') then raise exception 'Multi-entry migration already applied'; end if;
  if not exists(select 1 from supabase_migrations.schema_migrations where version='20260918213000') then raise exception 'Profile identity checkpoint missing'; end if;
  if not coalesce((select environment='development-test' and preview_issuer='https://$batchRef.supabase.co/auth/v1' from demo_private.funding_config where singleton),false) then raise exception 'Preview environment mismatch'; end if;
end `$$;
"@
  if ($Mode -eq 'DryRun') {
    Invoke-BatchQuery ($batchGuard + "`n" + $batchBody + "`n" + ($batchTest -replace '(?m)^begin;\s*$','')) | ConvertTo-Json -Depth 6
  } else {
    if ($batchSource.Contains('$batch_source$')) { throw 'SQL delimiter collision.' }
    Invoke-BatchQuery ($batchGuard + "`n" + $batchBody + "`ninsert into supabase_migrations.schema_migrations(version,name,statements) values ('$batchVersion','preview_multi_entry_batches',ARRAY[`$batch_source`$$batchSource`$batch_source`$]);`ncommit;") | ConvertTo-Json
  }
} finally { Remove-Variable batchToken -ErrorAction SilentlyContinue }
