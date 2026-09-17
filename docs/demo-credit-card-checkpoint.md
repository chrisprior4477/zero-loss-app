# Test credit card in Add Funds

The wallet funding form now displays **Add Credit Card**, a read-only sample card
(`4242 4242 4242 4242`, expiry `12/30`, security code `123`), and **Use as my default
payment method**. These are simulator fixtures, not real processor credentials.
Real card entry is deliberately unsupported until a provider-hosted/tokenized
card collection integration exists.

The checkbox starts unchecked for a new account. Its value is saved when the
customer submits Add funds. A saved default returns as a compact, expandable
“Test card •••• 4242 · Default” summary. Unchecking on the next payment clears the
default. This is a selection preference, never permission for automatic charges.

## Persistence and payment integrity

- `demo_private.customer_payment_methods` stores one fixed simulator token, last
  four digits, default preference and timestamps per customer. There is no PAN,
  security-code, or expiry storage. The displayed card fields have no form names
  and are never posted by the UI.
- `demo_private.funding_payment_methods` stores the immutable method/preference
  snapshot for each funding request. A composite foreign key ties its owner to
  the funding session. Private tables deny customer direct access; owner-derived,
  authenticated RPCs are the only application access.
- `create_demo_card_funding_session` saves the preference and request association
  in one transaction using the existing customer/wallet lock and funding RPC.
  It does not credit the ledger. The existing signed simulated provider event,
  verification, unique posting and reconciliation flow still credit the wallet.
- Replays reuse the original session. An altered amount, token or preference is
  rejected. Replaying an earlier payment never reverts a more recent default.
- Browser recovery saves only the request key, amount, fixture token and boolean.
  Legacy retry records without a card use `resume_demo_funding_session`, which
  cannot create a new session. Finish / check remains available for recovery.
- A saved-method read failure is not treated as an empty method: new funding is
  blocked until refreshed, protecting the existing preference.

## Environment and abuse controls

The server action retains the confirmed-preview-project and non-production
deployment checks. New RPCs additionally validate the configured JWT issuer,
preview provisioning, funding permission and active confirmed customer. No email
allowlist is added. Other accounts' records are not copied or modified.

The existing PostgreSQL funding ceilings apply unchanged: three new requests per
minute, twenty per day, no more than three pending, and $1,000 requested lifetime
per customer. Their state is funding-session history, serialized by the customer
lock, not browser timers or process memory. Method storage is bounded to one row
per customer and one immutable association per request. Legacy direct demo funding
RPCs remain available for compatibility with older previews; they retain the same
funding authorization and ceilings but do not carry a card association.

These controls bound record creation, not all inbound HTTP traffic. Infrastructure
request throttling and a production payment provider remain separate future work.

## Verification and rollout

`scripts/demo-card-checkpoint.ps1` is pinned to the confirmed preview project. Its
DryRun applies the migration and executes the SQL tests inside a rolled-back
transaction; Apply records the migration; Test reruns transactional assertions;
Verify reports only aggregate method/request counts. No real customer is funded
by these tests and no sample customer records survive the rollback.

The focused SQL suite covers default persistence/opt-out, idempotency, altered
replay, verified single credit, ownership, anonymous/unconfirmed/wrong-project
denial, immutable association history, and the server-side funding rate ceiling.
React/action tests cover read-only fixture fields, safe form payloads, restored
defaults, legacy and current retry records, and failed-method reads.

Future production card collection must use a replaceable payment provider's
hosted fields and provider-issued tokens. Do not extend this fixed demo fixture
into a raw card-data endpoint. Preview data stays in the separate preview project.
