# Project Zero-Loss
# Domain Event Catalog

**Document Path:** `docs/architecture/domain-event-catalog.md`  
**Document Type:** Authoritative Architecture Specification  
**Version:** 1.0  
**Status:** Draft for Founder Review  
**Last Updated:** July 2026  
**Authority Level:** Architecture  
**Applies To:** Entire Project Zero-Loss Platform

---

# 1. Purpose

The Domain Event Catalog establishes the authoritative event taxonomy for Project Zero-Loss.

Every significant business fact that occurs within the platform must be represented by a canonical domain event.

This document defines:

- canonical event names
- event ownership
- publishing responsibilities
- permitted consumers
- event structure
- event metadata
- versioning strategy
- correlation rules
- causation rules
- ordering expectations
- idempotency requirements
- replay behavior
- retention guidance
- security requirements
- privacy classifications
- integration responsibilities
- governance for future event additions

This catalog ensures every service, API, administrator, AI implementation, and future engineering team uses the same event language.

---

# 2. Architectural Authority

This document is authoritative for every event published within Project Zero-Loss.

Event names defined here supersede locally invented names within individual capabilities.

Document precedence is:

1. `master-architecture.md`
2. `domain-ownership-matrix.md`
3. `domain-event-catalog.md`
4. Capability specifications
5. Operations specifications
6. Product specifications

Whenever an event naming conflict exists, this document governs unless superseded by the Master Architecture.

---

# 3. Purpose of Domain Events

Domain events communicate completed business facts.

They allow independent bounded contexts to collaborate while preserving clear ownership boundaries.

Events are not:

- commands
- requests
- queries
- UI messages
- notifications
- database triggers
- implementation details

Events exist to communicate that something meaningful has already happened.

Examples include:

- a Pool opened
- an Entry was accepted
- a Winner was selected
- a payment was authorized
- a Ledger entry was posted
- a membership was activated
- a notification was delivered

The event communicates the completed fact.

It does not transfer ownership of that fact.

---

# 4. Core Event Principles

Every event within Project Zero-Loss shall follow the principles defined below.

---

## 4.1 Completed Business Facts

Events must describe something that has already occurred.

Correct:

- `entry.accepted`
- `winner.selected`
- `payment.authorized`
- `ledger.entry.posted`

Incorrect:

- `accept.entry`
- `authorize.payment`
- `process.draw`
- `calculate.balance`

Commands request work.

Events describe completed work.

---

## 4.2 Single Authoritative Publisher

Every event has exactly one authoritative publisher.

Only the domain owning the completed business fact may publish the canonical event.

Examples:

Pools publishes:

- `entry.accepted`
- `winner.selected`

Ledger publishes:

- `ledger.entry.posted`

Payments publishes:

- `payment.authorized`

Identity publishes:

- `customer.verified`

No consumer may republish these same events as though they originated the business fact.

---

## 4.3 Immutable History

Once published, an event must never be edited.

If a mistake occurs:

- publish a correcting event
- preserve the original event
- preserve audit history

Historical events remain immutable.

---

## 4.4 Business Language

Events should use business language.

Preferred:

- `pool.opened`
- `entry.rejected`
- `membership.activated`

Avoid technical language such as:

- `db.insert.completed`
- `api.response.sent`
- `row.updated`
- `queue.message.sent`

Business events must remain meaningful even if implementation changes.

---

## 4.5 Domain Ownership

Each event belongs to exactly one bounded context.

Examples:

Pools owns:

- Pool events
- Entry events
- Draw events
- Winner events

Ledger owns:

- Ledger events

Catalog owns:

- Product events

Fraud owns:

- Risk events

Notifications owns:

- Delivery events

Ownership never transfers because another domain consumes the event.

# 5. Event Naming Standard

Project Zero-Loss uses a consistent naming convention.

Every canonical event shall follow:

```text
domain.object.action
```

Examples:

```text
customer.created
customer.verified
pool.created
pool.opened
entry.accepted
winner.selected
payment.authorized
ledger.entry.posted
membership.activated
notification.delivered
```

Some domains require an additional level of specificity.

Examples:

```text
ledger.entry.posted
ledger.entry.reversed

payment.refund.completed
payment.payout.completed

catalog.item.created
catalog.inventory.reserved
```

---

## 5.1 Naming Requirements

Canonical event names shall:

- be lowercase
- use periods as separators
- use singular nouns
- use business terminology
- use completed actions
- remain stable over time
- avoid abbreviations
- avoid implementation details
- avoid database terminology

---

## 5.2 Naming Prohibitions

The following are prohibited.

### snake_case

```text
payment_authorized
```

### camelCase

```text
paymentAuthorized
```

### PascalCase

```text
PaymentAuthorized
```

### Past participles mixed with verbs

```text
payment.authorize.completed
```

### Technical implementation names

```text
row.inserted
queue.sent
http.response.created
```

### UI terminology

```text
button.clicked
screen.loaded
dialog.closed
```

Only meaningful business events belong in this catalog.

---

# 6. Event Lifecycle

Every canonical event progresses through a standard lifecycle.

---

## Event Creation

The owning domain determines that:

- business validation completed
- invariants remain satisfied
- authoritative state changed
- business fact now exists

Only then may an event be created.

---

## Event Publication

Publication communicates the completed business fact.

Publication should occur after authoritative persistence succeeds.

An event must never announce a state change that did not actually occur.

---

## Event Consumption

Consumers receive events for purposes such as:

- updating projections
- initiating workflows
- notifying customers
- analytics
- search indexing
- reporting
- fraud evaluation
- recommendation updates

Consumers do not become authoritative.

---

## Event Retention

Events should remain available long enough to support:

- replay
- audit
- reconciliation
- analytics
- historical investigation
- operational recovery

Retention periods are governed separately.

---

# 7. Event Categories

Project Zero-Loss groups events into canonical business categories.

---

## Identity Events

**Published by:**

Identity & Profile

Examples:

```text
customer.created
customer.updated
customer.verified
customer.suspended
customer.reactivated
customer.deleted
customer.security.updated
```

---

## Pool Events

**Published by:**

Pools & Sweepstakes

Examples:

```text
pool.created
pool.updated
pool.published
pool.scheduled
pool.opened
pool.locked
pool.drawing.started
pool.drawing.completed
pool.prize.processing.started
pool.completed
pool.cancelled
```

---

## Entry Events

**Published by:**

Pools & Sweepstakes

Examples:

```text
entry.requested
entry.validated
entry.accepted
entry.rejected
entry.locked
entry.withdrawn
entry.cancelled
```

---

## Winner Events

**Published by:**

Pools & Sweepstakes

Examples:

```text
winner.selected
winner.confirmed
winner.disqualified
winner.replaced
```

---

## Prize Events

**Published by:**

Pools & Sweepstakes

Examples:

```text
prize.assigned
prize.claim.started
prize.claim.completed
prize.claim.expired
prize.fulfilled
```

Catalog publishes separate inventory events.

Prize fulfillment milestones remain owned by Pools.

## Catalog Events

**Published by:**

Catalog

Examples:

```text
catalog.item.created
catalog.item.updated
catalog.item.published
catalog.item.archived
catalog.inventory.reserved
catalog.inventory.released
catalog.inventory.depleted
```

---

## Ledger Events

**Published by:**

Ledger

Examples:

```text
ledger.entry.posted
ledger.entry.reversed
ledger.adjustment.posted
ledger.balance.recalculated
```

Ledger never publishes Wallet events.

---

## Wallet Events

**Published by:**

Wallet

Examples:

```text
wallet.operation.completed
wallet.operation.failed
wallet.status.changed
wallet.view.updated
```

Wallet events never replace Ledger events.

---

## Payment Events

**Published by:**

Payments & Payouts

Examples:

```text
payment.authorized
payment.captured
payment.failed
payment.refund.started
payment.refund.completed
payment.payout.started
payment.payout.completed
payment.chargeback.created
```

---

## Membership Events

**Published by:**

Membership

Examples:

```text
membership.created
membership.activated
membership.upgraded
membership.downgraded
membership.expired
membership.cancelled
```

---

## Fraud Events

**Published by:**

Fraud & Risk

Examples:

```text
risk.score.calculated
risk.restriction.applied
risk.restriction.removed
fraud.case.created
fraud.case.closed
```

---

## Notification Events

**Published by:**

Notifications

Examples:

```text
notification.created
notification.sent
notification.delivered
notification.failed
notification.expired
```

---

## Communication Events

**Published by:**

Communications

Examples:

```text
campaign.created
campaign.approved
campaign.scheduled
campaign.started
campaign.completed
campaign.cancelled
```

---

## Search Events

**Published by:**

Search

Examples:

```text
search.index.started
search.index.completed
search.index.failed
```

---

## Recommendation Events

**Published by:**

Recommendations

Examples:

```text
recommendation.generated
recommendation.served
recommendation.dismissed
```

---

## Activity History Events

**Published by:**

Activity History

Examples:

```text
activity.timeline.updated
activity.timeline.rebuilt
```

Activity History never republishes Pool or Entry events.

---

## Analytics Events

**Published by:**

Analytics

Examples:

```text
analytics.snapshot.completed
analytics.pipeline.completed
analytics.reconciliation.completed
```

Analytics events describe analytical work.

They do not describe operational business facts.

---

# 8. Event Ownership Rules

Ownership of an event follows ownership of the underlying business fact.

Examples:

| Business Fact | Publisher |
|--------------|-----------|
| Customer created | Identity & Profile |
| Pool opened | Pools & Sweepstakes |
| Entry accepted | Pools & Sweepstakes |
| Winner selected | Pools & Sweepstakes |
| Payment authorized | Payments & Payouts |
| Ledger entry posted | Ledger |
| Membership activated | Membership |
| Risk restriction applied | Fraud & Risk |
| Notification delivered | Notifications |

Consumers may:

- react
- update projections
- begin workflows
- notify customers
- record analytics

Consumers must never redefine the published fact.

---

# 9. Event vs Command

Project Zero-Loss distinguishes commands from events.

Commands express intent.

Events communicate completed facts.

Examples:

| Command | Event |
|----------|-------|
| Submit Entry | entry.accepted |
| Execute Draw | winner.selected |
| Authorize Payment | payment.authorized |
| Activate Membership | membership.activated |
| Deliver Notification | notification.delivered |

Commands travel toward authority.

Events travel away from authority.

They are never interchangeable.

# 10. Event Envelope Standard

Every canonical domain event must use a standardized event envelope.

The event envelope provides consistent metadata for:

- routing
- traceability
- idempotency
- replay
- versioning
- observability
- audit
- privacy handling
- security review

The envelope must remain stable across bounded contexts.

---

## 10.1 Required Event Envelope Fields

Every canonical event must include:

```json
{
  "event_id": "evt_01J...",
  "event_name": "entry.accepted",
  "event_version": 1,
  "occurred_at": "2026-07-26T18:45:00Z",
  "published_at": "2026-07-26T18:45:01Z",
  "producer": "pools-and-sweepstakes",
  "aggregate_type": "entry",
  "aggregate_id": "ent_01J...",
  "correlation_id": "cor_01J...",
  "causation_id": "cmd_01J...",
  "tenant_id": null,
  "environment": "production",
  "data_classification": "internal",
  "payload": {}
}
```

---

## 10.2 Field Definitions

### `event_id`

A globally unique immutable identifier for the event instance.

Requirements:

- generated once
- never reused
- never changed
- preserved during retries
- preserved during replay
- suitable for consumer deduplication

---

### `event_name`

The canonical event name defined by this catalog.

Examples:

```text
customer.verified
pool.opened
entry.accepted
winner.selected
payment.authorized
ledger.entry.posted
```

Locally invented aliases are prohibited.

---

### `event_version`

The schema version of the event contract.

Requirements:

- positive integer
- incremented only for contract changes
- independent from application version
- independent from deployment version
- validated by consumers

Example:

```json
"event_version": 1
```

---

### `occurred_at`

The authoritative time when the business fact occurred.

This timestamp must be generated by the owning domain using trusted server-side time.

---

### `published_at`

The time when the event was published to the event infrastructure.

`published_at` may be later than `occurred_at`.

Consumers must not assume they are identical.

---

### `producer`

The canonical identifier of the publishing bounded context.

Examples:

```text
identity-and-profile
pools-and-sweepstakes
ledger
payments-and-payouts
fraud-and-risk
notifications
```

---

### `aggregate_type`

The type of authoritative business entity affected.

Examples:

```text
customer
pool
entry
draw
winner
prize-assignment
payment
ledger-entry
membership
notification
```

---

### `aggregate_id`

The stable identifier of the affected authoritative entity.

Consumers may use this identifier for:

- correlation
- projection updates
- authoritative API lookups
- audit references

Possession of an aggregate identifier does not grant authorization.

---

### `correlation_id`

The identifier connecting all related operations within one business workflow.

Examples include:

- paid Entry workflow
- refund workflow
- Prize Processing workflow
- membership activation workflow
- reward issuance workflow

The same correlation identifier should flow across participating domains.

---

### `causation_id`

The identifier of the request, command, event, or operation that directly caused this event.

Examples:

- command ID
- prior event ID
- administrative action ID
- provider callback ID
- scheduled-job execution ID

The causation identifier establishes the immediate cause.

The correlation identifier establishes the broader workflow.

---

### `tenant_id`

Reserved for future multi-tenant use.

For the initial Zero-Loss platform, this field may be:

```json
null
```

It must not be repurposed for customer identity, membership, jurisdiction, or environment.

---

### `environment`

The platform environment in which the event occurred.

Approved examples:

```text
development
test
staging
production
```

Production consumers must not process non-production events unless explicitly designed for governed testing.

---

### `data_classification`

The highest data sensitivity classification contained in the event.

Approved baseline classifications:

```text
public
internal
confidential
restricted
```

The classification must reflect the actual payload.

---

### `payload`

The business-specific event data.

The payload must:

- contain only fields needed by approved consumers
- avoid unnecessary duplication
- use stable field names
- preserve source authority
- comply with privacy controls
- comply with security controls
- conform to the registered event schema

# 11. Optional Event Envelope Fields

Optional fields may be included when required by the event contract.

Examples include:

```json
{
  "actor": {
    "actor_type": "customer",
    "actor_id": "cus_01J..."
  },
  "subject_id": "cus_01J...",
  "jurisdiction": "US-NY",
  "trace_id": "trc_01J...",
  "schema_uri": "event-schema://entry.accepted/v1",
  "partition_key": "ent_01J...",
  "sequence_number": 14,
  "reason_code": "ENTRY_VALIDATION_PASSED",
  "source_system": "zero-loss-api",
  "provider_reference": null
}
```

Optional fields must not be added inconsistently without documentation.

---

## 11.1 Actor

The actor identifies who or what initiated the action that led to the event.

Approved actor types may include:

```text
customer
administrator
service
scheduled-job
external-provider
system
```

The actor is not always the subject of the event.

Example:

An administrator may suspend a customer.

The administrator is the actor.

The customer is the subject.

---

## 11.2 Subject Identifier

The subject identifier identifies the customer or entity primarily affected by the event when different from the aggregate.

It should be included only when needed.

Sensitive subject information must not be embedded unnecessarily.

---

## 11.3 Jurisdiction

Jurisdiction may be included when the business fact depends on geographic or regulatory context.

Examples:

- Entry eligibility
- Pool availability
- payout restrictions
- compliance decisions
- tax treatment

Jurisdiction must use a governed format.

---

## 11.4 Trace Identifier

A trace identifier supports technical observability across distributed systems.

It does not replace:

- correlation ID
- causation ID
- event ID
- business-operation ID

---

## 11.5 Partition Key

A partition key may be used by event infrastructure to preserve ordering for related events.

Preferred keys include:

- customer ID
- Pool ID
- Entry ID
- payment ID
- Ledger transaction ID

The key must reflect the ordering boundary required by the consumer.

---

## 11.6 Sequence Number

A sequence number may be used when the producer guarantees ordered changes for one aggregate.

Requirements:

- scoped to the aggregate
- monotonically increasing
- assigned by the authoritative producer
- never inferred by consumers
- not treated as a global sequence

---

# 12. Event Payload Design Rules

Event payloads must communicate enough information for approved consumers without turning the event stream into a duplicated database.

---

## 12.1 Minimum Necessary Data

Events should include only the data required to describe and process the fact.

Preferred:

```json
{
  "entry_id": "ent_01J...",
  "pool_id": "pol_01J...",
  "customer_id": "cus_01J...",
  "accepted_at": "2026-07-26T18:45:00Z"
}
```

Avoid:

```json
{
  "customer_full_name": "...",
  "customer_email": "...",
  "customer_phone": "...",
  "customer_address": "...",
  "payment_card_details": "...",
  "complete_pool_record": {},
  "complete_customer_profile": {}
}
```

---

## 12.2 Stable Identifiers

Payloads should use stable authoritative identifiers instead of mutable display names.

Preferred:

```json
{
  "pool_id": "pol_01J...",
  "entry_id": "ent_01J..."
}
```

Display labels may be included only where there is a clear consumer need.

---

## 12.3 Snapshot vs Reference

An event may include:

- a reference to authoritative data
- a minimal snapshot of data at the time of the event

A historical snapshot is appropriate when later changes must not alter interpretation of the event.

Examples:

- membership tier used for eligibility
- rule version applied to an Entry
- Pool configuration version at lock time
- financial policy version
- jurisdiction evaluated
- Prize definition version

---

## 12.4 Monetary Values

Monetary values must be represented using integer minor units and an explicit currency.

Example:

```json
{
  "amount_minor": 2500,
  "currency": "USD"
}
```

This represents USD 25.00.

Floating-point monetary values are prohibited.

Incorrect:

```json
{
  "amount": 25.00
}
```

---

## 12.5 Percentages and Rates

Rates must use documented precision.

Example:

```json
{
  "rate_basis_points": 250
}
```

This represents 2.50%.

A field named only `rate` is prohibited unless its unit and precision are unambiguous in the registered schema.

---

## 12.6 Enumerations

Enumerated values must:

- use documented canonical values
- be case-consistent
- remain versioned
- define unknown-value behavior

Examples:

```text
accepted
rejected
pending
completed
failed
```

Consumers must not invent additional values.

---

## 12.7 Nullability

Every event schema must explicitly define whether a field is:

- required
- optional
- nullable
- conditionally required

Missing and `null` must not be treated as automatically equivalent.

# 13. Event Versioning

Event contracts must evolve without silently breaking consumers.

---

## 13.1 Versioning Principle

The event version represents the schema contract of one event name.

Example:

```text
entry.accepted version 1
entry.accepted version 2
```

The event name remains stable when the underlying business fact remains the same.

---

## 13.2 Non-Breaking Changes

The following may be non-breaking when consumers are designed to tolerate them:

- adding an optional field
- adding an optional metadata field
- expanding documentation
- adding a new non-required enumeration value where consumers support unknown values

Non-breaking changes should still be documented.

---

## 13.3 Breaking Changes

The following are breaking:

- removing a field
- renaming a field
- changing field type
- changing field meaning
- changing required to optional where interpretation changes
- changing optional to required
- changing monetary units
- changing timestamp meaning
- changing ownership
- splitting one fact into multiple incompatible facts

Breaking changes require a new event version.

---

## 13.4 New Event Name Requirement

A new event name is required when the business fact itself changes.

Example:

`payment.authorized` and `payment.captured` are separate business facts.

They must not be represented as different versions of one event.

---

## 13.5 Consumer Compatibility

Consumers must:

- declare supported versions
- reject unsupported versions safely
- ignore unknown optional fields
- avoid depending on undocumented fields
- participate in contract testing
- migrate before version retirement

---

## 13.6 Version Retirement

An event version may be retired only after:

- all registered consumers are identified
- migration is complete
- replay requirements are reviewed
- historical events remain interpretable
- operational approval is obtained
- deprecation is documented

Historical events must remain associated with their original version.

---

# 14. Correlation and Causation

Correlation and causation are mandatory for traceable cross-domain workflows.

---

## 14.1 Correlation Example

A paid Entry workflow may produce:

```text
entry.requested
risk.review.completed
payment.authorized
ledger.entry.posted
entry.accepted
notification.delivered
```

Every event in the workflow should share one correlation identifier.

---

## 14.2 Causation Example

```text
entry.requested
      ↓
payment.authorized
      ↓
ledger.entry.posted
      ↓
entry.accepted
```

Each event identifies the immediate prior request or event that caused it.

Example:

```text
payment.authorized
caused by:
authorize-payment command
```

```text
ledger.entry.posted
caused by:
payment.authorized event
```

```text
entry.accepted
caused by:
ledger.entry.posted event
```

The exact workflow may vary by approved implementation.

The causal chain must remain traceable.

---

## 14.3 New Correlation Identifier

A new correlation identifier should be created when:

- a new independent business workflow begins
- the prior workflow has completed
- the operation has a distinct business purpose
- reusing the prior identifier would create misleading traceability

---

## 14.4 Correlation Prohibitions

Do not use the following as universal correlation identifiers:

- customer ID
- email address
- session ID
- Pool ID
- payment-provider reference
- database transaction ID

These may be included separately where appropriate.

---

# 15. Event Ordering

Distributed event systems do not guarantee universal ordering.

Project Zero-Loss must define ordering only where business correctness requires it.

---

## 15.1 Aggregate Ordering

Ordering should normally be preserved within one authoritative aggregate.

Examples:

For one Pool:

```text
pool.created
pool.published
pool.opened
pool.locked
pool.drawing.started
winner.selected
pool.drawing.completed
pool.prize.processing.started
pool.completed
```

For one payment:

```text
payment.authorized
payment.captured
payment.refund.started
payment.refund.completed
```

---

## 15.2 No Global Ordering Assumption

Consumers must not assume all platform events arrive in one globally correct sequence.

An event from Payments may arrive before or after a related analytical event.

A notification-delivery event may arrive after a workflow has otherwise completed.

---

## 15.3 Out-of-Order Handling

Consumers should use:

- aggregate identifier
- event version
- occurred-at timestamp
- sequence number where provided
- authoritative status lookup where required

A consumer must not corrupt its projection because an older event arrives late.

---

## 15.4 Terminal-State Protection

Consumers must not regress an entity from a terminal authoritative state because an older event arrives after a newer event.

Example:

A completed Pool projection must not return to `drawing` because a delayed `pool.drawing.started` event arrives.

# 16. Event Delivery Semantics

Project Zero-Loss should assume at-least-once delivery unless a specific infrastructure contract guarantees otherwise.

Consumers must therefore tolerate duplicate delivery.

---

## 16.1 At-Least-Once Delivery

An event may be delivered:

- once
- more than once
- after a delay
- after consumer restart
- during replay

Duplicate delivery must not create duplicate business effects.

---

## 16.2 Exactly-Once Business Effect

Infrastructure-level exactly-once delivery is not required to achieve exactly-once business effects.

Exactly-once business effects are achieved through:

- stable event IDs
- idempotent consumers
- unique constraints
- operation records
- transactional processing
- deduplication

---

## 16.3 Delivery Acknowledgment

A consumer should acknowledge an event only after:

- validation succeeds
- required processing succeeds
- durable consumer state is saved
- downstream business effect is safely initiated or completed

Acknowledging before durable processing may lose the event effect.

---

## 16.4 Delivery Failure

A failed delivery or processing attempt must preserve:

- event ID
- consumer identity
- attempt count
- failure time
- failure reason
- retry status
- dead-letter status where applicable

---

# 17. Consumer Idempotency

Every event consumer must process repeated delivery safely.

---

## 17.1 Deduplication

Consumers should record processed event IDs where necessary.

A repeated event with the same `event_id` must not create a second business effect.

---

## 17.2 Idempotent Projection Update

Projection consumers may use:

- event ID
- aggregate version
- sequence number
- last processed timestamp
- compare-and-set behavior

Projection updates must not double-count repeated events.

---

## 17.3 Idempotent Workflow Initiation

A consumer initiating another operation must use a stable idempotency key derived from the source event or governed workflow identity.

Example:

```text
notification request idempotency key:
winner.selected:event_id
```

Repeated consumption must not create multiple unintended winner notifications.

---

## 17.4 Financial Idempotency

Financial consumers require enhanced protection.

A repeated event must never create:

- duplicate charge
- duplicate refund
- duplicate payout
- duplicate Ledger posting
- duplicate Wallet credit
- duplicate reward issuance

Financial operation identity must remain stable across retries.

---

# 18. Transactional Event Publication

A domain must not persist authoritative state and publish its event through unrelated, non-atomic operations without a recovery mechanism.

---

## 18.1 Transactional Outbox

The preferred publication pattern is a transactional outbox.

The authoritative state change and outbound event record should be committed within the same database transaction where practical.

Example:

```text
1. Validate Entry.
2. Persist accepted Entry.
3. Persist entry.accepted outbox record.
4. Commit transaction.
5. Publish outbox event.
6. Mark publication status.
```

---

## 18.2 Publication Failure

If authoritative persistence succeeds but immediate event publication fails:

- the business fact remains valid
- the outbox record remains pending
- publication is retried
- the same event ID is preserved
- duplicate events are prevented at source where practical

The domain must not roll back a completed external business fact merely because a downstream consumer is unavailable.

---

## 18.3 Phantom Event Prevention

An event must not be published before the authoritative transaction commits.

This prevents events describing state that does not exist.

---

## 18.4 Inbox Pattern

Consumers performing critical business work should use an inbox or equivalent durable receipt mechanism.

The inbox may store:

- event ID
- received time
- processing status
- retry count
- completion time
- result reference

---

# 19. Retry Policy

Retries must be governed, bounded, observable, and safe.

---

## 19.1 Retryable Failures

Examples include:

- temporary network failure
- temporary database unavailability
- provider rate limit
- event broker interruption
- dependent service timeout
- transient lock conflict

---

## 19.2 Non-Retryable Failures

Examples include:

- invalid event schema
- unsupported event version
- missing required field
- unauthorized consumer
- impossible lifecycle transition
- prohibited data classification
- permanently invalid business reference

Non-retryable failures should be routed for review rather than retried indefinitely.

---

## 19.3 Retry Strategy

Retry strategies should use:

- bounded attempts
- exponential backoff
- jitter
- maximum delay
- observability
- escalation threshold

Unbounded immediate retries are prohibited.

---

## 19.4 Retry Identity

Every retry of the same event must preserve:

- event ID
- event name
- event version
- original occurred-at timestamp
- original payload
- correlation ID
- causation ID

Retry metadata may be added by infrastructure.

The business event itself must not be rewritten.

# 20. Dead-Letter Handling

Events that cannot be processed after the approved retry policy must be moved to a dead-letter mechanism or equivalent governed failure state.

---

## 20.1 Dead-Letter Record

The dead-letter record should preserve:

- original event
- original event ID
- consumer
- failure reason
- attempt history
- first failure time
- latest failure time
- current resolution status
- assigned owner

---

## 20.2 Dead-Letter Ownership

The consumer owns resolution of its processing failure.

The producing domain owns correction only when the event itself is invalid.

Examples:

- Invalid Pools event schema → Pools owns correction.
- Valid Pool event rejected by Search projection → Search owns resolution.
- Valid payment event rejected by Analytics → Analytics owns resolution.

---

## 20.3 Dead-Letter Resolution

Approved resolution actions may include:

- retry unchanged
- deploy consumer fix and replay
- correct consumer configuration
- register new event version support
- escalate to producer for invalid event
- quarantine for security review
- mark permanently unprocessable with approval

---

## 20.4 Financial and Draw Events

Dead-letter events involving the following require enhanced operational escalation:

- Ledger postings
- payments
- refunds
- payouts
- chargebacks
- Entry acceptance
- Entry Freeze
- Draw execution
- Winner Selection
- Prize Assignment

These events must not remain silently unresolved.

---

# 21. Event Replay Governance

Event replay allows approved consumers to reprocess previously published events.

Replay supports:

- projection rebuilding
- consumer recovery
- defect correction
- analytical reprocessing
- search-index rebuilding
- migration validation
- disaster recovery
- reconciliation

Replay must be controlled because historical events may trigger real business effects if consumers are not designed safely.

---

## 21.1 Replay Principle

Replaying an event does not mean the underlying business fact occurred again.

The original event retains:

- its original event ID
- its original event name
- its original version
- its original payload
- its original occurrence time
- its original correlation ID
- its original causation ID

Replay metadata must remain separate from the authoritative event.

---

## 21.2 Replay Metadata

Event infrastructure may attach replay metadata such as:

```json
{
  "replay": {
    "is_replay": true,
    "replay_id": "rpl_01J...",
    "requested_at": "2026-07-26T20:00:00Z",
    "requested_by": "svc_projection-recovery",
    "reason": "SEARCH_INDEX_REBUILD"
  }
}
```

Replay metadata must not modify the original event payload.

---

## 21.3 Replay Authorization

Replay requests must be authorized.

Approval requirements should reflect:

- affected consumers
- event sensitivity
- event volume
- financial consequences
- customer consequences
- operational risk
- regulatory impact
- production environment impact

Replay of restricted, financial, Draw, Winner, or Prize events requires enhanced approval.

---

## 21.4 Replay-Safe Consumers

Consumers must declare whether they are:

- replay-safe
- replay-safe with controls
- not replay-safe

A replay-safe consumer processes historical events without creating unintended duplicate effects.

Examples of commonly replay-safe consumers include:

- Search projections
- Analytics pipelines
- Activity History projections
- reporting projections
- Recommendations data preparation

Consumers that trigger external or irreversible actions require additional safeguards.

Examples include:

- payment execution
- refund execution
- payout execution
- customer notification delivery
- Prize fulfillment
- reward issuance

---

## 21.5 Replay Suppression

A consumer may suppress certain side effects during replay.

Examples:

- rebuild a notification-status projection without resending notifications
- rebuild payment reporting without reauthorizing payments
- rebuild Prize history without initiating fulfillment
- rebuild Wallet views without posting Ledger entries

Replay suppression must be explicit and tested.

A consumer must not infer replay solely from event age.

---

## 21.6 Replay Scope

Replay requests must define:

- event names
- event versions
- producer
- consumer
- start time
- end time
- aggregate identifiers where applicable
- expected event count
- replay purpose
- approval reference
- rollback or remediation plan

Unbounded production replay should be avoided.

---

## 21.7 Replay Audit

Every production replay must record:

- replay ID
- requester
- approver
- affected consumer
- event selection criteria
- event count
- start time
- completion time
- failures
- skipped events
- resulting actions
- reconciliation outcome

# 22. Event Security

Domain events are part of the platform's trusted architecture and must be protected against unauthorized access, modification, replay, and misuse.

---

## 22.1 Security Principles

Every event must support:

- authenticity
- integrity
- traceability
- least privilege
- confidentiality
- accountability
- auditability

Consumers must trust both the event content and its origin.

---

## 22.2 Producer Authentication

Only the authoritative publishing domain may publish its canonical events.

Examples:

- Only Ledger publishes `ledger.entry.posted`.
- Only Payments & Payouts publishes `payment.authorized`.
- Only Pools & Sweepstakes publishes `winner.selected`.

Consumers must never impersonate another domain.

---

## 22.3 Consumer Authorization

Consumers must receive only the events required for their approved responsibilities.

Access should be governed using least-privilege principles.

Examples:

- Search receives searchable business events.
- Analytics receives analytical events.
- Notifications receives events that may trigger customer communications.
- Fraud & Risk receives events required for risk evaluation.

Broad unrestricted event access is prohibited.

---

## 22.4 Transport Security

Events transmitted between systems must use approved secure transport mechanisms.

Security controls should include:

- encrypted communication
- authenticated endpoints
- certificate validation
- trusted infrastructure
- secure service identity

Transport security protects events while in transit.

---

## 22.5 Payload Protection

Sensitive information should not be included unless required by the business contract.

Where sensitive data is necessary, appropriate protections should be applied.

Examples include:

- encryption where appropriate
- tokenization
- masking
- minimized payloads
- secure storage by consumers

Sensitive data must not be duplicated unnecessarily across multiple events.

---

## 22.6 Event Tampering

Consumers should reject events that fail integrity validation or appear to have been altered.

Examples include:

- invalid signatures where implemented
- corrupted payloads
- malformed metadata
- inconsistent schema versions
- invalid producer identity

Suspected tampering must be logged and escalated.

---

# 23. Privacy and Data Classification

Event payloads must comply with platform privacy requirements and applicable regulatory obligations.

---

## 23.1 Data Minimization

Only the minimum information necessary to support approved consumers should be included.

Consumers requiring additional information should retrieve it from the authoritative service when appropriate.

---

## 23.2 Personally Identifiable Information

Personally identifiable information (PII) should be avoided unless essential to the business fact.

Preferred examples:

```json
{
  "customer_id": "cus_01J..."
}
```

Avoid:

```json
{
  "customer_name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "555-555-5555"
}
```

Stable identifiers are preferred over personal details.

---

## 23.3 Financial Information

Events must never expose confidential financial information beyond what is required by the registered event contract.

Examples of protected information include:

- payment credentials
- bank account details
- security codes
- authentication secrets
- provider access tokens

Financial identifiers should be referenced using governed identifiers rather than sensitive account details.

---

## 23.4 Classification Levels

Every event should declare its highest applicable data classification.

Approved classifications include:

```text
public
internal
confidential
restricted
```

Consumers must apply handling rules appropriate to the declared classification.

---

## 23.5 Retention

Retention periods should follow approved platform data-retention policies.

Consumers must not retain events indefinitely unless specifically authorized.

Replay capability does not require unlimited consumer retention.

---

# 24. Observability

Event-driven systems must provide sufficient operational visibility to support monitoring, troubleshooting, auditing, and continuous improvement.

---

## 24.1 Required Observability

Operational monitoring should include:

- publication success
- publication failure
- consumer processing
- retry activity
- dead-letter volume
- replay activity
- processing latency
- throughput
- error rates

Observability must support both technical and business operations.

---

## 24.2 Metrics

Recommended metrics include:

- events published
- events consumed
- consumer lag
- retry count
- replay count
- dead-letter count
- processing duration
- publication latency
- consumer success rate
- consumer failure rate

Metrics should be collected consistently across domains.

---

## 24.3 Logging

Operational logs should include:

- event ID
- event name
- producer
- consumer
- correlation ID
- causation ID
- processing outcome
- timestamp
- failure reason where applicable

Logs should avoid unnecessary exposure of sensitive business data.

---

## 24.4 Distributed Tracing

Where supported, distributed tracing should connect related operations across participating services.

Tracing complements, but does not replace:

- event IDs
- correlation IDs
- causation IDs
- audit records

Together, these capabilities improve operational diagnostics and workflow visibility.

# 25. Testing Strategy

Domain events are contractual interfaces between bounded contexts and must be tested with the same rigor as public APIs.

Testing must verify:

- correctness
- compatibility
- resilience
- replay safety
- operational behavior
- failure handling

---

## 25.1 Producer Testing

Each publishing domain should verify:

- event name
- event version
- required metadata
- payload schema
- business correctness
- publication timing
- outbox behavior where applicable

A producer must not publish an event that violates its registered contract.

---

## 25.2 Consumer Testing

Consumers should verify:

- supported event versions
- schema validation
- idempotency
- replay behavior
- retry behavior
- dead-letter handling
- ordering assumptions
- projection correctness

Consumers should fail safely when encountering unsupported contracts.

---

## 25.3 Contract Testing

Producer and consumer compatibility should be validated through automated contract testing.

Contract tests should verify:

- required fields
- optional fields
- field types
- enumerations
- nullability
- metadata
- version compatibility

Contract tests should execute as part of the delivery pipeline.

---

## 25.4 Replay Testing

Replay-safe consumers should be tested by processing historical event streams.

Testing should verify:

- deterministic outcomes
- no duplicate business effects
- projection correctness
- replay suppression behavior
- processing performance

---

## 25.5 Failure Testing

Consumers should be tested against realistic failure scenarios.

Examples include:

- duplicate delivery
- delayed delivery
- out-of-order delivery
- malformed payloads
- unsupported versions
- unavailable dependencies
- infrastructure interruption
- retry exhaustion

Systems should fail predictably and recover safely.

---

# 26. Governance

This catalog is the authoritative definition of canonical domain events for Project Zero-Loss.

Changes to event contracts must be governed to preserve platform stability.

---

## 26.1 Authoritative Sources

Event definitions are governed by the platform architecture and supporting specifications.

When conflicts arise, precedence is:

1. `master-architecture.md`
2. `domain-ownership-matrix.md`
3. `domain-event-catalog.md`
4. Capability specifications
5. Operations specifications
6. Product specifications

---

## 26.2 Change Approval

Changes to canonical events should include review of:

- business meaning
- producer ownership
- consumer impact
- version compatibility
- replay implications
- operational impact
- security considerations
- privacy considerations

Changes should be documented before implementation.

---

## 26.3 Event Registration

Every canonical event should have a documented registration including:

- event name
- producer
- aggregate type
- version
- payload schema
- metadata requirements
- supported consumers
- security classification
- retention guidance

The event catalog should remain synchronized with implementation.

---

## 26.4 Consumer Registration

Critical consumers should document:

- supported event names
- supported versions
- replay capability
- retry strategy
- idempotency approach
- operational owner

Consumer documentation simplifies impact analysis during future changes.

---

## 26.5 Deprecation

An event or event version may be deprecated only after:

- replacement is documented
- consumers have migrated
- operational approval is obtained
- replay implications are reviewed
- retirement timing is communicated

Deprecated events remain historically valid.

---

# 27. Summary

The Project Zero-Loss event architecture is founded on several core principles:

- Events represent completed business facts.
- Every event has one authoritative publisher.
- Events are immutable.
- Contracts are versioned and governed.
- Consumers are idempotent.
- Financial integrity takes precedence over convenience.
- Replay is controlled and auditable.
- Security, privacy, and observability are built into every event.
- Business ownership determines event ownership.
- Canonical event names remain stable and well governed.

Following these principles enables reliable communication between bounded contexts while preserving financial integrity, operational resilience, and long-term maintainability across the Project Zero-Loss platform.

