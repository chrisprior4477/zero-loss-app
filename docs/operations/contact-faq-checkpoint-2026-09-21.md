# Contact, FAQ, and shorter help paths

## Approved scope

Replace the empty Contact and FAQ pages, make common account destinations faster to reach, and retain the existing site appearance. The owner confirmed there is no public contact email yet. No email address, phone number, response-time promise, job opening, or company story is invented. Legal pages and all How It Works experiences remain untouched. About, Careers, and Blog need a separate content decision.

## Delivered behavior

- Contact renders the existing SupportForm inline for signed-in customers. It writes through the same authenticated, idempotent `create_support_case` RPC into `support_cases` and append-only `support_case_events`; it does not create a second messaging store or financial authority.
- Recent conversations use an explicit authenticated customer filter plus existing RLS and link straight to the selected conversation. New messages invalidate Contact as well as Support and Notifications. Loading failures are distinct from an empty history.
- Signed-out visitors receive public answers and password recovery. Sign-in returns directly to `/contact#message`; the narrow existing auth allowlist also preserves this through signup and verification. Public email/contact for someone who cannot recover their account remains an operational gap until an official channel is selected.
- FAQ contains 21 current-MVP answers about entry quantities, Undo, purchase options, funding, rewards, identity preview, Crew, and help. Search and topic filters work in place; matching answers open automatically. Search prioritizes question matches and handles common apostrophes. Zero results offer recovery and Contact.
- Contact, FAQ, and the main customer Help Center have direct account shortcuts. One authorized ready reward skips the reward collection; one available purchase option skips the options list and opens its review, never payment submission. Multiple results retain a choice. Phone shortcuts fit in one compact row.
- Product suggestions reuse the existing Supabase-backed catalog request form inline. The FAQ shortcut opens the panel automatically without another click. The original product-request page is retained.
- No table migration, real payment, refund, reward issuance, or permission expansion is needed. Existing case access, repeat-request protection and value-change restrictions are reused.

## Verification

- Automated coverage: public FAQ availability without account services; Contact signed-in/out and environment gates; owner-filtered recent cases; accurate error states; authenticated return paths; exact singular reward/option links; multi-item fallback; FAQ search, topics, no-results recovery; product-panel direct-link opening; canonical support action and cache invalidation.
- Pre-publish full suite passed 543 tests across 74 files. TypeScript and changed-file lint passed after the final search-ranking assertion; the local production build passed before the last copy-neutral search/mobile refinements. The hosted production build is checked before handoff.
- Local browser: Contact sign-in kept the form destination; FAQ search opened matching answers, cleared/recovered from no results, and opened the inline product-request panel. Desktop and 390px phone layouts inspected; no horizontal overflow. No customer password entered or changed.
- No fake company information, demo-data resets, feature removals, or modifications to transaction authorization. Live post-publish message testing, if performed, is retained as a clearly labeled demo QA support case, not deleted as cleanup.
