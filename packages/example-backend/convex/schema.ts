import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  jobs: defineTable({
    owner: v.string(),
    requestId: v.string(),
    chargeId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
    ),
  }).index("by_owner_requestId", ["owner", "requestId"]),
});
