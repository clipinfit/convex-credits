# Convex Credits

Credit balances and charges for background jobs, maintained by CLIPIN.

This repository is under development. No stable release has been published.

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
