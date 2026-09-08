# Convex Credits

Credit balances and charges for background jobs, maintained by CLIPIN.

Stable package: [`@clipin/convex-credits@1.0.1`](https://www.npmjs.com/package/@clipin/convex-credits).

- `packages/convex-credits`: the reusable Convex component.
- `packages/example-backend`: a host app that exercises the public API.
- `apps/web`: the website, documentation, and interactive example.

Run `bun install`, then `bun run test`, `bun run typecheck`, and `bun run build`.

## Local development

Use Node.js 22 or later and Bun 1.4.0.

```sh
bun install
bun run typecheck
bun run lint
bun run test
bun run build
bun run pack:check
```

`pack:check` installs the npm tarball in a temporary consumer and runs its host tests.

To test database concurrency, run `bun run dev` in `packages/example-backend`. Keep the local Convex server running, then run `bun run test:local` in that package in another terminal. The script accepts only the anonymous local deployment.

The website demo runs in the browser and simulates the lifecycle. The example backend uses real Convex mutations and scheduled functions.

[Documentation](https://convex-credits.vercel.app/docs) · [Release plan](RELEASE_PLAN.md)

## License

Apache-2.0. Copyright 2026 Denis Ciccale. Maintained by CLIPIN.

To rehearse a source import, set `CREDITS_IMPORT_SNAPSHOT` to a private JSON snapshot and run `bunx vitest run scripts/rehearse-import.test.ts` in `packages/convex-credits`. The snapshot stays outside the repository. See the validator in that script for its format.
