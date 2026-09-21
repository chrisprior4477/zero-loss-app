param([ValidateSet('Inspect','DryRun','Apply','Test')][string]$Mode = 'Inspect')
$ErrorActionPreference = 'Stop'
$rewardRoot = Split-Path $PSScriptRoot
$rewardRef = 'ocgdfnvvjvutevgqzzgj'
$rewardVersion = '20260921233000'
$rewardName = 'reward_access_and_order_links'
$rewardToken = $null
Get-Content -LiteralPath (Join-Path $rewardRoot '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $rewardToken = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$rewardToken) { throw 'Management credential unavailable (value not logged).' }
function Invoke-RewardQuery([string]$Sql) {
  $rewardBytes = [Text.Encoding]::UTF8.GetBytes((@{ query=$Sql } | ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$rewardRef/database/query" -Headers @{ Authorization="Bearer $rewardToken" } -ContentType 'application/json; charset=utf-8' -Body $rewardBytes -TimeoutSec 120
}
try {
  $rewardProject = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$rewardRef" -Headers @{ Authorization="Bearer $rewardToken" } -TimeoutSec 30
  if ($rewardProject.id -ne $rewardRef -or $rewardProject.name -ne 'zero-loss-app') { throw 'Project identity mismatch.' }
  $rewardEnvironment = Invoke-RewardQuery "select environment,preview_issuer from demo_private.funding_config where singleton;"
  if ($rewardEnvironment.environment -ne 'development-test' -or $rewardEnvironment.preview_issuer -ne "https://$rewardRef.supabase.co/auth/v1") { throw 'Development-test environment mismatch.' }
  if ($Mode -eq 'Inspect') {
    Invoke-RewardQuery @'
begin read only;
select exists(select 1 from supabase_migrations.schema_migrations where version='20260921233000') as applied,
  (select count(*) from public.customer_rewards) as rewards,
  (select count(*) from public.reward_events) as reward_events,
  (select count(*) from demo_private.reward_credentials) as credentials,
  (select count(*) from public.customer_orders) as orders,
  (select count(*) from public.ledger_entries) as ledger_entries,
  (select sum(amount) from public.ledger_entries where customer_id='a7cb965c-0041-4267-8c1c-829cd75bfba0' and balance_type='PLAYABLE') as owner_playable_cents;
commit;
'@ | ConvertTo-Json
    return
  }
  $rewardTest = [string](Get-Content -Raw -LiteralPath (Join-Path $rewardRoot 'supabase/tests/reward_access_test.sql'))
  $rewardTest = $rewardTest -replace '(?m)^begin;\s*$',"begin;`ncreate temporary table reward_tap(line text) on commit drop;`ngrant insert,select on reward_tap to authenticated;"
  $rewardTest = $rewardTest -replace '(?m)^select (is|isnt|ok|throws_ok|lives_ok)\(', 'insert into reward_tap select $1('
  $rewardTest = $rewardTest.Replace('select line from reward_access_checks;','insert into reward_tap select line from reward_access_checks;')
  $rewardTest = $rewardTest.Replace('select * from finish();',@'
insert into reward_tap select * from finish();
do $tap$ begin
  if not exists(select 1 from reward_tap where line like 'ok %')
    or exists(select 1 from reward_tap where line like 'not ok %') then
    raise exception 'Reward access regression failed';
  end if;
end $tap$;
select count(*) filter(where line like 'ok %') as passed,
  count(*) filter(where line like 'not ok %') as failed,jsonb_agg(line) as assertions from reward_tap;
'@)
  if ($Mode -eq 'Test') { Invoke-RewardQuery $rewardTest | ConvertTo-Json -Depth 6; return }
  $rewardSource = ([string](Get-Content -Raw -LiteralPath (Join-Path $rewardRoot "supabase/migrations/${rewardVersion}_${rewardName}.sql"))).Replace("`r`n","`n")
  if ($rewardSource.Contains('$reward_source$')) { throw 'SQL delimiter collision.' }
  $rewardBody = $rewardSource -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
  $rewardGuard = @'
begin;
set local lock_timeout='5s';
set local statement_timeout='90s';
do $guard$ begin
  if exists(select 1 from supabase_migrations.schema_migrations where version='20260921233000') then
    raise exception 'Reward access migration already installed';
  end if;
  if not coalesce((select environment='development-test' and preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1'
    from demo_private.funding_config where singleton),false) then raise exception 'Demo environment mismatch'; end if;
end $guard$;
'@
  if ($Mode -eq 'DryRun') {
    Invoke-RewardQuery ($rewardGuard + "`n" + $rewardBody + "`n" + ($rewardTest -replace '(?m)^begin;\s*$','')) | ConvertTo-Json -Depth 6
  } else {
    Invoke-RewardQuery ($rewardGuard + "`n" + $rewardBody + "`ninsert into supabase_migrations.schema_migrations(version,name,statements) values ('$rewardVersion','$rewardName',ARRAY[`$reward_source`$$rewardSource`$reward_source`$]);`ncommit;") | ConvertTo-Json
  }
} finally { Remove-Variable rewardToken -ErrorAction SilentlyContinue }
