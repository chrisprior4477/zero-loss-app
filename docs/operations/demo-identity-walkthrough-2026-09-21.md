# Demo winner identity walkthrough

Owner-approved scope: full sample-data walkthrough before a new first winner claim, in the existing preview project. No real ID, biometric, tax-number or file collection. This is not a production KYC integration or legal-compliance sign-off.

## Experience

- Same-page native dialog opened when the database requires verification for a new winner claim.
- Consent to the fictional demo; read-only sample details; fictional ID front and back capture steps; illustrated head-turn playback; review; explicit simulated success or photo-retake result.
- Supabase stores sessions and append-only step events. Close/reopen resumes the saved step. Retrying a failed check creates a new attempt without rewriting the failure.
- A passed result is named `demo_passed`, bound to provider `demo`, environment `development-test`, and policy `winner-identity-demo-v1`. It never changes the actual customer email/identity status to “verified.”
- The sample card has a fictional Florida address and explicit NOT VALID marks; it is not a reproduction of a government ID and has no scannable identifier.
- Tax collection remains separate. A read-only masked format example is explanatory only; no tax number is accepted or submitted.
- No camera, microphone, upload, external verification provider, biometric analysis, real reward issuance or outbound email is involved.

## Persistence and boundaries

- `customer_verifications`: owner, demo provider/environment/policy, sample fixture reference, creation time.
- `customer_verification_events`: ordered step/result, owner and timestamp. No raw evidence columns.
- Owner-only RLS reads. All client table writes revoked. Authenticated RPCs validate active confirmed account, environment, ownership, step order and fixture. Retries are idempotent; five new demo attempts/hour prevents runaway retries.
- Identity exposes an internal demo-confirmation predicate. A fulfillment trigger prevents new winner claims without it when the feature flag is enabled. Existing claimed rewards and purchased completion-option cards preserve their prior behavior.
- Real verification requires a chosen approved provider, signed result handling, provider-specific consent/retention/access arrangements, and legal/payment eligibility decisions. No claim that first-win placement alone satisfies every pre-entry or pre-funding requirement.

## Rollout and checks

1. Apply `20260921183000_demo_identity_verification.sql` with the gate off.
2. Deploy the matching claim dialog to the existing experiment branch/preview alias.
3. Apply `20260921185000_enable_demo_winner_verification.sql` after deployment is ready.
4. Walk through desktop/mobile, resume, retake, completion and exact reward claim. Preserve all test history.

`scripts/identity-checkpoint.ps1` guards the existing Supabase project and supports rollback-only dry runs and tests. `scripts/identity-db-tests.cjs` runs localhost-only checks.

Before browser verification: 15 new application assertions and 37 local/hosted rollback-only SQL assertions pass. The full dirty workspace passes 346 application tests, TypeScript, targeted ESLint and production build. Its separate unfinished funding-confirmation changes are not part of this identity deployment. The existing wallet suite also passes 273 local assertions (including 16 funding-work-in-progress assertions).

The 30-second Undo Entry, funding confirmation, refunds/support and gifting remain separate work items; this checkpoint does not claim they are complete.
