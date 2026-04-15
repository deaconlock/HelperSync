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
    const instructions = await ctx.db
      .query("taskInstructions")
      .withIndex("by_household_date", (q) =>
        q.eq("householdId", args.householdId).eq("date", args.date)
      )
      .collect();

    const withUrls = await Promise.all(
      instructions.map(async (inst) => {
        let photoUrl: string | null = null;
        if (inst.photoStorageId) {
          photoUrl = await ctx.storage.getUrl(inst.photoStorageId);
        }
        return { ...inst, photoUrl };
      })
    );

    return withUrls;
  },
});

export const set = mutation({
  args: {
    householdId: v.id("households"),
    date: v.string(),
    taskId: v.string(),
    instruction: v.string(),
    photoStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const existing = await ctx.db
      .query("taskInstructions")
      .withIndex("by_household_date_task", (q) =>
        q
          .eq("householdId", args.householdId)
          .eq("date", args.date)
          .eq("taskId", args.taskId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        instruction: args.instruction,
        ...(args.photoStorageId !== undefined
          ? { photoStorageId: args.photoStorageId }
          : {}),
      });
    } else {
      await ctx.db.insert("taskInstructions", {
        householdId: args.householdId,
        date: args.date,
        taskId: args.taskId,
        instruction: args.instruction,
        photoStorageId: args.photoStorageId,
      });
    }
  },
});

export const remove = mutation({
  args: {
    householdId: v.id("households"),
    date: v.string(),
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const existing = await ctx.db
      .query("taskInstructions")
      .withIndex("by_household_date_task", (q) =>
        q
          .eq("householdId", args.householdId)
          .eq("date", args.date)
          .eq("taskId", args.taskId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
