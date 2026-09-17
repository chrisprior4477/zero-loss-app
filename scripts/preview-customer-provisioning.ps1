param([ValidateSet('Inspect','DryRun','Apply','Test','Verify','Concurrent')][string]$Mode = 'Inspect')
$ErrorActionPreference = 'Stop'
$provisioningRoot = Split-Path $PSScriptRoot
$provisioningRef = 'ocgdfnvvjvutevgqzzgj'
$provisioningIssuer = "https://$provisioningRef.supabase.co/auth/v1"
$provisioningToken = $null
Get-Content -LiteralPath (Join-Path $provisioningRoot '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $provisioningToken = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$provisioningToken) { throw 'Management credential is unavailable (value not logged).' }

function Invoke-ProvisioningQuery([string]$Sql) {
  $provisioningBytes = [System.Text.Encoding]::UTF8.GetBytes((@{query=$Sql} | ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$provisioningRef/database/query" `
    -Headers @{Authorization="Bearer $provisioningToken"} -ContentType 'application/json; charset=utf-8' `
    -Body $provisioningBytes -TimeoutSec 90
}

function Assert-ProvisioningProject {
  $provisioningProject = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$provisioningRef" `
    -Headers @{Authorization="Bearer $provisioningToken"} -TimeoutSec 30
  if ($provisioningProject.id -ne $provisioningRef -or $provisioningProject.name -ne 'zero-loss-app') {
    throw 'Project identity mismatch; stop.'
  }
  return $provisioningProject
}

function Get-ProvisioningTest {
  $provisioningTest = Get-Content -Raw -LiteralPath (Join-Path $provisioningRoot 'supabase/tests/preview_customer_provisioning_test.sql')
  $provisioningHarness = @'
create temporary table checkpoint_tap_results(tap text);
grant all on checkpoint_tap_results to authenticated, anon, service_role;
create function pg_temp.checkpoint_assert_tap() returns trigger language plpgsql as $$ begin
  if new.tap like 'not ok%' or new.tap like '# Looks like%' then raise exception 'Checkpoint assertion failed: %',new.tap; end if;
  return new;
end $$;
create trigger checkpoint_fail_fast before insert on checkpoint_tap_results
for each row execute function pg_temp.checkpoint_assert_tap();
'@
  $provisioningTest = $provisioningTest -replace '(?m)^begin;\s*',("begin;`n"+$provisioningHarness.Replace('$','$$')+"`n")
  $provisioningTest = $provisioningTest -replace '(?im)^select (is\(|isnt\(|ok\(|throws_ok\(|lives_ok\(|policies_are\(|is_definer\(|function_privs_are\(|has_[a-z_]+\(|col_[a-z_]+\(|table_[a-z_]+\()', 'insert into checkpoint_tap_results(tap) select $1'
  $provisioningTest = $provisioningTest -replace '(?im)^select \* from finish\(\);', 'insert into checkpoint_tap_results(tap) select * from finish();'
  return ($provisioningTest -replace '(?im)^rollback;', "select count(*) as passed_assertions from checkpoint_tap_results where tap like 'ok%';`nrollback;")
}

try {
  $provisioningProject = Assert-ProvisioningProject
  if ($Mode -eq 'Inspect') {
    [pscustomobject]@{project=$provisioningProject.name;reference=$provisioningProject.id;region=$provisioningProject.region;status=$provisioningProject.status;environment='development-test'} | ConvertTo-Json
    Invoke-ProvisioningQuery @'
select exists(select 1 from supabase_migrations.schema_migrations where version='20260917150000') as migration_applied,
  (select count(*) from auth.users where email_confirmed_at is not null) as confirmed_accounts,
  (select count(*) from public.wallet_accounts where scope='demo' and closed_at is null) as open_demo_wallets,
  (select count(*) from public.demo_payment_accounts where enabled and funding_enabled) as funding_accounts,
  (select count(*) from public.ledger_entries) as ledger_rows;
'@ | ConvertTo-Json
  } elseif ($Mode -eq 'DryRun') {
    $provisioningMigration = Get-Content -Raw -LiteralPath (Join-Path $provisioningRoot 'supabase/migrations/20260917150000_preview_customer_provisioning.sql')
    $provisioningBody = $provisioningMigration -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
    $provisioningTest = Get-ProvisioningTest
    $provisioningSql = "begin;`n" + $provisioningBody + "`n" + ($provisioningTest -replace '(?m)^begin;\s*$','')
    Invoke-ProvisioningQuery $provisioningSql | ConvertTo-Json -Depth 6
  } elseif ($Mode -eq 'Apply') {
    $provisioningSource = Get-Content -Raw -LiteralPath (Join-Path $provisioningRoot 'supabase/migrations/20260917150000_preview_customer_provisioning.sql')
    $provisioningBody = $provisioningSource -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
    if ($provisioningSource.Contains('$provisioning_source$')) { throw 'SQL delimiter collision' }
    $provisioningSql = @'
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $$ begin
  if exists(select 1 from supabase_migrations.schema_migrations where version='20260917150000') then
    raise exception 'Provisioning migration is already applied';
  end if;
  if not exists(select 1 from supabase_migrations.schema_migrations where version='20260914233000') then
    raise exception 'Verified funding checkpoint is missing';
  end if;
end $$;
create temporary table provisioning_before on commit drop as
select u.id, u.email, u.email_confirmed_at,
  (select to_jsonb(cp) from public.customer_profiles cp where cp.customer_id=u.id) as profile_record,
  (select count(*) from public.wallet_accounts w where w.customer_id=u.id) as wallet_count,
  (select count(*) from public.wallet_accounts w where w.customer_id=u.id and w.scope='demo' and w.closed_at is null) as open_demo_wallet_count,
  (select count(*) from public.ledger_entries l where l.customer_id=u.id) as ledger_count,
  (select coalesce(sum(l.amount),0) from public.ledger_entries l where l.customer_id=u.id and l.wallet_scope='demo') as demo_balance,
  (select count(*) from public.demo_funding_sessions s where s.customer_id=u.id) as funding_count
from auth.users u;
'@
    $provisioningSql += "`n" + $provisioningBody + "`n"
    $escapedIssuer = $provisioningIssuer.Replace("'", "''")
    $provisioningSql += "update demo_private.funding_config set enabled=true, preview_provisioning_enabled=true, preview_issuer='$escapedIssuer' where singleton and environment='development-test';`n"
    $provisioningSql += @'
select demo_private.ensure_preview_customer_for(id)
from auth.users where email_confirmed_at is not null order by id;
do $$ declare r record; begin
  for r in select * from provisioning_before loop
    if r.email_confirmed_at is not null then
      if (select count(*) from public.wallet_accounts where customer_id=r.id and scope='demo' and closed_at is null) <> 1 then
        raise exception 'Confirmed customer % does not have exactly one open preview wallet',r.id;
      end if;
      if not exists(select 1 from public.demo_payment_accounts where customer_id=r.id and enabled and funding_enabled) then
        raise exception 'Confirmed customer % cannot fund',r.id;
      end if;
    end if;
    if (select count(*) from public.ledger_entries where customer_id=r.id) <> r.ledger_count
      or (select coalesce(sum(amount),0) from public.ledger_entries where customer_id=r.id and wallet_scope='demo') <> r.demo_balance
      or (select count(*) from public.demo_funding_sessions where customer_id=r.id) <> r.funding_count then
      raise exception 'Financial history changed during provisioning for %',r.id;
    end if;
    if (select to_jsonb(cp) from public.customer_profiles cp where cp.customer_id=r.id) is distinct from r.profile_record then
      raise exception 'Profile changed during provisioning for %',r.id;
    end if;
  end loop;
end $$;
'@
    $provisioningSql += "insert into supabase_migrations.schema_migrations(version,name,statements) values ('20260917150000','preview_customer_provisioning',ARRAY[`$provisioning_source`$" + $provisioningSource + "`$provisioning_source`$]);`n"
    $provisioningSql += "commit; select 'Installed, activated for the verified preview issuer, and backfilled confirmed customers' as result;"
    Invoke-ProvisioningQuery $provisioningSql | ConvertTo-Json -Depth 6
  } elseif ($Mode -eq 'Test') {
    Invoke-ProvisioningQuery (Get-ProvisioningTest) | ConvertTo-Json -Depth 6
  } elseif ($Mode -eq 'Concurrent') {
    $provisioningTarget = Invoke-ProvisioningQuery @'
select u.id::text as id
from auth.users u
where u.email_confirmed_at is not null
  and not exists(select 1 from public.ledger_entries l where l.customer_id=u.id)
order by u.created_at limit 1;
'@
    if (!$provisioningTarget -or !$provisioningTarget[0].id) { throw 'No clean confirmed account is available for the concurrency check.' }
    $provisioningUserId = $provisioningTarget[0].id
    $provisioningConcurrentSql = @"
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','$provisioningUserId',true);
select set_config('request.jwt.claims','{"sub":"$provisioningUserId","iss":"$provisioningIssuer"}',true);
select (public.ensure_preview_customer()->>'walletAccountId') as wallet_id;
commit;
"@
    $provisioningConcurrentResults = 1..6 | ForEach-Object -Parallel {
      $provisioningPost = [System.Text.Encoding]::UTF8.GetBytes((@{query=$using:provisioningConcurrentSql} | ConvertTo-Json -Compress))
      Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$using:provisioningRef/database/query" `
        -Headers @{Authorization="Bearer $using:provisioningToken"} -ContentType 'application/json; charset=utf-8' `
        -Body $provisioningPost -TimeoutSec 30
    } -ThrottleLimit 6
    [pscustomobject]@{requests=6;all_requests_succeeded=$true} | ConvertTo-Json -Depth 4
    Invoke-ProvisioningQuery "select count(*) as open_wallets from public.wallet_accounts where customer_id='$provisioningUserId' and scope='demo' and closed_at is null;" | ConvertTo-Json
  } else {
    Invoke-ProvisioningQuery @'
select left(split_part(u.email,'@',1),2)||'***@'||split_part(u.email,'@',2) as account,
  u.email_confirmed_at is not null as confirmed,
  cp.display_name,
  cp.avatar_reference is not null as has_avatar,
  (select count(*) from public.wallet_accounts w where w.customer_id=u.id and w.scope='demo' and w.closed_at is null) as open_demo_wallets,
  (select coalesce(sum(l.amount),0) from public.ledger_entries l where l.customer_id=u.id and l.wallet_scope='demo') as balance_cents,
  (select count(*) from public.ledger_entries l where l.customer_id=u.id and l.wallet_scope='demo') as ledger_rows,
  (select count(*) from public.demo_funding_sessions s where s.customer_id=u.id) as funding_requests,
  exists(select 1 from public.demo_payment_accounts a where a.customer_id=u.id and a.enabled and a.funding_enabled) as funding_available
from auth.users u
left join public.customer_profiles cp on cp.customer_id=u.id
order by u.created_at,u.id;
'@ | ConvertTo-Json -Depth 6
  }
} finally { Remove-Variable provisioningToken -ErrorAction SilentlyContinue }
