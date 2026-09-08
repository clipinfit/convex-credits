/// <reference types="vite/client" />
import type { FunctionReturnType } from "convex/server";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api.js";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");
const args = {
  namespace: "test",
  owner: "alice",
  amount: 20,
  key: "grant",
  reason: "bonus",
  reference: "signup",
};
async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(api.credits.grant, args);
  return t;
}

test("a completed job has one debit and no zero movement", async () => {
  const t = await setup();
  const reserved = await t.mutation(api.credits.reserve, {
    ...args,
    amount: 10,
    key: "job",
  });
  await t.mutation(api.credits.complete, {
    namespace: args.namespace,
    key: "done",
    chargeId: reserved.chargeId,
  });
  await t.mutation(api.credits.complete, {
    namespace: args.namespace,
    key: "done-again",
    chargeId: reserved.chargeId,
  });
  const history = await t.query(api.credits.history, {
    namespace: args.namespace,
    owner: args.owner,
    paginationOpts: { cursor: null, numItems: 10 },
  });
  expect(history.page.map((x) => x.delta)).toEqual([-10, 20]);
  expect(
    await t.query(api.credits.balance, {
      namespace: args.namespace,
      owner: args.owner,
    }),
  ).toBe(10);
});

test("retries return original results; conflicting operation keys fail", async () => {
  const t = await setup();
  const grant = await t.mutation(api.credits.grant, args);
  await t.mutation(api.credits.reserve, { ...args, amount: 5, key: "job" });
  expect(await t.mutation(api.credits.grant, args)).toEqual(grant);
  await expect(
    t.mutation(api.credits.grant, { ...args, amount: 21 }),
  ).rejects.toThrow("OPERATION_KEY_CONFLICT");
  await expect(t.mutation(api.credits.reserve, args)).rejects.toThrow(
    "OPERATION_KEY_CONFLICT",
  );
});

test("release restores the balance once and cannot later complete", async () => {
  const t = await setup();
  const { chargeId } = await t.mutation(api.credits.reserve, {
    ...args,
    amount: 8,
    key: "job",
  });
  const release = { namespace: args.namespace, key: "release", chargeId };
  await t.mutation(api.credits.release, release);
  await t.mutation(api.credits.release, release);
  await t.mutation(api.credits.release, { ...release, key: "release-again" });
  await expect(
    t.mutation(api.credits.complete, { ...release, key: "late" }),
  ).rejects.toThrow("CHARGE_RELEASED");
  expect(
    await t.query(api.credits.balance, {
      namespace: args.namespace,
      owner: args.owner,
    }),
  ).toBe(20);
});

test("refunds are capped at the completed charge and cannot be duplicated", async () => {
  const t = await setup();
  const { chargeId } = await t.mutation(api.credits.reserve, {
    ...args,
    amount: 10,
    key: "job",
  });
  const base = { namespace: args.namespace, chargeId };
  await expect(
    t.mutation(api.credits.refund, {
      ...base,
      key: "early",
      amount: 1,
      reason: "refund",
    }),
  ).rejects.toThrow("CHARGE_NOT_COMPLETED");
  await t.mutation(api.credits.complete, { ...base, key: "done" });
  await expect(
    t.mutation(api.credits.release, { ...base, key: "release" }),
  ).rejects.toThrow("CHARGE_COMPLETED");
  const refund = { ...base, key: "partial", amount: 4, reason: "refund" };
  await t.mutation(api.credits.refund, refund);
  await t.mutation(api.credits.refund, refund);
  await expect(
    t.mutation(api.credits.refund, { ...refund, key: "excess", amount: 7 }),
  ).rejects.toThrow("REFUND_EXCEEDS_CHARGE");
  await t.mutation(api.credits.refund, {
    ...refund,
    key: "remaining",
    amount: 6,
  });
  expect(
    await t.query(api.credits.balance, {
      namespace: args.namespace,
      owner: args.owner,
    }),
  ).toBe(20);
});

test("transfers preserve the total, replay once, and roll back when either account fails", async () => {
  const t = await setup();
  const transfer = {
    namespace: args.namespace,
    from: "alice",
    to: "bob",
    amount: 5,
    key: "transfer",
    reason: "gift",
    reference: "gift",
  };
  await t.mutation(api.credits.transfer, transfer);
  await t.mutation(api.credits.transfer, transfer);
  expect(
    await t.query(api.credits.balance, {
      namespace: args.namespace,
      owner: "alice",
    }),
  ).toBe(15);
  expect(
    await t.query(api.credits.balance, {
      namespace: args.namespace,
      owner: "bob",
    }),
  ).toBe(5);
  await expect(
    t.mutation(api.credits.transfer, {
      ...transfer,
      key: "excess",
      amount: 16,
    }),
  ).rejects.toThrow("INSUFFICIENT_CREDITS");
  await t.mutation(api.credits.grant, {
    ...args,
    owner: "full",
    amount: Number.MAX_SAFE_INTEGER,
    key: "full",
  });
  await expect(
    t.mutation(api.credits.transfer, {
      ...transfer,
      to: "full",
      key: "overflow",
    }),
  ).rejects.toThrow("BALANCE_OVERFLOW");
  expect(
    await t.query(api.credits.balance, {
      namespace: args.namespace,
      owner: "alice",
    }),
  ).toBe(15);
});

test.each([
  0,
  -1,
  0.5,
  NaN,
  Infinity,
  Number.MAX_SAFE_INTEGER + 1,
])("rejects invalid amount %s", async (amount) => {
  const t = await setup();
  await expect(
    t.mutation(api.credits.reserve, { ...args, amount, key: "invalid" }),
  ).rejects.toThrow();
  expect(
    await t.query(api.credits.balance, {
      namespace: args.namespace,
      owner: args.owner,
    }),
  ).toBe(20);
});

test("namespaces isolate balances, keys, and charge access", async () => {
  const t = await setup();
  await t.mutation(api.credits.grant, {
    ...args,
    namespace: "other",
    amount: 3,
  });
  const { chargeId } = await t.mutation(api.credits.reserve, {
    ...args,
    amount: 10,
    key: "job",
  });
  expect(
    await t.query(api.credits.getCharge, { namespace: "other", chargeId }),
  ).toBeNull();
  await expect(
    t.mutation(api.credits.release, {
      namespace: "other",
      key: "release",
      chargeId,
    }),
  ).rejects.toThrow("CHARGE_NOT_FOUND");
  expect(
    await t.query(api.credits.balance, {
      namespace: "other",
      owner: args.owner,
    }),
  ).toBe(3);
});

test("ledger sums equal balances across generated charge and refund sequences", async () => {
  const t = await setup();
  let seed = 9182;
  let expected = 20;
  for (let i = 0; i < 100; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const amount = (seed % 10) + 1;
    if (expected < amount) {
      await t.mutation(api.credits.grant, {
        ...args,
        amount: 20,
        key: `fund-${i}`,
      });
      expected += 20;
    }
    const reserveArgs = { ...args, amount, key: `job-${i}` };
    const reserved = await t.mutation(api.credits.reserve, reserveArgs);
    expect(await t.mutation(api.credits.reserve, reserveArgs)).toEqual(
      reserved,
    );
    expected -= amount;
    const finishArgs = {
      namespace: args.namespace,
      chargeId: reserved.chargeId,
      key: `finish-${i}`,
    };
    if (seed % 3 === 0) {
      await t.mutation(api.credits.release, finishArgs);
      expected += amount;
    } else {
      await t.mutation(api.credits.complete, finishArgs);
      if (amount > 1) {
        await t.mutation(api.credits.refund, {
          ...finishArgs,
          key: `refund-${i}`,
          amount: 1,
          reason: "partial",
        });
        expected++;
      }
    }
    expect(
      await t.query(api.credits.balance, {
        namespace: args.namespace,
        owner: args.owner,
      }),
    ).toBe(expected);
  }
  let cursor: string | null = null;
  let total = 0;
  const ids = new Set<string>();
  for (;;) {
    const page: FunctionReturnType<typeof api.credits.history> = await t.query(
      api.credits.history,
      {
        namespace: args.namespace,
        owner: args.owner,
        paginationOpts: { cursor, numItems: 13 },
      },
    );
    for (const row of page.page) {
      expect(row.delta).not.toBe(0);
      expect(ids.has(row._id)).toBe(false);
      ids.add(row._id);
      total += row.delta;
    }
    if (page.isDone) break;
    cursor = page.continueCursor;
  }
  expect(total).toBe(expected);
});

test("overflow, self-transfer, and insufficient funds leave no partial movement", async () => {
  const t = await setup();
  await expect(
    t.mutation(api.credits.grant, {
      ...args,
      amount: Number.MAX_SAFE_INTEGER,
      key: "overflow",
    }),
  ).rejects.toThrow("BALANCE_OVERFLOW");
  await expect(
    t.mutation(api.credits.transfer, {
      namespace: args.namespace,
      key: "self",
      from: "alice",
      to: "alice",
      amount: 2,
      reason: "test",
      reference: "test",
    }),
  ).rejects.toThrow("SELF_TRANSFER");
  await expect(
    t.mutation(api.credits.reserve, { ...args, amount: 21, key: "excess" }),
  ).rejects.toThrow("INSUFFICIENT_CREDITS");
  const history = await t.query(api.credits.history, {
    namespace: args.namespace,
    owner: args.owner,
    paginationOpts: { cursor: null, numItems: 10 },
  });
  expect(history.page).toHaveLength(1);
  expect(history.page[0]?.delta).toBe(20);
});

test("imports resume, reconcile every balance, preserve dates, and restore pending charges", async () => {
  const t = convexTest(schema, modules);
  const scope = { namespace: "migration", owner: "legacy-user" };
  const begin = {
    ...scope,
    key: "begin",
    openingBalance: 0,
    expectedBalance: 12,
    expectedMovements: 3,
    expectedPendingCharges: 1,
    occurredAt: 0,
    reference: "snapshot",
  };
  const started = await t.mutation(api.credits.beginImport, begin);
  expect(await t.mutation(api.credits.beginImport, begin)).toEqual(started);
  await expect(t.query(api.credits.balance, scope)).rejects.toThrow(
    "ACCOUNT_IMPORTING",
  );
  await expect(
    t.mutation(api.credits.grant, { ...args, ...scope, key: "new-grant" }),
  ).rejects.toThrow("ACCOUNT_IMPORTING");
  await expect(
    t.mutation(api.credits.finishImport, { ...scope, key: "finish" }),
  ).rejects.toThrow("IMPORT_COUNT_MISMATCH");
  const opening = {
    ...scope,
    key: "source:1",
    delta: 20,
    balanceAfter: 20,
    occurredAt: 100,
    reason: "welcome",
    reference: "old-ledger/1",
    pendingCharge: false,
  };
  const imported = await t.mutation(api.credits.importMovement, opening);
  expect(await t.mutation(api.credits.importMovement, opening)).toEqual(
    imported,
  );
  await expect(
    t.mutation(api.credits.importMovement, {
      ...opening,
      key: "out-of-order",
      occurredAt: 99,
    }),
  ).rejects.toThrow("IMPORT_OUT_OF_ORDER");
  await expect(
    t.mutation(api.credits.importMovement, {
      ...opening,
      key: "wrong-balance",
      delta: -2,
      balanceAfter: 17,
    }),
  ).rejects.toThrow("IMPORT_BALANCE_MISMATCH");
  await t.mutation(api.credits.importMovement, {
    ...opening,
    key: "source:2",
    delta: -2,
    balanceAfter: 18,
    occurredAt: 200,
  });
  const reserved = await t.mutation(api.credits.importMovement, {
    ...opening,
    key: "source:3",
    delta: -6,
    balanceAfter: 12,
    occurredAt: 300,
    pendingCharge: true,
  });
  if (!reserved.chargeId) throw new Error("Missing imported charge");
  await expect(
    t.mutation(api.credits.release, {
      namespace: scope.namespace,
      key: "release",
      chargeId: reserved.chargeId,
    }),
  ).rejects.toThrow("ACCOUNT_IMPORTING");
  const finish = { ...scope, key: "finish" };
  const finished = await t.mutation(api.credits.finishImport, finish);
  expect(await t.mutation(api.credits.finishImport, finish)).toEqual(finished);
  expect(await t.query(api.credits.balance, scope)).toBe(12);
  expect(await t.mutation(api.credits.importMovement, opening)).toEqual(
    imported,
  );
  await expect(
    t.mutation(api.credits.importMovement, { ...opening, key: "after-finish" }),
  ).rejects.toThrow("ACCOUNT_NOT_IMPORTING");
  await t.mutation(api.credits.release, {
    namespace: scope.namespace,
    key: "release",
    chargeId: reserved.chargeId,
  });
  expect(await t.query(api.credits.balance, scope)).toBe(18);
  const { page } = await t.query(api.credits.history, {
    ...scope,
    paginationOpts: { cursor: null, numItems: 10 },
  });
  expect(page.map((row) => row.delta)).toEqual([6, -6, -2, 20]);
  expect(page.slice(1).map((row) => row.occurredAt)).toEqual([300, 200, 100]);
  expect(page[0]?.chargeId).toBe(reserved.chargeId);
  expect(page.reduce((sum, row) => sum + row.delta, 0)).toBe(18);
});

test("imports cannot bypass reconciliation or replace existing accounts", async () => {
  const t = await setup();
  const begin = {
    namespace: args.namespace,
    owner: args.owner,
    key: "begin",
    openingBalance: 0,
    expectedBalance: 0,
    expectedMovements: 0,
    expectedPendingCharges: 0,
    occurredAt: 0,
    reference: "legacy",
  };
  await expect(t.mutation(api.credits.beginImport, begin)).rejects.toThrow(
    "ACCOUNT_EXISTS",
  );
  await t.mutation(api.credits.beginImport, {
    ...begin,
    owner: "migrating",
    openingBalance: 5,
    expectedBalance: 6,
  });
  await expect(
    t.mutation(api.credits.finishImport, {
      namespace: args.namespace,
      owner: "migrating",
      key: "finish",
    }),
  ).rejects.toThrow("IMPORT_BALANCE_MISMATCH");
  await expect(
    t.mutation(api.credits.transfer, {
      namespace: args.namespace,
      from: args.owner,
      to: "migrating",
      key: "transfer",
      amount: 1,
      reason: "test",
      reference: "test",
    }),
  ).rejects.toThrow("ACCOUNT_IMPORTING");
  expect(
    await t.query(api.credits.balance, {
      namespace: args.namespace,
      owner: args.owner,
    }),
  ).toBe(20);
  const history = await t.query(api.credits.history, {
    namespace: args.namespace,
    owner: "migrating",
    paginationOpts: { cursor: null, numItems: 10 },
  });
  expect(history.page.map((row) => [row.kind, row.delta])).toEqual([
    ["opening", 5],
  ]);
});
