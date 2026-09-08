import type {
  FunctionArgs,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

type MutationCtx = Pick<GenericMutationCtx<GenericDataModel>, "runMutation">;
type QueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;
type Args<K extends keyof ComponentApi["credits"]> = Omit<
  FunctionArgs<ComponentApi["credits"][K]>,
  "namespace"
>;
/** The host authenticates callers, verifies payments, and supplies trusted prices. */
export class Credits {
  constructor(
    readonly component: ComponentApi,
    readonly namespace: string = "default",
  ) {}
  grant(ctx: MutationCtx, args: Args<"grant">) {
    return ctx.runMutation(this.component.credits.grant, {
      ...args,
      namespace: this.namespace,
    });
  }
  reserve(ctx: MutationCtx, args: Args<"reserve">) {
    return ctx.runMutation(this.component.credits.reserve, {
      ...args,
      namespace: this.namespace,
    });
  }
  complete(ctx: MutationCtx, args: Args<"complete">) {
    return ctx.runMutation(this.component.credits.complete, {
      ...args,
      namespace: this.namespace,
    });
  }
  release(ctx: MutationCtx, args: Args<"release">) {
    return ctx.runMutation(this.component.credits.release, {
      ...args,
      namespace: this.namespace,
    });
  }
  refund(ctx: MutationCtx, args: Args<"refund">) {
    return ctx.runMutation(this.component.credits.refund, {
      ...args,
      namespace: this.namespace,
    });
  }
  transfer(ctx: MutationCtx, args: Args<"transfer">) {
    return ctx.runMutation(this.component.credits.transfer, {
      ...args,
      namespace: this.namespace,
    });
  }
  balance(ctx: QueryCtx, args: Args<"balance">) {
    return ctx.runQuery(this.component.credits.balance, {
      ...args,
      namespace: this.namespace,
    });
  }
  getCharge(ctx: QueryCtx, args: Args<"getCharge">) {
    return ctx.runQuery(this.component.credits.getCharge, {
      ...args,
      namespace: this.namespace,
    });
  }
  history(ctx: QueryCtx, args: Args<"history">) {
    return ctx.runQuery(this.component.credits.history, {
      ...args,
      namespace: this.namespace,
    });
  }
  getAccount(ctx: QueryCtx, args: Args<"getAccount">) {
    return ctx.runQuery(this.component.credits.getAccount, {
      ...args,
      namespace: this.namespace,
    });
  }

  beginImport(ctx: MutationCtx, args: Args<"beginImport">) {
    return ctx.runMutation(this.component.credits.beginImport, {
      ...args,
      namespace: this.namespace,
    });
  }

  importMovement(ctx: MutationCtx, args: Args<"importMovement">) {
    return ctx.runMutation(this.component.credits.importMovement, {
      ...args,
      namespace: this.namespace,
    });
  }

  finishImport(ctx: MutationCtx, args: Args<"finishImport">) {
    return ctx.runMutation(this.component.credits.finishImport, {
      ...args,
      namespace: this.namespace,
    });
  }
}
