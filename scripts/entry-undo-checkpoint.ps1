param(
  [ValidateSet('Inspect','DryRun','Apply','Test')][string]$Mode='Inspect',
  [ValidateSet('Schema','Enable')][string]$Checkpoint='Schema'
)
$ErrorActionPreference='Stop'
$undoRoot=Split-Path $PSScriptRoot
$undoRef='ocgdfnvvjvutevgqzzgj'
$undoToken=$null
Get-Content -LiteralPath (Join-Path $undoRoot '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $undoToken=$Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$undoToken) { throw 'Management credential unavailable (value not logged).' }
function Invoke-UndoQuery([string]$Sql) {
  $undoBytes=[System.Text.Encoding]::UTF8.GetBytes((@{query=$Sql}|ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$undoRef/database/query" -Headers @{Authorization="Bearer $undoToken"} -ContentType 'application/json; charset=utf-8' -Body $undoBytes -TimeoutSec 90
}
try {
  $undoProject=Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$undoRef" -Headers @{Authorization="Bearer $undoToken"} -TimeoutSec 30
  if ($undoProject.id -ne $undoRef -or $undoProject.name -ne 'zero-loss-app') { throw 'Project mismatch.' }
  if ($Mode -eq 'Inspect') {
    Invoke-UndoQuery @'
select (select to_jsonb(c)->>'entry_undo_required' from demo_private.funding_config c where singleton) as undo_enabled,
  to_regclass('public.entry_requests')::text as request_table,
  (select installed_version from pg_available_extensions where name='pg_cron') as cron_version,
  (select count(*) from public.customer_entries) as existing_entries,
  (select count(*) from public.ledger_entries) as ledger_rows,
  (select array_agg(version order by version) from supabase_migrations.schema_migrations where version in ('20260921210000','20260921212000')) as applied;
'@ | ConvertTo-Json -Depth 4
    return
  }
  $undoTest=[string](Get-Content -Raw -LiteralPath (Join-Path $undoRoot 'supabase/tests/entry_request_undo_test.sql'))
  $undoTest=$undoTest -replace '(?m)^begin;\s*$',"begin;`ncreate temporary table undo_tap(line text) on commit drop;`ngrant select,insert on undo_tap to authenticated,anon;"
  $undoTest=$undoTest -replace '(?m)^select (is|isnt|ok|throws_ok|lives_ok)\(','insert into undo_tap select $1('
  $undoTest=$undoTest.Replace('select * from finish();',@'
insert into undo_tap select * from finish();
do $tap$ begin
  if exists(select 1 from undo_tap where line like 'not ok %') then raise exception 'Entry Undo regression failed'; end if;
end $tap$;
select count(*) filter(where line like 'ok %') as passed, count(*) filter(where line like 'not ok %') as failed,
  jsonb_agg(line) as assertions from undo_tap;
'@)
  if ($Mode -eq 'Test') { Invoke-UndoQuery $undoTest | ConvertTo-Json -Depth 6; return }
  $undoFile=if($Checkpoint -eq 'Schema'){'20260921210000_entry_request_undo.sql'}else{'20260921212000_enable_entry_request_undo.sql'}
  $undoVersion=$undoFile.Substring(0,14)
  $undoName=$undoFile.Substring(15).Replace('.sql','')
  $undoSource=([string](Get-Content -Raw -LiteralPath (Join-Path $undoRoot "supabase/migrations/$undoFile"))).Replace("`r`n","`n")
  if ($undoSource.Contains('$undo_source$')) { throw 'SQL delimiter collision.' }
  $undoSql=@"
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do `$guard`$ begin
  if exists(select 1 from supabase_migrations.schema_migrations where version='$undoVersion') then raise exception 'Migration already applied'; end if;
  if not coalesce((select environment='development-test' and preview_issuer='https://$undoRef.supabase.co/auth/v1' from demo_private.funding_config where singleton),false) then raise exception 'Preview environment mismatch'; end if;
end `$guard`$;
"@
  $undoSql += "`n"+($undoSource -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$','')
  if ($Mode -eq 'DryRun') {
    if ($Checkpoint -eq 'Enable') { Invoke-UndoQuery ($undoSql+"`nselect 'rollout validated' as result; rollback;")|ConvertTo-Json; return }
    Invoke-UndoQuery ($undoSql+"`n"+($undoTest -replace '(?m)^begin;\s*$',''))|ConvertTo-Json -Depth 6
  } else {
    $undoSql+="`ninsert into supabase_migrations.schema_migrations(version,name,statements) values('$undoVersion','$undoName',ARRAY[`$undo_source`$$undoSource`$undo_source`$]);`ncommit;"
    Invoke-UndoQuery $undoSql|ConvertTo-Json
  }
} finally { Remove-Variable undoToken -ErrorAction SilentlyContinue }
