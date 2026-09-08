# Convex Credits

A Convex component for credit balances and background-job charges, maintained by CLIPIN.

Reserve credits before work starts. Complete after success. Release after failure. Refund completed work when needed. The component stores one debit per job and keeps completion state separate from credit movements.

This package is in development. No stable version has been published.

## Integration

```ts
import { defineApp } from "convex/server";
import credits from "@clipin/convex-credits/convex.config.js";
const app = defineApp();
app.use(credits);
export default app;
```

```ts
import { Credits } from "@clipin/convex-credits";
import { components } from "./_generated/api";
const credits = new Credits(components.credits);

const charge = await credits.reserve(ctx, {
  owner: authenticatedAccountId,
  amount: 10,
  key: requestId,
  reason: "Image generation",
  reference: jobId,
});

// In a later mutation, after the job succeeds:
await credits.complete(ctx, {
  chargeId: charge.chargeId,
  key: requestId + ":complete",
});
```

The host owns authentication, pricing, payment verification, and external job execution. Call the component from a host mutation to commit both sets of database writes together.

## Rules

- Amounts are positive safe integers. Available balances cannot become negative.
- Every write requires an operation key. Identical retries return their original result.
- Reusing a key with different arguments fails.
- Completion and release are mutually exclusive.
- Partial refunds cannot exceed the completed charge.
- Transfers update both accounts atomically.
- Namespaces isolate accounts, charges, and operation keys.
- Imports preserve source timestamps and pending charges. Activation requires matching balances and counts.
- Credit history uses cursor pagination. The component does not delete history or expire keys automatically.

[Documentation](https://convex-credits.vercel.app/docs) · [Source](https://github.com/clipinfit/convex-credits)

## Development

From the repository root, run `bun install`, `bun run test`, `bun run typecheck`, and `bun run build`.

Use `@clipin/convex-credits/test` to register the component in `convex-test`.

## License

Apache-2.0. Copyright 2026 Denis Ciccale.
