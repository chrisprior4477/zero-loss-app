# Project Zero-Loss — Master Index

**Purpose:** one page that lists every document in this repository exactly once, with a single-sentence description, so no contributor or AI assistant has to reconstruct the documentation map by reading twenty files' cross-references.

**Status column key:** `Active` = current and authoritative. `Planned` = referenced by other documents but not yet written; do not assume its contents. `Reference` = supporting material, not itself a source of authority.

This index is descriptive, not authoritative — if it disagrees with a document's own content, the document wins. Update this file whenever a document is added, renamed, or removed.

---

## Root

| Document | Description | Status |
|---|---|---|
| `PROJECT_STATUS.md` | Current implementation phase, what's frozen, what's deferred, and what to work on next. Read this first. | Active |
| `README.md` | Standard project readme (setup/run instructions). | Active |
| `AGENTS.md` | Next.js-version warning for coding agents; points to `node_modules/next/dist/docs/` for framework specifics. | Active |
| `CLAUDE.md` | Placeholder — currently empty. | Planned |

## `docs/architecture/` — System Design and Governance

| Document | Description | Status |
|---|---|---|
| `master-architecture.md` | The technical constitution: stack, server/client boundary, ledger/wallet model, RLS, migration discipline. Highest authority for implementation questions. | Active |
| `domain-ownership-matrix.md` | Defines exactly one authoritative owner per business concept (Pools, Ledger, Wallet, Catalog, Identity, Membership, etc.) and what each must never own. | Active |
| `domain-event-catalog.md` | Canonical business event names across the platform; the single place to check before naming a new event. | Active |
| `enterprise-data-dictionary.md` | Canonical entity definitions (Customer, Pool, Entry, Draw, Winner, Prize, Fulfillment, etc.) with owner, identifier format, and invariants. Does not yet include Ledger, Wallet, or Catalog entities — see open item below. | Active (partial coverage — see open items) |
| `enterprise-glossary.md` | Plain-language term definitions supporting the Data Dictionary. | Reference |
| `ai-operating-rules.md` | How AI assistants should structure implementation output (target paths, complete files, verification steps) for this project. | Active |
| `output-contract.md` | Required delivery format for generated code/SQL/files. | Active |
| `api-design-standards.md` | API design conventions (routes, request/response shape, versioning). | Active |
| `database-design-standards.md` | Schema and migration conventions. | Active |
| `event-schema-standards.md` | Structural rules for event payloads referenced by the Event Catalog. | Active |
| `integration-architecture.md` | Cross-service/integration patterns. | Active |
| `security-architecture.md` | Platform-wide security requirements beyond individual capability specs. | Active |
| `observability-architecture.md` | Logging, monitoring, and alerting requirements. | Active |
| `performance-and-scalability-architecture.md` | Scaling posture and performance requirements. | Active |
| `deployment-architecture.md` | Deployment/release architecture (Vercel-based). | Active |
| `business-continuity-and-disaster-recovery-architecture.md` | BC/DR requirements. | Active |
| `data-governance-and-information-lifecycle-architecture.md` | Data retention, classification, and lifecycle rules. | Active |
| `testing-and-quality-architecture.md` | Platform-wide testing strategy and quality gates. | Active |
| `engineering-standards.md` | General engineering conventions underpinning the more specific engineering docs below. | Active |

## `docs/core/` — Product Vision

| Document | Description | Status |
|---|---|---|
| `product-vision.md` | The Zero-Loss philosophy, UX DNA, and customer promise — the "why" of the product. | Active |
| `product-concept.md` | Plain-English business model explanation, written to be readable by non-engineers. | Active |

## `docs/capabilities/` — Reusable Business Behaviors

| Document | Description | Status |
|---|---|---|
| `README.md` | How capability documents are structured, versioned, and governed. | Active |
| `pools-and-sweepstakes.md` | The cornerstone domain: Pool lifecycle, Entry management, cryptographically secure Winner Selection, Prize Processing, and their financial/ownership boundaries. | Active |
| `identity-and-profile.md` | Authentication, registration, session management, account status. | Active |
| `catalog.md` | Product/prize metadata, independent of pricing and financial records. | Active |
| `rewards-and-referrals.md` | Invite-a-friend growth mechanics — distinct from the Whale Tax/People's Pot mechanics described in Product Vision, which have no dedicated spec yet. | Active |
| `activity-history.md` | Read-only customer-facing timeline; explicitly not the financial ledger. | Active |
| `notifications.md` | Transactional message delivery; never authoritative for financial state. | Active |
| `communications.md` | Non-transactional messaging (marketing, education, announcements). | Active |
| `favorites.md` | Lightweight saved-item relationships; never affects odds, capacity, or balances. | Active |
| `wishlist.md` | Purchase-intent saved items and watch conditions; same non-financial guarantee as Favorites. | Active |
| `search.md` | Product/pool discovery search. | Active |
| `recommendations.md` | Personalized discovery; explicitly barred from influencing winner selection. | Active |
| `user-preferences.md` | Customer experience settings; explicitly barred from affecting odds, balances, or prize distribution. | Active |
| — | Membership (tiers, benefits, eligibility) is referenced in the Ownership Matrix but has no dedicated capability document yet. | **Planned** |
| — | Wallet and Ledger have no dedicated capability document; rules live in `master-architecture.md` and `payments-and-payouts-spec.md`. | **Planned / consolidated elsewhere** |

## `docs/product/` — Page-Level Specifications

| Document | Description | Status |
|---|---|---|
| `homepage-spec.md` | Public storefront layout, live ticker, product discovery grid. | Active |
| `item-page-spec.md` | Item detail page, pool participation panel, hostile takeover UI branching. | Active |
| `how-it-works-spec.md` | Public trust/explainer page. | Active |
| `account-wallet-spec.md` | `/account` command center: split-ledger balance display, active entries, past results. | Active |
| `design-system-spec.md` | Design tokens, components, accessibility (WCAG 2.2 AA) baseline. | Active |
| `marketing-ux-spec.md` | Marketing page and campaign UX patterns. | Active |

## `docs/operations/` — Internal Operations

| Document | Description | Status |
|---|---|---|
| `payments-and-payouts-spec.md` | Wallet funding, Stripe/webhook idempotency, payout/refund operational rules. | Active |
| `admin-portal-spec.md` | Non-engineer operations console: user, wallet, pool, and support investigation surfaces. | Active |
| `fraud-and-risk-spec.md` | Risk scoring, rule engine, investigation case management, enforcement actions. | Active |
| `support-status-spec.md` | User-facing status center and internal incident/diagnostics layer. | Active |
| `analytics-spec.md` | Event-driven measurement framework; explicitly not authoritative for financial data. | Active |
| `content-management-spec.md` | Homepage/marketing/help content publishing workflow. | Active |
| — | Sweepstakes Compliance (jurisdictional eligibility, official rules, void-where-prohibited) referenced but not yet written. | **Planned** |
| — | Financial Reconciliation (Ledger vs. payment-processor settlement) not yet written. | **Planned** |
| — | Configuration Management not yet written. | **Planned** |
| — | Marketplace Financial Rules (Whale Tax, People's Pot, Pay-It-Forward) not yet written. | **Planned** |

## `docs/engineering/` — Contributor and Process Standards

| Document | Description | Status |
|---|---|---|
| `coding-standards.md` | Language/style conventions, including rules for TODO/FIXME usage in code. | Active |
| `code-review-guidelines.md` | Standards for evaluating proposed changes before merge, including architectural-integrity and financial-correctness review criteria. | Active |
| `ci-cd-standards.md` | CI/CD pipeline requirements. | Active |
| `git-and-branching-strategy.md` | Branching model and commit conventions. | Active |
| `development-workflow.md` | Day-to-day contributor workflow. | Active |
| `definition-of-ready.md` | Criteria a task must meet before implementation starts. | Active |
| `definition-of-done.md` | Criteria a task must meet before it's complete (includes "no placeholder completion" rule). | Active |
| `technical-design-review-standard.md` | When/how a technical design review is required before implementation. | Active |
| `repository-structure.md` | Folder/file organization conventions for the codebase. | Active |

## `docs/roadmap/`

| Document | Description | Status |
|---|---|---|
| `day-1-master-manual.md` | Original Day 1 build manual (Next.js/Supabase/TypeScript skeleton, health-check route). | Active (historical) |

## Other

| Document | Description | Status |
|---|---|---|
| `docs/project-index.md` | Original documentation-hierarchy index. Some paths (payments/support specs) still say `docs/product/` where files actually live under `docs/operations/`. | Active (known path drift) |
| `docs/zero-loss-complete-reference.md` | Auto-generated concatenation of every document, for convenience search only. Not authoritative. | Reference |

---

## Known Open Items

1. Wallet and Ledger have no dedicated canonical document or Data Dictionary entity, despite being load-bearing for the vertical slice's "financial prerequisite handling" step.
2. Catalog has no canonical entity in the Enterprise Data Dictionary.
3. Membership is described with full ownership language in the Domain Ownership Matrix but has no capability document — treat as **Planned**, not built.
4. Four Phase 4 operations specs (Sweepstakes Compliance, Financial Reconciliation, Configuration Management, Marketplace Financial Rules) are referenced by other documents but not yet written.

None of these currently block the vertical slice (registration → session → catalog → pool visibility → entry request → eligibility → financial prerequisite → entry creation → audit/event output).