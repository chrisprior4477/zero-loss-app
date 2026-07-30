# Project Zero-Loss

# Technical Design Review Standard

**Document Path:** `docs/engineering/technical-design-review-standard.md`  
**Document Type:** Enterprise Engineering Standard  
**Version:** 1.0  
**Status:** Authoritative  
**Authority Level:** Engineering Governance  
**Owner:** Architecture Governance, Engineering Leadership, Security Engineering, Platform Engineering, Quality Engineering, Product Management, and Bounded-Context Owners  
**Applies To:** All Features, Enhancements, Defects, Infrastructure Changes, Database Changes, API Changes, Domain Event Changes, Security Changes, Financial Changes, AI-Generated Designs, and Human Development Activities  
**Last Updated:** July 2026

---

# Document Purpose

The Technical Design Review Standard establishes the authoritative process for evaluating proposed technical designs before implementation begins.

Its purpose is to ensure that significant engineering decisions are reviewed while they remain inexpensive to change.

A design review evaluates whether a proposed solution satisfies the architectural, operational, financial, security, scalability, and maintainability requirements of Project Zero-Loss before engineering effort is committed.

The review focuses on the quality of the proposed design rather than the quality of completed implementation.

Technical Design Reviews reduce:

- architectural drift
- duplicate functionality
- conflicting ownership
- unnecessary complexity
- security vulnerabilities
- operational instability
- financial defects
- scalability limitations
- implementation rework
- long-term technical debt

Design reviews improve engineering quality by identifying problems before code exists.

---

# Architectural Authority

This document governs the review of technical designs throughout Project Zero-Loss.

It is subordinate only to:

1. Master Architecture
2. Approved Architecture Decision Records (ADRs)
3. Engineering Governance Standards
4. Security Architecture

This document shall remain consistent with:

- Engineering Standards
- Coding Standards
- Repository Structure
- Development Workflow
- Git and Branching Strategy
- CI/CD Standards
- Code Review Guidelines
- Definition of Ready
- Definition of Done
- Domain Ownership Matrix
- Domain Event Catalog
- Enterprise Data Dictionary
- Enterprise Glossary
- API Design Standards
- Database Design Standards
- Event Schema Standards
- Security Architecture
- Integration Architecture
- Observability Architecture
- Deployment Architecture
- Performance & Scalability Architecture
- Testing & Quality Architecture
- Business Continuity & Disaster Recovery Architecture
- Data Governance & Information Lifecycle Architecture
- Output Contract
- AI Operating Rules
- all approved Architecture Decision Records

No technical design may intentionally conflict with authoritative architecture.

---

# Technical Design Review Philosophy

Technical Design Reviews exist to improve engineering outcomes rather than create administrative overhead.

Reviews should occur early enough that meaningful improvements remain inexpensive.

The objective is not to eliminate every possible implementation risk.

The objective is to identify significant architectural, operational, security, financial, and maintainability concerns before implementation begins.

A successful review produces greater engineering confidence rather than merely obtaining approval.

---

# Core Design Principles

Technical designs shall follow these principles:

- architecture first
- business intent before implementation
- explicit ownership
- simplicity over unnecessary complexity
- bounded-context integrity
- server-side authority
- security by default
- operational excellence
- observability by design
- resilience through planning
- evidence-based decision making
- maintainability over convenience

Every design should be understandable by future engineers.

---

# Objectives of Technical Design Review

Technical Design Reviews shall determine whether a proposed solution:

- satisfies business objectives
- aligns with approved architecture
- preserves bounded-context ownership
- minimizes unnecessary complexity
- protects financial integrity
- protects customer data
- satisfies operational requirements
- supports scalability
- supports resilience
- supports maintainability
- supports future evolution

Approval indicates that the proposed design is acceptable for implementation—not that implementation is complete.

---

# Applicability

Technical Design Reviews apply to:

- new capabilities
- architectural changes
- infrastructure changes
- database changes
- APIs
- Domain Events
- integrations
- financial functionality
- authentication
- authorization
- identity
- fraud controls
- customer-facing workflows
- operational tooling
- administrative capabilities
- production-impacting changes
- AI-generated technical designs

Small implementation details that do not materially affect architecture may not require formal design review.

---

# Review Thresholds

Formal Technical Design Reviews shall normally be required when work includes:

- new bounded contexts
- changes to domain ownership
- new APIs
- API contract changes
- new Domain Events
- Domain Event contract changes
- database schema changes
- production infrastructure changes
- financial processing
- payment processing
- identity changes
- authentication
- authorization
- fraud controls
- large-scale refactoring
- scalability improvements
- operational architecture changes

Organizations may define additional review thresholds.

---

# Review Objectives

Every review shall evaluate:

- correctness
- architectural alignment
- simplicity
- maintainability
- extensibility
- operational readiness
- security
- financial integrity
- observability
- testing strategy
- deployment impact

The review shall evaluate both immediate implementation quality and long-term platform sustainability.

---

# Design Ownership

Every technical design shall identify:

- Product Owner
- Engineering Owner
- Architecture Owner
- Bounded Context Owner
- Security Owner where applicable
- Platform Owner where applicable
- Operations Owner where applicable
- Quality Owner where applicable

Ownership shall remain explicit throughout implementation.

---

# Business Context

Every design shall begin with a description of the business problem.

Business context should explain:

- business objective
- customer value
- operational value
- current limitations
- desired outcome
- success criteria

The design should explain why implementation is necessary before describing how implementation will occur.

---

# Problem Statement

Each design shall include a clearly defined problem statement.

The problem statement should identify:

- existing behavior
- desired behavior
- affected users
- affected systems
- affected business capability
- expected improvements

A well-defined problem frequently eliminates unnecessary implementation.

---

# Scope Definition

Technical designs shall define:

- included capabilities
- excluded capabilities
- affected systems
- affected bounded contexts
- dependencies
- assumptions
- implementation boundaries

Scope should remain understandable throughout review.

---

# Architectural Alignment

Every proposed solution shall demonstrate alignment with approved architecture.

Review shall verify:

- bounded-context ownership
- authoritative data ownership
- integration patterns
- API strategy
- Domain Event strategy
- infrastructure standards
- security standards

Architectural compliance shall be demonstrated rather than assumed.

---

# Bounded Context Ownership

The design shall identify every affected bounded context.

Review should verify:

- authoritative ownership
- write ownership
- read ownership
- event ownership
- integration ownership

No design shall introduce duplicate ownership.

---

# Business Rule Identification

Technical designs shall identify affected business rules before implementation.

Business-rule identification should include:

- validation rules
- eligibility rules
- workflow rules
- financial rules
- operational rules
- authorization rules
- exception handling

Business rules should not emerge during implementation.

---

# Assumptions

Every design shall document assumptions.

Assumptions may include:

- customer behavior
- operational behavior
- provider behavior
- infrastructure availability
- scalability expectations
- deployment timing
- regulatory interpretation

Hidden assumptions create implementation risk.

---

# Constraints

Technical constraints shall be documented.

Constraints may include:

- architectural limitations
- provider limitations
- infrastructure capacity
- regulatory obligations
- performance expectations
- deployment restrictions
- staffing limitations

Constraints influence design decisions.

---

# Alternatives Considered

Every significant design should evaluate reasonable alternatives.

Alternative analysis should describe:

- alternative approaches
- advantages
- disadvantages
- complexity
- operational impact
- scalability
- implementation cost
- reason for rejection

The selected design should have a documented rationale.

---

# Decision Rationale

The design shall explain why the selected approach was chosen.

Decision rationale should consider:

- architectural consistency
- maintainability
- operational simplicity
- financial integrity
- customer experience
- implementation effort
- long-term sustainability

Important engineering decisions should remain understandable years later.

---

# Risks

Every design shall identify known risks.

Risks may include:

- architectural risk
- financial risk
- security risk
- operational risk
- scalability risk
- integration risk
- deployment risk
- support risk

Each significant risk should identify a mitigation strategy.

---

# Dependencies

Technical designs shall identify dependencies.

Dependencies may include:

- internal services
- APIs
- Domain Events
- infrastructure
- cloud providers
- payment providers
- identity providers
- deployment sequencing

Dependencies should remain visible during implementation.

---

# Non-Functional Requirements

Technical designs shall identify applicable non-functional requirements.

These may include:

- availability
- scalability
- latency
- durability
- observability
- maintainability
- accessibility
- recoverability
- auditability

Non-functional requirements are implementation requirements.

---

# Success Criteria

Every design shall define measurable success.

Success criteria may include:

- business outcomes
- customer outcomes
- operational outcomes
- latency objectives
- scalability objectives
- reliability objectives
- maintainability objectives

Success shall be objectively measurable.

---

# Design Completeness

A technical design should contain sufficient detail for implementation without prescribing unnecessary code-level decisions.

A complete design should identify:

- problem
- objectives
- ownership
- architecture
- constraints
- assumptions
- dependencies
- risks
- success criteria

Implementation details should remain flexible where architectural outcomes are preserved.

---

# Initial Review Readiness

Before formal review begins, the design should be evaluated for basic completeness.

The initial review should verify:

- ownership
- scope
- business objectives
- architecture
- dependencies
- risks
- assumptions
- review participants

Incomplete designs should be returned for refinement before formal review.

---

# AI-Assisted Technical Design

AI assistants may assist by:

- organizing technical proposals
- identifying missing architectural considerations
- identifying missing dependencies
- comparing designs against approved architecture
- identifying potential scalability concerns
- identifying missing operational planning
- suggesting documentation improvements
- identifying terminology inconsistencies

AI assistance should improve design quality without replacing engineering judgment.

---

# AI Design Limitations

AI assistants may not reliably determine:

- organizational priorities
- undocumented business rules
- contractual obligations
- informal operational procedures
- future strategic direction
- regulatory interpretation
- internal engineering preferences

Human review remains mandatory.

---

# AI Implementation Rules

AI-generated technical design proposals, architecture recommendations, review comments, and implementation plans must:

- begin with the business problem before proposing technical solutions
- identify bounded-context ownership before recommending implementation
- preserve authoritative ownership and prevent duplicate business authority
- require explicit documentation of assumptions, constraints, dependencies, alternatives, risks, and success criteria
- evaluate reasonable alternative designs before recommending significant architectural decisions
- require alignment with approved architecture before implementation begins
- distinguish architectural decisions from implementation details
- recommend simplicity unless additional complexity produces measurable long-term benefit
- preserve the authoritative ledger as the financial source of truth
- preserve wallet balances as rebuildable projections
- preserve Pools & Sweepstakes ownership of Pools, Sweepstakes, Entry Requests, Entry Locks, Entries, Draws, Winners, and Prize Assignments
- preserve Identity & Profile ownership of Customer and Customer Profile
- require server-side authority for business rules, authorization, financial processing, and fraud controls
- require AI-generated technical designs to remain fully aligned with the Master Architecture, Engineering Standards, Coding Standards, Repository Structure, Development Workflow, Git and Branching Strategy, CI/CD Standards, Code Review Guidelines, Definition of Ready, Definition of Done, Domain Ownership Matrix, Domain Event Catalog, Enterprise Data Dictionary, API Design Standards, Database Design Standards, Event Schema Standards, Security Architecture, Integration Architecture, Observability Architecture, Deployment Architecture, Performance & Scalability Architecture, Testing & Quality Architecture, Business Continuity & Disaster Recovery Architecture, Data Governance & Information Lifecycle Architecture, Enterprise Glossary, Output Contract, AI Operating Rules, and all approved Architecture Decision Records (ADRs).

# Technical Design Requirements

---

# Technical Design Requirements Purpose

Technical Design Requirements establish the minimum engineering information that every technical design shall contain before implementation begins.

The objective is to ensure that engineers, reviewers, operators, security teams, and future maintainers possess a complete understanding of the proposed solution before code is written.

A complete technical design should explain:

- what will be built
- why it is being built
- how it integrates with the platform
- who owns it
- how it behaves
- how it fails
- how it recovers
- how it evolves

Implementation should never become the first draft of the design.

---

# Domain Model Design

Every design shall identify the domain model that supports the proposed capability.

Domain modeling should define:

- entities
- value objects
- aggregates
- aggregate roots
- domain services
- repositories
- business invariants
- ownership

The design shall demonstrate alignment with the Domain Ownership Matrix.

Business concepts shall not be duplicated across bounded contexts.

---

# Entity Ownership Design

Each entity shall have a single authoritative owner.

Design documentation shall identify:

- owning bounded context
- write authority
- read authority
- lifecycle owner
- event publisher
- integration ownership

No entity may have multiple write authorities.

---

# Aggregate Design

Aggregate boundaries shall be explicitly documented.

Designs should identify:

- aggregate root
- consistency boundary
- transactional boundary
- invariant enforcement
- aggregate lifecycle
- child entities
- concurrency considerations

Aggregate boundaries should minimize cross-context transactions.

---

# State Model Design

Every significant business object shall define its lifecycle.

State models should identify:

- initial state
- valid transitions
- prohibited transitions
- transition authority
- terminal states
- recovery transitions
- exceptional states

State transitions shall be governed by business rules rather than user interfaces.

---

# Workflow Design

Technical designs shall document workflow behavior.

Workflow documentation should include:

- triggering event
- participating services
- decision points
- business rules
- validation
- external interactions
- completion behavior
- failure behavior

Workflows should remain deterministic.

---

# Business Rule Design

Design documentation shall identify all affected business rules.

Business-rule documentation should include:

- eligibility
- validation
- authorization
- financial rules
- workflow rules
- exception rules
- cancellation rules
- recovery rules

Business rules should remain independent of technical implementation.

---

# API Design

Every API shall include a documented contract.

API design should identify:

- endpoint
- purpose
- ownership
- authentication
- authorization
- request schema
- response schema
- pagination
- filtering
- sorting
- rate limiting
- versioning

API contracts should be reviewed before implementation.

---

# API Error Design

Design documentation shall define API error behavior.

Error design should identify:

- validation failures
- authorization failures
- authentication failures
- business-rule failures
- dependency failures
- timeout behavior
- retry behavior
- unexpected failures

Errors shall be predictable and documented.

---

# Domain Event Design

Every Domain Event shall be designed before implementation.

Event documentation shall define:

- event name
- owning bounded context
- business meaning
- producer
- consumers
- publication trigger
- schema
- version
- ordering assumptions
- replay behavior

Domain Events represent completed business facts.

---

# Event Evolution Design

Designs shall describe how Domain Events evolve.

Evolution planning should include:

- version compatibility
- schema evolution
- consumer migration
- producer migration
- replay compatibility
- retirement strategy

Existing consumers should remain stable whenever possible.

---

# Database Design

Technical designs shall document database impact.

Database documentation should include:

- entities
- tables
- relationships
- indexes
- constraints
- projections
- migrations
- ownership

Database design shall preserve authoritative ownership.

---

# Data Lifecycle Design

Design documentation shall identify data lifecycle.

Lifecycle planning should define:

- creation
- updates
- archival
- retention
- deletion
- restoration
- audit retention

Data lifecycle shall comply with enterprise governance.

---

# Migration Design

Database migrations shall be designed before implementation.

Migration planning should identify:

- migration order
- compatibility
- expand-and-contract strategy
- backfill requirements
- deployment sequencing
- rollback limitations
- validation
- operational monitoring

Migration risk shall be understood before implementation.

---

# Integration Design

Every external or internal integration shall be documented.

Integration documentation should identify:

- participating systems
- ownership
- protocols
- authentication
- authorization
- retry strategy
- timeout strategy
- monitoring
- failure handling

Integration assumptions shall be explicit.

---

# External Provider Design

External-provider integration shall define:

- provider
- authentication
- credentials
- rate limits
- availability expectations
- timeout strategy
- retry behavior
- webhook behavior
- reconciliation

Provider dependencies shall never be assumed perfectly reliable.

---

# Security Design

Security architecture shall be incorporated into every technical design.

Security planning should include:

- authentication
- authorization
- encryption
- secret management
- attack surface
- least privilege
- audit logging
- dependency risk

Security shall influence architecture rather than become a later enhancement.

---

# Privacy Design

Privacy planning shall identify:

- personal information
- collection purpose
- storage
- retention
- deletion
- masking
- encryption
- access restrictions
- regulatory considerations

Privacy requirements shall be documented before implementation.

---

# Authentication Design

Authentication design shall define:

- identity provider
- login flow
- token lifecycle
- session behavior
- expiration
- revocation
- multi-factor authentication
- recovery integration

Authentication shall remain server authoritative.

---

# Authorization Design

Authorization documentation shall identify:

- protected resources
- authorization model
- ownership rules
- role requirements
- permission evaluation
- administrative access
- denial behavior
- auditing

Authorization decisions shall occur on the server.

---

# Validation Design

Validation planning shall identify:

- required fields
- business validation
- format validation
- eligibility validation
- uniqueness validation
- server-side enforcement

Validation shall never depend solely upon client behavior.

---

# Error Handling Design

Technical designs shall document failure behavior.

Documentation should identify:

- recoverable failures
- unrecoverable failures
- retry behavior
- customer messaging
- operational alerts
- logging
- support visibility

Failure behavior should be intentional.

---

# Performance Design

Performance planning shall identify:

- latency objectives
- throughput expectations
- bottlenecks
- caching
- database performance
- messaging performance
- scalability assumptions

Performance goals should be measurable.

---

# Scalability Design

Designs shall explain expected growth.

Scalability planning should identify:

- customer growth
- transaction growth
- storage growth
- messaging growth
- infrastructure scaling
- database scaling

Scalability should be designed rather than retrofitted.

---

# Availability Design

Technical documentation shall identify:

- availability objectives
- redundancy
- failover
- graceful degradation
- maintenance windows
- outage behavior

Availability expectations should influence architecture.

---

# Resilience Design

Resilience planning shall identify:

- retries
- circuit breakers
- timeouts
- fallback behavior
- degraded operation
- dependency failures
- recovery behavior

Failures should remain isolated whenever practical.

---

# Observability Design

Every design shall define observability requirements.

Observability planning shall identify:

- logs
- metrics
- traces
- dashboards
- alerts
- audit events

Operational visibility shall exist before deployment.

---

# Monitoring Design

Monitoring documentation shall identify:

- health indicators
- latency
- failures
- business metrics
- financial metrics where applicable
- infrastructure metrics

Monitoring shall support production operations.

---

# Testing Design

Technical designs shall define testing strategy.

Testing documentation should include:

- unit tests
- integration tests
- contract tests
- end-to-end tests
- regression tests
- performance tests
- security tests

Testing strategy shall align with implementation risk.

---

# Deployment Design

Deployment planning shall identify:

- deployment strategy
- rollout approach
- environment sequencing
- feature flags
- migrations
- rollback
- forward recovery

Deployment planning begins during design.

---

# Operational Design

Operational planning shall define:

- runbooks
- ownership
- support
- maintenance
- monitoring
- escalation
- operational metrics

Operations shall understand the solution before implementation.

---

# Documentation Design

Every technical design shall identify required documentation updates.

Documentation may include:

- architecture
- APIs
- Domain Events
- operations
- support
- release documentation

Documentation work shall be planned alongside implementation.

---

# AI-Assisted Technical Design Analysis

AI assistants may assist by:

- reviewing architecture
- identifying missing ownership
- identifying missing APIs
- identifying missing Domain Events
- identifying missing testing
- identifying operational gaps
- reviewing documentation completeness

AI analysis supplements human review.

---

# AI Implementation Rules

AI-generated technical design documentation must:

- fully describe the domain model, aggregates, workflows, APIs, Domain Events, database changes, integrations, security, privacy, observability, testing, deployment, and operational considerations before implementation begins
- preserve authoritative bounded-context ownership and prevent duplicate business authority
- require explicit ownership, lifecycle definitions, failure behavior, recovery behavior, scalability planning, and operational visibility
- require API and Domain Event contracts to be designed before implementation
- require migrations, integrations, and external-provider interactions to include compatibility, monitoring, and recovery planning
- require security, privacy, authentication, authorization, and validation to be designed before implementation
- preserve the authoritative ledger as the financial source of truth
- preserve wallet balances as rebuildable projections
- preserve Pools & Sweepstakes ownership of Pools, Sweepstakes, Entry Requests, Entry Locks, Entries, Draws, Winners, and Prize Assignments
- preserve Identity & Profile ownership of Customer and Customer Profile
- require server-side authority for business rules, authorization, financial processing, and fraud controls
- require AI-generated technical designs to remain fully aligned with the Master Architecture, Engineering Standards, Coding Standards, Repository Structure, Development Workflow, Git and Branching Strategy, CI/CD Standards, Code Review Guidelines, Definition of Ready, Definition of Done, Domain Ownership Matrix, Domain Event Catalog, Enterprise Data Dictionary, API Design Standards, Database Design Standards, Event Schema Standards, Security Architecture, Integration Architecture, Observability Architecture, Deployment Architecture, Performance & Scalability Architecture, Testing & Quality Architecture, Business Continuity & Disaster Recovery Architecture, Data Governance & Information Lifecycle Architecture, Enterprise Glossary, Output Contract, AI Operating Rules, and all approved Architecture Decision Records (ADRs).

# High-Risk Technical Design Review

---

# High-Risk Technical Design Review Purpose

High-Risk Technical Design Review establishes the additional design requirements that apply when proposed work may materially affect:

- customer funds
- authoritative financial records
- wallet projections
- payment processing
- refunds
- chargebacks
- payouts
- Pools & Sweepstakes
- Draws
- Winners
- Prize Assignments
- identity
- authentication
- authorization
- fraud controls
- sensitive customer data
- production infrastructure
- destructive database changes
- externally consumed APIs
- Domain Event contracts
- disaster recovery
- operational continuity

These requirements supplement the foundational and technical-design requirements defined in Parts 1 and 2.

High-risk design review shall occur before implementation begins.

The purpose is to ensure that failure modes, authority boundaries, recovery procedures, operational controls, and audit requirements are understood while the design can still be changed safely.

---

# High-Risk Design Classification

Every proposed design shall be assessed for risk before implementation.

A design should be classified as high risk when failure could cause:

- customer financial loss
- inaccurate financial reporting
- duplicate or missing transactions
- incorrect wallet balances
- unauthorized access
- invalid Sweepstakes participation
- incorrect Draw results
- incorrect Winner determination
- improper Prize Assignment
- identity compromise
- fraud loss
- privacy exposure
- material production outage
- irreversible data loss
- regulatory or legal exposure
- significant reputational harm

Risk classification shall be based on possible consequences rather than implementation size.

A small code or configuration change may still require high-risk review.

---

# High-Risk Design Review Scope

A high-risk review shall evaluate:

- business correctness
- authoritative ownership
- state transitions
- transaction boundaries
- consistency requirements
- idempotency
- concurrency
- failure handling
- recovery
- security
- privacy
- auditability
- observability
- operational ownership
- deployment
- rollback
- forward recovery
- production verification

Reviewers shall consider both direct and indirect consequences.

---

# High-Risk Review Ownership

High-risk designs shall identify accountable owners.

Applicable owners may include:

- Product Owner
- Engineering Owner
- Bounded Context Owner
- Architecture Owner
- Financial Integrity Owner
- Security Owner
- Privacy Owner
- Fraud & Risk Owner
- Database Owner
- Platform Owner
- Quality Owner
- Release Owner
- Operations Owner
- Support Owner

The author of a design shall not be the sole approver of high-risk work.

---

# Specialized Reviewer Requirements

High-risk work shall identify specialized reviewers before formal approval.

Applicable reviewers may include:

- architecture reviewer
- financial integrity reviewer
- security reviewer
- privacy reviewer
- fraud and risk reviewer
- database reviewer
- infrastructure reviewer
- API reviewer
- Domain Event reviewer
- quality reviewer
- operations reviewer
- release reviewer

Required reviewers shall be based on the affected risks and capabilities.

---

# Financial Design Review

Any design affecting monetary value shall receive financial design review.

The design shall identify:

- business transaction
- authoritative financial owner
- affected ledger accounts
- posting rules
- amount source
- currency
- financial state transitions
- source transaction identifiers
- idempotency requirements
- concurrency controls
- reconciliation
- correction behavior
- audit evidence
- operational visibility
- recovery behavior

A financial design shall not describe the solution only as an update to a balance.

---

# Authoritative Ledger Design

The ledger shall remain the authoritative financial source of truth.

A ledger-related design shall demonstrate that:

- financial outcomes are represented through ledger entries
- financial history is immutable
- corrections use compensating entries
- wallet values remain derived projections
- source transactions remain traceable
- duplicate postings are prevented
- reconciliation remains possible
- administrative tools cannot silently rewrite history

A design that introduces a separate financial source of truth shall not be approved.

---

# Ledger Entry Design

Every ledger-entry design shall define:

- entry purpose
- posting trigger
- owning bounded context
- source transaction
- account identifiers
- debit and credit treatment where applicable
- amount
- currency
- effective timestamp
- recorded timestamp
- idempotency key
- correlation identifier
- causation identifier
- metadata
- balancing behavior
- retry behavior
- correction behavior

Posting logic shall be deterministic.

---

# Ledger Immutability Design

The technical design shall explain how ledger immutability is enforced.

The design should include:

- append-only write behavior
- prohibited update operations
- prohibited deletion operations
- database permissions
- service permissions
- administrative restrictions
- correction workflows
- audit monitoring
- mutation detection
- retention

Immutability shall be enforced through technical controls rather than convention alone.

---

# Financial Transaction Boundary Design

Financial designs shall define transaction boundaries.

The design should identify:

- atomic operations
- consistency requirements
- database transactions
- external-provider boundaries
- event-publication boundaries
- partial-failure behavior
- retry boundaries
- compensation behavior
- reconciliation points

Distributed transactions shall not be assumed unless explicitly supported by the architecture.

---

# Financial Idempotency Design

Every retriable financial operation shall include an idempotency design.

The design shall define:

- idempotency key source
- key scope
- uniqueness period
- persistence
- result replay
- duplicate-request behavior
- concurrent-request behavior
- timeout behavior
- provider retry behavior
- Domain Event replay behavior
- expiration behavior

Idempotency shall remain effective across service restarts and deployment changes.

---

# Financial Concurrency Design

Financial design review shall evaluate concurrent execution.

The design should identify:

- shared resources
- race conditions
- overspending risk
- duplicate-capture risk
- duplicate-refund risk
- duplicate-payout risk
- stale-read risk
- transaction-isolation requirements
- locking
- optimistic concurrency
- unique constraints
- retry behavior
- contention monitoring

Happy-path sequential reasoning shall not satisfy concurrency review.

---

# Financial Correction Design

Financial correction procedures shall be designed before implementation.

The design shall define:

- correction authority
- compensating entry type
- original-entry linkage
- reason code
- approval requirements
- audit evidence
- customer-visible impact
- projection updates
- reconciliation behavior
- operational reporting

Original financial entries shall not be modified to correct an error.

---

# Financial Reconciliation Design

The design shall explain how financial records will be reconciled.

Reconciliation design should identify:

- systems being compared
- source-of-truth hierarchy
- transaction identifiers
- matching rules
- expected timing differences
- acceptable tolerances
- exception classifications
- investigation workflow
- repair workflow
- reporting
- alert thresholds
- evidence retention

Reconciliation shall be treated as a core financial control.

---

# Wallet Projection Design

Wallet designs shall preserve the wallet as a rebuildable projection.

The design shall define:

- authoritative ledger inputs
- projection calculation
- available balance
- pending balance
- restricted balance where applicable
- projection update trigger
- duplicate-event handling
- out-of-order handling
- replay behavior
- rebuild behavior
- reconciliation
- lag monitoring
- customer-visible consistency

No wallet field may become independent financial authority.

---

# Wallet Rebuild Design

Wallet-projection changes shall include a rebuild design.

The design should define:

- rebuild source
- selection criteria
- checkpointing
- batch size
- execution order
- live-event coordination
- idempotency
- restart behavior
- failure recovery
- monitoring
- final reconciliation
- customer impact
- operational ownership

The team shall be able to restore wallet projections from authoritative records.

---

# Payment Lifecycle Design

Payment designs shall define the complete lifecycle.

Applicable states may include:

- initiated
- authorization pending
- authorized
- capture pending
- captured
- declined
- failed
- cancelled
- expired
- partially refunded
- refunded
- disputed
- charged back

The design shall identify:

- valid transitions
- prohibited transitions
- transition authority
- provider status mapping
- internal financial effects
- customer-visible status
- timeout behavior
- retry behavior
- reconciliation
- audit events

---

# Payment Provider Design Review

A payment-provider design shall define:

- provider responsibilities
- internal responsibilities
- authentication
- credential storage
- request signing
- timeouts
- rate limits
- retry behavior
- idempotency support
- webhook authentication
- duplicate webhook handling
- out-of-order webhook handling
- provider outage behavior
- reconciliation
- support escalation
- provider substitution considerations

Provider data shall not automatically replace internal financial authority.

---

# Payment Authorization Design

Authorization design shall define:

- amount source
- currency source
- payment-method eligibility
- customer eligibility
- fraud evaluation
- duplicate prevention
- provider request
- provider response mapping
- timeout uncertainty
- authorization expiration
- cancellation
- audit evidence
- customer messaging

Unknown provider outcomes shall have an explicit resolution process.

---

# Payment Capture Design

Capture design shall define:

- capture trigger
- capture authority
- capture amount
- partial capture
- delayed capture
- duplicate prevention
- provider request
- provider response mapping
- ledger posting
- timeout handling
- retry behavior
- reconciliation
- customer-visible state

Provider capture and internal financial posting shall remain traceably connected.

---

# Refund Design Review

Refund design shall define:

- refund eligibility
- full and partial refund rules
- maximum refund amount
- authorized actors
- approval requirements
- original transaction linkage
- idempotency
- provider interaction
- compensating ledger entries
- state transitions
- failure handling
- reconciliation
- support visibility
- audit evidence

Refunds shall preserve original financial history.

---

# Chargeback Design Review

Chargeback design shall define:

- provider notification
- webhook verification
- chargeback states
- financial treatment
- customer-account impact
- fraud impact
- evidence requirements
- response deadlines
- duplicate handling
- reconciliation
- appeal behavior
- operational ownership
- reporting

Chargeback workflows shall coordinate with Fraud & Risk and financial operations.

---

# Payout Design Review

Payout design shall define:

- payout eligibility
- recipient verification
- payout destination
- amount
- currency
- holds
- approval
- segregation of duties
- provider interaction
- idempotency
- lifecycle states
- ledger treatment
- failure
- return
- cancellation
- reconciliation
- audit evidence
- support procedures

No individual shall have unrestricted authority to create and approve sensitive payouts where segregation of duties is required.

---

# Prize Accounting Design

Prize-related designs shall distinguish:

- prize definition
- Prize Assignment
- customer entitlement
- fulfillment
- payout
- ledger recognition
- reporting
- cancellation
- reassignment

The design shall define:

- prize value
- funding source
- financial treatment
- tax or reporting implications where applicable
- entitlement trigger
- fulfillment status
- reconciliation
- audit evidence

---

# Pools & Sweepstakes Design Review

Designs affecting Pools & Sweepstakes shall preserve authoritative ownership of:

- Pools
- Sweepstakes
- Entry Requests
- Entry Locks
- Entries
- Draws
- Winners
- Prize Assignments

The design shall define:

- object ownership
- state models
- eligibility
- entry limits
- concurrency
- financial dependencies
- closure
- cancellation
- Draw behavior
- Winner behavior
- Prize Assignment behavior
- recovery
- observability
- auditability

No other bounded context may create competing authority.

---

# Pool Design Review

Pool design shall define:

- Pool purpose
- identifier
- state model
- opening conditions
- closing conditions
- capacity
- participation rules
- associated Sweepstakes
- administrative controls
- customer-visible status
- concurrency behavior
- cancellation behavior
- audit events

Pool-capacity checks shall be authoritative and concurrency safe.

---

# Sweepstakes Design Review

Sweepstakes design shall define:

- purpose
- eligibility
- opening
- closing
- geographic restrictions where applicable
- account restrictions
- entry limits
- free-entry treatment where applicable
- paid-entry relationship where applicable
- Draw rules
- prize rules
- cancellation
- disqualification
- retention
- legal or compliance dependencies where applicable

Required rules shall be documented rather than inferred.

---

# Entry Request Design

Entry Request design shall define:

- requester
- Customer identifier
- Pool
- Sweepstakes
- requested quantity
- eligibility checks
- entry-limit checks
- account-status checks
- financial prerequisites
- idempotency
- Entry Lock behavior
- accepted result
- rejected result
- retry behavior
- timeout behavior
- audit events

An Entry Request shall remain distinct from an authoritative Entry.

---

# Entry Lock Design

Entry Lock design shall define:

- locked resource
- lock owner
- acquisition
- atomicity
- duration
- expiration
- renewal where applicable
- release
- abandoned-lock behavior
- failure recovery
- contention
- observability
- operational repair

The design shall prevent expired or abandoned locks from permanently blocking capacity.

---

# Entry Design

Entry design shall define:

- Entry identifier
- Customer identifier
- Pool
- Sweepstakes
- authoritative creation condition
- required Entry Lock
- required financial state
- creation timestamp
- status
- duplicate prevention
- invalidation
- cancellation where allowed
- Draw eligibility
- audit evidence

Entries shall represent completed participation rather than attempted participation.

---

# Entry Limit Design

Entry-limit design shall define:

- limit type
- threshold
- measurement period
- Customer scope
- account scope
- Pool scope
- Sweepstakes scope
- concurrent-request handling
- multiple-device handling
- duplicate-account considerations
- exceptions
- monitoring
- customer messaging

Entry limits shall be enforced server-side.

---

# Sweepstakes Closure Design

Closure design shall define:

- close trigger
- authoritative close time
- in-flight Entry Requests
- active Entry Locks
- final eligible Entries
- disqualifications
- reconciliation
- closure event
- Draw-readiness transition
- failure recovery
- audit evidence

Closure shall produce an unambiguous eligible-entry population.

---

# Draw Design Review

Draw design is high risk and shall receive specialized review.

The design shall define:

- eligible-entry source
- eligibility snapshot
- disqualification behavior
- Draw algorithm
- algorithm version
- randomness source
- execution environment
- execution authority
- duplicate-execution prevention
- input preservation
- output preservation
- failure behavior
- restart behavior
- audit evidence
- operational approval
- observability

A Draw shall not be designed as an ordinary ungoverned background job.

---

# Randomness Design Review

Randomness design shall define:

- randomness source
- entropy or seed management
- unpredictability
- bias analysis
- tamper resistance
- access control
- algorithm versioning
- repeatability requirements for audit where applicable
- evidence retention
- testing
- failure handling

A general-purpose convenience random function shall not be approved without evidence that it satisfies Draw requirements.

---

# Draw Input Preservation

The design shall preserve the complete Draw input.

Preserved information should include:

- Sweepstakes identifier
- Draw identifier
- eligible-entry identifiers
- exclusion records
- close timestamp
- algorithm version
- randomness metadata
- execution identity
- execution timestamp
- configuration
- correlation identifiers

Preserved inputs shall support independent audit and investigation.

---

# Draw Execution Integrity

Draw execution design shall define:

- single-execution control
- authorized executor
- execution lock
- transaction boundary
- failure states
- retry policy
- partial-output prevention
- output persistence
- event publication
- operational visibility
- evidence integrity

A failed Draw shall not silently create an incomplete Winner state.

---

# Winner Design Review

Winner design shall define:

- authoritative Draw result
- Winner identifier
- Customer identifier
- winning Entry
- eligibility revalidation where required
- duplicate prevention
- disqualification
- alternate-winner behavior
- notification timing
- claim behavior where applicable
- correction procedure
- Prize Assignment trigger
- audit evidence

Winner records shall not permit unrestricted manual replacement.

---

# Prize Assignment Design Review

Prize Assignment design shall define:

- assignment identifier
- Prize
- Winner
- assignment authority
- assignment trigger
- duplicate prevention
- assignment status
- fulfillment relationship
- payout relationship
- financial treatment
- cancellation
- reassignment
- customer notification
- audit evidence

Prize Assignment shall remain owned by Pools & Sweepstakes.

---

# Sweepstakes Cancellation Design

Cancellation design shall define:

- cancellation authority
- permitted reasons
- state transitions
- Entry treatment
- Entry Lock treatment
- Draw prevention
- Winner treatment
- Prize Assignment treatment
- financial treatment
- refund treatment
- customer communication
- reconciliation
- reporting
- audit evidence

Cancellation shall use governed workflows rather than direct data edits.

---

# Identity & Profile Design Review

Identity-related designs shall preserve Identity & Profile ownership of:

- Customer
- Customer Profile
- identity relationships
- profile information
- account status
- identity-verification state where applicable

The design shall define:

- account lifecycle
- profile lifecycle
- uniqueness
- verification
- duplicate detection
- authentication integration
- recovery
- privacy
- retention
- deletion
- cross-context references

Other bounded contexts shall reference Customer identity through approved contracts.

---

# Customer Account Design

Customer-account design shall define:

- registration
- uniqueness
- required attributes
- contact verification
- consent
- account status
- activation
- restriction
- suspension
- closure
- reactivation
- recovery
- audit events

State transitions shall have explicit authority.

---

# Duplicate-Account Design

Duplicate-account design shall define:

- detection signals
- confidence thresholds
- decision rules
- review states
- block behavior
- false-positive handling
- false-negative monitoring
- appeal
- account linking
- merge restrictions
- financial implications
- Sweepstakes implications
- privacy limitations
- audit evidence

Accounts and customer funds shall not be silently merged.

---

# Identity Verification Design

Identity-verification design shall define:

- purpose
- required population
- provider
- attributes
- data minimization
- consent
- verification states
- expiration
- retry behavior
- provider outage behavior
- manual review
- correction
- retention
- deletion
- audit evidence

Provider responses shall be authenticated and correlated to the correct Customer.

---

# Authentication Design Review

Authentication designs shall define:

- authentication factors
- identity provider
- credential storage responsibilities
- login flow
- token issuance
- token validation
- expiration
- refresh
- revocation
- multi-factor requirements
- brute-force protection
- rate limiting
- enumeration resistance
- audit events
- monitoring

Authentication failure shall default to denial.

---

# Session Security Design

Session design shall define:

- identifier
- storage
- transport protection
- expiration
- idle timeout
- renewal
- revocation
- logout
- concurrent sessions
- device visibility where applicable
- account-status changes
- privilege changes
- audit events

Server-side revocation shall remain possible.

---

# Account Recovery Design

Account-recovery design shall define:

- recovery channels
- identity proof
- token format
- expiration
- single use
- rate limits
- enumeration resistance
- session revocation
- suspicious-attempt handling
- support intervention
- audit evidence

Recovery shall not bypass core identity controls.

---

# Authorization Design Review

Authorization design shall define:

- protected resources
- protected actions
- principal
- role
- permission
- ownership
- account boundary
- tenant or Customer boundary where applicable
- administrative authority
- denial behavior
- revocation behavior
- audit events
- testing strategy

Authorization shall be enforced at the authoritative server-side action boundary.

---

# Administrative Authorization Design

Administrative access design shall define:

- roles
- permissions
- least privilege
- sensitive actions
- approval requirements
- segregation of duties
- impersonation controls where applicable
- temporary access
- emergency access
- logging
- monitoring
- periodic review

Administrative access shall never imply unrestricted database authority.

---

# Fraud and Risk Design Review

Fraud and risk designs shall define:

- abuse case
- protected workflow
- signals
- scoring where applicable
- decision rules
- enforcement
- customer impact
- false-positive treatment
- false-negative monitoring
- manual review
- appeal
- metrics
- ownership
- audit evidence

Fraud decisions shall not replace authoritative financial or identity ownership.

---

# Velocity-Control Design

Velocity-control design shall define:

- controlled action
- identity dimensions
- account dimensions
- device dimensions where appropriate
- network dimensions where appropriate
- window
- threshold
- distributed-storage method
- concurrency
- reset behavior
- exceptions
- response
- monitoring
- auditability

Controls shall remain effective across multiple application instances.

---

# Bot-Protection Design

Bot-protection design shall define:

- protected workflow
- detection signals
- server-side controls
- rate limiting
- challenge behavior
- accessibility
- false-positive handling
- privacy implications
- bypass resistance
- degraded behavior
- monitoring
- ownership

Client-side obscurity shall not be considered sufficient bot protection.

---

# Sensitive Data Design Review

Sensitive-data designs shall define:

- classification
- business purpose
- collection
- data owner
- access roles
- storage
- encryption
- masking
- logging restrictions
- retention
- deletion
- export
- backup treatment
- third-party sharing
- breach impact
- audit evidence

The design shall minimize collection and duplication.

---

# Database Migration Design Review

High-risk migrations shall define:

- affected schema
- owner
- migration type
- compatibility
- expected row count
- expected duration
- locking behavior
- index effects
- storage effects
- deployment order
- backfill
- validation
- rollback limitations
- forward recovery
- rehearsal
- monitoring
- operational owner

Migration risk shall be evaluated using production-scale assumptions.

---

# Data Backfill Design Review

Backfill design shall define:

- source
- target
- selection
- transformation
- idempotency
- batching
- rate limits
- checkpoints
- restart
- failure isolation
- progress metrics
- validation
- reconciliation
- cleanup
- ownership

Backfills shall be governed production workloads.

---

# Destructive Migration Design

Destructive migration design shall demonstrate:

- necessity
- affected consumers
- consumer migration completion
- retention compliance
- archival completion
- backup verification
- restoration feasibility
- legal approval where applicable
- execution approval
- rollback limitations
- validation
- evidence retention

Expand-and-contract should be used whenever practical.

---

# Breaking API Design Review

A breaking API design shall define:

- reason
- affected consumers
- new contract
- version
- coexistence
- consumer migration
- communication
- deprecation period
- contract tests
- deployment order
- fallback
- retirement criteria
- approval authority

Breaking changes shall be explicit and governed.

---

# Breaking Domain Event Design Review

A breaking Domain Event design shall define:

- affected event
- reason
- replacement event or version
- affected producers
- affected consumers
- coexistence
- replay implications
- migration order
- monitoring
- retirement criteria
- approval authority

Existing event fields shall not be removed or semantically changed without version governance.

---

# Infrastructure Design Review

High-risk infrastructure design shall define:

- resource ownership
- environment
- capacity
- availability
- redundancy
- network exposure
- identity and access
- secrets
- encryption
- monitoring
- backup
- recovery
- cost
- deployment
- rollback or forward recovery
- decommissioning

Infrastructure changes shall remain reproducible through approved configuration and infrastructure-as-code practices.

---

# Production Access Design Review

Production-access design shall define:

- role
- purpose
- scope
- least privilege
- approval
- duration
- multi-factor authentication
- logging
- review
- revocation
- emergency use
- service-account ownership
- rotation

Shared unrestricted production credentials shall not be approved.

---

# CI/CD Control Design Review

CI/CD changes affecting production shall define:

- pipeline purpose
- branch protections
- artifact provenance
- environment controls
- secret access
- approval gates
- deployment authority
- rollback support
- audit logging
- policy enforcement
- bypass behavior
- testing
- required reviewers

Designs shall not weaken segregation of duties or production traceability.

---

# Deployment Strategy Design Review

High-risk designs shall select a deployment strategy.

Possible strategies include:

- rolling
- blue-green
- canary
- phased
- feature-flagged
- coordinated cutover

The design shall explain why the strategy is appropriate based on:

- compatibility
- data changes
- traffic
- external dependencies
- financial effects
- operational capability
- rollback safety
- customer impact

---

# Feature Flag Design Review

Feature-flag design shall define:

- owner
- purpose
- default state
- environments
- targeting
- rollout stages
- access control
- success metrics
- failure metrics
- kill switch
- observability
- expiration
- removal plan

Feature flags shall not bypass authorization or financial controls.

---

# Progressive Delivery Design Review

Progressive delivery design shall define:

- rollout cohorts
- stage size
- entry criteria
- exit criteria
- observation duration
- health metrics
- business metrics
- financial metrics where applicable
- security indicators
- stop conditions
- rollback or disablement
- decision authority
- evidence retention

Promotion shall be based on measured evidence.

---

# Canary Design Review

Canary design shall define:

- target population
- traffic percentage
- baseline
- comparison metrics
- minimum traffic
- duration
- customer-impact indicators
- financial indicators
- security indicators
- data-integrity checks
- promotion criteria
- rollback criteria
- decision owner

A canary that cannot produce meaningful evidence shall not be used as the primary risk control.

---

# Rollback Design Review

Rollback design shall define:

- previous artifact
- trigger
- authority
- schema compatibility
- configuration compatibility
- API compatibility
- Domain Event compatibility
- external side effects
- financial effects
- data effects
- execution time
- validation
- communication

A design shall not claim rollback support when irreversible effects make rollback unsafe.

---

# Forward-Recovery Design Review

Forward-recovery design shall define:

- expected failure states
- corrective release path
- data repair
- financial correction
- compensating ledger entries
- projection rebuild
- migration continuation
- operational owner
- verification
- communication
- recovery-time objective

Forward recovery shall be the preferred strategy when rollback could create additional inconsistency.

---

# Disaster Recovery Design Review

Designs affecting critical services or data shall evaluate disaster recovery.

The design should define:

- recovery-time objective
- recovery-point objective
- backup strategy
- replication
- failover
- restoration
- dependency recovery
- credential recovery
- validation
- reconciliation
- operational ownership
- test schedule

Recovery assumptions shall be proven through testing.

---

# Production Verification Design

The design shall define how production correctness will be verified.

Verification may include:

- service health
- smoke tests
- customer journey
- authentication
- authorization
- API behavior
- Domain Event publication
- event consumption
- database migration
- financial posting
- reconciliation
- wallet projection
- Sweepstakes lifecycle
- Draw integrity
- Winner creation
- Prize Assignment
- security
- data integrity
- alert behavior

Verification shall be specific enough to execute during release.

---

# Post-Deployment Observation Design

High-risk designs shall define:

- observation period
- responsible owner
- dashboards
- alerts
- financial metrics
- security metrics
- customer-impact metrics
- error thresholds
- rollback window
- forward-recovery threshold
- success criteria
- handoff criteria

Observation shall continue until the release has demonstrated stability.

---

# Operational Runbook Design

High-risk capabilities shall identify required runbooks.

Runbooks may include:

- payment-provider outage
- reconciliation failure
- wallet-rebuild procedure
- duplicate ledger-posting investigation
- Sweepstakes closure failure
- Draw failure
- Winner correction
- Prize Assignment failure
- identity-provider outage
- security incident
- migration failure
- rollback
- forward recovery

Runbooks shall identify authority and escalation paths.

---

# Support Design Review

Customer-impacting designs shall include support requirements.

The design should define:

- customer-visible states
- common failure cases
- support visibility
- administrative tools
- troubleshooting
- escalation
- financial correction routing
- refund routing
- payout routing
- Sweepstakes guidance
- prize guidance
- known limitations

Support shall not depend on direct database modification.

---

# Auditability Design Review

High-risk designs shall define audit evidence.

Audit evidence may include:

- actor
- action
- affected object
- prior state
- resulting state
- timestamp
- reason
- approval
- correlation identifier
- source system
- financial references
- security context

Audit logs shall be protected from unauthorized alteration.

---

# High-Risk Design Approval Criteria

A high-risk technical design may be approved only when:

- business rules are complete
- ownership is explicit
- architecture is aligned
- financial authority is preserved
- state transitions are defined
- concurrency is addressed
- idempotency is addressed
- failure behavior is defined
- recovery is credible
- security and privacy are addressed
- testing is defined
- observability is defined
- deployment is defined
- rollback or forward recovery is defined
- production verification is defined
- specialized reviewers have completed review
- unresolved blockers are documented and resolved
- required evidence is retained

Schedule pressure shall not replace these approval criteria.

---

# AI-Assisted High-Risk Design Review

AI assistants may support review by:

- identifying ownership conflicts
- identifying financial touchpoints
- evaluating idempotency coverage
- identifying concurrency hazards
- identifying missing failure states
- identifying missing recovery paths
- comparing designs with approved ADRs
- reviewing migration risk
- identifying missing audit evidence
- generating review checklists
- identifying missing production verification

AI-generated findings shall be validated by qualified reviewers.

---

# AI Financial Design Restrictions

AI assistants shall not independently approve:

- ledger account treatment
- ledger authority changes
- wallet authority changes
- payment lifecycles
- refund rules
- chargeback treatment
- payout rules
- financial corrections
- reconciliation tolerances
- production financial controls

AI shall not invent missing financial policy.

---

# AI Pools & Sweepstakes Design Restrictions

AI assistants shall not independently approve:

- eligibility rules
- entry limits
- Entry Request behavior
- Entry Lock behavior
- Draw algorithms
- randomness sources
- Winner rules
- Prize Assignment rules
- cancellation rules
- disqualification rules

AI shall not invent legal, operational, or business rules for Sweepstakes.

---

# AI Security and Production Restrictions

AI assistants shall not independently:

- waive authentication requirements
- waive authorization controls
- approve sensitive-data exposure
- approve destructive migrations
- authorize production access
- weaken CI/CD controls
- approve rollback assumptions
- authorize disaster-recovery exceptions
- approve production deployment
- declare a high-risk design approved

Final authority remains with qualified human reviewers.

---

# AI Implementation Rules

AI-generated high-risk technical designs, reviews, recommendations, implementation plans, and checklists must:

- identify high-risk impact based on possible financial, security, privacy, operational, legal, customer, and data consequences
- require independent specialized review for high-risk capabilities
- preserve the authoritative ledger as the only financial source of truth
- preserve immutable financial history and require compensating entries for corrections
- require deterministic ledger posting, idempotency, concurrency control, reconciliation, auditability, and recovery
- preserve wallet values as rebuildable, replayable, deterministic, observable, and reconcilable projections
- require complete payment, authorization, capture, refund, chargeback, payout, and prize-accounting lifecycle designs
- preserve Pools & Sweepstakes ownership of Pools, Sweepstakes, Entry Requests, Entry Locks, Entries, Draws, Winners, and Prize Assignments
- distinguish Entry Requests, Entry Locks, and authoritative Entries
- require server-side eligibility, entry-limit, closure, Draw, Winner, and Prize Assignment authority
- require Draw algorithm versioning, approved randomness, immutable input preservation, duplicate-execution prevention, controlled failure behavior, and audit evidence
- preserve Identity & Profile ownership of Customer and Customer Profile
- require governed account lifecycle, duplicate-account controls, identity verification, authentication, session, recovery, and authorization
- require fraud and risk controls to be server-side, observable, explainable, measurable, and auditable
- require sensitive-data classification, encryption, masking, access control, retention, deletion, backup, export, and third-party-sharing design
- require migrations and backfills to include production-scale assumptions, compatibility, idempotency, resumability, monitoring, validation, and recovery
- require destructive changes to include explicit approval, retention validation, archival, backup, restoration, and consumer-migration evidence
- require breaking API and Domain Event changes to include versioning, coexistence, consumer migration, deployment sequencing, observability, and retirement
- require infrastructure, production-access, and CI/CD designs to preserve least privilege, traceability, environment separation, segregation of duties, auditability, and recovery
- require governed feature flags, progressive delivery, canary analysis, rollback, forward recovery, disaster recovery, production verification, and observation periods
- prohibit claims of safe rollback when financial, data, provider, event, or schema effects are irreversible
- require high-risk capabilities to include runbooks, support visibility, escalation, audit evidence, and operational ownership
- prohibit AI from approving financial authority changes, Draws, Winners, Prize Assignments, destructive migrations, security exceptions, production access, production deployment, or high-risk technical designs
- keep final design approval with qualified human reviewers and approved governance processes
- remain fully aligned with the Master Architecture, Engineering Standards, Coding Standards, Repository Structure, Development Workflow, Git and Branching Strategy, CI/CD Standards, Code Review Guidelines, Definition of Ready, Definition of Done, Domain Ownership Matrix, Domain Event Catalog, Enterprise Data Dictionary, API Design Standards, Database Design Standards, Event Schema Standards, Security Architecture, Integration Architecture, Observability Architecture, Deployment Architecture, Performance & Scalability Architecture, Testing & Quality Architecture, Business Continuity & Disaster Recovery Architecture, Data Governance & Information Lifecycle Architecture, Enterprise Glossary, Output Contract, AI Operating Rules, and all approved Architecture Decision Records.

# Technical Design Review Governance

---

# Governance Purpose

Technical Design Review governance establishes the authoritative controls for reviewing, approving, revising, superseding, and retaining technical designs within Project Zero-Loss.

Its purpose is to ensure that significant technical decisions are evaluated consistently before implementation begins and remain traceable throughout the lifecycle of the platform.

Technical Design Review governance shall ensure that:

- design decisions align with approved architecture
- bounded-context ownership remains explicit
- financial integrity is protected
- security and privacy requirements are addressed
- operational responsibilities are understood
- significant risks are reviewed before implementation
- approval evidence is retained
- unresolved issues remain visible
- AI-generated designs receive qualified human review

A Technical Design Review is not a ceremonial approval step.

It is an engineering control that protects the platform from preventable architectural, financial, security, operational, and maintainability defects.

---

# Governance Principles

Technical Design Review governance shall follow these principles:

- review before irreversible implementation
- evidence before approval
- independent review for material risk
- explicit ownership
- architecture remains authoritative
- business rules remain visible
- unresolved risk shall not be hidden
- exceptions shall be documented
- design decisions shall remain traceable
- approval shall be proportional to risk
- implementation shall remain aligned with the approved design
- AI assistance shall not replace accountable human judgment

The review process should remain rigorous without becoming unnecessarily bureaucratic.

---

# Technical Design Review Ownership

The Technical Design Review Standard shall be jointly governed by:

- Architecture Governance
- Engineering Leadership
- Bounded-Context Owners
- Security Engineering
- Platform Engineering
- Quality Engineering
- Product Management
- Operations
- Financial Integrity Owners where applicable
- Fraud & Risk Owners where applicable
- Privacy Owners where applicable

Each group shall participate according to the scope and risk of the proposed design.

---

# Design Author Responsibility

Every technical design shall have a named Design Author.

The Design Author is responsible for:

- documenting the business problem
- defining scope
- identifying ownership
- describing the proposed design
- identifying alternatives
- identifying assumptions
- identifying constraints
- documenting dependencies
- documenting risks
- identifying required reviewers
- responding to review feedback
- revising the design
- recording final decisions
- maintaining traceability to implementation

The Design Author shall not treat reviewer feedback as optional unless the issue is formally resolved or rejected with documented rationale.

---

# Design Sponsor Responsibility

Significant technical designs should have a named Design Sponsor.

The Design Sponsor may be:

- Engineering Lead
- Product Owner
- Bounded-Context Owner
- Architecture Owner
- Platform Owner
- Security Owner
- Financial Integrity Owner

The Design Sponsor is responsible for confirming that:

- the problem is worth solving
- the design has appropriate organizational support
- required reviewers participate
- unresolved issues receive escalation
- implementation does not begin prematurely
- approved decisions remain funded and supported

The Design Sponsor does not replace the Design Author.

---

# Reviewer Responsibility

Reviewers shall evaluate the design within their area of expertise.

Reviewers are responsible for:

- identifying defects
- identifying ownership conflicts
- identifying missing requirements
- identifying undocumented risks
- identifying unsafe assumptions
- evaluating alternatives
- verifying architectural alignment
- evaluating operational impact
- requesting evidence
- documenting concerns
- approving only when satisfied

Reviewers shall distinguish required corrections from optional improvements.

---

# Review Independence

Materially high-risk designs shall receive review from at least one qualified individual who is not the Design Author.

Independent review is required for work affecting:

- authoritative financial records
- payment processing
- refunds
- payouts
- chargebacks
- Pools & Sweepstakes
- Draws
- Winners
- Prize Assignments
- authentication
- authorization
- sensitive customer data
- destructive migrations
- production infrastructure
- disaster recovery
- security boundaries
- production-access controls

Independence reduces confirmation bias and single-person design risk.

---

# Required Reviewers

Reviewer requirements shall be determined by the design’s scope.

A design may require review by:

- Bounded-Context Owner
- Architecture Reviewer
- Product Reviewer
- Security Reviewer
- Privacy Reviewer
- Financial Integrity Reviewer
- Fraud & Risk Reviewer
- Database Reviewer
- API Reviewer
- Domain Event Reviewer
- Infrastructure Reviewer
- Quality Reviewer
- Operations Reviewer
- Release Reviewer
- Support Reviewer

The required reviewer set shall be identified before formal review begins.

---

# Bounded-Context Review Authority

The owning bounded-context representative shall review designs that affect:

- domain entities
- aggregates
- business rules
- state transitions
- repositories
- APIs
- Domain Events
- projections
- integrations
- authoritative data

A design shall not transfer or duplicate bounded-context authority without approved architectural governance.

---

# Architecture Review Authority

Architecture Governance shall review designs that include:

- new bounded contexts
- changes to bounded-context boundaries
- changes to authoritative ownership
- new architectural patterns
- major cross-context workflows
- new integration patterns
- platform-wide infrastructure
- significant scalability changes
- substantial resilience changes
- strategic technology decisions

Architecture approval shall confirm alignment with the Master Architecture and approved ADRs.

---

# Financial Review Authority

A qualified Financial Integrity Reviewer shall approve designs that affect:

- ledger entries
- account treatment
- wallet projections
- payment authorization
- payment capture
- refunds
- chargebacks
- payouts
- prize accounting
- reconciliation
- financial corrections
- customer financial status

Financial approval shall confirm that:

- ledger authority remains intact
- financial history remains immutable
- correction behavior is governed
- idempotency is defined
- concurrency is addressed
- reconciliation is credible
- wallet values remain projections

No other review may substitute for required financial review.

---

# Pools & Sweepstakes Review Authority

A qualified Pools & Sweepstakes owner shall review designs that affect:

- Pools
- Sweepstakes
- Entry Requests
- Entry Locks
- Entries
- Draws
- Winners
- Prize Assignments

Review shall verify:

- authoritative ownership
- eligibility
- entry limits
- concurrency
- closure
- cancellation
- Draw integrity
- Winner determination
- Prize Assignment
- financial dependencies
- operational recovery
- auditability

Draw and Winner designs shall require specialized scrutiny.

---

# Security Review Authority

Security Engineering shall review designs that materially affect:

- authentication
- authorization
- credentials
- secrets
- encryption
- network exposure
- sensitive administrative actions
- production access
- identity verification
- account recovery
- fraud controls
- security logging
- external-provider trust

Security review shall occur before implementation begins.

---

# Privacy Review Authority

Privacy review shall be required when a design introduces or materially changes:

- personal-data collection
- sensitive-data processing
- identity verification
- customer profiling
- data retention
- data deletion
- data export
- third-party data sharing
- customer consent
- automated decision making

Privacy requirements shall be resolved before approval.

---

# Database Review Authority

Database review shall be required for designs involving:

- new authoritative tables
- schema ownership
- high-volume changes
- destructive migrations
- data backfills
- partitioning
- critical indexes
- financial data
- identity data
- retention behavior
- recovery-sensitive data

Database review shall evaluate production-scale behavior rather than development-scale assumptions.

---

# API Review Authority

API review shall be required for:

- new APIs
- externally consumed APIs
- breaking API changes
- versioning changes
- authorization-sensitive APIs
- financial APIs
- administrative APIs
- cross-context APIs

Review shall verify contract stability, ownership, validation, authorization, observability, and lifecycle management.

---

# Domain Event Review Authority

Domain Event review shall be required for:

- new Domain Events
- event schema changes
- event meaning changes
- new consumers
- new producers
- replay-sensitive events
- financial events
- Draw and Winner events
- breaking event changes

Review shall ensure that events represent stable business facts and remain compatible with governed consumers.

---

# Infrastructure Review Authority

Platform or Infrastructure Engineering shall review designs affecting:

- production infrastructure
- network topology
- compute capacity
- data storage
- queues
- caches
- load balancing
- observability platforms
- secrets infrastructure
- backup systems
- recovery systems
- CI/CD infrastructure

Review shall verify reproducibility, security, availability, capacity, recovery, and cost implications.

---

# Quality Review Authority

Quality Engineering shall review testing strategy for high-risk or complex designs.

Quality review should verify:

- test coverage
- test levels
- contract tests
- end-to-end tests
- regression tests
- security tests
- performance tests
- failure-path tests
- test-data requirements
- production-verification strategy

Approval shall not depend solely on planned happy-path testing.

---

# Operations Review Authority

Operations shall review designs that introduce:

- production services
- new operational dependencies
- critical alerts
- new runbooks
- manual operational workflows
- reconciliation procedures
- support escalation
- high-risk deployment procedures
- disaster-recovery responsibilities

Operations shall understand and accept the responsibilities created by the design.

---

# Support Review Authority

Support review should occur for designs that materially affect customer-facing behavior.

Support review should evaluate:

- customer-visible states
- failure messages
- common support scenarios
- administrative visibility
- escalation paths
- financial-support handling
- Sweepstakes support
- prize-support handling
- known limitations
- customer communications

Support processes shall not rely on direct database modification.

---

# Review Workflow

The standard Technical Design Review workflow shall include:

1. design preparation
2. completeness check
3. reviewer assignment
4. asynchronous review
5. discussion where required
6. design revision
7. resolution of blocking issues
8. approval or rejection
9. final decision recording
10. implementation traceability
11. post-implementation verification where applicable

The workflow may be streamlined for low-risk work but shall not eliminate required controls.

---

# Design Preparation

Before requesting formal review, the Design Author shall confirm that the design includes:

- business context
- problem statement
- scope
- ownership
- affected bounded contexts
- architecture
- alternatives
- assumptions
- constraints
- dependencies
- risks
- success criteria
- testing
- deployment
- operational impact
- required reviewers

Incomplete designs should not enter formal review.

---

# Completeness Check

A completeness check shall occur before specialized review begins.

The completeness check should verify:

- required sections exist
- terminology is consistent
- authoritative documents are referenced
- diagrams are understandable
- assumptions are explicit
- unresolved questions are visible
- reviewer roles are identified

A completeness check does not constitute design approval.

---

# Review Distribution

The design shall be distributed through an approved, traceable review channel.

The review record should preserve:

- document version
- author
- reviewers
- review date
- comments
- revisions
- approvals
- unresolved concerns
- final status

Informal conversations may support review but shall not replace the retained review record.

---

# Asynchronous Review

Asynchronous review should be the default when practical.

It allows reviewers to:

- inspect authoritative documents
- evaluate diagrams
- examine contracts
- analyze risks
- provide written feedback
- create a durable review record

Meetings should be used when written review cannot efficiently resolve material concerns.

---

# Review Meetings

A review meeting may be required when:

- reviewers disagree materially
- the design spans multiple bounded contexts
- financial behavior is complex
- Draw integrity is affected
- security risks are substantial
- destructive migrations are proposed
- operational impact is significant
- alternatives require collective evaluation

The meeting shall produce written outcomes.

---

# Review Comment Classifications

Review comments should be classified as:

- blocker
- required correction
- risk requiring explicit acceptance
- clarification
- recommendation
- question
- editorial suggestion

Classification helps the Design Author understand what must be resolved before approval.

---

# Blocking Comments

A blocker identifies an issue that prevents design approval.

Examples include:

- conflict with Master Architecture
- duplicate domain ownership
- unresolved financial authority
- missing authorization
- unsafe migration
- missing recovery
- ungoverned Draw behavior
- unresolved security exposure
- missing required reviewer
- lack of operational ownership

Blocking comments shall be resolved before approval.

---

# Required Corrections

A required correction identifies a material deficiency that must be addressed.

Examples include:

- incomplete failure behavior
- missing idempotency
- missing event compatibility
- incomplete audit design
- insufficient observability
- unclear ownership
- incomplete testing strategy

Required corrections shall be reflected in the revised design.

---

# Risk Acceptance Comments

A reviewer may identify a known risk that does not necessarily prevent implementation.

Risk acceptance shall document:

- risk
- possible consequence
- mitigation
- accepting authority
- review date
- expiration or review trigger where applicable

The Design Author may not accept material organizational risk without appropriate authority.

---

# Clarifications and Questions

Clarifications and questions shall be resolved when they affect shared understanding.

Responses may be:

- incorporated into the design
- answered in the review record
- converted into a requirement
- converted into an accepted risk
- deferred with governance

Material knowledge should be incorporated into the design rather than remain only in comment threads.

---

# Design Revision

The Design Author shall revise the design in response to valid review feedback.

Revisions shall preserve:

- version history
- significant decision changes
- resolved issues
- newly introduced risks
- updated approval status

Material changes may require re-review by previously approving reviewers.

---

# Re-Review Requirements

Re-review shall be required when revisions materially change:

- architecture
- bounded-context ownership
- financial behavior
- state transitions
- APIs
- Domain Events
- database migration strategy
- security controls
- privacy treatment
- deployment strategy
- recovery strategy
- operational responsibilities

Minor editorial corrections do not require full re-review.

---

# Approval Statuses

A technical design shall use one of the following statuses:

- Draft
- Under Review
- Changes Required
- Approved
- Approved with Recorded Risk
- Rejected
- Superseded
- Withdrawn

Status shall remain visible within the design.

---

# Draft Status

Draft indicates that the design is still being prepared.

A Draft design:

- may be shared for early feedback
- has not completed formal review
- shall not be treated as approved
- shall not authorize implementation of governed high-risk work

Early prototypes may occur only within approved exploratory boundaries.

---

# Under Review Status

Under Review indicates that:

- the design is sufficiently complete
- required reviewers have been assigned
- review is active
- approval has not yet been granted

Implementation shall not be assumed authorized merely because review has begun.

---

# Changes Required Status

Changes Required indicates that one or more blockers or required corrections remain unresolved.

The design shall return to the Design Author for revision.

Implementation of the unresolved design shall not proceed.

---

# Approved Status

Approved indicates that:

- required reviewers completed review
- blockers were resolved
- required corrections were addressed
- required evidence exists
- approving authorities accepted the design
- implementation may proceed within the approved scope

Approval does not authorize undocumented deviations.

---

# Approved with Recorded Risk Status

Approved with Recorded Risk indicates that:

- no prohibited risk remains
- identified risks are documented
- authorized owners accepted those risks
- mitigation is defined
- review triggers are defined where applicable

This status shall not be used to bypass non-waivable requirements.

---

# Rejected Status

Rejected indicates that the proposed design is not acceptable.

The review record should identify:

- rejection reasons
- unresolved architectural conflicts
- unacceptable risks
- required alternative direction where known
- reconsideration conditions

Rejected designs shall not be implemented.

---

# Superseded Status

Superseded indicates that a newer approved design replaces the document.

The superseded design shall identify:

- replacement document
- replacement version
- effective date
- affected implementation
- migration implications

Superseded designs shall remain available for historical traceability.

---

# Withdrawn Status

Withdrawn indicates that the proposed work will not proceed under the current design.

The document should identify:

- withdrawal reason
- decision owner
- date
- related replacement work where applicable

Withdrawal shall preserve the review history.

---

# Approval Evidence

Approval evidence shall identify:

- design version
- approving reviewer
- reviewer role
- approval status
- approval date
- conditions
- accepted risks
- unresolved non-blocking items

Approval evidence shall be retained with the design.

---

# Approval Authority

Approval authority shall correspond to the design’s risk.

Approval may require:

- Bounded-Context Owner
- Architecture Owner
- Engineering Lead
- Product Owner
- Security Owner
- Financial Integrity Owner
- Privacy Owner
- Platform Owner
- Database Owner
- Operations Owner

No single approver shall replace all required specialized reviews.

---

# Conditional Approval

Conditional approval may be used only when:

- conditions are explicit
- conditions are measurable
- an owner is assigned
- a resolution date or trigger exists
- the condition does not concern a non-waivable requirement
- implementation cannot bypass the condition

Unresolved blockers shall not be relabeled as conditions.

---

# Non-Waivable Requirements

The following requirements shall not be waived through ordinary design approval:

- authoritative ledger ownership
- financial-history immutability
- compensating corrections
- server-side authorization
- server-side financial controls
- server-side fraud enforcement
- Pools & Sweepstakes ownership
- Identity & Profile ownership
- Draw integrity
- Winner traceability
- Prize Assignment traceability
- protection of sensitive credentials
- required production-access controls
- required auditability
- legally required privacy controls
- destructive-change authorization
- mandatory recovery planning for critical systems

Changes to these principles require formal architectural or governance authority.

---

# Design Exception Governance

A design exception may be requested when a standard cannot reasonably be satisfied.

The exception request shall document:

- requirement
- reason
- affected scope
- risk
- compensating control
- owner
- approving authority
- effective date
- expiration
- remediation plan

Exceptions shall remain narrow and temporary whenever possible.

---

# Exception Approval

Exception approval shall require authority appropriate to the affected risk.

Examples include:

- Architecture Governance for architectural exceptions
- Security Engineering for security exceptions
- Privacy Owner for privacy exceptions
- Financial Integrity Owner for financial-control exceptions
- Platform Engineering for infrastructure exceptions
- Engineering Leadership for engineering-process exceptions

The Design Author cannot self-approve an exception.

---

# Prohibited Exceptions

Exceptions shall not authorize:

- a second financial source of truth
- mutable financial history
- wallet balances as authoritative records
- unrestricted manual Winner alteration
- unrestricted manual Prize Assignment alteration
- client-only authorization
- client-only financial enforcement
- client-only fraud enforcement
- bypassing required production-access controls
- untraceable destructive data changes
- undocumented Draw execution
- removal of legally required protections

Prohibited exceptions require redesign.

---

# Unresolved Issue Governance

Every unresolved issue shall be classified as:

- blocker
- accepted risk
- deferred decision
- follow-up work
- out of scope

Each unresolved issue shall identify:

- description
- owner
- impact
- resolution target
- approval authority
- traceability reference

Issues shall not disappear when the design is approved.

---

# Deferred Decision Governance

A technical decision may be deferred only when:

- it does not block safe implementation
- affected boundaries are understood
- the future decision point is known
- an owner is assigned
- the risk is documented
- implementation does not create irreversible constraints

Critical ownership, financial, security, or data decisions shall not be deferred.

---

# Design-to-Implementation Traceability

Approved designs shall remain traceable to implementation.

Traceability should connect the design to:

- work items
- source-code changes
- API contracts
- Domain Event schemas
- database migrations
- infrastructure changes
- tests
- deployment manifests
- release notes
- operational runbooks
- documentation updates

Traceability supports review, audit, maintenance, and incident investigation.

---

# Implementation Conformance

Implementation shall conform to the approved design.

Material deviations shall be documented and reviewed before merge or release.

A deviation is material when it affects:

- architecture
- ownership
- financial behavior
- security
- privacy
- APIs
- Domain Events
- database design
- deployment
- recovery
- operational responsibilities

Implementation convenience shall not justify silent design drift.

---

# Design Change During Implementation

When implementation reveals missing or incorrect design assumptions:

- work should pause where necessary
- the issue shall be documented
- the design shall be revised
- affected reviewers shall be notified
- required re-review shall occur
- implementation shall resume only after resolution

Discovery during implementation is acceptable.

Silent deviation is not.

---

# Design Validation After Implementation

High-risk implementations should receive post-implementation validation against the approved design.

Validation should confirm:

- implemented architecture
- ownership
- state transitions
- financial behavior
- security controls
- event contracts
- database behavior
- observability
- recovery
- operational documentation

Validation findings shall be corrected or formally governed.

---

# Superseding a Design

A new design shall supersede an existing design when it materially replaces:

- architecture
- ownership
- business workflow
- financial behavior
- API contracts
- Domain Event strategy
- database strategy
- infrastructure
- deployment strategy
- recovery strategy

The new design shall reference the superseded document.

---

# Design Retirement

A design may be retired when:

- the capability has been decommissioned
- the design no longer governs active implementation
- replacement documentation exists
- required records have been retained

Retirement shall not destroy historical decision evidence.

---

# Design Record Retention

Technical Design Review records shall be retained according to:

- data-governance requirements
- audit requirements
- financial-control requirements
- security requirements
- operational needs
- legal obligations

Designs affecting financial records, Draws, Winners, Prize Assignments, identity, security, or production controls may require extended retention.

---

# Design Versioning

Technical designs shall use controlled versioning.

Version history should identify:

- version
- date
- author
- material changes
- approval status
- reviewers
- superseded versions

Approved versions shall not be overwritten without traceability.

---

# Design Repository Governance

Technical designs shall be stored in an approved repository location.

The repository should provide:

- version control
- access control
- review history
- durable links
- searchability
- ownership
- backup
- retention

Private local documents shall not serve as the only authoritative design record.

---

# Access Control

Technical-design access shall follow data classification and least privilege.

Restricted designs may include:

- security-sensitive architecture
- fraud signals
- production-access controls
- payment-provider credentials
- recovery procedures
- vulnerability details
- customer-sensitive data models

Access restrictions shall not prevent required qualified review.

---

# Confidential Information

Technical designs shall not include secrets such as:

- passwords
- access tokens
- private keys
- live provider credentials
- production connection strings
- unmasked sensitive customer data

Designs should reference approved secret-management mechanisms.

---

# Design Review Service Levels

Review service levels should be defined to support predictable delivery.

Service levels may consider:

- design risk
- reviewer availability
- urgency
- number of bounded contexts
- financial impact
- security impact
- production impact

Service levels shall not reduce review quality.

---

# Reviewer Availability

Teams shall maintain sufficient reviewer coverage for critical areas.

Coverage should include:

- architecture
- financial integrity
- security
- privacy
- databases
- infrastructure
- APIs
- Domain Events
- operations

Lack of reviewer availability shall be escalated rather than bypassed.

---

# Reviewer Delegation

Review authority may be delegated only to qualified individuals.

Delegation shall preserve:

- expertise
- independence
- accountability
- traceability
- least privilege

Temporary delegation should have a defined duration.

---

# Reviewer Conflicts of Interest

Reviewers shall disclose material conflicts that may impair independent judgment.

Where practical, another qualified reviewer should be assigned.

A Design Author shall not act as the only specialized reviewer for their own high-risk design.

---

# Stale Designs

A design should be considered stale when:

- implementation has not begun within the defined validity period
- architecture has materially changed
- dependencies have changed
- assumptions are no longer valid
- regulations have changed
- provider contracts have changed
- the risk profile has changed

Stale designs shall be revalidated before implementation.

---

# Abandoned Designs

Designs that are no longer expected to proceed shall be marked Withdrawn or otherwise clearly closed.

Abandoned designs shall not remain indistinguishable from active proposals.

---

# Emergency Design Review

Emergency work may use an accelerated design-review process only when:

- urgency is documented
- scope is minimal
- risk of delay exceeds risk of acceleration
- required authorities are identified
- available specialized review occurs
- recovery is defined
- decisions remain traceable
- retrospective review is required

Emergency review does not permit ungoverned financial, Draw, security, or destructive changes.

---

# Retrospective Review

Emergency or materially changed designs shall receive retrospective review.

The retrospective should evaluate:

- why normal review was unavailable
- whether the design was sufficient
- implementation deviations
- production outcomes
- control failures
- missing documentation
- required permanent remediation

Retrospective review shall not replace required immediate safety controls.

---

# Review Metrics

Technical Design Review governance should measure:

- number of designs reviewed
- review cycle time
- number of review iterations
- blockers identified before implementation
- architectural defects prevented
- implementation deviations
- stale designs
- exceptions
- accepted risks
- production incidents linked to design deficiencies
- post-implementation design corrections

Metrics shall support learning rather than encourage superficial approval.

---

# Review Quality Metrics

Review quality may be evaluated through:

- material defects identified
- risk coverage
- reviewer participation
- quality of written rationale
- completeness of approval evidence
- implementation conformance
- post-release outcomes
- recurrence of known design defects

Fast review is not necessarily effective review.

---

# Design Debt

Approved shortcuts or incomplete long-term design concerns shall be recorded as design debt.

Design debt shall identify:

- issue
- rationale
- risk
- owner
- target resolution
- trigger
- affected capability

Design debt shall not become invisible after approval.

---

# Continuous Improvement

The Technical Design Review Standard shall evolve based on:

- reviewer feedback
- engineering experience
- architectural changes
- production incidents
- security findings
- financial-reconciliation findings
- migration failures
- operational events
- support feedback
- audit findings
- AI-assisted development experience

Changes to the standard shall follow approved documentation governance.

---

# Governance Review Cycle

This standard should be reviewed periodically and after material events such as:

- significant financial incident
- Draw-integrity incident
- security breach
- privacy incident
- destructive-migration failure
- major production outage
- architectural restructuring
- repeated implementation deviation
- significant regulatory change
- major AI-governance change

Review shall determine whether controls remain effective.

---

# AI-Assisted Review Governance

AI assistants may support Technical Design Review by:

- comparing designs with authoritative documents
- identifying missing sections
- identifying ownership conflicts
- identifying failure modes
- identifying concurrency risks
- identifying idempotency gaps
- identifying security concerns
- identifying missing observability
- generating review checklists
- summarizing review comments

AI output remains advisory and shall be validated.

---

# AI Review Identity

AI-generated review comments shall be distinguishable from human review comments.

The review record should identify:

- AI tool or system
- date
- purpose
- scope
- human validator where applicable

AI output shall not be presented as independent human approval.

---

# AI Data Access Governance

AI systems used during design review shall receive only data appropriate for their approved access level.

Sensitive information shall not be exposed without authorization.

AI review workflows shall comply with:

- data classification
- privacy requirements
- security controls
- provider restrictions
- retention requirements
- AI governance
- contractual requirements

Secrets shall never be included in AI prompts.

---

# AI Approval Prohibition

AI assistants shall not independently approve technical designs.

AI shall not serve as the final authority for:

- architecture approval
- financial approval
- ledger design
- wallet authority
- payment workflows
- refund rules
- payout rules
- Draw algorithms
- Winner determination
- Prize Assignment
- identity architecture
- authorization
- security exceptions
- privacy exceptions
- destructive migrations
- production access
- disaster recovery
- production deployment

Qualified human approval remains mandatory.

---

# AI-Generated Design Governance

AI-generated designs shall satisfy the same requirements as human-authored designs.

AI authorship shall not reduce:

- documentation depth
- architectural alignment
- testing requirements
- review independence
- security analysis
- financial analysis
- operational planning
- evidence requirements
- approval requirements

The human owner remains accountable for all submitted design content.

---

# Automation Governance

Automated design checks may enforce:

- required sections
- metadata
- links to authoritative documents
- ownership fields
- approval fields
- design status
- required review roles
- unresolved blockers
- version history

Automation may prevent incomplete designs from entering formal review.

Automation shall not replace substantive review.

---

# Governance Incident Handling

A governance incident occurs when:

- implementation begins without required approval
- required reviewers are bypassed
- approval evidence is missing
- a rejected design is implemented
- a design materially conflicts with architecture
- implementation silently deviates from the approved design
- AI output is falsely represented as human approval
- a prohibited exception is granted
- high-risk review records are altered or lost

Governance incidents shall be documented and investigated.

---

# Corrective Action

Corrective action may include:

- pausing implementation
- reverting changes
- revising the design
- completing missing reviews
- restoring review evidence
- correcting access controls
- creating an ADR
- performing retrospective review
- updating standards
- training reviewers
- addressing automation gaps

Corrective action shall address both the immediate issue and its root cause.

---

# Technical Design Review Acceptance Criteria

This document is complete when:

- review ownership is explicit
- required reviewer roles are defined
- review authority is proportional to risk
- the review workflow is documented
- comment classifications are defined
- approval statuses are defined
- approval evidence is traceable
- non-waivable requirements are explicit
- exception governance is defined
- unresolved issues remain visible
- design-to-implementation traceability is required
- material deviations require review
- superseded and retired designs remain traceable
- high-risk review governance is established
- emergency review remains controlled
- review metrics support continuous improvement
- AI-generated designs receive equivalent governance
- AI cannot independently approve designs
- governance incidents require corrective action

---

# Related Documents

This document shall remain consistent with:

- Master Architecture
- Engineering Standards
- Coding Standards
- Repository Structure
- Development Workflow
- Git and Branching Strategy
- CI/CD Standards
- Code Review Guidelines
- Definition of Ready
- Definition of Done
- Domain Ownership Matrix
- Domain Event Catalog
- Enterprise Data Dictionary
- Enterprise Glossary
- API Design Standards
- Database Design Standards
- Event Schema Standards
- Security Architecture
- Integration Architecture
- Observability Architecture
- Deployment Architecture
- Performance & Scalability Architecture
- Testing & Quality Architecture
- Business Continuity & Disaster Recovery Architecture
- Data Governance & Information Lifecycle Architecture
- Output Contract
- AI Operating Rules
- All approved Architecture Decision Records

---

# Revision History

| Version | Date | Description |
|---|---|---|
| 1.0 | July 2026 | Initial Technical Design Review Standard. |

---

# Guiding Statement

The Technical Design Review Standard is the authoritative engineering control for evaluating significant technical decisions before implementation within Project Zero-Loss. Every design shall demonstrate business purpose, bounded-context integrity, architectural alignment, financial safety, security, privacy, testability, operational readiness, recovery, and long-term maintainability. Approval shall be supported by objective evidence, qualified review, explicit ownership, and durable traceability. Human contributors, AI assistants, and automated systems shall all operate under the same authoritative standards, while final design authority remains with accountable and qualified human owners.
