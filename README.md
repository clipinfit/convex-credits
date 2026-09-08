# Convex Credits

<!-- START: Include on https://convex.dev/components -->

Credit balances and charges for background jobs, maintained by CLIPIN.

Stable package: [`@clipin/convex-credits@1.0.1`](https://www.npmjs.com/package/@clipin/convex-credits).

Grant gifts and rewards. Reserve credits before work starts. Complete a successful charge without another debit, or release a failed reservation once. Refund completed charges and transfer credits between accounts atomically.

```sh
npm install @clipin/convex-credits convex
```

Mount the component in `convex/convex.config.ts`:

```ts
import { defineApp } from "convex/server";
import credits from "@clipin/convex-credits/convex.config.js";

const app = defineApp();
app.use(credits);
export default app;
```

Create a client in your host backend:

```ts
import { Credits } from "@clipin/convex-credits";
import { components } from "./_generated/api";

const credits = new Credits(components.credits);

// Inside an authorized host mutation:
await credits.grant(ctx, {
  owner: accountId,
  amount: 20,
  key: JSON.stringify(["gift", requestId]),
  reason: "Welcome gift",
});
```

The host controls authentication, grant permissions, prices, and payment verification. Call the component from a host mutation to commit both sets of database writes together.

Supply a stable operation key for each write. An identical retry returns its original result. Reusing a key with different arguments fails. Amounts are positive safe integers, and available balances cannot become negative.

History contains nonzero balance movements. Completion updates charge state without adding a movement. History uses cursor pagination through `convex-helpers`, which supports component queries. Import helpers preserve source timestamps and pending charges, then verify balances and counts before account activation.

[Documentation](https://convex-credits.vercel.app/docs) · [Example backend](https://github.com/clipinfit/convex-credits/tree/main/packages/example-backend) · [Interactive demo](https://convex-credits.vercel.app)

<!-- END: Include on https://convex.dev/components -->

## Repository

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

[Documentation](https://convex-credits.vercel.app/docs) · [Release plan](https://github.com/clipinfit/convex-credits/blob/main/RELEASE_PLAN.md)

## License

Apache-2.0. Copyright 2026 Denis Ciccale. Maintained by CLIPIN.

To rehearse a source import, set `CREDITS_IMPORT_SNAPSHOT` to a private JSON snapshot and run `bunx vitest run scripts/rehearse-import.test.ts` in `packages/convex-credits`. The snapshot stays outside the repository. See the validator in that script for its format.
