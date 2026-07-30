# Project Zero-Loss

# Git and Branching Strategy

**Document Path:** `docs/engineering/git-and-branching-strategy.md`  
**Document Type:** Enterprise Engineering Standard  
**Version:** 1.0  
**Status:** Authoritative  
**Authority Level:** Engineering Governance  
**Owner:** Architecture Governance & Engineering Leadership  
**Applies To:** All Source-Control Activities, Human Engineers, AI Assistants, Third-Party Contributors, Automation Systems, Build Pipelines, and Release Processes  
**Last Updated:** July 2026

---

# Document Purpose

The Git and Branching Strategy defines the authoritative source-control practices for Project Zero-Loss.

Its purpose is to ensure every code, infrastructure, configuration, documentation, and automation change remains:

- traceable
- reviewable
- recoverable
- auditable
- secure
- aligned with the approved development workflow

A disciplined Git strategy protects repository integrity and enables reliable collaboration across human and AI contributors.

Every repository contribution must comply with this document.

---

# Architectural Authority

This document governs how changes are created, recorded, reviewed, merged, and maintained within the Project Zero-Loss repository.

It is subordinate only to:

1. Master Architecture
2. Approved Architecture Decision Records (ADRs)
3. Engineering Standards

This document complements:

- Coding Standards
- Repository Structure
- Development Workflow
- Testing & Quality Architecture
- Deployment Architecture
- Security Architecture
- Output Contract
- AI Operating Rules

Git practices must remain aligned with enterprise architecture and engineering governance.

---

# Source-Control Philosophy

Git is the authoritative historical record of repository change.

Source control should provide:

- complete change history
- clear authorship
- safe collaboration
- controlled integration
- reliable recovery
- release traceability
- production auditability

Git should never be treated only as file storage.

---

# Git Principles

All contributors should follow these principles:

- Commit complete, logical units of work.
- Keep branches focused on one purpose.
- Preserve a clean and understandable history.
- Review changes before integration.
- Protect production-ready branches.
- Avoid committing generated or sensitive files.
- Prefer reversible changes.
- Maintain traceability from requirement to release.

Repository history should explain how and why the platform evolved.

---

# Repository as the Source of Truth

The Git repository is the authoritative source for:

- application code
- infrastructure definitions
- database migrations
- automation
- configuration templates
- engineering documentation
- release metadata

Uncommitted or externally maintained implementations should not be treated as production-authoritative.

---

# Repository Protection

The repository should enforce protections that prevent accidental or unauthorized changes.

Controls should include:

- protected primary branches
- required Pull Requests
- required status checks
- review approval requirements
- restricted force pushes
- restricted branch deletion
- secret detection
- signed or verified changes where required

Repository protection should be automated whenever practical.

---

# Primary Branch

The primary branch should be named:

```text
main
```

The `main` branch represents the current approved and deployable state of the platform.

The `main` branch should remain:

- stable
- tested
- reviewed
- releasable
- protected

Direct development on `main` is prohibited.

---

# Main Branch Expectations

Every commit merged into `main` should:

- satisfy acceptance criteria
- pass automated testing
- pass security checks
- meet coding standards
- include required documentation
- be approved through Pull Request review

A broken `main` branch should be treated as a high-priority engineering incident.

---

# Branching Model

Project Zero-Loss uses a short-lived, Pull Request-based branching model.

Work should branch from the latest approved `main` branch and return through a reviewed Pull Request.

Typical flow:

```text
main
  │
  ├── feature/customer-notifications
  │
  └── Pull Request
          │
          └── main
```

Long-lived parallel development branches should be avoided.

---

# Branch Types

Approved branch types include:

- `feature`
- `bugfix`
- `hotfix`
- `refactor`
- `security`
- `infrastructure`
- `documentation`
- `chore`
- `release`

Each branch should represent one clear and traceable objective.

---

# Feature Branches

Feature branches support new customer, business, administrative, or platform functionality.

Example:

```text
feature/customer-notification-preferences
```

Feature branches should remain focused on one approved feature or work item.

---

# Bug-Fix Branches

Bug-fix branches address defects that have not yet required an emergency production release.

Example:

```text
bugfix/duplicate-entry-validation
```

Bug fixes should include regression tests whenever practical.

---

# Hotfix Branches

Hotfix branches address critical production issues requiring expedited delivery.

Example:

```text
hotfix/payment-ledger-posting-failure
```

Hotfixes should remain narrowly scoped and fully traceable.

---

# Refactoring Branches

Refactoring branches improve internal implementation without intentionally changing business behavior.

Example:

```text
refactor/catalog-query-handler
```

Refactoring should preserve existing externally observable behavior and include appropriate test coverage.

---

# Security Branches

Security branches address vulnerabilities, hardening, or security-control improvements.

Example:

```text
security/session-token-rotation
```

Security branch names should avoid exposing sensitive vulnerability details when the repository is visible beyond the authorized engineering team.

---

# Infrastructure Branches

Infrastructure branches contain changes to platform, deployment, cloud, networking, monitoring, or Infrastructure as Code.

Example:

```text
infrastructure/staging-observability
```

Infrastructure changes should include validation and rollback planning.

---

# Documentation Branches

Documentation branches contain documentation-only changes.

Example:

```text
documentation/git-branching-standard
```

Documentation should follow the same review and quality expectations as source code.

---

# Chore Branches

Chore branches support maintenance work that does not directly change business behavior.

Examples include:

- tooling updates
- formatting configuration
- build maintenance
- repository cleanup
- dependency metadata

Example:

```text
chore/update-lint-configuration
```

The `chore` category should not become a generic substitute for unclear work.

---

# Release Branches

Release branches may be used only when a coordinated stabilization period is required.

Example:

```text
release/1.4.0
```

Release branches should remain short-lived and should not become permanent development lines.

Routine releases should prefer direct promotion from approved `main` artifacts.

---

# Branch Naming Standards

Branch names should follow this structure:

```text
<type>/<concise-description>
```

Example:

```text
feature/wishlist-category-alerts
```

Where supported, a traceable work-item identifier may be included:

```text
feature/ZL-142-wishlist-category-alerts
```

Branch names should be:

- lowercase
- descriptive
- concise
- hyphen-separated
- free from spaces
- aligned with the Enterprise Glossary

---

# Prohibited Branch Names

Avoid names such as:

```text
test
changes
work
fix
temp
new
branch1
stuff
final
final-final
```

Ambiguous branch names reduce traceability and repository clarity.

---

# Branch Scope

Every branch should contain one logical unit of work.

A branch should not combine unrelated:

- features
- bug fixes
- refactoring
- infrastructure changes
- documentation changes

Unrelated work should be separated into independent branches and Pull Requests.

---

# Branch Lifetime

Branches should remain short-lived.

Contributors should:

- integrate changes frequently
- keep branches synchronized with `main`
- avoid prolonged divergence
- close or remove abandoned branches

Short-lived branches reduce conflicts and integration risk.

---

# Commit Philosophy

A commit should represent one understandable and reviewable change.

Each commit should:

- have a clear purpose
- preserve repository integrity
- avoid unrelated modifications
- support review and rollback
- include tests when behavior changes

Commits should tell a coherent engineering story.

---

# Atomic Commits

Commits should be atomic whenever practical.

An atomic commit:

- performs one logical change
- does not mix unrelated concerns
- leaves the repository in a valid state
- can be reverted without removing unrelated work

Large, mixed-purpose commits should be avoided.

---

# Commit Frequency

Contributors should commit at meaningful implementation checkpoints.

Commits should not be:

- so large that review becomes difficult
- so small that history becomes meaningless
- used as raw backup snapshots
- filled with broken intermediate states

Commit frequency should support clarity and recoverability.

---

# Commit Message Standard

Commit messages should follow this structure:

```text
<type>(<scope>): <summary>
```

Examples:

```text
feat(notifications): add category subscription preferences
fix(ledger): prevent duplicate transaction posting
refactor(catalog): simplify search ranking policy
docs(engineering): define Git branching strategy
```

The scope should identify the affected bounded context, application, package, infrastructure area, or documentation domain.

---

# Approved Commit Types

Preferred commit types include:

| Type | Purpose |
|---|---|
| `feat` | New functionality |
| `fix` | Defect correction |
| `refactor` | Internal restructuring without intended behavior change |
| `security` | Security improvement or vulnerability remediation |
| `perf` | Performance improvement |
| `test` | Test additions or corrections |
| `docs` | Documentation-only change |
| `build` | Build-system change |
| `ci` | CI/CD configuration change |
| `infra` | Infrastructure change |
| `chore` | Repository or tooling maintenance |
| `revert` | Reversal of an earlier change |

Commit types should be used consistently.

---

# Commit Summary

The first line of a commit message should:

- clearly describe the change
- use the imperative mood
- remain concise
- avoid unnecessary punctuation
- avoid vague language

Preferred:

```text
fix(wallet): derive available balance from posted ledger entries
```

Avoid:

```text
made some wallet changes
```

---

# Commit Body

A commit body should be added when the reason or impact is not obvious.

The body may explain:

- why the change was necessary
- the business or architectural context
- important implementation tradeoffs
- migration or compatibility impact
- known limitations

The body should explain intent rather than repeat the code.

---

# Commit Traceability

Where a work-item tracking system exists, commits should reference the relevant identifier.

Example:

```text
Refs: ZL-142
```

Traceability should connect:

```text
Requirement
    ↓
Work Item
    ↓
Branch
    ↓
Commit
    ↓
Pull Request
    ↓
Release
```

This chain supports auditability and operational investigation.

---

# Definition of a Good Commit

A good commit:

- has one clear purpose
- uses a compliant message
- preserves build integrity
- includes appropriate tests
- avoids sensitive information
- contains no unrelated formatting noise
- can be reviewed independently
- can be reverted safely

Commit quality directly affects repository maintainability.

---

# Sensitive Information

Sensitive information must never be committed.

Prohibited content includes:

- passwords
- private keys
- production secrets
- access tokens
- unredacted customer data
- payment credentials
- confidential security findings

If sensitive information is committed, credential rotation and incident procedures should begin immediately. Removing the file in a later commit is not sufficient because Git history may retain the exposed value.

---

# Generated Files

Generated files should not be committed unless required for an approved build, deployment, distribution, or compliance purpose.

Examples commonly excluded include:

```text
node_modules/
dist/
build/
coverage/
temporary files
local environment files
```

Repository ignore rules should remain centrally maintained.

---

# Author Identity

Every commit should use an identifiable and authorized contributor identity.

Shared, anonymous, or misleading identities should not be used.

AI-assisted changes must remain attributable to the human or approved automation account responsible for the contribution.

---

# AI-Assisted Git Usage

AI assistants may support Git activities by:

- proposing branch names
- organizing changes into logical commits
- drafting commit messages
- identifying unrelated file changes
- preparing Pull Request summaries
- highlighting merge risks

AI should not execute destructive or irreversible Git operations without explicit authorization.

---

# AI Implementation Rules

AI-generated Git guidance and repository changes must:

- treat `main` as the protected, stable, and deployable primary branch
- create short-lived branches from the latest approved `main`
- use only approved branch categories and descriptive naming conventions
- keep each branch focused on one logical work item
- propose atomic commits that preserve repository integrity
- use the approved `<type>(<scope>): <summary>` commit-message format
- connect commits and branches to the relevant work item where identifiers exist
- prevent secrets, customer data, credentials, and unauthorized generated artifacts from entering Git history
- avoid force pushes, history rewriting, direct `main` changes, and destructive Git operations unless explicitly authorized under an approved recovery procedure
- preserve traceability across requirements, branches, commits, Pull Requests, and releases
- remain fully aligned with the Master Architecture, Engineering Standards, Coding Standards, Repository Structure, Development Workflow, Security Architecture, Enterprise Glossary, and all approved Architecture Decision Records (ADRs).

---

# Branch Workflow

---

# Branch Workflow Philosophy

Branches isolate work so changes can be developed, tested, reviewed, and integrated without destabilizing the approved codebase.

Every branch should:

- represent one logical work item
- originate from an approved base
- remain short-lived
- receive continuous validation
- return through a reviewed Pull Request
- be deleted after successful integration

Branches are temporary delivery mechanisms, not permanent ownership boundaries.

# Standard Branch Workflow

The standard branch workflow is:

```text
Update local main
      ↓
Create focused branch
      ↓
Implement incrementally
      ↓
Commit logical changes
      ↓
Push branch
      ↓
Open Pull Request
      ↓
Complete review and validation
      ↓
Merge into main
      ↓
Delete branch
```

Every routine change should follow this flow unless an approved exception applies.

---

# Branch Creation

New branches should originate from the latest approved `main` branch.

Recommended sequence:

```bash
git switch main
git pull --ff-only
git switch -c feature/customer-notification-preferences
```

The branch should be created only after confirming that the local `main` branch is current.

Branches should not originate from:

- stale local branches
- unrelated feature branches
- unapproved release branches
- temporary experimental branches
- detached commits

Branch ancestry should remain clear and traceable.

---

# Base Branch Selection

The default base branch for routine work is:

```text
main
```

Exceptions may include:

- a critical hotfix branch derived from a production tag
- an approved release branch
- a dependent branch explicitly coordinated through Engineering Leadership

Branching from another work branch should be avoided because it creates hidden dependencies and complicates review.

---

# Feature Branch Workflow

Feature branches support approved new functionality.

The workflow should include:

1. Confirm the work item satisfies the Definition of Ready.
2. Update the local `main` branch.
3. Create a branch using the `feature/` prefix.
4. Implement the smallest functional increment.
5. Add or update automated tests.
6. Update relevant documentation.
7. Push the branch regularly.
8. Open a Pull Request.
9. Resolve review and quality findings.
10. Merge only after all requirements pass.

Example:

```text
feature/ZL-142-category-subscription-alerts
```

Feature branches should not contain unrelated maintenance or refactoring unless those changes are essential to the feature and clearly documented.

---

# Bug-Fix Branch Workflow

Bug-fix branches correct non-emergency defects.

The workflow should include:

1. Reproduce the defect.
2. Document expected and actual behavior.
3. Identify the root cause.
4. Create a `bugfix/` branch from the latest `main`.
5. Add a failing regression test where practical.
6. Implement the correction.
7. Verify that the regression test passes.
8. Execute related test suites.
9. Open a Pull Request with root-cause details.
10. Merge after approval and validation.

Example:

```text
bugfix/ZL-219-duplicate-entry-confirmation
```

Bug fixes should address the underlying defect rather than suppressing symptoms.

# Hotfix Branch Workflow

Hotfix branches address critical production incidents requiring expedited delivery.

Examples include:

- financial integrity failures
- security vulnerabilities
- customer access outages
- widespread transaction failures
- severe data corruption risks

A hotfix branch should be created from the exact production state, typically the current production tag or approved production commit.

Example:

```text
hotfix/ZL-301-ledger-idempotency-failure
```

The hotfix workflow should include:

1. Confirm incident severity and authority.
2. Identify the current production version.
3. Create the branch from the production tag or commit.
4. Limit changes to the smallest safe correction.
5. Add focused automated tests.
6. Complete expedited peer review.
7. Execute mandatory security and financial-integrity checks.
8. Deploy through the approved emergency release process.
9. Verify production recovery.
10. Merge the correction back into `main`.
11. Update any active release branch where required.
12. Document the incident and follow-up work.

Emergency speed does not eliminate traceability, review, or testing requirements.

---

# Security Branch Workflow

Security branches should be handled with appropriate confidentiality and priority.

The workflow should include:

- restricted issue visibility where necessary
- minimal disclosure in branch names
- focused implementation
- security review
- vulnerability validation
- credential rotation where applicable
- coordinated release planning

Avoid branch names that expose exploitable details.

Preferred:

```text
security/ZL-412-session-hardening
```

Avoid:

```text
security/admin-token-bypass-exploit
```

Security changes should be merged and released according to the severity of the risk.

---

# Infrastructure Branch Workflow

Infrastructure branches should follow the same review discipline as application code.

The workflow should include:

1. Define the intended infrastructure change.
2. Identify affected environments.
3. Create an `infrastructure/` branch.
4. Update Infrastructure as Code.
5. Validate formatting and syntax.
6. Generate and review the infrastructure plan.
7. Assess security and cost impact.
8. Document rollback procedures.
9. Open a Pull Request.
10. Apply changes only through approved automation.

Example:

```text
infrastructure/ZL-488-production-alert-routing
```

Direct manual changes to production infrastructure should be prohibited except under documented emergency procedures.

---

# Documentation Branch Workflow

Documentation-only changes should use the `documentation/` branch type.

The workflow should include:

- confirm the authoritative document location
- update all affected cross-references
- preserve established terminology
- validate formatting
- review architectural consistency
- merge through a Pull Request

Example:

```text
documentation/ZL-503-release-management-standard
```

Documentation changes may still require Architecture Governance review when they alter an authoritative rule or decision.

# Refactoring Branch Workflow

Refactoring branches improve internal structure without intentionally changing externally observable behavior.

The workflow should include:

1. Confirm the existing behavior.
2. Establish adequate test coverage.
3. Create a `refactor/` branch.
4. Make incremental structural changes.
5. Continuously execute tests.
6. Avoid unrelated feature development.
7. Document any architectural impact.
8. Merge after review and validation.

Example:

```text
refactor/ZL-527-wallet-projection-handler
```

A refactoring branch that introduces new behavior should be reclassified or separated into distinct work items.

---

# Dependent Branches

Branches should normally remain independent.

When one work item depends on another unmerged branch, contributors should prefer:

- merging the prerequisite work first
- using feature flags
- defining stable interfaces
- creating separate mock or contract implementations

Stacked branches may be used only when necessary and should clearly document their dependency order.

Example:

```text
feature/ZL-610-notification-domain
feature/ZL-611-notification-preferences-api
```

The second branch should identify the first branch as a temporary base and should be rebased onto `main` after the prerequisite is merged.

---

# Keeping a Branch Current

Branches should remain synchronized with `main` to reduce integration risk.

Contributors should update active branches when:

- `main` contains relevant changes
- the branch has been open for an extended period
- merge conflicts are likely
- reviewers request synchronization
- CI validates against a newer repository state

The approved synchronization method should preserve a clear and reviewable history.

---

# Rebase Strategy

Rebasing may be used on private or individually owned branches before review or merge.

Appropriate uses include:

- incorporating the latest `main`
- cleaning up local commits
- resolving branch divergence
- preparing a coherent Pull Request history

Rebasing should not be performed on shared branches without coordination because it rewrites history.

Never rebase:

- `main`
- published release tags
- shared branches without approval
- branches already consumed by active downstream work without coordination

---

# Merge-from-Main Strategy

Merging `main` into a branch may be used when:

- the branch is shared
- preserving public branch history is important
- rebasing would disrupt collaborators
- conflict resolution should remain visible

The repository should adopt one preferred synchronization approach and apply it consistently.

Unnecessary merge commits should be avoided.

---

# Pull Request Creation

A Pull Request should be opened when the change is ready for meaningful review.

Draft Pull Requests may be opened earlier to:

- expose implementation direction
- run CI validation
- coordinate dependent work
- request architectural feedback

A Pull Request should identify:

- linked work item
- branch purpose
- implementation summary
- affected bounded contexts
- testing performed
- database or infrastructure impact
- security considerations
- deployment or rollback requirements

The Pull Request should remain the authoritative review record for the change.

# Pull Request Scope

Pull Requests should remain focused and reviewable.

A Pull Request should not combine unrelated:

- features
- defects
- architectural changes
- dependency upgrades
- formatting changes
- infrastructure modifications

Large Pull Requests should be divided when doing so preserves meaningful delivery units.

A reviewer should be able to understand the purpose and risk of the change without reconstructing multiple work items.

---

# Draft Pull Requests

Draft Pull Requests may be used for incomplete work.

Draft status should indicate that:

- the implementation is not ready to merge
- quality gates may still fail
- reviewer feedback may be preliminary
- requirements may remain incomplete

A Draft Pull Request must be marked ready for review before formal approval.

Draft status should not be used to leave stale work indefinitely.

---

# Pull Request Review Requirements

Every Pull Request should receive review from the appropriate owners.

Review requirements may include:

- bounded-context owner
- architecture reviewer
- security reviewer
- database owner
- infrastructure owner
- financial-integrity reviewer

Review requirements should reflect the risk and scope of the change.

Sensitive financial changes affecting the authoritative ledger should receive heightened review.

---

# Required Status Checks

Pull Requests should not merge until required automated checks pass.

Checks may include:

- build
- formatting
- linting
- unit tests
- integration tests
- contract tests
- security scans
- dependency scans
- migration validation
- infrastructure plan validation
- documentation checks

Required checks should be enforced through branch protection.

---

# Review Feedback Resolution

Review feedback should be resolved before merging.

Resolution may include:

- implementing the requested change
- explaining why the current implementation is correct
- updating documentation
- creating a follow-up work item when explicitly approved
- escalating an architectural disagreement

Comments should not be dismissed without a documented resolution.

Substantive changes after approval should trigger renewed review.

---

# Merge Strategies

Approved merge strategies may include:

- squash merge
- rebase merge
- merge commit

The repository should define one default strategy and use exceptions intentionally.

The chosen strategy should support:

- readable history
- traceability
- safe reversion
- release auditing
- practical collaboration

# Default Merge Strategy

Project Zero-Loss should use **squash merging as the default for routine short-lived branches**.

Squash merging produces one coherent commit on `main` for each approved Pull Request.

Benefits include:

- clean primary-branch history
- straightforward Pull Request traceability
- simple reversion
- removal of noisy intermediate commits

The final squash commit message should follow the approved commit-message standard.

Example:

```text
feat(notifications): add customer category subscriptions
```

---

# Rebase Merge

Rebase merging may be used when:

- every branch commit is intentionally curated
- preserving individual atomic commits provides value
- the branch history is linear and compliant
- Engineering Governance permits the strategy

Rebase merging should not introduce noisy or incomplete commits into `main`.

---

# Merge Commits

Merge commits may be used for:

- coordinated release branches
- complex shared branches
- cases where preserving branch topology is operationally valuable

Merge commits should not be used routinely when they add no meaningful historical context.

---

# Prohibited Integration Practices

The following practices are prohibited:

- direct commits to `main`
- merging with failing required checks
- bypassing required reviewers without authorized emergency procedure
- force pushing protected branches
- merging unresolved conflicts
- merging known broken code
- combining unauthorized changes into an approved branch
- silently changing the Pull Request scope after approval

Repository integrity takes precedence over delivery speed.

---

# Merge Queue

A merge queue should be used when concurrent Pull Requests create significant integration risk.

A merge queue may:

- retest changes against the latest `main`
- serialize integration
- prevent stale approvals from introducing breakage
- ensure protected-branch consistency

High-activity repositories should prefer automated merge queues over manual timing coordination.

---

# Conflict Resolution

Merge conflicts should be resolved by contributors who understand the affected code and business behavior.

Conflict resolution should include:

1. Identify both intended changes.
2. Determine the authoritative behavior.
3. Preserve architectural boundaries.
4. Resolve the conflict deliberately.
5. Execute affected tests.
6. Request renewed review when behavior changes.

Conflict markers should never be committed.

Automated conflict resolution should not be trusted without validation.

---

# Business-Rule Conflicts

When a conflict affects business behavior, the resolution should be based on:

1. approved requirements
2. Master Architecture
3. applicable ADRs
4. authoritative product specifications
5. bounded-context ownership

The newest code is not automatically the correct code.

Unclear business-rule conflicts should be escalated before merging.

# Database Migration Conflicts

Database migration conflicts require special care.

Contributors should verify:

- migration ordering
- unique migration identifiers
- schema compatibility
- data-preservation requirements
- rollback impact
- deployment sequencing

Conflicting migrations should not be resolved only by renaming files without validating behavior.

---

# Event Contract Conflicts

Conflicts affecting event schemas or contracts should be reviewed against:

- Event Schema Standards
- Domain Event Catalog
- consumer compatibility
- versioning requirements
- rollout sequencing

Published event contracts should not be changed casually during conflict resolution.

---

# Generated File Conflicts

Generated files should be regenerated from the authoritative source rather than manually merged whenever practical.

Examples include:

- lockfiles
- generated clients
- API schemas
- compiled artifacts
- database types

Manual edits to generated output should be avoided.

---

# Approval Invalidation

Prior approvals should be invalidated when material changes occur after review.

Material changes may include:

- new business behavior
- expanded scope
- database modifications
- security changes
- conflict resolutions affecting logic
- substantial dependency changes

Minor documentation or formatting corrections may not require full reapproval when repository policy permits.

---

# Branch Closure

After successful integration, the branch should be deleted.

Branch deletion:

- reduces repository clutter
- prevents accidental reuse
- clarifies completed work
- encourages short-lived development

Protected, release, or investigation branches may be retained only when an approved operational need exists.

Git history preserves merged work after branch deletion.

---

# Abandoned Branches

Branches that are no longer active should be:

- reviewed
- documented when necessary
- closed
- deleted

Any valuable unmerged work should be transferred to a current work item before deletion.

Stale branches should not become an unofficial backlog.

---

# Failed Pull Requests

A Pull Request that cannot proceed should be closed with a clear explanation.

The closure record should state:

- why the change was rejected or abandoned
- whether follow-up work exists
- whether any design decision changed
- whether security or incident records are involved

Closed Pull Requests should remain available for historical traceability.

# Branch Restoration

Deleted branches may be restored when necessary using Git history.

Restoration may be appropriate when:

- an unexpected regression is discovered
- additional related work is required
- historical investigation is necessary
- an incomplete release must be reconstructed

Restoration should not replace proper version control or release tagging practices.

---

# Rollback Strategy

Rollback should prioritize restoring a known-good state safely and predictably.

Rollback options may include:

- reverting the merge commit
- deploying a previous release
- reversing a feature flag
- executing an approved database rollback
- performing a controlled forward fix

The appropriate rollback strategy depends on the nature of the deployment and the operational risk.

Financial integrity must never be compromised during rollback activities.

---

# Git Tags

Git tags identify significant repository milestones.

Tags should be used for:

- production releases
- release candidates
- major milestones
- emergency hotfix releases

Example:

```text
v1.0.0
v1.2.0
v1.2.1-hotfix
```

Tags should be immutable once published.

Deleting or reassigning published tags should require explicit Engineering Governance approval.

---

# Semantic Versioning

Project Zero-Loss should follow Semantic Versioning.

Format:

```text
MAJOR.MINOR.PATCH
```

Definitions:

- **MAJOR** — incompatible or breaking changes
- **MINOR** — backward-compatible functionality
- **PATCH** — backward-compatible bug fixes

Examples:

```text
1.0.0
1.3.0
1.3.5
2.0.0
```

Version numbers should accurately communicate deployment impact.

---

# Release Branches

Release branches may be used when preparing coordinated production deployments.

Typical workflow:

```text
main
   │
   ├── release/v1.5.0
   │
   ├── stabilization
   ├── testing
   ├── documentation updates
   ├── production approval
   │
   └── production release
```

Only approved stabilization work should enter a release branch.

New feature development should continue on separate feature branches.

---

# Release Stabilization

During release stabilization, teams should focus on:

- defect correction
- regression testing
- documentation completion
- deployment validation
- performance verification
- security validation
- operational readiness

Large new features should not be introduced during stabilization unless authorized under exceptional circumstances.

# Production Release

A production release should follow an approved release process.

The production release workflow should include:

1. Final validation of the release branch.
2. Confirmation that all required quality gates have passed.
3. Verification of database migration readiness.
4. Confirmation of deployment approvals.
5. Production deployment through approved automation.
6. Post-deployment verification.
7. Monitoring of production health.
8. Formal release completion.

Every production release should be traceable to:

- release tag
- Pull Requests
- commits
- deployment records
- release notes
- approval records

---

# Emergency Releases

Emergency releases should be reserved for critical production incidents.

Examples include:

- security vulnerabilities
- financial integrity risks
- production outages
- customer data protection
- critical regulatory issues

Emergency releases should still include:

- peer review
- testing proportional to urgency
- deployment approval
- deployment logging
- rollback preparation
- post-incident review

Urgency does not eliminate governance.

---

# Release Notes

Every production release should include release notes.

Release notes should summarize:

- new features
- resolved defects
- infrastructure changes
- dependency updates
- security improvements
- operational changes
- migration requirements
- known limitations

Release notes should be understandable by both technical and operational stakeholders.

---

# Repository Cleanup

Repository maintenance should occur regularly.

Cleanup activities may include:

- deleting merged branches
- removing obsolete tags when permitted
- archiving inactive repositories
- updating branch protections
- reviewing repository permissions
- validating automation configuration

Repository cleanup should never remove historical audit information.

---

# Branch Protection Rules

Protected branches should enforce repository governance automatically.

Protected branches should generally require:

- Pull Requests
- approved reviews
- passing status checks
- up-to-date branches
- signed commits if required
- restricted force pushes
- restricted deletion

Typical protected branches include:

```text
main
release/*
```

Branch protection should be managed through repository administration rather than informal team agreement.

---

# Force Push Policy

Force pushing should be prohibited on protected branches.

Force pushes may be permitted only:

- on personal branches
- before code review
- when history rewriting is intentional
- when no collaborators are affected

Force pushes to shared branches should require explicit coordination.

Force pushes to `main` should never be permitted.

# Commit Signing

Commit signing may be required for repositories containing sensitive or regulated systems.

When enabled, contributors should use verified cryptographic signatures to establish commit authenticity.

Benefits include:

- verified author identity
- tamper detection
- improved auditability
- stronger supply-chain security
- compliance support

Unsigned commits should be rejected when repository policy requires verified signatures.

---

# Repository Permissions

Repository access should follow the Principle of Least Privilege.

Permissions should be granted according to role and responsibility.

Typical permission levels include:

- Read
- Triage
- Write
- Maintain
- Admin

Administrative privileges should be limited to authorized platform administrators.

Repository permissions should be reviewed periodically and after personnel changes.

---

# Repository Ownership

Every repository should have clearly identified owners.

Repository owners are responsible for:

- architectural governance
- repository health
- branch protection
- security configuration
- dependency maintenance
- release governance
- contributor management
- documentation oversight

Ownership responsibilities should never be ambiguous.

---

# Forking Policy

Forking may be permitted for open-source repositories but should be restricted for private enterprise repositories unless explicitly approved.

Private forks should comply with organizational security policies.

Sensitive business logic, financial controls, and proprietary algorithms should not be distributed through unauthorized forks.

---

# External Contributions

External contributions should undergo the same governance standards as internal work.

External Pull Requests should receive:

- architectural review
- security review
- licensing validation
- automated quality checks
- documentation review
- approval from repository owners

External contributions should not bypass established engineering controls.

---

# Dependency Updates

Dependency updates should be isolated into dedicated branches whenever practical.

Example:

```text
chore/dependency-updates-july-2026
```

Each dependency update should include:

- version changes
- compatibility validation
- security review
- automated testing
- release impact assessment

Large dependency upgrades should be divided into manageable changes whenever possible.

---

# Large-Scale Refactoring

Major refactoring initiatives should be planned separately from routine feature delivery.

Large-scale refactoring should include:

- architectural objectives
- implementation milestones
- migration strategy
- testing strategy
- rollback considerations
- documentation updates
- stakeholder communication

Long-running refactoring branches should be avoided whenever possible in favor of incremental delivery.

# Monorepo Considerations

If Project Zero-Loss is maintained as a monorepository, Git practices should preserve clear ownership and bounded-context isolation.

Monorepo governance should include:

- clearly defined domain boundaries
- consistent directory structure
- CODEOWNERS assignments
- independent testing where practical
- selective build execution
- standardized tooling
- shared engineering standards

Changes spanning multiple domains should identify all affected owners during review.

---

# Repository Automation

Automation should enforce engineering standards consistently.

Repository automation may include:

- continuous integration
- continuous delivery
- automated testing
- code formatting
- linting
- dependency scanning
- secret scanning
- license validation
- documentation validation
- deployment verification

Automation should reduce manual error while preserving human oversight for high-risk decisions.

---

# Continuous Integration

Every Pull Request should execute the approved Continuous Integration (CI) pipeline.

The CI pipeline should validate:

- successful compilation
- static analysis
- formatting compliance
- automated tests
- security scanning
- dependency integrity
- configuration validation

A failing CI pipeline should prevent merging until the failure has been resolved or an approved exception has been granted.

---

# Continuous Delivery

Continuous Delivery (CD) should deploy only approved, validated artifacts.

Deployment automation should ensure:

- repeatable deployments
- version traceability
- deployment logging
- rollback capability
- environment consistency
- approval enforcement

Production deployments should occur only through approved deployment pipelines.

---

# Build Reproducibility

Repository builds should be reproducible.

A reproducible build should produce equivalent artifacts when built from:

- the same commit
- the same dependencies
- the same configuration
- the approved build environment

Build reproducibility supports:

- incident investigation
- auditability
- disaster recovery
- security verification
- release confidence

---

# Secrets Management

Secrets must never be committed to the repository.

Examples include:

- API keys
- passwords
- private certificates
- signing keys
- encryption keys
- access tokens
- cloud credentials

Secrets should be managed through approved secure secret-management systems.

Repository automation should scan for accidental secret disclosure.

---

# Binary File Policy

Large binary files should be minimized within the repository.

When binary assets are required, they should be:

- versioned intentionally
- stored appropriately
- documented
- reviewed for licensing
- reviewed for security

Generated binaries should not be committed unless explicitly required by the release process.

# Repository Backups

Repository data should be protected through reliable backup and recovery processes.

Backup strategy should include:

- repository metadata
- Git history
- release tags
- configuration
- automation definitions
- documentation
- access policies
- audit records

Backups should be tested periodically to verify successful restoration.

---

# Disaster Recovery

Repository disaster recovery should support restoration within approved Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO).

Recovery planning should include:

- repository restoration
- branch recovery
- tag restoration
- CI/CD restoration
- access control restoration
- deployment pipeline restoration
- audit log preservation

Disaster recovery procedures should be documented and exercised regularly.

---

# Auditability

Every significant repository action should be traceable.

Audit records should include, where applicable:

- commit author
- reviewer
- approver
- merge timestamp
- deployment reference
- release version
- associated work item
- security approvals

Auditability is essential for financial integrity, operational governance, and regulatory compliance.

---

# Repository Monitoring

Repository activity should be monitored for unusual or unauthorized behavior.

Monitoring may include:

- failed authentication attempts
- permission changes
- branch protection modifications
- force-push attempts
- unusual cloning activity
- secret-detection events
- dependency alerts
- security advisories

Monitoring should integrate with organizational security and operational alerting systems.

---

# Engineering Metrics

Repository metrics should be used to improve engineering effectiveness rather than evaluate individual contributors.

Useful metrics may include:

- deployment frequency
- lead time for changes
- change failure rate
- mean time to recovery (MTTR)
- Pull Request cycle time
- review turnaround time
- branch lifetime
- test reliability

Metrics should inform continuous improvement efforts and should not encourage undesirable engineering behavior.

---

# Periodic Repository Reviews

Repository governance should be reviewed on a regular schedule.

Periodic reviews should evaluate:

- branch protection configuration
- repository permissions
- CODEOWNERS assignments
- automation workflows
- dependency health
- security posture
- documentation accuracy
- engineering standards compliance

Findings should be documented and tracked to completion.

---

# Document Governance

This document is an authoritative engineering governance specification for Git usage and branching strategy within Project Zero-Loss.

Changes to this document require:

- Architecture Governance review
- Engineering Leadership approval
- documentation updates where applicable
- communication to affected contributors

Repository practices should evolve deliberately through documented governance rather than informal convention.

# End of Document

There is no additional content beyond Part 16.

The **Git and Branching Strategy** document is complete.

