# Wallet checkpoint 1: account isolation

Date: 2026-09-14

## Latest: three-card overview and separate profile destination (2026-09-14)

Dashboard top row now contains Playable Balance, Your wallet, and My Zero Loss.
The drawer uses the same order with compact summaries above its activity list.
The saved photo is retained in a Your account navigation card alongside the
management shortcuts. `/account/profile` requires the existing authenticated
account context and hosts the unchanged photo editor; photo saves invalidate
both that page and the Dashboard. The header's saved-photo menu trigger remains.

One authorized digital prize links directly to its reward detail; zero or multiple
prizes link to the collection. Preview rewards remain explicitly non-redeemable.
The reference image's $100 was not imported. Current local balance is $0.00 from
the existing reader; activity counts come only from server-authorized activity.
Unavailable balance/activity/reward counts do not become zero. No migration,
ledger write, funding, outcome or issuance behavior was enabled in this UI pass.

Verification: all 81 application tests pass (15 files), TypeScript and scoped
ESLint pass, and the build includes the authenticated profile route. Browser
checks covered three equal 352 x 240 CSS-pixel desktop summaries, equal-width
mobile summaries at 390 x 844 with no horizontal overflow, drawer-to-reward
navigation closing the drawer, and opening/canceling the existing photo editor.
No profile photo was saved or replaced during verification. Database tests were
not rerun for this layout-only change. Stored lowercase `chris prior` is preserved.

## Latest: compact wallet shortcut and direct reward navigation (2026-09-14)

The Dashboard now has a normal-sized **Your wallet** link between the saved-photo
card and Playable Balance on desktop. The same compact link sits below the drawer
balance. Profile-photo code, ticket display, activity gallery, filters and other
drawer styling are unchanged in this pass.

- `/account/wallet` opens the authorized digital-prize collection.
- `/account/wallet?reward=nike-court-shot-shoes` opens the selected sample directly
  in a dedicated full page. Dashboard, My Zero Loss and drawer prize links bypass
  the old detail dialog. Old `?item=` prize links redirect to this destination.
- `/account/wallet?view=history` opens the existing authoritative snapshot and
  ledger history directly. Balance/transaction links retain this destination;
  the older product-demo Add funds link was retargeted without enabling funding.
- Reward selection filters only the authenticated account's server-provided
  activity. Unknown, malformed, non-reward or unauthorized selections disclose
  no reward. Failed reads remain unavailable; ordinary empty accounts have no
  sample prizes. Read-only sample capability is unchanged.

The redemption screen is **not issuance**. It contains a labeled non-redeemable
sample with no barcode, PIN, card number, token, supplier call, or credential.
Its product and $75 reward come from the existing authorized catalog fixture,
not a newly created wallet record. The shortcut badge counts digital-prize
items, separately from the still-open entry ticket. Future fulfillment must
replace this read-only sample adapter with owner-scoped issued-reward records
and the supplier's supported redemption format. No financial interface or
database authorization was relaxed to make this navigation work.

Verification: 76 application tests passed, TypeScript and scoped ESLint passed,
and the optimized Next build passed. Tests cover direct links, legacy redirects,
anonymous/normal-account/invalid selections, collection filtering, drawer close,
and unavailable-versus-zero history rendering. The account reader is mocked in
route unit tests; these are not new database or supplier integration tests.
An unauthenticated local reward request also returned HTTP 307 to `/login`.
Browser checks used the existing authenticated local session: Dashboard-to-prize,
Dashboard-to-wallet, wallet section links, and drawer-to-prize all worked. At
390 x 844 the redemption area is visible without an extra reveal action, with no
horizontal overflow. Drawer reverse-Tab wrapping and Escape focus return worked.
Desktop sizing was restored and both local views were left open for review.

The local dev server reflected these working-tree changes after reload; no new
server, deployment or environment switch was needed. No DB migration/test rerun,
wallet enrollment, ledger write, funding, outcome or issuance was performed.
Earlier database-test evidence below remains historical evidence. The legacy
product participation mockup's separate hardcoded balance remains outside this
pass, as previously documented. No Git commit, push or deployment was performed.

## Latest desktop layout refinement (2026-09-14)

Per the user's supplied gallery reference, `ActivityRows` now presents four
side-by-side product cards at desktop widths (1024px and above) on both Account
Dashboard and My Zero Loss. Below that breakpoint the existing list treatment
remains. The separate hamburger drawer is untouched. Card images are larger,
full catalog names wrap rather than truncate, and purchase options retain both
the remaining amount and the amount already applied. The existing filters,
counts, server-authorized data source and modal detail links are unchanged.
No new financial behavior or data was introduced. All 64 application tests pass;
the added regression covers filter counts, full names, links and purchase math.

## Latest UI follow-up: activity-first Dashboard (2026-09-14)

At the user's request, `/account` now puts a compact saved-profile/wallet summary
above the latest four activity rows. Orders, Notifications and Security are small
navigation cards below. Personal information remains in a collapsed section.
The saved photo and its working adjustment/editor flow are preserved; no profile
values or name capitalization were rewritten. The reviewer name remains the
stored lowercase legal-name fallback because their display name is missing.

`ActivityRows` shares product names, images, statuses, amounts and whole-row links
between the Dashboard and My Zero Loss. Selection opens a native modal side panel
on desktop and a full-width panel on mobile. `ActivitySelection` resolves only
against the server-authorized activity list. Query strings do not grant preview
access. Dashboard selection stays on `/account?item=...`; full-list selection
preserves its filter. Closing removes selection and retains the originating page.
The older below-list detail section and hash-scroll behavior are replaced.

Every panel includes preview context, the relevant product information, and an
explicitly disabled action. Digital rewards do not invent barcodes. Completion
details show exact-product price, amount applied and remainder, with availability
not checked. They do not create transferable credit or imply a payment is owed.

The approved hamburger drawer's layout was not edited in this follow-up. Its
existing activity links now open the same detail panel on My Zero Loss. Its photo
trigger, ticket and account-navigation shortcuts remain intact. Native modality
makes the page behind details inert; explicit Tab wrapping, Escape/X close,
restored focus and a keyboard-scrollable content region support navigation.

Verification: all 63 application tests passed, TypeScript and scoped ESLint passed,
and an optimized Next build passed. Browser checks opened all four product rows,
confirmed $100/$1/$99 and $400/$1/$399 math, checked the digital-reward disclosure,
and exercised Escape/X, Tab wrapping, drawer-to-detail navigation and responsive
390 × 844 rendering with no horizontal overflow. No database migration, enrollment,
financial write, funding enablement, reward issuance, commit or deployment occurred.
The earlier database test results below are retained evidence from checkpoint one;
database tests were not rerun for this presentation-only follow-up.

Latest screenshots are listed at the top of `wallet-checkpoint-1-screenshots.md`.
This remains a human-review gate, not permission to begin signed demo funding.

## Current review gate: shared customer pages (2026-09-14)

Checkpoint one is implemented locally and awaiting mandatory human review.
No commit, push, merge, Vercel deployment, enrollment, funding, entry purchase,
outcome selection or reward issuance was performed in this interface pass.
The sections below this update retain the earlier database-checkpoint record;
this update supersedes their older route-specific visual-preview description.

### Environment and financial boundary

The local application still uses the confirmed development/test Supabase project
`zero-loss-app`, reference `ocgdfnvvjvutevgqzzgj`. The user confirmed its accounts
are test accounts. Post-test inspection: four accounts, two saved photos, zero
wallet rows, zero ledger postings, zero funding sessions and zero enrollments.
The eventual production database must remain separate. Do not reset/delete users
as an accounting cleanup strategy.

No migration was created, changed or reapplied in this interface pass. Existing
checkpoint migrations `20260914120000` and `20260914130000` remain installed.
`get_wallet_snapshot()` remains authenticated-only, owner-scoped and stable;
direct ledger access remains RLS-filtered. Its SECURITY DEFINER implementation
uses explicit `auth.uid()` ownership checks rather than relying on RLS that its
owner bypasses. Cross-account/anonymous tests passed again.

### Routes and shared components

Discovered: `/account`, `/account/wallet`, dynamic `/account/[section]`, and the
protected `/account/preview/[section]` layout/page. Normal entry destinations were
placeholders; preview destinations were separately styled placeholders.

- `/account` is now Account Dashboard / Your account. Profile, photo editor,
  email confirmation, wallet summary, shortcuts and personal information remain.
  The previously inert Edit profile button is now honest explanatory text;
  the working photo editor was not altered.
- `/account/wallet` is Wallet & Transactions with a reusable `WalletOverview`.
  It renders only existing posted ledger rows. No invented pending, refund,
  reversal or reconciliation status is shown. Existing REFUND/CORRECTION rows
  can be displayed, but this is not a refund workflow.
- New explicit `/account/entries` is My Zero Loss, overriding the prior dynamic
  placeholder. Filters: All, Still Open, You Won, Complete Purchase, Completed.
  `/account/entries?filter=active` is the ticket destination everywhere.
  Item links select only from the server-authorized list, never load fixtures
  from a URL slug. Completion details show exact-product price, applied amount,
  remaining amount and explicitly unverified availability. No payable action.
- `/account/orders`, `/account/notifications`, `/account/security` remain existing
  destinations. They now disclose unimplemented activity rather than claiming
  verified/empty records that were never queried. Security confirmation reflects
  the authenticated account, not an unconditional "verified" label.
- Old preview routes are retained and still protected. Their placeholder UI and
  destination metadata remain duplicated for now; links lead to the shared
  replacements. No customer drawer shortcut points to those old routes.

`getAccountContext` is a request-scoped, server-only reader for authenticated
identity, own profile, authoritative wallet snapshot and read-only capability.
Header, drawer, Dashboard, Wallet and My Zero Loss share it. `activity.ts` provides
common status/action/filter/link definitions. `drawer-state.ts` now keeps catalog
examples server-only, selected by verified capability rather than pathname.
The drawer and full-page activity use the same DTO and active count.

There is no entry lifecycle table/writer yet. Ordinary zero activity is the
supported empty checkpoint state with a successful empty wallet snapshot, not a
claim that entries are already implemented. A failed or unsupported nonempty
source displays unavailable instead of inventing an entry count. Checkpoint three
must replace that conservative empty reader with actual owner-scoped activity.

### Read-only permission, not wallet enrollment

Only the operator with server configuration access can change the allowlist.
The ignored local `.env.development.local` now documents these explicit gates:

- `INVESTOR_PREVIEW_ENABLED=true`
- `APP_DATA_ENVIRONMENT=development-test`
- `INVESTOR_PREVIEW_PROJECT_REF` must exactly match the configured Supabase URL.
- `INVESTOR_PREVIEW_EMAILS` lists manually approved, confirmed account emails.
- `VERCEL_ENV=production` always denies this capability.

Missing/mismatched configuration, missing/failed authentication, unconfirmed or
unallowlisted identities all fail closed. The identity comes from server
`auth.getUser()`, never from URL, editable metadata, local storage or client input.
This capability ONLY selects illustrative activity on the ordinary customer
routes. It neither changes wallet scope nor calls `start_demo_wallet_run`.
The build used `.env.local` without the local-only preview enablement.

The same existing authenticated test identity was photographed with the local
operator preview flag off (normal-account screenshots), then on (preview
screenshots). No alternate identity was impersonated and no profile was rewritten.
The final local setting enables read-only examples for the allowlisted reviewer;
ordinary/unallowlisted accounts still receive no fixtures. Turning the operator
flag off and refreshing reproduces the normal views. It is not a customer toggle.

All Add Funds controls are disabled. The server funding action refuses even
direct/concurrent calls. Database completion execution stays revoked. The existing
request-creation RPC is guarded by enrollment, and there are no enrollments.
There is no rate limiter in this checkpoint, per the revised scope. Before any
checkpoint-two enrollment, add a durable server/database-enforced request ceiling
and outstanding-session/amount cap with concurrency-safe checks; idempotent retries
must not consume new allowance. Remaining risk if an operator enrolls a user early:
that user could create excessive request rows via the existing request RPC, even
though completion remains disabled. Do not enroll anyone until that gate is fixed.

### Name, photo and historical balance findings

One shared name resolver now prioritizes stored `display_name` and preserves its
exact capitalization. It never edits email or legal names and never title-cases.
Tests include Chris Prior, McDonald, de la Cruz, O’Neill and lowercase names.
The reviewer's actual stored `display_name` is NULL; legal-name fields contain
`chris` and `prior`. Therefore screenshots intentionally show `chris prior`.
Showing "Chris Prior" requires a separate, explicit customer name-save decision;
this discrepancy was reported instead of rewriting the database for a screenshot.

The existing photo still appears in Dashboard and menu trigger. The adjustment
editor opened with its current photo and was cancelled without saving/reuploading.
The existing successful-save event still updates the menu image, covered by test.
Both stored photo references remain present after tests.

Confirmed historical evidence:

- Git HEAD's `src/lib/demo/account-drawer.ts` contained a literal `$24.00` balance.
- The surviving standalone `compact-account-drawer.html` in the local
  visualizations directory had `$24.00` markup. Its script then set the display
  to `$0.00` and zero tickets. Its Add Funds click handler assigned `$25.00`,
  changed the button to "Funds added", and disabled it. That handler has no
  request, persistence or database write. This establishes that mockup's path.
- A superseded prototype funding completion function exists in the earlier
  migration file; the isolation migration revokes/replaces it. The two were
  installed together atomically on the hosted test project. The current app's
  action refuses funding, and current ledger/session/wallet counts are zero.

The visual resemblance supports the mockup explanation but does not prove the
provenance of every historical screenshot or exclude an earlier, unrecorded
experiment. No legitimate ledger history was erased to obtain today's zero.

### Verification for this pass

- 56 application tests across 12 files passed. They cover saved casing/photo
  events, verified read-only authorization, project/environment guards, own-profile
  reads, shared counts/routes, unauthorized selected-slug attempts, exact-product
  math, supported ledger-row rendering, disabled direct/concurrent funding calls,
  and unavailable-vs-zero behavior. The parallel disabled-action test is NOT
  evidence that future concurrent ledger posting has been implemented.
- 134 database assertions passed locally, and 134 passed against the hosted test
  project. All test fixture transactions rolled back; post-test counts unchanged.
- `npx --no-install tsc --noEmit`: passed.
- `npx --no-install eslint src vitest.config.mts`: passed.
- `npm run build`: passed, including the new dynamic `/account/entries` route.
- Anonymous HTTP requests to Wallet, old protected preview, and My Zero Loss with
  `?demo=true&item=...` returned 307 to `/login`, with no fixture markup.
- Real browser: full activity rows navigate; ticket selects Still Open and shows
  one sample row; navigation closes drawer; X and Escape work; focus wraps inside
  drawer and returns to menu. At 390 x 844 no document horizontal overflow, drawer
  scroll reaches Official Rules, product names wrap, and no hover is required.
- Port 3000 is `next dev` from this working tree (parent PID 25700, server 15692),
  not Vercel or the production build. Hard refresh preserved authentication.
  Temporary mobile viewport override was reset after capture.

### Files changed in this interface pass

New: `src/lib/account/activity.ts`, `context.ts`, `context.test.ts`,
`profile-name.ts`, `profile-name.test.ts`; `src/app/account/entries/page.tsx`;
`src/components/account/MyZeroLossActivity.tsx` and its test;
`src/components/wallet/WalletOverview.tsx` and its test;
`src/lib/payments/actions.test.ts`.

Updated: Account Dashboard, Wallet, dynamic account section and old preview page;
SiteHeader, AccountDrawer and its test, HeaderAccountMetrics; drawer-state and its
test; preview access and its tests; preview destination metadata; this document;
ignored local preview configuration. No photo component, catalog product,
financial action implementation or migration was edited in this pass.
Pre-existing unrelated dirty files and untracked artifacts were preserved.

### Remaining work, not claimed as finished

The shared screens and authoritative balance READ are implemented. The four
preview activity items are still explicit visual fixtures, not ledger-driven
outcomes. Funding sessions/events/postings, atomic entry purchases, genuine
selection, supplier fulfillment, reconciliation and refunds need their separately
approved checkpoints. Do not call this production-ready accounting or claim the
zero-to-funding-to-entry acceptance journey has passed.

Fairness & Verification still points to About, not a working verification report.
Orders and Notifications are placeholders, not working inbox/fulfillment systems.
Profile information editing is not enabled; the photo editor is working. Existing
public catalog/product demonstration copy and the old product participation mockup
are outside this interface pass (including its separate hardcoded balance).
Catalog prize descriptions identify digital gift cards, so the preview's shoe
reward correctly says View Gift Card; no actual card exists. Completion options
here remain exact-product-only and do not copy broader gift-card redemption copy.
Live processor underwriting, legal approval, supplier terms, availability and
redemption behavior remain external dependencies, not resolved by these tests.

Mandatory next action: human visual and technical review. No checkpoint two until
explicit approval. See `wallet-checkpoint-1-screenshots.md` for the fresh captures,
exact local URLs and data classifications.

## Status

Implemented in the working tree and applied to the existing local Supabase test
instance and the confirmed hosted development/demo project `zero-loss-app`,
reference `ocgdfnvvjvutevgqzzgj` (us-east-1, ACTIVE_HEALTHY).
The user confirmed all four existing accounts are test accounts. Preflight found
zero ledger rows, no prototype funding records, and two saved profile photos.

The CLI transport failed; direct authenticated Supabase Management API access
worked. Only migrations `20260914120000` and `20260914130000` were installed,
atomically with their migration-history records. The superseded completion
function was revoked/replaced before commit, never exposed for funding.
Post-test counts remain: four accounts, zero ledger rows, zero wallet rows,
zero funding sessions/enrollments, and two saved profile photos.

The local app connects to this hosted test project, not the local test database.
No account was enrolled in simulated funding. No Git commit/push, merge, or
Vercel deployment was performed. The local database is only a test runner.

## Findings addressed

- Prototype deposits were unscoped and would have been included in ordinary
  balances. Each posting now references an immutable wallet identity, customer,
  scope, and currency through a composite foreign key.
- The old completion RPC trusted a caller's request to complete funding. Its
  privileges are revoked and its body refuses execution. The Server Action also
  refuses funding until verified provider events are implemented.
- Database failures previously rendered as zero dollars. Failures now render
  as unavailable; only a successful zero-valued snapshot means an empty wallet.
- Client-side summation could silently omit rows beyond the Data API limit.
  PostgreSQL now computes the whole balance and count. The same stable function
  returns the latest 50 transactions in the same database snapshot. React shares
  that snapshot within the server render; it does not store a money balance.
- Table update/delete privileges alone did not make history immutable against
  privileged application mistakes. Triggers now reject changes/deletes to
  postings, and foreign keys prevent customer deletion from erasing history.

## Enforced boundary

The presence of an operator-managed demo enrollment determines the account's
scope. An enabled account sees its current demo run. Disabled enrollment raises
an error, never falls back to production. Customers without enrollment use the
production scope. No URL flag, browser state, or editable user metadata controls
this choice.

`start_demo_wallet_run(customer_id, request_key)` is executable only by the
service role/operator. It rejects customers who already have production ledger
history. Reusing its key returns the same open run; an old closed run cannot be
reopened. A new key closes the earlier run and starts an empty one, retaining all
earlier postings. The investor cannot call this function or edit enrollment.

Ledger inserts are scoped to an open wallet and enrolled account. Direct
application-service ledger writes have been revoked; future funding and spending
must go through narrowly granted posting functions. Lock order for future money
posting: customer, enrollment (if applicable), wallet, then session/event.

Funding requests bind owner, amount, USD currency, run identity, and request key
at creation. Repeating a key with a different amount or from a different run is
an error. Creating a request posts no money. A unique demo event constraint
prevents two postings for the same event within a run. Correction references must
point to an original posting within the same wallet, owner, scope, and currency.

## Verification

- 63 wallet assertions plus 71 existing security assertions passed both against
  the hosted test project (rollback-only Management API harness) and through
  `npx --no-install supabase test db` locally (134 in each environment).
- 31 application tests: `npm run test:run`, including preview authorization,
  normal/fixture separation, unavailable rendering and photo-trigger updates.
- Targeted ESLint and the production Next.js build passed.
- Local Supabase database function lint reported no errors.

Database tests cover anonymous and cross-user access, owner/currency/scope
constraints, disabled enrollment, unauthorized reset, immutable history,
idempotent session creation, altered-request rejection, run resets, compensating
entries, and aggregation over 1,005 postings. Test fixture transactions roll back.
The credited rows in these tests are explicit database fixtures, NOT evidence
that a signed payment-provider event has been implemented or delivered.

## Next checkpoint and remaining limits

Implement a server-side demo provider with signed events, durable event receipt,
event deduplication, retry/reconciliation of unknown outcomes, and atomic posting.
Test independent concurrent connections and event delivery, then enable the
Add Funds form. The full $0 -> $25 -> refresh -> $1 entry -> $24 walkthrough has
not passed yet: funding and entry purchasing are not operational.

There is no complete double-entry general ledger, refund workflow, reservation/
spend procedure, payment-provider reconciliation, or gift-card issuance worker
in this checkpoint. A correction FK is not a finished refund system. Negative
recorded balances remain visible; a later spend function must enforce available
funds under lock. Provider timeouts must remain unresolved until queried or
reconciled, rather than being treated as declines or retried with new IDs.

## Local visual review

- Normal drawer: `http://localhost:3000/` (authenticated existing test account).
  It shows the successful RPC balance `$0.00` and an empty activity state.
- Protected drawer: `http://localhost:3000/account/preview/entries`.
  It shows `Interactive MVP Preview`, four catalog-derived illustrative activity
  items, and one illustrative active entry. Its balance is the same database
  `$0.00`, NOT a fixture balance. No $24/$25 screenshot balance was imported.
- Both are served by `next dev` in the current working tree on port 3000,
  hard-refreshed without clearing the authenticated session. Saved profile photo,
  adjustment editor, profile link, and photo-as-menu-trigger remain available.
- The server allowlist in ignored `.env.development.local` permits only the
  reviewer's confirmed email. Local development no longer bypasses authentication.
  Layout and page enforce access. An anonymous HTTP request received 307 to
  `/login` without fixture markup. Tests reject unallowlisted/unsigned identities.
- Normal routes never select the investor activity. The header and drawer use
  the same activity selector and ticket component. There is no entry lifecycle
  table/writer in checkpoint one: normal zero activity is the current empty
  checkpoint state, NOT proof that entry purchasing works. Failed or non-empty
  unimplemented activity sources display unavailable instead of guessing a count.
- `get_wallet_snapshot()` is a SECURITY DEFINER RPC with no customer parameter,
  a fixed search path, `auth.uid()`-derived wallet selection and explicit owner
  filtering. It does not rely on owner-bypassed RLS for its safety. Direct ledger
  access is separately RLS-filtered. Both paths passed cross-customer tests.
- Funding buttons are disabled. Activity actions lead only to labeled preview
  placeholders, not operational fulfillment. Catalog rewards are digital gift
  cards, so the illustrative prize action reads `View gift card`.
- Desktop focus stays inside the drawer, Escape returns focus to the menu/photo
  button, navigation closes it. At 390 x 844 the drawer has no horizontal overflow
  and scrolling reaches the rules and support links. Viewport was restored.

Discrepancies deliberately not hidden: the existing homepage still contains
sample marketplace/social activity (some carries legacy "Live" wording);
`Fairness & Verification` currently links to About, not an implemented verification
report; notifications/orders/entry destination pages remain development
placeholders. These are not evidence of financial functionality and were not
expanded into later checkpoints. The protected preview has no redeemable barcode.

Before hosted application, inspect existing migrations/rows. The new migration
deliberately aborts if it finds unscoped prototype demo records, rather than
silently treating those records as real money. Applying it also changes ledger
write privileges; any out-of-repository service that currently inserts directly
must be inventoried before rollout. Keep funding disabled during this rollout.
