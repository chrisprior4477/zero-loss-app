# Project Zero-Loss Documentation Index & Source of Truth

**Version:** 1.0
**Status:** Frozen
**Last Updated:** 2026-07-13

---

# Purpose

This document is the official entry point for Project Zero-Loss.

It exists to help founders, engineers, designers, operators, and AI systems (including ChatGPT, Gemini, Cursor, Claude, Perplexity, and future coding assistants) understand:

* what Project Zero-Loss is,
* where project documentation lives,
* which documents are authoritative,
* which order they should be read,
* how conflicts between documents are resolved,
* and how the documentation is maintained over time.

Every new contributor should begin here before reading any other project document.

---

# 1. Documentation Hierarchy (Source of Truth)

When documentation appears to conflict, the following order of authority determines the final decision.

## Level 1 — Founder Decisions

Explicit founder decisions always override previous documentation.

If the founder intentionally changes a requirement, that decision becomes the new source of truth until the documentation is updated.

---

## Level 2 — Master Architecture

**File**

`docs/architecture/master-architecture.md`

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
* and enterprise engineering standards.

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
* and long-term product goals.

If a technically correct implementation weakens the product philosophy, these documents take precedence.

---

## Level 4 — AI Operating Rules

**File**

`docs/architecture/ai-operating-rules.md`

This document governs how AI assistants generate:

* roadmap manuals,
* implementation documents,
* technical explanations,
* complete files,
* and founder-facing guidance.

---

## Level 5 — Output Contract

**File**

`docs/architecture/output-contract.md`

This document defines the required format for generated implementation files, including:

* target paths,
* complete copy/paste-ready files,
* verification steps,
* and delivery formatting.

---

## Level 6 — Feature Specifications

These documents define the expected behavior of individual product areas.

Examples include:

* Homepage
* Item Page
* Account & Wallet
* Payments & Payouts
* Support & Status
* Admin Portal

Feature specifications must remain consistent with the Product Vision and Master Architecture.

---

## Level 7 — Roadmap Manuals

Roadmap manuals describe the implementation sequence for building the project.

Examples:

`docs/roadmap/day-1-master-manual.md`

Roadmap documents exist to implement the architecture.

If a roadmap document accidentally conflicts with a higher-level document, the higher-level document is considered correct.

The roadmap should then be corrected rather than silently changing the architecture.

---

# 2. Documentation Status

## Frozen Documents

The following documents establish the baseline architecture and product direction.

Their core principles are considered locked.

Future changes should be identified as:

* Clarification
* Expansion
* Correction
* Superseding Decision

rather than silently rewriting previous decisions.

### Architecture

* master-architecture.md
* ai-operating-rules.md
* output-contract.md

### Core

* product-vision.md
* product-concept.md

---

## Living Documents

These documents are expected to evolve as the project grows.

### Product Specifications

* homepage-spec.md
* how-it-works-spec.md
* item-page-spec.md
* account-wallet-spec.md
* payments-and-payouts-spec.md
* support-status-spec.md

### Operations

* admin-portal-spec.md

### Roadmaps

All roadmap manuals are implementation guides and will naturally expand over time.

---

# 3. Project Documentation Map

```
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
│   ├── account-wallet-spec.md
│   ├── payments-and-payouts-spec.md
│   └── support-status-spec.md

├── operations/
│   └── admin-portal-spec.md

└── roadmap/
    └── day-1-master-manual.md
```

This structure represents the official documentation organization for the project.

---

# 4. Required Reading Order

Before writing code, modifying architecture, or generating implementation files, every developer or AI assistant should read the documentation in the following order.

1. `docs/project-index.md`

2. `docs/core/product-vision.md`

3. `docs/core/product-concept.md`

4. `docs/architecture/master-architecture.md`

5. `docs/architecture/ai-operating-rules.md`

6. `docs/architecture/output-contract.md`

7. The relevant feature specification.

8. The applicable roadmap manual.

This order ensures that implementation decisions are driven by the product vision and architecture before coding begins.

---

# 5. Project Status

Current Documentation Status

| Area                             | Status        |
| -------------------------------- | ------------- |
| Project Index                    | ✅ Complete    |
| Master Architecture              | ✅ Complete    |
| Product Vision                   | ✅ Complete    |
| Product Concept                  | ✅ Complete    |
| AI Operating Rules               | ✅ Complete    |
| Output Contract                  | ✅ Complete    |
| Homepage Specification           | ✅ Complete    |
| How It Works Specification       | ✅ Complete    |
| Item Page Specification          | ✅ Complete    |
| Account & Wallet Specification   | ✅ Complete    |
| Payments & Payouts Specification | ✅ Complete    |
| Support & Status Specification   | ✅ Complete    |
| Admin Portal Specification       | ✅ Complete    |
| Roadmap Day 1                    | ✅ Complete    |
| Roadmap Day 2                    | ⬜ Not Started |

This section should be updated as new documentation and implementation milestones are completed.

---

# 6. Documentation Governance

Project documentation should evolve deliberately.

Changes should preserve history whenever practical.

Major architectural decisions should never be silently replaced.

When a significant document changes, the update should be classified as one of the following:

* Clarification
* Expansion
* Correction
* Superseding Decision

This maintains continuity and prevents confusion as the project grows.

---

# 7. Guiding Principle

Project Zero-Loss is intended to be built as an enterprise-grade platform.

When uncertainty exists, contributors should favor decisions that:

* strengthen user trust,
* improve auditability,
* preserve financial integrity,
* support future administrative tooling,
* reduce long-term redesign,
* and remain consistent with the established architecture and product vision.

Technical convenience should never silently override documented architectural decisions.

---

# Change Log

### Version 1.0 — 2026-07-13

* Created the official project documentation index.
* Established the documentation hierarchy.
* Defined the official reading order.
* Documented the governance model.
* Added project status tracking.
* Established the official source-of-truth structure for Project Zero-Loss documentation.
