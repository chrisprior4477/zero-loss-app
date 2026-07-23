# Project Zero-Loss Payments and Payouts Spec

## Wallet Funding, Money Movement, Refund Logic, Claim Flow, and Financial Operations Controls

This document defines the payments and payouts system for Project Zero-Loss.

It explains:
- how money enters the platform,
- how internal wallet balances should behave,
- how payout and claim flows should work,
- how failures and exceptions should be handled,
- how admins should investigate or act on financial issues,
- and why all money-related behavior must remain ledger-derived, auditable, and operator-safe.

This is the master spec for the platform’s financial movement layer.

---

# 1. Purpose of This Document

Project Zero-Loss depends on trust in money movement.

Users must believe that:
- deposits are credited correctly,
- entry debits are accurate,
- rebates are visible,
- buyout events are handled fairly,
- payouts and prize releases are understandable,
- and mistakes can be investigated without financial history becoming ambiguous.

This document exists to define the operating rules around that financial layer.

---

# 2. Core Financial Philosophy

The platform must not rely on vague balance math, silent admin edits, or fragile payment logic.

Instead, the financial system must be built around these principles:

- wallet balances are derived from immutable ledger history,
- external payment events are idempotent,
- user-facing balances are server-validated,
- sensitive corrections leave audit trails,
- and operators can investigate issues through a proper GUI instead of relying on raw database access for normal work.

This is one of the most important enterprise rules in the entire platform.

---

# 3. Money Entry: Wallet Funding

Users should fund their account through prepaid wallet deposits rather than paying for individual entries directly by card.

## 3.1 Wallet Funding Rule

The user funds a wallet balance first.

They then use that balance to participate in pools.

This reduces fee inefficiency, makes the experience smoother, and supports a more controlled financial model.

## 3.2 Deposit UX Rule

Wallet funding should feel:
- fast,
- simple,
- trustworthy,
- and receipt-like.

The user should clearly see:
- the funding amount selected,
- confirmation state,
- and updated playable balance after successful crediting.

## 3.3 Quick-Select Funding Amounts

The wallet funding flow should support easy preset deposit options such as:

- $10
- $25
- $50
- $100

These quick-select values make the funding flow easier to understand and easier to operate.

---

# 4. Stripe and External Payment Handling

External payment events must be treated as retriable, duplicate-prone, and operationally sensitive.

## 4.1 Idempotency Rule

The system must be protected against duplicate credits caused by retried or repeated payment events.

A payment event that has already been accepted and processed must not create a second deposit or second wallet credit.

## 4.2 Verification Rule

External payment data must be verified and processed through trusted server-side logic rather than blindly trusting front-end claims.

## 4.3 Financial Safety Rule

If the same event appears more than once, the correct behavior is to detect it safely and avoid duplicating the financial outcome.

The system should be calm and deterministic around duplicates.

---

# 5. Wallet Balance Model

The platform must never rely on a single mutable “balance” field as the source of financial truth.

## 5.1 Derived Balance Rule

Playable balance, rebate credits, and similar financial states must be derived from ledger history.

This protects:
- auditability,
- trust,
- operator explainability,
- and future reporting.

## 5.2 Balance Types

The financial system should support clearly separated value classes such as:
- playable balance,
- rebate/store-credit value,
- refund-derived value,
- and other ledger-recognized categories approved by the architecture.

These must remain understandable both to the user and to the admin operator.

---

# 6. Entry Debits and Internal Money Movement

When a user buys entries, the financial system must create the correct ledger-side outcome rather than relying on temporary UI state.

## 6.1 Entry Purchase Rule

Entry spend should debit the correct wallet category according to platform rules and record the event as part of the permanent financial history.

## 6.2 Server-Side Rule

The amount, identity, and allowed action must be determined on the server from trusted account context and platform state.

The system must not trust client-side identity or balance assumptions for sensitive money movement.

---

# 7. Rebate and Refund Logic

One of the defining mechanics of the platform is that non-winning activity can still produce useful value.

## 7.1 Rebate Generation Rule

When a qualifying non-winning outcome occurs, the system should create the appropriate rebate or store-credit value under the rules configured for that pool or item.

## 7.2 User Visibility Rule

The user must be able to see:
- what value was created,
- why it exists,
- when it expires if time-limited,
- and where it came from.

## 7.3 Admin Visibility Rule

Admins must also be able to trace the origin and lifecycle of rebate-related financial events through the admin portal.

---

# 8. Hostile Takeover Financial Handling

The platform includes a premium hostile takeover or instant-win path for eligible items and pools.

## 8.1 Buyer Charge Rule

When a hostile takeover is validly executed, the system must apply the premium financial charge to the initiating user and record it correctly in the ledger.

## 8.2 Crowd Compensation Rule

Other qualifying users in the affected pool must receive the configured compensation event back into the proper wallet category according to platform rules.

## 8.3 Audit Rule

This entire flow must be fully traceable:
- who initiated it,
- which pool it affected,
- what financial movements occurred,
- and which users received what outcome.

---

# 9. Prize Claim and Payout Flow

Not all valuable outcomes on the platform are simple wallet credits.

Some outcomes will involve:
- digital delivery,
- claim release,
- fulfillment actions,
- or other prize-distribution logic.

## 9.1 Claim Rule

When a user wins, the claim process should be clear, secure, and traceable.

## 9.2 Release Rule

The system should support a gated prize-release flow where the correct verification steps happen before the user receives the final fulfillment artifact, code, or release mechanism.

## 9.3 Admin Review Rule

If a claim is flagged, blocked, delayed, or inconsistent, the admin portal must expose that issue in a way that support or operations staff can investigate without touching raw database rows for basic handling.

---

# 10. Failed Payments and Exception Handling

The system must assume that real financial systems sometimes fail.

Examples include:
- failed charges,
- incomplete confirmations,
- duplicate webhooks,
- payout holds,
- suspicious claim patterns,
- and delayed state synchronization.

## 10.1 Exception Rule

When a payment-related exception happens, the platform should create an understandable operational state rather than leaving the issue ambiguous.

## 10.2 User Communication Rule

Where appropriate, the user-facing system should communicate the issue clearly without exposing confusing internal technical language.

## 10.3 Admin Escalation Rule

The admin portal should expose these exceptions in a structured review queue so operators can investigate and escalate as needed.

---

# 11. Admin Financial Operations Surface

The payments and payouts system must be manageable through the admin GUI.

Admins should be able to review:
- deposit events,
- failed funding attempts,
- wallet credits,
- rebate events,
- claim states,
- payout exceptions,
- and other payment-related history through a dedicated financial review surface.

This is critical to your non-engineer-operable system model.

---

# 12. Manual Correction Philosophy

Sometimes the platform will need a human correction path.

That is acceptable.

Silent rewriting is not.

## 12.1 No Silent Mutation Rule

If an operator adjusts, reverses, compensates, or otherwise corrects a financial event, the original record must remain traceable.

## 12.2 Correction Trail Rule

Every manual correction must include:
- actor identity,
- timestamp,
- reason,
- target object or user,
- and traceable linkage to the original issue.

## 12.3 Operator UX Rule

These actions should happen through guided admin flows wherever possible, not through improvisation in the database.

---

# 13. Transparency Rule

The financial system should support both user-facing and admin-facing transparency.

Users should be able to understand:
- what money they have,
- where it came from,
- what happened after an entry,
- and whether any time-sensitive value exists.

Admins should be able to understand:
- what event occurred,
- whether it completed correctly,
- whether an exception exists,
- and what safe action is allowed next.

---

# 14. Near-Real-Time Awareness Rule

Where practical, financial and operational states should update in near real time rather than hours later.

This matters especially for:
- wallet funding feedback,
- entry purchase confirmation,
- payout status,
- claim transitions,
- and payment exception visibility.

A laggy or stale financial interface damages trust.

---

# 15. Anti-Goals

The payments and payouts system must avoid the following failures:

- double crediting deposits,
- trusting client-side financial claims,
- blending balance categories into one vague number,
- allowing silent admin corrections,
- hiding failed payment states,
- forcing non-engineers into Supabase for routine issue handling,
- and making users guess what happened to their money.

If financial behavior feels ambiguous, the platform loses credibility.

---

# 16. Final Payments Rule

If this system is doing its job correctly, all of the following should be true:

1. Deposits are credited safely and only once.

2. Wallet balances are derived from real ledger history.

3. Entry debits and rebate credits are explainable.

4. Payout or claim issues can be investigated in the admin GUI.

5. Manual corrections leave a visible audit trail.

6. Users and operators can both understand what happened to the money.

That is the standard this financial system must meet.