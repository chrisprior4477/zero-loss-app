# Project Zero-Loss — Core Principles

**Purpose of this file:** give any AI assistant joining this project (Claude, ChatGPT, Cursor, or otherwise) the working context that isn't captured by reading the specs alone — why the repository is built the way it is, and what mistake pattern to actively avoid repeating.

---

## 1. Where this project has been

This documentation set went through several complete rewrites before reaching its current state. The recurring failure mode across those attempts was **documentation substituting for execution**: each time a gap was found, the instinct was to write another document, another standard, another governance layer — rather than to build and let real implementation reveal what was actually missing.

The project explicitly named this pattern and broke it. The operating rule going forward:

> **The default action is to build. Documentation is created only when implementation reveals a genuine gap that blocks or materially risks the build — not because a gap might theoretically matter someday.**

If you are an AI assistant and you find yourself about to propose a new document, new standard, or new governance layer, apply this test first: **would the current implementation task actually fail without it?** If the honest answer is "no, but it would be nice," do not create it. Note it, and move on.

## 2. The one exception to "just build"

A new ADR (Architecture Decision Record) or new specification is warranted only when **all** of the following are true:

1. A major architectural decision is actively being made.
2. At least two credible alternatives exist.
3. The choice is expensive or difficult to reverse.
4. The rationale will not be obvious from the governing specification.
5. A future engineer would reasonably ask "why not the other option."

Routine implementation choices — using the Ledger, treating Wallet as a projection, following an already-approved pattern, a normal API endpoint, a database index — do not qualify. Those belong in code and code review, not in a new document.

## 3. The financial and fairness invariants are not up for reinterpretation

Every one of these has been independently verified across multiple architecture passes. They are not open questions:

- The Ledger is the sole authoritative financial record. Everything else — Wallet, Pools, Payments — references it or writes to it through approved interfaces. Nothing maintains a competing total.
- Balances are always derived from ledger history, never stored as a single mutable number.
- Corrections are additive (new compensating entries), never destructive edits to history.
- Identity is verified server-side via `supabase.auth.getUser()`. The client is never trusted for identity, balance, or authorization.
- Winner selection is server-side only, uses cryptographically secure randomness, runs against a frozen eligible-entry population, and produces exactly one authoritative result per Pool. `Math.random()` and equivalents are prohibited without exception.
- Every financial write is idempotent — retried webhooks, repeated requests, and concurrent attempts must never duplicate a financial effect.

If any implementation task seems to require relaxing one of these, that is a signal to stop and raise it explicitly — not a signal that the rule has an implicit exception.

## 4. Domain ownership is real, not aspirational

`docs/architecture/domain-ownership-matrix.md` defines who owns what. The pattern used throughout this repository — and the one to keep using — is: **one domain decides, every other domain only consumes or references.** Pools decides participation outcomes; it never touches financial records. Ledger decides financial truth; nothing else maintains a parallel total. Identity decides who someone is; nothing else re-derives that. When a new capability is added, it should say explicitly what it does and does not own, following this same shape.

## 5. Multi-model review is a strength, not a formality

This project has been reviewed by more than one AI system at different stages (architecture review, safety-critical document audit, implementation-readiness audit), with disagreements between reviewers resolved by explicit rule: **the repository's documented hierarchy governs; where the hierarchy doesn't resolve it, the founder's decision is authoritative.** No AI's recommendation becomes true just because it was made. Where a reviewer flags something, check it against the actual repository before acting on it — a claim about what "was already fixed" or "already exists" should be verified by looking, not assumed from a prior summary.

## 6. Current phase

As of the last status update, the project is in **Implementation Readiness**, transitioning into active building of a narrow vertical slice: registration → authenticated session → catalog item retrieval → Pool/Sweepstakes visibility → Entry Request → server-side eligibility validation → financial prerequisite handling → Entry creation → audit/event output. See `PROJECT_STATUS.md` for the authoritative, current statement of phase — this file describes the reasoning behind the phase, not the phase itself, and will go stale faster than that one does.