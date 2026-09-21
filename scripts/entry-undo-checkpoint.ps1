param(
  [ValidateSet('Inspect','DryRun','Apply','Test','Verify')][string]$Mode='Inspect',
  [ValidateSet('Schema','Enable','RecoverySchema','RecoveryEnable','Support')][string]$Checkpoint='Schema'
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
  if ($Mode -eq 'Verify') {
    Invoke-UndoQuery @'
select jsonb_build_object(
  'recoveryEnabled',(select to_jsonb(c)->>'entry_recovery_required' from demo_private.funding_config c where singleton),
  'checkpointMigrations',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations where version in ('20260921220000','20260921223000','20260921230000')),
  'supportCases',(select count(*) from public.support_cases),
  'supportAccessEvents',(select count(*) from support_private.staff_access_events),
  'ownerSupportCases',(select jsonb_agg(x) from (select c.id,c.status,c.ledger_entry_id,
    (select count(*) from public.support_case_events e where e.case_id=c.id) as event_count
    from public.support_cases c join auth.users u on u.id=c.customer_id where u.email='prioritycomputerservices@gmail.com'
    order by c.updated_at desc limit 5)x),
  'ownerRequests',(select jsonb_agg(x) from (
    select r.status,r.requested_quantity,r.offering_slug,r.reason_code,
      (select count(*) from public.customer_entries e where e.entry_request_id=r.id) as saved_entries,
      (select sum(l.amount) from public.ledger_entries l where l.entry_request_id=r.id) as net_hold_cents,
      (select count(*) from public.entry_request_events ev where ev.request_id=r.id) as audit_events
    from public.entry_requests r join auth.users u on u.id=r.customer_id where u.email='prioritycomputerservices@gmail.com'
    order by r.requested_at desc limit 10) x),
  'ownerPlayableCents',(select sum(l.amount) from public.ledger_entries l join auth.users u on u.id=l.customer_id
    where u.email='prioritycomputerservices@gmail.com' and l.wallet_scope='demo' and l.balance_type='PLAYABLE'),
  'overdueRequests',(select count(*) from public.entry_requests where status='validating' and undo_until<clock_timestamp()-interval '30 seconds'),
  'entryCountMismatches',(select count(*) from public.entry_requests r where
    (select count(*) from public.customer_entries e where e.entry_request_id=r.id)<>case when r.status='accepted' then r.requested_quantity else 0 end),
  'holdMismatches',(select count(*) from public.entry_requests r where
    coalesce((select sum(amount) from public.ledger_entries l where l.entry_request_id=r.id),0)<>
      case when r.status='validating' then -r.unit_price_cents*r.requested_quantity else 0 end),
  'scheduler',(select jsonb_build_object('active',active,'schedule',schedule,'command',command) from cron.job where jobname='zero-loss-finalize-demo-entry-requests'),
  'recentJobRuns',(select jsonb_agg(x) from (select d.status,d.return_message from cron.job_run_details d
    join cron.job j on j.jobid=d.jobid where j.jobname='zero-loss-finalize-demo-entry-requests' order by d.start_time desc limit 3)x)
) as verification;
'@ | ConvertTo-Json -Depth 8
    return
  }
  if ($Mode -eq 'Inspect') {
    Invoke-UndoQuery @'
select (select to_jsonb(c)->>'entry_undo_required' from demo_private.funding_config c where singleton) as undo_enabled,
  to_regclass('public.entry_requests')::text as request_table,
  (select installed_version from pg_available_extensions where name='pg_cron') as cron_version,
  (select count(*) from public.customer_entries) as existing_entries,
  (select count(*) from public.ledger_entries) as ledger_rows,
  (select array_agg(version order by version) from supabase_migrations.schema_migrations where version in ('20260921210000','20260921212000','20260921220000','20260921223000','20260921230000')) as applied;
'@ | ConvertTo-Json -Depth 4
    return
  }
  $undoTestFile=if($Checkpoint -eq 'Support'){'supabase/tests/support_cases_test.sql'}elseif($Checkpoint.StartsWith('Recovery')){'supabase/tests/entry_recovery_test.sql'}else{'supabase/tests/entry_request_undo_test.sql'}
  $undoTest=[string](Get-Content -Raw -LiteralPath (Join-Path $undoRoot $undoTestFile))
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
  $undoFile=switch($Checkpoint) {
    'Schema' {'20260921210000_entry_request_undo.sql'}
    'Enable' {'20260921212000_enable_entry_request_undo.sql'}
    'RecoverySchema' {'20260921220000_entry_recovery.sql'}
    'RecoveryEnable' {'20260921223000_enable_entry_recovery.sql'}
    'Support' {'20260921230000_support_cases.sql'}
  }
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
    if ($Checkpoint.EndsWith('Enable')) { Invoke-UndoQuery ($undoSql+"`nselect 'rollout validated' as result; rollback;")|ConvertTo-Json; return }
    Invoke-UndoQuery ($undoSql+"`n"+($undoTest -replace '(?m)^begin;\s*$',''))|ConvertTo-Json -Depth 6
  } else {
    $undoSql+="`ninsert into supabase_migrations.schema_migrations(version,name,statements) values('$undoVersion','$undoName',ARRAY[`$undo_source`$$undoSource`$undo_source`$]);`ncommit;"
    Invoke-UndoQuery $undoSql|ConvertTo-Json
  }
} finally { Remove-Variable undoToken -ErrorAction SilentlyContinue }
