import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const chargeState = v.union(
  v.object({ kind: v.literal("pending") }),
  v.object({
    kind: v.literal("completed"),
    refunded: v.number(),
    completedAt: v.number(),
  }),
  v.object({ kind: v.literal("released"), releasedAt: v.number() }),
);
export const accountState = v.union(
  v.object({ kind: v.literal("active") }),
  v.object({
    kind: v.literal("importing"),
    expectedBalance: v.number(),
    expectedMovements: v.number(),
    expectedPendingCharges: v.number(),
    importedMovements: v.number(),
    importedPendingCharges: v.number(),
    lastOccurredAt: v.number(),
  }),
);
export const operationResult = v.union(
  v.object({
    kind: v.literal("grant"),
    movementId: v.id("movements"),
    balance: v.number(),
  }),
  v.object({
    kind: v.literal("reserve"),
    chargeId: v.id("charges"),
    balance: v.number(),
  }),
  v.object({ kind: v.literal("complete"), chargeId: v.id("charges") }),
  v.object({
    kind: v.literal("release"),
    chargeId: v.id("charges"),
    balance: v.number(),
  }),
  v.object({
    kind: v.literal("refund"),
    movementId: v.id("movements"),
    balance: v.number(),
  }),
  v.object({
    kind: v.literal("transfer"),
    debitId: v.id("movements"),
    creditId: v.id("movements"),
    fromBalance: v.number(),
    toBalance: v.number(),
  }),
  v.object({
    kind: v.literal("beginImport"),
    accountId: v.id("accounts"),
    balance: v.number(),
  }),
  v.object({
    kind: v.literal("importMovement"),
    movementId: v.id("movements"),
    balance: v.number(),
    chargeId: v.optional(v.id("charges")),
  }),
  v.object({
    kind: v.literal("finishImport"),
    accountId: v.id("accounts"),
    balance: v.number(),
  }),
);
export default defineSchema({
  accounts: defineTable({
    namespace: v.string(),
    owner: v.string(),
    balance: v.number(),
    state: accountState,
  }).index("by_namespace_owner", ["namespace", "owner"]),
  charges: defineTable({
    namespace: v.string(),
    accountId: v.id("accounts"),
    amount: v.number(),
    reference: v.string(),
    reason: v.string(),
    state: chargeState,
  }).index("by_namespace_accountId", ["namespace", "accountId"]),
  movements: defineTable({
    namespace: v.string(),
    accountId: v.id("accounts"),
    delta: v.number(),
    balanceAfter: v.number(),
    kind: v.union(
      v.literal("grant"),
      v.literal("reserve"),
      v.literal("release"),
      v.literal("refund"),
      v.literal("transfer_in"),
      v.literal("transfer_out"),
      v.literal("opening"),
      v.literal("import"),
    ),
    reason: v.string(),
    reference: v.string(),
    chargeId: v.optional(v.id("charges")),
    operationKey: v.string(),
    occurredAt: v.number(),
  }).index("by_namespace_accountId", ["namespace", "accountId", "occurredAt"]),
  operations: defineTable({
    namespace: v.string(),
    key: v.string(),
    request: v.string(),
    result: operationResult,
  }).index("by_namespace_key", ["namespace", "key"]),
});
