# Wallet integrity audit — working implementation log

This is an ongoing demo-system audit, not a production-readiness sign-off.

## Owner decisions

- Preserve all sample content and existing financial history. Do not touch How It Works.
- Preserve the sample crowd while ordinary offering purchases decrease displayed availability and use the same database limit.
- Exception explicitly confirmed September 21: the Samsung TV remains a repeatable winning test case; Nike shoes and the baby bundle remain repeatable non-selected/completion-purchase test cases. Do not retire these examples, create new rounds, or branch the database to accomplish this.
- Only the owner may approve refunds or account-value adjustments. Future support staff can investigate and reply but cannot approve value changes. No new privileged account grants have been made.
- For gifting, select the intended recipient before issuance; original winner stays the winner of record. After issuance, do not promise customer self-service ownership transfer or safe code reassignment. Support review is not a promise that the provider can revoke/reissue a code.
- Still unresolved: whether the owner's “dollar is in” restriction starts at deposit or confirmed entry. Do not invent or publish a blanket refund prohibition while this remains undecided. Duplicate/failed-payment corrections require a separate audited process.

## Verified defects and repairs

1. Different customers could simultaneously purchase the last slot. Reproduced locally twice (two saved entries for capacity one). Migration `20260921160000` serializes the offering check; five adversarial concurrency checks now pass. Applied to hosted development-test; 30 existing lifecycle assertions passed in a rollback-only test.
2. A successful multi-entry purchase linked only by product slug and displayed “That activity is not available in your account.” Migration `20260921161500` adds exact entry/reward destinations to the existing batch receipt, including stable destinations on retries. Applied to the hosted demo after 34 rollback-only lifecycle assertions passed. Application links select the exact saved record; old responses safely fall back to the list, not an ambiguous detail.
3. Migration `20260921163000` stores the existing sample baseline and derives ordinary availability from baseline plus saved purchases, enforced under the same exclusive database lock. Applied to hosted demo after 27 rollback-only assertions passed. Item, browse and homepage rails now consume its public aggregate-only snapshot. The three allowlisted repeatable showcase scenarios preserve their sample display and outcomes. Prior history is untouched; ordinary legacy overfilled samples (Dunkin) display full and cannot accept more purchases. Full offerings remain visible after available offerings. A product with unavailable inventory data offers a refresh action instead of submitting against fallback samples.

## Verification checkpoint

- 323 application tests pass; changed application files pass ESLint.
- 257 local database assertions pass, including funding/card storage, wallet isolation, entry lifecycle, completion purchases/reward lifecycle and new availability checks.
- Five separate simultaneous-request tests pass, including two customers competing for one slot after a sample crowd of nine in a capacity-ten pool.
- Production build passes. One pre-existing invalid Testing Library option was removed from a signup navigation test so TypeScript can complete; no signup behavior changed.
- Hosted audit after migrations: 23 saved entries, no entry/debit mismatch, no batch-count mismatch, no funding/credit mismatch, no negative playable wallet.
- Local browser verified Walmart $25 now shows four remaining after four saved entries, and the three showcase cards still show one sample slot. Phone-width homepage checked at 390px without page overflow. Live post-deployment verification remains to be recorded.

## Test effects in the owner's demo account

- Added $1 simulated funds (not a real card charge).
- Submitted one $1 Walmart $25 gift-card entry, then a three-entry $3 batch, all private to the account.
- Starting balance $100; verified resulting balance $97 and four saved active entries.
- Saved the extra-entry explanation acknowledgment after testing its checkbox and save flow.
- No invitations, real rewards, real payments, or external customer messages were sent.

## Remaining work / release gates

- Repeat/reload handling after an unknown purchase response; stable entry-attempt identity across browser refresh.
- Support currently routes to a placeholder, not a durable case-management workflow. Implement context-linked cases and append-only case events with least-privilege access; value approvals must be separately permissioned and auditable.
- Refund lifecycle, provider exceptions, disputes and financial corrections need durable reason/actor/original-transaction linkage. Demo funding currently exercises success and replay, not a complete external-provider refund lifecycle.
- Gifting requires an auditable recipient designation and issuance lock. Provider-specific eligibility, cancellation and credential handling must be confirmed before enabling real fulfillment.
- No merge to real-money mode or claim that switching off demo mode alone makes the system launch-ready.

## Provider research (September 21, 2026)

- GiftCard Partners supports recipient delivery and provider-generated claim links, depending on product eligibility. Preserve one order identifier across retries; a timeout must not create a second order with a new identifier. [Orders](https://developers.giftcardpartners.com/docs/orders), [Delivery types](https://developers.giftcardpartners.com/docs/delivery-types).
- Fulfillment can be asynchronous. Treat callbacks as retryable signals and reconcile order status, not as permission to issue another reward. [Webhooks](https://developers.giftcardpartners.com/docs/webhooks).
- Stage credentials and its test-balance behavior need confirmation from the provider before actual stage orders. No provider orders were placed in this audit. [Sandbox](https://developers.giftcardpartners.com/docs/sandbox).
- Stripe illustrates why refunds need their own durable state: original payment-method destination, partial-refund limits, pending/failure states, and dispute interaction. This informs the proposed design; it does not set Zero Loss's refund entitlement policy. [Refund documentation](https://docs.stripe.com/refunds).
