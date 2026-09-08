# Changelog

## 1.0.1 — 2026-09-08

- Remove the test helper’s type dependency on `convex-test` so nested npm workspaces can use it. Declare Vite as an optional peer. Verify the installed package in a nested npm workspace.

## 1.0.0 — 2026-09-08

- Initial account and charge lifecycle.
- Grants, reservations, completion, release, partial refunds, and transfers.
- Durable operation keys and paginated movement history.
- Typed host client, test registration, example backend, and documentation website.

- Resumable account imports with original timestamps, pending charges, and balance/count reconciliation.
- Verified with Convex 1.42.1 and 1.45.0, installed-package host tests, and real local concurrency checks.
