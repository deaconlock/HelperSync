import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertAuthenticated } from "./auth.helpers";

export const getMySession = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("helperSessions")
      .withIndex("by_helper", (q) => q.eq("helperUserId", identity.subject))
      .first();
  },
});

export const getSessionByHousehold = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify the caller is the employer of this household
    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found");
    if (household.employerUserId !== identity.subject) {
      throw new Error("Not authorized to access this household");
    }

    return await ctx.db
      .query("helperSessions")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .first();
  },
});

export const createOrUpdateSession = mutation({
  args: {
    householdId: v.id("households"),
    language: v.string(),
    pinHash: v.string(),
  },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);

    // Validate household exists
    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found");

    const identity = (await ctx.auth.getUserIdentity())!;

    const existing = await ctx.db
      .query("helperSessions")
      .withIndex("by_helper", (q) => q.eq("helperUserId", identity.subject))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        householdId: args.householdId,
        language: args.language,
        pinHash: args.pinHash,
      });
      return existing._id;
    }

    return await ctx.db.insert("helperSessions", {
      helperUserId: identity.subject,
      householdId: args.householdId,
      language: args.language,
      pinHash: args.pinHash,
      onboardedAt: Date.now(),
    });
  },
});

export const updateLanguage = mutation({
  args: { language: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db
      .query("helperSessions")
      .withIndex("by_helper", (q) => q.eq("helperUserId", identity.subject))
      .first();

    if (session) {
      await ctx.db.patch(session._id, { language: args.language });
    }
  },
});

export const updatePin = mutation({
  args: { pinHash: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db
      .query("helperSessions")
      .withIndex("by_helper", (q) => q.eq("helperUserId", identity.subject))
      .first();

    if (session) {
      await ctx.db.patch(session._id, { pinHash: args.pinHash });
    }
  },
});
