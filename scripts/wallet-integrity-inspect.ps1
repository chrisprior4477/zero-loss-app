$ErrorActionPreference = 'Stop'
$auditRoot = Split-Path $PSScriptRoot
$auditRef = 'ocgdfnvvjvutevgqzzgj'
$auditToken = $null
Get-Content -LiteralPath (Join-Path $auditRoot '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $auditToken = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$auditToken) { throw 'Management credential unavailable (value not logged).' }
try {
  $auditProject = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$auditRef" -Headers @{Authorization="Bearer $auditToken"} -TimeoutSec 30
  if ($auditProject.id -ne $auditRef -or $auditProject.name -ne 'zero-loss-app') { throw 'Project identity mismatch.' }
  $auditSql = Get-Content -Raw -LiteralPath (Join-Path $auditRoot 'supabase/tests/inspection/wallet_integrity.sql')
  $auditBody = [System.Text.Encoding]::UTF8.GetBytes((@{query=$auditSql} | ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$auditRef/database/query" -Headers @{Authorization="Bearer $auditToken"} -ContentType 'application/json; charset=utf-8' -Body $auditBody -TimeoutSec 60 | ConvertTo-Json -Depth 12
} finally { Remove-Variable auditToken -ErrorAction SilentlyContinue }
