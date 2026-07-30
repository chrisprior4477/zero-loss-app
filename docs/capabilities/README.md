# Project Zero-Loss Capability Documentation Guide

**Version:** 1.1
**Status:** Frozen
**Document Owner:** Founder / Product Architecture
**Last Updated:** 2026-07-27
**Target Path:** `docs/capabilities/README.md`

---

# 1. Purpose

This document defines how cross-platform capabilities are specified, reviewed, approved, implemented, and maintained throughout Project Zero-Loss.

A capability is a reusable product behavior that may appear across multiple pages, workflows, administrative tools, APIs, services, and database systems.

Examples include:

- Favorites
- Notifications
- Search
- Recommendations
- User Preferences
- Identity & Profile
- Catalog
- Rewards & Referrals
- Communications
- Activity History

A capability is not limited to a single page.

For example, Favorites may appear on:

- Homepage
- Search Results
- Item Pages
- Account Pages
- Recommendation Modules
- Notification Settings
- Administrative Tools
- Analytics Dashboards

Because a capability affects multiple areas of the platform, it requires one authoritative specification that defines its behavior consistently everywhere it is used.

---

# 2. Guiding Principle

> **A capability defines reusable business behavior—not an individual page.**

Page specifications describe what a specific screen presents to a customer.

Capability specifications describe how a reusable feature behaves across the entire platform.

When a page specification and a capability specification describe the same behavior, the capability specification governs that reusable behavior unless superseded by a higher-authority document.

---

# 3. Documentation Authority

Capability specifications follow the documentation authority established by the Project Zero-Loss documentation hierarchy.

Capability specifications must never override:

1. Explicit Founder Decisions
2. Master Architecture
3. Product Vision
4. Product Concept
5. AI Operating Rules
6. Output Contract

Capability specifications expand and clarify higher-level documentation but must remain fully consistent with it.

If a conflict exists between documents, implementation must stop until the conflict is resolved.

Neither Cursor nor any AI assistant may silently choose between conflicting business rules.

---

# 4. Capability Folder Structure

The official capability directory is:

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

Additional capability specifications may be introduced whenever a reusable feature:

- spans multiple pages or systems,
- contains unique business rules,
- requires persistent data,
- includes administrative controls,
- introduces security or privacy requirements,
- or would otherwise duplicate implementation logic across multiple specifications.

---

# 5. Required Document Metadata

Every capability specification must begin with the following metadata:

```text
Version:
Status:
Document Owner:
Last Updated:
Target Path:
Related Documents:
```
## Version

The current approved version of the capability specification.

Examples:

- **1.0** — Initial approved version.
- **1.1** — Clarification or compatible enhancement.
- **2.0** — Significant redesign or superseding implementation.

Version numbers should accurately reflect meaningful changes while preserving document history.

---

## Status

Every capability specification must use one of the following statuses.

### Draft

The capability is actively being designed and must not be treated as implementation authority.

### Review

The capability is complete enough for founder, product, architecture, legal, security, or technical review.

### Frozen

The capability has been approved as the current implementation authority.

Frozen documents may still be updated, but every change must be intentional, reviewed, and versioned.

### Superseded

The capability has been replaced by a newer approved version and should no longer guide implementation.

### Archived

The capability is retained only for historical reference and must not be used for new development.

---

## Document Owner

Identifies the person or role responsible for approving and maintaining the capability specification.

---

## Last Updated

Records the date of the most recent meaningful revision.

Minor formatting changes do not require updating this field.

---

## Target Path

Identifies the canonical repository location of the specification.

---

## Related Documents

Lists all architecture documents, core documents, product specifications, operations specifications, and other capability specifications that influence or depend on this capability.

Related Documents help developers and AI assistants understand how a capability fits into the broader Project Zero-Loss documentation ecosystem and ensure implementation remains consistent across the platform.

---

# 6. Required Capability Sections

Every capability specification should include the following sections whenever they are applicable.

## 6.1 Purpose

Explain why the capability exists and what customer or business problem it solves.

---

## 6.2 Product Philosophy

Describe how the capability supports the Project Zero-Loss vision by reinforcing:

- customer trust,
- transparency,
- shopping utility,
- responsible participation,
- operational integrity,
- and long-term platform value.

---

## 6.3 User Outcomes

Describe what successful customers should be able to accomplish using the capability.

---

## 6.4 User Stories

Provide realistic scenarios written in plain language.

Example:

> As a customer who follows grocery gift cards, I want to receive notifications when a new grocery pool becomes available so I don't have to search every day.

---

## 6.5 Version 1 Scope

Define everything that must exist before Version 1 is considered complete.

---

## 6.6 Future Enhancements

Record ideas that may improve the capability in future releases.

Future enhancements must never be implemented automatically simply because they appear in the documentation.

---

## 6.7 Out of Scope

Clearly define functionality that is intentionally excluded from the current implementation.

---

## 6.8 User Experience Requirements

Document:

- user-facing controls,
- page placement,
- navigation,
- loading states,
- empty states,
- error handling,
- mobile behavior,
- accessibility,
- and customer-friendly language.

---

## 6.9 Business Rules

Define the business rules that govern the capability.

Business rules should be specific enough that engineers and AI assistants never need to invent platform behavior.

---

## 6.10 Data Requirements

Describe the information required to support the capability.

Suggested database structures may be included, but implementation must remain consistent with the Master Architecture and approved database migrations.

---

## 6.11 Server and API Requirements

Document:

- server-side responsibilities,
- authorization,
- validation,
- idempotency,
- rate limiting,
- external integrations,
- error handling,
- and recovery behavior.

---

## 6.12 Security and Privacy

Document:

- ownership rules,
- Row Level Security (RLS),
- sensitive information,
- consent requirements,
- retention policies,
- abuse prevention,
- and administrative access.

---

## 6.13 Administrative Requirements

Describe how administrators can:

- review,
- configure,
- disable,
- investigate,
- moderate,
- correct,
- audit,
- and report on the capability.

---

## 6.14 Analytics Requirements

Define which business events should be measured.

Analytics data must never become the authoritative source of financial truth.

---

## 6.15 Accessibility

Document capability-specific accessibility expectations, including:

- keyboard navigation,
- screen-reader compatibility,
- focus management,
- color contrast,
- reduced-motion support,
- and understandable validation and error messages.

---

## 6.16 Failure and Edge Cases

Describe realistic operational scenarios including:

- duplicate requests,
- expired sessions,
- deleted records,
- unavailable resources,
- third-party failures,
- retry behavior,
- concurrent requests,
- and partially completed operations.

---

## 6.17 Acceptance Criteria

Define objective, testable conditions that must be satisfied before the capability is considered complete.

Acceptance criteria should support automated testing whenever practical.

---

## 6.18 Related Documents

List every architecture, core, product, operations, and capability specification that directly affects the implementation of the capability.

These references ensure developers and AI assistants review all relevant documentation before making implementation decisions.

# 7. Version 1 Versus Future Scope

Capability specifications may contain ideas that extend beyond the initial production release.

This is intentional.

Every proposed feature must be clearly classified as one of the following:

- **Required for Version 1**
- **Recommended for Version 1**
- **Future Enhancement**
- **Explicitly Out of Scope**

Neither Cursor nor any other AI assistant may implement future enhancements simply because they appear in a specification.

Only the approved Version 1 scope and the active implementation roadmap authorize immediate development.

---

# 8. Implementation Rules for Cursor and AI Assistants

Before implementing any capability, Cursor or another AI assistant must:

1. Read the Project Index.
2. Read the Master Architecture.
3. Read the Product Vision and Product Concept.
4. Read the AI Operating Rules.
5. Read the Output Contract.
6. Read this Capability Documentation Guide.
7. Read the target capability specification.
8. Review every related architecture, product, operations, and capability document.
9. Identify conflicts, ambiguities, or missing business decisions before writing code.
10. Explain the proposed implementation in clear language.
11. Identify any security, privacy, financial, legal, or operational considerations.
12. Produce complete implementation artifacts that comply with the Output Contract.
13. Include automated testing and founder verification steps.

A Markdown document alone is never proof that an implementation is secure or production-ready.

Security must always be enforced through:

- Server-side authorization
- Database constraints
- Row Level Security (RLS)
- Transaction integrity
- Idempotent operations
- Audit logging
- Automated testing
- Appropriate professional review where required

---

# 9. Change Classification

Every meaningful change to a frozen capability specification must be classified.

## Clarification

Explains an existing requirement without changing its intended behavior.

## Expansion

Adds compatible functionality or additional detail without invalidating previous decisions.

## Correction

Fixes an error, contradiction, omission, or unsafe assumption.

## Superseding Decision

Replaces a previously approved implementation decision.

When a superseding decision affects architecture, security, financial behavior, legal compliance, or multiple platform domains, every impacted authoritative specification must be updated so the documentation remains internally consistent.

---

# 10. Cross-Document Updates

Whenever a capability specification is approved or modified, every affected document must be reviewed for consistency.

For example, approving or modifying the Favorites capability may require updates to:

- `homepage-spec.md`
- `item-page-spec.md`
- `search.md`
- `recommendations.md`
- `notifications.md`
- `account-wallet-spec.md`
- `admin-portal-spec.md`
- `analytics-spec.md`

A capability is not fully documented until every affected specification accurately reflects the approved behavior.

---

# 11. No Silent Assumptions

If a specification does not answer an implementation question, Cursor or another AI assistant must not invent a permanent business rule without disclosure.

Instead, the AI assistant should:

1. Identify the missing decision.
2. Explain why the decision matters.
3. Propose a safe implementation approach.
4. Clearly label every assumption.
5. Request founder approval before treating the assumption as authoritative.

Temporary implementation details may only be used when they do not create irreversible product, financial, legal, operational, or security consequences.

---

# 12. Simplicity and Trust

Capability design should always prioritize:

1. User understanding
2. User trust
3. Financial integrity
4. Operational control
5. Accessibility
6. Maintainability
7. Scalability
8. Responsible engagement

Implementation must never sacrifice documented product behavior simply for technical convenience.

Platform engagement must never rely upon:

- fake scarcity,
- fake winners,
- misleading activity,
- disguised advertising,
- forced notification consent,
- dark patterns,
- or manufactured urgency.

Customer trust is always more valuable than short-term engagement metrics.

# 13. Completion Standard

A capability is not considered complete simply because its primary user interface has been implemented.

A capability is considered complete only when all of the following have been verified:

- The approved user experience has been implemented.
- Server-side authorization is fully enforced.
- Database structures have been implemented through approved migrations.
- Required Row Level Security (RLS) policies are active.
- Loading, empty, success, and error states function correctly.
- Accessibility requirements have been satisfied.
- Analytics are captured appropriately.
- Administrative controls exist where required.
- Failure and recovery scenarios have been tested.
- Automated tests pass successfully.
- Founder verification has been completed.
- Documentation accurately reflects the implementation.
- The implementation has been committed to the project's source control repository.

A capability should never be considered production-ready if any of these requirements remain incomplete.

---

# 14. Guiding Statement

The Capability Specifications exist to provide every engineer, designer, reviewer, and AI assistant with a consistent understanding of how Project Zero-Loss should behave.

Their purpose is to eliminate unnecessary guessing while remaining flexible enough to support safe implementation improvements.

The objective is not to produce the largest possible collection of documentation.

The objective is to create a reliable Product Bible that enables Project Zero-Loss to be:

- designed consistently,
- implemented safely,
- reviewed intelligently,
- maintained confidently,
- and expanded without losing its original vision.

Every capability specification should strengthen the platform's commitment to:

- customer trust,
- financial integrity,
- transparency,
- operational excellence,
- security,
- accessibility,
- maintainability,
- and long-term product quality.

Whenever uncertainty exists, implementation should favor clarity, safety, and documented business rules over convenience or assumption.

This document serves as the implementation standard for every capability specification contained within the Project Zero-Loss repository.

---

# Document Complete

This Capability Documentation Guide is the authoritative standard governing the creation, maintenance, review, and implementation of all capability specifications within Project Zero-Loss.

All future capability documents should follow the structure, principles, and governance established in this guide to ensure consistency across the platform.



