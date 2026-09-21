param(
  [ValidateSet('DryRun','Apply','Test','Inspect')][string]$Mode = 'DryRun',
  [ValidateSet('Schema','Enable')][string]$Checkpoint = 'Schema'
)
$ErrorActionPreference = 'Stop'
$fundingRoot = Split-Path $PSScriptRoot
$fundingRef = 'ocgdfnvvjvutevgqzzgj'
$fundingToken = $null
Get-Content -LiteralPath (Join-Path $fundingRoot '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $fundingToken = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$fundingToken) { throw 'Management credential unavailable (value not logged).' }
function Invoke-FundingQuery([string]$Sql) {
  $fundingBytes = [System.Text.Encoding]::UTF8.GetBytes((@{ query=$Sql } | ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$fundingRef/database/query" -Headers @{ Authorization="Bearer $fundingToken" } -ContentType 'application/json; charset=utf-8' -Body $fundingBytes -TimeoutSec 90
}
try {
  $fundingProject = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$fundingRef" -Headers @{ Authorization="Bearer $fundingToken" } -TimeoutSec 30
  if ($fundingProject.id -ne $fundingRef -or $fundingProject.name -ne 'zero-loss-app') { throw 'Project identity mismatch.' }
  if ($Mode -eq 'Inspect') {
    Invoke-FundingQuery @'
select to_regclass('demo_private.funding_authorizations')::text as authorization_table,
  to_regclass('demo_private.funding_authentication_attempts')::text as attempt_table,
  (select to_jsonb(c)->>'funding_reauth_required' from demo_private.funding_config c where singleton) as enforcement,
  (select count(*) from public.demo_funding_sessions) as funding_requests,
  (select count(*) from public.ledger_entries) as ledger_entries,
  (select array_agg(version order by version) from supabase_migrations.schema_migrations
    where version in ('20260921180000','20260921181000','20260921200000','20260921201000')) as applied;
'@ | ConvertTo-Json -Depth 4
    return
  }
  $fundingTest = [string](Get-Content -Raw -LiteralPath (Join-Path $fundingRoot 'supabase/tests/funding_authorization_test.sql'))
  $fundingTest = $fundingTest -replace '(?m)^begin;\s*$',"begin;`ncreate temporary table funding_tap(line text) on commit drop;`ngrant insert,select on funding_tap to authenticated,anon;"
  $fundingTest = $fundingTest -replace '(?m)^select (is|isnt|ok|throws_ok|lives_ok)\(', 'insert into funding_tap select $1('
  $fundingTest = $fundingTest.Replace('select * from finish();',@'
insert into funding_tap select * from finish();
do $tap$ begin
  if exists(select 1 from funding_tap where line like 'not ok %') then raise exception 'Funding authorization regression failed'; end if;
end $tap$;
select count(*) filter(where line like 'ok %') as passed,
  count(*) filter(where line like 'not ok %') as failed, jsonb_agg(line) as assertions from funding_tap;
'@)
  if ($Mode -eq 'Test') { Invoke-FundingQuery $fundingTest | ConvertTo-Json -Depth 6; return }
  $fundingFiles = if ($Checkpoint -eq 'Schema') { @('20260921180000_funding_authorization.sql','20260921181000_funding_authorization_history.sql','20260921200000_funding_authentication_attempts.sql') } else { @('20260921201000_enable_funding_authorization.sql') }
  $fundingSql = @'
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $guard$ begin
  if not coalesce((select environment='development-test' and preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1'
    from demo_private.funding_config where singleton),false) then raise exception 'Demo environment mismatch'; end if;
end $guard$;
'@
  foreach ($fundingFile in $fundingFiles) {
    $fundingSource = ([string](Get-Content -Raw -LiteralPath (Join-Path $fundingRoot "supabase/migrations/$fundingFile"))).Replace("`r`n","`n")
    if ($fundingSource.Contains('$funding_source$')) { throw 'SQL delimiter collision.' }
    $fundingVersion = $fundingFile.Substring(0,14)
    $fundingName = $fundingFile.Substring(15).Replace('.sql','')
    $fundingSql += "`ndo `$guard`$ begin if exists(select 1 from supabase_migrations.schema_migrations where version='$fundingVersion') then raise exception 'Migration already applied'; end if; end `$guard`$;`n"
    $fundingSql += $fundingSource -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
    if ($Mode -eq 'Apply') {
      $fundingSql += "`ninsert into supabase_migrations.schema_migrations(version,name,statements) values ('$fundingVersion','$fundingName',ARRAY[`$funding_source`$$fundingSource`$funding_source`$]);`n"
    }
  }
  if ($Mode -eq 'DryRun') {
    Invoke-FundingQuery ($fundingSql + "`n" + ($fundingTest -replace '(?m)^begin;\s*$','')) | ConvertTo-Json -Depth 6
  } else {
    Invoke-FundingQuery ($fundingSql + "`ncommit;") | ConvertTo-Json
  }
} finally { Remove-Variable fundingToken -ErrorAction SilentlyContinue }
