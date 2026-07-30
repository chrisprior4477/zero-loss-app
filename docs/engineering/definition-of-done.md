# Project Zero-Loss

# Definition of Done

**Document Path:** `docs/engineering/definition-of-done.md`  
**Document Type:** Enterprise Engineering Standard  
**Version:** 1.0  
**Status:** Authoritative  
**Authority Level:** Engineering Governance  
**Owner:** Engineering Leadership, Architecture Governance, Product Ownership, Security Engineering, Quality Engineering, and Bounded-Context Owners  
**Applies To:** All Features, Defects, Services, APIs, Domain Events, Database Changes, Infrastructure Changes, Configuration Changes, Documentation Changes, Operational Changes, Human Contributions, AI-Generated Changes, and Automation-Generated Changes  
**Last Updated:** July 2026

---

# Document Purpose

The Definition of Done establishes the authoritative completion standard for all work performed within Project Zero-Loss.

It defines the minimum conditions that must be satisfied before a change may be considered complete.

The purpose of this document is to prevent work from being declared done when only implementation activity has finished.

A change is not done merely because:

- code exists
- a user interface appears functional
- a Pull Request was opened
- a Pull Request was approved
- automated tests passed
- a branch was merged
- an artifact was built
- a deployment completed
- an individual contributor believes the work is complete

A change is done only when all applicable product, architectural, engineering, security, financial, data, quality, documentation, deployment, operational, and governance obligations have been satisfied.

The Definition of Done creates a shared completion contract for:

- Product Ownership
- Engineering
- Architecture Governance
- Security Engineering
- Quality Engineering
- Platform Engineering
- Release Engineering
- Operations
- Support
- human contributors
- AI assistants
- automated delivery systems

Completion must be based on objective evidence rather than confidence, assumption, or schedule pressure.

---

# Architectural Authority

This document governs completion criteria for all Project Zero-Loss engineering work.

It is subordinate only to:

1. Master Architecture
2. Approved Architecture Decision Records
3. authoritative product and business specifications
4. Security Architecture
5. Engineering Standards

This document must remain consistent with:

- Coding Standards
- Repository Structure
- Development Workflow
- Git and Branching Strategy
- CI/CD Standards
- Code Review Guidelines
- Testing & Quality Architecture
- Deployment Architecture
- Observability Architecture
- Performance & Scalability Architecture
- Integration Architecture
- Business Continuity & Disaster Recovery Architecture
- Data Governance & Information Lifecycle Architecture
- API Design Standards
- Database Design Standards
- Event Schema Standards
- Domain Ownership Matrix
- Domain Event Catalog
- Enterprise Data Dictionary
- Enterprise Glossary
- Output Contract
- AI Operating Rules
- all approved Architecture Decision Records

No contributor, reviewer, AI assistant, automation platform, or delivery deadline may redefine “done” in a manner that conflicts with authoritative architecture or governance.

---

# Definition of Done Philosophy

The Definition of Done represents a quality boundary.

Work crossing that boundary should be suitable for its intended environment and lifecycle stage.

The Definition of Done should ensure that completed work is:

- correct
- complete
- secure
- tested
- maintainable
- observable
- supportable
- deployable
- recoverable
- traceable
- documented
- compliant
- aligned with approved architecture

Completion is not the absence of known work.

Completion is the presence of sufficient evidence that the intended work satisfies all applicable obligations.

---

# Core Completion Principles

Project Zero-Loss completion should follow these principles:

- completion must be evidence based
- quality cannot be deferred silently
- acceptance criteria must be satisfied
- architecture must remain authoritative
- business rules must remain explicit
- financial integrity must be proven
- security must be built in
- testing must reflect actual risk
- documentation must change with behavior
- observability must exist before production use
- operational ownership must be clear
- known limitations must be disclosed
- deferred work must be governed
- deployment does not automatically establish completion
- AI-generated work must satisfy the same standard as human-written work

The Definition of Done applies equally regardless of who or what produced the change.

---

# Universal Definition of Done

Unless a more restrictive standard applies, all completed work must satisfy the following universal conditions:

- the approved requirement is implemented
- acceptance criteria are satisfied
- the implementation belongs in the correct bounded context
- authoritative business rules are preserved
- code follows approved engineering and coding standards
- automated validation passes
- required tests exist and pass
- required security review is complete
- required privacy review is complete
- required code review is complete
- required documentation is updated
- required observability is implemented
- required configuration is defined
- required migration procedures are prepared
- deployment impact is understood
- rollback or forward-recovery behavior is understood
- known risks and limitations are documented
- no unresolved blocker remains
- no unauthorized exception exists
- completion evidence is traceable

A work item should not be marked complete when one or more applicable requirements remain unresolved.

# Applicability

The Definition of Done applies to:

- product features
- customer experiences
- administrative experiences
- defect corrections
- refactoring
- security changes
- privacy changes
- financial changes
- database changes
- API changes
- Domain Event changes
- infrastructure changes
- CI/CD changes
- configuration changes
- feature flags
- operational procedures
- documentation
- analytics changes
- support tooling
- migration work
- decommissioning work

Different work types may require additional completion criteria.

They may not require less than the applicable universal criteria unless an approved exception exists.

---

# Work-Item Completion

Every completed change should map to an authoritative work item, requirement, defect, incident, governance action, or approved maintenance objective.

The work item should identify:

- purpose
- owner
- scope
- acceptance criteria
- affected capability
- affected bounded context
- priority
- risk
- dependencies
- expected outcome

Untracked work should not be treated as complete merely because it was merged.

---

# Requirement Completeness

Before implementation can be considered done, the underlying requirement should be sufficiently complete.

Requirement completeness should include:

- clear problem statement
- intended user or system outcome
- acceptance criteria
- business-rule source
- scope boundaries
- excluded behavior
- known dependencies
- security implications
- data implications
- operational implications
- regulatory or compliance implications where applicable

Implementation should not be used to conceal unresolved requirement ambiguity.

---

# Acceptance Criteria Completion

All approved acceptance criteria should be:

- implemented
- tested
- reviewed
- demonstrated where applicable
- traceable to evidence

Acceptance criteria should not be marked complete based only on developer assertion.

Evidence may include:

- automated tests
- manual test results
- screenshots
- video demonstrations
- API responses
- event records
- database validation
- logs
- traces
- reconciliation results
- accessibility results
- performance results

Any acceptance criterion that remains incomplete should remain visible.

---

# Scope Completion

The delivered change should match the approved scope.

Completion review should confirm that:

- all required scope is implemented
- excluded scope remains excluded
- no unrelated behavior was added
- no required behavior was silently deferred
- scope changes were approved
- follow-up work is explicitly tracked
- implementation does not depend on undocumented future work

Partial completion should not be labeled complete unless the work item was formally divided and the delivered increment independently satisfies its own acceptance criteria.

---

# Scope Change Governance

When scope changes during implementation, the change should be documented and approved.

The record should identify:

- original scope
- revised scope
- reason for change
- affected acceptance criteria
- affected dependencies
- risk impact
- schedule impact
- approving authority

A contributor should not unilaterally remove difficult requirements and declare the remaining work done.

# Architectural Completion

A change is architecturally complete when it:

- belongs to the correct bounded context
- preserves single-context ownership
- follows approved layering
- uses approved integration patterns
- respects authoritative sources of truth
- follows approved ADRs
- avoids prohibited coupling
- avoids duplicate domain authority
- preserves contract boundaries
- updates architecture documentation where required

Local functionality does not establish architectural completion.

A change that works but violates architecture is not done.

---

# Bounded-Context Completion

A completed capability should have clear ownership.

Completion should verify that:

- the owning bounded context is identified
- owned entities are modified only by the owner
- external contexts interact through approved contracts
- shared data does not create shared write authority
- domain terminology remains consistent
- no second source of truth was created
- projections remain distinguishable from authoritative data

Cross-context behavior should include documented integration and failure expectations.

---

# Domain Ownership Completion

Every material domain object should have:

- one authoritative owner
- defined write authority
- defined read patterns
- defined integration contracts
- defined lifecycle responsibility
- defined retention responsibility
- defined audit responsibility

A change should not be marked complete when ownership remains ambiguous.

---

# Business-Rule Completion

A business-rule change is complete when:

- the rule is documented
- the rule owner is identified
- inputs are defined
- outputs are defined
- eligibility conditions are defined
- invalid conditions are defined
- state transitions are defined
- exception behavior is defined
- audit requirements are defined
- tests demonstrate expected behavior
- downstream effects are understood

Business rules should not exist solely as undocumented code behavior.

---

# Business Terminology Completion

Domain terminology used by the implementation should align with the Enterprise Glossary and authoritative product documents.

Completion should confirm that:

- names represent the intended business concept
- the same term is not used for conflicting concepts
- technical abbreviations do not obscure domain meaning
- new terms are documented
- deprecated terminology is removed or governed

Terminology inconsistency is a design defect, not merely a documentation concern.

---

# Implementation Completion

Implementation is complete when:

- all required behavior exists
- temporary behavior is removed
- debug code is removed
- placeholder logic is removed
- mock production behavior is removed
- unfinished branches are not reachable
- required errors are handled
- required validations exist
- dependencies are available
- configuration is defined
- the implementation builds successfully
- the implementation follows repository structure

A partially stubbed feature should not be called done because its primary screen renders.

# No Placeholder Completion

Completed production code should not contain unresolved placeholders such as:

- `TODO` for required behavior
- `FIXME` for known correctness defects
- hard-coded temporary values
- bypassed authorization
- fake financial data
- fake success responses
- test-only service substitutes
- disabled validation
- temporary administrative access
- untracked feature exclusions

A placeholder may remain only when:

- it does not affect required behavior
- it is documented
- it is tracked
- it is approved
- it does not create hidden risk

---

# Code Quality Completion

Completed code should:

- follow Coding Standards
- use clear names
- remain understandable
- avoid unnecessary duplication
- maintain appropriate cohesion
- limit complexity
- use approved abstractions
- handle errors intentionally
- avoid dead code
- avoid misleading comments
- support testing
- remain maintainable by another qualified contributor

Code is not complete when only the original author can safely understand or modify it.

---

# Static Validation Completion

All applicable static validation should pass.

Validation may include:

- formatting
- linting
- type checking
- compilation
- static analysis
- architecture conformance checks
- secret detection
- dependency validation
- license validation
- schema validation
- documentation validation

Warnings should not be ignored without understanding their cause and risk.

---

# Build Completion

A change is build complete when:

- the approved build process succeeds
- the build is repeatable
- required artifacts are produced
- artifact metadata is complete
- source revision is traceable
- dependency resolution is deterministic
- no local-only dependency exists
- no undocumented manual build step is required

A build that succeeds only on the author’s machine does not satisfy the Definition of Done.

---

# Repository Completion

Repository completion should confirm that:

- files are stored in approved locations
- naming conventions are followed
- generated files are handled correctly
- temporary files are excluded
- local environment files are excluded
- secrets are absent
- ownership rules are updated
- documentation indexes are updated where applicable
- repository structure remains consistent

The repository should remain usable by contributors who did not create the change.

---

# Configuration Completion

Configuration changes are complete when:

- configuration ownership is identified
- configuration schema is defined
- values are validated
- safe defaults exist
- environment-specific behavior is documented
- secrets are separated
- rollback behavior is understood
- observability exists
- configuration is version controlled where appropriate
- production values do not depend on hidden manual setup

Configuration should not silently become an ungoverned business-rule system.

# Environment Configuration Completion

Each required environment should have an approved configuration approach.

Completion should confirm behavior for applicable environments such as:

- local development
- automated testing
- integration
- staging
- production
- disaster recovery

Environment differences should be intentional and documented.

---

# Secret Management Completion

A change requiring secrets is complete only when:

- secrets are stored in an approved secret-management system
- access follows least privilege
- rotation behavior is defined
- secret names are documented
- no secret appears in source control
- no secret appears in logs
- local-development handling is defined
- failure behavior is safe
- production access is auditable

A feature requiring an undocumented manually shared secret is not done.

---

# Dependency Completion

A new or updated dependency is complete when:

- its purpose is documented
- its version is controlled
- its license is acceptable
- known vulnerabilities are evaluated
- transitive impact is understood
- maintenance status is acceptable
- build and runtime impact are understood
- replacement or removal risk is considered
- tests validate compatibility
- dependency records are updated where required

Installing a package is not the same as completing dependency governance.

---

# External Service Completion

A change depending on an external service is complete when:

- the service contract is documented
- credentials are governed
- timeouts are configured
- retries are safe
- idempotency is addressed
- rate limits are understood
- failure behavior is defined
- observability exists
- fallback or degradation behavior is defined
- ownership and support contacts are known
- legal and data-sharing obligations are addressed where applicable

A successful development request to an external service does not prove production readiness.

---

# Feature Completion

A feature is complete when the entire applicable user and system journey works.

Feature completion may require:

- entry point
- navigation
- validation
- business logic
- persistence
- authorization
- success state
- failure state
- empty state
- loading state
- retry behavior
- accessibility
- responsive behavior
- analytics
- support visibility
- documentation
- observability

A feature is not done when only the happy-path interface is implemented.

---

# User-Experience Completion

Customer-facing work should include all applicable interaction states.

These may include:

- default state
- hover state
- focus state
- active state
- disabled state
- loading state
- empty state
- validation state
- error state
- success state
- expired state
- unavailable state
- offline or degraded state

Missing states should not be left for production users to discover.

# Administrative Experience Completion

Administrative functionality is complete when it includes:

- authorization
- role restrictions
- audit logging
- safe defaults
- confirmation for destructive actions
- clear error states
- operational visibility
- reconciliation support
- support documentation
- recovery behavior

Administrative convenience must not bypass domain ownership or financial controls.

---

# Error-State Completion

A feature should define and implement expected error behavior.

Completion should address:

- invalid customer input
- unauthorized access
- unavailable dependency
- timeout
- duplicate request
- stale state
- conflict
- partial completion
- internal failure
- rate limit
- failed retry
- unrecoverable failure

Errors should be understandable to the intended audience and observable to operators.

---

# Empty-State Completion

Customer and administrative interfaces should define meaningful empty states where applicable.

An empty state should communicate:

- why no data is present
- whether the condition is expected
- what action may be taken
- whether data is still loading
- whether access is restricted
- whether a failure occurred

A blank interface is not an acceptable default empty state.

---

# Loading-State Completion

Asynchronous behavior should include loading feedback appropriate to expected duration.

Completion should prevent:

- duplicate submissions
- ambiguous progress
- accidental repeated payments
- repeated entry requests
- false success
- inaccessible progress indicators

Loading behavior should not create unauthorized assumptions about completion.

---

# Validation Completion

Validation is complete when:

- client-side validation improves usability
- server-side validation enforces authority
- types are validated
- formats are validated
- ranges are validated
- allowed values are validated
- business eligibility is validated
- malicious input is rejected safely
- error messages are appropriate
- validation behavior is tested

Client-side validation must never be treated as an authoritative security or business-rule boundary.

---

# Authorization Completion

Any protected operation is complete only when server-side authorization is implemented and tested.

Completion should verify:

- authenticated identity
- resource ownership
- role or permission
- account or tenant boundary
- administrative boundary
- least privilege
- default denial
- audit behavior
- failure response

Hiding an action in the user interface does not satisfy authorization requirements.

# Data Completion

Data behavior is complete when:

- authoritative ownership is identified
- schema is defined
- validation exists
- constraints exist where appropriate
- lifecycle is understood
- retention is defined
- deletion behavior is defined
- audit requirements are satisfied
- privacy classification is known
- recovery is possible
- projections can be rebuilt where required

A data model is not complete merely because records can be inserted.

---

# State-Transition Completion

Stateful business objects should have explicit transition rules.

Completion should define:

- permitted states
- permitted transitions
- prohibited transitions
- transition authority
- timestamps
- audit events
- retry behavior
- concurrent behavior
- recovery behavior
- terminal states

Implementation should prevent invalid state transitions rather than merely avoid presenting them in the user interface.

---

# Idempotency Completion

Operations that may be repeated are complete only when idempotency behavior is implemented and tested.

This includes, where applicable:

- payment requests
- payment callbacks
- ledger postings
- payouts
- refunds
- prize assignments
- entry creation
- message processing
- webhooks
- migration execution
- deployment steps

A retry must not create duplicate authoritative outcomes.

---

# Concurrency Completion

A change involving shared or authoritative state is complete only when concurrent behavior has been considered.

Completion should address:

- race conditions
- duplicate creation
- stale writes
- lost updates
- transaction isolation
- optimistic concurrency
- locking
- retry behavior
- ordering
- contention

Sequential test success alone does not prove concurrency safety.

---

# Transaction Completion

Transactional behavior is complete when:

- the consistency boundary is explicit
- required writes are coordinated
- partial failure is safe
- retries are safe
- external side effects are coordinated
- transaction duration is reasonable
- failure evidence is preserved
- compensation exists where necessary

A local database transaction should not be assumed to make external systems atomic.

---

# Testing Foundation

Testing is part of implementation rather than an activity performed after implementation.

Every completed change should have tests appropriate to:

- business importance
- technical complexity
- financial impact
- security impact
- privacy impact
- data impact
- integration impact
- failure risk
- regression risk

Test depth should increase with risk.

# Test Traceability

Tests should be traceable to:

- requirement
- acceptance criterion
- business rule
- defect
- security control
- failure scenario
- regression risk

A large number of tests does not compensate for failure to test the intended behavior.

---

# Test Evidence

Completion evidence may include:

- unit-test results
- integration-test results
- contract-test results
- end-to-end-test results
- migration-test results
- security-test results
- performance-test results
- accessibility-test results
- resilience-test results
- manual exploratory-test results

Required evidence should be stored or linked in an auditable location.

---

# Test Environment Completion

Tests should run in controlled environments using:

- approved configuration
- deterministic data
- isolated state
- known dependencies
- reproducible versions
- safe credentials
- appropriate cleanup

Tests that pass only in an undocumented shared environment do not provide reliable completion evidence.

---

# Defect Completion

A defect correction is complete when:

- the root cause is understood
- the defect is corrected
- a regression test exists where practical
- related behavior is evaluated
- data damage is assessed
- affected customers are identified where applicable
- remediation is performed where required
- documentation is updated
- observability is improved where appropriate

Suppressing the visible symptom without correcting the underlying defect does not establish completion.

---

# Root-Cause Completion

For material defects, completion should identify:

- immediate cause
- contributing conditions
- detection gap
- test gap
- control gap
- affected scope
- corrective action
- preventive action

A root-cause record should be proportionate to severity.

---

# Refactoring Completion

Refactoring is complete when:

- externally intended behavior remains unchanged
- tests prove preserved behavior
- architecture improves or remains compliant
- unnecessary complexity is reduced
- dead code is removed
- documentation is updated where structure changes
- performance does not regress materially
- operational visibility remains intact

A refactor should not hide unapproved product behavior changes.

# Documentation Completion

Documentation is part of the deliverable.

A change is not done when its behavior has changed but authoritative documentation still describes the previous behavior.

Applicable documentation may include:

- architecture documents
- product specifications
- capability specifications
- ADRs
- API documentation
- Domain Event schemas
- Enterprise Data Dictionary
- Enterprise Glossary
- configuration documentation
- deployment procedures
- runbooks
- support procedures
- user-facing help
- release notes

Documentation should be updated in the same controlled change whenever practical.

---

# Code Documentation Completion

Code-level documentation should exist where needed to explain:

- public contracts
- non-obvious business rules
- architectural constraints
- unusual algorithms
- security assumptions
- financial requirements
- compatibility behavior
- failure and recovery behavior

Comments should explain why a design exists rather than restating obvious syntax.

---

# Operational Documentation Completion

Production-affecting work is complete only when operators can understand and support it.

Operational documentation may include:

- ownership
- dashboards
- alerts
- known failure modes
- diagnosis procedures
- recovery procedures
- rollback procedures
- reconciliation procedures
- escalation contacts
- dependency information
- maintenance procedures

A feature without a support and recovery path may be implemented but is not operationally done.

---

# Support Readiness Foundation

Customer-impacting work should be understandable to Support.

Completion may require:

- expected behavior
- customer-facing error explanations
- known limitations
- troubleshooting steps
- escalation path
- administrative visibility
- status mapping
- refund or correction guidance where applicable

Support should not need to inspect source code to understand normal customer outcomes.

---

# Analytics Foundation

Changes affecting customer or business behavior should identify required analytics.

Completion should address:

- event purpose
- event ownership
- naming
- required properties
- data minimization
- consent
- duplication
- delivery reliability
- dashboard use
- retention

Analytics instrumentation must not become an alternative source of authoritative financial or transactional truth.

---

# Observability Foundation

Completed production behavior should be observable.

Observability may require:

- structured logs
- metrics
- traces
- audit events
- correlation identifiers
- dashboards
- alerts
- business indicators
- release markers

The required level of observability should reflect operational and business risk.

# Auditability Foundation

Changes affecting authoritative or sensitive operations should produce sufficient audit evidence.

Audit evidence may identify:

- actor
- action
- target
- previous state where appropriate
- resulting state
- timestamp
- correlation identifier
- reason
- authorization
- originating system

Audit records should be tamper resistant and should avoid unnecessary sensitive data.

---

# Deployment-Impact Foundation

Before a change can be considered done, its deployment impact should be understood.

Completion should identify:

- affected services
- affected environments
- deployment order
- migration requirements
- compatibility requirements
- feature-flag requirements
- expected downtime
- rollback constraints
- forward-recovery requirements
- operational monitoring period

“No special deployment steps” should be an explicit conclusion rather than an assumption.

---

# Recovery Foundation

Completed work should define how failures are corrected.

Recovery may include:

- automatic retry
- manual retry
- rollback
- feature disablement
- compensating transaction
- projection rebuild
- data repair
- infrastructure restoration
- forward recovery

Recovery behavior should preserve authoritative history and auditability.

---

# Known-Limitation Completion

Known limitations should be documented before completion.

A limitation record should identify:

- behavior
- affected users or systems
- risk
- workaround
- owner
- expected resolution
- whether it is accepted permanently or temporarily

A hidden limitation is an incomplete requirement.

---

# Technical-Debt Identification

A change may create or expose technical debt.

Technical debt should be documented when it is:

- intentionally accepted
- operationally meaningful
- security relevant
- financially relevant
- likely to affect scalability
- likely to affect maintainability
- likely to affect future delivery

Technical debt should not be used as a label for unfinished required behavior.

---

# Deferred Work

Work may be deferred only when:

- the delivered increment is independently safe
- applicable acceptance criteria remain satisfied
- the deferral does not hide a blocker
- the deferred item is documented
- an owner is assigned
- priority is recorded
- risk is accepted
- dependencies are understood

Deferred work must not be represented as completed work.

# No Silent Deferral

The following should never be silently deferred:

- authorization
- financial integrity
- data protection
- required validation
- critical tests
- required audit logging
- required recovery
- destructive-migration safety
- known ledger inconsistency
- known duplicate-payment risk
- known winner or prize-assignment defect

Schedule pressure does not convert mandatory safety work into optional work.

---

# Completion Review

Before a work item is closed, the accountable owner should perform a completion review.

The review should confirm:

- scope
- acceptance criteria
- architecture
- business rules
- implementation
- tests
- security
- privacy
- data
- documentation
- observability
- operations
- deployment
- recovery
- evidence
- unresolved risks

The completion review may be integrated with Pull Request, release, or work-management processes, but its responsibilities must remain explicit.

---

# Completion Authority

The person who implemented a change should not be the sole authority declaring high-risk work complete.

Completion authority may require participation from:

- Product Owner
- bounded-context owner
- qualified reviewer
- Quality Engineering
- Security Engineering
- financial-integrity owner
- Database Engineering
- Release Engineering
- Operations

Required participation should reflect risk.

---

# Definition of Ready Relationship

The Definition of Ready determines whether work is sufficiently understood to begin.

The Definition of Done determines whether the completed work satisfies all obligations.

A work item may begin with uncertainty, but unresolved material uncertainty must not remain hidden at completion.

The Definition of Ready and Definition of Done should reinforce one another.

---

# Release Completion Relationship

A work item may be implementation complete before it is released.

A release may be deployed before its production verification period is complete.

The organization should distinguish between:

- implementation complete
- review complete
- merge complete
- release ready
- deployed
- production verified
- fully complete

Status names should not create false confidence.

---

# Completion Statuses

Approved lifecycle statuses may include:

- planned
- ready
- in progress
- in review
- validation required
- release ready
- deployed
- production verification
- done
- blocked
- deferred
- cancelled

“Done” should be reserved for work that satisfies the applicable Definition of Done.

# Evidence-Based Completion

Claims of completion should be supported by evidence.

Statements such as the following are insufficient on their own:

- “It works for me.”
- “The AI said it is correct.”
- “The tests are green.”
- “The page looks done.”
- “The code was merged.”
- “The deployment succeeded.”
- “We can fix the rest later.”

Evidence should be proportionate to the risk of being wrong.

---

# AI-Assisted Completion

AI assistants may support completion evaluation by:

- comparing changes against acceptance criteria
- identifying missing requirements
- producing completion checklists
- detecting missing tests
- detecting documentation drift
- identifying architectural conflicts
- identifying possible security or privacy gaps
- summarizing completion evidence
- identifying untracked deferred work
- preparing release-readiness summaries

AI output must be verified against authoritative project documentation and actual implementation evidence.

---

# AI-Generated Work Completion

Work generated wholly or partially by AI is complete only when:

- an accountable owner understands it
- authoritative requirements are satisfied
- architecture is preserved
- tests validate behavior
- security is evaluated
- financial integrity is evaluated where applicable
- generated dependencies are reviewed
- documentation is updated
- operational behavior is understood
- required human reviews are complete

AI generation speed does not reduce completion obligations.

---

# AI Completion Limitations

AI assistants may fail to identify:

- hidden business rules
- cross-context ownership violations
- financial edge cases
- concurrency failures
- subtle authorization defects
- compliance obligations
- operational dependencies
- incomplete acceptance criteria
- production-only behavior
- undocumented organizational requirements

AI confidence should never be treated as completion evidence.

---

# AI Implementation Rules

AI-generated Definition-of-Done guidance, checklists, completion assessments, and implementation output must:

- apply the same completion standard to human-generated, AI-generated, vendor-generated, and automation-generated work
- require traceability from requirement and acceptance criteria through implementation, testing, review, release, and completion evidence
- verify that the change belongs to the correct bounded context and preserves single-context ownership
- preserve the authoritative ledger as the financial source of truth
- preserve wallet balances as rebuildable projections derived from authoritative financial records
- preserve Pools & Sweepstakes ownership of Pools, Sweepstakes, Entry Requests, Entry Locks, Entries, Draws, Winners, and Prize Assignments
- require server-side enforcement of business rules, authorization, eligibility, financial controls, fraud controls, and state transitions
- require all applicable happy, failure, empty, loading, duplicate, retry, concurrency, timeout, and recovery states
- require static validation, automated tests, review evidence, documentation, observability, deployment analysis, and recovery planning
- prevent placeholders, debug behavior, fake authoritative data, temporary security bypasses, untracked TODOs, and incomplete required behavior from being represented as done
- require explicit governance for dependencies, configuration, external services, secrets, data ownership, retention, auditability, and lifecycle behavior
- distinguish implementation complete, review complete, release ready, deployed, production verified, and fully done
- prevent unresolved blockers, critical security findings, financial-integrity uncertainty, authorization gaps, unsafe migrations, or untraceable authoritative behavior from being deferred
- require known limitations and technical debt to be documented, owned, risk assessed, and tracked
- require objective evidence rather than assertions, AI confidence, visual appearance, successful merge, or successful deployment
- prevent AI from independently declaring high-risk work complete
- keep final completion accountability with qualified humans and explicitly authorized governance automation
- remain fully aligned with the Master Architecture, Engineering Standards, Coding Standards, Repository Structure, Development Workflow, Git and Branching Strategy, CI/CD Standards, Code Review Guidelines, Domain Ownership Matrix, Domain Event Catalog, Enterprise Data Dictionary, API Design Standards, Database Design Standards, Event Schema Standards, Security Architecture, Integration Architecture, Observability Architecture, Deployment Architecture, Performance & Scalability Architecture, Testing & Quality Architecture, Business Continuity & Disaster Recovery Architecture, Data Governance & Information Lifecycle Architecture, Enterprise Glossary, Output Contract, AI Operating Rules, and all approved Architecture Decision Records.

---

# Technical and Quality Completion

---

# Technical Completion Purpose

Technical completion ensures that a feature or change is not only implemented but is also technically correct, secure, resilient, observable, maintainable, and ready for long-term operation.

Technical completion extends beyond writing code.

A technically complete implementation has been validated across all applicable engineering disciplines.

# Technical Completion Principles

Every completed implementation should satisfy the applicable technical expectations for:

- correctness
- maintainability
- reliability
- security
- scalability
- observability
- resilience
- portability
- operability
- recoverability

Technical shortcuts that undermine these principles should not be considered complete.

---

# Correctness Completion

Correctness means the implementation behaves exactly as defined by the approved requirements and business rules.

Completion should verify:

- expected behavior
- edge-case behavior
- failure behavior
- state transitions
- deterministic outcomes
- business-rule compliance
- financial accuracy where applicable
- data consistency
- API contract compliance
- event contract compliance

Behavior that is merely "close enough" is not considered correct.

---

# Maintainability Completion

A technically complete implementation should remain understandable and maintainable over time.

Completion should verify:

- readable code
- consistent naming
- modular structure
- appropriate abstraction
- minimal duplication
- clear ownership
- bounded complexity
- appropriate documentation
- predictable organization

Future maintainability is a quality attribute rather than optional cleanup.

---

# Reliability Completion

Reliable systems behave consistently under expected operating conditions.

Completion should evaluate:

- repeated execution
- dependency failures
- restart behavior
- transient failures
- timeout handling
- retry behavior
- network interruptions
- partial infrastructure failures
- degraded service operation

Reliability should be demonstrated through testing or engineering evidence appropriate to the associated risk.

---

# Performance Completion

Performance completion should confirm that the implementation satisfies expected responsiveness and resource utilization goals.

Evaluation may include:

- response latency
- throughput
- memory usage
- CPU utilization
- storage utilization
- database efficiency
- caching behavior
- event-processing throughput
- startup time
- recovery time

Performance expectations should be defined relative to documented system objectives rather than subjective perception.

---

# Scalability Completion

Scalability considers how the implementation behaves as workload increases.

Completion should evaluate:

- user growth
- transaction growth
- event growth
- catalog growth
- concurrent requests
- storage growth
- queue growth
- reporting growth
- administrative growth

Scalability planning should be proportional to the expected production workload.

# Resilience Completion

Resilient systems continue operating safely despite failures.

Completion should evaluate:

- dependency failures
- infrastructure failures
- service degradation
- retry exhaustion
- circuit-breaker behavior
- failover behavior
- queue backlogs
- partial outages
- recovery after interruption
- graceful degradation

Resilience should prioritize preservation of authoritative business data over uninterrupted user experience.

---

# Availability Completion

Availability expectations should reflect the importance of the capability.

Completion should evaluate:

- service uptime
- maintenance behavior
- deployment impact
- dependency availability
- health monitoring
- readiness checks
- liveness checks
- automatic recovery
- operational alerting

Availability objectives should be documented where operationally significant.

---

# Recoverability Completion

Recoverability confirms that the system can safely return to normal operation after failure.

Completion should verify:

- backup procedures
- restore procedures
- rollback capability
- forward recovery
- replay capability
- reconciliation procedures
- disaster recovery compatibility
- audit preservation
- data integrity after recovery

Recovery should preserve authoritative business history.

---

# Security Completion

Security completion requires that the implementation satisfies applicable security requirements before release.

Completion should evaluate:

- authentication
- authorization
- input validation
- output encoding
- encryption
- secret protection
- secure configuration
- dependency security
- vulnerability assessment
- audit logging

Known critical security weaknesses prevent completion.

---

# Privacy Completion

Privacy completion confirms that personal information is handled appropriately.

Completion should verify:

- lawful processing
- data minimization
- consent where applicable
- retention compliance
- deletion behavior
- access controls
- auditability
- disclosure controls
- cross-system consistency

Privacy obligations should be considered throughout the implementation rather than added after development.

---

# Compliance Completion

Where regulatory or contractual obligations apply, completion should verify compliance with applicable requirements.

Examples may include:

- financial controls
- privacy regulations
- accessibility requirements
- contractual obligations
- audit requirements
- records management
- data retention
- operational governance

Compliance should be supported by objective evidence rather than assumption.

# Accessibility Completion

Accessibility completion confirms that applicable users can successfully use the implemented capability.

Completion should evaluate:

- keyboard navigation
- screen-reader compatibility
- semantic structure
- focus management
- color contrast
- text scaling
- alternative text
- accessible error messaging
- accessible forms
- consistent interaction behavior

Accessibility should be incorporated during implementation rather than treated as post-release enhancement work.

---

# Internationalization Completion

Where internationalization is supported, completion should verify:

- externalized text
- locale-aware formatting
- date handling
- time-zone handling
- number formatting
- currency formatting
- language switching
- Unicode compatibility
- character encoding
- layout adaptability

Internationalization should avoid assumptions about language, locale, or regional formatting.

---

# Data Integrity Completion

Data integrity confirms that stored information remains accurate, complete, and internally consistent.

Completion should evaluate:

- referential integrity
- uniqueness constraints
- validation rules
- duplicate prevention
- reconciliation capability
- migration integrity
- rollback safety
- audit preservation
- authoritative ownership
- consistency across projections

Authoritative data should never become inconsistent because of incomplete implementation.

---

# Database Completion

Database-related work is complete only when:

- schema changes are validated
- migrations are repeatable
- migrations are reversible where appropriate
- indexes are appropriate
- constraints are enforced
- performance implications are evaluated
- backups remain compatible
- rollback strategy is documented
- production compatibility is verified

Database changes should preserve historical and financial integrity.

---

# API Completion

API implementations should satisfy all approved interface requirements.

Completion should verify:

- contract compliance
- version compatibility
- request validation
- response validation
- error handling
- authentication
- authorization
- idempotency where applicable
- pagination where applicable
- documentation accuracy

Published APIs become long-term contracts and should be treated accordingly.

---

# Event Completion

Domain Events are complete when they accurately communicate authoritative business facts.

Completion should verify:

- correct event ownership
- correct event naming
- complete payload
- schema validation
- version compatibility
- publication timing
- ordering expectations
- replay compatibility
- consumer compatibility
- documentation updates

Events should describe completed business facts rather than implementation details.

# Integration Completion

Integrations are complete when communication with external systems is reliable, secure, observable, and consistent with approved contracts.

Completion should verify:

- contract compatibility
- authentication
- authorization
- timeout handling
- retry behavior
- idempotency where applicable
- duplicate-message handling
- error mapping
- monitoring
- operational documentation

Integration completion should account for partial failures, unavailable dependencies, and version compatibility.

---

# Configuration Completion

Configuration-driven behavior is complete when configuration is:

- documented
- validated
- version controlled where appropriate
- environment appropriate
- secure
- observable
- recoverable
- compatible across deployments
- free from hidden defaults

Configuration should not require undocumented manual intervention.

---

# Feature Flag Completion

Feature-flagged implementations are complete only when:

- flag ownership is defined
- default behavior is documented
- rollout strategy is documented
- rollback strategy exists
- monitoring is in place
- dependencies are understood
- testing covers enabled and disabled states
- eventual flag removal is planned

Feature flags are deployment tools rather than permanent architecture.

---

# Logging Completion

Logging should provide sufficient operational insight without exposing sensitive information.

Completion should verify:

- structured logging
- meaningful log levels
- correlation identifiers
- actionable messages
- security awareness
- privacy protection
- appropriate retention
- operational usefulness

Logs should support diagnosis without becoming the authoritative record of business transactions.

---

# Monitoring Completion

Monitoring should detect significant operational issues before they materially affect customers.

Completion should verify:

- health metrics
- business metrics
- alert thresholds
- dashboard availability
- dependency monitoring
- infrastructure monitoring
- application monitoring
- operational ownership
- escalation paths

Monitoring should focus on actionable signals rather than excessive noise.

---

# Alerting Completion

Alerting is complete when operational teams can respond appropriately to meaningful failures.

Completion should verify:

- alert ownership
- severity classification
- actionable guidance
- notification routing
- duplicate suppression
- recovery notification
- documentation links
- escalation procedures
- alert testing where appropriate

Alerts should communicate operational problems that require attention rather than expected system behavior.

# Capacity Completion

Operational capacity should be sufficient for expected production demand.

Completion should evaluate:

- compute capacity
- storage capacity
- database capacity
- queue capacity
- network capacity
- cache capacity
- third-party service limits
- rate limits
- operational headroom

Capacity planning should reflect documented workload expectations.

---

# Resource Utilization Completion

Resource utilization should remain within acceptable operational limits.

Completion may evaluate:

- CPU usage
- memory usage
- storage consumption
- database connections
- thread utilization
- queue utilization
- network bandwidth
- file descriptor usage
- container resource limits

Resource exhaustion should be identified before production deployment whenever practical.

---

# Backup Completion

Systems responsible for authoritative or operationally important data should have verified backup procedures.

Completion should verify:

- backup frequency
- backup integrity
- backup encryption
- retention policy
- restoration testing
- ownership
- monitoring
- documentation
- recovery objectives

Backups that have never been tested do not provide sufficient recovery assurance.

---

# Disaster Recovery Completion

Disaster recovery readiness should be appropriate to the business impact of the capability.

Completion should evaluate:

- recovery objectives
- recovery procedures
- infrastructure restoration
- database restoration
- service dependencies
- communication procedures
- operational responsibilities
- verification testing
- documentation currency

Disaster recovery planning should prioritize restoration of authoritative systems.

---

# Business Continuity Completion

Business continuity planning should ensure that critical operations can continue during significant disruptions.

Completion should verify:

- critical process identification
- operational priorities
- manual procedures where applicable
- dependency analysis
- communication plans
- escalation responsibilities
- continuity testing
- recovery documentation
- ownership

Business continuity should address both technical and operational interruptions.

---

# Operational Ownership Completion

Every production capability should have clearly identified ownership.

Completion should identify:

- business owner
- technical owner
- operational owner
- support owner
- security owner where applicable
- data owner where applicable
- escalation path
- maintenance responsibility
- lifecycle responsibility

Unowned production systems are not considered operationally complete.

# Lifecycle Completion

Every implemented capability should have an understood operational lifecycle.

Completion should identify:

- creation
- activation
- modification
- suspension
- archival
- restoration where applicable
- deletion
- retention
- disposal

Lifecycle behavior should align with enterprise governance and data-retention requirements.

---

# Change Management Completion

Production-impacting work should follow approved change-management practices.

Completion should verify:

- change documentation
- implementation plan
- deployment approval where required
- rollback plan
- communication plan
- risk assessment
- dependency review
- operational readiness
- post-deployment verification

Emergency changes should follow documented emergency procedures.

---

# Release Communication Completion

Customer-impacting releases should include appropriate communication.

Completion may require:

- release notes
- customer notifications where applicable
- operational announcements
- support guidance
- known limitations
- deployment schedule
- maintenance notifications
- documentation updates
- ownership information

Communication should accurately represent the scope and impact of the release.

---

# Post-Deployment Verification

Deployment alone does not establish successful completion.

Completion should verify:

- service availability
- health indicators
- business metrics
- error rates
- operational dashboards
- critical workflows
- financial workflows where applicable
- event processing
- audit generation

Post-deployment verification should occur before declaring production success.

---

# Production Acceptance

Production acceptance confirms that the deployed implementation performs correctly under real operating conditions.

Acceptance should evaluate:

- customer experience
- operational stability
- business outcomes
- financial integrity
- security posture
- performance
- reliability
- observability
- support readiness

Production acceptance may require a defined observation period for high-risk changes.

---

# Continuous Improvement

Completion should contribute to long-term engineering improvement.

Where appropriate, teams should record:

- lessons learned
- recurring issues
- process improvements
- documentation improvements
- testing improvements
- automation opportunities
- architectural improvements
- operational improvements
- training needs

A completed implementation should leave the platform in an equal or better state than before the work began.

# Organizational Learning

Completed work should strengthen organizational knowledge rather than remain isolated within a single implementation.

Completion should encourage:

- documentation improvements
- architectural refinements
- reusable patterns
- shared implementation guidance
- operational playbooks
- knowledge sharing
- onboarding improvements
- engineering standards updates
- governance improvements

Lessons learned should become part of the organization's authoritative knowledge where appropriate.

---

# Definition of Done Governance

The Definition of Done is a governed engineering standard.

Changes to this document should:

- follow approved governance procedures
- be reviewed by appropriate technical leadership
- preserve architectural consistency
- remain compatible with approved standards
- avoid conflicting guidance
- maintain traceability
- document rationale for significant changes
- be version controlled
- be communicated to affected teams

The Definition of Done should evolve intentionally rather than through ad hoc modifications.

---

# Exception Governance

Exceptions to the Definition of Done should be rare and explicitly approved.

An approved exception should document:

- affected work
- reason
- business justification
- associated risks
- compensating controls
- approving authority
- expiration date where applicable
- required follow-up actions

An undocumented exception is not an approved exception.

---

# Periodic Review

The Definition of Done should be reviewed periodically to ensure continued effectiveness.

Reviews should consider:

- architectural evolution
- technology changes
- regulatory changes
- operational experience
- recurring production incidents
- audit findings
- security findings
- engineering feedback
- product evolution

Periodic review helps ensure that completion standards remain aligned with organizational needs.

---

# Final Principle

The Definition of Done exists to protect product quality, customer trust, financial integrity, operational excellence, and long-term maintainability.

Completion is not determined by effort invested, code written, stories closed, deployments completed, or AI-generated output.

Completion is determined by objective evidence that all applicable functional, technical, operational, architectural, security, financial, governance, and quality obligations have been satisfied.

Every implementation should leave the platform more reliable, more understandable, more maintainable, and more trustworthy than it was before the work began.

---

# End of Document

This document is complete.

This document is complete.

There are no additional sections beyond Part 19.

