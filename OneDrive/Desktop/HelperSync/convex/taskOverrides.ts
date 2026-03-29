import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertHouseholdAccess } from "./auth.helpers";

export const getForDate = query({
  args: {
    householdId: v.id("households"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    return await ctx.db
      .query("taskOverrides")
      .withIndex("by_household_date", (q) =>
        q.eq("householdId", args.householdId).eq("date", args.date)
      )
      .collect();
  },
});

export const addOneOffTask = mutation({
  args: {
    householdId: v.id("households"),
    date: v.string(),
    taskId: v.string(),
    taskName: v.string(),
    time: v.string(),
    area: v.string(),
    category: v.string(),
    emoji: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    await ctx.db.insert("taskOverrides", {
      householdId: args.householdId,
      date: args.date,
      type: "add",
      taskId: args.taskId,
      taskName: args.taskName,
      time: args.time,
      area: args.area,
      category: args.category,
      emoji: args.emoji,
      notes: args.notes,
    });
  },
});

export const skipTask = mutation({
  args: {
    householdId: v.id("households"),
    date: v.string(),
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const existing = await ctx.db
      .query("taskOverrides")
      .withIndex("by_household_date", (q) =>
        q.eq("householdId", args.householdId).eq("date", args.date)
      )
      .collect();

    const alreadySkipped = existing.find(
      (o) => o.type === "skip" && o.taskId === args.taskId
    );
    if (alreadySkipped) return;

    await ctx.db.insert("taskOverrides", {
      householdId: args.householdId,
      date: args.date,
      type: "skip",
      taskId: args.taskId,
    });
  },
});

export const removeOverride = mutation({
  args: {
    householdId: v.id("households"),
    date: v.string(),
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const overrides = await ctx.db
      .query("taskOverrides")
      .withIndex("by_household_date", (q) =>
        q.eq("householdId", args.householdId).eq("date", args.date)
      )
      .collect();

    const match = overrides.find((o) => o.taskId === args.taskId);
    if (match) {
      await ctx.db.delete(match._id);
    }
  },
});
