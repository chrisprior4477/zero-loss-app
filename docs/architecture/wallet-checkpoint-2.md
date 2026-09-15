# Checkpoint two — demo funding slice

2026-09-14. The user authorized demo funding, verified simulated payment, actual
database credit, and updated balances. This is the funding slice, not approval
for entry purchases, outcomes, completion payments, rewards, reset, or deployment.

## Installed and enabled

Confirmed hosted development/test project: `zero-loss-app`,
`ocgdfnvvjvutevgqzzgj`, us-east-1. The user confirmed all four accounts are tests.
Fresh preflight: four accounts, no wallets, funding requests, enrollments or
ledger entries; two saved photos. Migration `20260914233000_verified_demo_funding`
was tested in rollback-only transactions, installed with its migration-history
record, and tested again before enabling funding.

Only the existing, email-confirmed reviewer `cpptorrents@gmail.com` is enrolled
and separately permitted to fund. New signups do NOT self-enroll. The initial
run uses the stable operator key `checkpoint_two_review_20260914`. No prior run
or history was reset. Read-only investor permission remains a separate capability.

The local server is PID 15692, parent 25700, `next dev` from
`C:/Users/Win11Blue/Desktop/zero-loss-app`, port 3000. Authentication and saved
photo were preserved. No push, commit, merge or deployment was performed.

## Payment and ledger boundary

1. Server Action validates confirmed authentication, cents, USD, request-key
   format, test-project/environment and authoritative DB funding permission.
2. `create_demo_funding_session` binds authenticated owner, demo wallet/run,
   USD amount and request key. It posts no funds.
3. `DemoPaymentProvider` invokes a separate simulated-provider transaction.
   `simulate_demo_payment` saves one immutable receipt per session in the private
   schema. Its amount/owner/run come from the funding session, not browser fields.
4. The provider signs the exact receipt text with HMAC-SHA256. The randomly
   generated signing key never leaves the private DB configuration. Authenticated,
   anonymous and application-service roles cannot read the private tables/key.
5. `accept_demo_payment_event` verifies the signature, matching durable receipt,
   owner, wallet, amount, currency, provider, version and success state. It inserts
   a DEPOSIT, acceptance record and final session status in one transaction.
6. `get_wallet_snapshot()` sums the actual ledger and refreshes wallet, header,
   drawer, Dashboard and product-page balance. A failed read remains Unavailable.

The simulated provider shares this test database but uses separate records and
transactions. It is NOT an external processor, external webhook transport, or
independent settlement statement. The adapter and narrowly scoped posting
boundary are real implementation, not a visual balance counter. A future
production provider must replace the simulator, use its own signature protocol,
and undergo independent delivery/settlement and failure testing.

Reference for the underlying signature primitive:
[PostgreSQL pgcrypto HMAC](https://www.postgresql.org/docs/current/pgcrypto.html).

## Integrity, authorization and abuse limits

- Direct funding completion prototype remains revoked, including service_role.
- All funding calls derive the customer from `auth.uid()`. Read functions have
  explicit owner filtering; direct ledger reads retain RLS. Private provider
  tables have RLS enabled and no client table privileges.
- Lock order: customer, enrollment, wallet, session. Requests and credits are
  serialized per customer. Unique session/payment/event/posting keys and the
  composite amount/owner/wallet/currency FK provide additional backstops.
- Existing append-only triggers preserve deposits, provider receipts and event
  acceptances. Existing correction references remain wallet/owner/currency-bound.
- Funding requires BOTH the private global switch and per-account funding flag,
  in addition to enabled demo enrollment and confirmed active customer status.
- Database-enforced limits: 3 new requests per rolling minute; 20 per rolling
  24 hours; 3 unresolved requests; $1,000 total requested over the account's
  lifetime, including old runs and failed requests. Each request is $1–$500;
  the UI offers $1, $10, $25 and $100. No allowance is reset by starting a run.
- Exact idempotent retries consume no new quota. Reusing a key with altered
  amount or run is rejected. Six simultaneous deliveries created one credit.
- This bounds financial/record creation, not all HTTP or database traffic.
  Repeated authenticated no-op retries can still consume request/CPU capacity.
  Before broader exposure, add edge/IP and per-account request throttling,
  monitoring and alerts. No client timer is treated as a security control.

## Interrupted payments and reconciliation

The provider receipt is durable before crediting. Lost responses are UNKNOWN,
not declines or assertions that a balance did not change. The page lists actual
requests as not processed, payment-received/credit-pending, matched, or needs
review. The explicit Finish / check action reuses the existing session and
receipt. A request never becomes a replacement charge merely because a reply
was lost. New UI requests are blocked while an unresolved request is known.

A per-tab, per-wallet sessionStorage record preserves the submitted amount/key
before sending, so a reload retries the same logical request. Storage does not
grant permission or determine ledger amounts. If browser storage is unavailable,
the durable DB request list remains the recovery path. Discrepancies are shown
for operator review, not silently repaired with invented data.

Reconciliation currently compares this simulator's receipts, accepted events,
funding sessions and original credit. It is user-initiated and owner-scoped,
not a scheduled fleet-wide worker. Late receipts for closed runs are rejected;
reset remains unavailable in the UI. A future reset workflow must resolve
pending requests before closing a run and preserve all financial history.

## Verification and retained test records

- 183 database assertions passed both in migration dry runs and after installation:
  71 existing customer/profile, 63 wallet isolation, 49 verified funding tests.
  These fixtures rolled back. They cover access restrictions, signature/payload
  alteration, replay, ownership, immutable history, run isolation, rate/count/
  amount/pending ceilings, kill switch, balance aggregation and reconciliation.
- 111 application tests passed across 18 files. TypeScript, source lint and the
  production build passed. These include server guards, invalid inputs, unknown
  responses, recovery, request-key persistence, and Unavailable versus zero.
- Actual browser: $0 -> $25 via Add demo funds. Header and history updated.
- Actual concurrent DB test: six independent backend connections created the
  same $1 request, then six returned the same provider receipt. Delivery was
  deliberately stopped here to reproduce the provider-success/credit-missing
  boundary. Browser showed $25 and “Payment received · credit pending”.
- Six independent deliveries then returned one new acceptance and five duplicate
  acknowledgments, all with the same ledger ID. The page's stale Finish / check
  action safely redelivered once more and updated to $26, without another credit.
- Final observed records: 2 demo deposits ($25 + $1), 2 provider receipts,
  2 accepted events, no unresolved requests, zero production postings,
  one funding-enabled account, and both saved profile photos intact.
- These two demo deposits are retained history, not disposable fixture deletions.
- Anonymous wallet page request returns HTTP 307 to login. Browser refresh keeps
  the signed-in session. At 390×844 the wallet fits without horizontal overflow.
  Compact drawer reads $26 and its Add Funds link opens the funding page.

Existing illustrative product activity and its one-ticket/one-reward counts
remain explicitly marked samples. Funding creates NO entries or rewards and
does not change those fixture counts. Ordinary accounts do not gain investor
fixtures. The legacy product panel's hardcoded $24 was removed; it now receives
the same authoritative account balance, while its entry action stays non-purchasing.
The stored lowercase reviewer name is preserved, not silently title-cased.

## Review URLs and screenshots

- `http://localhost:3000/account/wallet?view=history#demo-funding`
- `http://localhost:3000/account`
- Desktop capture: `/.tmp-demo-funding-desktop.png` (local, ignored by Git).
- Mobile capture: `/.tmp-demo-funding-mobile.png` (local, ignored by Git).

## Still not implemented / not authorized

Entry purchases, balance debits, outcomes, completion purchases, real payment
processing, gift-card issuance, production financial behavior, UI resets and
deployment remain off. Sample rewards are non-redeemable. Refund/reversal
workflow is NOT implemented by this slice: existing compensating-entry integrity
is tested, but it is not a signed refund adapter, refund API or customer refund UI.
No production readiness or complete double-entry general ledger is claimed.
Real provider reconciliation, refunds, settlement, dispute handling, operational
monitoring and production separation require their remaining reviewed work.

## Operator tooling and security note

`scripts/demo-funding-checkpoint.ps1` pins the confirmed test reference and reads
the existing management token without printing it. Inspect/Test/Verify are
non-persistent or rollback-only. Apply/Enable/ConcurrentPrepare/ConcurrentAccept
are explicit mutation modes; concurrency modes intentionally retain the one
$1 demo test under a stable request key. They do not delete financial history.
DryRun applies only before installation; it is not a reset or migration rollback.

An earlier diagnostic in this turn accidentally printed existing local Supabase
credentials into the tool log. Values are not included here and were not committed
or placed in source. Rotate the management access token and DB password before
sharing logs or broadening access. Credential rotation was not performed without
the user's authorization. No signing key or service-role key was exported.

Stop at the human-review gate. This record supersedes checkpoint one's funding-
disabled status only for this expressly authorized demo-funding slice.

## Subsequent preview publication authorization

The user subsequently authorized committing and pushing the reviewed work to
`openai-homepage-experiment` and publishing a Vercel Preview deployment. After
being told Vercel Authentication was disabled, the user explicitly chose to
publish without that outer protection. The URL is consequently public, not
limited to the two intended reviewers. Customer authentication, ownership checks,
the investor allowlist, database funding permission and usage ceilings remain
required; this authorization does not enable real payments or later checkpoints.

Vercel project `zero-loss-app` tracks `main` for Production and unassigned branches
for Preview. The demo environment configuration must be scoped specifically to
Preview / `openai-homepage-experiment`, not Production. Application deployment
requires no Supabase management token, database password, service-role key, or
provider signing key. The earlier credential-rotation recommendation remains
outstanding and is not resolved by a clean source scan or by publication.
