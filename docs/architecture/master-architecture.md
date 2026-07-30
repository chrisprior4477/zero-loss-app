# Project Zero-Loss Master Architecture

## System Constitution, Technical Guardrails, Financial Integrity Rules, and Implementation Standards

**Version:** 1.1  
**Status:** Frozen  
**Revision:** Expansion and Clarification  
**Last Updated:** 2026-07-25  
**Canonical Path:** `docs/architecture/master-architecture.md`

---

# Purpose

This document defines the permanent technical architecture for Project Zero-Loss.

It is the highest-authority technical document in the repository and serves as the system constitution for:

- application architecture,
- technology selection,
- domain boundaries,
- server and client responsibilities,
- authentication and authorization,
- wallet and ledger design,
- financial integrity,
- payment processing,
- pool and sweepstakes operations,
- database schema standards,
- migrations,
- auditability,
- security,
- administrative controls,
- operational resilience,
- release governance,
- and implementation standards.

This document is not the product vision.

The product vision explains what Project Zero-Loss should feel like and what customer experience it should create.

This document explains how the platform must be built so that the product vision can be delivered safely, consistently, legally responsibly, and at enterprise grade.

All implementation work must conform to this architecture unless the founder explicitly approves a superseding decision and the documentation is updated.

No duplicate or mirrored Master Architecture document may exist elsewhere in the repository.

---

# 1. Core Architecture Position

Project Zero-Loss is a web-only, high-energy, gamified commerce and promotional marketplace built on a server-first architecture.

The platform must prioritize:

- financial integrity,
- server authority,
- auditability,
- replayability,
- data consistency,
- fraud resistance,
- operational control,
- regulatory adaptability,
- customer trust,
- and long-term maintainability.

The platform must not be built as a loose prototype in which:

- the browser controls financially meaningful truth,
- balances are stored only as mutable counters,
- payment events are processed without idempotency,
- user-supplied identifiers are trusted,
- business rules are scattered across frontend components,
- production database changes are made manually without migrations,
- administrative actions occur without durable history,
- or financial corrections overwrite original records.

The architecture must support both the customer-facing experience and the internal control systems required to operate the business safely.

The platform must be designed from the beginning to support:

- customer accounts,
- wallet funding,
- ledger-derived balances,
- rebates and promotional value,
- item listings,
- pool-based offerings,
- entries and participation records,
- payment processing,
- refunds and payouts,
- hostile takeover mechanics,
- protected assets,
- memberships,
- rewards and referrals,
- customer communications,
- fraud and risk controls,
- customer support,
- analytics,
- audit trails,
- governance reporting,
- and a future internal admin portal.

---

# 2. Product Experience Guardrail

Project Zero-Loss is not intended to feel like a traditional financial dashboard or a passive online catalog.

The customer-facing experience must be energetic, active, visually responsive, and gamified.

The interface may draw design inspiration from patterns commonly associated with:

- StockX-style market activity and pricing presentation,
- Temu-style urgency, progress, and visual feedback,
- DraftKings-style balance visibility and persistent mobile utility controls.

These inspirations are directional only.

The platform must maintain its own identity and must not copy proprietary layouts, branding, copyrighted assets, or distinctive protected presentation.

The customer experience should support:

- high-visibility progress bars,
- interactive entry counters,
- immediate visual feedback,
- live or near-live activity indicators,
- balance visibility,
- urgency signals,
- clearly explained rewards,
- obvious transaction status,
- strong mobile usability,
- and confidence-building confirmation states.

Visual energy must never override accuracy.

Animations, progress indicators, balances, timers, availability displays, and purchase confirmations must always reflect server-authoritative state.

The frontend may optimistically display non-financial interface changes only when failure can be safely reversed and no user could reasonably mistake the optimistic state for confirmed financial truth.

---

# 3. Locked Technology Stack

Unless explicitly superseded by a documented founder decision, the technical stack is locked as follows.

## 3.1 Application Framework

- **Framework:** Next.js
- **Routing model:** App Router
- **Primary language:** TypeScript
- **Rendering model:** Server-first
- **Styling:** Tailwind CSS
- **Deployment target:** Vercel

## 3.2 Database and Platform Services

- **Primary database:** Supabase Postgres
- **Authentication provider:** Supabase Auth
- **Server-side auth integration:** `@supabase/ssr`
- **Database security:** Postgres constraints, policies, functions, and Row-Level Security
- **Schema management:** Version-controlled SQL migrations

## 3.3 Payment Processing

- **Payment processor:** Stripe
- **Primary SDK:** Stripe Node.js SDK
- **Payment flow:** Server-created PaymentIntents or another explicitly documented Stripe server-side flow
- **Webhook handling:** Server-side, signature-verified, idempotent, and durably recorded

## 3.4 Source Control and Delivery

- **Source control:** Git
- **Remote repository:** GitHub
- **Development environment:** Cursor or another repository-aware engineering environment
- **Review model:** Pull-request-based review when the project reaches collaborative or production-facing development
- **Automated review:** May include CodeRabbit or equivalent tooling after GitHub pull-request workflows are active

## 3.5 Technology Change Rule

A technology may be added or replaced only when the change:

- solves a documented problem,
- does not weaken financial integrity,
- does not bypass existing security boundaries,
- does not create unnecessary operational complexity,
- has a clear ownership and maintenance model,
- and is recorded as an explicit architectural decision.

Tool preference, novelty, or AI recommendation alone is not sufficient justification for changing the stack.

---

# 4. System Shape

The application is organized into distinct architectural layers.

Each layer has a specific responsibility and must not absorb responsibilities that belong elsewhere.

## 4.1 Customer Experience Layer

The customer experience layer includes:

- public marketing pages,
- homepage,
- catalog and discovery,
- search,
- item pages,
- pool pages,
- account and profile views,
- wallet and transaction history,
- checkout and funding flows,
- rewards and referral views,
- notification preferences,
- support interfaces,
- and customer-visible activity or status screens.

This layer is responsible for presentation, interaction, accessibility, and user comprehension.

It must not become the source of truth for financial, identity, eligibility, authorization, or pool-state decisions.

## 4.2 Application Logic Layer

The application logic layer includes:

- server components,
- server actions,
- route handlers,
- domain services,
- validation services,
- authorization checks,
- Stripe orchestration,
- wallet operations,
- entry purchasing,
- pool-state transitions,
- rebate creation and redemption,
- reward and referral processing,
- refund and payout handling,
- fraud and risk evaluation,
- notification triggering,
- and administrative workflows.

This layer coordinates business operations.

It must validate all privileged requests and must never rely on client-side enforcement as its only control.

## 4.3 Data and Control Layer

The data and control layer includes:

- Postgres tables,
- append-only ledgers,
- event records,
- state-transition history,
- database constraints,
- indexes,
- views,
- functions,
- triggers where justified,
- Row-Level Security policies,
- migration files,
- audit tables,
- reporting structures,
- and administrative control records.

This layer stores durable truth.

The database must be capable of rejecting invalid states even when application code fails, is bypassed, or contains a defect.

## 4.4 External Integration Layer

The external integration layer includes:

- Stripe,
- email providers,
- SMS providers,
- analytics services,
- fraud and identity services,
- customer support tools,
- observability platforms,
- and future third-party operational systems.

All external integrations must be treated as untrusted boundaries.

Integration requests and responses must be:

- validated,
- authenticated where supported,
- logged appropriately,
- retried safely,
- idempotent where duplicate delivery is possible,
- and isolated behind internal service boundaries.

## 4.5 Administrative Control Layer

The administrative control layer includes future internal tools for:

- customer account inspection,
- pool management,
- payment investigation,
- wallet and ledger review,
- rebate review,
- takeover review,
- refund and payout operations,
- fraud case management,
- content management,
- support case handling,
- system configuration,
- feature flags,
- reporting,
- audit review,
- and incident response.

The admin portal is not an afterthought.

The data model and service architecture must support internal operational use from the beginning, even when the graphical admin interface is implemented later.

---

# 5. Domain Boundary Rules

Project Zero-Loss must be organized around explicit business domains.

A domain owns its rules, data responsibilities, and authorized operations.

At minimum, the platform must recognize the following domains:

- Identity and Profile
- Authentication and Authorization
- Catalog
- Items
- Pools and Offerings
- Entries and Participation
- Wallet
- Financial Ledger
- Payments
- Payouts and Refunds
- Rebates and Promotional Value
- Hostile Takeovers
- Memberships
- Rewards and Referrals
- Fraud and Risk
- Notifications
- Communications
- Search
- Recommendations
- User Preferences
- Activity History
- Content Management
- Analytics
- Support
- Administration
- Configuration
- Audit and Governance

Domain boundaries must remain explicit even if several domains initially share the same Next.js application and Postgres database.

Sharing infrastructure does not mean sharing responsibility.

A domain must not directly mutate another domain’s authoritative records without going through a defined service, transaction, function, command, or event contract.

For example:

- the checkout interface must not directly alter wallet history,
- the notification system must not decide financial eligibility,
- the recommendation system must not change pool availability,
- the admin interface must not overwrite ledger history,
- and the frontend must not independently calculate an authoritative balance.

Cross-domain activity must leave enough evidence to determine:

- who initiated it,
- what rule authorized it,
- what data changed,
- when it occurred,
- and whether it succeeded, failed, or was reversed.

---

# 6. Server and Client Responsibility

## 6.1 Server Owns Truth

The server is responsible for all decisions involving:

- authenticated identity,
- authorization,
- ownership,
- permissions,
- wallet balances,
- financial eligibility,
- entry pricing,
- entry availability,
- pool capacity,
- pool status,
- payment status,
- rebate value,
- rebate expiration,
- hostile takeover eligibility,
- protected-asset restrictions,
- membership benefits,
- referral eligibility,
- reward issuance,
- refunds,
- payouts,
- risk decisions,
- administrative actions,
- and any state that can affect money, access, rights, obligations, or customer status.

All financially meaningful calculations must be performed or verified on the server.

## 6.2 Client Owns Presentation

The browser is responsible for:

- rendering content,
- collecting input,
- displaying server-returned state,
- presenting validation feedback,
- opening dialogs,
- displaying loaders,
- showing progress indicators,
- managing non-sensitive interaction state,
- and helping the user understand the current status of an operation.

The client may request an action.

The client may not declare that the action is valid, authorized, financially complete, or permanently recorded.

## 6.3 Prohibited Trust Patterns

The server must never trust the browser as the final authority for:

- user identity,
- user role,
- wallet balance,
- available rebate value,
- item price,
- entry price,
- number of entries purchased,
- pool capacity,
- pool completion,
- takeover eligibility,
- discount eligibility,
- membership tier,
- reward amount,
- referral attribution,
- payout destination ownership,
- or administrative permission.

Hidden form fields, disabled controls, client-side route protection, local storage, cookies not validated by the server, and frontend TypeScript types are not security controls.

## 6.4 Request Validation Rule

Every privileged server operation must validate:

- the authenticated actor,
- the actor’s authorization,
- the request schema,
- referenced record existence,
- ownership or access rights,
- current authoritative state,
- applicable business rules,
- duplicate-submission risk,
- and transaction safety.

A request that passed validation several seconds earlier may no longer be valid when the financial write occurs.

Critical operations must therefore re-check relevant state inside the transaction or database function that performs the write.

## 6.5 Response Rule

Server responses for important operations must be explicit.

They should distinguish among outcomes such as:

- success,
- validation failure,
- authentication failure,
- authorization failure,
- insufficient balance,
- unavailable inventory,
- invalid state transition,
- duplicate request,
- payment pending,
- payment failed,
- conflict,
- retryable system failure,
- and non-retryable system failure.

Generic success flags are insufficient for complex financial and operational workflows.

---

# 7. Authentication Architecture

## 7.1 Required Authentication Model

Authentication must use Supabase Auth with the modern server-side rendering approach for Next.js App Router.

Cookie-backed authentication must be integrated using `@supabase/ssr`.

Authentication code must maintain a strict separation between:

- browser clients,
- server clients,
- and privileged service-role clients.

## 7.2 Trusted Identity Verification

When secure server identity is required, the server must verify the user through a trusted Supabase server client and `supabase.auth.getUser()` or its officially supported secure successor.

The server must derive the acting user from authenticated server context.

The browser must not provide the authoritative user ID for privileged logic.

## 7.3 Prohibited Identity Pattern

The following pattern is prohibited:

1. The browser submits a user ID.
2. The server assumes that submitted user ID is the acting user.
3. The server performs a privileged operation for that identity.

A submitted user ID may be used as a referenced subject only when the authenticated actor is separately verified and authorized to act on that subject.

## 7.4 Session Rule

Server code must not treat an unverified session payload as the final proof of identity when a trusted identity lookup is required.

Session convenience must not weaken identity assurance.

## 7.5 Authorization Rule

Authentication proves who the actor is.

Authorization determines what the actor may do.

Every protected operation must perform both checks.

Authorization decisions must be based on server-controlled information such as:

- ownership,
- role,
- account status,
- membership status,
- administrative permissions,
- fraud restrictions,
- jurisdiction eligibility,
- and resource state.

## 7.6 Account State

The identity model must be able to represent account states such as:

- active,
- pending verification,
- restricted,
- suspended,
- closed,
- and administratively locked.

Account state must be enforced on the server.

A suspended or restricted account must not regain access merely by manipulating frontend state or calling an endpoint directly.

## 7.7 Duplicate and Abuse Resistance

The architecture must support detection and review of:

- duplicate accounts,
- coordinated account activity,
- referral abuse,
- payment abuse,
- bot behavior,
- suspicious device or network patterns,
- and repeated identity attributes.

Automated detection may inform decisions, but high-impact account actions should preserve review evidence and support administrative appeal or correction where appropriate.

## 7.8 Privileged Credentials

Supabase service-role credentials and other privileged authentication secrets must remain server-side only.

They must never appear in:

- browser bundles,
- public environment variables,
- client components,
- logs visible to customers,
- screenshots,
- documentation examples containing real credentials,
- or committed source files.

# 8. Wallet and Ledger Architecture

## 8.1 Authoritative Ledger Rule

Project Zero-Loss must use an authoritative, append-only financial ledger.

A mutable balance field must never be treated as the final source of truth for customer funds, rebates, promotional value, payouts, refunds, rewards, or any other financially meaningful amount.

All authoritative balances must be derived from durable ledger entries.

Cached or summarized balances may exist for performance, but they must always be:

- reproducible from the ledger,
- treated as derived data,
- updated through controlled server-side logic,
- and repairable if they drift from ledger truth.

## 8.2 Separate Balance Classes

Different categories of value must remain logically and financially separate.

At minimum, the platform must support distinct balance classes such as:

- `PLAYABLE`
- `REBATE`
- `PROMOTIONAL`
- `REFUNDABLE`
- `PAYOUT_PENDING`
- `PAYOUT_COMPLETED`
- and other explicitly defined balance classes approved by the architecture.

A balance class must have a documented purpose and permitted-use policy.

Value from one class must not be silently converted into another.

For example:

- rebate value must not automatically become withdrawable cash,
- promotional credit must not be treated as refundable customer funds,
- pending payout value must not remain spendable,
- and reversible payment funding must not be treated as permanently settled value before confirmation.

## 8.3 Ledger Entry Requirements

Every ledger entry must contain enough information to explain the transaction later.

At minimum, a financial ledger entry should include:

- unique identifier,
- account or wallet owner,
- balance class,
- direction or signed amount,
- amount in minor currency units,
- currency,
- event type,
- transaction status,
- source domain,
- source record identifier,
- idempotency key where applicable,
- actor or initiating system,
- reason or description,
- creation timestamp,
- effective timestamp where different,
- and reversal or correction reference where applicable.

Additional metadata may be stored in structured form, but essential financial meaning must not exist only inside unvalidated free-form JSON.

## 8.4 Money Representation

Financial values must be stored and calculated using integer minor units.

For United States dollars, amounts must be stored in cents.

Examples:

- `$1.00` is stored as `100`
- `$24.99` is stored as `2499`
- `$5,000.00` is stored as `500000`

Floating-point numbers must not be used for authoritative financial calculations.

Financial values must always include or inherit an explicit currency.

The system must not assume that every number represents United States dollars merely because the initial launch uses USD.

## 8.5 Balance Derivation

A balance must be derived as the sum of eligible posted ledger entries for:

- the correct account,
- the correct currency,
- the correct balance class,
- and the correct transaction status.

Pending, failed, canceled, expired, or reversed entries must be included or excluded according to explicit rules.

The derivation logic must be centralized and reused.

Different screens or endpoints must not invent separate balance formulas.

## 8.6 Debit Safety

A debit operation must not rely on a balance calculated outside the transaction that posts the debit.

For any operation that spends value, the platform must:

1. verify the authenticated actor,
2. identify the correct balance class,
3. calculate or lock the authoritative available balance,
4. verify that sufficient eligible value exists,
5. post the debit,
6. post related domain records,
7. and commit all required writes atomically.

The system must prevent:

- negative balances unless explicitly permitted,
- double spending,
- repeated submission,
- concurrent overspending,
- and partial financial completion.

## 8.7 Correction and Reversal Rule

Financial history must not be deleted or rewritten to hide an error.

When a financial event is wrong, the system must preserve the original record and append one or more of the following:

- reversal,
- offsetting transaction,
- correction,
- adjustment,
- chargeback,
- refund,
- or administrative remediation entry.

Corrections must reference the original transaction whenever possible.

The final history must show:

- what originally happened,
- why it was corrected,
- who or what initiated the correction,
- and what the resulting financial position became.

## 8.8 Ledger Immutability

Posted financial ledger rows must be immutable except for narrowly controlled metadata that does not change financial meaning.

The following must not be modified after posting:

- amount,
- currency,
- balance class,
- owner,
- event type,
- source reference,
- or debit/credit direction.

Draft or pending records may transition status under controlled rules, but posted financial truth must not be rewritten.

Database permissions, functions, and constraints should enforce this rule wherever practical.

## 8.9 Administrative Financial Actions

Administrative tools must not directly edit balances.

Any administrator-issued credit, debit, refund, correction, or goodwill value must create a documented ledger event.

Administrative financial actions must record:

- the administrator,
- the affected account,
- the amount,
- the balance class,
- the reason,
- the linked support or incident record where applicable,
- and the timestamp.

High-impact administrative actions should require elevated permissions and may require approval or review.

---

# 9. Financial Event and Transaction Discipline

## 9.1 Explicit Financial Events

Every money-moving or value-moving action must map to an explicit financial event type.

The event taxonomy must support, at minimum:

- wallet funding initiated,
- wallet funding succeeded,
- wallet funding failed,
- wallet funding reversed,
- entry purchase debit,
- entry purchase reversal,
- rebate issued,
- rebate redeemed,
- rebate expired,
- promotional credit issued,
- promotional credit expired,
- referral reward issued,
- referral reward reversed,
- hostile takeover debit,
- hostile takeover compensation,
- refund initiated,
- refund completed,
- payout initiated,
- payout completed,
- payout failed,
- chargeback received,
- chargeback resolved,
- administrative credit,
- administrative debit,
- and correction or reversal.

Event names must be stable and versioned carefully.

Reporting, notifications, analytics, and administrative workflows may depend on them.

## 9.2 Atomicity Rule

A business operation that requires multiple related financial and domain writes must succeed or fail as one unit whenever possible.

For example, an entry purchase may require:

- validation of the pool,
- validation of capacity,
- validation of the user,
- validation of funds,
- a ledger debit,
- creation of one or more entry records,
- update of pool participation totals,
- and creation of an audit event.

These writes must not be allowed to partially complete.

If a single database transaction cannot cover an external service boundary, the architecture must use durable state transitions, idempotency, and compensation logic.

## 9.3 Idempotency Rule

Every operation that may be retried, submitted twice, or delivered more than once must be idempotent.

This includes:

- Stripe webhook processing,
- payment completion,
- wallet funding,
- checkout submission,
- entry purchasing,
- refund processing,
- payout processing,
- reward issuance,
- referral bonuses,
- scheduled expiration jobs,
- and administrative retry actions.

Idempotency must be enforced server-side.

Disabling a button after one click is not an idempotency control.

An idempotency strategy should use one or more of:

- client-generated operation keys validated by the server,
- processor event identifiers,
- unique database constraints,
- source-domain uniqueness rules,
- transaction-level locking,
- and durable processed-event records.

## 9.4 Duplicate Event Handling

When the platform receives a duplicate event, it must:

- identify the event as already processed,
- avoid creating duplicate financial effects,
- return a safe and explicit result,
- and preserve enough evidence to explain that the duplicate was ignored.

Duplicate handling must not produce an error that causes an external provider to retry indefinitely when the original event was already processed successfully.

## 9.5 Financial Status Model

Financial workflows must use explicit states.

Examples may include:

- `CREATED`
- `PENDING`
- `AUTHORIZED`
- `PROCESSING`
- `POSTED`
- `FAILED`
- `CANCELED`
- `EXPIRED`
- `REVERSED`
- `REFUNDED`
- `DISPUTED`

State transitions must be documented and controlled.

A record must not jump between arbitrary states.

Invalid transitions must be rejected by server logic and, where practical, database constraints.

## 9.6 Reconciliation

The platform must support reconciliation between:

- internal ledger records,
- Stripe transactions,
- refunds,
- disputes,
- payouts,
- and bank or processor settlement data when available.

Reconciliation processes must be able to identify:

- missing internal records,
- missing processor records,
- duplicate records,
- amount mismatches,
- currency mismatches,
- unexpected status differences,
- and stale pending transactions.

Reconciliation differences must produce reviewable operational records rather than silent corrections.

## 9.7 Financial Audit Trail

Every financial workflow must be reconstructable.

An investigator should be able to determine:

- who initiated the action,
- what request was made,
- what rules were evaluated,
- what processor event occurred,
- what ledger entries were posted,
- what domain records were created,
- what notifications were sent,
- and what later reversals or corrections occurred.

Logs may support this reconstruction, but durable business records must not depend solely on temporary application logs.

---

# 10. Payment Processing Architecture

## 10.1 Stripe Authority Boundary

Stripe is authoritative for external payment-processor status.

Project Zero-Loss is authoritative for internal business meaning and ledger consequences.

The platform must not treat a browser redirect or client callback as proof that a payment succeeded.

A payment is considered complete only after trusted server-side confirmation.

## 10.2 PaymentIntent Flow

Server-side code must create and manage PaymentIntents or another approved Stripe payment object.

The server must determine:

- the amount,
- currency,
- customer context,
- internal operation reference,
- and allowed payment behavior.

The browser must not be allowed to choose an authoritative payment amount.

## 10.3 Webhook Verification

Stripe webhooks must:

- be received by a server-only endpoint,
- verify the Stripe signature using the raw request body,
- reject invalid signatures,
- record the external event identifier,
- process events idempotently,
- and return appropriate status codes.

Webhook signing secrets must remain server-side.

## 10.4 Payment Metadata

Stripe metadata may contain internal references such as:

- account identifier,
- operation identifier,
- payment purpose,
- or internal correlation key.

Metadata must not be treated as trusted proof of identity or authorization.

The server must validate all referenced records independently.

Sensitive personal or secret information must not be stored in Stripe metadata.

## 10.5 Funding Availability

Wallet value created from a payment must not become fully available until the platform’s documented settlement rule is satisfied.

The architecture must be capable of distinguishing:

- payment initiated,
- payment authorized,
- payment succeeded,
- payment under review,
- payment disputed,
- payment refunded,
- and payment reversed.

The timing of playable availability must be configurable and risk-aware.

## 10.6 Refunds

Refunds must be initiated server-side.

A refund workflow must:

- validate the original transaction,
- validate refund eligibility,
- prevent refunds beyond the refundable amount,
- create a durable internal refund record,
- call Stripe idempotently,
- track the processor result,
- and post the appropriate ledger adjustment.

Partial refunds must be supported where the business rules allow them.

## 10.7 Chargebacks and Disputes

The architecture must support Stripe disputes and chargebacks.

A dispute may require:

- freezing or restricting associated value,
- recording disputed funds,
- suspending related withdrawals,
- preserving evidence,
- linking the dispute to the account and payment,
- and applying a later resolution.

Dispute handling must never delete the original payment history.

## 10.8 Payouts

Payouts must use a separate, explicit workflow from wallet spending.

A payout request must validate:

- identity,
- account status,
- payout eligibility,
- available withdrawable balance,
- destination ownership,
- fraud or risk restrictions,
- minimum and maximum limits,
- and duplicate requests.

When a payout is initiated, the corresponding amount must no longer remain spendable.

Payout states must be durable and auditable.

## 10.9 Processor Failure Handling

External payment failures must not leave the internal ledger in a misleading completed state.

The system must distinguish between:

- processor unavailable,
- request timed out,
- processor rejected,
- processor accepted but pending,
- and internal processing failed after external success.

Ambiguous outcomes must be reconciled before retrying a money-moving request.

Blind retries are prohibited.

---

# 11. Pool, Offering, and Item Architecture

## 11.1 Item and Pool Separation

The architecture must maintain a strict distinction between:

- an **item**, which describes a reusable product, prize, or retail asset,
- and a **pool**, which represents a specific live offering, drawing, campaign, or participation instance.

The same item may appear in multiple pools over time.

An item may exist without an active pool.

A pool must reference an item or another explicitly documented prize definition.

## 11.2 Item Responsibilities

An item may contain:

- name,
- description,
- category,
- images,
- retail or reference value,
- specifications,
- brand,
- protected or rare-asset status,
- catalog metadata,
- and editorial content.

An item must not contain mutable pool-specific state such as:

- live entry count,
- pool capacity,
- drawing time,
- participation status,
- winner,
- or pool lifecycle state.

## 11.3 Pool Responsibilities

A pool may contain:

- linked item,
- entry price,
- capacity,
- current lifecycle state,
- start time,
- close time,
- drawing rule,
- jurisdiction settings,
- takeover eligibility,
- protected status override,
- prize configuration,
- participation totals,
- and operational controls.

Pool state must be server-authoritative.

## 11.4 Pool Lifecycle

Pool lifecycle states must be explicit.

A typical lifecycle may include:

- `DRAFT`
- `SCHEDULED`
- `OPEN`
- `PAUSED`
- `FULL`
- `CLOSED`
- `DRAW_PENDING`
- `DRAWN`
- `FULFILLMENT_PENDING`
- `FULFILLED`
- `CANCELED`
- `REFUNDING`
- `REFUNDED`

The final lifecycle must be defined in the Pools and Sweepstakes specification.

State transitions must be validated.

A pool must not reopen, draw, cancel, or refund through an arbitrary field update.

## 11.5 Entry Capacity and Concurrency

Entry capacity must be enforced transactionally.

The platform must prevent:

- overselling entries,
- accepting entries after closure,
- duplicate debit without corresponding entry,
- entry creation without payment or wallet debit,
- and race conditions when the final capacity is being filled.

The authoritative capacity check must occur within the same transaction that creates the entries and records the financial debit.

A progress bar is not an inventory control.

## 11.6 Participation Records

Every valid participation event must create durable entry or participation records.

A participation record should include:

- participant,
- pool,
- entry quantity,
- purchase or source transaction,
- acquisition type,
- creation time,
- eligibility state,
- and status.

Entries must not be represented only by an aggregate counter.

The system must be able to identify exactly which entries belonged to which participant.

## 11.7 Free and Alternative Entry Methods

The architecture must support alternative methods of entry where required by the business model or official rules.

Alternative entries must:

- follow documented eligibility rules,
- be recorded as durable participation records,
- remain distinguishable by source,
- receive the legally and operationally required treatment,
- and not be silently suppressed from winner selection.

Purchase must never be represented as improving odds unless the applicable rules explicitly and lawfully establish such a model.

## 11.8 Jurisdiction Configuration

Jurisdiction eligibility must be configurable.

The platform must be able to:

- include or exclude jurisdictions,
- apply age restrictions,
- display jurisdiction-specific rules,
- restrict participation,
- and record the rule version applied to a participant.

The architecture must not hard-code a claim that every offering is lawful in all locations.

Launch policy and legal approval are separate concerns.

## 11.9 Official Rules Versioning

Every pool or campaign that requires official rules must reference an immutable or versioned rules document.

The platform must be able to prove which rules applied at the time of participation.

Changing current website text must not alter the historical rules associated with earlier entries.

## 11.10 Prize and Value Guardrails

Prize value, entry pricing, pool capacity, and launch limits must be configurable through approved server-controlled settings.

The system may enforce internal policy ceilings, including a launch prize ceiling, but those limits must be represented as business configuration rather than undocumented magic numbers scattered through application code.

Any change to a regulated or risk-sensitive threshold must be auditable.

---

# 12. Winner Selection and Drawing Integrity

## 12.1 Server-Controlled Selection

Winner selection must occur through a controlled server-side process.

The browser must never select, submit, or confirm the authoritative winner.

## 12.2 Eligible Entry Set

Before a drawing, the platform must generate or identify the final eligible entry set.

The eligible set must account for:

- valid participation records,
- canceled or reversed entries,
- disqualified participants,
- jurisdiction restrictions,
- account restrictions,
- duplicate or abusive participation findings,
- and any rule-specific eligibility requirements.

The final eligible set must be frozen or versioned before selection.

## 12.3 Randomness

Winner selection must use an approved source of randomness suitable for the legal and operational requirements of the offering.

The selection method must not use:

- `Math.random()`,
- client-side randomness,
- predictable timestamps,
- sequential database IDs,
- or any method that can be manipulated or reproduced unfairly.

The final winner-selection specification must define the approved mechanism.

## 12.4 Drawing Record

Each drawing must create a durable record containing:

- pool identifier,
- rules version,
- eligible entry-set reference,
- eligible entry count,
- selection method,
- selection timestamp,
- selected entry,
- selected participant,
- process version,
- actor or automated job,
- verification evidence,
- and final status.

The platform must be able to demonstrate that the winner came from the eligible entry set.

## 12.5 Reproducibility and Verification

Where technically and legally appropriate, the drawing process should preserve enough information for independent verification.

Verification must not expose secrets or enable prediction of future drawings.

## 12.6 Winner Validation

Selection of an entry does not automatically complete prize award.

The selected participant may require validation of:

- identity,
- age,
- jurisdiction,
- account standing,
- compliance with official rules,
- and absence of disqualifying fraud.

The architecture must support:

- selected,
- validation pending,
- validated,
- rejected,
- alternate selection required,
- awarded,
- and fulfilled statuses.

## 12.7 Alternate Winner Process

If a selected participant is ineligible or fails required validation, the platform must use a documented alternate-winner process.

The process must preserve:

- the original selection,
- the reason for rejection,
- the alternate selection event,
- and the final award decision.

The original drawing result must not be deleted or overwritten.

## 12.8 Manual Intervention

Manual winner selection is prohibited unless explicitly required by a documented contingency process.

Any emergency or corrective intervention must require elevated permissions, a recorded reason, and complete audit evidence.

---

# 13. Hostile Takeover Architecture

## 13.1 Explicit Product Mechanic

Hostile takeover is a distinct business operation and must be modeled explicitly.

It must not be implemented as:

- a generic item purchase,
- an untracked administrative override,
- a frontend-only state change,
- or an undocumented premium charge.

## 13.2 Eligibility

Takeover eligibility must be determined by server-side rules.

The rules may consider:

- pool status,
- asset classification,
- protected status,
- timing,
- participation level,
- takeover price,
- user eligibility,
- risk restrictions,
- and configuration.

## 13.3 Protected Assets

Rare, protected, legally restricted, operationally sensitive, or founder-designated assets may be marked as ineligible for hostile takeover.

Protected status must be stored and enforced server-side.

Hiding the takeover button is not sufficient enforcement.

## 13.4 Financial Treatment

A hostile takeover may require:

- takeover debit,
- premium calculation,
- participant compensation,
- crowd dividend,
- refund or rebate allocation,
- pool closure,
- and settlement records.

Each financial effect must be posted through the authoritative ledger.

The final formulas must exist in an approved product or financial rules specification before implementation.

Undefined formulas must not be invented by an engineer or AI assistant.

## 13.5 Atomic Takeover Operation

A successful takeover must be processed as one controlled workflow.

The workflow must prevent:

- takeover after another user completed it,
- takeover after pool closure,
- duplicate takeover charges,
- compensation without corresponding takeover payment,
- takeover payment without pool-state transition,
- and inconsistent participant settlement.

Concurrency controls are mandatory.

## 13.6 Takeover Record

Each takeover must create a durable record containing:

- pool,
- acquiring user,
- prior pool state,
- takeover price,
- formula version,
- financial transaction references,
- participant settlement reference,
- timestamp,
- idempotency key,
- and final status.

## 13.7 Participant Compensation

Any compensation to affected participants must be calculated from an approved formula and posted as explicit ledger entries.

The system must be able to explain each participant’s amount independently.

A single undistributed aggregate total is not sufficient.

---

# 14. Rebate and Promotional Value Architecture

## 14.1 Rebate Definition

A rebate is a distinct form of platform value.

It must not be treated as equivalent to:

- cash,
- wallet funding,
- refundable payment value,
- or withdrawable balance,

unless a later approved rule explicitly says otherwise.

## 14.2 Rebate Issuance

Every rebate issuance must record:

- recipient,
- amount,
- currency,
- source event,
- source pool or item where applicable,
- issue timestamp,
- expiration timestamp,
- balance class,
- rule or formula version,
- and status.

## 14.3 Rebate Formula

The rebate formula must be documented before implementation.

The formula must define:

- triggering event,
- eligible users,
- calculation basis,
- rounding rule,
- minimum and maximum values,
- expiration period,
- permitted uses,
- and treatment after refund, reversal, or account restriction.

AI systems and engineers must not infer missing rebate formulas.

## 14.4 Expiration

Rebate expiration must be processed through an idempotent server-side workflow.

Expiration must create a durable ledger event or equivalent auditable record.

The original issuance must remain visible.

Expired value must not simply disappear through deletion or balance overwrite.

## 14.5 Redemption

Rebate redemption must:

- validate available rebate balance,
- validate permitted use,
- validate expiration,
- prevent double spending,
- post the rebate debit,
- and link the debit to the purchase or qualifying transaction.

## 14.6 Redemption Order

If multiple rebate grants exist, the redemption-order rule must be documented.

Examples may include:

- earliest expiration first,
- oldest issuance first,
- campaign-specific priority,
- or another explicit rule.

The order must be deterministic and enforced on the server.

## 14.7 Partial Redemption

The architecture must support partial rebate redemption where permitted.

The system must preserve the remaining value of each grant or maintain an equivalent auditable allocation.

## 14.8 Promotional Credits

Promotional credits must use separate event types and may require a separate balance class.

Promotional value must record:

- issuing campaign,
- eligibility rule,
- expiration,
- restrictions,
- and reversal behavior.

Promotional credits must not be created through untracked manual balance changes.

## 14.9 Customer Visibility

Customers must be able to understand:

- current rebate balance,
- current promotional balance,
- source of value,
- expiration date,
- usage restrictions,
- redemption history,
- and expired or reversed amounts.

The user interface must not combine distinct value classes in a way that misleads the customer about cash equivalence or withdrawal rights.

# 15. Membership Architecture

## 15.1 Membership as a Distinct Domain

Memberships must be modeled as a separate domain with explicit rules, states, benefits, billing behavior, and eligibility requirements.

Membership must not be represented only as:

- a boolean field,
- a frontend badge,
- a Stripe subscription status copied directly into the UI,
- or an undocumented collection of discounts.

The platform must distinguish between:

- membership product,
- subscription record,
- billing state,
- membership entitlement state,
- benefit usage,
- and historical membership periods.

## 15.2 Membership States

Membership states must be explicit.

A membership lifecycle may include:

- `PENDING`
- `TRIALING`
- `ACTIVE`
- `PAST_DUE`
- `GRACE_PERIOD`
- `PAUSED`
- `CANCELED`
- `EXPIRED`
- `REVOKED`

The final state model must be documented before implementation.

Stripe billing state may inform membership status, but internal entitlement state must remain under Project Zero-Loss control.

## 15.3 Membership Tiers

If multiple membership tiers exist, each tier must define:

- name,
- price,
- billing interval,
- included benefits,
- usage limits,
- eligibility rules,
- upgrade behavior,
- downgrade behavior,
- cancellation behavior,
- and effective-date rules.

Membership tier definitions must be versioned or otherwise historically reconstructable.

Changing the current tier configuration must not erase what benefits applied during a prior billing period.

## 15.4 Membership Benefits

Benefits may include:

- entry-related advantages,
- rebate-related advantages,
- reward multipliers,
- fee reductions,
- priority access,
- exclusive pools,
- communication preferences,
- or other approved benefits.

Every benefit that affects money, eligibility, access, odds, price, or priority must be enforced server-side.

The frontend may display a benefit.

The frontend must not decide that the user qualifies for it.

## 15.5 Membership Financial Rules

Membership charges, credits, refunds, discounts, and benefit allocations must produce explicit financial records where applicable.

The membership specification must define:

- recurring charge treatment,
- failed billing behavior,
- grace periods,
- refunds,
- proration,
- upgrades,
- downgrades,
- cancellation timing,
- and benefit treatment after cancellation or reversal.

AI systems and engineers must not invent missing membership formulas.

## 15.6 Entitlement Evaluation

Membership entitlement must be evaluated using server-controlled data.

The evaluation may consider:

- current membership state,
- payment status,
- effective dates,
- account restrictions,
- tier,
- benefit limits,
- and pool-specific eligibility.

Entitlement checks must occur at the time the benefit is used, not only when the page is loaded.

## 15.7 Membership History

The platform must preserve membership history.

The system should be able to determine:

- which tier the customer held,
- when it became active,
- when it changed,
- what billing events occurred,
- which benefits were used,
- why it ended,
- and which rules applied at the time.

---

# 16. Rewards and Referral Architecture

## 16.1 Rewards as Explicit Value

Rewards must be represented through explicit records.

Rewards must not be created through unexplained balance changes.

A reward record should identify:

- recipient,
- reward type,
- source,
- amount or benefit,
- currency or points unit,
- issuing rule,
- campaign,
- issue time,
- expiration time where applicable,
- status,
- and reversal history.

## 16.2 Reward Types

The architecture may support:

- points,
- promotional credits,
- rebates,
- badges,
- access privileges,
- fee reductions,
- membership benefits,
- and campaign-specific rewards.

Each reward type must define:

- whether it has financial value,
- whether it expires,
- whether it is transferable,
- whether it is refundable,
- whether it is withdrawable,
- and how it may be used.

## 16.3 Referral Attribution

Referral attribution must be durable and rule-based.

The system must distinguish among:

- referral invitation,
- referral click,
- referred account creation,
- qualified referral event,
- reward pending,
- reward approved,
- reward issued,
- reward reversed,
- and referral disqualified.

A referral code or link alone must not trigger an irreversible reward.

## 16.4 Referral Qualification

Referral qualification rules must be explicit.

They may consider:

- unique verified account,
- valid payment method,
- completed qualifying activity,
- waiting period,
- fraud review,
- jurisdiction,
- account standing,
- and campaign conditions.

Referral rewards must not be issued solely because two accounts reference each other.

## 16.5 Self-Referral and Abuse Prevention

The platform must support detection of:

- self-referrals,
- duplicate accounts,
- shared payment methods,
- coordinated device or network use,
- synthetic identities,
- circular referral chains,
- repeated account creation,
- and other reward-gaming behavior.

Referral rewards must remain reversible until the qualification and risk rules are satisfied.

## 16.6 Reward Issuance

Reward issuance must be:

- server-controlled,
- idempotent,
- linked to the qualifying event,
- linked to the rule version,
- and recorded in the appropriate reward or financial ledger.

A single qualifying event must not produce duplicate rewards.

## 16.7 Reward Reversal

If a qualifying event is reversed, refunded, disputed, fraudulent, or otherwise invalidated, the associated reward may be reversed according to the documented rules.

The original issuance must remain visible.

The reversal must reference the issuance and state the reason.

## 16.8 Campaign Versioning

Referral and reward campaigns must be versioned or historically preserved.

The platform must be able to prove:

- which campaign applied,
- which terms applied,
- what qualification threshold existed,
- and how the reward was calculated.

---

# 17. Fraud and Risk Architecture

## 17.1 Server-Side Risk Enforcement

Fraud and risk controls must be enforced server-side.

Client-side checks may improve usability but are not authoritative.

The platform must not rely on hidden buttons, disabled fields, browser fingerprinting alone, or frontend validation as the sole protection against abuse.

## 17.2 Risk Signals

The risk system may evaluate signals such as:

- account age,
- identity verification,
- device history,
- network patterns,
- payment method reuse,
- failed payment attempts,
- chargebacks,
- refund frequency,
- referral behavior,
- account linkage,
- entry velocity,
- takeover activity,
- payout destination changes,
- unusual geographic behavior,
- and administrative history.

Risk signals must be used carefully and must not be treated as infallible proof.

## 17.3 Risk Decisions

Risk outcomes should be explicit.

Possible outcomes may include:

- allow,
- allow with monitoring,
- require additional verification,
- delay,
- limit,
- hold,
- block,
- restrict payout,
- suspend account,
- or require manual review.

High-impact decisions must create durable records.

## 17.4 Risk Case Record

A risk case should contain:

- subject account,
- triggering event,
- signals evaluated,
- decision,
- reason codes,
- automated rule version,
- reviewer where applicable,
- evidence references,
- timestamps,
- and final resolution.

Sensitive internal risk details must not be exposed directly to customers where doing so would weaken controls or reveal detection methods.

## 17.5 Manual Review

Manual review must use structured workflows.

Reviewers should be able to:

- inspect evidence,
- add notes,
- request verification,
- apply restrictions,
- approve or reject an action,
- escalate,
- and record the resolution.

Manual risk action must not occur through direct database edits.

## 17.6 Account Restrictions

Restrictions must be explicit and scoped.

Examples include:

- block new entries,
- block wallet funding,
- block payout,
- block referral rewards,
- block hostile takeover,
- require identity verification,
- or fully suspend the account.

The architecture should avoid using one vague restriction flag when different controls are required.

## 17.7 False Positives and Correction

The platform must support correction of mistaken risk decisions.

Reversing a restriction must preserve:

- the original decision,
- the reason it was applied,
- the review evidence,
- the reason it was removed,
- and the actor who removed it.

## 17.8 Fraud Rule Versioning

Automated fraud and risk rules must be versioned or auditable.

The platform must be able to determine which rules affected a decision at a given time.

## 17.9 Model-Assisted Risk

AI or machine-learning systems may assist fraud analysis only when:

- their role is documented,
- their outputs are treated as risk signals rather than unquestionable truth,
- high-impact actions remain controlled,
- decisions are auditable,
- sensitive data is protected,
- and model behavior can be monitored and disabled.

---

# 18. Notifications and Communications Architecture

## 18.1 Domain Separation

Notifications and Communications are related but distinct domains.

Notifications communicate user-specific or operationally relevant events.

Communications manage broader marketing, editorial, promotional, and campaign messaging.

The two domains may share delivery infrastructure, but they must not share undocumented consent or targeting rules.

## 18.2 Notification Types

Notifications may include:

- payment status,
- wallet funding status,
- entry confirmation,
- pool progress,
- pool closure,
- drawing status,
- winner status,
- rebate issuance,
- rebate expiration,
- payout status,
- account security events,
- support updates,
- membership events,
- reward issuance,
- and risk or verification requests.

Transactional notifications must not be blocked merely because the user opted out of marketing.

## 18.3 Communication Types

Communications may include:

- campaigns,
- newsletters,
- promotional announcements,
- social content,
- featured items,
- educational content,
- launch messaging,
- and re-engagement messages.

Marketing communication must respect consent, suppression, and jurisdictional requirements.

## 18.4 Delivery Channels

The architecture may support:

- email,
- SMS,
- in-app inbox,
- browser notification,
- and future approved channels.

Each channel must have:

- consent state,
- verification state where applicable,
- delivery preferences,
- suppression rules,
- retry behavior,
- and audit history.

## 18.5 Preference Model

The system must support user preferences by:

- channel,
- category,
- frequency,
- urgency,
- and communication purpose.

Critical security and financial notifications may override ordinary preference suppression where legally and operationally appropriate.

## 18.6 Consent and Suppression

Consent records must be explicit and time-stamped.

The platform must preserve:

- opt-in,
- opt-out,
- source,
- policy version,
- channel,
- timestamp,
- and suppression reason.

Unsubscribed users must remain suppressed from applicable marketing communication.

## 18.7 Event-Driven Triggering

Notifications should be triggered by durable domain events rather than fragile frontend behavior.

Examples include:

- `PAYMENT_SUCCEEDED`
- `ENTRY_CONFIRMED`
- `POOL_CLOSED`
- `REBATE_ISSUED`
- `PAYOUT_FAILED`
- `ACCOUNT_RESTRICTED`

The notification system must not independently reinterpret financial truth.

## 18.8 Delivery Reliability

Delivery attempts must be tracked.

The platform should record:

- notification,
- recipient,
- channel,
- provider,
- attempt count,
- delivery status,
- provider message identifier,
- failure reason,
- and final disposition.

Retries must be bounded and duplicate-safe.

## 18.9 Template Versioning

Important transactional templates must be versioned or historically recoverable.

The platform should be able to determine what message was sent and which template version produced it.

## 18.10 Sensitive Information

Notifications must not expose unnecessary financial, identity, security, or risk information.

Messages must be designed for environments where email or SMS may be seen by someone other than the intended user.

---

# 19. Search, Recommendations, and Discovery Architecture

## 19.1 Catalog Authority

Search and recommendations must consume catalog and pool data.

They must not become the authoritative source for:

- item truth,
- pool status,
- price,
- capacity,
- availability,
- eligibility,
- or financial rules.

Search indexes and recommendation stores are derived systems.

## 19.2 Search Index Strategy

The search system may use:

- Postgres full-text search,
- a dedicated search provider,
- or another approved indexing strategy.

The selected strategy must support:

- item discovery,
- pool discovery,
- filters,
- categories,
- synonyms,
- ranking,
- sorting,
- and typo tolerance where appropriate.

## 19.3 Index Consistency

Search results may be eventually consistent, but the user must not be allowed to complete an invalid operation based on stale search data.

All authoritative values must be revalidated when the user opens or acts on a result.

## 19.4 Search Document Versioning

Search documents should include enough metadata to identify:

- source record,
- source version or update time,
- item status,
- pool status,
- visibility,
- and jurisdiction eligibility where relevant.

## 19.5 Recommendations

Recommendations may consider:

- category interest,
- favorites,
- wishlist activity,
- prior participation,
- search behavior,
- item engagement,
- communication preferences,
- and explicit user settings.

Recommendations must not use protected or sensitive information inappropriately.

## 19.6 Explainability and Control

The platform should support understandable recommendation reasons where practical, such as:

- based on your favorites,
- similar to items you viewed,
- popular in a selected category,
- or newly available.

Users should be able to influence or reset relevant recommendation preferences where feasible.

## 19.7 Business Rule Boundary

Recommendation ranking must not:

- override legal restrictions,
- bypass fraud controls,
- expose unavailable pools,
- fabricate urgency,
- or misrepresent odds, capacity, or value.

---

# 20. User Preferences and Activity History

## 20.1 Preference Ownership

User preferences must be stored as server-controlled records associated with the authenticated account.

Preferences may include:

- notification channels,
- communication frequency,
- selected categories,
- favorites,
- interface options,
- accessibility settings,
- and recommendation controls.

## 20.2 Preference Validation

Preferences must be validated before storage.

The system must reject invalid enum values, unsupported channels, malformed schedules, and attempts to update another user’s preferences.

## 20.3 Preference Defaults

Defaults must be explicit and documented.

A missing preference must not produce unpredictable behavior.

## 20.4 Activity History

The platform must maintain customer-visible and internal activity histories where appropriate.

Activity history may include:

- sign-in events,
- wallet activity,
- entries,
- rebates,
- rewards,
- pool events,
- communication changes,
- profile changes,
- support actions,
- and account restrictions.

## 20.5 Activity Source of Truth

Activity history must be derived from authoritative domain events or durable audit records.

It must not rely solely on analytics events.

Analytics systems may lose events or aggregate data and therefore cannot serve as the only customer-facing historical record.

## 20.6 Privacy and Retention

Activity records must follow documented retention and privacy rules.

Sensitive internal risk or security data must not automatically appear in customer-visible history.

---

# 21. Content Management Architecture

## 21.1 Managed Content

The content-management domain may control:

- homepage content,
- promotional banners,
- educational material,
- item editorial copy,
- FAQs,
- help content,
- campaign content,
- official-rule presentation,
- and operational announcements.

## 21.2 Content and Business Logic Separation

Content systems must not become the source of truth for:

- financial formulas,
- eligibility,
- pool state,
- entry pricing,
- balance rules,
- or legal enforcement.

Content may explain a rule.

The rule itself must exist in server-controlled configuration or code.

## 21.3 Publishing States

Managed content should support states such as:

- draft,
- review,
- scheduled,
- published,
- archived,
- and withdrawn.

Publication actions must be auditable.

## 21.4 Content Versioning

High-impact content must be versioned or historically preserved.

This includes:

- official rules,
- financial explanations,
- membership terms,
- rebate terms,
- and promotional conditions.

## 21.5 Access Control

Content authoring, review, approval, and publishing should use separate permissions where appropriate.

A user allowed to draft content should not automatically be allowed to publish legally or financially sensitive material.

## 21.6 Safe Rendering

User-generated or administrator-entered content must be sanitized and rendered safely.

The platform must prevent:

- script injection,
- unsafe HTML,
- malicious links,
- and unauthorized embedded content.

## 21.7 Asset Management

Images and media must include:

- ownership or licensing status,
- alt text where applicable,
- file metadata,
- usage context,
- and lifecycle status.

The platform must not expose private storage paths or privileged asset credentials.

# 22. Database Schema and Data Integrity

## 22.1 Database as a Safety Boundary

Postgres is not merely a storage layer.

The database is a core enforcement boundary for:

- ownership,
- referential integrity,
- valid state,
- uniqueness,
- financial safety,
- concurrency control,
- and auditability.

Application validation is required, but database constraints must reject invalid states wherever practical.

## 22.2 Explicit Schema Design

Schema design must favor:

- explicit columns,
- meaningful data types,
- foreign keys,
- check constraints,
- unique constraints,
- controlled enums or validated state values,
- timestamps,
- source references,
- and traceable relationships.

Critical business meaning must not exist only inside:

- free-form JSON,
- unstructured text,
- application memory,
- browser state,
- or external provider metadata.

JSON fields may be used for supplementary metadata when the core meaning remains explicit and validated.

## 22.3 Identifier Rules

Authoritative records must use stable, non-guessable identifiers where appropriate.

Identifiers must not carry hidden business meaning that could later become invalid.

Public identifiers and internal database identifiers may be separated when:

- enumeration risk exists,
- external exposure should be controlled,
- or operational clarity benefits from a human-readable reference.

## 22.4 Foreign Key Discipline

Relationships between authoritative records must use foreign keys unless a documented integration boundary makes that impossible.

Foreign keys must define intentional behavior for:

- delete,
- update,
- archival,
- and historical preservation.

Cascade deletion must not be used for financial, audit, participation, payment, or compliance history when deletion would destroy evidence.

## 22.5 Deletion Strategy

Hard deletion must be limited.

Financial, legal, audit, participation, payment, security, and administrative records generally must not be physically deleted through ordinary workflows.

Where customer or operational records must be removed or deactivated, the system should use one or more of:

- soft deletion,
- archival status,
- anonymization,
- tokenization,
- retention expiration,
- or legally approved erasure workflows.

Deletion behavior must preserve required financial and legal evidence.

## 22.6 Timestamp Rules

Important records should include:

- `created_at`,
- `updated_at` where mutation is valid,
- `effective_at` where business effect differs from creation time,
- `expires_at` where applicable,
- and completion or closure timestamps where meaningful.

Authoritative timestamps should be generated by the server or database.

The browser must not supply the final authoritative time for a financial or legal event.

## 22.7 Status and State Fields

Status fields must use documented values.

A status field must not become a catch-all substitute for proper domain modeling.

When a workflow has meaningful transitions, the architecture should include:

- current state,
- transition history,
- transition actor,
- transition reason,
- and transition timestamp.

## 22.8 Unique Constraints

Unique constraints must enforce duplicate-sensitive rules such as:

- one processing record per external webhook event,
- one financial effect per idempotency key,
- one reward per qualifying event and reward rule,
- one active participation reference where duplication is prohibited,
- and one canonical mapping between specified external and internal records.

Application-level duplicate checks are insufficient without database enforcement.

## 22.9 Check Constraints

Check constraints should enforce rules such as:

- nonnegative quantities,
- valid amount ranges,
- valid date ordering,
- supported currencies,
- valid state combinations,
- and required fields for specific record types.

Financial direction and amount conventions must be consistent.

The schema must not permit one feature to represent debits as negative values while another represents them through an unrelated flag unless the convention is explicitly standardized.

## 22.10 Derived Data

Derived values may be stored for performance only when:

- the authoritative source is documented,
- the value can be rebuilt,
- drift can be detected,
- updates are controlled,
- and the stored value is never silently treated as more authoritative than its source.

Examples may include:

- cached balance summaries,
- pool participation totals,
- search indexes,
- recommendation features,
- and analytics aggregates.

## 22.11 Data Quality

The platform must support detection and remediation of:

- orphaned references,
- invalid state combinations,
- ledger-summary drift,
- missing external mappings,
- stale pending records,
- duplicate records,
- and incomplete workflows.

Data-quality repairs must be auditable.

---

# 23. Schema Migration Discipline

## 23.1 Source-Controlled Migrations

Every schema change must be represented by a version-controlled migration.

Production schema changes must not depend on undocumented dashboard edits.

Migrations must include changes to:

- tables,
- columns,
- indexes,
- constraints,
- functions,
- triggers,
- views,
- policies,
- grants,
- and seed configuration where applicable.

## 23.2 Rebuildability

The project must be capable of recreating its database structure from source-controlled migrations.

A new environment should not require tribal knowledge or manual reconstruction.

The migration history must explain how the current schema came to exist.

## 23.3 Migration Review

High-impact migrations must be reviewed for:

- data loss,
- locking behavior,
- downtime risk,
- backward compatibility,
- constraint validity,
- RLS impact,
- rollback or forward-repair strategy,
- and financial consequences.

## 23.4 Expand-and-Contract Strategy

Breaking schema changes should use an expand-and-contract approach where practical.

A safe sequence may include:

1. Add the new structure.
2. Support both old and new paths temporarily.
3. Backfill data.
4. Validate consistency.
5. switch application reads and writes.
6. Remove the obsolete structure in a later migration.

Application deployment and database migration order must be planned together.

## 23.5 Data Backfills

Backfills must be:

- repeatable or restartable,
- observable,
- bounded,
- tested,
- and safe under partial failure.

A backfill that changes financial or eligibility meaning must preserve source references and audit evidence.

## 23.6 Migration Immutability

Applied migration files must not be silently rewritten.

Corrections should be introduced through new migrations.

Changing an already-applied migration destroys environment history and creates drift.

## 23.7 Destructive Changes

Destructive operations require explicit review.

Examples include:

- dropping a column,
- dropping a table,
- changing financial precision,
- deleting records,
- weakening a constraint,
- removing an RLS policy,
- or changing ownership semantics.

A destructive migration must document:

- why it is necessary,
- what data is affected,
- how data is preserved,
- how the change is verified,
- and how failure is handled.

## 23.8 Environment Consistency

Development, preview, staging, and production environments must follow the same migration history.

Environment-specific behavior must use configuration rather than divergent undocumented schemas.

## 23.9 Seed Data

Seed data must be clearly divided into:

- required system configuration,
- local development fixtures,
- test data,
- and demonstration content.

Development or test fixtures must never be applied accidentally to production.

---

# 24. Row-Level Security, Authorization, and Secret Handling

## 24.1 RLS as a Core Boundary

Supabase Row-Level Security must be enabled and deliberately designed for exposed application tables.

RLS is required, but it is not the only authorization layer.

Sensitive operations must combine:

- authenticated server identity,
- application authorization,
- database constraints,
- transaction safety,
- and RLS where applicable.

## 24.2 Deny-by-Default

Access should begin from denial.

Policies should explicitly permit the minimum required operation.

Broad policies such as allowing all authenticated users to read or write an entire table are prohibited unless the data is intentionally shared and the decision is documented.

## 24.3 Ownership Policies

Ownership policies must derive ownership from trusted authenticated context.

They must not trust a user-controlled payload field to establish ownership.

For example, a user must not gain access merely by submitting their own identifier into a record they do not own.

## 24.4 Service-Role Use

The Supabase service-role key bypasses RLS and must be treated as highly privileged.

Service-role access must be restricted to server-only code.

Its use must be narrow, intentional, and reviewed.

Service-role clients must not become the default database client for ordinary operations.

## 24.5 Administrative Authorization

Administrative access must use explicit permissions.

A generic `is_admin` flag may be insufficient for a mature system.

The architecture should support scoped permissions such as:

- view customer profile,
- view financial history,
- issue support credit,
- initiate refund,
- review fraud case,
- manage content,
- manage pools,
- manage configuration,
- and approve high-impact actions.

## 24.6 Separation of Duties

High-risk operations should support separation of duties where practical.

Examples may include:

- one person initiates a large financial adjustment,
- another approves it,
- a different role manages system configuration,
- and audit reviewers cannot alter the records they inspect.

## 24.7 Secret Storage

Secrets must be stored only in approved server-side secret-management systems or protected environment variables.

Secrets include:

- database service-role keys,
- Stripe secret keys,
- webhook signing secrets,
- email provider credentials,
- SMS provider credentials,
- encryption keys,
- private API tokens,
- and administrative integration secrets.

## 24.8 Public Environment Variables

Only values intentionally safe for browser exposure may use public environment-variable prefixes.

A value must not be made public merely because the frontend needs related functionality.

The correct solution is usually a server endpoint or a restricted public identifier, not exposure of a privileged credential.

## 24.9 Secret Rotation

The architecture must support credential rotation.

Rotation procedures should minimize downtime and preserve the ability to identify which credential version signed or initiated an event where relevant.

## 24.10 Logging Restrictions

Secrets, access tokens, full payment credentials, authentication cookies, and sensitive personal data must not be written to logs.

Error reporting must redact protected fields.

---

# 25. API, RPC, and Server Operation Standards

## 25.1 Hardened Entry Points

Sensitive business operations must use controlled backend entry points such as:

- route handlers,
- server actions,
- domain services,
- transactional Postgres functions,
- background workers,
- or approved internal service interfaces.

Loose direct client mutation of authoritative tables is prohibited for financially or operationally sensitive workflows.

## 25.2 API Contract

Every API or server operation must define:

- authentication requirement,
- authorization rule,
- request schema,
- response schema,
- error outcomes,
- idempotency behavior,
- side effects,
- and audit requirements.

## 25.3 Input Validation

All external input must be treated as untrusted.

Validation must include:

- type,
- required fields,
- allowed values,
- length,
- numeric bounds,
- format,
- referenced-record existence,
- and business eligibility.

TypeScript types do not validate runtime input.

## 25.4 Output Validation

Important internal and external integration responses should be validated where malformed or unexpected responses could cause financial or security harm.

## 25.5 Transaction Boundaries

An operation that changes multiple related authoritative records must define its transaction boundary.

The architecture must make clear:

- what must commit together,
- what may happen asynchronously,
- what compensation is required,
- and what state represents incomplete work.

## 25.6 Database Functions and RPCs

Postgres functions may be used when:

- atomicity is critical,
- concurrency must be controlled,
- multiple writes must commit together,
- or enforcement belongs close to the data.

Functions must:

- validate parameters,
- use deliberate security mode,
- control search paths,
- enforce authorization where applicable,
- return explicit results,
- and avoid hidden side effects.

## 25.7 API Versioning

Public or long-lived integration contracts must be versioned.

Breaking behavior must not be introduced silently.

Versioning may occur through:

- URL,
- header,
- message schema,
- event version,
- or another approved strategy.

## 25.8 Error Handling

Errors must be classified and handled intentionally.

Responses must not leak:

- stack traces,
- secrets,
- database internals,
- policy logic,
- or sensitive risk details.

Customer-facing messages should be understandable while internal logs retain a secure correlation reference.

## 25.9 Rate Limiting

Public and sensitive endpoints must support rate limiting.

Higher protection may be required for:

- authentication,
- password reset,
- account creation,
- wallet funding,
- entry purchase,
- referral actions,
- payout requests,
- search abuse,
- and support submission.

Rate limiting must not be the only fraud control.

## 25.10 Correlation IDs

Important requests and workflows should include a correlation identifier.

The identifier should link:

- request logs,
- domain events,
- external provider calls,
- financial records,
- background jobs,
- and support investigations.

## 25.11 Timeouts and Retries

External calls must use explicit timeouts.

Retries must be:

- bounded,
- selective,
- delayed appropriately,
- and idempotent.

The system must not retry non-idempotent financial requests blindly.

## 25.12 Webhook Standards

All inbound webhooks must:

- authenticate or verify signatures,
- validate the event schema,
- record the provider event identifier,
- reject unsupported events safely,
- process idempotently,
- preserve receipt time,
- and separate receipt from long-running processing where necessary.

---

# 26. Domain Events and Background Processing

## 26.1 Durable Domain Events

Important business outcomes should create durable domain events.

Examples include:

- account created,
- payment succeeded,
- wallet funded,
- entry purchased,
- pool filled,
- pool closed,
- winner selected,
- rebate issued,
- payout completed,
- referral qualified,
- account restricted,
- and content published.

## 26.2 Event Meaning

A domain event states that something already happened.

An event must not be used ambiguously as both:

- a request to perform an action,
- and proof that the action completed.

Commands and events must remain conceptually distinct.

## 26.3 Event Record

A durable event should include:

- event identifier,
- event type,
- event version,
- source domain,
- source record,
- actor,
- occurred time,
- recorded time,
- correlation identifier,
- causation identifier where useful,
- and validated payload.

## 26.4 Transactional Event Publication

When a domain write and its event must remain consistent, the architecture should use a transactional outbox or equivalent pattern.

The system must avoid the failure mode where:

- the database commits,
- event publication fails,
- and downstream systems never learn what happened.

## 26.5 Background Jobs

Background jobs may handle:

- notification delivery,
- expiration,
- reconciliation,
- analytics processing,
- search indexing,
- recommendation updates,
- fraud review queues,
- payout polling,
- and other asynchronous work.

Jobs must be:

- idempotent,
- observable,
- retryable where safe,
- and capable of resuming after interruption.

## 26.6 Job State

Important jobs should record:

- job type,
- source event,
- attempt count,
- current status,
- next retry time,
- last error,
- creation time,
- and completion time.

## 26.7 Dead-Letter Handling

Repeatedly failing work must not retry forever.

The platform must support a failed-work or dead-letter state for investigation.

Financially important dead-letter items must produce operational alerts.

## 26.8 Ordering

Where event order matters, the architecture must define how ordering is preserved or conflicts are detected.

The system must not assume global event ordering across unrelated workers or providers.

## 26.9 Scheduled Jobs

Scheduled workflows such as rebate expiration or reconciliation must record:

- execution window,
- selection criteria,
- processed records,
- skipped records,
- failures,
- and completion status.

A scheduled process must be safe to run again after partial failure.

---

# 27. Real-Time and Customer-State Signaling

## 27.1 Real-Time Is Derived

Real-time and near-real-time features must reflect authoritative server state.

They may improve responsiveness but do not replace durable records.

## 27.2 Supported Delivery Models

The platform may use:

- server-rendered refresh,
- polling,
- Supabase Realtime,
- streaming,
- event delivery,
- or a combination.

The selected method must match the importance and expected update frequency of the data.

## 27.3 Financial State

Financial state must not depend solely on real-time messages.

A missed real-time event must be recoverable by re-fetching authoritative server data.

## 27.4 Pool Progress

Pool progress may be cached or streamed, but:

- entry capacity must remain transactionally enforced,
- the displayed number may be slightly delayed,
- and the final purchase operation must revalidate availability.

## 27.5 Optimistic Interfaces

Optimistic UI may be used only when:

- the action is low risk,
- the state can be clearly shown as pending,
- failure can be reversed cleanly,
- and the user is not misled about financial completion.

Wallet funding, entry confirmation, payout completion, rebate issuance, and winner status must not be displayed as final before server confirmation.

## 27.6 Connection Failure

The interface must degrade safely when real-time connections fail.

The customer should still be able to retrieve current state through ordinary server requests.

## 27.7 Presence and Activity Signals

Visible activity indicators must not fabricate customer activity, scarcity, demand, timing, or urgency.

Simulated or aggregated signals must be clearly designed so they do not mislead customers.

## 27.8 Timers

Countdowns must use server-authoritative deadlines.

The browser may render the countdown locally, but expiry and eligibility must be determined by the server.

---

# 28. Administrative Architecture and Internal Controls

## 28.1 Admin Portal Purpose

The admin portal exists to operate, investigate, support, configure, and govern the platform.

It must not bypass the architecture used by the customer application.

Administrative actions must pass through controlled services and durable workflows.

## 28.2 Administrative Domains

The admin system must eventually support:

- user lookup,
- account-state management,
- identity review,
- wallet and ledger inspection,
- payment investigation,
- refund and payout review,
- rebate inspection,
- pool management,
- winner review,
- takeover review,
- fraud-case management,
- support operations,
- content publishing,
- communication management,
- configuration,
- feature flags,
- analytics,
- audit review,
- and incident management.

## 28.3 No Direct Balance Editing

The admin portal must never provide a plain editable balance field.

All financial changes must use explicit actions that create ledger entries.

## 28.4 Administrative Reasons

High-impact admin actions must require a structured reason.

Free-form notes may supplement, but not replace, standardized reason codes.

## 28.5 Approval Workflows

The platform should support maker-checker or dual-approval workflows for high-risk actions such as:

- large credits,
- large refunds,
- payout overrides,
- winner intervention,
- major configuration changes,
- and mass account actions.

## 28.6 Impersonation

Customer impersonation, if ever implemented, must be tightly controlled.

It must:

- require explicit permission,
- display an unmistakable active-impersonation warning,
- prohibit or separately authorize financial actions,
- log the administrator,
- log the customer,
- record start and end times,
- and support audit review.

Silent impersonation is prohibited.

## 28.7 Bulk Actions

Bulk actions must show:

- selection criteria,
- expected record count,
- preview,
- confirmation,
- execution status,
- failures,
- and resulting audit records.

Bulk financial changes require heightened controls.

## 28.8 Configuration Changes

Administrative configuration must be:

- typed,
- validated,
- permission-controlled,
- versioned where important,
- and auditable.

Configuration changes must not silently rewrite historical outcomes.

## 28.9 Audit Independence

Administrators must not be able to erase or modify audit evidence of their own actions.

Audit access and audit mutation permissions must remain separate.

## 28.10 Support Operations

Support tooling must display enough context to resolve issues without exposing unnecessary sensitive data.

Support agents should receive the minimum access needed for their role.

---

# 29. Configuration and Feature-Flag Architecture

## 29.1 Configuration Over Scattered Constants

Business settings likely to change must be represented through controlled configuration rather than duplicated magic numbers in code.

Examples include:

- prize ceilings,
- pool limits,
- rebate expiration periods,
- membership limits,
- reward thresholds,
- jurisdiction availability,
- risk thresholds,
- payout limits,
- communication schedules,
- and operational toggles.

## 29.2 Configuration Authority

Configuration must be server-controlled.

The browser may receive configuration needed for presentation, but it must not determine the authoritative value.

## 29.3 Typed Configuration

Each configuration value must define:

- key,
- type,
- permitted range,
- default,
- scope,
- effective date,
- owner,
- and change permissions.

## 29.4 Scoped Configuration

Configuration may be scoped by:

- environment,
- jurisdiction,
- pool,
- campaign,
- membership tier,
- user segment,
- or feature.

Scope resolution must be deterministic.

## 29.5 Historical Configuration

A transaction or participation decision must retain enough information to identify the configuration or rule version that applied at the time.

Changing today’s setting must not alter yesterday’s financial explanation.

## 29.6 Feature Flags

Feature flags may control:

- staged rollout,
- internal testing,
- jurisdiction rollout,
- account segments,
- emergency disablement,
- and progressive release.

Flags must not become permanent undocumented business logic.

## 29.7 Financial Feature Flags

A feature flag that affects money, eligibility, entry rules, payouts, or customer rights must be:

- server-enforced,
- auditable,
- tested in both states,
- and linked to an emergency rollback plan.

## 29.8 Flag Removal

Temporary flags must have:

- owner,
- purpose,
- creation date,
- expected removal condition,
- and cleanup plan.

Expired flags must be removed to prevent hidden branching and technical debt.

## 29.9 Emergency Controls

The architecture must support emergency controls such as:

- disable wallet funding,
- disable payouts,
- disable entry purchasing,
- pause a pool,
- disable takeover,
- stop reward issuance,
- stop outbound marketing,
- or place a subsystem into read-only mode.

Emergency controls must preserve customer data and audit history.

# 30. Observability, Logging, and Audit Architecture

## 30.1 Purpose

Project Zero-Loss must be observable.

The platform must provide sufficient operational visibility to:

- detect failures,
- investigate incidents,
- reconcile financial activity,
- diagnose customer issues,
- identify abuse,
- verify business rules,
- monitor platform health,
- and support long-term governance.

Observability is not optional infrastructure.

It is a core architectural requirement.

---

## 30.2 Observability Pillars

The platform should produce four complementary categories of operational information:

- Metrics
- Logs
- Traces
- Audit Records

Each serves a different purpose.

No single category replaces another.

---

## 30.3 Metrics

Metrics describe the health and behavior of the platform.

Examples include:

- active users,
- wallet funding volume,
- payment success rate,
- payment failure rate,
- webhook processing latency,
- pool creation,
- pool completion,
- entry purchase rate,
- search latency,
- API latency,
- database latency,
- queue depth,
- notification delivery success,
- payout completion time,
- fraud review backlog,
- and infrastructure utilization.

Metrics must support historical trend analysis.

---

## 30.4 Logs

Logs describe what happened inside the application.

Logs should include:

- timestamp,
- severity,
- service,
- request identifier,
- correlation identifier,
- actor where appropriate,
- operation,
- outcome,
- and structured metadata.

Logs must remain machine searchable.

Free-form text alone is insufficient.

---

## 30.5 Distributed Tracing

Operations spanning multiple services should preserve trace context.

Tracing should allow investigators to follow:

Customer Request

↓

Server

↓

Database

↓

Stripe

↓

Background Jobs

↓

Notifications

↓

Completion

Long-running workflows should remain traceable.

---

## 30.6 Audit Records

Audit records are business evidence.

Audit records differ from logs.

Logs explain application execution.

Audit records explain business decisions.

Audit records must be durable.

---

## 30.7 Audit Event Requirements

Important audit events should capture:

- actor,
- acting role,
- operation,
- affected record,
- previous state,
- resulting state,
- reason,
- timestamp,
- correlation identifier,
- source IP where appropriate,
- and originating interface.

---

## 30.8 Sensitive Logging

The following must never be written to logs:

- passwords,
- authentication tokens,
- Stripe secrets,
- service-role keys,
- payment credentials,
- complete PII where unnecessary,
- security answers,
- encryption keys,
- or private credentials.

Sensitive fields should be redacted.

---

## 30.9 Error Monitoring

Production errors must be centrally collected.

Error reports should include:

- stack trace,
- request context,
- environment,
- application version,
- correlation identifier,
- and sanitized request metadata.

Customer-sensitive information must be removed before transmission.

---

## 30.10 Operational Dashboards

Operations should eventually provide dashboards for:

- payments,
- wallets,
- pools,
- fraud,
- notifications,
- search,
- infrastructure,
- deployments,
- customer support,
- and business KPIs.

---

# 31. Analytics Architecture

## 31.1 Analytics Separation

Analytics are derived information.

Analytics are not operational truth.

Analytics must never become the authoritative source for:

- balances,
- entries,
- purchases,
- pool completion,
- or eligibility.

Analytics consume business events.

They do not create business truth.

---

## 31.2 Event Collection

Analytics events should be generated from durable domain events whenever practical.

Examples include:

- account created,
- search performed,
- item viewed,
- pool viewed,
- entry purchased,
- wallet funded,
- rebate issued,
- reward redeemed,
- membership upgraded,
- takeover completed,
- notification opened,
- and referral qualified.

---

## 31.3 Event Schema

Every analytics event should include:

- event name,
- timestamp,
- event version,
- user identifier where permitted,
- anonymous identifier where appropriate,
- correlation identifier,
- source,
- device,
- and contextual metadata.

---

## 31.4 Analytics Governance

Analytics definitions must be documented.

The same event name must always represent the same business meaning.

Changing meaning without changing version is prohibited.

---

## 31.5 Privacy

Analytics must comply with applicable privacy requirements.

Consent-controlled analytics must respect customer preferences.

Personally identifiable information should be minimized.

---

## 31.6 Derived Reports

Business reports may include:

- revenue,
- participation,
- conversion,
- retention,
- referral performance,
- rebate utilization,
- membership performance,
- fraud trends,
- and customer engagement.

Reports must identify:

- reporting period,
- calculation version,
- data source,
- and generation time.

---

# 32. Performance and Scalability

## 32.1 Performance Philosophy

Performance improvements must never compromise correctness.

Financial integrity is always more important than superficial speed.

---

## 32.2 Server Rendering

The platform follows a server-first architecture.

Server rendering should be preferred whenever it:

- improves security,
- reduces client complexity,
- improves SEO,
- or improves consistency.

Client rendering should be used where interaction requires it.

---

## 32.3 Caching

Caching may be used for:

- catalog content,
- search,
- images,
- public marketing pages,
- configuration,
- and derived summaries.

Financial and eligibility data require careful cache invalidation.

---

## 32.4 Database Performance

Performance optimization should include:

- indexes,
- query optimization,
- pagination,
- batching,
- and avoiding unnecessary joins.

Indexes should support documented access patterns.

---

## 32.5 Large Data

The architecture must support growth to millions of:

- users,
- ledger entries,
- participation records,
- notifications,
- audit records,
- and analytics events.

Schema choices should anticipate future scale.

---

## 32.6 Background Processing

Long-running work should be moved out of synchronous customer requests whenever possible.

Examples include:

- analytics,
- email,
- recommendation generation,
- reconciliation,
- and reporting.

---

## 32.7 Availability

Temporary subsystem failure should not unnecessarily impact unrelated functionality.

Graceful degradation should be preferred over complete failure.

---

# 33. Testing Strategy

## 33.1 Testing Philosophy

Testing exists to prove business correctness.

Not merely code coverage.

---

## 33.2 Required Testing Levels

The platform should include:

- unit tests,
- integration tests,
- database tests,
- API tests,
- workflow tests,
- end-to-end tests,
- regression tests,
- and security testing.

---

## 33.3 Financial Testing

Financial workflows require dedicated testing.

Examples include:

- funding,
- entry purchase,
- refunds,
- payouts,
- rebates,
- rewards,
- takeovers,
- ledger reconstruction,
- reconciliation,
- and chargebacks.

---

## 33.4 Concurrency Testing

Critical workflows must be tested for:

- duplicate submission,
- simultaneous requests,
- race conditions,
- overselling,
- double spending,
- and transaction rollback.

---

## 33.5 Migration Testing

Schema migrations should be tested before production deployment.

Tests should verify:

- successful upgrade,
- data preservation,
- rollback or forward repair,
- and compatibility.

---

## 33.6 Security Testing

Security testing should include:

- authorization,
- RLS,
- privilege escalation,
- injection,
- XSS,
- CSRF where applicable,
- SSRF,
- rate limiting,
- secret exposure,
- and dependency review.

---

## 33.7 Regression Protection

Previously corrected defects should receive regression tests whenever practical.

The platform should not repeatedly introduce the same class of defect.

---

# 34. Deployment Architecture

## 34.1 Deployment Principles

Deployments must be:

- repeatable,
- observable,
- reversible where practical,
- and documented.

---

## 34.2 Environment Strategy

The platform should support:

- local development,
- preview,
- staging,
- and production.

Each environment should closely resemble production.

---

## 34.3 Continuous Integration

Automated pipelines should verify:

- build success,
- linting,
- tests,
- type safety,
- migration validation,
- and dependency integrity.

---

## 34.4 Deployment Order

Typical deployment order:

1. Deploy infrastructure changes.
2. Apply database migrations.
3. Deploy application.
4. Verify health.
5. Monitor.
6. Enable new features if required.

---

## 34.5 Rollback

Rollback plans must exist before deployment.

Rollback must consider:

- schema compatibility,
- queued work,
- external providers,
- and financial workflows.

---

## 34.6 Release Governance

Every production release should record:

- version,
- deployment time,
- approver,
- changes,
- migration identifiers,
- feature flags,
- and rollback strategy.

---

# 35. Business Continuity and Disaster Recovery

## 35.1 Recovery Objectives

The platform must define acceptable:

- Recovery Time Objective (RTO)
- Recovery Point Objective (RPO)

These objectives should guide operational planning.

---

## 35.2 Backups

Database backups must be:

- automated,
- encrypted,
- verified,
- retained,
- and periodically tested.

A backup that cannot be restored is not a backup.

---

## 35.3 Recovery Testing

Recovery procedures should be exercised periodically.

Testing should validate:

- database restoration,
- application startup,
- payment reconciliation,
- and operational readiness.

---

## 35.4 Incident Management

Major incidents should include:

- detection,
- triage,
- containment,
- communication,
- recovery,
- root cause analysis,
- corrective actions,
- and post-incident review.

---

## 35.5 Operational Continuity

Critical financial operations should prioritize:

- preservation of customer funds,
- preservation of ledger integrity,
- and safe recovery over rapid feature restoration.

---

# 36. AI Development Governance

## 36.1 AI as an Engineering Assistant

AI tools accelerate development.

They do not replace architectural authority.

Generated code must comply with this document.

---

## 36.2 Documentation Authority

AI must treat repository documentation as authoritative.

When documentation conflicts with generated assumptions:

Documentation wins.

---

## 36.3 Business Rule Authority

AI systems must never invent:

- financial formulas,
- rebate calculations,
- payout rules,
- eligibility rules,
- legal interpretations,
- or operational policies.

Undefined business logic must be identified rather than fabricated.

---

## 36.4 Code Quality

AI-generated code must satisfy the same standards required of human-written code.

Correctness is more important than speed.

---

## 36.5 Human Approval

Production changes remain subject to founder approval.

AI recommendations are advisory.

Architectural decisions require documented acceptance.

---

# 37. Architecture Governance

## 37.1 Architecture Is Intentional

Project Zero-Loss will grow through deliberate evolution.

Not accidental complexity.

---

## 37.2 Architecture Decision Records

Significant architectural changes require an ADR.

The ADR becomes part of the permanent project history.

---

## 37.3 Documentation Synchronization

Architecture changes require corresponding updates to:

- specifications,
- ADRs,
- implementation guidance,
- and operational documentation.

---

## 37.4 Breaking Changes

Breaking architectural changes require explicit review.

The impact on:

- financial integrity,
- customer experience,
- security,
- operations,
- and maintainability

must be evaluated before implementation.

---

## 37.5 Governance Principle

Every architectural decision should improve one or more of:

- correctness,
- security,
- maintainability,
- observability,
- resilience,
- scalability,
- customer trust,
- or operational excellence.

If it does not, the decision should be reconsidered.

---

# End of Master Architecture

This document is the constitutional technical authority for Project Zero-Loss.

All future implementation, specifications, ADRs, operational procedures, and engineering work must remain consistent with this architecture unless superseded by a formally approved architectural decision.
