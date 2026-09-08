import { Credits } from "@clipin/convex-credits";
import { v } from "convex/values";
import { components, internal } from "./_generated/api.js";
import type { QueryCtx } from "./_generated/server.js";
import { internalMutation, mutation, query } from "./_generated/server.js";

const credits = new Credits(components.credits, "example");
async function owner(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHENTICATED");
  return identity.tokenIdentifier;
}
export const balance = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => credits.balance(ctx, { owner: await owner(ctx) }),
});
export const start = mutation({
  args: {
    requestId: v.string(),
    outcome: v.union(v.literal("success"), v.literal("failure")),
  },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    const user = await owner(ctx);
    if (!args.requestId.trim() || args.requestId.length > 100)
      throw new Error("INVALID_REQUEST_ID");
    const prior = await ctx.db
      .query("jobs")
      .withIndex("by_owner_requestId", (q) =>
        q.eq("owner", user).eq("requestId", args.requestId),
      )
      .unique();
    if (prior) return prior._id;
    await credits.grant(ctx, {
      owner: user,
      amount: 20,
      key: JSON.stringify([user, "welcome"]),
      reason: "Example welcome credits",
      reference: "welcome",
    });
    const reserved = await credits.reserve(ctx, {
      owner: user,
      amount: 10,
      key: JSON.stringify([user, "job", args.requestId]),
      reason: "Example job",
      reference: args.requestId,
    });
    const jobId = await ctx.db.insert("jobs", {
      owner: user,
      requestId: args.requestId,
      chargeId: reserved.chargeId,
      status: "pending",
    });
    await ctx.scheduler.runAfter(2000, internal.jobs.finish, {
      jobId,
      outcome: args.outcome,
    });
    return jobId;
  },
});
/** This example simulates work. Real workflows call this after the provider outcome is known. */
export const finish = internalMutation({
  args: {
    jobId: v.id("jobs"),
    outcome: v.union(v.literal("success"), v.literal("failure")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (job?.status !== "pending") return null;
    const operation = {
      chargeId: job.chargeId,
      key: JSON.stringify([job.owner, "finish", job.requestId]),
    };
    if (args.outcome === "success") await credits.complete(ctx, operation);
    else await credits.release(ctx, operation);
    await ctx.db.patch(job._id, {
      status: args.outcome === "success" ? "completed" : "failed",
    });
    return null;
  },
});
