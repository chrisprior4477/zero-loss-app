# Read-only reconciliation of the September 24 hosted demo walkthrough.
$ErrorActionPreference = 'Stop'
$purchaseRef = 'ocgdfnvvjvutevgqzzgj'
$purchaseToken = $null
Get-Content -LiteralPath (Join-Path (Split-Path $PSScriptRoot) '.env.local') | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$') { $purchaseToken = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (!$purchaseToken) { throw 'Management credential unavailable (not logged).' }
try {
  $purchaseProject = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$purchaseRef" -Headers @{ Authorization="Bearer $purchaseToken" } -TimeoutSec 30
  if ($purchaseProject.id -ne $purchaseRef -or $purchaseProject.name -ne 'zero-loss-app') { throw 'Project identity mismatch.' }
  $purchaseSql = @'
begin read only;
do $guard$ begin
  if not coalesce((select environment='development-test' and preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1' from demo_private.funding_config where singleton),false) then raise exception 'Demo environment mismatch'; end if;
end $guard$;
select e.entry_id,e.offering_slug,e.amount as entry_cents,
  c.id as option_id,demo_private.option_status(c.id) as option_status,
  r.id as reward_id,o.order_number,o.total_cents as purchase_cents,
  (select count(*) from public.ledger_entries l where l.source_event=o.provider_event_id and l.entry_type='PURCHASE_DEBIT') as purchase_debits,
  (select sum(amount) from public.ledger_entries where customer_id=e.customer_id and balance_type='PLAYABLE') as owner_playable_cents
from public.customer_entries e
left join public.completion_options c on c.customer_entry_id=e.id
left join public.customer_rewards r on r.customer_entry_id=e.id
left join public.customer_orders o on o.reward_id=r.id
where e.customer_id='a7cb965c-0041-4267-8c1c-829cd75bfba0'
  and e.offering_slug in ('babys-essentials-bundle','nike-court-shot-shoes')
  and e.created_at>='2026-09-24T00:00:00Z' and e.created_at<'2026-09-25T00:00:00Z'
order by e.created_at;
commit;
'@
  $purchaseBytes = [Text.Encoding]::UTF8.GetBytes((@{ query=$purchaseSql } | ConvertTo-Json -Compress))
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$purchaseRef/database/query" -Headers @{ Authorization="Bearer $purchaseToken" } -ContentType 'application/json; charset=utf-8' -Body $purchaseBytes -TimeoutSec 30 | ConvertTo-Json -Depth 5
} finally { Remove-Variable purchaseToken -ErrorAction SilentlyContinue }
