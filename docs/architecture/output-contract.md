# Project Zero-Loss Output Contract

## Required Delivery Format for Code, SQL, File Generation, and Founder Verification

This document defines the exact output format that Perplexity and any future coding AI must follow when generating implementation files for Project Zero-Loss.

It exists to guarantee that every delivery is:
- copy/paste ready,
- easy to save into Cursor,
- easy to review in Word,
- consistent across days,
- and clear enough for a non-technical founder to execute without confusion.

This file is not the product vision document.

This file is not the architecture spine.

This file defines how actual implementation output must be presented every time code or file content is delivered.

---

# 1. Core Rule

When asked to generate a file, script, route, migration, schema block, or implementation step, the AI must deliver the result in a predictable, structured format.

The AI must not output:
- fragmented snippets,
- partial files without warning,
- floating explanation paragraphs before the actual file,
- or vague pseudo-code when the founder asked for a real implementation block.

The output must be immediately usable.

---

# 2. The 3 Required Delivery Zones

Every code-delivery response must contain these 3 sections in order.

## Zone A — File Path Block

At the top of the response, the AI must print the exact target file path using this format:

**📂 TARGET PATH:** `app/api/example/route.ts`

This tells the founder exactly where the file belongs.

## Zone B — Copy/Paste Snippet Box

Immediately after the target path, the AI must provide one complete code block containing the full contents of the file from line 1 to the end.

Rules for this zone:
- one file per code block unless explicitly stated otherwise,
- no missing top imports,
- no omitted closing braces,
- no “rest of code here” shortcuts,
- no placeholder comments pretending to be final code,
- and no splitting a single file across multiple disconnected code boxes unless absolutely necessary.

## Zone C — Non-Technical Action Check

At the bottom, the AI must provide a short founder-friendly checklist explaining:

1. where to paste the file,
2. what to run or click next,
3. and how to verify that the file is working correctly.

This section exists so the founder can move forward without guessing.

---

# 3. Standard Output Order

Unless explicitly instructed otherwise, the output order should be:

1. `📂 TARGET PATH`
2. complete code/file block
3. short implementation notes only if necessary
4. founder verification checklist
5. proceed line when part of a day-by-day roadmap

The AI should not bury the actual file underneath large introductions.

---

# 4. Code Completeness Rule

If the founder asks for a file, the AI must provide a complete file, not a teaching fragment.

A complete file means:
- proper imports,
- proper exports,
- proper function wrappers,
- proper schema qualification where required,
- proper typing where required,
- and fully closed syntax.

If the response is not a complete file, the AI must explicitly label it as:

**Partial Example Only**

If it is intended to be a final deliverable, it must be complete.

---

# 5. Project-Specific Hardening Rule

For this project, generated technical output should default to the hardened implementation style already established in the architecture and operating docs.

That means AI-generated implementation should automatically prefer:
- server-side execution for sensitive logic,
- `@supabase/ssr` patterns for authenticated server utilities,
- `supabase.auth.getUser()` for trusted server identity verification,
- `public.` schema qualification where appropriate,
- append-only / auditable financial writes,
- idempotency for payment and webhook logic,
- and migration-safe database evolution.

The founder should not have to re-argue those rules every time.

---

# 6. SQL Output Rule

When generating SQL for this project, the AI must aim for production-safe clarity rather than cleverness.

SQL output should:
- be copy/paste ready,
- use explicit schema references such as `public.`,
- include function signatures clearly,
- use `set search_path = public` where appropriate for functions,
- and avoid vague placeholders in important logic.

If a SQL file includes a function, trigger, table, view, or policy, the AI should make the object names explicit and readable.

If a migration assumes a prerequisite object already exists, the AI should say so clearly.

---

# 7. TypeScript / Next.js Output Rule

When generating TypeScript or Next.js files, the AI must produce code that matches the locked project stack.

That means output should align with:
- Next.js App Router,
- route handlers or server actions as appropriate,
- server/client separation,
- Supabase SSR patterns,
- and secure handling of auth and secrets.

The AI must not casually output patterns that belong to a different stack unless it explicitly says the file is only a conceptual example.

---

# 8. Explanation Rule

The AI may include brief explanations, but explanations must not get in the way of delivery.

If explanation is needed, it should be:
- short,
- placed after the code block or in the checklist,
- and focused on what the founder needs to know to use the file.

The AI should not lecture before delivering the file.

---

# 9. Verification Rule

Every implementation response must include a short verification checklist tailored to the actual file.

Good verification includes things like:
- which page should load,
- what database row should appear,
- which API response should return,
- what status should change,
- what UI element should become visible,
- or what table/query should prove success.

The checklist must not be vague.

Bad example:
- “Test that it works.”

Good example:
- “Open `/account` and confirm the split balance cards render.”
- “Check `public.wallet_transactions` and verify one new `BUYOUT_REFUND` row exists for each eligible loser.”
- “Trigger the Stripe webhook twice and confirm the second run produces no duplicate wallet credit rows.”

---

# 10. Multi-File Rule

If the founder asks for multiple files in one turn, the AI must keep them clearly separated.

Each file should have:
- its own `📂 TARGET PATH`,
- its own full code block,
- and its own small verification note if needed.

The AI must not merge multiple unrelated files into one confusing code block.

---

# 11. Day-by-Day Roadmap Rule

When a code response belongs to a roadmap day, the delivery must still respect the broader day format defined in `docs/ai_operating_rules.md`.

That means:
- the day structure can wrap around the code,
- but each implementation file inside that day must still follow this output contract.

The two standards must work together, not compete.

---

# 12. Word / Cursor Compatibility Rule

Because the founder often moves content between Word and Cursor, formatting must remain clean and durable.

That means:
- clean markdown headings,
- standard fenced code blocks,
- consistent spacing,
- no exotic formatting,
- and no weird nesting that breaks copy/paste behavior.

The AI should optimize for practical usability, not visual gimmicks.

---

# 13. Missing Information Rule

If the AI truly cannot generate a safe final file because a critical input is missing, it must say exactly what is missing.

But the AI should not overuse this rule.

If best practice can reasonably fill the gap, the AI should choose the strongest default and proceed.

Only block output when the missing input would materially change the implementation.

---

# 14. Final Output Standard

The final standard is simple:

Every technical delivery should feel like something a founder can:
- copy,
- paste,
- save,
- run,
- and verify

without having to reconstruct missing context or guess what the AI meant.

That is the required output contract for Project Zero-Loss.