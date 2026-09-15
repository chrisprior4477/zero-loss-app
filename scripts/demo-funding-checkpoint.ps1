param([ValidateSet('Inspect','DryRun','Apply','Test','Enable','Verify','ConcurrentPrepare','ConcurrentAccept')][string]$Mode = 'Inspect')
$ErrorActionPreference = 'Stop'
$fundingRoot = Split-Path $PSScriptRoot
$fundingRef = 'ocgdfnvvjvutevgqzzgj'
$fundingToken = $null
Get-Content -LiteralPath (Join-Path $fundingRoot '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $fundingToken = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$fundingToken) { throw 'Management credential is unavailable (value not logged).' }
function Invoke-FundingQuery([string]$Sql) {
  $fundingBytes = [System.Text.Encoding]::UTF8.GetBytes((@{query=$Sql} | ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$fundingRef/database/query" -Headers @{Authorization="Bearer $fundingToken"} -ContentType 'application/json; charset=utf-8' -Body $fundingBytes -TimeoutSec 60
}
function Get-FundingTest([string]$Name) {
  $fundingTest = Get-Content -Raw -LiteralPath (Join-Path $fundingRoot "supabase/tests/$Name")
  $fundingHarness = @'
create temporary table checkpoint_tap_results(tap text);
grant all on checkpoint_tap_results to authenticated, anon, service_role;
create function pg_temp.checkpoint_assert_tap() returns trigger language plpgsql as $$ begin
  if new.tap like 'not ok%' or new.tap like '# Looks like%' then raise exception 'Checkpoint assertion failed: %',new.tap; end if;
  return new;
end $$;
create trigger checkpoint_fail_fast before insert on checkpoint_tap_results
for each row execute function pg_temp.checkpoint_assert_tap();
'@
  $fundingTest = $fundingTest -replace '(?m)^begin;\s*',("begin;`n"+$fundingHarness.Replace('$','$$')+"`n")
  $fundingTest = $fundingTest -replace '(?im)^select (is\(|isnt\(|ok\(|throws_ok\(|lives_ok\(|policies_are\(|is_definer\(|function_privs_are\(|has_[a-z_]+\(|col_[a-z_]+\(|table_[a-z_]+\()', 'insert into checkpoint_tap_results(tap) select $1'
  $fundingTest = $fundingTest -replace '(?im)^select \* from finish\(\);', 'insert into checkpoint_tap_results(tap) select * from finish();'
  return ($fundingTest -replace '(?im)^rollback;', "select count(*) as passed_assertions from checkpoint_tap_results where tap like 'ok%';`nrollback;")
}
try {
  if ($Mode -eq 'Inspect') {
    $fundingProject = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$fundingRef" -Headers @{Authorization="Bearer $fundingToken"} -TimeoutSec 30
    if ($fundingProject.id -ne $fundingRef -or $fundingProject.name -ne 'zero-loss-app') { throw 'Project identity mismatch; stop.' }
    [pscustomobject]@{project=$fundingProject.name;reference=$fundingProject.id;region=$fundingProject.region;status=$fundingProject.status;environment='User-confirmed development/test'} | ConvertTo-Json
    Invoke-FundingQuery @'
select (select count(*) from auth.users) as accounts, (select count(*) from public.ledger_entries) as ledger_rows,
 (select count(*) from public.wallet_accounts) as wallets,
 (select count(*) from public.demo_funding_sessions) as requests,
 (select count(*) from public.demo_payment_accounts) as enrollments,
 (select n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto') as pgcrypto_schema,
 (select bool_and(u.email_confirmed_at is not null and c.status='active' and c.verification_status='email_verified')
  from auth.users u join public.customers c on c.id=u.id where lower(u.email)='cpptorrents@gmail.com') as reviewer_eligible,
 (select count(*) from public.customer_profiles where avatar_reference is not null) as saved_photos;
'@ | ConvertTo-Json
  } elseif ($Mode -in @('DryRun','Test')) {
    $fundingMigration = Get-Content -Raw -LiteralPath (Join-Path $fundingRoot 'supabase/migrations/20260914233000_verified_demo_funding.sql')
    foreach ($fundingTestName in @('customer_profiles_write_path_test.sql','wallet_account_isolation_test.sql','verified_demo_funding_test.sql')) {
      $fundingSql = Get-FundingTest $fundingTestName
      if ($Mode -eq 'DryRun') {
        $fundingBody = $fundingMigration -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
        $fundingSql = "begin;`n" + $fundingBody + "`n" + ($fundingSql -replace '(?m)^begin;\s*$','')
      }
      $fundingResult = Invoke-FundingQuery $fundingSql
      [pscustomobject]@{test=$fundingTestName;mode=$Mode;result=$fundingResult;fixtures='rolled back'} | ConvertTo-Json -Depth 5
    }
  } elseif ($Mode -eq 'Apply') {
    $fundingSource = Get-Content -Raw -LiteralPath (Join-Path $fundingRoot 'supabase/migrations/20260914233000_verified_demo_funding.sql')
    $fundingBody = $fundingSource -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
    $fundingSql = @'
begin;
set local lock_timeout = '5s';
set local statement_timeout = '45s';
do $$ begin
 if (select count(*) from auth.users) <> 4 or exists(select 1 from public.ledger_entries)
    or exists(select 1 from public.demo_payment_accounts) or exists(select 1 from public.demo_funding_sessions)
    or to_regnamespace('demo_private') is not null then raise exception 'Preflight changed; inspect before applying'; end if;
 if not exists(select 1 from supabase_migrations.schema_migrations where version='20260914130000') then raise exception 'Checkpoint one missing'; end if;
end $$;
'@
    $fundingSql += "`n" + $fundingBody + "`n"
    if ($fundingSource.Contains('$funding_source$')) { throw 'SQL delimiter collision' }
    $fundingSql += 'insert into supabase_migrations.schema_migrations(version,name,statements) values (''20260914233000'',''verified_demo_funding'',ARRAY[$funding_source$' + $fundingSource + '$funding_source$]);'
    $fundingSql += "`ncommit; select 'Installed; funding remains disabled until explicit enrollment' as result;"
    Invoke-FundingQuery $fundingSql | ConvertTo-Json
  } elseif ($Mode -eq 'Enable') {
    Invoke-FundingQuery @'
begin;
do $$ declare v_uid uuid; v_wallet uuid; begin
 select u.id into strict v_uid from auth.users u join public.customers c on c.id=u.id
 where lower(u.email)='cpptorrents@gmail.com' and u.email_confirmed_at is not null
   and c.status='active' and c.verification_status='email_verified';
 if exists(select 1 from public.ledger_entries where wallet_scope='production') then raise exception 'Unexpected production history; stop'; end if;
 select id into v_wallet from public.wallet_accounts where customer_id=v_uid and scope='demo' and closed_at is null;
 if v_wallet is null then perform public.start_demo_wallet_run(v_uid,'checkpoint_two_review_20260914'); end if;
 update public.demo_payment_accounts set funding_enabled=true where customer_id=v_uid and enabled;
 if not found then raise exception 'Enrollment disabled; stop'; end if;
 update demo_private.funding_config set enabled=true where singleton;
end $$;
commit;
select 'Only the confirmed reviewer is enabled; no funding credit created' as result;
'@ | ConvertTo-Json
  } elseif ($Mode -in @('ConcurrentPrepare','ConcurrentAccept')) {
    # Bounded $1 test on the explicitly approved reviewer. Six independent
    # transactions use ONE durable request key. No users/history are deleted.
    $fundingConcurrentBase = @'
begin;
set local statement_timeout='15s';
select set_config('request.jwt.claim.sub',(select id::text from auth.users where lower(email)='cpptorrents@gmail.com' and email_confirmed_at is not null),true);
set local role authenticated;
select pg_sleep(0.25);
'@
    if ($Mode -eq 'ConcurrentPrepare') {
      $fundingStages = @(
        "select pg_backend_pid() as backend, (public.create_demo_funding_session(100,'checkpoint_two_timeout_20260914')).id as session_id; commit;",
        "select pg_backend_pid() as backend, (public.simulate_demo_payment((public.create_demo_funding_session(100,'checkpoint_two_timeout_20260914')).id)->>'body')::jsonb->>'eventId' as event_id; commit;"
      )
    } else {
      $fundingStages = @(@'
with receipt as materialized (select public.simulate_demo_payment((public.create_demo_funding_session(100,'checkpoint_two_timeout_20260914')).id) as r)
select pg_backend_pid() as backend,public.accept_demo_payment_event(r->>'body',r->>'signature') as accepted from receipt;
commit;
'@)
    }
    foreach ($fundingStage in $fundingStages) {
      $fundingConcurrentSql = $fundingConcurrentBase + "`n" + $fundingStage
      $fundingConcurrentResults = 1..6 | ForEach-Object -Parallel {
        $fundingPost = [System.Text.Encoding]::UTF8.GetBytes((@{query=$using:fundingConcurrentSql} | ConvertTo-Json -Compress))
        Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$using:fundingRef/database/query" -Headers @{Authorization="Bearer $using:fundingToken"} -ContentType 'application/json; charset=utf-8' -Body $fundingPost -TimeoutSec 30
      } -ThrottleLimit 6
      $fundingConcurrentResults | ConvertTo-Json -Depth 6
    }
  } else {
    Invoke-FundingQuery @'
select (select count(*) from public.ledger_entries where wallet_scope='production') as production_postings,
 (select count(*) from public.ledger_entries where wallet_scope='demo') as demo_postings,
 (select coalesce(sum(amount),0) from public.ledger_entries where wallet_scope='demo') as demo_total_cents,
 (select count(*) from public.demo_payment_accounts where funding_enabled and enabled) as enabled_accounts,
 (select count(*) from demo_private.provider_receipts) as provider_receipts,
 (select count(*) from demo_private.accepted_events) as accepted_events,
 (select count(*) from public.demo_funding_sessions where status<>'succeeded') as unresolved_requests,
 (select count(*) from public.customer_profiles where avatar_reference is not null) as saved_photos,
 has_function_privilege('anon','public.accept_demo_payment_event(text,text)','execute') as anonymous_event_access,
 has_table_privilege('authenticated','demo_private.provider_receipts','select') as client_receipt_table_access,
 has_table_privilege('service_role','public.ledger_entries','insert') as service_direct_ledger_insert;
'@ | ConvertTo-Json
  }
} finally { Remove-Variable fundingToken -ErrorAction SilentlyContinue }
