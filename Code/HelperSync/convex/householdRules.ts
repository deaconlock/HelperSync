import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function assertOwner(ctx: any, householdId: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const household = await ctx.db.get(householdId);
  if (!household) throw new Error("Household not found");
  if (household.employerUserId !== identity.subject) throw new Error("Forbidden");
}

export const getRules = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, { householdId }) => {
    return ctx.db
      .query("householdRules")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect();
  },
});

export const addRule = mutation({
  args: {
    householdId: v.id("households"),
    type: v.union(
      v.literal("FIXED_TASK"),
      v.literal("TIME_BLOCK"),
      v.literal("CUSTOM_RULE"),
    ),
    title: v.string(),
    days: v.array(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    duration: v.optional(v.number()),
    constraint: v.optional(v.string()),
    notes: v.optional(v.string()),
    requiresPhoto: v.optional(v.boolean()),
  },
  handler: async (ctx, { householdId, ...rule }) => {
    await assertOwner(ctx, householdId);
    return ctx.db.insert("householdRules", {
      householdId,
      ...rule,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const updateRule = mutation({
  args: {
    ruleId: v.id("householdRules"),
    title: v.optional(v.string()),
    days: v.optional(v.array(v.string())),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    duration: v.optional(v.number()),
    constraint: v.optional(v.string()),
    notes: v.optional(v.string()),
    requiresPhoto: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { ruleId, ...updates }) => {
    const rule = await ctx.db.get(ruleId);
    if (!rule) throw new Error("Rule not found");
    await assertOwner(ctx, rule.householdId);
    await ctx.db.patch(ruleId, updates);
  },
});

export const deleteRule = mutation({
  args: { ruleId: v.id("householdRules") },
  handler: async (ctx, { ruleId }) => {
    const rule = await ctx.db.get(ruleId);
    if (!rule) throw new Error("Rule not found");
    await assertOwner(ctx, rule.householdId);
    await ctx.db.delete(ruleId);
  },
});
