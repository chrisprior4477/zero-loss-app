# Full-Fidelity MVP Environment and Provider Decision

**Status:** Accepted
**Decision Type:** Founder Superseding Architecture Decision
**Date:** 2026-09-17
**Scope:** Current MVP branch and all continuing MVP implementation

---

# Decision

Zero Loss will use one customer application and one approved customer experience.

The MVP must present the ordinary Zero Loss account, drawer, wallet, marketplace,
My Zero Loss, My Rewards, orders, notifications, and security experiences exactly
as those surfaces are intended to operate in production. Simulated providers and
classified MVP records replace unapproved external money movement, outcome
selection, and fulfillment behind that shared interface. They do not create a
separate visual mode, account type, navigation system, or parallel application.

The approved screenshots and current approved account mockups remain the visual
source of truth. Backend implementation must populate those components without
rearranging or restyling them merely because the records are simulated.

---

# Data and Provider Classifications

The architecture must distinguish these categories explicitly:

1. **Production data and providers** — real customer and financial records created
   through approved production processors, outcome systems, and fulfillment
   suppliers in the production environment.
2. **Full-fidelity MVP data and simulated providers** — durable, owner-scoped,
   database-backed records created in the isolated MVP environment through
   replaceable simulated provider adapters. These records must carry an explicit
   non-production classification and obey the same integrity rules as the future
   production workflow.
3. **Hardcoded fixtures** — values embedded in client components or selected only
   to imitate customer balances, entries, outcomes, rewards, orders, or history.
   Fixtures are prohibited as substitutes for the customer journey. Test fixtures
   remain permitted only inside isolated, rollback-safe automated tests.

An MVP record is not deceptive merely because its external provider is simulated.
It is a real record of a simulated event in the MVP environment. It must never be
presented as a real charge, redeemable reward, or physical shipment.

---

# Customer Eligibility and Administrative Authority

Any authenticated customer with a valid confirmed email address may use the
ordinary MVP customer journey. Investor email allowlists must not gate ordinary
funding, entry purchasing, customer outcomes, rewards, or account navigation.

Administrative controls that force an outcome remain a separate server-side
capability. Customer authorization must never imply administrative authority.
Forced outcomes must be auditable, environment-restricted, rate-limited, and
rejected in production.

---

# Financial and Data Integrity

Simulated workflows must preserve the production-intended architecture:

- authenticated ownership and server-side authorization;
- PostgreSQL/Supabase records protected by Row-Level Security;
- immutable or append-only ledger history;
- balances derived from posted ledger entries;
- atomic entry deductions and state transitions;
- signed provider events and durable provider receipts;
- idempotency, replay protection, and provider-event deduplication;
- server-validated amounts and currency;
- compensating entries for reversals and refunds;
- reconciliation for timeouts, late events, and mismatched records; and
- account-specific entries, outcomes, rewards, notifications, and fulfillment.

Retries, double-clicks, repeated delivery, and concurrent requests must not create
duplicate money, entries, outcomes, rewards, orders, or fulfillment. A failed
authoritative balance read displays **Unavailable**, never `$0.00`.

---

# Environment Boundary

The preferred boundary is a dedicated MVP/preview Supabase project and a separate,
clean production Supabase project using the same approved migrations and shared
application architecture.

Server-side configuration selects provider adapters and permits simulated
operations only in the MVP environment. Production must reject demo providers,
simulated fulfillment, and forced outcomes. Deleting test users later is not an
acceptable environment-separation strategy.

The environment boundary is not customer-facing information architecture. It
must not add global banners, ribbons, watermarks, alternate dashboards, special
account labels, or duplicated navigation.

---

# Limited Honest Disclosure

Disclosure appears only where a customer could mistake a simulated external
effect for a real one:

- Demo Payment Provider checkout: **“Simulation only — no payment will be processed.”**
- Simulated gift card or barcode: **“Sample — not redeemable.”**
- Simulated fulfillment confirmation: **“Simulation only — no product will be shipped.”**

These compact disclosures belong inside the relevant transaction, reward, or
fulfillment component. They must not displace approved controls or modify global
navigation, page hierarchy, or dashboard composition.

---

# Source Control and Historical Records

All continuing MVP work remains on the current branch. No new demo branch,
protected-preview branch, parallel app, or duplicate customer interface may be
created. Historical branches remain intact unless the founder later directs
otherwise.

The checkpoint-one and checkpoint-two reports remain evidence of what was built,
tested, and authorized on 2026-09-14. Their investor-only fixture gates and their
then-current restrictions do not govern work after this accepted decision.

---

# Stop Conditions

Implementation must stop and report the exact problem if environment isolation,
data classification, server-side ownership, or a financial invariant cannot be
enforced; if a test exposes duplication or cross-account access; if destructive
source-control operations would be required; or if a required real-provider
capability is unknown.
