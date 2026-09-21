param(
  [ValidateSet('DryRun','Apply','Test')][string]$Mode = 'DryRun',
  [ValidateSet('Schema','Enable','Replay')][string]$Checkpoint = 'Schema'
)
$ErrorActionPreference = 'Stop'
$identityRoot = Split-Path $PSScriptRoot
$identityRef = 'ocgdfnvvjvutevgqzzgj'
$identityVersion = if ($Checkpoint -eq 'Schema') { '20260921183000' } elseif ($Checkpoint -eq 'Replay') { '20260921190000' } else { '20260921185000' }
$identityName = if ($Checkpoint -eq 'Schema') { 'demo_identity_verification' } elseif ($Checkpoint -eq 'Replay') { 'demo_identity_replay' } else { 'enable_demo_winner_verification' }
$identityToken = $null
Get-Content -LiteralPath (Join-Path $identityRoot '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $identityToken = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$identityToken) { throw 'Management credential unavailable (value not logged).' }
function Invoke-IdentityQuery([string]$Sql) {
  $identityBytes = [System.Text.Encoding]::UTF8.GetBytes((@{ query=$Sql } | ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$identityRef/database/query" -Headers @{ Authorization="Bearer $identityToken" } -ContentType 'application/json; charset=utf-8' -Body $identityBytes -TimeoutSec 120
}
try {
  $identityProject = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$identityRef" -Headers @{ Authorization="Bearer $identityToken" } -TimeoutSec 30
  if ($identityProject.id -ne $identityRef -or $identityProject.name -ne 'zero-loss-app') { throw 'Project identity mismatch.' }
  $identityTest = [string](Get-Content -Raw -LiteralPath (Join-Path $identityRoot 'supabase/tests/demo_identity_verification_test.sql'))
  $identityTest = $identityTest -replace '(?m)^begin;\s*$',"begin;`ncreate temporary table identity_tap(line text) on commit drop;`ngrant insert,select on identity_tap to authenticated,anon;"
  $identityTest = $identityTest -replace '(?m)^select (is|isnt|ok|throws_ok|lives_ok)\(', 'insert into identity_tap select $1('
  $identityTest = $identityTest.Replace('select * from finish();',@'
insert into identity_tap select * from finish();
do $tap$ begin
  if exists(select 1 from identity_tap where line like 'not ok %') then raise exception 'Identity regression test failed'; end if;
end $tap$;
select count(*) filter(where line like 'ok %') as passed,
  count(*) filter(where line like 'not ok %') as failed, jsonb_agg(line) as assertions from identity_tap;
'@)
  if ($Mode -eq 'Test') { Invoke-IdentityQuery $identityTest | ConvertTo-Json -Depth 6; return }
  $identitySource = ([string](Get-Content -Raw -LiteralPath (Join-Path $identityRoot "supabase/migrations/${identityVersion}_${identityName}.sql"))).Replace("`r`n","`n")
  if ($identitySource.Contains('$identity_source$')) { throw 'SQL delimiter collision.' }
  $identityBody = $identitySource -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
  $identityGuard = @'
begin;
set local lock_timeout='5s';
set local statement_timeout='90s';
do $guard$ begin
  if exists(select 1 from supabase_migrations.schema_migrations where version='__VERSION__') then
    raise exception 'Identity migration already applied'; end if;
  if not coalesce((select environment='development-test' and preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1'
    from demo_private.funding_config where singleton),false) then raise exception 'Demo environment mismatch'; end if;
  if '__CHECKPOINT__'='Schema' and to_regclass('public.customer_verifications') is not null then
    raise exception 'Existing verification schema needs review'; end if;
  if '__CHECKPOINT__'<>'Schema' and not exists(select 1 from supabase_migrations.schema_migrations where version='20260921183000') then
    raise exception 'Reviewed identity migration must be installed first'; end if;
end $guard$;
'@
  $identityGuard = $identityGuard.Replace('__VERSION__',$identityVersion).Replace('__CHECKPOINT__',$Checkpoint)
  if ($Mode -eq 'DryRun') {
    if ($Checkpoint -eq 'Schema') {
      # The current test suite also covers replay. Include its additive schema
      # only inside this rollback transaction when checking a fresh install.
      $identityReplay = [string](Get-Content -Raw -LiteralPath (Join-Path $identityRoot 'supabase/migrations/20260921190000_demo_identity_replay.sql'))
      $identityBody += "`n" + ($identityReplay -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$','')
    }
    $identityResult = Invoke-IdentityQuery ($identityGuard + "`n" + $identityBody + "`n" + ($identityTest -replace '(?m)^begin;\s*$',''))
    $identityJson = $identityResult | ConvertTo-Json -Depth 6
    $identityJson
    if ($identityJson -match 'not ok [0-9]') { throw 'Database regression assertion failed.' }
  } else {
    Invoke-IdentityQuery ($identityGuard + "`n" + $identityBody + "`ninsert into supabase_migrations.schema_migrations(version,name,statements) values ('$identityVersion','$identityName',ARRAY[`$identity_source`$$identitySource`$identity_source`$]);`ncommit;") | ConvertTo-Json
  }
} finally { Remove-Variable identityToken -ErrorAction SilentlyContinue }
