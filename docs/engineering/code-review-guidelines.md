# Project Zero-Loss

# Code Review Guidelines

**Document Path:** `docs/engineering/code-review-guidelines.md`  
**Document Type:** Enterprise Engineering Guideline  
**Version:** 1.0  
**Status:** Authoritative  
**Authority Level:** Engineering Governance  
**Owner:** Architecture Governance, Engineering Leadership, Security Engineering, and Bounded-Context Owners  
**Applies To:** All Application Code, Services, Packages, APIs, Domain Events, Database Changes, Infrastructure, Configuration, Documentation, Tests, Human Contributors, AI Assistants, and Automation-Generated Changes  
**Last Updated:** July 2026

---

# Document Purpose

The Code Review Guidelines define the authoritative standards for evaluating proposed changes before they are integrated into the protected Project Zero-Loss codebase.

The purpose of code review is to determine whether a proposed change:

- implements the intended requirement
- preserves architectural integrity
- follows engineering standards
- protects financial correctness
- respects bounded-context ownership
- maintains security and privacy
- handles failures safely
- includes sufficient testing
- remains understandable and maintainable
- can be operated and supported in production

Code review is not limited to identifying syntax errors or formatting problems.

Automated tooling can detect many mechanical defects, but reviewers must evaluate intent, behavior, risk, architecture, and long-term consequences.

Every material change must receive review appropriate to its scope and risk before it is merged.

---

# Architectural Authority

This document governs the review of all proposed repository changes across Project Zero-Loss.

It is subordinate only to:

1. Master Architecture
2. Approved Architecture Decision Records
3. Engineering Standards
4. Security Architecture
5. Testing & Quality Architecture

This document complements:

- Coding Standards
- Repository Structure
- Development Workflow
- Git and Branching Strategy
- CI/CD Standards
- API Design Standards
- Database Design Standards
- Event Schema Standards
- Domain Ownership Matrix
- Domain Event Catalog
- Enterprise Data Dictionary
- Deployment Architecture
- Observability Architecture
- Performance & Scalability Architecture
- Business Continuity & Disaster Recovery Architecture
- Data Governance & Information Lifecycle Architecture
- Output Contract
- AI Operating Rules

A code review may not approve a change that violates an authoritative architecture rule, business rule, security requirement, financial-integrity control, or approved Architecture Decision Record.

---

# Code Review Philosophy

Code review is a collaborative engineering control.

Its purpose is not to prove that the author made mistakes.

Its purpose is to create shared confidence that the proposed change is:

- correct
- safe
- understandable
- testable
- maintainable
- secure
- observable
- deployable
- aligned with the architecture

Reviewers should evaluate both what the change does and what consequences it may create.

A successful review improves the codebase, the change, and the shared understanding of the system.

---

# Core Review Principles

Project Zero-Loss code reviews should follow these principles:

- review intent before implementation detail
- prioritize correctness over style preference
- evaluate risk proportionately
- require evidence rather than assumptions
- preserve architectural boundaries
- protect authoritative data
- identify hidden side effects
- verify failure behavior
- maintain respectful collaboration
- document material decisions
- avoid approval without understanding
- never use automated checks as a substitute for informed review

Approval represents an engineering judgment.

It should not be given merely because a Pull Request is old, urgent, or difficult to understand.

---

# Review Objectives

A reviewer should determine whether the proposed change:

- solves the stated problem
- solves only the stated problem
- uses the correct bounded context
- follows approved architecture
- preserves existing contracts
- maintains data integrity
- includes appropriate tests
- protects security and privacy
- handles expected failure conditions
- supports production observability
- can be safely deployed
- can be safely recovered
- is appropriately documented

A review should evaluate the complete change rather than isolated lines of code.

---

# Review Scope

Code review applies to all material repository changes.

Examples include:

- application logic
- user-interface behavior
- APIs
- Domain Events
- message consumers
- background jobs
- database migrations
- schema definitions
- infrastructure definitions
- CI/CD pipelines
- security policies
- authentication and authorization
- configuration
- feature flags
- automated tests
- generated clients
- operational scripts
- architecture documentation
- business-rule documentation

A change is not exempt from review because it appears small.

Small changes may still create significant risk.

---

# Review Risk Model

Review depth should correspond to the potential impact of the change.

Risk should consider:

- customer impact
- financial impact
- security impact
- privacy impact
- data-integrity impact
- availability impact
- architectural impact
- contract impact
- deployment complexity
- rollback difficulty
- change breadth
- uncertainty

Higher-risk changes require deeper review and may require specialized reviewers.

---

# Low-Risk Changes

Low-risk changes may include:

- typographical corrections
- isolated documentation clarification
- non-behavioral formatting
- test-description corrections
- internal comments
- safe dependency metadata updates

Low-risk classification should not be used when a change affects runtime behavior.

Low-risk changes should still follow the Pull Request process unless an explicitly approved repository policy states otherwise.

---

# Medium-Risk Changes

Medium-risk changes may include:

- isolated feature behavior
- internal refactoring
- non-breaking API additions
- new tests
- operational dashboard changes
- configuration additions
- backward-compatible event fields
- routine dependency upgrades

Medium-risk changes should receive review from a contributor familiar with the affected area.

---

# High-Risk Changes

High-risk changes may include:

- authoritative ledger behavior
- wallet balance projections
- payments
- payouts
- refunds
- financial reconciliation
- prize assignment
- sweepstakes eligibility
- draw execution
- authentication
- authorization
- customer identity
- sensitive data processing
- encryption
- database migrations
- destructive infrastructure changes
- breaking APIs
- breaking Domain Events
- production deployment controls
- secret management
- fraud and risk controls

High-risk changes require specialized review and enhanced evidence.

---

# Critical-Risk Changes

Critical-risk changes may include:

- changes capable of corrupting the authoritative ledger
- changes capable of exposing customer financial or identity data
- changes capable of producing duplicate payments or payouts
- changes affecting winner determination
- changes capable of bypassing authorization
- destructive production data operations
- changes to release-signing authority
- changes to production secret access
- changes to financial correction mechanisms

Critical-risk changes should require multiple qualified reviewers and explicit governance approval.

---

# Author Responsibilities

The author is responsible for preparing the change for meaningful review.

Before requesting review, the author should:

- understand the requirement
- confirm architectural placement
- limit the change scope
- self-review the complete diff
- remove unrelated modifications
- run required validation
- add or update tests
- document business-rule changes
- identify risks
- describe deployment impact
- describe migration impact
- describe rollback or recovery requirements
- identify known limitations

Submitting incomplete work without explanation transfers unnecessary investigation effort to reviewers.

---

# Author Self-Review

Every author should review the Pull Request as though reviewing another contributor’s work.

The self-review should check for:

- accidental files
- debug code
- temporary logging
- exposed secrets
- dead code
- unclear names
- missing tests
- unexplained complexity
- architectural violations
- incomplete error handling
- unsafe defaults
- misleading comments
- generated-file drift

The author should correct obvious issues before requesting reviewer time.

---

# Pull Request Preparation

A Pull Request should provide enough information for a reviewer to understand the change without reconstructing its purpose from the source code alone.

The Pull Request should include:

- requirement or work-item reference
- purpose
- implementation summary
- affected bounded contexts
- important business rules
- design decisions
- testing evidence
- security considerations
- data considerations
- migration considerations
- event or API compatibility
- deployment considerations
- rollback or recovery considerations
- screenshots or demonstrations where useful

A reviewer should not be required to guess why the change exists.

---

# Pull Request Scope

A Pull Request should represent one coherent unit of work.

It should avoid combining:

- unrelated features
- broad cleanup
- unrelated dependency updates
- multiple independent defects
- architecture redesign unrelated to the requirement
- formatting across unaffected files
- unrelated database migrations

A focused Pull Request improves:

- review quality
- defect detection
- test interpretation
- rollback safety
- release traceability
- review speed

Large changes should be divided when they can be safely reviewed and delivered in smaller units.

---

# Pull Request Size

There is no universal line-count limit that guarantees review quality.

However, review quality generally decreases when a Pull Request becomes too large to understand as one logical change.

Large Pull Requests should explain:

- why the size is necessary
- how the reviewer should navigate the change
- which files contain the core behavior
- which files are generated
- which files are mechanical
- which areas contain the highest risk

Size should not be reduced by hiding related code in unreviewed follow-up changes.

---

# Draft Pull Requests

Draft Pull Requests may be used for:

- early architectural feedback
- implementation-direction feedback
- cross-team coordination
- identifying missing requirements
- validating a proposed migration
- reviewing a complex interface

Draft Pull Requests should clearly state what feedback is being requested.

A draft should not be treated as ready for final approval.

---

# Reviewer Responsibilities

A reviewer is responsible for evaluating the change with appropriate care.

A reviewer should:

- understand the purpose
- examine the full change
- assess risk
- verify architectural alignment
- evaluate business correctness
- inspect tests
- evaluate failure behavior
- consider security and privacy
- identify operational impact
- distinguish required changes from suggestions
- document material concerns
- avoid approving code they do not understand

Reviewers share responsibility for the quality of approved changes.

---

# Reviewer Independence

A reviewer should provide an independent assessment rather than merely confirm the author’s conclusions.

Reviewer independence includes:

- checking assumptions
- questioning unclear behavior
- verifying evidence
- identifying missing scenarios
- considering alternative failure modes
- consulting authoritative documentation
- escalating unresolved architectural concerns

Independence does not require hostility or opposition.

It requires informed judgment.

---

# Reviewer Qualification

A reviewer should possess sufficient knowledge of the affected area.

Qualification may include knowledge of:

- the bounded context
- the programming language
- the framework
- the business rules
- the security model
- the database
- the deployment environment
- the authoritative architecture

A general reviewer may approve routine implementation quality while a specialized reviewer evaluates high-risk concerns.

---

# Review Assignment

Reviewers should be selected according to:

- code ownership
- bounded-context ownership
- change risk
- technical expertise
- security sensitivity
- financial sensitivity
- infrastructure impact
- data impact

Review assignment should not be based only on availability.

The fastest available reviewer may not be the appropriate reviewer.

---

# Required Review Roles

Depending on the change, required reviewers may include:

- bounded-context owner
- architecture reviewer
- security reviewer
- database reviewer
- infrastructure reviewer
- financial-integrity reviewer
- API owner
- Domain Event owner
- release-engineering reviewer
- documentation owner

One reviewer may satisfy multiple roles when appropriately qualified and when segregation-of-duties requirements allow it.

---

# Code Ownership

Code ownership establishes responsibility for reviewing specific repository areas.

Ownership may be defined through:

- CODEOWNERS
- repository governance
- bounded-context ownership
- service ownership
- architecture ownership
- security ownership

Code ownership does not grant permission to approve architectural violations.

Owners remain subject to all authoritative standards.

---

# Review Priority

Reviewers should evaluate concerns in the following general order:

1. Correctness
2. Financial integrity
3. Security and privacy
4. Data integrity
5. Architectural alignment
6. Reliability and failure handling
7. Contract compatibility
8. Test adequacy
9. Operational readiness
10. Maintainability
11. Performance
12. Style and readability

A style preference should not distract from a material correctness issue.

---

# Requirement Review

The reviewer should confirm that the change implements the approved requirement.

Questions may include:

- Is the problem clearly defined?
- Does the implementation match the requirement?
- Are acceptance criteria satisfied?
- Is behavior missing?
- Has unrelated behavior been added?
- Does the change conflict with another product rule?
- Is the requirement itself ambiguous?

A technically elegant implementation of the wrong requirement should not be approved.

---

# Business-Rule Review

Business-rule review should verify that the implementation matches authoritative product and domain documentation.

The reviewer should identify:

- rule source
- rule owner
- inputs
- outputs
- eligibility conditions
- state transitions
- failure conditions
- exception behavior
- audit requirements

Business rules should not be invented inside implementation code without authoritative documentation.

---

# Architectural Review

The reviewer should confirm that the change:

- belongs in the correct bounded context
- respects domain ownership
- follows approved layering
- uses approved integration mechanisms
- avoids unauthorized cross-context data access
- preserves source-of-truth rules
- complies with approved ADRs
- does not create hidden coupling
- does not duplicate authoritative logic

A locally functional change may still be architecturally invalid.

---

# Bounded-Context Review

Every material business capability should remain owned by one bounded context.

The reviewer should verify:

- the correct domain owns the operation
- another context is not writing owned data directly
- integration occurs through approved contracts
- duplicated domain logic is not introduced
- domain terminology remains consistent
- ownership boundaries remain visible

Shared database access should not be used to bypass bounded-context ownership.

---

# Dependency Review

The reviewer should evaluate new or changed dependencies.

Questions should include:

- Is the dependency necessary?
- Is equivalent functionality already available?
- Is the dependency actively maintained?
- Is its license acceptable?
- Is its security posture acceptable?
- Is the version pinned appropriately?
- Does it increase runtime or build risk?
- Does it introduce transitive dependencies?
- Can it be removed or replaced safely?

A small convenience should not justify a large unmanaged dependency burden.

---

# Data Ownership Review

The reviewer should verify that data is created, updated, and deleted only by its owning bounded context.

The review should identify:

- authoritative source
- projection or replica status
- write authority
- synchronization mechanism
- consistency model
- retention requirements
- audit requirements

A projection should never silently become an alternative source of truth.

---

# Ledger Authority Review

The authoritative ledger must remain the financial source of truth.

The reviewer should reject changes that:

- calculate authoritative balance from mutable wallet fields
- directly edit financial balances
- delete posted ledger history
- overwrite financial events
- bypass required ledger entries
- produce untraceable adjustments
- use UI values as financial authority

Financial corrections should use approved compensating entries or correction workflows.

---

# Wallet Projection Review

Wallet balances should remain rebuildable projections derived from authoritative financial records.

The reviewer should verify:

- projection inputs are authoritative
- projection processing is idempotent
- duplicate events do not duplicate balances
- replay produces consistent output
- reconciliation is supported
- projection failure does not corrupt the ledger
- wallet display is not treated as the financial source of truth

A wallet projection may be repaired or rebuilt.

The ledger may not be reconstructed from wallet display values.

---

# Pools and Sweepstakes Review

Changes affecting Pools & Sweepstakes should preserve ownership of:

- Pools
- Sweepstakes
- Entry Requests
- Entry Locks
- Entries
- Draws
- Winners
- Prize Assignments

The reviewer should verify:

- eligibility rules
- entry creation
- lock behavior
- draw integrity
- winner determination
- prize assignment
- auditability
- ledger integration
- idempotency
- reproducibility

Winner or prize logic should never depend on unreviewed client-side behavior.

---

# API Review Foundations

API review should confirm:

- correct ownership
- consistent resource naming
- authentication
- authorization
- input validation
- error behavior
- idempotency where required
- pagination where required
- versioning
- documentation
- backward compatibility

An API should not expose internal implementation details without a defined contract purpose.

---

# Domain Event Review Foundations

Domain Event review should confirm:

- the event represents a completed domain fact
- the producing context owns the fact
- the event name is past tense
- the schema is versioned appropriately
- identifiers are stable
- timestamps are clear
- consumers can handle duplicates
- compatibility is preserved
- sensitive data is minimized
- replay behavior is understood

An event should not be used as an ungoverned command.

---

# Database Review Foundations

Database review should consider:

- schema ownership
- keys
- constraints
- indexes
- transaction boundaries
- migration safety
- compatibility
- concurrency
- data volume
- retention
- auditability
- rollback or forward recovery

A database change should not be approved only because the migration executes successfully on an empty database.

---

# Security Review Foundations

Security review should evaluate:

- authentication
- authorization
- input validation
- output encoding
- data exposure
- secret handling
- encryption
- session behavior
- privilege boundaries
- abuse resistance
- logging
- dependency risk

Security should be reviewed as system behavior, not only as isolated security-library usage.

---

# Privacy Review Foundations

Privacy review should identify:

- personal data collected
- purpose of collection
- access controls
- storage location
- retention
- deletion behavior
- logging exposure
- event exposure
- third-party sharing
- customer controls

The reviewer should apply data minimization.

A change should not collect personal data merely because it may be useful later.

---

# Failure-Mode Review

The reviewer should examine what happens when dependencies or operations fail.

Failure scenarios may include:

- database unavailable
- message broker unavailable
- duplicate message
- delayed event
- partial timeout
- third-party failure
- authentication provider failure
- concurrent request
- deployment interruption
- stale configuration
- retry after partial success

A happy-path implementation alone is not sufficient for production approval.

---

# Error-Handling Review

Error handling should be:

- intentional
- consistent
- observable
- safe
- non-destructive
- appropriate to the caller

The reviewer should reject behavior that:

- suppresses material errors
- exposes sensitive details
- converts failures into false success
- retries unsafe operations
- loses correlation information
- produces ambiguous state

Errors should preserve enough context for investigation without exposing protected information.

---

# Idempotency Review

Idempotency should be reviewed for operations that may be repeated.

Examples include:

- payment callbacks
- ledger posting
- payout requests
- prize assignment
- entry creation
- message consumption
- database migrations
- webhook processing
- deployment steps

The reviewer should verify that repetition cannot create duplicate authoritative effects.

---

# Concurrency Review

Concurrent behavior should be considered where multiple operations may act on the same resource or rule.

The reviewer should assess:

- race conditions
- lost updates
- duplicate creation
- ordering
- locking
- optimistic concurrency
- transaction isolation
- retry behavior
- stale reads

Code that works sequentially may fail under real production concurrency.

---

# Transaction Review

Transactions should protect the correct consistency boundary.

The reviewer should verify:

- all required writes are included
- unrelated work is excluded
- failure results in a safe state
- external side effects are coordinated
- long-running transactions are avoided
- retries are safe
- event publication is reliable

Database transactions should not be assumed to cover external systems.

---

# Observability Review

The reviewer should confirm that the change can be operated and investigated.

The change may require:

- structured logs
- metrics
- traces
- audit events
- correlation identifiers
- dashboards
- alerts
- deployment markers
- business indicators

Logging should not expose secrets or protected customer data.

---

# Performance Review Foundations

The reviewer should consider:

- algorithmic complexity
- database query count
- index usage
- memory use
- network calls
- payload size
- cache behavior
- concurrency
- batch size
- user-perceived latency

Premature optimization should be avoided, but obvious scalability risks should not be approved without justification.

---

# Maintainability Review

Maintainability includes:

- clear naming
- understandable structure
- limited complexity
- cohesive responsibilities
- appropriate abstraction
- minimal duplication
- clear contracts
- useful documentation
- testability

A reviewer should prefer understandable code over clever code.

---

# Readability Review

Code should communicate intent.

The reviewer should evaluate:

- names
- function size
- control flow
- nesting
- comments
- abstraction level
- domain terminology
- consistency

Comments should explain intent, constraints, or non-obvious decisions.

Comments should not compensate for unnecessarily confusing code.

---

# Test Review Foundations

Reviewers should inspect tests rather than only confirming that the pipeline passed.

The reviewer should determine whether tests:

- verify the requirement
- cover material business rules
- cover failure behavior
- cover boundary conditions
- avoid false confidence
- remain deterministic
- use meaningful assertions
- protect against regression

A test suite can pass while failing to test the important behavior.

---

# Documentation Review Foundations

Documentation should be updated when the change affects:

- architecture
- APIs
- Domain Events
- database schemas
- configuration
- operational procedures
- deployment
- security
- business rules
- customer-facing behavior

The reviewer should reject undocumented changes to authoritative behavior.

---

# Review Evidence

Review conclusions should be supported by evidence.

Evidence may include:

- source code
- automated test output
- screenshots
- API examples
- migration rehearsal results
- performance results
- security-scan results
- architecture references
- logs
- traces
- reconciliation output

Statements such as “this should work” are not sufficient for high-risk changes.

---

# Review Communication

Review communication should be:

- respectful
- specific
- actionable
- technically grounded
- proportionate
- focused on the change

Review comments should explain why a concern matters.

Comments should avoid personal criticism.

The review evaluates the implementation, not the contributor.

---

# Review Comment Intent

A reviewer should make the intent of comments clear.

Possible intents include:

- blocking defect
- security concern
- architectural violation
- required clarification
- required test
- maintainability concern
- suggestion
- question
- informational note

Clear intent reduces unnecessary debate and prevents suggestions from being mistaken for mandatory changes.

---

# Approval Standard

Approval means that the reviewer believes the change is suitable to merge within the reviewer’s area of responsibility.

Approval should not be given when:

- material behavior is not understood
- blocking concerns remain
- required tests are missing
- architecture violations remain
- security risk is unresolved
- financial integrity is uncertain
- required documentation is absent
- the Pull Request changed materially after review

Approval is an engineering decision with accountability.

---

# Review Expiration

A previous approval may no longer be valid when:

- material code changes occur
- new migrations are added
- event or API contracts change
- security behavior changes
- conflict resolution modifies reviewed code
- the branch is substantially rebased
- new risk is identified

Repository protections should dismiss stale approvals where appropriate.

---

# Automated Review Tools

Automated review tools may assist with:

- formatting
- linting
- type checking
- static analysis
- dependency scanning
- secret scanning
- architecture checks
- security checks
- test execution
- migration validation
- generated-code verification

Automated tools provide evidence.

They do not provide final architectural or business approval.

---

# AI-Assisted Code Review

AI assistants may support code review by:

- summarizing Pull Requests
- identifying changed components
- finding likely defects
- comparing changes with standards
- suggesting missing tests
- identifying security concerns
- explaining complex code
- detecting duplicated logic
- checking documentation consistency
- highlighting possible contract changes

AI review output should be treated as advisory unless an approved automated policy explicitly makes a finding blocking.

---

# AI Review Limitations

AI assistants may:

- misunderstand domain intent
- miss hidden business rules
- invent unsupported requirements
- overlook distributed-system effects
- produce false security findings
- fail to identify financial risk
- misunderstand repository context
- approve superficially plausible code

Human reviewers remain responsible for informed approval.

---

# Human Accountability for AI-Generated Changes

Code created or modified by AI must have an accountable human or approved automation owner.

The accountable owner must:

- understand the change
- verify its purpose
- validate architectural placement
- confirm tests
- disclose material uncertainty
- ensure no secrets were introduced
- request appropriate reviewers
- accept responsibility for submission

“Generated by AI” is not an acceptable substitute for understanding.

---

# AI Implementation Rules

AI-generated code-review guidance, summaries, findings, and recommendations must:

- evaluate the complete proposed change rather than isolated snippets
- prioritize correctness, financial integrity, security, privacy, data integrity, and architectural alignment over stylistic preferences
- verify that each capability remains within its owning bounded context
- preserve the authoritative ledger as the financial source of truth
- treat wallet balances as rebuildable projections rather than authoritative financial records
- preserve Pools & Sweepstakes ownership of Pools, Sweepstakes, Entry Requests, Entry Locks, Entries, Draws, Winners, and Prize Assignments
- identify API, Domain Event, database, infrastructure, configuration, and deployment impact
- evaluate idempotency, concurrency, retries, transaction boundaries, partial failure, rollback, and forward recovery
- require evidence for high-risk financial, security, database, event, identity, payment, payout, prize, and infrastructure changes
- inspect test quality rather than relying only on test-pass status
- distinguish blocking findings, required clarification, questions, and optional suggestions
- never approve changes solely because automated checks pass
- never bypass CODEOWNERS, required reviewers, segregation of duties, protected branches, quality gates, or release controls
- disclose uncertainty rather than inventing business rules or architectural authority
- keep final approval accountability with qualified human reviewers or explicitly authorized governance automation
- remain fully aligned with the Master Architecture, Engineering Standards, Coding Standards, Repository Structure, Development Workflow, Git and Branching Strategy, CI/CD Standards, Domain Ownership Matrix, Domain Event Catalog, Enterprise Data Dictionary, API Design Standards, Database Design Standards, Event Schema Standards, Security Architecture, Testing & Quality Architecture, Observability Architecture, Deployment Architecture, Performance & Scalability Architecture, Business Continuity & Disaster Recovery Architecture, Data Governance & Information Lifecycle Architecture, Enterprise Glossary, Output Contract, AI Operating Rules, and all approved Architecture Decision Records.

# Code Review Execution

---

# Review Execution Purpose

Code Review Execution defines the practical workflow reviewers and authors must follow after a Pull Request is opened and before it is approved, merged, or rejected.

The execution process should ensure that every review is:

- structured
- risk-aware
- evidence-based
- respectful
- traceable
- complete
- proportionate to the change

A review should not be treated as an informal glance at modified files.

It is a governed engineering activity that evaluates whether a proposed change is safe to integrate.

---

# Standard Review Workflow

The standard review workflow should follow this sequence:

```text
Pull Request Opened
        ↓
Author Self-Review Completed
        ↓
Automated Checks Begin
        ↓
Reviewers Assigned
        ↓
Risk and Scope Assessed
        ↓
Implementation Reviewed
        ↓
Tests and Evidence Reviewed
        ↓
Comments Resolved
        ↓
Required Re-Review Completed
        ↓
Approval Granted
        ↓
Merge Eligibility Confirmed
```

A Pull Request should not advance simply because time has passed.

Each stage should produce sufficient confidence for the next stage.

---

# Review Entry Criteria

A Pull Request should be ready for formal review when:

- the implementation is materially complete
- the author has completed self-review
- the Pull Request description is complete
- required tests have been added
- required documentation has been updated
- known risks are disclosed
- the change scope is stable
- automated checks are running or complete
- unrelated changes have been removed

A reviewer may return an unprepared Pull Request to draft status.

---

# Review Readiness Checklist

Before assigning final reviewers, the author should confirm:

- the requirement is linked
- acceptance criteria are identified
- the affected bounded context is named
- the business rule source is identified
- the changed files are intentional
- the change has been locally validated
- database impact is described
- API and event impact is described
- security and privacy impact is described
- deployment impact is described
- rollback or forward-recovery considerations are described
- screenshots, traces, logs, or test evidence are attached where useful

Missing context should be corrected before reviewers are expected to infer it.

---

# Initial Reviewer Triage

The reviewer should begin with a high-level triage before reading line by line.

The triage should determine:

- what problem the change claims to solve
- whether the Pull Request scope is coherent
- which bounded contexts are affected
- whether the correct owners are assigned
- whether the stated risk level is reasonable
- whether specialized review is required
- whether the change is reviewable in its current form

A reviewer should stop and request clarification when the intent cannot be determined.

---

# Scope Verification

The reviewer should confirm that the actual diff matches the stated Pull Request scope.

The review should identify:

- unexpected files
- unrelated refactoring
- hidden dependency upgrades
- generated output
- infrastructure changes
- configuration changes
- schema changes
- test-only changes
- documentation-only changes

Unexplained scope should be treated as a review concern.

---

# Change Map

For large or complex Pull Requests, the author should provide a change map.

A change map may identify:

- entry points
- core business logic
- data model changes
- API changes
- event changes
- migration files
- infrastructure files
- generated files
- tests
- operational documentation

The change map helps reviewers focus attention without hiding any part of the diff.

---

# Review Order

Reviewers should generally evaluate the change in this order:

1. Requirement and intent
2. Architecture and ownership
3. Business rules
4. Data and financial integrity
5. Security and privacy
6. Failure behavior
7. APIs and Domain Events
8. Database and migrations
9. Testing
10. Observability and operations
11. Performance
12. Maintainability and readability

This order reduces the risk of spending time on style before determining whether the design is correct.

---

# Review Comment Classification

Review comments should use a clear classification.

Recommended classifications include:

- `BLOCKER`
- `REQUIRED`
- `QUESTION`
- `SUGGESTION`
- `NIT`
- `PRAISE`
- `INFO`

The classification should indicate the reviewer’s intent.

---

# Blocker Comments

A `BLOCKER` identifies a condition that prevents approval or merge.

Examples include:

- financial-integrity risk
- security vulnerability
- data corruption risk
- architecture violation
- missing authorization
- unsafe migration
- breaking contract without governance
- duplicate authoritative side effect
- inability to recover safely
- violation of an approved ADR

A blocker should explain:

- the issue
- the risk
- the affected requirement or standard
- the expected correction or required decision

Blockers should be used only for material concerns.

---

# Required Comments

A `REQUIRED` comment identifies a change that must be completed before approval but may not represent an immediate critical risk.

Examples include:

- missing test coverage
- missing error handling
- unclear ownership
- incomplete documentation
- insufficient validation
- missing observability
- confusing implementation
- missing compatibility handling

Required comments should be specific and actionable.

---

# Questions

A `QUESTION` requests clarification.

Questions may address:

- implementation intent
- business-rule source
- unusual control flow
- compatibility assumptions
- failure behavior
- performance assumptions
- ownership decisions

A question may become blocking if the response reveals unresolved risk.

Questions should not be used to imply criticism without explanation.

---

# Suggestions

A `SUGGESTION` proposes an improvement that is not required for approval.

Suggestions may address:

- clearer naming
- simpler structure
- future refactoring
- optional optimization
- documentation quality
- test readability

The author may accept, defer, or explain why the suggestion is not adopted.

Suggestions should not be presented as mandatory.

---

# Nit Comments

A `NIT` identifies a minor issue with little or no material impact.

Examples include:

- wording
- minor naming consistency
- formatting
- comment phrasing

Nits should not overwhelm more important review feedback.

Automated formatting and linting should handle most mechanical issues.

---

# Praise and Informational Comments

A `PRAISE` comment recognizes strong design, testing, explanation, or risk handling.

An `INFO` comment provides context without requesting action.

These comments can improve collaboration and shared learning when used appropriately.

---

# Comment Quality

A useful review comment should:

- identify the exact concern
- explain why it matters
- reference authoritative guidance where relevant
- propose a correction or decision path
- distinguish fact from preference
- avoid unnecessary ambiguity

Poor comment:

```text
This is bad.
```

Better comment:

```text
BLOCKER: This updates the wallet balance directly without creating an authoritative ledger entry. Wallet balances are projections and cannot become the financial source of truth. Route this operation through the approved ledger-posting workflow and rebuild the projection from the resulting entry.
```

---

# Comment Location

Review comments should be placed as close as possible to the relevant code.

General comments should be used for:

- cross-cutting architectural concerns
- Pull Request scope
- missing documentation
- missing test strategy
- release risk
- governance issues

A general concern should not be fragmented across many duplicate inline comments.

---

# Duplicate Review Comments

Reviewers should avoid repeating the same concern on every affected line.

A single representative comment should identify:

- the pattern
- its scope
- the expected global correction

Repetition may be appropriate when different instances create different risks.

---

# Review Discussion

Review discussions should focus on:

- requirements
- architecture
- evidence
- risk
- maintainability
- correctness

Disagreements should be resolved through:

- authoritative documentation
- test evidence
- architecture consultation
- domain-owner input
- security guidance
- measured operational data
- documented engineering tradeoffs

Seniority alone should not replace evidence.

---

# Author Response Expectations

The author should respond to each material comment.

A response should indicate whether the concern was:

- corrected
- clarified
- deferred
- rejected with justification
- escalated for decision

The author should not resolve a conversation without addressing the concern.

---

# Resolving Review Comments

A review conversation should be resolved when:

- the requested change is complete
- the reviewer agrees that clarification is sufficient
- the issue has been transferred to an approved follow-up item
- an authorized decision resolves the disagreement
- the comment is withdrawn

Authors should not unilaterally dismiss blocking concerns.

---

# Deferred Review Findings

A finding may be deferred only when:

- it does not create unacceptable current risk
- the current change remains safe
- a tracked follow-up item is created
- ownership is assigned
- urgency is defined
- the deferral is approved where required

Deferral should not become a routine way to merge incomplete work.

---

# Review Escalation

A concern should be escalated when:

- author and reviewer cannot reach agreement
- architecture authority is unclear
- business rules conflict
- security risk remains disputed
- financial integrity is uncertain
- data ownership is unclear
- multiple bounded contexts claim authority
- policy exceptions are requested

Escalation may involve:

- bounded-context owner
- Architecture Governance
- Security Engineering
- Database Engineering
- financial-integrity owner
- Engineering Leadership

Unresolved material risk should block merge.

---

# Requested Changes

A reviewer should request changes when blocking or required findings remain.

The request should summarize:

- unresolved concerns
- affected areas
- required evidence
- required follow-up
- specialized reviewers still needed

A request for changes should not be used as punishment.

It is a formal statement that the Pull Request is not ready for approval.

---

# Approval

Approval should be granted only after the reviewer confirms that:

- assigned review responsibilities are satisfied
- blocking comments are resolved
- required comments are resolved
- required evidence is available
- tests are adequate
- architecture is respected
- security and financial concerns are addressed
- the current diff matches the reviewed state

Approval should reflect the reviewer’s actual confidence.

---

# Conditional Approval

Conditional approval should be avoided unless repository tooling and governance support it clearly.

Statements such as:

```text
Approved after you fix the remaining issues.
```

may create ambiguity if the final changes are never reviewed.

Where material changes remain, the reviewer should request changes and re-review the final diff.

---

# Re-Review Requirements

Re-review is required when:

- blocking or required comments result in code changes
- business logic changes
- database migrations change
- APIs change
- Domain Event schemas change
- security behavior changes
- authorization changes
- financial behavior changes
- conflict resolution modifies reviewed code
- the branch receives a substantial rebase
- new dependencies are introduced
- the scope expands

Minor spelling or formatting changes may not require full re-review.

---

# Re-Review Focus

During re-review, the reviewer should evaluate:

- whether the original concern was resolved
- whether the correction introduced new behavior
- whether related tests changed appropriately
- whether the change altered other reviewed assumptions
- whether new files or dependencies appeared

Re-review should not assume that a requested correction is automatically safe.

---

# Stale Approvals

Approvals should be dismissed or reconsidered when the reviewed diff changes materially.

Repository protection should support automatic dismissal of stale approvals where practical.

An approval from an outdated diff should not authorize merge of substantially different code.

---

# Review of Automated Check Results

The reviewer should inspect relevant automated results rather than only verifying that the status is green.

The reviewer may need to examine:

- failed and retried tests
- coverage changes
- security warnings
- suppressed findings
- migration output
- contract test results
- performance reports
- infrastructure plans
- generated diffs

A passing status can still hide weak or misconfigured validation.

---

# Flaky Test Review

Flaky tests should not be ignored as harmless noise.

A reviewer should investigate when:

- tests pass only after retry
- failure patterns are intermittent
- the same test repeatedly fails across Pull Requests
- timing changes affect results
- concurrency influences outcomes

A flaky test weakens confidence in the entire validation process.

---

# Review of Test Changes

The reviewer should confirm that test changes are not merely adapting tests to accept incorrect behavior.

The reviewer should examine whether:

- assertions became weaker
- important cases were removed
- failures were converted to ignored tests
- mocks hide real behavior
- test fixtures became unrealistic
- snapshots were blindly updated
- error cases disappeared

Tests should validate intended behavior, not justify implementation output.

---

# Test Coverage Review

Coverage should be evaluated by behavior, not only percentage.

The reviewer should look for coverage of:

- happy paths
- boundary conditions
- invalid input
- authorization failure
- dependency failure
- retries
- duplicate operations
- concurrency
- partial completion
- rollback or compensation

A high numerical coverage score does not guarantee meaningful protection.

---

# Unit Test Review

Unit test review should verify:

- isolation
- deterministic behavior
- meaningful assertions
- appropriate mocking
- clear naming
- coverage of business rules
- boundary-value handling

Unit tests should not reproduce the implementation so closely that both can be wrong in the same way.

---

# Integration Test Review

Integration test review should verify:

- real component collaboration
- correct database behavior
- messaging behavior
- transaction handling
- external adapter behavior
- cleanup and isolation
- realistic configuration

Integration tests should not silently depend on shared mutable environments.

---

# Contract Test Review

Contract test review should verify:

- API compatibility
- event compatibility
- producer expectations
- consumer expectations
- versioning
- optional and required fields
- error behavior
- schema publication

A contract test should protect actual integration expectations.

---

# End-to-End Test Review

End-to-end test review should confirm that tests cover critical customer and operational journeys.

Examples include:

- account creation
- authentication
- item discovery
- entry submission
- payment
- wallet display
- prize flow
- support access
- administrative workflows

End-to-end tests should remain focused on high-value flows rather than duplicating all lower-level tests.

---

# Database Change Review

Database review should begin with ownership.

The reviewer should determine:

- which bounded context owns the schema
- whether the migration is additive or destructive
- whether existing applications remain compatible
- whether data transformation is required
- whether indexes are appropriate
- whether locking risk exists
- whether large tables are affected
- whether rollback or forward recovery is possible

A migration should be reviewed against realistic production conditions.

---

# Migration Review Checklist

A database migration review should verify:

- unique migration identifier
- deterministic ordering
- idempotent execution where appropriate
- safe transaction behavior
- backward compatibility
- index creation strategy
- constraint validation
- data-preservation strategy
- failure behavior
- operational duration
- observability
- recovery plan

Destructive migrations should require explicit approval.

---

# Expand-and-Contract Review

Breaking database changes should prefer expand-and-contract sequencing.

The reviewer should verify:

- the expanded schema is backward compatible
- old and new application versions can coexist
- data migration is observable
- consumers have switched before removal
- obsolete schema removal occurs in a later controlled change

Schema removal should not occur before usage is proven to have ended.

---

# Data Backfill Review

Backfills should be reviewed as production operations.

The reviewer should evaluate:

- batch size
- rate limiting
- locking
- retries
- checkpointing
- idempotency
- failure recovery
- observability
- data validation
- operational duration
- customer impact

A backfill should not assume it will complete in one uninterrupted execution.

---

# API Change Review

API review should verify:

- ownership
- authentication
- authorization
- request validation
- response schema
- error semantics
- pagination
- rate limiting
- idempotency
- versioning
- backward compatibility
- documentation
- observability

The reviewer should identify affected clients and rollout requirements.

---

# Breaking API Change Review

A breaking API change requires explicit governance.

The review should include:

- reason the break is necessary
- impacted consumers
- migration plan
- deprecation period
- versioning strategy
- communication plan
- contract tests
- rollback or recovery strategy

Breaking changes should not be hidden behind a minor implementation change.

---

# Domain Event Change Review

Domain Event review should confirm:

- producing bounded context
- event ownership
- past-tense fact naming
- schema version
- stable identifiers
- occurrence timestamp
- correlation and causation identifiers
- data minimization
- consumer compatibility
- duplicate handling
- replay behavior

An event should represent a fact that has already occurred.

---

# Event Compatibility Review

The reviewer should determine whether event changes are:

- additive
- compatible
- deprecated
- breaking

New fields should normally be optional for existing consumers.

Field meanings should not change silently.

Removing or repurposing fields requires versioning and migration governance.

---

# Event Consumer Review

Consumer changes should be reviewed for:

- idempotency
- duplicate delivery
- out-of-order delivery
- delayed events
- poison-message handling
- retries
- dead-letter behavior
- replay safety
- projection consistency
- observability

Consumers should not assume exactly-once delivery unless the architecture explicitly guarantees it.

---

# Infrastructure Review

Infrastructure review should evaluate:

- affected environments
- resource changes
- security impact
- network impact
- availability impact
- scalability impact
- cost impact
- state changes
- destructive operations
- rollback strategy
- observability

Generated infrastructure plans should be reviewed before apply.

---

# Infrastructure Plan Review

The reviewer should inspect infrastructure plans for:

- unexpected replacement
- resource deletion
- permission expansion
- public exposure
- network-route changes
- secret changes
- storage destruction
- database replacement
- regional changes
- cost increases

A successful plan generation does not prove the plan is safe.

---

# Configuration Review

Configuration review should verify:

- ownership
- type and schema validation
- safe defaults
- environment scope
- secret separation
- backward compatibility
- feature-flag behavior
- operational visibility
- rollback behavior

Configuration should not become unreviewed business logic.

---

# Feature Flag Review

Feature flag changes should define:

- purpose
- owner
- default state
- target environments
- rollout audience
- monitoring
- kill-switch behavior
- expiration or removal plan

Long-lived flags should be reviewed for removal.

A flag should not permanently hide unfinished architecture.

---

# Security Review Execution

Security reviewers should evaluate the change against realistic threat behavior.

Review should consider:

- attacker-controlled input
- privilege escalation
- authorization bypass
- account enumeration
- data exfiltration
- injection
- insecure deserialization
- replay
- credential exposure
- abuse automation
- fraud
- denial of service

Security review should focus on system behavior rather than checklist completion alone.

---

# Authentication Review

Authentication review should verify:

- identity validation
- credential handling
- session creation
- session expiration
- token validation
- refresh behavior
- multi-factor handling
- recovery workflows
- failure responses
- audit logging

Authentication failure should not leak unnecessary information.

---

# Authorization Review

Authorization review should verify:

- resource ownership
- role and permission checks
- tenant or account isolation
- server-side enforcement
- default denial
- administrative boundaries
- indirect object access
- privilege escalation risks
- auditability

Client-side visibility controls must never substitute for server-side authorization.

---

# Input Validation Review

Input validation should confirm:

- accepted type
- format
- length
- range
- allowed values
- normalization
- encoding
- business eligibility
- server-side enforcement

Validation should occur at the appropriate trust boundary.

---

# Output and Data Exposure Review

The reviewer should verify that responses, logs, events, and errors expose only necessary information.

Review should identify:

- personal data
- financial data
- internal identifiers
- authorization details
- secrets
- stack traces
- infrastructure details
- hidden business rules

Data minimization should apply to every output channel.

---

# Dependency Review Execution

When a dependency changes, the reviewer should inspect:

- direct and transitive changes
- lockfile differences
- release notes
- known vulnerabilities
- licensing
- maintenance status
- bundle or image impact
- runtime permissions
- build-time behavior
- removal feasibility

Automated dependency updates should not receive automatic approval without impact analysis.

---

# Performance Review Execution

Performance review should be based on expected scale.

The reviewer should evaluate:

- query count
- query plan
- index use
- memory growth
- CPU cost
- payload size
- network round trips
- caching
- fan-out
- event volume
- queue growth
- worst-case complexity

Material performance claims should be supported by measurements where practical.

---

# Query Review

Database query review should identify:

- unbounded results
- full-table scans
- N+1 behavior
- missing indexes
- unnecessary joins
- excessive row locking
- repeated queries
- inefficient sorting
- large transaction scope

Query behavior should be evaluated against expected production data volume.

---

# Cache Review

Cache review should verify:

- cache ownership
- key design
- invalidation
- expiration
- stale-data tolerance
- authorization safety
- failure behavior
- fallback behavior
- stampede protection

Caches should not become authoritative sources of truth.

---

# Observability Review Execution

Reviewers should confirm that new behavior is visible in production.

Review should consider:

- structured logs
- metrics
- traces
- audit events
- correlation IDs
- business metrics
- alerts
- dashboards
- release markers

The level of observability should match operational risk.

---

# Logging Review

Logging should be reviewed for:

- useful event names
- appropriate levels
- stable fields
- correlation data
- failure context
- redaction
- duplication
- noise
- performance impact

Logs should not include:

- passwords
- tokens
- secret values
- full payment details
- unnecessary personal information

---

# Metric Review

Metrics should:

- have clear ownership
- use stable names
- avoid unbounded labels
- identify success and failure
- support alerting
- support capacity planning
- support business and financial verification where appropriate

Metrics should not expose high-cardinality customer identifiers.

---

# Alert Review

New or changed alerts should be reviewed for:

- signal quality
- threshold
- severity
- recipient
- runbook
- escalation
- recovery behavior
- duplication

An alert without an actionable response path creates noise rather than safety.

---

# Documentation Review Execution

Reviewers should identify every authoritative document affected by the change.

Possible updates include:

- architecture documents
- product specifications
- capability specifications
- API documentation
- event schemas
- data dictionary
- operational runbooks
- deployment guides
- support documentation
- ADRs
- engineering standards

Documentation should be merged with or before the behavior it describes.

---

# Generated Code Review

Generated code should not be exempt from review.

The reviewer should determine:

- generator source
- generator version
- input schema
- reproducibility
- generated diff
- security impact
- licensing
- ownership
- whether manual edits are prohibited

Generated output should be reviewed proportionately to its risk and use.

---

# Documentation-Only Review

Documentation-only changes should still be reviewed for:

- authority
- consistency
- accuracy
- conflict with existing documents
- terminology
- implementation implications
- precedence

A documentation change may alter architecture or business behavior even without source-code changes.

---

# Merge Readiness Review

Before final approval, the reviewer should confirm:

- all required roles approved
- all blocking discussions are resolved
- required checks passed
- approvals are current
- the branch is mergeable
- documentation is complete
- migration and deployment effects are understood
- no unauthorized scope remains
- no secrets or temporary code remain

Merge readiness is a separate decision from implementation completion.

---

# Review Completion Summary

For complex or high-risk Pull Requests, the final reviewer or author should provide a completion summary.

The summary may identify:

- final scope
- primary risks reviewed
- specialized approvals
- validation evidence
- known limitations
- deployment controls
- follow-up items
- rollback or forward-recovery plan

The summary should help Release Engineering understand what was approved.

---

# AI-Assisted Review Execution

AI assistants may help execute reviews by:

- summarizing the diff
- creating a change map
- identifying high-risk files
- classifying findings
- comparing code with authoritative standards
- checking for missing tests
- identifying potential compatibility issues
- reviewing migrations
- analyzing infrastructure plans
- preparing re-review summaries

AI findings should be verified before being treated as authoritative.

---

# AI Review Comment Standards

AI-generated review comments should:

- identify the exact location or behavior
- classify the finding
- explain the risk
- cite the governing rule when available
- propose a reasonable correction
- disclose uncertainty
- avoid inventing requirements
- avoid overwhelming the Pull Request with repetitive comments

AI should prefer fewer meaningful findings over large volumes of speculative output.

---

# AI Approval Restrictions

AI must not independently:

- approve a Pull Request
- dismiss a human blocker
- resolve architectural disagreement
- waive a security concern
- accept financial-integrity risk
- authorize a destructive migration
- override required reviewers
- merge code
- bypass quality gates
- declare an unresolved change safe

Final review authority remains with qualified humans or explicitly approved governance automation.

---

# AI Implementation Rules

AI-generated code-review execution guidance and tooling must:

- require a complete and reviewable Pull Request before final review begins
- assess requirement, scope, risk, bounded-context ownership, business rules, data integrity, security, failure behavior, tests, operations, and maintainability
- classify findings clearly as blockers, required changes, questions, suggestions, nits, praise, or informational notes
- explain why each material finding matters and reference authoritative rules where available
- require re-review after material changes to code, business rules, migrations, APIs, Domain Events, authorization, security, financial behavior, infrastructure, or dependencies
- inspect automated evidence rather than treating a passing status as sufficient proof
- verify test quality, assertions, failure scenarios, idempotency, concurrency, retries, and partial-success handling
- require specialized review for ledger, wallet, payment, payout, prize, sweepstakes, identity, security, database, infrastructure, and contract changes
- enforce server-side authorization and prohibit client-side controls from being treated as security boundaries
- preserve the ledger as the authoritative financial source of truth and wallet balances as rebuildable projections
- verify Domain Event ownership, compatibility, duplicate handling, ordering assumptions, and replay safety
- verify database migrations against realistic production data, compatibility, locking, recovery, and expand-and-contract requirements
- verify infrastructure plans for destructive actions, permission expansion, public exposure, data loss, regional impact, and cost risk
- require documentation updates whenever authoritative architecture, business rules, APIs, events, schemas, operations, or customer behavior changes
- prevent stale approvals from authorizing materially changed code
- never allow AI to independently approve, merge, waive controls, resolve governance disputes, or authorize production risk
- remain fully aligned with the Master Architecture, Engineering Standards, Coding Standards, Repository Structure, Development Workflow, Git and Branching Strategy, CI/CD Standards, Domain Ownership Matrix, Domain Event Catalog, Enterprise Data Dictionary, API Design Standards, Database Design Standards, Event Schema Standards, Security Architecture, Testing & Quality Architecture, Observability Architecture, Deployment Architecture, Performance & Scalability Architecture, Business Continuity & Disaster Recovery Architecture, Data Governance & Information Lifecycle Architecture, Enterprise Glossary, Output Contract, AI Operating Rules, and all approved Architecture Decision Records.

# Specialized Reviews

---

# Specialized Review Purpose

Not every repository change carries the same level of operational or business risk.

Certain areas of Project Zero-Loss require specialized reviewers with domain expertise because failures may result in:

- financial loss
- customer harm
- security incidents
- regulatory exposure
- data corruption
- architectural degradation
- operational outages
- reputational damage

This section defines the additional review requirements for high-risk and business-critical changes.

Specialized reviews supplement—not replace—the standard code review process.

---

# Specialized Review Principles

Specialized reviews should:

- involve qualified reviewers
- evaluate domain-specific risks
- preserve enterprise architecture
- protect authoritative business data
- validate operational safety
- verify regulatory and policy compliance
- ensure production readiness
- document significant review decisions

Expert review should be proportional to business risk.

---

# Financial Integrity Reviews

Financial functionality requires enhanced review because incorrect behavior may directly affect customer funds, business accounting, and operational trust.

Financial reviews should evaluate:

- correctness
- traceability
- reconciliation
- authorization
- idempotency
- concurrency
- auditability
- rollback behavior

Financial correctness always takes precedence over implementation convenience.

---

# Ledger Review

The authoritative ledger is the financial source of truth.

Reviewers shall verify that changes:

- create immutable ledger entries
- never modify historical postings
- preserve transaction ordering
- maintain reconciliation
- support auditing
- prevent duplicate posting
- preserve financial traceability
- follow approved posting workflows

Reviewers should reject implementations that derive authoritative balances from mutable values.

---

# Wallet Projection Review

Wallet balances are projections derived from the authoritative ledger.

Reviewers should verify:

- projection rebuild capability
- replay safety
- idempotent event handling
- duplicate protection
- reconciliation support
- eventual consistency
- projection recovery

Wallet updates should never bypass ledger processing.

---

# Payment Processing Review

Payment-related reviews should examine:

- authorization
- settlement
- retries
- duplicate prevention
- fraud controls
- timeout handling
- external provider interaction
- reconciliation
- failure recovery

External payment providers should never become the authoritative financial record.

---

# Refund Review

Refund implementations should verify:

- eligibility
- authorization
- audit trail
- duplicate prevention
- financial reconciliation
- notification
- ledger posting
- reporting consistency

Refunds should produce compensating financial records rather than modifying historical transactions.

---

# Payout Review

Payout reviews should evaluate:

- eligibility
- approval workflow
- destination validation
- duplicate prevention
- payout state transitions
- reconciliation
- reporting
- audit logging

Payout execution should remain idempotent.

---

# Financial Reconciliation Review

Financial reconciliation should verify consistency between:

- ledger
- payment providers
- payout providers
- wallet projections
- reporting
- accounting exports

Reviewers should identify situations where reconciliation could silently fail.

---

# Transaction Boundary Review

Reviewers should confirm that financial transactions:

- define correct consistency boundaries
- avoid partial completion
- coordinate external effects safely
- handle retries correctly
- support compensating actions
- preserve atomicity where required

External systems should not be assumed to participate in database transactions.

---

# Fraud and Risk Review

Fraud-related changes require specialized review.

Examples include:

- duplicate-account detection
- abuse prevention
- account takeover protection
- payment fraud
- automated abuse detection
- velocity rules
- suspicious activity monitoring

Reviewers should evaluate both false positives and false negatives.

---

# Identity Review

Identity reviews should verify:

- account ownership
- identity verification
- account recovery
- duplicate prevention
- authentication linkage
- customer profile ownership
- auditability

Identity remains owned by the Identity & Profile bounded context.

---

# Authentication Review

Authentication reviews should examine:

- login flows
- token validation
- session management
- credential handling
- password reset
- MFA support
- account lockout
- session expiration

Authentication failures should not disclose unnecessary information.

---

# Authorization Review

Authorization reviews should verify:

- server-side enforcement
- resource ownership
- least privilege
- administrative separation
- permission inheritance
- role evaluation
- indirect object access

UI visibility should never replace authorization.

---

# Privacy Review

Privacy reviews should evaluate:

- personal information
- financial information
- customer identifiers
- retention
- deletion
- masking
- encryption
- customer consent

Only the minimum required data should be collected.

---

# Encryption Review

Encryption reviews should verify:

- approved algorithms
- key management
- rotation
- storage
- transport security
- certificate handling
- secret protection

Application code should never embed production secrets.

---

# Security Logging Review

Security logging should record:

- authentication events
- authorization failures
- administrative actions
- fraud events
- suspicious activity
- privilege changes
- secret access
- account recovery

Logs should support investigation without exposing sensitive information.

---

# Pools & Sweepstakes Review

Pools & Sweepstakes reviews require enhanced scrutiny because they directly affect customer participation and prize distribution.

Reviewers should verify:

- pool ownership
- sweepstakes ownership
- entry eligibility
- entry requests
- entry locks
- entry creation
- draw execution
- winner determination
- prize assignment
- financial integration

Business rules should remain deterministic and reproducible.

---

# Entry Lock Review

Entry lock logic should guarantee:

- duplicate prevention
- concurrency safety
- expiration behavior
- recovery
- replay safety
- auditability

Entry locks should prevent duplicate participation.

---

# Draw Review

Draw implementations should verify:

- eligibility snapshot
- reproducibility
- randomness source
- audit trail
- deterministic replay
- winner recording
- failure handling

Draw execution should never depend upon client-side logic.

---

# Prize Assignment Review

Prize assignment should verify:

- winner ownership
- eligibility
- duplicate prevention
- audit trail
- payout integration
- ledger integration
- notification

Prize assignment must remain traceable.

---

# Database Review

Specialized database review should evaluate:

- schema ownership
- migration safety
- locking
- indexing
- transaction scope
- compatibility
- data preservation
- rollback strategy

Large-scale migrations require operational planning.

---

# Destructive Migration Review

Destructive migrations require explicit review.

Reviewers should evaluate:

- data retention
- backup availability
- migration timing
- recovery
- expand-and-contract alternatives
- operational impact

Destructive changes should occur only after compatibility has been verified.

---

# Infrastructure Review

Infrastructure reviews should examine:

- networking
- compute resources
- storage
- security groups
- IAM policies
- scaling
- availability
- cost
- disaster recovery

Infrastructure should remain reproducible through Infrastructure as Code.

---

# Deployment Review

Deployment reviews should verify:

- rollout strategy
- rollback plan
- monitoring
- health checks
- deployment sequencing
- migration timing
- release documentation

Production deployment should never rely on undocumented manual procedures.

---

# API Review

API reviewers should evaluate:

- ownership
- compatibility
- authentication
- authorization
- versioning
- rate limiting
- pagination
- documentation
- observability

Breaking API changes require governance approval.

---

# Domain Event Review

Domain Event reviews should verify:

- ownership
- event naming
- schema evolution
- compatibility
- replay
- duplicate handling
- consumer impact
- producer responsibility

Published events represent historical facts.

---

# Integration Review

Integration reviews should examine:

- external providers
- retries
- circuit breakers
- idempotency
- timeout handling
- observability
- contract stability

Integration failures should not corrupt authoritative business data.

---

# Performance Review

Performance reviewers should evaluate:

- scalability
- latency
- throughput
- concurrency
- caching
- memory usage
- query efficiency
- infrastructure utilization

Performance should be measured using realistic workloads.

---

# Resilience Review

Resilience reviews should examine:

- retry behavior
- graceful degradation
- circuit breakers
- fallback logic
- recovery
- dependency failures
- partial failures
- disaster scenarios

Systems should fail predictably rather than unpredictably.

---

# Observability Review

Observability reviewers should verify:

- structured logging
- metrics
- traces
- dashboards
- alerts
- audit events
- deployment markers

Operational teams should have sufficient visibility into production behavior.

---

# Documentation Review

High-risk changes should verify that authoritative documentation is updated.

Documentation may include:

- architecture
- ADRs
- API specifications
- event schemas
- data dictionary
- runbooks
- operational procedures

Documentation should evolve with implementation.

---

# Emergency Review

Emergency changes require accelerated—but not eliminated—review.

Emergency reviews should verify:

- incident reference
- limited scope
- operational necessity
- rollback readiness
- production verification
- follow-up review

Emergency status does not eliminate accountability.

---

# Third-Party Dependency Review

Major dependency updates should review:

- security posture
- maintenance status
- licensing
- operational risk
- breaking changes
- compatibility
- migration effort

Dependency adoption should remain intentional.

---

# AI-Generated Code Review

AI-generated code requires the same engineering standards as manually written code.

Reviewers should verify:

- correctness
- architectural compliance
- business-rule accuracy
- security
- financial integrity
- maintainability
- documentation
- testing

AI-generated code should never receive reduced scrutiny.

---

# AI-Assisted Specialized Reviews

AI assistants may support specialized reviews by:

- identifying high-risk changes
- mapping affected bounded contexts
- summarizing financial workflows
- detecting architectural violations
- highlighting security concerns
- reviewing migration risk
- identifying missing documentation
- comparing implementation against ADRs

AI findings remain advisory.

Qualified human reviewers retain approval authority.

---

# AI Implementation Rules

AI-generated specialized-review guidance must:

- require qualified domain reviewers for high-risk changes
- preserve authoritative ledger ownership
- preserve wallet projection architecture
- verify Pools & Sweepstakes ownership boundaries
- validate financial correctness, reconciliation, and auditability
- require enhanced review for payments, payouts, refunds, identity, authentication, authorization, security, privacy, database, infrastructure, APIs, Domain Events, and deployment
- evaluate idempotency, concurrency, retries, rollback, replay, and recovery
- prevent client-side logic from becoming authoritative
- require documentation updates for architectural or business-rule changes
- never approve high-risk changes without appropriate human review
- remain fully aligned with the Master Architecture, Engineering Standards, Coding Standards, Git and Branching Strategy, CI/CD Standards, Domain Ownership Matrix, Security Architecture, Deployment Architecture, Testing & Quality Architecture, Output Contract, AI Operating Rules, and all approved Architecture Decision Records (ADRs).

# Code Review Governance

---

# Governance Purpose

Code Review Governance establishes the enterprise controls that determine:

- who may review changes
- which reviews are required
- how review authority is assigned
- how approvals are recorded
- when approvals become stale
- how exceptions are governed
- how review quality is measured
- how review evidence is retained
- how human and AI-assisted review remain accountable

Code review is a required governance control within the Project Zero-Loss software delivery lifecycle.

It protects the codebase from changes that may be technically functional but architecturally invalid, financially unsafe, operationally fragile, insecure, or inconsistent with authoritative business rules.

---

# Governance Principles

Code review governance should ensure that:

- every material change receives independent review
- review depth reflects change risk
- qualified reviewers evaluate specialized concerns
- architectural authority is preserved
- financial integrity receives enhanced protection
- security and privacy concerns cannot be silently waived
- approvals apply only to the reviewed change
- review evidence remains auditable
- emergency workflows preserve accountability
- AI assistance does not replace qualified human judgment

Review governance should improve both engineering quality and institutional trust.

---

# Review Authority

Review authority is the permission to evaluate and approve changes within a defined area of responsibility.

Review authority may be based on:

- bounded-context ownership
- repository ownership
- technical expertise
- security responsibility
- financial-integrity responsibility
- database ownership
- infrastructure ownership
- API ownership
- Domain Event ownership
- release-engineering responsibility
- architecture-governance authority

Review authority should be explicit rather than assumed.

---

# Approval Authority

Approval authority should reflect the reviewer’s assigned responsibility.

A reviewer may approve only the concerns they are qualified and authorized to evaluate.

For example:

- a bounded-context owner may approve domain behavior
- a security reviewer may approve security controls
- a database reviewer may approve migration safety
- a financial-integrity reviewer may approve ledger-sensitive behavior
- an architecture reviewer may approve structural alignment
- a release reviewer may approve delivery readiness

One approval should not be assumed to satisfy every specialized review requirement.

---

# CODEOWNERS Governance

The repository should use CODEOWNERS or an equivalent ownership mechanism to identify required reviewers for protected paths.

CODEOWNERS should represent actual accountability.

It should not be treated as a static contact list.

Ownership definitions should be reviewed whenever:

- bounded-context ownership changes
- teams change
- repositories are reorganized
- critical files are added
- services are retired
- security boundaries change
- financial responsibilities change

Outdated ownership rules create approval gaps.

---

# Protected Paths

Protected repository paths should require designated reviewers.

Protected paths may include:

- ledger implementation
- wallet projections
- payment processing
- payout processing
- refund processing
- reconciliation
- Pools & Sweepstakes logic
- winner determination
- prize assignment
- identity and authentication
- authorization policies
- customer data models
- database migrations
- infrastructure definitions
- CI/CD pipelines
- security configuration
- secret-management configuration
- API contracts
- Domain Event schemas
- architecture documents
- approved ADRs

Changes to protected paths should not merge without the required owners.

---

# Bounded-Context Review Governance

Each bounded context should have clearly identified review ownership.

The bounded-context owner is responsible for confirming that changes:

- implement the correct domain rules
- preserve domain terminology
- remain within the ownership boundary
- do not duplicate another context’s logic
- use approved integration contracts
- protect authoritative data
- maintain domain-event correctness

Cross-context changes should require review from each affected owner where responsibility is materially affected.

---

# Cross-Context Changes

A change spanning multiple bounded contexts should identify:

- the initiating context
- every affected context
- data ownership
- API or event contracts
- release sequencing
- failure behavior
- consistency expectations
- responsible reviewers

No single context should silently redefine another context’s business rules.

---

# Required Review Count

The minimum required number of reviewers should depend on risk.

A low-risk change may require one qualified reviewer.

A medium-risk change may require:

- one qualified implementation reviewer
- applicable code owner approval

A high-risk change may require:

- bounded-context owner
- specialized reviewer
- independent second reviewer

A critical-risk change may require multiple specialized approvals and explicit governance authorization.

Repository protections should enforce the approved minimums.

---

# Independent Review

At least one required approval should come from a reviewer who did not author the change.

For higher-risk changes, independence should also avoid situations where the same person:

- defines the requirement
- implements the change
- approves the change
- deploys the change
- validates the production result

Independence reduces confirmation bias and concentration of authority.

---

# Segregation of Duties

Segregation of duties should be applied proportionately.

For high-risk changes, separate individuals or governed roles should perform:

- implementation
- review
- security approval
- financial-integrity approval
- production authorization
- deployment execution
- production verification

A single contributor should not control the entire lifecycle of a critical change.

---

# Financial Review Governance

Financially sensitive changes require designated financial-integrity approval.

This includes changes affecting:

- ledger posting
- wallet projection
- payments
- payouts
- refunds
- chargebacks
- reconciliation
- prize accounting
- financial corrections
- balance presentation
- financial reporting

Financial approval should confirm that:

- the ledger remains authoritative
- wallet values remain projections
- postings are immutable
- corrections are traceable
- duplicate effects are prevented
- reconciliation remains possible
- failure behavior is financially safe

Financial uncertainty should block approval.

---

# Pools & Sweepstakes Review Governance

Changes affecting Pools & Sweepstakes require review from the owning domain authority.

Required review should apply to:

- Pool creation
- Sweepstakes creation
- Entry Requests
- Entry Locks
- Entries
- Draws
- Winners
- Prize Assignments
- eligibility rules
- draw procedures
- prize workflows
- related ledger integration

Review must preserve reproducibility, auditability, eligibility enforcement, and prize traceability.

---

# Security Review Governance

Security-sensitive changes require qualified security review.

This includes changes affecting:

- authentication
- authorization
- identity recovery
- secrets
- encryption
- customer data access
- administrative access
- network boundaries
- fraud controls
- abuse prevention
- security logging
- third-party security integrations

Security findings should not be waived solely for schedule reasons.

---

# Privacy Review Governance

Privacy review should be required when a change:

- collects new personal data
- changes data use
- changes retention
- changes deletion behavior
- exposes data to another context
- adds third-party sharing
- modifies consent
- changes customer-data exports
- changes logging of personal information

Privacy review should confirm purpose limitation and data minimization.

---

# Database Review Governance

Database changes should require review from qualified database or data-platform ownership when they affect:

- production schemas
- constraints
- indexes
- large tables
- data migration
- retention
- destructive operations
- replication
- archival
- authoritative financial data
- customer identity data

Migration approval should account for realistic production scale and recovery requirements.

---

# API Review Governance

API changes should require review from the owning API domain.

Breaking or externally visible changes should additionally require:

- compatibility review
- consumer-impact analysis
- versioning approval
- migration planning
- documentation review
- release coordination

An API owner may not silently repurpose existing fields or behavior.

---

# Domain Event Review Governance

Domain Event changes should require review from:

- producing bounded-context owner
- event-schema owner where applicable
- affected consumer owners for material changes

Review should verify:

- ownership
- event semantics
- compatibility
- versioning
- replay safety
- duplicate handling
- data minimization
- operational impact

Published Domain Events should remain immutable historical facts.

---

# Infrastructure Review Governance

Infrastructure changes should require approval from qualified platform or infrastructure ownership.

Enhanced review should apply to changes affecting:

- production networking
- public exposure
- IAM
- encryption
- storage
- databases
- backups
- disaster recovery
- regional topology
- autoscaling
- production credentials
- CI/CD execution roles

Destructive or privilege-expanding changes should require explicit approval.

---

# CI/CD Review Governance

Changes to CI/CD pipelines should require review from Release Engineering, Platform Engineering, or another designated owner.

Review should verify:

- protected branch behavior
- quality gates
- deployment authority
- secret usage
- artifact integrity
- production safeguards
- rollback support
- auditability
- environment isolation

A pipeline change may affect every downstream release and should receive appropriate scrutiny.

---

# Documentation Review Governance

Authoritative documentation should have designated owners.

This includes:

- Master Architecture
- architecture standards
- engineering standards
- product specifications
- operations specifications
- ADRs
- Domain Ownership Matrix
- Domain Event Catalog
- Enterprise Data Dictionary
- Enterprise Glossary
- AI Operating Rules
- Output Contract

Documentation changes that alter architecture, ownership, business rules, or governance should receive review comparable to implementation changes.

---

# Architecture Decision Review

A change that conflicts with an approved ADR should not be approved through ordinary code review.

The change must either:

- conform to the ADR
- receive an approved exception
- supersede the ADR through the formal decision process

Code review cannot silently overturn architectural authority.

---

# Reviewer Conflict of Interest

A reviewer should disclose a material conflict of interest.

Examples include:

- sole ownership of the implementation and approval
- personal responsibility for the disputed design
- inability to evaluate the affected technology
- pressure to approve without review
- participation in an unresolved incident involving the change

Another reviewer should be assigned where independence is materially compromised.

---

# Reviewer Availability

Code ownership should not depend on one individual.

Critical areas should have sufficient qualified reviewers to support:

- normal delivery
- vacations
- incidents
- emergency changes
- organizational transitions
- knowledge continuity

Single-reviewer dependency is an operational risk.

---

# Reviewer Delegation

A code owner may delegate review authority only through an approved and visible process.

Delegation should identify:

- delegated scope
- delegated reviewer
- required expertise
- start date
- expiration or review date
- approving authority

Informal delegation should not bypass repository protections.

---

# Review Service-Level Expectations

Teams should define reasonable review-response expectations.

Review expectations may consider:

- risk
- Pull Request size
- release urgency
- reviewer availability
- business priority
- incident status

Review speed should not come at the expense of review quality.

Authors should not create artificial urgency by submitting changes late.

---

# Stale Pull Requests

A Pull Request may become stale when:

- requirements change
- architecture changes
- the branch diverges materially
- dependencies become outdated
- conflicts accumulate
- the author is unavailable
- review context is no longer valid

Stale Pull Requests should be:

- refreshed
- revalidated
- reassigned
- split
- closed
- replaced

Old approval should not be treated as current evidence.

---

# Abandoned Pull Requests

An abandoned Pull Request should not remain indefinitely open without ownership.

Repository governance should define when abandoned work is:

- reassigned
- archived
- closed
- superseded

Closing a Pull Request does not delete its review history.

---

# Review Evidence

Review evidence should include, where applicable:

- reviewer identities
- approval timestamps
- requested changes
- resolved discussions
- test results
- security findings
- architecture references
- migration evidence
- deployment considerations
- exception records
- approval status at merge

Evidence should support reconstruction of why the change was approved.

---

# Approval Record Integrity

Approval records should be tamper resistant.

Repository controls should preserve:

- who approved
- what commit was approved
- when approval occurred
- whether approval became stale
- whether required owners approved
- whether checks passed
- whether an override occurred

Approval should attach to a specific reviewed state.

---

# Dismissed Reviews

A review may be dismissed only for an authorized reason.

Examples include:

- reviewer error
- reviewer no longer authorized
- review superseded by material changes
- conflict resolution invalidated the review
- repository policy correction

Dismissal should preserve:

- original review
- dismissal reason
- dismissing authority
- timestamp

Review history should not be erased.

---

# Override Governance

Repository protections should not be overridden casually.

An override should require:

- authorized role
- documented reason
- risk assessment
- explicit accountability
- incident or exception reference
- post-action review

Overrides involving financial, security, identity, database, or production controls should receive enhanced scrutiny.

---

# Emergency Review Governance

Emergency review processes may reduce normal lead time but should preserve:

- independent review
- clear incident linkage
- limited scope
- qualified approval
- deployment traceability
- rollback or forward-recovery planning
- post-incident review

Emergency status should not eliminate review unless immediate action is required to prevent greater harm.

When review is temporarily impossible, retrospective review should occur as soon as operationally safe.

---

# Hotfix Review Governance

A hotfix should:

- address a specific urgent defect
- remain narrowly scoped
- include appropriate tests
- receive qualified review
- preserve branch history
- be merged back into the normal development line
- receive post-release verification

Hotfixes should not become an alternative path for ordinary feature delivery.

---

# Review Exceptions

A review exception may be granted only when the normal requirement cannot reasonably be met and the remaining risk is explicitly accepted.

Every exception should identify:

- the control being bypassed
- the reason
- the affected change
- the risk
- compensating controls
- approving authority
- expiration
- required follow-up

Exceptions should be rare, temporary, and auditable.

---

# Prohibited Exceptions

Exceptions should not authorize:

- intentional ledger corruption
- removal of financial audit history
- unreviewed winner manipulation
- authorization bypass
- exposure of secrets
- untraceable production changes
- deployment of known malicious code
- deletion of required compliance evidence
- falsification of review or test results

Some controls are non-waivable.

---

# Review Metrics

Code review governance should measure useful indicators such as:

- time to first review
- time to approval
- number of review cycles
- stale approval frequency
- escaped defect rate
- review-related incident rate
- high-risk review coverage
- CODEOWNERS coverage
- exception frequency
- re-review frequency
- comment resolution time
- reviewer workload distribution

Metrics should be interpreted carefully.

Fast approval is not inherently evidence of effective review.

---

# Review Quality Metrics

Review quality may be evaluated through:

- defects found before merge
- architecture violations prevented
- security issues identified
- missing tests identified
- post-merge reversions
- production incidents linked to reviewed changes
- audit findings
- reviewer calibration
- review completeness

Review quality should not be reduced to comment count.

---

# Reviewer Workload Governance

Reviewer workload should be monitored to prevent:

- approval bottlenecks
- superficial reviews
- reviewer fatigue
- concentration of authority
- delayed high-risk work
- knowledge silos

Ownership should be distributed without weakening expertise requirements.

---

# Reviewer Calibration

Teams should periodically calibrate review practices.

Calibration activities may include:

- reviewing sample Pull Requests
- comparing severity classifications
- discussing escaped defects
- reviewing security findings
- reviewing financial incidents
- aligning on architecture standards
- updating review checklists

Calibration improves consistency across reviewers.

---

# Review Training

Reviewers should receive training appropriate to their responsibilities.

Training may include:

- architecture
- bounded-context ownership
- financial controls
- secure coding
- privacy
- database migration safety
- event-driven systems
- infrastructure review
- incident learning
- AI-assisted review limitations

Review authority should be supported by competence.

---

# Audit and Compliance Review

Periodic audit should verify that:

- required reviews occurred
- required owners approved
- stale approvals were not used
- quality gates passed
- exceptions were authorized
- high-risk changes received enhanced review
- segregation of duties was preserved
- evidence retention is adequate

Audit findings should create corrective actions.

---

# Review Record Retention

Review records should be retained according to the Data Governance & Information Lifecycle Architecture.

Retention should account for:

- financial audits
- security investigations
- regulatory obligations
- architecture decisions
- incident investigations
- release traceability
- legal hold requirements

Review history for critical changes may require extended retention.

---

# Review Data Classification

Review content may contain:

- source code
- security findings
- customer-data references
- architecture details
- infrastructure details
- incident information
- financial-control information

Access to review records should reflect their sensitivity.

Sensitive review details should not be copied into unauthorized external systems.

---

# External Contributor Governance

External contributors should remain subject to:

- branch protections
- required reviews
- untrusted-build restrictions
- secret isolation
- security scanning
- license review
- contribution agreements where applicable

External contribution status should not reduce review standards.

---

# Vendor-Generated Changes

Changes supplied by vendors should be reviewed as untrusted changes until validated.

Review should confirm:

- source authenticity
- licensing
- security
- compatibility
- maintainability
- data handling
- support model
- upgrade implications

Vendor approval does not replace Project Zero-Loss approval.

---

# Automated Dependency Pull Requests

Automated dependency Pull Requests should require:

- lockfile review
- vulnerability analysis
- changelog review
- compatibility validation
- tests
- license review
- deployment-risk assessment

Automation may open the Pull Request.

Automation should not unconditionally approve or merge high-risk updates.

---

# Generated Code Governance

Generated code should have a defined governance model.

The repository should identify:

- authoritative generator
- generator version
- source schema
- reproducibility requirements
- whether generated files are reviewed
- whether generated files may be edited
- validation requirements

Generated code should not create an unreviewed path into production.

---

# AI-Assisted Review Governance

AI assistants may support review through:

- change summaries
- risk classification
- standards comparison
- test-gap analysis
- security suggestions
- migration analysis
- duplication detection
- documentation checks
- review preparation

AI assistance should operate within approved security, privacy, and data-handling constraints.

---

# AI Review Identity

AI-generated findings should be distinguishable from human findings where practical.

The review record should make clear:

- which tool generated the finding
- whether a human verified it
- whether the finding is advisory or blocking
- which policy authorized automated enforcement

AI output should not impersonate human approval.

---

# AI Data Access Governance

AI review systems should receive only the repository data required for the review.

AI data access should consider:

- source-code sensitivity
- secrets
- customer data
- incident data
- security vulnerabilities
- contractual restrictions
- data residency
- retention

Sensitive content should not be sent to an unapproved AI system.

---

# AI-Generated Approval Prohibition

AI assistants must not independently provide final human-equivalent approval for:

- financial changes
- security changes
- identity changes
- authorization changes
- database migrations
- infrastructure changes
- API breaking changes
- Domain Event breaking changes
- Pools & Sweepstakes changes
- production pipeline changes

AI may recommend approval readiness.

Qualified humans or explicitly authorized governance automation must make the approval decision.

---

# Automation Governance

Automated policy checks may block changes when objective rules fail.

Examples include:

- missing required reviewer
- failed test
- architecture violation
- unsigned artifact
- detected secret
- blocked vulnerability
- migration-policy failure
- stale approval
- missing documentation
- protected-path violation

Automated enforcement should be:

- version controlled
- documented
- testable
- auditable
- reviewed

Automation should not silently change governance requirements.

---

# Policy-as-Code Review

Policies implemented as code should receive review appropriate to their impact.

Policy changes should verify:

- intended scope
- false-positive behavior
- false-negative behavior
- exception mechanism
- audit output
- rollback
- enforcement environment
- ownership

A policy bug can either block safe delivery or permit unsafe delivery.

---

# Review Governance Incidents

A governance incident may occur when:

- required review is bypassed
- unauthorized approval is used
- review evidence is altered
- an override is abused
- CODEOWNERS is misconfigured
- a stale approval authorizes merge
- AI-generated output is treated as unauthorized approval
- high-risk code merges without required expertise

Governance incidents should be investigated and remediated.

---

# Continuous Improvement

Code review governance should evolve through:

- incident findings
- escaped defects
- security discoveries
- financial reconciliation findings
- reviewer feedback
- audit findings
- architecture changes
- tooling improvements
- organizational changes

The goal is not to maximize process.

The goal is to maintain the minimum effective controls necessary for safe and sustainable delivery.

---

# Governance Review Cycle

These Code Review Guidelines should be reviewed:

- periodically
- after material architecture changes
- after major incidents
- after financial-control failures
- after security incidents
- after audit findings
- after repository restructuring
- after major tooling changes
- after changes to AI-assisted development practices

Changes to review governance should follow the same controlled documentation process as other authoritative standards.

---

# Code Review Guidelines Acceptance Criteria

This document is complete when:

- every material repository change requires independent review
- review depth is explicitly proportional to risk
- authors and reviewers have defined responsibilities
- Pull Requests contain sufficient context, evidence, and scope clarity
- review comments use clear intent and severity
- approvals apply only to the reviewed commit state
- stale approvals are dismissed or revalidated
- bounded-context ownership is enforced
- CODEOWNERS protects critical repository paths
- specialized review is required for financial, security, identity, privacy, database, infrastructure, API, Domain Event, and Pools & Sweepstakes changes
- the ledger remains the authoritative financial source of truth
- wallet balances remain rebuildable projections
- Pools & Sweepstakes retains ownership of Pools, Sweepstakes, Entry Requests, Entry Locks, Entries, Draws, Winners, and Prize Assignments
- segregation of duties is applied to high-risk changes
- emergency and hotfix reviews preserve traceability and accountability
- review exceptions are rare, approved, temporary, and auditable
- review evidence is retained according to governance requirements
- AI-assisted review remains advisory unless a specific policy-as-code control is formally authorized
- AI does not independently approve high-risk changes
- review metrics support quality, risk reduction, and continuous improvement
- all review activity remains aligned with authoritative architecture, engineering standards, security controls, and approved ADRs

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
|----------|------|-------------|
| 1.0 | July 2026 | Initial Code Review Guidelines document. |

---

# Guiding Statement

The Code Review Guidelines establish the authoritative framework for evaluating every proposed change to Project Zero-Loss before it becomes part of the protected codebase. Review is not a ceremonial approval step; it is a critical engineering, financial, security, architectural, and operational safeguard. Every approval must represent informed judgment supported by evidence, qualified ownership, independent review, and complete traceability. By governing code review as an enterprise control, Project Zero-Loss protects authoritative business rules, preserves financial integrity, enforces bounded-context ownership, strengthens security, and ensures that human contributors, AI assistants, and automated systems can improve the platform without compromising its long-term safety or trustworthiness.

