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

## Verification and release status

Verified on 2026-09-08:

- Published stable `@clipin/convex-credits@1.0.1` from the public repository.
- Component lifecycle, generated operation sequences, resumable imports, scheduled jobs, and host rollback tests pass.
- Real local Convex checks cover simultaneous grants, competing reservations, retries, completion/release races, and ledger reconciliation.
- Installed tarball checks pass locally with Convex 1.42.1 and 1.45.0, including a nested npm workspace. CI also passes with npm 11.14.1, avoiding an installer crash in the Node 22 bundled version.
- Type checks, lint, package contents, and website builds pass. The live website shows version 1.0.1.
- Estulio production uses the published package. All production accounts migrated with source history preserved and no balance drift. Backend and frontend deployments passed.
- The development migration initially rejected inconsistent source history. After operator review, explicit reconciliation entries preserved the source rows and current balance. All development accounts are now migrated.
- Production snapshots and detailed reconciliation evidence remain outside this public repository.
- Convex directory preflight passed all eight critical and six suggested checks. Submitted successfully; the directory profile confirms In Review.
