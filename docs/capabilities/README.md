# Project Zero-Loss Capability Documentation Guide

**Version:** 1.0
**Status:** Frozen
**Document Owner:** Founder / Product Architecture
**Last Updated:** 2026-07-16
**Target Path:** `docs/capabilities/README.md`

---

# 1. Purpose

This document defines how cross-platform capabilities are specified, reviewed, approved, implemented, and maintained throughout Project Zero-Loss.

A capability is a reusable product behavior that may appear across multiple pages, workflows, administrative tools, APIs, and database systems.

Examples include:

* Favorites
* Notifications
* Search
* Recommendations
* User preferences
* Identity and profiles
* Catalog management
* Rewards and referrals

A capability is not limited to a single page.

For example, Favorites may appear on:

* the homepage,
* search results,
* item pages,
* account pages,
* recommendation modules,
* notification settings,
* and administrative analytics.

Because a capability affects multiple parts of the platform, it requires one authoritative specification that defines its behavior everywhere.

---

# 2. Guiding Principle

> **A capability is a behavior, not a page.**

Page specifications define what a particular screen should display.

Capability specifications define how a reusable product behavior works across the entire platform.

When a page specification and a capability specification address the same behavior, the capability specification governs the reusable behavior unless a higher-authority document says otherwise.

---

# 3. Documentation Authority

Capability documents must follow the authority hierarchy established in:

`docs/project-index.md`

Capability specifications must never override:

1. Explicit founder decisions.
2. The Master Architecture.
3. The Product Vision.
4. The Product Concept.
5. AI Operating Rules.
6. The Output Contract.

Capability specifications may clarify and expand those documents, but they must remain consistent with them.

If a capability document conflicts with a higher-authority document, implementation must stop until the conflict is resolved.

Cursor or another AI assistant must not silently choose which conflicting rule to follow.

---

# 4. Capability Folder Structure

The official capability folder is:

```text
docs/
└── capabilities/
    ├── README.md
    ├── favorites.md
    ├── wishlist.md
    ├── notifications.md
    ├── search.md
    ├── recommendations.md
    ├── user-preferences.md
    ├── activity-history.md
    ├── catalog.md
    ├── identity-and-profile.md
    ├── rewards-and-referrals.md
    └── communications.md
```

Additional capability documents may be added when a behavior:

* affects multiple pages or systems,
* has its own business rules,
* requires persistent data,
* requires administrative controls,
* creates security or privacy obligations,
* or would otherwise be duplicated across several page specifications.

---

# 5. Required Document Metadata

Every capability specification must begin with:

```text
Version:
Status:
Document Owner:
Last Updated:
Target Path:
Related Documents:
```

## Version

The current document version.

Examples:

* `1.0` — first approved version.
* `1.1` — clarification or compatible expansion.
* `2.0` — significant redesign or superseding decision.

## Status

Each document must use one of the following statuses:

### Draft

The document is still being discussed and must not be treated as approved implementation authority.

### Review

The document is complete enough for founder, architecture, security, legal, or technical review.

### Frozen

The document is approved as the current implementation authority.

A frozen document may still be changed, but changes must be intentional, versioned, and recorded.

### Superseded

The document has been replaced by a newer approved document or version.

### Archived

The document is retained for historical reference but must not guide current implementation.

## Document Owner

The person or role responsible for approving the capability.

## Last Updated

The date of the most recent meaningful change.

## Target Path

The canonical location of the document in the repository.

## Related Documents

Other specifications, architecture documents, operations documents, or Architecture Decision Records that affect the capability.

---

# 6. Required Capability Sections

Every capability document should include the following sections where relevant.

## 6.1 Purpose

Explain why the capability exists and what problem it solves.

## 6.2 Product Philosophy

Explain how the capability supports the Zero-Loss experience, including:

* customer trust,
* shopping utility,
* transparency,
* responsible engagement,
* and long-term platform value.

## 6.3 User Outcomes

Describe what users should be able to accomplish.

## 6.4 User Stories

Provide realistic examples using plain language.

Example:

> As a user who follows groceries, I want to be notified when a new grocery gift-card pool opens so I do not need to search manually every day.

## 6.5 Version 1 Scope

Define what must exist in the first production version.

## 6.6 Future Enhancements

Record useful ideas that are not required for Version 1.

Future ideas must not be implemented automatically unless they are intentionally promoted into the approved scope.

## 6.7 Out of Scope

State what the capability intentionally does not include.

## 6.8 User Experience Requirements

Define:

* user-facing controls,
* page locations,
* navigation,
* empty states,
* loading states,
* error states,
* mobile behavior,
* accessibility,
* and understandable language.

## 6.9 Business Rules

Define the rules that govern the capability.

Business rules must be explicit enough that Cursor or another engineer does not have to invent them.

## 6.10 Data Requirements

Describe the information the capability needs to store or derive.

Suggested tables and fields may be included, but final database implementation must remain consistent with the Master Architecture and approved migrations.

## 6.11 Server and API Requirements

Describe:

* server-side responsibilities,
* authorization,
* idempotency where relevant,
* validation,
* rate limits,
* external integrations,
* and failure handling.

## 6.12 Security and Privacy

Document:

* ownership rules,
* Row Level Security requirements,
* sensitive information,
* consent,
* retention,
* abuse risks,
* and administrative access.

## 6.13 Administrative Requirements

Define what operators need to:

* review,
* configure,
* disable,
* investigate,
* moderate,
* correct,
* audit,
* or report.

## 6.14 Analytics Requirements

Define what events and outcomes should be measured.

Analytics records must never become the source of financial truth.

## 6.15 Accessibility

Define capability-specific accessibility expectations, including:

* keyboard access,
* screen-reader labels,
* focus behavior,
* contrast,
* motion preferences,
* and understandable error messages.

## 6.16 Failure and Edge Cases

Document realistic problems such as:

* duplicate requests,
* deleted records,
* expired sessions,
* unavailable items,
* provider failures,
* retry behavior,
* concurrent requests,
* or partial completion.

## 6.17 Acceptance Criteria

State the conditions that must be proven before the capability is considered complete.

Acceptance criteria should be testable.

## 6.18 Related Documents

List all connected specifications and Architecture Decision Records.

---

# 7. Version 1 Versus Future Scope

The documentation may contain more ideas than Version 1 will implement.

This is intentional.

Each idea must be classified as one of the following:

* **Required for Version 1**
* **Recommended for Version 1**
* **Future enhancement**
* **Explicitly out of scope**

Cursor must not implement every documented future enhancement simply because it appears in a specification.

Only the approved Version 1 scope and the active implementation manual authorize immediate development.

---

# 8. Implementation Rules for Cursor and AI Assistants

Before implementing a capability, Cursor or another AI assistant must:

1. Read `docs/project-index.md`.
2. Read the relevant architecture and core documents.
3. Read this capability documentation guide.
4. Read the targeted capability specification.
5. Read every related page and operations specification.
6. Identify conflicts or missing decisions before generating code.
7. Explain the proposed implementation in plain language.
8. Identify security, privacy, financial, and operational implications.
9. Provide complete files or migrations according to the Output Contract.
10. Include automated tests and founder verification steps.

Cursor must not treat a Markdown document as proof that an implementation is secure.

Security must be enforced through:

* server-side authorization,
* database constraints,
* Row Level Security,
* idempotency,
* transaction design,
* automated tests,
* audit logs,
* and targeted professional review where required.

---

# 9. Change Classification

Every meaningful change to a frozen capability document must be classified.

## Clarification

Explains an existing rule without changing its intended behavior.

## Expansion

Adds compatible detail or future capability without invalidating the existing design.

## Correction

Fixes an error, contradiction, omission, or unsafe assumption.

## Superseding Decision

Replaces a previous approved decision.

Superseding decisions should be accompanied by an Architecture Decision Record when the change affects architecture, security, financial behavior, legal structure, or multiple systems.

---

# 10. Architecture Decision Records

Major capability decisions should be recorded in:

`docs/decisions/`

Examples include:

* Why wallet balances are ledger-derived.
* Why notification channels are introduced in phases.
* Why Favorites, Wishlists, and Watchlists are separate or combined.
* Why a recommendation system begins with rule-based ranking.
* Why SMS is excluded from Version 1.
* Why a third-party search engine is or is not used.

The capability specification defines the current behavior.

The Architecture Decision Record explains why a major decision was made.

---

# 11. Cross-Document Updates

When a capability is approved, all affected documents must be reviewed.

For example, approving Favorites may require updates to:

* `homepage-spec.md`
* `item-page-spec.md`
* `search.md`
* `recommendations.md`
* `notifications.md`
* `account-wallet-spec.md`
* `admin-portal-spec.md`
* `analytics-spec.md`

A capability is not fully documented until its relationships with affected pages and operations are addressed.

---

# 12. No Silent Assumptions

If a specification does not answer an implementation question, Cursor must not invent a permanent business rule without disclosure.

Cursor should:

1. identify the missing decision,
2. explain why it matters,
3. propose a safe default,
4. label the assumption clearly,
5. and request founder approval before freezing it.

Temporary implementation details may be used only when they do not create irreversible product, financial, legal, or security consequences.

---

# 13. Simplicity and Trust

Capability design should prioritize:

1. User understanding.
2. User trust.
3. Financial integrity.
4. Operational control.
5. Accessibility.
6. Maintainability.
7. Scalability.
8. Responsible engagement.

Technical convenience must not silently override documented product behavior.

Engagement must not depend on:

* fake scarcity,
* fake winners,
* misleading activity,
* disguised advertising,
* forced notification consent,
* dark patterns,
* or manufactured urgency.

---

# 14. Completion Standard

A capability is not complete merely because its primary screen renders.

It is complete only when:

* the approved user experience exists,
* server-side authorization is enforced,
* the data model is implemented through migrations,
* required Row Level Security policies are active,
* loading, empty, and error states work,
* accessibility requirements are met,
* analytics are captured appropriately,
* administrative controls exist where required,
* failure cases are handled,
* automated tests pass,
* founder verification steps pass,
* documentation matches the implementation,
* and the change has been committed to GitHub.

---

# 15. Guiding Statement

The capability specifications exist to give every engineer and AI assistant a consistent understanding of how Project Zero-Loss should behave.

They should provide enough direction to prevent guessing while remaining flexible enough to support safe implementation improvements.

The goal is not to create the largest possible collection of documents.

The goal is to create a reliable Product Bible that allows Project Zero-Loss to be built consistently, reviewed intelligently, and improved without losing its original vision.
