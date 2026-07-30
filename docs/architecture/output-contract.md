# Project Zero-Loss Output Contract
## AI Delivery Standards for Code, SQL, Documentation, and Implementation Output

**Version:** 1.1  
**Status:** Authoritative  
**Document Type:** Delivery Governance Standard

---

# Purpose

This document defines the mandatory delivery format that every AI assistant working on Project Zero-Loss must follow when producing implementation work.

It governs **how implementation is delivered**, not **what the application does**.

Its purpose is to ensure every response is:

- production-ready,
- architecturally consistent,
- copy/paste friendly,
- easy to review,
- easy to verify,
- compatible with Cursor and Word,
- and understandable by a non-technical founder.

This document complements—but does not replace—the following authoritative documents:

- Master Architecture
- AI Operating Rules
- Product Vision
- Architecture Decision Records (ADRs)
- Product Specifications
- Operations Specifications

---

# 1. Core Delivery Principle

Every implementation response should minimize uncertainty.

The founder should be able to:

- understand it,
- save it,
- copy it,
- paste it,
- execute it,
- and verify it

without reconstructing missing information.

The AI must optimize for implementation clarity rather than conversational style.

---

# 2. Delivery Hierarchy

When producing implementation output, the AI must follow this order of authority.

1. Explicit founder instruction
2. Master Architecture
3. Approved ADRs
4. Product Vision
5. AI Operating Rules
6. Output Contract (this document)
7. Product Specifications
8. Operations Specifications
9. Capability Specifications
10. Roadmap Documentation
11. Engineering best practices

Higher-authority documents always override lower-authority formatting preferences.

---

# 3. Complete Delivery Rule

Unless explicitly requested otherwise, every implementation response should be complete.

Complete means the founder should not need to invent or reconstruct missing sections.

Examples include complete:

- source files,
- SQL migrations,
- configuration files,
- API routes,
- components,
- server actions,
- utilities,
- schemas,
- documentation,
- and deployment instructions.

The AI must never disguise an incomplete implementation as a finished deliverable.

---

# 4. Standard Response Structure

Technical implementation responses should follow a consistent structure.

Whenever practical, responses should appear in this order:

1. Target Path
2. Complete implementation
3. Brief implementation notes (only if necessary)
4. Founder verification checklist
5. Next implementation step (when appropriate)

The implementation itself should always be the primary focus.

---

# 5. Target Path Rule

Whenever the AI generates a project artifact, it must clearly identify its destination.

Examples include:

**📂 TARGET PATH:** `app/api/payments/webhook/route.ts`

**📂 TARGET PATH:** `lib/supabase/server.ts`

**📂 TARGET PATH:** `supabase/migrations/20260715_create_wallet_tables.sql`

**📂 TARGET PATH:** `.env.local`

The founder should never need to guess where generated content belongs.

---

# 6. Complete File Rule

When generating a file, the AI must provide the complete file from beginning to end.

Complete files include:

- imports,
- exports,
- interfaces,
- types,
- wrappers,
- validation,
- configuration,
- error handling,
- and valid syntax.

The AI must not use misleading shortcuts such as:

- "rest of file omitted"
- "existing code unchanged"
- "add your implementation here"
- "continue previous logic"
- placeholder comments that imply completion

If an example is intentionally incomplete, it must be explicitly labeled:

**Partial Example Only**

---

# 7. Copy-and-Paste Rule

Generated implementation should require minimal editing before use.

The AI should avoid requiring the founder to manually assemble multiple disconnected fragments into a usable implementation.

Whenever practical:

- one file should equal one code block,
- one migration should equal one SQL block,
- one configuration file should equal one configuration block.

The goal is immediate usability.

---

# 8. Multi-File Delivery Rule

When multiple files are requested, each file must remain independent.

Each generated file should include:

- its own target path,
- its own implementation,
- its own verification checklist,
- and any file-specific notes.

Unrelated files should never be merged into a single implementation block.

---

# 9. Explanation Rule

Implementation comes before explanation.

The AI may include brief explanations when they improve understanding.

Explanations should be:

- concise,
- implementation-focused,
- technically accurate,
- and positioned after the implementation whenever practical.

The AI should avoid lengthy introductions that delay delivery.

---

# 10. Founder Verification Rule

Every meaningful implementation should conclude with a verification checklist.

Verification should explain:

- what to do next,
- where to navigate,
- what to expect,
- what visible evidence confirms success,
- and what operational behavior should occur.

Verification should be objective rather than vague.

Good verification confirms observable outcomes rather than subjective impressions.

---

# 11. Roadmap Compatibility Rule

When implementation is generated as part of a roadmap day, this Output Contract remains fully applicable.

Roadmap structure may wrap around implementation.

However, every generated implementation artifact must still follow the delivery standards defined within this document.

The roadmap and Output Contract work together as complementary standards.

---

# 12. Documentation Delivery Rule

Documentation files should follow the same quality expectations as implementation files.

Documentation should be:

- complete,
- internally consistent,
- well structured,
- clearly versioned,
- and aligned with the repository hierarchy.

Documentation should never contain unresolved placeholders presented as final content.

# 13. SQL Delivery Rule

All SQL generated for Project Zero-Loss should be production-ready.

SQL output should prioritize:

- clarity,
- explicitness,
- auditability,
- migration safety,
- and long-term maintainability.

SQL should avoid unnecessary shortcuts or hidden assumptions.

Whenever appropriate, SQL should include:

- explicit `public.` schema qualification,
- clearly named database objects,
- deterministic migration behavior,
- readable formatting,
- and transaction-safe operations.

If a migration depends on an existing object, the dependency should be identified clearly.

---

# 14. TypeScript Delivery Rule

TypeScript should align with the approved project architecture.

Generated files should be compatible with:

- Next.js App Router,
- modern TypeScript,
- server-first architecture,
- Supabase SSR,
- PostgreSQL,
- Stripe,
- and documented project conventions.

The AI should avoid introducing patterns from unrelated frameworks unless explicitly requested.

---

# 15. Security Output Rule

Generated implementation must default toward secure behavior.

Whenever practical, implementation should favor:

- server-side execution,
- authenticated requests,
- trusted identity verification,
- authorization checks,
- input validation,
- secure secret management,
- and least-privilege access.

Security-sensitive operations should never depend solely upon browser logic.

---

# 16. Financial Output Rule

Any implementation affecting money must preserve financial integrity.

Generated implementation should naturally support:

- append-only ledger history,
- idempotent processing,
- immutable financial events,
- reconciliation,
- transaction safety,
- audit logging,
- and deterministic balance calculation.

The AI must never recommend directly modifying calculated balances.

Balances should always derive from authoritative financial records.

---

# 17. Database Migration Rule

Database migrations should be deterministic and repeatable.

Migration output should:

- perform one clear responsibility,
- avoid hidden side effects,
- preserve existing production data,
- support rollback planning where appropriate,
- and follow established naming conventions.

Migrations should never silently modify business behavior without corresponding documentation updates.

---

# 18. API Delivery Rule

API endpoints should follow the project's architectural standards.

Generated APIs should clearly define:

- request validation,
- authentication,
- authorization,
- response structure,
- error handling,
- logging,
- and expected HTTP status codes.

Business logic should remain on the server.

Sensitive processing must never rely upon client-side enforcement.

---

# 19. UI Delivery Rule

Frontend implementation should reinforce the product experience defined in the Product Vision.

Generated UI should prioritize:

- responsiveness,
- accessibility,
- consistency,
- visual clarity,
- and user confidence.

Interactive components should communicate system state clearly while avoiding misleading or ambiguous behavior.

---

# 20. Error Reporting Rule

Generated implementations should provide useful operational diagnostics.

Errors should:

- preserve security,
- avoid exposing sensitive information,
- assist troubleshooting,
- and maintain system stability.

User-facing messages should remain understandable while internal logs provide sufficient technical detail for investigation.

---

# 21. Verification Standard

Every implementation should include meaningful verification guidance.

Verification should identify:

- expected application behavior,
- affected database records,
- expected API responses,
- visible UI changes,
- background processing,
- and any operational confirmation steps.

Verification should enable objective confirmation that implementation succeeded.

---

# 22. Configuration Rule

Configuration should remain centralized.

The AI should avoid scattering configurable business behavior throughout implementation.

Whenever practical, configurable values should include:

- feature flags,
- environment variables,
- application configuration,
- operational limits,
- business thresholds,
- and deployment settings.

Configuration should remain separate from business logic.

---

# 23. Documentation Synchronization Rule

Whenever generated implementation introduces new functionality, the AI should identify documentation requiring updates.

Implementation and documentation should evolve together.

This includes:

- architecture,
- ADRs,
- capability specifications,
- operations documentation,
- roadmap documentation,
- and implementation manuals where applicable.

Repository consistency is considered part of successful delivery.

---

# 24. Consistency Rule

Implementation responses should remain consistent across the entire project.

Consistency includes:

- naming conventions,
- formatting,
- documentation structure,
- code organization,
- validation approaches,
- logging practices,
- and architectural terminology.

The founder should experience predictable output regardless of feature area.

# 25. Missing Information Rule

The AI should generate complete implementation whenever reasonable defaults exist.

Implementation should only be blocked when missing information would materially affect:

- security,
- financial integrity,
- legal compliance,
- data correctness,
- or architectural consistency.

When blocking is necessary, the AI must clearly identify:

- what information is missing,
- why it matters,
- what assumptions cannot safely be made,
- and what decision is required from the founder.

The AI should never ask unnecessary clarification questions when established project standards already provide an appropriate default.

---

# 26. AI Consistency Rule

All approved AI assistants working on Project Zero-Loss should produce implementation that is functionally consistent.

Regardless of whether implementation is produced by:

- ChatGPT,
- Cursor,
- Gemini,
- Claude,
- or future approved AI systems,

responses should follow the same:

- architecture,
- documentation standards,
- formatting,
- implementation quality,
- terminology,
- and delivery structure.

The repository—not the individual AI—is the permanent source of truth.

---

# 27. Cursor Compatibility Rule

Implementation should integrate cleanly into Cursor.

Generated files should:

- preserve valid formatting,
- avoid unnecessary markdown surrounding code,
- use stable code fences,
- include accurate target paths,
- and remain easy to save directly into the repository.

Output should require minimal cleanup before becoming part of the codebase.

---

# 28. Word Compatibility Rule

Because project planning is maintained in Microsoft Word as well as the repository, implementation responses should remain durable when copied between environments.

Formatting should emphasize:

- clean headings,
- predictable spacing,
- standard markdown,
- readable tables when appropriate,
- consistent code fences,
- and simple layouts.

Formatting should survive copy-and-paste without losing readability.

---

# 29. Documentation Quality Rule

Generated documentation should be treated with the same quality expectations as production code.

Documentation should be:

- complete,
- internally consistent,
- technically accurate,
- version controlled,
- easy to navigate,
- and aligned with repository conventions.

Documentation is a permanent project asset and should not be considered temporary supporting material.

---

# 30. Response Quality Rule

Every implementation response should be evaluated against five quality standards.

The response should be:

1. Correct
2. Complete
3. Consistent
4. Verifiable
5. Maintainable

If one of these qualities is missing, the implementation is considered incomplete.

---

# 31. Founder Experience Rule

The AI should reduce cognitive load for the founder.

Implementation should answer practical questions before they become obstacles.

Where appropriate, responses should clearly communicate:

- what was created,
- where it belongs,
- why it exists,
- what happens next,
- and how success is verified.

The founder should spend time making product decisions—not deciphering implementation details.

---

# 32. Continuous Improvement Rule

As Project Zero-Loss evolves, the AI should continuously improve implementation quality while preserving approved architectural decisions.

Improvements should strengthen:

- readability,
- maintainability,
- consistency,
- security,
- scalability,
- documentation quality,
- and operational excellence.

Continuous improvement must never introduce undocumented architectural changes.

---

# 33. Repository Integrity Rule

Every generated implementation should strengthen the repository as the project's single source of truth.

The AI should avoid producing work that exists only within conversation history.

Whenever implementation changes project behavior, corresponding repository documentation should also remain accurate.

The repository should always represent the current state of the platform.

---

# 34. Final Delivery Standard

Every implementation produced for Project Zero-Loss should feel production-ready.

The founder should be able to:

- review it,
- understand it,
- copy it,
- paste it,
- save it,
- commit it,
- execute it,
- and verify it

without reconstructing missing logic, searching for omitted sections, or guessing the AI's intent.

Every response should reinforce the architecture, preserve customer trust, protect financial integrity, and move the project measurably closer to production.

That is the required Output Contract for every AI contributing to Project Zero-Loss.

