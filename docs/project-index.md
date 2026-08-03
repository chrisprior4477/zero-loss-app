# Project Zero-Loss Documentation Index & Source of Truth

**Version:** 1.1
**Status:** Frozen
**Revision:** Clarification
**Last Updated:** 2026-07-25

---

# Purpose

This document is the official entry point for Project Zero-Loss.

It exists to help founders, engineers, designers, operators, and AI systems (including ChatGPT, Claude, Cursor, Perplexity, Gemini, and future engineering assistants) understand:

* what Project Zero-Loss is,
* where project documentation lives,
* which documents are authoritative,
* which order they should be read,
* how conflicts between documents are resolved,
* how documentation evolves,
* and which document is considered the single source of truth for every architectural decision.

Every contributor should begin here before reading any other project document.

No implementation work should begin until the required reading order has been completed.

---

# 1. Documentation Hierarchy (Source of Truth)

When documentation appears to conflict, the following order of authority determines the final decision.

## Level 1 — Founder Decisions

Explicit founder decisions always override previous documentation.

If the founder intentionally changes a requirement, that decision becomes the new source of truth until the documentation is updated.

---

## Level 2 — Master Architecture

**Canonical File**

`docs/architecture/master-architecture.md`

This is the **only authoritative Master Architecture document** for Project Zero-Loss.

Duplicate or mirrored copies of this document must not exist elsewhere in the repository.

This document governs:

* system architecture,
* technology stack,
* database design,
* authentication,
* server/client responsibilities,
* ledger architecture,
* financial integrity,
* migrations,
* auditability,
* security,
* enterprise engineering standards,
* and platform governance.

No implementation should violate this document unless the founder explicitly supersedes it.

---

## Level 3 — Product Vision & Product Concept

**Files**

`docs/core/product-vision.md`

`docs/core/product-concept.md`

These documents define:

* the Zero-Loss philosophy,
* customer experience,
* emotional positioning,
* business model,
* marketplace identity,
* UX direction,
* long-term product goals,
* and customer trust principles.

If a technically correct implementation weakens the product philosophy, these documents take precedence over technical convenience.

---

## Level 4 — AI Operating Rules

**File**

`docs/architecture/ai-operating-rules.md`

This document governs how AI systems generate:

* implementation documents,
* roadmap manuals,
* technical explanations,
* complete production-ready files,
* migration guidance,
* and founder-facing explanations.

---

## Level 5 — Output Contract

**File**

`docs/architecture/output-contract.md`

This document defines the required format for implementation output including:

* target paths,
* complete copy/paste-ready files,
* verification steps,
* testing expectations,
* and delivery formatting.

---

## Level 6 — Feature Specifications

Feature specifications define the expected behavior of individual functional areas.

Examples include:

* Homepage
* Item Page
* Account & Wallet
* Payments & Payouts
* Support & Status
* Admin Portal

Feature specifications must always remain consistent with:

* Founder Decisions
* Master Architecture
* Product Vision
* Product Concept

---

## Level 7 — Roadmap Manuals

Roadmap manuals describe the implementation sequence used to build the platform.

Example:

`docs/roadmap/day-1-master-manual.md`

Roadmap documents exist to implement the documented architecture.

If a roadmap document conflicts with a higher-level document, the higher-level document is considered correct.

The roadmap should then be updated rather than silently changing the architecture.

---

# 2. Documentation Status

## Frozen Documents

The following documents establish the long-term foundation of Project Zero-Loss.

Their architectural principles are considered stable.

Future modifications should be categorized as one of the following:

* Clarification
* Expansion
* Correction
* Superseding Decision

rather than silently replacing previous decisions.

### Architecture

* master-architecture.md
* ai-operating-rules.md
* output-contract.md

### Core

* product-vision.md
* product-concept.md

---

## Living Documents

These documents are expected to evolve as implementation progresses.

### Product Specifications

* homepage-spec.md
* how-it-works-spec.md
* item-page-spec.md
* account-wallet-spec.md

### Operations

* admin-portal-spec.md
* payments-and-payouts-spec.md
* support-status-spec.md

### Roadmaps

Roadmap manuals are implementation guides and will naturally expand as the platform grows.

---

# 3. Project Documentation Map

```text
docs/

├── project-index.md

├── architecture/
│   ├── master-architecture.md
│   ├── ai-operating-rules.md
│   └── output-contract.md

├── core/
│   ├── product-vision.md
│   └── product-concept.md

├── product/
│   ├── homepage-spec.md
│   ├── how-it-works-spec.md
│   ├── item-page-spec.md
│   └── account-wallet-spec.md

├── operations/
│   ├── admin-portal-spec.md
│   ├── payments-and-payouts-spec.md
│   └── support-status-spec.md

└── roadmap/
    └── day-1-master-manual.md
```

This structure represents the official documentation organization for Project Zero-Loss.

---

# 4. Required Reading Order

Before writing code, modifying architecture, or generating implementation files, every developer or AI system must read the documentation in the following order.

1. `docs/project-index.md`
2. `docs/core/product-vision.md`
3. `docs/core/product-concept.md`
4. `docs/architecture/master-architecture.md`
5. `docs/architecture/ai-operating-rules.md`
6. `docs/architecture/output-contract.md`
7. The relevant feature specification.
8. The applicable roadmap manual.

Implementation should never begin before this reading sequence has been completed.

---

# 5. Project Status

| Area | Status |
|--------------------------------|-------------|
| Project Index | ✅ Complete |
| Master Architecture | ✅ Complete |
| Product Vision | ✅ Complete |
| Product Concept | ✅ Complete |
| AI Operating Rules | ✅ Complete |
| Output Contract | ✅ Complete |
| Homepage Specification | ✅ Complete |
| How It Works Specification | ✅ Complete |
| Item Page Specification | ✅ Complete |
| Account & Wallet Specification | ✅ Complete |
| Payments & Payouts Specification | ✅ Complete |
| Support & Status Specification | ✅ Complete |
| Admin Portal Specification | ✅ Complete |
| Roadmap Day 1 | ✅ Complete |
| Roadmap Day 2 | ⬜ Not Started |

This section should be updated as implementation milestones are completed.

---

# 6. Documentation Governance

Project documentation should evolve deliberately.

Documentation should never drift silently.

Major architectural decisions should always preserve historical intent.

Every significant update should be categorized as one of the following:

* Clarification
* Expansion
* Correction
* Superseding Decision

This governance model preserves continuity and prevents conflicting documentation from developing over time.

---

# 7. Guiding Principle

Project Zero-Loss is intended to be built as an enterprise-grade platform.

Whenever uncertainty exists, contributors should favor decisions that:

* strengthen customer trust,
* improve auditability,
* preserve financial integrity,
* protect server authority,
* support future administrative tooling,
* reduce long-term redesign,
* and remain consistent with the documented architecture and product vision.

Technical convenience must never silently override documented architectural decisions.

---

# Change Log

### Version 1.1 — 2026-07-25

**Revision:** Clarification

* Established the canonical Master Architecture location.
* Explicitly prohibited duplicate Master Architecture documents.
* Clarified documentation governance language.
* Clarified AI onboarding expectations.
* Improved hierarchy descriptions.
* Improved wording for long-term maintainability.

### Version 1.0 — 2026-07-13

* Created the official project documentation index.
* Established the documentation hierarchy.
* Defined the official reading order.
* Documented the governance model.
* Added project status tracking.
* Established the official source-of-truth structure for Project Zero-Loss documentation.