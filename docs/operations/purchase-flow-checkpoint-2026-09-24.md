# Purchase confirmation and recovery — September 24, 2026

## Scope

Approved continuation of MVP click-through checks: exact purchase-to-reward navigation,
duplicate submission / interrupted responses, and mobile confirmation usability.
No changes to How It Works, legal pages, showcase outcomes, refund policy, provider
selection, or existing customer records. No database migration was needed: the
existing completion-option, order, reward and Ledger interfaces remain authoritative.

## Repairs

- Replaced the native browser confirmation with an inline confirmation in the existing
  activity dialog. Shows retailer gift-card value, already-applied entry amount and
  exact remaining charge. Explicit confirmation and Cancel remain; Escape cancels
  the confirmation. Uses the main-site navy/cyan/green styling without redesigning
  the activity page.
- Synchronous submission guard plus pending controls prevent accidental duplicate
  dispatch. The server retains the same option-bound idempotency key; Supabase still
  authorizes ownership, balance and option availability under its existing lock.
- Purchase transport failures or malformed responses never claim that no purchase
  occurred. The controls require a full authoritative status reload before retry;
  completed entry URLs resolve to their exact reward. No automatic purchase retry.
- Valid success receipts open the exact reward. Legacy duplicate receipts resolve
  through the owner's activity projection; Orders is the safe fallback if that
  lookup fails. No client-supplied redirect, price or customer identity is trusted.
- Insufficient funds exposes Add funds with the exact entry reference. The wallet
  supplies an owner-validated return link to that option; duplicate-product entries
  cannot substitute for it. Login preserves the selector. Foreign or ambiguous
  selectors receive a recovery link, not another customer's details.

## Pre-release verification

- 564 application tests / 76 files passed, including confirmation, Cancel/Escape,
  duplicate click, lost response, exact success receipt, low-balance navigation,
  legacy duplicate receipts and owner-scoped funding return.
- TypeScript, changed-file ESLint and production build passed. The initial sandboxed
  build could not reach Google Fonts; the network-enabled build passed unchanged.
- 462 local rollback-only database assertions passed.
- Five new independent-session local checks passed: simultaneous same-key purchase,
  same option with different keys, competing options spending one balance,
  purchase-versus-decline race, and ownership / lost-response replay.
  New local-only test records are retained under
  `purchase-audit-93b01d7e843540338feb89a74f43e4f9`; existing records were not reset.

## Hosted baseline and test effects

- Before test: 4 rewards, 4 reward events, 4 credentials, 2 orders, 49 Ledger rows;
  owner playable balance $193.
- One private $1 baby-bundle entry was submitted through the customer interface:
  `ent_17234713facd4074a0dd35fd8b69b1c8`. The 30-second Undo window completed.
- The old native confirmation stalled browser automation. Later observation and
  database inspection confirmed the $99 purchase completed, creating exact reward
  `8800691b-6021-4044-9caf-66029b4519cd`. Do not repeat this purchase as a retry.
- After purchase: 5 rewards, 5 reward events, 5 credentials, 3 orders, 53 Ledger rows;
  owner playable balance $93. The $100 sample Walmart reward is visible at its
  exact saved URL. No real payment, redeemable value or shipment.
- Updated desktop/mobile UI and hosted insufficient-funds return-path verification
  remain to be recorded after deployment; do not treat automated tests as that proof.

Production payment/fulfillment provider behavior remains outside this demo check.
