import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertHouseholdAccess } from "./auth.helpers";

export const getSubscription = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .first();
  },
});

// Note: upsertSubscription is called from webhook handler (no user auth).
// Keep it unprotected but it should only be called server-side.
export const upsertSubscription = mutation({
  args: {
    householdId: v.id("households"),
    polarSubscriptionId: v.optional(v.string()),
    status: v.union(
      v.literal("trialing"),
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due")
    ),
    trialEndsAt: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .first();

    const updates = {
      householdId: args.householdId,
      polarSubscriptionId: args.polarSubscriptionId,
      status: args.status,
      trialEndsAt: args.trialEndsAt ?? (existing?.trialEndsAt ?? Date.now()),
      currentPeriodEnd: args.currentPeriodEnd,
    };

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("subscriptions", updates);
    }
  },
});

// Mark payment as collected (called from webhook when checkout completes)
export const markPaymentCollected = mutation({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .first();
    if (sub) {
      await ctx.db.patch(sub._id, { paymentCollectedAt: Date.now() });
    }
  },
});

// DEV ONLY: Simulate trial day for testing
export const devSetTrialDay = mutation({
  args: {
    householdId: v.id("households"),
    trialDay: v.number(),
    hasPayment: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .first();
    if (!sub) throw new Error("No subscription found");

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    // Set trialEndsAt so that "today" appears as the specified trial day
    const trialEndsAt = Date.now() + (14 - args.trialDay) * MS_PER_DAY;

    await ctx.db.patch(sub._id, {
      trialEndsAt,
      status: "trialing" as const,
      paymentCollectedAt: args.hasPayment ? Date.now() : undefined,
    });
  },
});
