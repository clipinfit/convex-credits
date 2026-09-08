/// <reference types="vite/client" />
import { Credits } from "@clipin/convex-credits";
import { register } from "@clipin/convex-credits/test";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { api, components } from "./_generated/api.js";
import { internalMutation } from "./_generated/server.js";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");

test("host authenticates users and completes scheduled work with one debit", async () => {
  vi.useFakeTimers();
  try {
    const t = convexTest(schema, modules);
    register(t);
    await expect(
      t.mutation(api.jobs.start, { requestId: "job", outcome: "success" }),
    ).rejects.toThrow("UNAUTHENTICATED");
    const user = t.withIdentity({
      subject: "alice",
      issuer: "https://example.test",
    });
    const job = await user.mutation(api.jobs.start, {
      requestId: "job",
      outcome: "success",
    });
    expect(
      await user.mutation(api.jobs.start, {
        requestId: "job",
        outcome: "success",
      }),
    ).toBe(job);
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect(await user.query(api.jobs.balance, {})).toBe(10);
    expect(await t.run((ctx) => ctx.db.get(job))).toMatchObject({
      status: "completed",
    });
  } finally {
    vi.useRealTimers();
  }
});

test("component balance and ledger roll back when the host mutation throws", async () => {
  const credits = new Credits(components.credits, "rollback");
  const rollback = internalMutation({
    args: {},
    handler: async (ctx) => {
      await credits.grant(ctx, {
        owner: "alice",
        amount: 20,
        key: "grant",
        reason: "test",
        reference: "test",
      });
      throw new Error("HOST_FAILED");
    },
  });
  const t = convexTest(schema, {
    ...modules,
    "./rollback.ts": async () => ({ rollback }),
  });
  register(t);
  await expect(
    t.mutation(
      makeFunctionReference<"mutation", Record<string, never>>(
        "rollback:rollback",
      ),
      {},
    ),
  ).rejects.toThrow("HOST_FAILED");
  expect(
    await t.query(components.credits.credits.balance, {
      namespace: "rollback",
      owner: "alice",
    }),
  ).toBe(0);
  const history = await t.query(components.credits.credits.history, {
    namespace: "rollback",
    owner: "alice",
    paginationOpts: { cursor: null, numItems: 10 },
  });
  expect(history.page).toEqual([]);
});
