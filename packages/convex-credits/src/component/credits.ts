import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import type { Infer } from "convex/values";
import { ConvexError, v } from "convex/values";
import { paginator } from "convex-helpers/server/pagination";
import type { Doc } from "./_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "./_generated/server.js";
import { mutation, query } from "./_generated/server.js";
import schema, { operationResult } from "./schema.js";

const accountDocument = v.object({
  ...schema.tables.accounts.validator.fields,
  _id: v.id("accounts"),
  _creationTime: v.number(),
});
const chargeDocument = v.object({
  ...schema.tables.charges.validator.fields,
  _id: v.id("charges"),
  _creationTime: v.number(),
});
const movementDocument = v.object({
  ...schema.tables.movements.validator.fields,
  _id: v.id("movements"),
  _creationTime: v.number(),
});

const operationArgs = { namespace: v.string(), key: v.string() };
const movementArgs = {
  ...operationArgs,
  owner: v.string(),
  amount: v.number(),
  reason: v.string(),
  reference: v.string(),
};
const chargeArgs = { ...operationArgs, chargeId: v.id("charges") };
type Scope = { namespace: string; key: string };
function fail(code: string): never {
  throw new ConvexError({ code });
}
function positive(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) fail("INVALID_AMOUNT");
}
function nonempty(value: string) {
  if (!value.trim() || value.length > 512) fail("INVALID_IDENTIFIER");
}
function checkedBalance(balance: number, delta: number) {
  const next = balance + delta;
  if (next < 0) fail("INSUFFICIENT_CREDITS");
  if (!Number.isSafeInteger(next)) fail("BALANCE_OVERFLOW");
  return next;
}
function fingerprint(kind: string, args: Record<string, unknown>) {
  return JSON.stringify([
    kind,
    Object.keys(args)
      .sort()
      .map((key) => [key, args[key]]),
  ]);
}
async function replay(ctx: MutationCtx, args: Scope, request: string) {
  nonempty(args.namespace);
  nonempty(args.key);
  const existing = await ctx.db
    .query("operations")
    .withIndex("by_namespace_key", (q) =>
      q.eq("namespace", args.namespace).eq("key", args.key),
    )
    .unique();
  if (!existing) return null;
  if (existing.request !== request) fail("OPERATION_KEY_CONFLICT");
  return existing.result;
}
async function record(
  ctx: MutationCtx,
  args: Scope,
  request: string,
  result: Infer<typeof operationResult>,
) {
  await ctx.db.insert("operations", { ...args, request, result });
}
async function findAccount(ctx: QueryCtx, namespace: string, owner: string) {
  return ctx.db
    .query("accounts")
    .withIndex("by_namespace_owner", (q) =>
      q.eq("namespace", namespace).eq("owner", owner),
    )
    .unique();
}
async function account(ctx: MutationCtx, namespace: string, owner: string) {
  nonempty(owner);
  const existing = await findAccount(ctx, namespace, owner);
  if (existing) {
    assertActive(existing);
    return existing;
  }
  const id = await ctx.db.insert("accounts", {
    namespace,
    owner,
    balance: 0,
    state: { kind: "active" },
  });
  const created = await ctx.db.get(id);
  if (!created) fail("ACCOUNT_NOT_FOUND");
  return created;
}
function assertActive(owner: Doc<"accounts">) {
  if (owner.state.kind !== "active") fail("ACCOUNT_IMPORTING");
}
async function move(
  ctx: MutationCtx,
  args: {
    account: Doc<"accounts">;
    delta: number;
    kind: Doc<"movements">["kind"];
    reason: string;
    reference: string;
    key: string;
    chargeId?: Doc<"charges">["_id"];
    occurredAt?: number;
  },
) {
  const balance = checkedBalance(args.account.balance, args.delta);
  await ctx.db.patch(args.account._id, { balance });
  const movementId = await ctx.db.insert("movements", {
    namespace: args.account.namespace,
    accountId: args.account._id,
    delta: args.delta,
    balanceAfter: balance,
    kind: args.kind,
    reason: args.reason,
    reference: args.reference,
    operationKey: args.key,
    chargeId: args.chargeId,
    occurredAt: args.occurredAt ?? Date.now(),
  });
  return { movementId, balance };
}
async function charge(
  ctx: MutationCtx,
  args: { namespace: string; chargeId: Doc<"charges">["_id"] },
) {
  const found = await ctx.db.get(args.chargeId);
  if (!found || found.namespace !== args.namespace) fail("CHARGE_NOT_FOUND");
  const owner = await ctx.db.get(found.accountId);
  if (!owner) fail("ACCOUNT_NOT_FOUND");
  assertActive(owner);
  return { found, owner };
}

export const grant = mutation({
  returns: operationResult.members[0],
  args: movementArgs,
  handler: async (ctx, args) => {
    positive(args.amount);
    const request = fingerprint("grant", args);
    const previous = await replay(ctx, args, request);
    if (previous) {
      if (previous.kind !== "grant") fail("OPERATION_KEY_CONFLICT");
      return previous;
    }
    const owner = await account(ctx, args.namespace, args.owner);
    const result = {
      kind: "grant",
      ...(await move(ctx, {
        account: owner,
        delta: args.amount,
        kind: "grant",
        reason: args.reason,
        reference: args.reference,
        key: args.key,
      })),
    } satisfies Infer<typeof operationResult>;
    await record(
      ctx,
      { namespace: args.namespace, key: args.key },
      request,
      result,
    );
    return result;
  },
});

export const reserve = mutation({
  returns: operationResult.members[1],
  args: movementArgs,
  handler: async (ctx, args) => {
    positive(args.amount);
    const request = fingerprint("reserve", args);
    const previous = await replay(ctx, args, request);
    if (previous) {
      if (previous.kind !== "reserve") fail("OPERATION_KEY_CONFLICT");
      return previous;
    }
    const owner = await account(ctx, args.namespace, args.owner);
    checkedBalance(owner.balance, -args.amount);
    const chargeId = await ctx.db.insert("charges", {
      namespace: args.namespace,
      accountId: owner._id,
      amount: args.amount,
      reason: args.reason,
      reference: args.reference,
      state: { kind: "pending" },
    });
    const { balance } = await move(ctx, {
      account: owner,
      delta: -args.amount,
      kind: "reserve",
      reason: args.reason,
      reference: args.reference,
      key: args.key,
      chargeId,
    });
    const result = { kind: "reserve", chargeId, balance } satisfies Infer<
      typeof operationResult
    >;
    await record(
      ctx,
      { namespace: args.namespace, key: args.key },
      request,
      result,
    );
    return result;
  },
});

export const complete = mutation({
  returns: operationResult.members[2],
  args: chargeArgs,
  handler: async (ctx, args) => {
    const request = fingerprint("complete", args);
    const previous = await replay(ctx, args, request);
    if (previous) {
      if (previous.kind !== "complete") fail("OPERATION_KEY_CONFLICT");
      return previous;
    }
    const { found } = await charge(ctx, args);
    if (found.state.kind === "released") fail("CHARGE_RELEASED");
    if (found.state.kind === "pending")
      await ctx.db.patch(found._id, {
        state: { kind: "completed", refunded: 0, completedAt: Date.now() },
      });
    const result = { kind: "complete", chargeId: found._id } satisfies Infer<
      typeof operationResult
    >;
    await record(
      ctx,
      { namespace: args.namespace, key: args.key },
      request,
      result,
    );
    return result;
  },
});

export const release = mutation({
  returns: operationResult.members[3],
  args: chargeArgs,
  handler: async (ctx, args) => {
    const request = fingerprint("release", args);
    const previous = await replay(ctx, args, request);
    if (previous) {
      if (previous.kind !== "release") fail("OPERATION_KEY_CONFLICT");
      return previous;
    }
    const { found, owner } = await charge(ctx, args);
    if (found.state.kind === "completed") fail("CHARGE_COMPLETED");
    let balance = owner.balance;
    if (found.state.kind === "pending") {
      ({ balance } = await move(ctx, {
        account: owner,
        delta: found.amount,
        kind: "release",
        reason: found.reason,
        reference: found.reference,
        key: args.key,
        chargeId: found._id,
      }));
      await ctx.db.patch(found._id, {
        state: { kind: "released", releasedAt: Date.now() },
      });
    }
    const result = {
      kind: "release",
      chargeId: found._id,
      balance,
    } satisfies Infer<typeof operationResult>;
    await record(
      ctx,
      { namespace: args.namespace, key: args.key },
      request,
      result,
    );
    return result;
  },
});

export const refund = mutation({
  returns: operationResult.members[4],
  args: { ...chargeArgs, amount: v.number(), reason: v.string() },
  handler: async (ctx, args) => {
    positive(args.amount);
    const request = fingerprint("refund", args);
    const previous = await replay(ctx, args, request);
    if (previous) {
      if (previous.kind !== "refund") fail("OPERATION_KEY_CONFLICT");
      return previous;
    }
    const { found, owner } = await charge(ctx, args);
    if (found.state.kind !== "completed") fail("CHARGE_NOT_COMPLETED");
    if (args.amount > found.amount - found.state.refunded)
      fail("REFUND_EXCEEDS_CHARGE");
    const result = {
      kind: "refund",
      ...(await move(ctx, {
        account: owner,
        delta: args.amount,
        kind: "refund",
        reason: args.reason,
        reference: found.reference,
        key: args.key,
        chargeId: found._id,
      })),
    } satisfies Infer<typeof operationResult>;
    await ctx.db.patch(found._id, {
      state: { ...found.state, refunded: found.state.refunded + args.amount },
    });
    await record(
      ctx,
      { namespace: args.namespace, key: args.key },
      request,
      result,
    );
    return result;
  },
});

export const transfer = mutation({
  returns: operationResult.members[5],
  args: {
    ...operationArgs,
    from: v.string(),
    to: v.string(),
    amount: v.number(),
    reason: v.string(),
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    positive(args.amount);
    if (args.from === args.to) fail("SELF_TRANSFER");
    const request = fingerprint("transfer", args);
    const previous = await replay(ctx, args, request);
    if (previous) {
      if (previous.kind !== "transfer") fail("OPERATION_KEY_CONFLICT");
      return previous;
    }
    const from = await account(ctx, args.namespace, args.from);
    const to = await account(ctx, args.namespace, args.to);
    const debit = await move(ctx, {
      account: from,
      delta: -args.amount,
      kind: "transfer_out",
      reason: args.reason,
      reference: args.reference,
      key: args.key,
    });
    const credit = await move(ctx, {
      account: to,
      delta: args.amount,
      kind: "transfer_in",
      reason: args.reason,
      reference: args.reference,
      key: args.key,
    });
    const result = {
      kind: "transfer",
      debitId: debit.movementId,
      creditId: credit.movementId,
      fromBalance: debit.balance,
      toBalance: credit.balance,
    } satisfies Infer<typeof operationResult>;
    await record(
      ctx,
      { namespace: args.namespace, key: args.key },
      request,
      result,
    );
    return result;
  },
});

export const balance = query({
  returns: v.number(),
  args: { namespace: v.string(), owner: v.string() },
  handler: async (ctx, args) => {
    const owner = await findAccount(ctx, args.namespace, args.owner);
    if (!owner) return 0;
    assertActive(owner);
    return owner.balance;
  },
});
export const getCharge = query({
  returns: v.union(v.null(), chargeDocument),
  args: { namespace: v.string(), chargeId: v.id("charges") },
  handler: async (ctx, args) => {
    const found = await ctx.db.get(args.chargeId);
    return found?.namespace === args.namespace ? found : null;
  },
});
export const history = query({
  returns: paginationResultValidator(movementDocument),
  args: {
    namespace: v.string(),
    owner: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const owner = await findAccount(ctx, args.namespace, args.owner);
    if (!owner) return { page: [], isDone: true, continueCursor: "" };
    return paginator(ctx.db, schema)
      .query("movements")
      .withIndex("by_namespace_accountId", (q) =>
        q.eq("namespace", args.namespace).eq("accountId", owner._id),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getAccount = query({
  args: { namespace: v.string(), owner: v.string() },
  returns: v.union(v.null(), accountDocument),
  handler: (ctx, args) => findAccount(ctx, args.namespace, args.owner),
});

function nonnegative(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) fail("INVALID_AMOUNT");
}
function timestamp(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > Date.now())
    fail("INVALID_TIMESTAMP");
}

/** Start an account import. Normal mutations stay disabled until reconciliation. */
export const beginImport = mutation({
  args: {
    ...operationArgs,
    owner: v.string(),
    openingBalance: v.number(),
    expectedBalance: v.number(),
    expectedMovements: v.number(),
    expectedPendingCharges: v.number(),
    occurredAt: v.number(),
    reference: v.string(),
  },
  returns: operationResult.members[6],
  handler: async (ctx, args) => {
    nonempty(args.owner);
    nonnegative(args.openingBalance);
    nonnegative(args.expectedBalance);
    nonnegative(args.expectedMovements);
    nonnegative(args.expectedPendingCharges);
    timestamp(args.occurredAt);
    if (args.expectedPendingCharges > args.expectedMovements)
      fail("INVALID_IMPORT_COUNTS");
    const request = fingerprint("beginImport", args);
    const previous = await replay(ctx, args, request);
    if (previous) {
      if (previous.kind !== "beginImport") fail("OPERATION_KEY_CONFLICT");
      return previous;
    }
    if (await findAccount(ctx, args.namespace, args.owner))
      fail("ACCOUNT_EXISTS");
    const accountId = await ctx.db.insert("accounts", {
      namespace: args.namespace,
      owner: args.owner,
      balance: 0,
      state: {
        kind: "importing",
        expectedBalance: args.expectedBalance,
        expectedMovements: args.expectedMovements,
        expectedPendingCharges: args.expectedPendingCharges,
        importedMovements: 0,
        importedPendingCharges: 0,
        lastOccurredAt: args.occurredAt,
      },
    });
    const owner = await ctx.db.get(accountId);
    if (!owner) fail("ACCOUNT_NOT_FOUND");
    if (args.openingBalance > 0)
      await move(ctx, {
        account: owner,
        delta: args.openingBalance,
        kind: "opening",
        reason: "Opening balance",
        reference: args.reference,
        key: args.key,
        occurredAt: args.occurredAt,
      });
    const result = {
      kind: "beginImport",
      accountId,
      balance: args.openingBalance,
    } satisfies Infer<typeof operationResult>;
    await record(
      ctx,
      { namespace: args.namespace, key: args.key },
      request,
      result,
    );
    return result;
  },
});

/** Import nonzero source movements in chronological order. Use source IDs as keys. */
export const importMovement = mutation({
  args: {
    ...operationArgs,
    owner: v.string(),
    delta: v.number(),
    balanceAfter: v.number(),
    occurredAt: v.number(),
    reason: v.string(),
    reference: v.string(),
    pendingCharge: v.boolean(),
  },
  returns: operationResult.members[7],
  handler: async (ctx, args) => {
    positive(Math.abs(args.delta));
    nonnegative(args.balanceAfter);
    timestamp(args.occurredAt);
    if (args.pendingCharge && args.delta > 0) fail("INVALID_PENDING_CHARGE");
    const request = fingerprint("importMovement", args);
    const previous = await replay(ctx, args, request);
    if (previous) {
      if (previous.kind !== "importMovement") fail("OPERATION_KEY_CONFLICT");
      return previous;
    }
    const owner = await findAccount(ctx, args.namespace, args.owner);
    if (!owner) fail("ACCOUNT_NOT_FOUND");
    const state = owner.state;
    if (state.kind !== "importing") fail("ACCOUNT_NOT_IMPORTING");
    if (state.importedMovements >= state.expectedMovements)
      fail("IMPORT_COUNT_MISMATCH");
    if (args.occurredAt < state.lastOccurredAt) fail("IMPORT_OUT_OF_ORDER");
    if (checkedBalance(owner.balance, args.delta) !== args.balanceAfter)
      fail("IMPORT_BALANCE_MISMATCH");
    const importedPendingCharges =
      state.importedPendingCharges + (args.pendingCharge ? 1 : 0);
    if (importedPendingCharges > state.expectedPendingCharges)
      fail("IMPORT_COUNT_MISMATCH");
    const chargeId = args.pendingCharge
      ? await ctx.db.insert("charges", {
          namespace: args.namespace,
          accountId: owner._id,
          amount: -args.delta,
          reason: args.reason,
          reference: args.reference,
          state: { kind: "pending" },
        })
      : undefined;
    const movement = await move(ctx, {
      account: owner,
      delta: args.delta,
      kind: "import",
      reason: args.reason,
      reference: args.reference,
      key: args.key,
      occurredAt: args.occurredAt,
      chargeId,
    });
    await ctx.db.patch(owner._id, {
      state: {
        ...state,
        importedMovements: state.importedMovements + 1,
        importedPendingCharges,
        lastOccurredAt: args.occurredAt,
      },
    });
    const result = {
      kind: "importMovement",
      ...movement,
      chargeId,
    } satisfies Infer<typeof operationResult>;
    await record(
      ctx,
      { namespace: args.namespace, key: args.key },
      request,
      result,
    );
    return result;
  },
});

/** Activate only when the imported counts and balance match the source snapshot. */
export const finishImport = mutation({
  args: { ...operationArgs, owner: v.string() },
  returns: operationResult.members[8],
  handler: async (ctx, args) => {
    const request = fingerprint("finishImport", args);
    const previous = await replay(ctx, args, request);
    if (previous) {
      if (previous.kind !== "finishImport") fail("OPERATION_KEY_CONFLICT");
      return previous;
    }
    const owner = await findAccount(ctx, args.namespace, args.owner);
    if (!owner) fail("ACCOUNT_NOT_FOUND");
    const state = owner.state;
    if (state.kind !== "importing") fail("ACCOUNT_NOT_IMPORTING");
    if (
      state.expectedMovements !== state.importedMovements ||
      state.expectedPendingCharges !== state.importedPendingCharges
    )
      fail("IMPORT_COUNT_MISMATCH");
    if (owner.balance !== state.expectedBalance)
      fail("IMPORT_BALANCE_MISMATCH");
    await ctx.db.patch(owner._id, { state: { kind: "active" } });
    const result = {
      kind: "finishImport",
      accountId: owner._id,
      balance: owner.balance,
    } satisfies Infer<typeof operationResult>;
    await record(
      ctx,
      { namespace: args.namespace, key: args.key },
      request,
      result,
    );
    return result;
  },
});
