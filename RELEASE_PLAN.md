# Stable release and Estulio migration

## Required outcomes

- Publish a stable @clipin/convex-credits npm package in clipinfit/convex-credits.
- Ship a monorepo with the component, example backend, website, and complete docs.
- Verify package exports through an installed tarball, host integration, and real Convex deployment.
- Migrate all Estulio credit writers, reads, balances, pending charges, and history without balance drift.
- Deploy and verify Estulio production after migration.
- Prepare and assist with the convex.dev/components submission.

## Contract

The component owns accounts, charges, immutable nonzero movements, and durable operation keys.
The host owns authorization, pricing, verified payments, and job outcomes.
All amounts are positive safe integers in credit units. Balances cannot become negative or exceed the safe-integer limit.
Operation keys are scoped by namespace. Identical retries return the original result. A different request with the same key fails.
Reserve deducts available credits. Complete changes charge state only. Release credits a pending charge once. Refund credits a completed charge, up to its unrefunded amount.
Completion and release are mutually exclusive. A later callback cannot silently undo a terminal decision.
Transfers update both accounts and both ledger entries in one mutation.
Accounts and operation keys remain isolated between namespaces.
Ledger history is paginated. No automatic deletion of accounting or deduplication records.
Queries expose available balance and charge state separately from movements.

## Release gates

- Success, failure, retries, duplicate and conflicting keys, partial refunds, concurrent writes, transfers, namespace isolation, overflow, and pagination tests.
- Property tests compare the ledger sum with account balances across generated operation sequences.
- Host mutation rollback includes component writes.
- Example authorization derives account ownership from identity.
- Reconciliation and resumable import preserve opening balances and historical references.
- Package build, typecheck, lint, tarball installation, and website build pass in CI.
- Browser inspection verifies desktop/mobile docs and demo states.
- Docs explain invariants, API, errors, retries, migration, retention, and external-side-effect limits.
- Stable publication follows verification, then Estulio migrates to that published version.

## Migration approach

Inventory every balance mutation before implementation. Establish a migration cutoff and an account-level routing rule.
Move all writers for each migrated account together. Preserve legacy references and import history with checkpoints.
Reconcile source balances, imported movements, and pending charges before switching readers.
Retain source records for rollback and audit. Do not blindly dual-write across non-atomic boundaries.

## Evidence

2026-09-08: inspected ../convex-teams and ../convex-chat. Teams is the complete local reference.
GitHub authentication is available. npm whoami returned E401; renew npm authentication only when the release is ready.

2026-09-08 verification:
- 18 tests pass: component lifecycle, generated 100-job sequences, resumable imports, scheduled example, and host rollback.
- Real local Convex passes 8 simultaneous identical grants, 10 competing reservations, retries, completion/release race, and ledger reconciliation.
- Live testing found the native paginate limitation; replaced it with the documented convex-helpers paginator.
- convex-helpers is pinned to 0.1.120 to retain Convex 1.42.1 compatibility.
- All workspace types, lint, tests, builds, package contents, and installed-tarball host tests pass.
- Website checked at desktop and mobile sizes.
- GitHub and Vercel authentication available. npm package name is not currently published.

2026-09-08 publication preparation:
- Public repo created: https://github.com/clipinfit/convex-credits (initial commit 7a272cf).
- GitHub CI passed: run 34234538145.
- Docs deployed and browser-verified: https://convex-credits.vercel.app.
- Private Estulio snapshot rehearsal passed for every existing account, including history, explicit opening balances, retries, and final ledger sums. Source data remains outside this repository.
- npm web login requested; waiting for account authentication before stable publication.

2026-09-08 follow-up verification:
- Installed consumer checks pass on Convex 1.42.1 and 1.45.0. CI now checks both versions.
- The example rejects changed outcomes that reuse a request ID.
- Package-install checks bypass Turbo caching because they read the example package and resolve registry dependencies.

2026-09-08: Published @clipin/convex-credits@1.0.0 with npm user denis. Verified public access, tarball availability, and registry version. Estulio installation now uses the exact published version.
