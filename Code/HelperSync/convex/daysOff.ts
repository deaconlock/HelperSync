import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertHouseholdAccess } from "./auth.helpers";

export const getDaysOff = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    return await ctx.db
      .query("daysOff")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();
  },
});

export const addDayOff = mutation({
  args: {
    householdId: v.id("households"),
    date: v.string(),
    type: v.union(
      v.literal("RestDay"),
      v.literal("PublicHoliday"),
      v.literal("Leave")
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);

    const existing = await ctx.db
      .query("daysOff")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { type: args.type, note: args.note });
      return existing._id;
    }

    return await ctx.db.insert("daysOff", {
      householdId: args.householdId,
      date: args.date,
      type: args.type,
      note: args.note,
    });
  },
});

export const removeDayOff = mutation({
  args: {
    householdId: v.id("households"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);

    const existing = await ctx.db
      .query("daysOff")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
