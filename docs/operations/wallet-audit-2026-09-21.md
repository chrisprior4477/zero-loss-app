# Wallet integrity audit — working implementation log

This is an ongoing demo-system audit, not a production-readiness sign-off.

## Owner decisions

- Preserve all sample content and existing financial history. Do not touch How It Works.
- Preserve the sample crowd while ordinary offering purchases decrease displayed availability and use the same database limit.
- Exception explicitly confirmed September 21: the Samsung TV remains a repeatable winning test case; Nike shoes and the baby bundle remain repeatable non-selected/completion-purchase test cases. Do not retire these examples, create new rounds, or branch the database to accomplish this.
- Only the owner may approve refunds or account-value adjustments. Future support staff can investigate and reply but cannot approve value changes. No new privileged account grants have been made.
- For gifting, select the intended recipient before issuance; original winner stays the winner of record. After issuance, do not promise customer self-service ownership transfer or safe code reassignment. Support review is not a promise that the provider can revoke/reissue a code.
- Owner clarified: deposited funds are not ordinarily withdrawable; exceptional refunds require review, without limiting rights for unauthorized charges or payment errors. Accidental entries should get a 30-second Undo Entry window. Deposit confirmation was approved, using fresh account authentication; this does not prove card ownership or replace issuer authentication. The Undo Entry workflow remains a separate implementation.

## Verified defects and repairs

1. Different customers could simultaneously purchase the last slot. Reproduced locally twice (two saved entries for capacity one). Migration `20260921160000` serializes the offering check; five adversarial concurrency checks now pass. Applied to hosted development-test; 30 existing lifecycle assertions passed in a rollback-only test.
2. A successful multi-entry purchase linked only by product slug and displayed “That activity is not available in your account.” Migration `20260921161500` adds exact entry/reward destinations to the existing batch receipt, including stable destinations on retries. Applied to the hosted demo after 34 rollback-only lifecycle assertions passed. Application links select the exact saved record; old responses safely fall back to the list, not an ambiguous detail.
3. Migration `20260921163000` stores the existing sample baseline and derives ordinary availability from baseline plus saved purchases, enforced under the same exclusive database lock. Applied to hosted demo after 27 rollback-only assertions passed. Item, browse and homepage rails now consume its public aggregate-only snapshot. The three allowlisted repeatable showcase scenarios preserve their sample display and outcomes. Prior history is untouched; ordinary legacy overfilled samples (Dunkin) display full and cannot accept more purchases. Full offerings remain visible after available offerings. A product with unavailable inventory data offers a refresh action instead of submitting against fallback samples.

## Verification checkpoint

- 323 application tests pass; changed application files pass ESLint.
- 257 local database assertions pass, including funding/card storage, wallet isolation, entry lifecycle, completion purchases/reward lifecycle and new availability checks.
- Five separate simultaneous-request tests pass, including two customers competing for one slot after a sample crowd of nine in a capacity-ten pool.
- Production build passes. One pre-existing invalid Testing Library option was removed from a signup navigation test so TypeScript can complete; no signup behavior changed.
- Hosted audit after live verification: 25 saved entries, no entry/debit mismatch, no batch-count mismatch, no funding/credit mismatch, no negative playable wallet.
- Local browser verified Walmart $25 initially showed four remaining after four saved entries, and the three showcase cards still showed one sample slot. Phone-width homepage checked at 390px without page overflow.
- Repair commit `0ee5116` deployed successfully to `https://zero-loss-5v47t2a14-zero-loss.vercel.app`. Verified the build log names that exact commit and `openai-homepage-experiment`. Vercel did not automatically move the existing branch alias; explicitly moved only `zero-loss-app-git-openai-homepage-experiment-zero-loss.vercel.app` to this ready deployment. Main and production aliases were untouched.
- On that live branch alias, a two-entry Walmart purchase opened the exact saved entry details (`ent_0eced5048cdf4960aa012b2ec51487d6`) successfully; closing the panel returned to six active entries. Returning to the product showed two remaining, down from four. The hosted aggregate and ledger reconciliation matched. No unavailable-activity message appeared for the new purchase.

## Test effects in the owner's demo account

- Added $1 simulated funds (not a real card charge).
- Submitted one $1 Walmart $25 gift-card entry, then a three-entry $3 batch, then a two-entry $2 batch after deployment; all private to the account.
- Starting balance $100; added $1 simulated funds and spent $6 on six demo entries. Verified resulting balance $95 and six saved active entries.
- Saved the extra-entry explanation acknowledgment after testing its checkbox and save flow.
- No invitations, real rewards, real payments, or external customer messages were sent.

## Remaining work / release gates

- Repeat/reload handling after an unknown purchase response; stable entry-attempt identity across browser refresh.
- Support currently routes to a placeholder, not a durable case-management workflow. Implement context-linked cases and append-only case events with least-privilege access; value approvals must be separately permissioned and auditable.
- Refund lifecycle, provider exceptions, disputes and financial corrections need durable reason/actor/original-transaction linkage. Demo funding currently exercises success and replay, not a complete external-provider refund lifecycle.
- Gifting requires an auditable recipient designation and issuance lock. Provider-specific eligibility, cancellation and credential handling must be confirmed before enabling real fulfillment.
- No merge to real-money mode or claim that switching off demo mode alone makes the system launch-ready.

## Deposit confirmation checkpoint — September 21

- Main-site-styled, same-page confirmation dialog shows exact amount, sample card, funds-use disclosure, password field and explicit acknowledgment. Cancel/Escape/reopen clears the credential and acknowledgment; submission clears the input after React captures the request. Passwords never enter browser storage, returned action state, logs, or database records.
- Server verifies current account, then reserves a password-check attempt and uses an isolated Supabase Auth session to verify the existing password. The isolated session is locally signed out; the browser session is not replaced. Five attempts per 15 minutes per account supplement Auth rate limits.
- Supabase binds short-lived approval to customer, wallet, request key, cents, USD, test-card token, default preference, policy version and fresh password-authentication session. Each authentication session can authorize one logical deposit. A database trigger gates new funding sessions; retries and existing-session reconciliation retain one original credit. Existing historical payments remain recoverable.
- Authorization evidence is private and immutable apart from its one-time consumption link. Authentication-attempt history is private and append-only. No credentials or card numbers are stored in these records.
- Additive schema migrations `20260921180000`, `20260921181000`, `20260921200000`; separate enforcement migration `20260921201000` must run only after the matching app deploys.
- Verification before rollout: 350 application tests, TypeScript and targeted ESLint pass; 288 local wallet SQL assertions pass, including 31 authorization assertions. All 31 authorization checks also passed against the hosted schema in a rollback-only dry run. Four separate concurrent-request checks pass: same approval, same funding request, one ledger credit, and throttled password attempts. Local concurrency fixtures are retained as audit evidence; no existing demo data was deleted.
- Real-card launch still needs the selected processor's authentication, risk, dispute and refund integration. This account-password check is not cardholder verification or a compliance guarantee. References: [OWASP transaction authorization](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html), [Supabase authentication claims](https://supabase.com/docs/guides/auth/jwt-fields), [Stripe 3-D Secure](https://docs.stripe.com/payments/3d-secure), [FTC charge disputes](https://consumer.ftc.gov/articles/using-credit-cards-and-disputing-charges).

## Provider research (September 21, 2026)

- GiftCard Partners supports recipient delivery and provider-generated claim links, depending on product eligibility. Preserve one order identifier across retries; a timeout must not create a second order with a new identifier. [Orders](https://developers.giftcardpartners.com/docs/orders), [Delivery types](https://developers.giftcardpartners.com/docs/delivery-types).
- Fulfillment can be asynchronous. Treat callbacks as retryable signals and reconcile order status, not as permission to issue another reward. [Webhooks](https://developers.giftcardpartners.com/docs/webhooks).
- Stage credentials and its test-balance behavior need confirmation from the provider before actual stage orders. No provider orders were placed in this audit. [Sandbox](https://developers.giftcardpartners.com/docs/sandbox).
- Stripe illustrates why refunds need their own durable state: original payment-method destination, partial-refund limits, pending/failure states, and dispute interaction. This informs the proposed design; it does not set Zero Loss's refund entitlement policy. [Refund documentation](https://docs.stripe.com/refunds).
