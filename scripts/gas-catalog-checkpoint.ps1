param([ValidateSet('Inspect','DryRun','Apply','Verify')][string]$Mode = 'Inspect')
$ErrorActionPreference = 'Stop'
$gasRoot = Split-Path $PSScriptRoot
$gasRef = 'ocgdfnvvjvutevgqzzgj'
$gasVersion = '20260918234500'
$gasPreviousVersion = '20260918233000'
$gasToken = $null

Get-Content -LiteralPath (Join-Path $gasRoot '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $gasToken = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$gasToken) { throw 'Management credential is unavailable (value not logged).' }

function Invoke-GasQuery([string]$Sql) {
  $gasBytes = [System.Text.Encoding]::UTF8.GetBytes((@{query=$Sql} | ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$gasRef/database/query" `
    -Headers @{Authorization="Bearer $gasToken"} -ContentType 'application/json; charset=utf-8' `
    -Body $gasBytes -TimeoutSec 120
}

function Assert-GasProject {
  $gasProject = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$gasRef" `
    -Headers @{Authorization="Bearer $gasToken"} -TimeoutSec 30
  if ($gasProject.id -ne $gasRef -or $gasProject.name -ne 'zero-loss-app') { throw 'Project identity mismatch; stop.' }
  return $gasProject
}

function Get-GasMigrationSql {
  Get-Content -Raw -LiteralPath (Join-Path $gasRoot "supabase/migrations/${gasVersion}_add_gas_preview_offerings.sql")
}

try {
  $gasProject = Assert-GasProject
  if ($Mode -eq 'Inspect') {
    [pscustomobject]@{project=$gasProject.name;reference=$gasProject.id;region=$gasProject.region;status=$gasProject.status} | ConvertTo-Json
    Invoke-GasQuery @"
select
  exists(select 1 from supabase_migrations.schema_migrations where version='$gasVersion') as migration_applied,
  (select count(*) from demo_private.preview_entry_offerings where slug in (
    'bp-100-gift-card','pilot-flying-j-150-gift-card','sheetz-75-gift-card','speedway-50-gift-card'
  )) as gas_offerings;
"@ | ConvertTo-Json
  } elseif ($Mode -eq 'DryRun') {
    $gasBody = (Get-GasMigrationSql) -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
    Invoke-GasQuery "begin; set local lock_timeout='5s'; set local statement_timeout='30s'; $gasBody rollback;" | ConvertTo-Json -Depth 6
  } elseif ($Mode -eq 'Apply') {
    $gasSource = Get-GasMigrationSql
    if ($gasSource.Contains('$gas_source$')) { throw 'SQL delimiter collision.' }
    $gasBody = $gasSource -replace '(?m)^begin;\s*$','' -replace '(?m)^commit;\s*$',''
    $gasSql = @"
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do `$$ begin
  if not exists(select 1 from supabase_migrations.schema_migrations where version='$gasPreviousVersion') then raise exception 'Previous checkpoint is missing'; end if;
  if exists(select 1 from supabase_migrations.schema_migrations where version='$gasVersion') then raise exception 'Gas catalog migration is already applied'; end if;
end `$$;
$gasBody
insert into supabase_migrations.schema_migrations(version,name,statements)
values ('$gasVersion','add_gas_preview_offerings',ARRAY[`$gas_source`$$gasSource`$gas_source`$]);
commit;
"@
    Invoke-GasQuery $gasSql | ConvertTo-Json -Depth 6
  } else {
    Invoke-GasQuery @"
select slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,active
from demo_private.preview_entry_offerings
where slug in ('bp-100-gift-card','pilot-flying-j-150-gift-card','sheetz-75-gift-card','speedway-50-gift-card')
order by slug;
"@ | ConvertTo-Json -Depth 6
  }
} finally {
  Remove-Variable gasToken -ErrorAction SilentlyContinue
}
