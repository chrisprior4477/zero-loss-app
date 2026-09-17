param([ValidateSet('DryRun','Apply','Test','Verify')][string]$Mode = 'DryRun')
$ErrorActionPreference = 'Stop'
$checkpointRoot = Split-Path $PSScriptRoot
$checkpointRef = 'ocgdfnvvjvutevgqzzgj'
$checkpointVersion = '20260917230000'
$checkpointToken = $null
Get-Content -LiteralPath (Join-Path $checkpointRoot '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $checkpointToken = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$checkpointToken) { throw 'Management credential unavailable (value not logged).' }
function Invoke-CheckpointQuery([string]$Sql) {
  $checkpointBytes = [System.Text.Encoding]::UTF8.GetBytes((@{query=$Sql} | ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$checkpointRef/database/query" `
    -Headers @{Authorization="Bearer $checkpointToken"} -ContentType 'application/json; charset=utf-8' -Body $checkpointBytes -TimeoutSec 120
}
function Get-CheckpointTest {
  $checkpointTest = Get-Content -Raw -LiteralPath (Join-Path $checkpointRoot 'supabase/tests/save_demo_payment_method_test.sql')
  $checkpointHarness = @'
create temporary table checkpoint_tap_results(tap text);
grant all on checkpoint_tap_results to authenticated, anon, service_role;
create function pg_temp.checkpoint_assert_tap() returns trigger language plpgsql as $$ begin
  if new.tap like 'not ok%' or new.tap like '# Looks like%' then raise exception 'Checkpoint assertion failed: %',new.tap; end if;
  return new;
end $$;
create trigger checkpoint_fail_fast before insert on checkpoint_tap_results
for each row execute function pg_temp.checkpoint_assert_tap();
'@
  $checkpointTest = $checkpointTest -replace '(?m)^begin;\s*',("begin;`n"+$checkpointHarness.Replace('$','$$')+"`n")
  $checkpointTest = $checkpointTest -replace '(?im)^select (is\(|isnt\(|ok\(|throws_ok\(|lives_ok\()', 'insert into checkpoint_tap_results(tap) select $1'
  $checkpointTest = $checkpointTest -replace '(?im)^select \* from finish\(\);', 'insert into checkpoint_tap_results(tap) select * from finish();'
  return ($checkpointTest -replace '(?im)^rollback;', "select count(*) as passed_assertions from checkpoint_tap_results where tap like 'ok%';`nrollback;")
}
try {
  $checkpointProject = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$checkpointRef" -Headers @{Authorization="Bearer $checkpointToken"} -TimeoutSec 30
  if ($checkpointProject.id -ne $checkpointRef -or $checkpointProject.name -ne 'zero-loss-app') { throw 'Project identity mismatch.' }
  if ($Mode -eq 'Test') { Invoke-CheckpointQuery (Get-CheckpointTest) | ConvertTo-Json; return }
  if ($Mode -eq 'Verify') {
    Invoke-CheckpointQuery "select exists(select 1 from supabase_migrations.schema_migrations where version='$checkpointVersion') as migration_applied, (select count(*) from demo_private.customer_payment_methods) as saved_test_methods;" | ConvertTo-Json
    return
  }
  $checkpointSource = Get-Content -Raw -LiteralPath (Join-Path $checkpointRoot "supabase/migrations/${checkpointVersion}_save_demo_payment_method.sql")
  $checkpointBody = $checkpointSource -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
  $checkpointGuard = @"
begin;
set local lock_timeout='5s';
set local statement_timeout='90s';
do `$$ begin
  if exists(select 1 from supabase_migrations.schema_migrations where version='$checkpointVersion') then raise exception 'Saved-card migration already applied'; end if;
  if not exists(select 1 from supabase_migrations.schema_migrations where version='20260917210000') then raise exception 'Previous card checkpoint missing'; end if;
  if not coalesce((select environment='development-test' and preview_issuer='https://$checkpointRef.supabase.co/auth/v1' from demo_private.funding_config where singleton),false) then raise exception 'Preview environment mismatch'; end if;
end `$$;
"@
  if ($Mode -eq 'DryRun') {
    Invoke-CheckpointQuery ($checkpointGuard + "`n" + $checkpointBody + "`n" + ((Get-CheckpointTest) -replace '(?m)^begin;\s*$','')) | ConvertTo-Json
  } else {
    if ($checkpointSource.Contains('$checkpoint_source$')) { throw 'SQL delimiter collision.' }
    Invoke-CheckpointQuery ($checkpointGuard + "`n" + $checkpointBody + "`ninsert into supabase_migrations.schema_migrations(version,name,statements) values ('$checkpointVersion','save_demo_payment_method',ARRAY[`$checkpoint_source`$$checkpointSource`$checkpoint_source`$]);`ncommit;") | ConvertTo-Json
  }
} finally { Remove-Variable checkpointToken -ErrorAction SilentlyContinue }
