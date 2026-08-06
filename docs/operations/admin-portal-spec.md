# Project Zero-Loss Admin Portal Spec

## Admin GUI, Operations Console, Audit Controls, and Non-Engineer Daily Management System

This document defines the admin portal for Project Zero-Loss.

It explains:
- the purpose of the admin portal,
- the type of people it is designed for,
- the required operational surfaces,
- the core tools admins must have,
- the audit and safety rules around admin actions,
- and the design principle that daily platform management should happen through the product itself rather than directly in Supabase whenever reasonably possible.

This is the master spec for the internal operations and management interface.

---

# 1. Purpose of the Admin Portal

The admin portal exists so the platform can be operated daily by trusted non-engineers through a proper web interface.

It should allow future team members to:
- review users,
- investigate account issues,
- inspect wallet and entry activity,
- manage item and pool operations,
- review support escalations,
- and take approved corrective action

without needing to open Supabase for ordinary platform work.

The admin portal is not a bonus feature.

It is part of the real operating system of the company.

---

# 2. Core Philosophy

The platform should not be designed around the assumption that “everything important requires an engineer.”

Instead, the operating philosophy is:

- routine work should happen in the admin UI,
- sensitive work should happen through permissioned guided flows,
- and direct raw database intervention should be reserved for exceptional cases only.

The system should treat human operators as real users of the product, not as people who are expected to memorize database tables.

---

# 3. Primary Admin User Types

The admin portal should be designed for several internal user roles.

These may include:
- founder/super-admin,
- support staff,
- finance or payment reviewer,
- operations manager,
- trust-and-safety reviewer,
- and later content or merchandising operators.

The interface should be able to evolve into role-based access, but even before that, the portal should be built with clear permission boundaries in mind.

---

# 4. Top-Level Portal Goal

The admin portal should answer this question quickly:

**What is happening on the platform right now, and what action can I safely take?**

If the portal cannot answer that, it is incomplete.

---

# 5. Required Portal Sections

The admin portal should eventually include these core sections:

1. overview dashboard,  
2. user management,  
3. wallet and ledger investigation,  
4. pool and item operations,  
5. payments and payout review,  
6. support and issue escalation,  
7. status center / incident management,  
8. audit trail and admin action history,  
9. and settings / permissions.

These sections should feel like a real operations suite, not an afterthought.

---

# 6. Overview Dashboard

The default admin landing screen should be a high-signal dashboard.

It should surface:
- important platform metrics,
- active incidents or warnings,
- pending user issues,
- payment exceptions,
- live pool activity,
- and urgent tasks requiring action.

This dashboard should help the operator understand platform health without needing to click through five screens.

---

# 7. User Management Screen

A major function of the admin portal is user review and account support.

The admin user screen should allow an authorized operator to:
- search users,
- view user profile and tier,
- inspect balances,
- inspect active entries,
- inspect past outcomes,
- inspect support history,
- inspect important account flags,
- and initiate approved support actions.

The user detail page should act like a full account investigation view, not a shallow CRM card.

---

# 8. Wallet and Ledger Investigation

The admin portal must include a wallet and ledger review surface because money movement is one of the most sensitive parts of the platform.

Admins should be able to see:
- wallet transaction history,
- balance derivation context,
- deposits,
- entry debits,
- rebates,
- refunds,
- buyout-related events,
- and payout-related movements.

## 8.1 Auditability Rule

Any correction, adjustment, reversal, override, or exception action must leave a durable audit trail.

The original event must remain traceable.

The system must not allow silent deletion of financial history.

## 8.2 Operator Rule

The portal should support guided corrective actions, but it should not encourage casual ledger rewriting.

Any action that changes a financial outcome should require:
- reason capture,
- actor identity,
- timestamping,
- and traceable before/after context.

---

# 9. Account Support Actions

When a user has an issue, the admin portal should offer structured support actions rather than forcing the operator to improvise.

Examples include:
- review account status,
- unlock or re-enable permitted flows,
- inspect failed deposit attempts,
- inspect stuck prize claim states,
- inspect rebate timing,
- create a support note,
- escalate to finance or trust review,
- or create a linked ticket.

The admin should not need to leave the system just to understand the problem.

---

# 10. Pool and Item Operations

The admin portal should provide a clear operational surface for platform inventory and pool management.

Authorized operators should be able to:
- review items,
- review live pools,
- inspect ticket progress,
- view protected/trophy status,
- inspect pool urgency,
- pause or hide a pool when rules allow,
- and view pool outcome state.

This matters because the public marketplace experience depends on live operational accuracy.

---

# 11. Admin GUI Rule for Non-Engineers

The platform should be designed so that a trained non-engineer can perform the majority of daily operational tasks from inside the admin portal.

That includes:
- user investigation,
- support review,
- ticket creation,
- pool inspection,
- payout review,
- status updates,
- and approved account-level corrections.

This is one of the core platform principles.

The company should not become dependent on constant manual database intervention for basic operations.

---

# 12. Payments and Payout Review Surface

The admin portal must include a dedicated financial review area for money movement, even if a more detailed payments-and-payouts spec exists separately.

Admins should be able to inspect:
- deposit status,
- failed charges,
- payout holds,
- refunds,
- suspicious patterns,
- and payment-related support escalations.

This allows the operations team to deal with real platform problems through the product itself.

## 12.1 Chargeback / Dispute Action

The admin portal should include a "Chargeback / Dispute" action, launchable from a flagged transaction, that auto-compiles the relevant evidence from the existing Ledger and audit trail (signup details, funding details, transaction history, proof of delivery/redemption). A human reviewer must explicitly approve the compiled evidence before it is submitted — this approval is itself written to the immutable audit trail (reviewer identity, timestamp, decision). Approved evidence is submitted to the payment processor's dispute-resolution system.

Full rule detail: see `docs/product/marketplace-financial-rules-spec.md`, Section 6.1.

---

# 13. Support and Ticketing Layer

The admin portal should support ticket creation and escalation directly from the relevant investigation screen.

If an admin is looking at:
- a user,
- a ledger issue,
- a payout issue,
- or a status problem,

they should be able to create or link a ticket from that context.

This reduces information loss and improves response quality.

---

# 14. Status Center and Incident Management

The portal should include an internal status and incident surface that helps admins understand operational problems and service degradation.

Admins should be able to view:
- active incidents,
- historical incidents,
- affected systems,
- impact severity,
- impacted users or modules where available,
- and status timeline/history.

This aligns with the platform's broader transparency model.

## 14.1 Fulfillment Outage Alert Queue and Petty-Cash Substitution

When a prize-provider fulfillment request fails to complete, the portal should surface it as an incident-style alert, repeating every 15 minutes while unresolved, so that multiple simultaneously affected winners are never missed. The alert view should show elapsed time since the fulfillment attempt began, so an operator can see at a glance which cases are approaching the substitution threshold.

Past the defined outage duration, an authorized operator may release a substitute prize (a generic prepaid card of equal value) from the platform's standing reserve. This action must always require explicit human authorization — it must never be fully automated — and it must be written to the immutable audit trail like any other admin action.

Full rule detail, including the escalation timeline: see `docs/product/marketplace-financial-rules-spec.md`, Section 7.1.


---

# 15. Audit Trail and Admin History

Every meaningful admin action should leave a visible internal history trail.

This includes actions such as:
- account adjustments,
- payout approvals,
- support notes,
- pool interventions,
- status changes,
- and permissioned overrides.

The portal should include an admin history view showing:
- who did what,
- when they did it,
- why they did it,
- and what object or user was affected.

This is essential for trust, training, and operational accountability.

---

# 16. Permission and Role Safety

Not every admin should be able to do everything.

The portal should be designed with role-awareness in mind so that:
- support staff can investigate and note issues,
- finance or founder-level roles can approve sensitive money actions,
- and only the highest-trust roles can access certain destructive or high-risk workflows.

Even if full RBAC is phased in later, the structure should be designed now with that future in mind.

---

# 17. UX Style of the Admin Portal

The admin portal should feel:
- sharp,
- operational,
- fast,
- data-rich,
- and safe.

It should not feel like:
- raw database tables pasted into a browser,
- a cluttered internal toy tool,
- or an engineer-only control panel with cryptic terminology.

The interface should reduce cognitive load for operators while still exposing real detail.

---

# 18. Anti-Goals

The admin portal must avoid the following failures:

- requiring Supabase for everyday operations,
- hiding financial history,
- allowing silent ledger edits,
- making admins guess what action is safe,
- burying status or incident context,
- disconnecting tickets from real platform objects,
- or designing workflows that only the original engineer can understand.

If the internal team still has to “call the engineer for everything,” the portal has failed its purpose.

---

# 19. Final Admin Portal Rule

If the admin portal is doing its job correctly, a trained non-engineer should be able to log in and do the following through the GUI:

1. Understand platform health.

2. Investigate a user account.

3. Inspect wallet and transaction history safely.

4. Review pool or item state.

5. Create or escalate a ticket.

6. Take approved corrective action with a full audit trail.

That is the standard this admin system must meet.