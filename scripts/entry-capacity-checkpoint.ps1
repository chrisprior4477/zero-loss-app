param(
  [ValidateSet('DryRun','Apply','Test')][string]$Mode = 'DryRun',
  [ValidateSet('Capacity','Receipts','Availability')][string]$Checkpoint = 'Capacity'
)
$ErrorActionPreference = 'Stop'
$capacityRoot = Split-Path $PSScriptRoot
$capacityRef = 'ocgdfnvvjvutevgqzzgj'
$capacityVersion = if ($Checkpoint -eq 'Receipts') { '20260921161500' } else { '20260921160000' }
$capacityName = if ($Checkpoint -eq 'Receipts') { 'preview_entry_receipt_destinations' } else { 'serialize_preview_entry_capacity' }
$capacityFunction = if ($Checkpoint -eq 'Receipts') { 'demo_private.preview_entry_batch_response(uuid,boolean)' } else { 'public.create_preview_entries(text,integer,text)' }
$capacityPattern = if ($Checkpoint -eq 'Receipts') { '(?s)create function demo_private\.preview_entry_batch_response\(.*?as \$\$(.*?)\$\$;' } else { '(?s)create function public\.create_preview_entries\(.*?as \$\$(.*?)\$\$;' }
$capacityPriorFile = '20260918223000_preview_multi_entry_batches.sql'
$capacityTestFile = 'preview_entry_lifecycle_test.sql'
if ($Checkpoint -eq 'Availability') {
  $capacityVersion = '20260921163000'
  $capacityName = 'preview_offering_availability'
  $capacityPattern = '(?s)create or replace function public\.create_preview_entries\(.*?as \$\$(.*?)\$\$;'
  $capacityPriorFile = '20260921160000_serialize_preview_entry_capacity.sql'
  $capacityTestFile = 'preview_availability_test.sql'
}
$capacityToken = $null
Get-Content -LiteralPath (Join-Path $capacityRoot '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $capacityToken = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$capacityToken) { throw 'Management credential unavailable (value not logged).' }
function Invoke-CapacityQuery([string]$Sql) {
  $capacityBytes = [System.Text.Encoding]::UTF8.GetBytes((@{query=$Sql} | ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$capacityRef/database/query" -Headers @{Authorization="Bearer $capacityToken"} -ContentType 'application/json; charset=utf-8' -Body $capacityBytes -TimeoutSec 120
}
try {
  $capacityProject = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$capacityRef" -Headers @{Authorization="Bearer $capacityToken"} -TimeoutSec 30
  if ($capacityProject.id -ne $capacityRef -or $capacityProject.name -ne 'zero-loss-app') { throw 'Project identity mismatch.' }
  $capacityTest = Get-Content -Raw -LiteralPath (Join-Path $capacityRoot "supabase/tests/$capacityTestFile")
  # Management API returns only the final result set. Collect every TAP result
  # and raise on failure, rather than mistaking a final plan for passing tests.
  $capacityTest = $capacityTest -replace '(?m)^begin;\s*$',"begin;`ncreate temporary table capacity_tap(line text) on commit drop;`ngrant insert,select on capacity_tap to authenticated,anon;"
  $capacityTest = $capacityTest -replace '(?m)^select (is|throws_ok|lives_ok)\(', 'insert into capacity_tap select $1('
  $capacityTest = $capacityTest.Replace('select * from finish();',@'
insert into capacity_tap select * from finish();
do $tap$ begin
  if exists(select 1 from capacity_tap where line like 'not ok %') then raise exception 'Capacity regression test failed'; end if;
end $tap$;
select count(*) filter(where line like 'ok %') as passed,
  count(*) filter(where line like 'not ok %') as failed, jsonb_agg(line) as assertions from capacity_tap;
'@)
  if ($Mode -eq 'Test') { Invoke-CapacityQuery $capacityTest | ConvertTo-Json -Depth 6; return }
  $capacitySource = (Get-Content -Raw -LiteralPath (Join-Path $capacityRoot "supabase/migrations/${capacityVersion}_${capacityName}.sql")).Replace("`r`n","`n")
  $capacityBody = $capacitySource -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
  $capacityPrior = (Get-Content -Raw -LiteralPath (Join-Path $capacityRoot "supabase/migrations/$capacityPriorFile")).Replace("`r`n","`n")
  $capacityMatch = [regex]::Match($capacityPrior,$capacityPattern)
  if (!$capacityMatch.Success) { throw 'Cannot identify prior function body.' }
  $capacityOldBody = $capacityMatch.Groups[1].Value
  if ($capacitySource.Contains('$capacity_source$') -or $capacityOldBody.Contains('$capacity_prior$')) { throw 'SQL delimiter collision.' }
  $capacityGuard = @'
begin;
set local lock_timeout='5s';
set local statement_timeout='90s';
do $guard$ begin
  if exists(select 1 from supabase_migrations.schema_migrations where version='__VERSION__') then
    raise exception 'Capacity migration already applied'; end if;
  if not coalesce((select environment='development-test' and preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1'
    from demo_private.funding_config where singleton),false) then raise exception 'Demo environment mismatch'; end if;
  if (select replace(prosrc,chr(13),'') from pg_proc where oid='__FUNCTION__'::regprocedure)
    is distinct from $capacity_prior$__PRIOR_BODY__$capacity_prior$ then
    raise exception 'Function differs from reviewed baseline; stop for inspection'; end if;
end $guard$;
'@
  $capacityGuard = $capacityGuard.Replace('__PRIOR_BODY__',$capacityOldBody).Replace('__VERSION__',$capacityVersion).Replace('__FUNCTION__',$capacityFunction)
  if ($Mode -eq 'DryRun') {
    $capacityResult = Invoke-CapacityQuery ($capacityGuard + "`n" + $capacityBody + "`n" + ($capacityTest -replace '(?m)^begin;\s*$',''))
    $capacityJson = $capacityResult | ConvertTo-Json -Depth 6
    $capacityJson
    if ($capacityJson -match 'not ok [0-9]') { throw 'Database regression assertion failed.' }
  } else {
    Invoke-CapacityQuery ($capacityGuard + "`n" + $capacityBody + "`ninsert into supabase_migrations.schema_migrations(version,name,statements) values ('$capacityVersion','$capacityName',ARRAY[`$capacity_source`$$capacitySource`$capacity_source`$]);`ncommit;") | ConvertTo-Json
  }
} finally { Remove-Variable capacityToken -ErrorAction SilentlyContinue }
