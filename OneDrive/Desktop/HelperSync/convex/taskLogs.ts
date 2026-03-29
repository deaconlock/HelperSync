import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertHouseholdAccess, assertAuthenticated } from "./auth.helpers";

export const logTaskComplete = mutation({
  args: {
    householdId: v.id("households"),
    date: v.string(),
    taskId: v.string(),
    taskName: v.string(),
    photoUrl: v.optional(v.string()),
    helperNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);

    const existing = await ctx.db
      .query("taskLogs")
      .withIndex("by_household_date", (q) =>
        q.eq("householdId", args.householdId).eq("date", args.date)
      )
      .filter((q) => q.eq(q.field("taskId"), args.taskId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        completedAt: Date.now(),
        photoUrl: args.photoUrl,
        helperNotes: args.helperNotes,
      });
      return existing._id;
    }

    return await ctx.db.insert("taskLogs", {
      householdId: args.householdId,
      date: args.date,
      taskId: args.taskId,
      taskName: args.taskName,
      completedAt: Date.now(),
      photoUrl: args.photoUrl,
      helperNotes: args.helperNotes,
    });
  },
});

export const getLogsForDate = query({
  args: {
    householdId: v.id("households"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const logs = await ctx.db
      .query("taskLogs")
      .withIndex("by_household_date", (q) =>
        q.eq("householdId", args.householdId).eq("date", args.date)
      )
      .collect();

    return await Promise.all(
      logs.map(async (log) => {
        let photoDisplayUrl: string | null = null;
        if (log.photoUrl) {
          try {
            photoDisplayUrl = await ctx.storage.getUrl(log.photoUrl as any);
          } catch {
            // Storage ID might be invalid
          }
        }
        return { ...log, photoDisplayUrl };
      })
    );
  },
});

export const getRecentLogs = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const logs = await ctx.db
      .query("taskLogs")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .order("desc")
      .take(20);

    return await Promise.all(
      logs.map(async (log) => {
        let photoDisplayUrl: string | null = null;
        if (log.photoUrl) {
          try {
            photoDisplayUrl = await ctx.storage.getUrl(log.photoUrl as any);
          } catch {
            // Storage ID might be invalid
          }
        }
        return { ...log, photoDisplayUrl };
      })
    );
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await assertAuthenticated(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
