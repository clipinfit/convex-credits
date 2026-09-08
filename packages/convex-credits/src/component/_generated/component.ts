/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    credits: {
      balance: FunctionReference<
        "query",
        "internal",
        { namespace: string; owner: string },
        number,
        Name
      >;
      beginImport: FunctionReference<
        "mutation",
        "internal",
        {
          expectedBalance: number;
          expectedMovements: number;
          expectedPendingCharges: number;
          key: string;
          namespace: string;
          occurredAt: number;
          openingBalance: number;
          owner: string;
          reference: string;
        },
        { accountId: string; balance: number; kind: "beginImport" },
        Name
      >;
      complete: FunctionReference<
        "mutation",
        "internal",
        { chargeId: string; key: string; namespace: string },
        { chargeId: string; kind: "complete" },
        Name
      >;
      finishImport: FunctionReference<
        "mutation",
        "internal",
        { key: string; namespace: string; owner: string },
        { accountId: string; balance: number; kind: "finishImport" },
        Name
      >;
      getAccount: FunctionReference<
        "query",
        "internal",
        { namespace: string; owner: string },
        null | {
          _creationTime: number;
          _id: string;
          balance: number;
          namespace: string;
          owner: string;
          state:
            | { kind: "active" }
            | {
                expectedBalance: number;
                expectedMovements: number;
                expectedPendingCharges: number;
                importedMovements: number;
                importedPendingCharges: number;
                kind: "importing";
                lastOccurredAt: number;
              };
        },
        Name
      >;
      getCharge: FunctionReference<
        "query",
        "internal",
        { chargeId: string; namespace: string },
        null | {
          _creationTime: number;
          _id: string;
          accountId: string;
          amount: number;
          namespace: string;
          reason: string;
          reference: string;
          state:
            | { kind: "pending" }
            | { completedAt: number; kind: "completed"; refunded: number }
            | { kind: "released"; releasedAt: number };
        },
        Name
      >;
      grant: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          key: string;
          namespace: string;
          owner: string;
          reason: string;
          reference: string;
        },
        { balance: number; kind: "grant"; movementId: string },
        Name
      >;
      history: FunctionReference<
        "query",
        "internal",
        {
          namespace: string;
          owner: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            accountId: string;
            balanceAfter: number;
            chargeId?: string;
            delta: number;
            kind:
              | "grant"
              | "reserve"
              | "release"
              | "refund"
              | "transfer_in"
              | "transfer_out"
              | "opening"
              | "import";
            namespace: string;
            occurredAt: number;
            operationKey: string;
            reason: string;
            reference: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
      importMovement: FunctionReference<
        "mutation",
        "internal",
        {
          balanceAfter: number;
          delta: number;
          key: string;
          namespace: string;
          occurredAt: number;
          owner: string;
          pendingCharge: boolean;
          reason: string;
          reference: string;
        },
        {
          balance: number;
          chargeId?: string;
          kind: "importMovement";
          movementId: string;
        },
        Name
      >;
      refund: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          chargeId: string;
          key: string;
          namespace: string;
          reason: string;
        },
        { balance: number; kind: "refund"; movementId: string },
        Name
      >;
      release: FunctionReference<
        "mutation",
        "internal",
        { chargeId: string; key: string; namespace: string },
        { balance: number; chargeId: string; kind: "release" },
        Name
      >;
      reserve: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          key: string;
          namespace: string;
          owner: string;
          reason: string;
          reference: string;
        },
        { balance: number; chargeId: string; kind: "reserve" },
        Name
      >;
      transfer: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          from: string;
          key: string;
          namespace: string;
          reason: string;
          reference: string;
          to: string;
        },
        {
          creditId: string;
          debitId: string;
          fromBalance: number;
          kind: "transfer";
          toBalance: number;
        },
        Name
      >;
    };
  };
