# Project Zero-Loss Master Architecture

## System Spine, Technical Guardrails, Data Rules, and Implementation Standards

This document defines the permanent technical architecture for Project Zero-Loss.

It is the source of truth for:
- the stack,
- system boundaries,
- server/client responsibilities,
- authentication rules,
- wallet and ledger structure,
- schema and migration discipline,
- operational safety requirements,
- and the technical standards that every future roadmap day must respect.

This file is not the product vision document.

This file explains how the system must be built so the product vision can be delivered safely, consistently, and at enterprise grade.

---

# 1. Core Architecture Position

Project Zero-Loss is a web-only marketplace built on a modern server-first architecture that prioritizes security, auditability, replayability, and future operational control.

**UI/UX Direction Guardrail:** The customer-facing experience is an energetic, gamified marketplace. Server-side ledger integrity and database security are mandatory, but they must serve a UI that emphasizes high-visibility progress bars, interactive ticket counters, instant visual feedback, and gamified shopping mechanics derived from StockX, Temu, and DraftKings.

The system must not be built like a loose startup prototype where core financial truth lives in mutable counters, client payloads are trusted, and admin operations are improvised after launch.

The architecture must support:
- customer-facing commerce flows,
- wallet and rebate systems,
- pool-based sweepstakes logic,
- hostile takeover flows,
- real-time UX signals,
- auditability,
- future governance reporting,
- and a future internal admin interface.

---

# 2. Locked Stack

Unless explicitly superseded later, the technical stack is locked as follows:

- **Frontend framework:** Next.js App Router.
- **Language preference:** TypeScript for application code.
- **Styling:** Tailwind CSS.
- **Backend database:** Supabase Postgres.
- **Authentication:** Supabase Auth using server-side cookie-based auth flows with `@supabase/ssr`.
- **Deployment:** Vercel.
- **Payments:** Stripe Node.js SDK with PaymentIntents-oriented server-side flows.

This stack is chosen because it supports fast product iteration while still allowing strong server-side enforcement, structured database control, and future scaling.

---

# 3. System Shape

The application is a web-only system with three major layers:

## A. Customer Experience Layer

This includes:
- homepage,
- item pages,
- account/wallet views,
- checkout and funding flows,
- and future customer-visible status or activity interfaces.

## B. Application Logic Layer

This includes:
- server actions,
- route handlers,
- internal business logic,
- Stripe orchestration,
- balance derivation,
- entry purchasing,
- payout/refund/rebate handling,
- and future governance or workflow services.

## C. Data and Control Layer

This includes:
- Postgres tables,
- append-only transaction and event history,
- views,
- functions,
- policies,
- migration files,
- and future admin reporting structures.

The system should be designed so that core truth originates in the data and server layers, not in the browser.

---

# 4. Server vs Client Responsibility

## Server Owns Truth

The server is responsible for:
- identity verification,
- permission checks,
- balance derivation,
- entry purchase validation,
- financial writes,
- Stripe event handling,
- pool state transitions,
- hostile takeover eligibility,
- rebate generation,
- payout/refund logic,
- and any calculation that can affect money, permissions, or status.

## Client Owns Presentation

The client is responsible for:
- rendering UX,
- collecting user input,
- opening modals,
- showing loaders/toasts/progress states,
- and reflecting server-returned truth in a clean user interface.

## Hard Rule

The browser must never be treated as a trustworthy source for:
- user identity,
- balance truth,
- authorization,
- or any financially meaningful state.

---

# 5. Authentication Architecture

## Required Auth Model

Authentication must use the modern Supabase SSR approach with cookie-backed auth in Next.js App Router.

## Required Identity Verification Rule

On the server, identity must be verified using:
- `@supabase/ssr`-based server clients, and
- `supabase.auth.getUser()` for trusted user validation.

## Prohibited Server Pattern

Do not trust `getSession()` as the final source of user identity on the server when a secure identity check is required.

## Client Payload Rule

Frontend code must not pass plain-text user IDs to backend endpoints for privileged logic.

The backend must derive the acting user from verified auth context, not from request payload claims.

---

# 6. Wallet and Ledger Architecture

## Source-of-Truth Rule

Wallet balances must never rely on a single mutable integer balance column as the authoritative source of truth.

## Required Model

All wallet and wallet-like balances must be derived from immutable or append-only ledger rows such as `wallet_transactions` and related event structures.

## Balance Types

At minimum, the architecture must support separate balance classes such as:
- `PLAYABLE`,
- `REBATE`,
- and other explicitly typed financial buckets as the product expands.

## Derivation Rule

All displayed balances and all server-side decisions that rely on balance must be computed from ledger history via server-side derivation.

## Correction Rule

If a financial row is wrong, the platform should preserve the original record and append a correction event or offsetting transaction rather than mutating history in place.

This keeps financial truth auditable and easier to explain later.

---

# 7. Financial Event Discipline

Every money-moving action should map to explicit event types and/or transaction records.

At a minimum, the architecture must support durable recording of flows such as:
- wallet funding,
- wallet debit for entries,
- rebate credit creation,
- rebate application,
- payout,
- refund,
- hostile takeover debit,
- buyout dividend refund,
- subscription-related allocation,
- and any future promotional or support-credit distribution.

## Idempotency Rule

Any flow involving financial writes or webhook retries must be idempotent and duplicate-safe.

This is especially mandatory for:
- Stripe webhooks,
- wallet funding completion,
- payout/refund writes,
- and any automated compensation loop.

---

# 8. Pool and Item Separation

The system must maintain a structural distinction between:
- **items** as reusable product or retail asset templates, and
- **pools** as individual live drawing or offering instances.

This separation is important because:
- the same item may appear in many pools over time,
- pools have live state and capacity,
- items describe the asset,
- and future reporting/admin tools need both reusable asset logic and per-instance event history.

---

# 9. Hostile Takeover and Protected Asset Rules

The architecture must support conditional business logic for hostile takeover behavior.

## Required Rules

- Hostile takeover is not universally allowed.
- Protected or rare assets can be flagged so takeover actions are disabled.
- Eligible takeovers must apply premium pricing logic, financial recording, and compensation logic to affected pool participants.

## Design Rule

The database and service layer must make this logic explicit, not hidden in brittle frontend conditions.

---

# 10. Rebate and Expiration Architecture

The architecture must support time-bounded rebate/store-credit behavior for non-winning outcomes.

This means the system should be capable of storing and/or deriving:
- source event,
- linked user,
- linked item or pool context,
- issue time,
- expiration time,
- remaining usable value,
- and final redemption or expiry outcome.

Users must later be able to see this cleanly in the account experience, and admins must be able to audit it clearly.

---

# 11. Database Schema Discipline

## Explicit Schema Rule

Schema design must favor explicit columns, typed states, and traceability over hidden convenience logic.

## Audit Metadata Rule

Important operational tables should include metadata that makes future admin tooling possible, such as:
- created timestamps,
- updated timestamps where appropriate,
- actor/source markers,
- reason or note fields where needed,
- foreign key references,
- and status/state fields that are meaningful for both operations and UI.

## Replayability Rule

The database should be able to explain what happened later, not just store the current result.

---

# 12. Schema Migration Discipline

## Migration Rule

Schema changes must be managed through version-controlled migration files, not random production dashboard editing.

## Local Workflow Rule

Major schema changes should be created, applied, and tested through a repeatable local development workflow before being promoted.

## Rebuildability Rule

The project should be able to recreate its schema state from source-controlled migrations and code.

This reduces hidden drift between environments and protects the project from “works in prod but no one knows how we got here” failure modes.

---

# 13. Row-Level Security and Secret Handling

## RLS Rule

Supabase Row-Level Security should be treated as a core boundary, not as optional decoration.

## Secret Handling Rule

Service-role keys, Stripe secrets, and other privileged credentials must remain server-side only.

## Client Safety Rule

The browser may use the public/anon key where appropriate under RLS, but privileged workflows must still be enforced on the server.

---

# 14. API and RPC Philosophy

The system should prefer clear, hardened backend entry points over loose direct client mutation patterns.

That means using:
- route handlers,
- server actions where appropriate,
- Postgres functions/RPCs where transactional integrity is important,
- and structured backend orchestration for sensitive workflows.

## Preferred Behavior

Critical business operations should:
- validate identity on the server,
- validate inputs strictly,
- open a transaction where appropriate,
- write durable records,
- return explicit success/error results,
- and leave enough audit evidence for later tracing.

---

# 15. Real-Time and UX Signaling Architecture

The frontend vision includes real-time or near-real-time elements such as:
- pool fill progress,
- live tickers,
- urgency indicators,
- balance updates,
- and visible activity/state changes.

These signals may be delivered through views, polling, realtime subscriptions, or a mix of approaches over time, but they must always be subordinate to server truth.

The architecture should never trade correctness for superficial animation.

---

# 16. Admin-Future Design Rule

Every important data system must be designed with future admin GUI usage in mind.

This means the backend should support future screens for:
- user account inspection,
- wallet history,
- rebate history,
- pool lifecycle review,
- takeover review,
- refund/payout audit,
- voucher tracing,
- support incident handling,
- governance metrics,
- and release-control visibility.

The admin layer is not an afterthought. It is part of the architecture from day one.

---

# 17. Release, Alerting, and Rollback Thinking

For any operationally important feature, architecture planning should include:
- detection,
- alerting,
- rollback or neutralization strategy,
- and post-event auditability.

This is especially true for:
- financial logic,
- payment flows,
- identity/auth changes,
- pool lifecycle transitions,
- and governance/state-control features.

The system should be designed so operational mistakes can be understood and corrected without destroying history.

---

# 18. Documentation and Architecture Governance

Important architecture choices should be documented and preserved rather than silently reinvented later.

For this project, “frozen” means:
- baseline-locked,
- official working direction,
- and changeable only by explicit clarification, expansion, correction, or superseding decision.

The architecture should evolve through explicit decisions, not through accidental drift.

---

# 19. Implementation Standard for Future Roadmap Days

Every future roadmap day must respect this architecture file.

If a later day proposes something that conflicts with:
- server-side identity validation,
- ledger-derived balances,
- migration discipline,
- replayable financial truth,
- or admin-future design,

then the day is wrong unless the architecture is explicitly superseded.

This file sits above day-by-day implementation convenience.

---

# 20. Final Architecture Rule

When choosing between convenience and structural safety, choose structural safety unless there is a strong product reason not to.

Project Zero-Loss should be built like a system that expects:
- money movement,
- customer disputes,
- scale,
- admin oversight,
- model-assisted coding,
- and future operational scrutiny.

That means the architecture must remain explicit, replayable, server-verified, auditable, and capable of supporting both the customer product and the future internal control layer.