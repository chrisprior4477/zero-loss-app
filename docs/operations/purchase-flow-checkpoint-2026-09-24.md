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
- Opening confirmation scrolls the entire confirmation into view, not just its
  heading. Errors scroll their recovery link into view as well. This was refined
  after the first hosted mobile check left the buttons below the visible area.

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
- A second private $1 baby-bundle entry was finalized:
  `ent_bd08a195bf2a435bb0fd73b5403d07ca`. With $92 remaining, confirming its $99
  option correctly returned the insufficient-balance message. Its option remains
  available, with no order, reward or purchase debit.
- A private $1 shoes entry was finalized:
  `ent_8470febdea2b431fa05ac3a07da60af9`. The new explicit **Confirm $74 purchase**
  control completed successfully and opened exact sample reward
  `bc9b02a6-9888-49b5-a84c-f89919643cf5`, order
  `ord_c487f07fc85442a2a068071a7544bd19`. Exactly one purchase debit was recorded.
- Final owner playable balance: **$17**. Total test use: **$176 demo only**
  (three $1 entries, one $99 purchase and one $74 purchase). No demo funds were
  added. All records remain saved; the original TV reward and repeatable showcase
  cases were preserved.

## Final hosted verification

- Code commits: `3f377e5` (confirmation/recovery), `a710c56` (visibility refinement).
  Both pushed to `openai-homepage-experiment`; main and production untouched.
- Vercel build `zero-loss-3oa4aagjt-zero-loss.vercel.app` verified Ready for
  `a710c56`, then assigned to the existing experiment alias:
  `zero-loss-app-git-openai-homepage-experiment-zero-loss.vercel.app`.
- At 390 x 844, the gift-card value, remaining charge, Confirm and Cancel are
  visible together. Insufficient-balance text and Add funds are also visible
  without manual scrolling. Desktop confirmation verified too; temporary browser
  viewport override reset afterward.
- Escape and Cancel both restore the original purchase controls without submitting.
- Insufficient funds -> Add funds -> Back to purchase option returns to the exact
  second baby-bundle entry, not the already purchased entry for the same product.
  No funding/password step was needed to test this navigation.
- Successful shoes confirmation opened the saved reward directly. Following its
  original entry link and reloading kept the same reward, not a new checkout.
  The first baby-bundle reward was likewise checked after reload/old-entry access.
- Read-only hosted reconciliation confirmed one purchase debit for each purchased
  option, zero for the rejected low-balance option, and the expected $17 balance.
- After the visibility refinement, all six confirmation component tests and lint
  passed again; the final Vercel production build and type check passed.

Production payment/fulfillment provider behavior remains outside this demo check.
