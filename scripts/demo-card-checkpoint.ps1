param([ValidateSet('DryRun','Apply','Test','Verify')][string]$Mode = 'DryRun')
$ErrorActionPreference = 'Stop'
$cardRoot = Split-Path $PSScriptRoot
$cardRef = 'ocgdfnvvjvutevgqzzgj'
$cardVersion = '20260917210000'
$cardToken = $null
Get-Content -LiteralPath (Join-Path $cardRoot '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $cardToken = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$cardToken) { throw 'Management credential unavailable (value not logged).' }
function Invoke-CardQuery([string]$Sql) {
  $cardBytes = [System.Text.Encoding]::UTF8.GetBytes((@{query=$Sql} | ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$cardRef/database/query" `
    -Headers @{Authorization="Bearer $cardToken"} -ContentType 'application/json; charset=utf-8' -Body $cardBytes -TimeoutSec 120
}
function Get-CardTest {
  $cardTest = Get-Content -Raw -LiteralPath (Join-Path $cardRoot 'supabase/tests/demo_credit_card_test.sql')
  $cardHarness = @'
create temporary table checkpoint_tap_results(tap text);
grant all on checkpoint_tap_results to authenticated, anon, service_role;
create function pg_temp.checkpoint_assert_tap() returns trigger language plpgsql as $$ begin
  if new.tap like 'not ok%' or new.tap like '# Looks like%' then raise exception 'Checkpoint assertion failed: %',new.tap; end if;
  return new;
end $$;
create trigger checkpoint_fail_fast before insert on checkpoint_tap_results
for each row execute function pg_temp.checkpoint_assert_tap();
'@
  $cardTest = $cardTest -replace '(?m)^begin;\s*',("begin;`n"+$cardHarness.Replace('$','$$')+"`n")
  $cardTest = $cardTest -replace '(?im)^select (is\(|isnt\(|ok\(|throws_ok\(|lives_ok\()', 'insert into checkpoint_tap_results(tap) select $1'
  $cardTest = $cardTest -replace '(?im)^select \* from finish\(\);', 'insert into checkpoint_tap_results(tap) select * from finish();'
  return ($cardTest -replace '(?im)^rollback;', "select count(*) as passed_assertions from checkpoint_tap_results where tap like 'ok%';`nrollback;")
}
try {
  $cardProject = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$cardRef" -Headers @{Authorization="Bearer $cardToken"} -TimeoutSec 30
  if ($cardProject.id -ne $cardRef -or $cardProject.name -ne 'zero-loss-app') { throw 'Project identity mismatch.' }
  if ($Mode -eq 'Test') { Invoke-CardQuery (Get-CardTest) | ConvertTo-Json; return }
  if ($Mode -eq 'Verify') {
    Invoke-CardQuery "select exists(select 1 from supabase_migrations.schema_migrations where version='$cardVersion') as migration_applied, (select count(*) from demo_private.customer_payment_methods) as saved_test_methods, (select count(*) from demo_private.funding_payment_methods) as associated_requests;" | ConvertTo-Json
    return
  }
  $cardSource = Get-Content -Raw -LiteralPath (Join-Path $cardRoot "supabase/migrations/${cardVersion}_demo_credit_card.sql")
  $cardBody = $cardSource -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
  $cardGuard = @"
begin;
set local lock_timeout='5s';
set local statement_timeout='90s';
do `$$ begin
  if exists(select 1 from supabase_migrations.schema_migrations where version='$cardVersion') then raise exception 'Card migration already applied'; end if;
  if not exists(select 1 from supabase_migrations.schema_migrations where version='20260917170000') then raise exception 'Previous checkpoint missing'; end if;
  if not coalesce((select environment='development-test' and preview_issuer='https://$cardRef.supabase.co/auth/v1' from demo_private.funding_config where singleton),false) then raise exception 'Preview environment mismatch'; end if;
end `$$;
"@
  if ($Mode -eq 'DryRun') {
    Invoke-CardQuery ($cardGuard + "`n" + $cardBody + "`n" + ((Get-CardTest) -replace '(?m)^begin;\s*$','')) | ConvertTo-Json
  } else {
    if ($cardSource.Contains('$card_source$')) { throw 'SQL delimiter collision.' }
    Invoke-CardQuery ($cardGuard + "`n" + $cardBody + "`ninsert into supabase_migrations.schema_migrations(version,name,statements) values ('$cardVersion','demo_credit_card',ARRAY[`$card_source`$$cardSource`$card_source`$]);`ncommit;") | ConvertTo-Json
  }
} finally { Remove-Variable cardToken -ErrorAction SilentlyContinue }
