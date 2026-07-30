# Project Zero-Loss

# Enterprise Data Dictionary

**Document Path:** `docs/architecture/enterprise-data-dictionary.md`  
**Document Type:** Enterprise Canonical Architecture Specification  
**Version:** 2.0  
**Status:** Authoritative  
**Authority Level:** Enterprise Architecture  
**Owner:** Architecture Governance  
**Applies To:** Entire Project Zero-Loss Platform  
**Last Updated:** July 2026

---

# Document Purpose

The Enterprise Data Dictionary defines the canonical meaning, ownership, lifecycle, classification, identifiers, relationships, governance rules, and implementation standards for every significant business entity used throughout Project Zero-Loss.

This document establishes the single enterprise vocabulary from which:

- databases are designed
- APIs are modeled
- domain events are published
- read models are generated
- analytics are derived
- AI-generated code is produced
- documentation is written
- architectural decisions are enforced

Every implementation artifact within Project Zero-Loss must ultimately derive its business terminology from this document.

---

# Architectural Authority

This document is authoritative for enterprise data semantics.

It is subordinate only to:

1. Master Architecture
2. Approved Architecture Decision Records (ADRs)

It governs:

- canonical entity definitions
- field semantics
- ownership boundaries
- lifecycle terminology
- identifier standards
- monetary standards
- timestamp standards
- status definitions
- relationship rules
- data classifications
- retention expectations
- cross-domain references

Every capability specification, API specification, event definition, database schema, and implementation must remain consistent with this document.

Where conflicts exist:

1. Master Architecture
2. Approved ADRs
3. Enterprise Data Dictionary
4. Domain Ownership Matrix
5. Domain Event Catalog
6. Capability Specifications
7. Operations Specifications
8. Product Specifications

---

# Objectives

The Enterprise Data Dictionary exists to ensure that:

- every important business concept has one enterprise definition
- every authoritative entity has one owner
- authoritative records remain distinguishable from projections
- identifiers remain stable
- money is represented consistently
- timestamps have precise business meaning
- lifecycle states are governed
- data classifications are standardized
- relationships remain explicit
- historical facts remain interpretable
- AI cannot invent conflicting schemas
- databases remain aligned with bounded contexts
- APIs remain consistent
- event contracts remain stable
- financial truth remains defensible

---

# Enterprise Data Principles

The following principles govern every entity defined within this document.

---

## 1. One Canonical Meaning

Every enterprise business term has exactly one meaning.

Examples:

- Customer
- Pool
- Entry
- Winner
- Prize Assignment
- Ledger Transaction
- Membership
- Reward

The same word must never represent different concepts in different services.

---

## 2. One Authoritative Owner

Every authoritative entity belongs to exactly one bounded context.

Other domains may:

- reference it
- consume events
- build projections
- cache approved fields
- perform approved lookups

Other domains must never independently redefine or mutate the authoritative record.

---

## 3. Authoritative Data vs Derived Data

Authoritative data represents enterprise truth.

Derived data exists only for:

- presentation
- reporting
- search
- analytics
- recommendations
- customer experience
- operational optimization

Examples:

| Authoritative | Derived |
|---------------|----------|
| Ledger Entry | Wallet Balance |
| Pool | Homepage Pool Card |
| Entry | Activity Timeline Item |
| Catalog Item | Search Document |
| Reward | Recommendation |
| Customer | Analytics Snapshot |

Derived data must always remain reconstructable from authoritative data.

---

## 4. Immutable Historical Facts

Historical business facts must never be overwritten.

Examples include:

- Ledger Entries
- Draws
- Winners
- Payments
- Entries
- Compliance Decisions
- Administrative Approvals
- Domain Events

Corrections occur through:

- reversals
- superseding versions
- replacement records
- corrective events

Never by rewriting history.

---

## 5. Separation of Responsibilities

Every bounded context owns exactly one area of responsibility.

Examples:

Ledger owns:

- financial truth

Wallet owns:

- customer-facing balance projections

Payments owns:

- payment execution

Pools & Sweepstakes owns:

- Entries
- Draws
- Winners
- Prize Assignments

Membership owns:

- membership lifecycle

No domain owns another domain's business truth.

---

## 6. Event-Driven Architecture

Completed business facts are communicated through immutable Domain Events.

Events describe:

what happened

They do not describe:

what should happen.

Every event:

- has one publisher
- has one meaning
- remains immutable
- follows the registered schema
- is versioned independently

---

## 7. Configuration over Code

Business rules should be configurable whenever practical.

Examples:

- Pool rules
- Membership tiers
- Notification templates
- Reward policies
- Referral rules
- Jurisdiction restrictions

Configuration must never replace:

- Ledger truth
- financial controls
- compliance requirements
- security requirements

---

## 8. Security by Default

Sensitive information must always receive the highest practical protection.

The platform must minimize:

- stored personal information
- copied identity data
- duplicated financial data
- duplicated fraud evidence
- duplicated verification evidence

Domains should reference data whenever possible instead of copying it.

---

## 9. Enterprise Vocabulary

All implementation must use the enterprise vocabulary.

Examples:

Correct:

- Entry
- Draw
- Winner
- Prize Assignment
- Reward
- Ledger Entry

Avoid introducing synonyms such as:

- Ticket
- Contest Record
- Balance Object
- Gift Item

unless explicitly approved through architecture governance.

---

## 10. AI Implementation Rule

All AI-assisted implementation must derive entity definitions from this document.

AI tools must never invent:

- alternative entity names
- conflicting ownership
- duplicate authoritative records
- inconsistent identifier formats
- conflicting lifecycle states

This document is the canonical vocabulary for AI-generated implementation.

---

# Enterprise Ownership Categories

Every enterprise data object belongs to one category.

---

## Authoritative Entity

A durable business object with an owned lifecycle.

Examples:

- Customer
- Pool
- Entry
- Payment
- Membership
- Winner

---

## Value Object

A reusable value with no independent lifecycle.

Examples:

- Money
- Address
- Jurisdiction
- Date Range
- Percentage
- Reason Code

---

## Reference Data

Governed reusable enterprise definitions.

Examples:

- Categories
- Membership Tiers
- Country Codes
- Currency Codes
- Jurisdiction Codes

---

## Derived Projection

Optimized representations generated from authoritative data.

Examples:

- Wallet
- Search Document
- Activity Timeline
- Analytics Snapshot
- Recommendation Set

---

## Integration Record

Records supporting communication between systems.

Examples:

- Outbox
- Inbox
- Provider Callback
- Webhook Delivery
- Dead Letter

---

## Audit Record

Immutable records supporting:

- accountability
- investigations
- compliance
- financial integrity
- operational reconstruction

---

# Canonical Identifier Standards

Project Zero-Loss uses globally unique opaque identifiers.

Identifiers must be:

- immutable
- server generated
- globally unique
- stable
- independent from database engines
- independent from provider identifiers
- safe for distributed systems

Identifiers must never encode:

- customer information
- timestamps
- business meaning
- financial information

---

## Recommended Identifier Prefixes

| Entity | Prefix |
|----------|---------|
| Customer | cus_ |
| Customer Profile | cpf_ |
| Verification | ver_ |
| Pool | pol_ |
| Pool Ruleset | prs_ |
| Entry Request | erq_ |
| Entry | ent_ |
| Entry Lock | elk_ |
| Draw | drw_ |
| Winner | win_ |
| Prize Assignment | pas_ |
| Prize Claim | clm_ |
| Fulfillment | ful_ |
| Catalog Item | itm_ |
| Category | cat_ |
| Inventory Reservation | inr_ |
| Payment | pay_ |
| Refund | ref_ |
| Payout | pyo_ |
| Chargeback | cbk_ |
| Ledger Account | lac_ |
| Ledger Transaction | ltx_ |
| Ledger Entry | len_ |
| Wallet | wal_ |
| Membership | mem_ |
| Membership Tier | tier_ |
| Risk Evaluation | rev_ |
| Fraud Case | frd_ |
| Notification | not_ |
| Campaign | cam_ |
| Reward | rew_ |
| Referral | rfl_ |
| Audit Record | aud_ |
| Domain Event | evt_ |
| Configuration | cfg_ |

Provider identifiers must always remain separate from canonical identifiers.

---

# Enterprise Timestamp Standards

All timestamps:

- are generated server-side
- are stored in UTC
- use ISO-8601
- represent explicit business meaning

Examples:

| Field | Meaning |
|----------|----------|
| created_at | record creation |
| updated_at | mutable update |
| occurred_at | business fact |
| accepted_at | acceptance |
| posted_at | ledger posting |
| completed_at | completion |
| cancelled_at | cancellation |
| verified_at | verification |
| effective_at | business effectiveness |
| expires_at | expiration |

Client timestamps must never become authoritative business timestamps.

---

# Enterprise Monetary Standard

Money is represented using:

- integer minor units
- ISO-4217 currency codes

Example:

```json
{
  "amount_minor":2500,
  "currency":"USD"
}
```

Financial calculations must never use floating-point arithmetic.

Ledger remains the authoritative financial truth.

Wallet remains a derived financial projection.

---

# Enterprise Quantity Standards

Quantities use whole integers unless explicitly documented otherwise.

Examples:

- Entry Quantity
- Inventory Quantity
- Reward Quantity

Signed values may be used only for governed adjustments.

---

# Enterprise Status Standards

Lifecycle status must use governed enumerations.

Examples:

```text
pending
active
published
scheduled
open
locked
completed
cancelled
expired
failed
```

Status values must:

- have one owner
- support explicit transitions
- define terminal states
- remain documented

Multiple overlapping lifecycle booleans are prohibited.

---

# Enterprise Reason Codes

Reason Codes provide stable machine-readable explanations.

Example:

```text
PAYMENT_DECLINED

POOL_CANCELLED

CUSTOMER_NOT_ELIGIBLE

IDENTITY_REVIEW_REQUIRED

DUPLICATE_ACCOUNT_CONFIRMED
```

Customer-facing explanations remain separate from internal security reasons.

---

# Enterprise Data Classification

Every entity and field is classified.

Standard classifications:

```text
Public

Internal

Confidential

Restricted
```

Classification applies to individual fields—not only entire entities.

---

# Enterprise Lifecycle Metadata

Mutable entities generally include:

- created_at
- updated_at
- record_version
- status

Where appropriate:

- deleted_at
- archived_at
- anonymized_at
- effective_at
- expires_at

Historical financial records remain immutable.

---

# Enterprise Relationship Rules

Cross-domain relationships use stable identifiers.

Example:

Entry references:

- customer_id
- pool_id

It does not duplicate:

- Customer Profile
- Wallet
- Membership
- Notification Settings

Cross-domain ownership is preserved through identifiers rather than shared mutable records.

---

# Canonical Customer Entity

## Definition

A Customer is the authoritative platform identity representing an individual participating within Project Zero-Loss.

The Customer provides the stable identity referenced across all bounded contexts.

---

## Authoritative Owner

```text
Identity & Profile
```

---

## Canonical Identifier

```text
customer_id
```

Example:

```text
cus_01J...
```

---

## Core Customer Fields

| Field | Type | Required | Classification | Meaning |
|--------|------|----------|----------------|---------|
| customer_id | string | Yes | Confidential | Stable Customer identifier |
| status | enum | Yes | Confidential | Customer lifecycle |
| jurisdiction | string | Conditional | Confidential | Primary jurisdiction |
| verification_status | enum | Yes | Restricted | Verification state |
| security_status | enum | Yes | Restricted | Security status |
| preferred_locale | string | No | Confidential | Customer locale |
| created_at | timestamp | Yes | Internal | Creation time |
| updated_at | timestamp | Yes | Internal | Last update |
| closed_at | timestamp | No | Confidential | Closure time |
| anonymized_at | timestamp | No | Restricted | Anonymization time |
| record_version | integer | Yes | Internal | Aggregate version |

---

## Customer Relationships

Customer may be referenced by:

- Entries
- Memberships
- Payments
- Wallet
- Notifications
- Rewards
- Referrals
- Activity History
- Fraud Cases
- User Preferences

Referencing domains store only:

```text
customer_id
```

---

## Customer Invariants

A Customer:

- is the authoritative platform identity
- is not a Wallet
- is not a Membership
- is not a Ledger Account
- is not a Payment
- is not an Entry
- remains identifiable through a stable customer_id
- may be anonymized according to governance
- must preserve historical references after account closure

# Canonical Customer Profile Entity

## Definition

A Customer Profile contains governed personal, demographic, and presentation information associated with a Customer.

Separating the Customer Profile from the Customer entity allows identity, privacy, access control, personalization, and regulatory requirements to evolve independently without changing the platform's core identity model.

The Customer Profile is not the authoritative identity.

The Customer remains the authoritative platform identity.

---

## Authoritative Owner

```text
Identity & Profile
```

---

## Canonical Identifier

```text
customer_profile_id
```

Example:

```text
cpf_01J...
```

---

## Core Customer Profile Fields

| Field | Type | Required | Classification | Meaning |
|--------|------|----------|----------------|---------|
| customer_profile_id | string | Yes | Confidential | Stable profile identifier |
| customer_id | string | Yes | Confidential | Associated Customer |
| display_name | string | No | Confidential | Customer-selected display name |
| legal_first_name | string | Conditional | Restricted | Legal first name |
| legal_last_name | string | Conditional | Restricted | Legal last name |
| date_of_birth | date | Conditional | Restricted | Age verification |
| preferred_locale | string | No | Confidential | Preferred language |
| timezone | string | No | Confidential | Preferred timezone |
| avatar_reference | string | No | Confidential | Profile image reference |
| created_at | timestamp | Yes | Internal | Creation time |
| updated_at | timestamp | Yes | Internal | Last update |
| record_version | integer | Yes | Internal | Aggregate version |

---

## Customer Profile Rules

The Customer Profile must never become the source of truth for:

- authentication
- authorization
- Wallet balances
- Ledger information
- Membership lifecycle
- fraud decisions
- verification evidence

---

# Canonical Contact Point Value Object

## Definition

A Contact Point represents an approved communication destination belonging to a Customer.

Examples include:

```text
Email

Mobile Phone

Postal Address
```

Identity owns the Contact Point.

User Preferences determines whether it may be used.

Notifications controls delivery.

---

## Authoritative Owner

```text
Identity & Profile
```

---

## Core Contact Point Fields

| Field | Type | Required | Classification | Meaning |
|--------|------|----------|----------------|---------|
| contact_point_id | string | Yes | Confidential | Stable identifier |
| customer_id | string | Yes | Confidential | Associated Customer |
| type | enum | Yes | Confidential | Email, phone, address |
| normalized_value | string | Yes | Restricted | Canonical destination |
| display_value | string | No | Confidential | Masked display |
| verification_status | enum | Yes | Restricted | Verification state |
| verified_at | timestamp | No | Restricted | Verification completion |
| is_primary | boolean | Yes | Confidential | Primary destination |
| status | enum | Yes | Confidential | Lifecycle |
| created_at | timestamp | Yes | Internal | Creation |
| updated_at | timestamp | Yes | Internal | Last update |

---

## Contact Point Invariants

A Contact Point:

- belongs to one Customer
- supports verification history
- supports masking
- cannot become a Customer identifier
- cannot become an authentication credential
- must remain normalized before uniqueness comparison

---

# Canonical Customer Verification Entity

## Definition

Customer Verification represents the governed verification workflow used to establish identity, eligibility, age, ownership of communication channels, or other approved verification requirements.

Verification is authoritative only after completion.

---

## Authoritative Owner

```text
Identity & Profile
```

Fraud & Risk and Compliance may contribute policy inputs but do not own the verification lifecycle.

---

## Canonical Identifier

```text
verification_id
```

Example

```text
ver_01J...
```

---

## Core Verification Fields

| Field | Type | Required | Classification | Meaning |
|--------|------|----------|----------------|---------|
| verification_id | string | Yes | Restricted | Verification identifier |
| customer_id | string | Yes | Restricted | Associated Customer |
| verification_type | enum | Yes | Restricted | Verification category |
| provider | string | No | Restricted | Approved provider |
| provider_reference | string | No | Restricted | External reference |
| policy_version | string | Yes | Restricted | Policy version |
| status | enum | Yes | Restricted | Verification lifecycle |
| started_at | timestamp | Yes | Restricted | Start |
| completed_at | timestamp | No | Restricted | Completion |
| expires_at | timestamp | No | Restricted | Expiration |
| decision_reason_code | string | No | Restricted | Outcome |
| evidence_reference | string | No | Restricted | Protected evidence |

---

## Verification Status

```text
pending

in-progress

verified

failed

manual-review

expired

cancelled
```

---

## Verification Rules

Verification evidence:

- remains encrypted
- remains access controlled
- is never broadly copied
- is never included in public events
- is never exposed through customer APIs

---

# Canonical Duplicate Review Entity

## Definition

A Duplicate Review represents an investigation into whether multiple Customer records belong to the same individual or violate platform identity rules.

---

## Authoritative Owner

```text
Identity & Profile
```

Fraud & Risk contributes signals.

Identity owns the decision.

---

## Core Fields

| Field | Type | Required | Classification | Meaning |
|--------|------|----------|----------------|---------|
| duplicate_review_id | string | Yes | Restricted | Stable identifier |
| primary_customer_id | string | Yes | Restricted | Primary account |
| related_customer_ids | array | Yes | Restricted | Accounts under review |
| status | enum | Yes | Restricted | Lifecycle |
| decision | enum | No | Restricted | Review outcome |
| reason_code | string | No | Restricted | Decision |
| started_at | timestamp | Yes | Restricted | Investigation start |
| completed_at | timestamp | No | Restricted | Investigation completion |

---

# Canonical Pool Entity

## Definition

A Pool represents the authoritative participation opportunity through which eligible Entries may be accepted and Winners selected according to approved business rules.

Pools own their complete lifecycle.

Publishing only controls visibility.

---

## Authoritative Owner

```text
Pools & Sweepstakes
```

---

## Canonical Identifier

```text
pool_id
```

Example

```text
pol_01J...
```

---

## Core Pool Fields

| Field | Type | Required | Classification | Meaning |
|--------|------|----------|----------------|---------|
| pool_id | string | Yes | Internal | Stable Pool identifier |
| pool_type | enum | Yes | Internal | Participation model |
| catalog_item_id | string | Yes | Internal | Prize reference |
| catalog_item_version | integer | Yes | Internal | Catalog version |
| ruleset_version | string | Yes | Internal | Rules |
| status | enum | Yes | Internal | Lifecycle |
| scheduled_open_at | timestamp | No | Internal | Planned opening |
| opened_at | timestamp | No | Internal | Actual opening |
| scheduled_lock_at | timestamp | No | Internal | Planned lock |
| locked_at | timestamp | No | Internal | Actual lock |
| scheduled_draw_at | timestamp | No | Internal | Planned draw |
| completed_at | timestamp | No | Internal | Completion |
| cancelled_at | timestamp | No | Internal | Cancellation |
| record_version | integer | Yes | Internal | Aggregate version |

---

## Pool Status

```text
draft

published

scheduled

open

suspended

locked

drawing

prize-processing

completed

cancelled
```

---

## Pool Invariants

A Pool:

- accepts Entries only while open
- freezes participation before drawing
- never silently changes the frozen population
- never selects Winners outside the Draw workflow
- remains auditable after completion
- cannot be hard deleted after Entries exist

---

# Canonical Pool Ruleset Entity

## Definition

A Pool Ruleset defines the immutable business rules governing participation, eligibility, drawing, prize handling, and limitations for a Pool.

---

## Authoritative Owner

```text
Pools & Sweepstakes
```

---

## Core Fields

| Field | Type | Required | Meaning |
|--------|------|----------|---------|
| pool_ruleset_id | string | Yes | Stable identifier |
| version | string | Yes | Ruleset version |
| entry_methods | array | Yes | Allowed participation methods |
| maximum_entries_per_customer | integer | Conditional | Entry limit |
| minimum_age | integer | Conditional | Eligibility |
| eligible_jurisdictions | array | Yes | Jurisdictions |
| draw_method | enum | Yes | Selection mechanism |
| claim_period_seconds | integer | Conditional | Claim period |
| effective_at | timestamp | Yes | Effective date |
| expires_at | timestamp | No | Expiration |
| approval_reference | string | Yes | Governance approval |

---

## Ruleset Invariants

Rulesets are immutable.

Historical Entries permanently reference the exact Ruleset version used during acceptance.

A newer Ruleset never changes the meaning of historical participation.

# Canonical Entry Request Entity

## Definition

An Entry Request represents a customer's request to participate in a Pool before that participation becomes an authoritative Entry.

An Entry Request is a workflow object.

It is **not** an Entry.

Only successful completion of all required validation, eligibility, financial, and business rules results in an Entry.

---

## Authoritative Owner

```text
Pools & Sweepstakes
```

---

## Canonical Identifier

```text
entry_request_id
```

Example:

```text
erq_01J...
```

---

## Core Entry Request Fields

| Field | Type | Required | Classification | Meaning |
|--------|------|----------|----------------|---------|
| entry_request_id | string | Yes | Confidential | Stable request identifier |
| customer_id | string | Yes | Confidential | Requesting Customer |
| pool_id | string | Yes | Confidential | Target Pool |
| entry_method | enum | Yes | Confidential | Participation method |
| requested_quantity | integer | Yes | Confidential | Requested Entries |
| status | enum | Yes | Confidential | Workflow status |
| ruleset_version | string | Yes | Internal | Rules evaluated |
| requested_at | timestamp | Yes | Confidential | Submission time |
| accepted_at | timestamp | No | Confidential | Acceptance time |
| rejected_at | timestamp | No | Confidential | Rejection time |
| payment_id | string | No | Confidential | Related Payment |
| risk_evaluation_id | string | No | Restricted | Related Risk Evaluation |
| reason_code | string | No | Restricted | Internal outcome |
| customer_safe_reason_code | string | No | Confidential | Customer explanation |
| correlation_id | string | Yes | Internal | Workflow correlation |

---

## Entry Request Status

```text
received

validating

pending-risk

pending-payment

accepted

rejected

cancelled

expired
```

---

## Entry Request Invariants

An Entry Request:

- cannot become accepted more than once
- is never itself a participation record
- cannot bypass eligibility
- cannot bypass financial validation
- cannot be accepted after Pool lock
- preserves all decision history

---

# Canonical Entry Entity

## Definition

An Entry is the authoritative accepted participation record within a Pool.

An Entry exists only after all required validation has completed successfully.

An Entry becomes part of the governed drawing population.

---

## Authoritative Owner

```text
Pools & Sweepstakes
```

---

## Canonical Identifier

```text
entry_id
```

Example:

```text
ent_01J...
```

---

## Core Entry Fields

| Field | Type | Required | Classification | Meaning |
|--------|------|----------|----------------|---------|
| entry_id | string | Yes | Confidential | Stable Entry identifier |
| entry_request_id | string | Yes | Confidential | Originating request |
| customer_id | string | Yes | Confidential | Participating Customer |
| pool_id | string | Yes | Confidential | Associated Pool |
| entry_method | enum | Yes | Confidential | Accepted method |
| quantity | integer | Yes | Confidential | Accepted quantity |
| ruleset_version | string | Yes | Internal | Rules applied |
| status | enum | Yes | Confidential | Lifecycle |
| accepted_at | timestamp | Yes | Confidential | Acceptance |
| locked_at | timestamp | No | Confidential | Frozen population |
| invalidated_at | timestamp | No | Restricted | Invalidation |
| cancelled_at | timestamp | No | Confidential | Cancellation |
| entry_lock_id | string | No | Restricted | Frozen population reference |
| record_version | integer | Yes | Internal | Aggregate version |

---

## Entry Status

```text
accepted

locked

withdrawn

cancelled

invalidated

selected

non-winning
```

---

## Entry Invariants

An Entry:

- belongs to one Customer
- belongs to one Pool
- originates from one Entry Request
- preserves historical Ruleset version
- remains auditable forever
- participates in no more than one frozen Entry population
- is never silently removed from Draw evidence

---

# Canonical Entry Lock Entity

## Definition

An Entry Lock represents the immutable frozen population of eligible Entries used by a Draw.

Once created, the Entry population is fixed.

---

## Authoritative Owner

```text
Pools & Sweepstakes
```

---

## Canonical Identifier

```text
entry_lock_id
```

Example:

```text
elk_01J...
```

---

## Core Entry Lock Fields

| Field | Type | Required | Classification | Meaning |
|--------|------|----------|----------------|---------|
| entry_lock_id | string | Yes | Restricted | Stable identifier |
| pool_id | string | Yes | Restricted | Associated Pool |
| ruleset_version | string | Yes | Restricted | Rules used |
| eligible_entry_count | integer | Yes | Restricted | Eligible Entries |
| excluded_entry_count | integer | Yes | Restricted | Excluded Entries |
| population_snapshot_reference | string | Yes | Restricted | Immutable snapshot |
| population_integrity_hash | string | Yes | Restricted | Integrity verification |
| locked_at | timestamp | Yes | Restricted | Lock completion |
| created_by | string | Yes | Restricted | Authorized actor |
| approval_reference | string | Conditional | Restricted | Governance approval |

---

## Entry Lock Invariants

Entry Locks:

- are immutable
- occur after Pool lock
- occur before Draw execution
- preserve integrity evidence
- cannot silently change
- support reproducible Winner selection

---

# Canonical Draw Entity

## Definition

A Draw represents the authoritative execution that selects Winner records from the frozen Entry population.

A Draw is evidence of execution.

It is not merely a timestamp.

---

## Authoritative Owner

```text
Pools & Sweepstakes
```

---

## Canonical Identifier

```text
draw_id
```

Example:

```text
drw_01J...
```

---

## Core Draw Fields

| Field | Type | Required | Classification | Meaning |
|--------|------|----------|----------------|---------|
| draw_id | string | Yes | Restricted | Stable identifier |
| pool_id | string | Yes | Restricted | Pool |
| entry_lock_id | string | Yes | Restricted | Frozen Entries |
| selection_mechanism | string | Yes | Restricted | Approved mechanism |
| selection_mechanism_version | string | Yes | Restricted | Version |
| randomness_reference | string | Conditional | Restricted | Evidence |
| status | enum | Yes | Restricted | Lifecycle |
| started_at | timestamp | Yes | Restricted | Start |
| completed_at | timestamp | No | Restricted | Completion |
| audit_evidence_reference | string | Yes | Restricted | Audit evidence |
| initiated_by | string | Yes | Restricted | Authorized actor |
| record_version | integer | Yes | Restricted | Aggregate version |

---

## Draw Status

```text
prepared

started

winner-selected

completed

failed

voided
```

---

## Draw Invariants

A Draw:

- references one Pool
- references one Entry Lock
- preserves execution evidence
- never overwrites history
- produces governed Winner records
- is fully auditable

---

# Canonical Winner Entity

## Definition

A Winner represents the authoritative selection outcome produced by an approved Draw.

The Winner records the result of selection.

It does not replace the Entry, Customer, or Draw.

---

## Authoritative Owner

```text
Pools & Sweepstakes
```

---

## Canonical Identifier

```text
winner_id
```

Example:

```text
win_01J...
```

---

## Core Winner Fields

| Field | Type | Required | Classification | Meaning |
|--------|------|----------|----------------|---------|
| winner_id | string | Yes | Restricted | Stable Winner identifier |
| draw_id | string | Yes | Restricted | Source Draw |
| pool_id | string | Yes | Restricted | Source Pool |
| winning_entry_id | string | Yes | Restricted | Winning Entry |
| customer_id | string | Yes | Restricted | Winning Customer |
| status | enum | Yes | Restricted | Lifecycle |
| selected_at | timestamp | Yes | Restricted | Selection |
| confirmed_at | timestamp | No | Restricted | Confirmation |
| disqualified_at | timestamp | No | Restricted | Disqualification |
| replacement_sequence | integer | No | Restricted | Replacement order |
| replaces_winner_id | string | No | Restricted | Previous Winner |
| audit_evidence_reference | string | Yes | Restricted | Draw evidence |
| record_version | integer | Yes | Restricted | Aggregate version |

---

## Winner Status

```text
selected

pending-confirmation

confirmed

disqualified

replaced

claim-expired
```

---

## Winner Invariants

A Winner:

- references one Draw
- references one Entry
- preserves historical selection
- cannot silently move to another Customer
- cannot be deleted
- preserves replacement history
- remains permanently traceable

---

## Canonical Winner Event

The authoritative event is:

```text
winner.selected
```

The following event name is prohibited:

```text
entry.winner.selected
```

# Canonical Prize Assignment Entity

## Definition

A Prize Assignment is the authoritative business record that connects a selected Winner to the Prize awarded by a Pool.

A Prize Assignment establishes the platform's obligation to deliver the awarded Prize.

It is distinct from:

- Catalog Item
- Winner
- Prize Claim
- Fulfillment
- Payment
- Payout
- Inventory Reservation

---

## Authoritative Owner

```text
Pools & Sweepstakes
```

Catalog owns the Prize definition.

Fulfillment owns delivery execution.

Payments & Payouts owns monetary payout execution.

---

## Canonical Identifier

```text
prize_assignment_id
```

Example:

```text
pas_01J...
```

---

## Core Prize Assignment Fields

| Field | Type | Required | Classification | Meaning |
|--------|------|----------|----------------|---------|
| prize_assignment_id | string | Yes | Restricted | Stable identifier |
| winner_id | string | Yes | Restricted | Associated Winner |
| customer_id | string | Yes | Restricted | Prize recipient |
| pool_id | string | Yes | Restricted | Source Pool |
| catalog_item_id | string | Yes | Internal | Awarded Prize |
| catalog_item_version | integer | Yes | Internal | Prize version |
| prize_type | enum | Yes | Restricted | Physical, digital, cash, or other approved type |
| status | enum | Yes | Restricted | Assignment lifecycle |
| assigned_at | timestamp | Yes | Restricted | Assignment time |
| claim_required | boolean | Yes | Restricted | Whether a claim is required |
| claim_deadline | timestamp | No | Restricted | Claim deadline |
| fulfillment_required | boolean | Yes | Internal | Delivery required |
| fulfillment_id | string | No | Restricted | Fulfillment reference |
| payout_id | string | No | Restricted | Payout reference |
| completed_at | timestamp | No | Restricted | Completion time |
| cancelled_at | timestamp | No | Restricted | Cancellation |
| record_version | integer | Yes | Internal | Aggregate version |

---

## Prize Assignment Status

```text
assigned

claim-pending

claim-completed

claim-expired

fulfillment-pending

fulfillment-in-progress

fulfilled

payout-pending

paid

cancelled
```

---

## Prize Assignment Invariants

A Prize Assignment:

- references exactly one Winner
- preserves the exact Prize definition
- cannot silently transfer ownership
- cannot be deleted
- remains fully auditable
- preserves historical obligations permanently

---

# Canonical Prize Claim Entity

## Definition

A Prize Claim represents the governed process through which a Winner satisfies all required conditions before receiving an awarded Prize.

Not every Prize requires a claim.

---

## Authoritative Owner

```text
Pools & Sweepstakes
```

Identity & Profile may provide verification.

Sweepstakes Compliance may provide policy decisions.

Neither owns the Prize Claim lifecycle.

---

## Canonical Identifier

```text
prize_claim_id
```

Example:

```text
clm_01J...
```

---

## Core Prize Claim Fields

| Field | Type | Required | Classification | Meaning |
|--------|------|----------|----------------|---------|
| prize_claim_id | string | Yes | Restricted | Stable identifier |
| prize_assignment_id | string | Yes | Restricted | Associated assignment |
| winner_id | string | Yes | Restricted | Winning participant |
| customer_id | string | Yes | Restricted | Claiming customer |
| status | enum | Yes | Restricted | Claim lifecycle |
| required_action_types | array | Yes | Restricted | Required claim actions |
| started_at | timestamp | Yes | Restricted | Workflow start |
| deadline_at | timestamp | Yes | Restricted | Claim deadline |
| submitted_at | timestamp | No | Restricted | Submission |
| completed_at | timestamp | No | Restricted | Completion |
| expired_at | timestamp | No | Restricted | Expiration |
| verification_id | string | No | Restricted | Supporting verification |
| compliance_review_id | string | No | Restricted | Compliance review |
| record_version | integer | Yes | Restricted | Aggregate version |

---

## Prize Claim Status

```text
pending

in-progress

submitted

under-review

completed

rejected

expired

cancelled
```

---

## Prize Claim Rules

Prize Claims:

- preserve evidence separately
- never embed sensitive documents
- preserve verification references
- remain fully auditable

---

# Canonical Fulfillment Entity

## Definition

Fulfillment represents the operational execution of delivering a physical or digital Prize.

Fulfillment begins only after Prize Assignment requirements have been satisfied.

---

## Authoritative Owner

```text
Fulfillment
```

---

## Canonical Identifier

```text
fulfillment_id
```

Example:

```text
ful_01J...
```

---

## Core Fulfillment Fields

| Field | Type | Required | Meaning |
|--------|------|----------|---------|
| fulfillment_id | string | Yes | Stable identifier |
| prize_assignment_id | string | Yes | Prize Assignment |
| customer_id | string | Yes | Recipient |
| catalog_item_id | string | Yes | Delivered item |
| fulfillment_method | enum | Yes | Shipment, pickup, digital |
| status | enum | Yes | Lifecycle |
| tracking_reference | string | No | Shipment reference |
| provider_reference | string | No | Provider reference |
| shipped_at | timestamp | No | Shipment |
| delivered_at | timestamp | No | Delivery |
| completed_at | timestamp | No | Completion |
| record_version | integer | Yes | Aggregate version |

---

## Fulfillment Invariants

Fulfillment:

- never owns Prize definitions
- never owns Winners
- never owns Catalog
- never owns Inventory
- executes delivery only

---

# Canonical Ledger Entity

## Definition

The Ledger Entry is the single authoritative record of every financial fact in Project Zero-Loss. Every deposit, entry debit, rebate, refund, payout, and correction exists as one immutable Ledger Entry.

Ledger Entries are never edited or deleted. A correction is a new, additional Ledger Entry that offsets a prior one.

---

## Authoritative Owner

```text
Ledger
```

---

## Canonical Identifier

```text
ledger_entry_id
```

Example:

```text
len_01J...
```

---

## Core Ledger Entry Fields

| Field | Type | Required | Meaning |
|--------|------|----------|---------|
| ledger_entry_id | string | Yes | Stable identifier |
| customer_id | string | Yes | Owning customer |
| entry_type | enum | Yes | e.g. DEPOSIT, ENTRY_DEBIT, REBATE_CREDIT, REFUND, PAYOUT, CORRECTION |
| balance_type | enum | Yes | PLAYABLE, REBATE, or other approved bucket |
| amount | integer | Yes | Value in minor currency units (cents) — never a float |
| currency | string | Yes | ISO currency code |
| source_event | string | Yes | The business event that produced this entry (e.g. `entry.accepted`, `winner.selected`) |
| related_pool_id | string | No | Pool associated with this entry, if applicable |
| related_entry_id | string | No | Entry (Pools domain) associated with this entry, if applicable |
| corrects_ledger_entry_id | string | No | Set only when this entry is a compensating correction of a prior entry |
| created_at | timestamp | Yes | Immutable creation time |

---

## Ledger Invariants

Ledger:

- is the only authoritative financial record in the platform
- never mutates or deletes an existing entry
- represents corrections only as new, additional entries
- never owns customer identity, Pools, Entries, or Catalog
- is the only source Wallet may derive a balance from

---

# Canonical Wallet Entity

## Definition

Wallet is the customer-facing presentation of approved, derived financial standing. A Wallet balance is always computed from Ledger Entries — it is never an independently stored source of truth.

---

## Authoritative Owner

```text
Wallet
```

---

## Canonical Identifier

```text
wallet_balance_id
```

Example:

```text
wal_01J...
```

---

## Core Wallet Fields

| Field | Type | Required | Meaning |
|--------|------|----------|---------|
| wallet_balance_id | string | Yes | Stable identifier for this cached projection row |
| customer_id | string | Yes | Owning customer |
| balance_type | enum | Yes | PLAYABLE, REBATE, or other approved bucket |
| current_balance | integer | Yes | Derived total in minor currency units — a cache of Ledger history, not authoritative |
| last_recalculated_at | timestamp | Yes | When this projection was last derived from the Ledger |
| last_ledger_entry_id | string | Yes | The most recent Ledger Entry included in this projection, for reconciliation |

---

## Wallet Invariants

Wallet:

- never stores a balance that is not derivable from Ledger Entries
- never becomes a competing financial ledger
- never determines Pool outcomes or eligibility
- must be recalculable from Ledger history alone if this projection is ever lost or corrupted

---

# Canonical Catalog Item Entity

## Definition

A Catalog Item is the authoritative description of a product, gift card, or prize that may be associated with one or more Pools. Catalog Items describe what something is — they never describe pricing rules, financial value beyond descriptive MSRP/valuation, or participation mechanics.

---

## Authoritative Owner

```text
Catalog
```

---

## Canonical Identifier

```text
catalog_item_id
```

Example:

```text
itm_01J...
```

---

## Core Catalog Item Fields

| Field | Type | Required | Meaning |
|--------|------|----------|---------|
| catalog_item_id | string | Yes | Stable identifier, never reused |
| name | string | Yes | Product/prize name |
| category | string | Yes | Primary category |
| brand_id | string | No | Associated brand, if any |
| retailer_id | string | No | Associated retailer, if any |
| msrp | integer | No | Descriptive retail value in minor currency units |
| status | enum | Yes | Draft, Active, Featured, Hidden, Archived, Discontinued |
| created_at | timestamp | Yes | Creation time |
| updated_at | timestamp | Yes | Last update time |

---

## Catalog Item Invariants

Catalog Item:

- never owns pricing/participation logic — Pools reference Catalog Items, not the reverse
- never owns financial records, balances, or Ledger data
- preserves a stable identifier even if archived, so historical Pool/Entry/Prize references remain meaningful
- may be referenced by many Pools over time without duplication

---

# Enterprise Data Governance

## Ownership Governance

Every authoritative entity has exactly one owner.

Ownership cannot be shared.

Derived projections never become authoritative.

---

## Historical Integrity

Historical records must never be overwritten.

Corrections occur through:

- reversals
- superseding records
- replacement records
- corrective events

Financial history is immutable.

---

## Cross-Domain References

Domains reference one another using canonical identifiers.

They do not duplicate:

- Customer Profiles
- Wallet balances
- Ledger data
- Membership state
- Verification evidence

---

## Data Classification Governance

Every field must be classified as:

```text
Public

Internal

Confidential

Restricted
```

Classification governs:

- storage
- encryption
- transmission
- logging
- auditing
- API exposure

---

## Retention Principles

Each entity must define an approved retention policy.

Retention classes include:

- Operational
- Financial
- Compliance
- Security
- Customer History
- Analytics
- Legal Hold

Deletion must never compromise:

- Ledger integrity
- Draw history
- Winner history
- Compliance evidence
- Audit history

---

## Data Quality Requirements

Every authoritative entity must support:

- validation
- versioning
- auditability
- traceability
- ownership
- lifecycle governance

---

## Observability

Enterprise data operations must support monitoring for:

- validation failures
- reconciliation failures
- duplicate identities
- Outbox failures
- Inbox failures
- Dead Letter queues
- projection rebuild failures
- data quality violations

---

## Security Requirements

Sensitive enterprise data must:

- remain encrypted in transit
- remain encrypted at rest
- use least-privilege authorization
- avoid unnecessary duplication
- prevent unauthorized disclosure
- preserve complete audit history

---

## AI Implementation Requirements

All AI-generated code must implement the entities defined in this document exactly as specified.

AI must not:

- invent entities
- rename canonical entities
- redefine ownership
- create conflicting schemas
- duplicate financial truth
- bypass governance

---

# Enterprise Acceptance Criteria

This Enterprise Data Dictionary is complete when:

- Every enterprise entity has one authoritative owner.
- Every identifier follows canonical standards.
- Every lifecycle is explicitly governed.
- Every relationship preserves bounded-context ownership.
- Every API contract derives its models from this dictionary.
- Every Domain Event uses canonical entity names.
- Ledger remains the authoritative financial source of truth.
- Wallet remains a derived projection.
- Pools & Sweepstakes owns Entries, Draws, Winners, and Prize Assignments.
- Membership owns membership lifecycle.
- Historical business facts remain immutable.
- AI-generated implementations remain consistent with this document.
- All future architectural specifications conform to this enterprise vocabulary.

---

# Related Architecture Documents

This specification must remain consistent with:

- Master Architecture
- Domain Ownership Matrix
- Domain Event Catalog
- Output Contract
- AI Operating Rules
- All Architecture Decision Records (ADRs)
- All Capability Specifications
- All Operations Specifications
- All Product Specifications

---

# Revision History

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | July 2026 | Initial enterprise data dictionary |
| 2.0 | July 2026 | Expanded and consolidated authoritative enterprise architecture edition |
| 2.1 | July 2026 | Added Canonical Ledger, Wallet, and Catalog Item entities to close the gap flagged in the implementation-readiness audit. |

---

# Guiding Statement

The Enterprise Data Dictionary is the canonical vocabulary of Project Zero-Loss.

Every database schema, API contract, domain event, integration, analytics model, AI-generated implementation, and operational process must derive its business terminology from this document.

No implementation may redefine an entity, ownership boundary, or business meaning established herein without formal architecture approval.