// @vitest-environment node
import { readFileSync } from "node:fs";
import type { FunctionReturnType } from "convex/server";
import { v } from "convex/values";
import { parse } from "convex-helpers/validators";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../src/component/_generated/api.js";
import schema from "../src/component/schema.js";

const snapshotPath = process.env.CREDITS_IMPORT_SNAPSHOT;
const snapshotValidator = v.object({
  capturedAt: v.number(),
  accounts: v.array(v.object({ owner: v.string(), balance: v.number() })),
  movements: v.array(
    v.object({
      sourceId: v.string(),
      owner: v.string(),
      delta: v.number(),
      balanceAfter: v.number(),
      occurredAt: v.number(),
      reason: v.string(),
      status: v.string(),
    }),
  ),
});

test.skipIf(!snapshotPath)(
  "rehearse a private source snapshot without changing the source",
  async () => {
    if (!snapshotPath)
      throw new Error("Set CREDITS_IMPORT_SNAPSHOT to a local JSON snapshot");
    const snapshot = parse(
      snapshotValidator,
      JSON.parse(readFileSync(snapshotPath, "utf8")),
    );
    const t = convexTest(schema, import.meta.glob("../src/component/**/*.ts"));
    let importedMovements = 0;
    let totalBalance = 0;
    for (const account of snapshot.accounts) {
      const scope = { namespace: "rehearsal", owner: account.owner };
      const movements = snapshot.movements
        .filter((row) => row.owner === account.owner && row.delta !== 0)
        .sort((a, b) => a.occurredAt - b.occurredAt);
      const first = movements[0];
      const openingBalance = first
        ? first.balanceAfter - first.delta
        : account.balance;
      await t.mutation(api.credits.beginImport, {
        ...scope,
        key: `begin:${account.owner}`,
        openingBalance,
        expectedBalance: account.balance,
        expectedMovements: movements.length,
        expectedPendingCharges: movements.filter(
          (row) => row.status === "pending",
        ).length,
        occurredAt: 0,
        reference: `snapshot:${snapshot.capturedAt}`,
      });
      for (const row of movements) {
        const request = {
          ...scope,
          key: `source:${row.sourceId}`,
          delta: row.delta,
          balanceAfter: row.balanceAfter,
          occurredAt: row.occurredAt,
          reason: row.reason,
          reference: row.sourceId,
          pendingCharge: row.status === "pending",
        };
        const imported = await t.mutation(api.credits.importMovement, request);
        expect(await t.mutation(api.credits.importMovement, request)).toEqual(
          imported,
        );
        importedMovements++;
      }
      await t.mutation(api.credits.finishImport, {
        ...scope,
        key: `finish:${account.owner}`,
      });
      expect(await t.query(api.credits.balance, scope)).toBe(account.balance);
      let cursor: string | null = null;
      let ledgerSum = 0;
      for (;;) {
        const page: FunctionReturnType<typeof api.credits.history> =
          await t.query(api.credits.history, {
            ...scope,
            paginationOpts: { cursor, numItems: 25 },
          });
        ledgerSum += page.page.reduce(
          (sum, movement) => sum + movement.delta,
          0,
        );
        if (page.isDone) break;
        cursor = page.continueCursor;
      }
      expect(ledgerSum).toBe(account.balance);
      totalBalance += ledgerSum;
    }
    console.log(
      JSON.stringify({
        accounts: snapshot.accounts.length,
        importedMovements,
        totalBalance,
      }),
    );
  },
  60_000,
);
