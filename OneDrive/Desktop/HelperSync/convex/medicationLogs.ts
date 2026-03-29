import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertHouseholdAccess } from "./auth.helpers";

export const logMedication = mutation({
  args: {
    householdId: v.id("households"),
    date: v.string(),
    memberName: v.string(),
    photoUrl: v.optional(v.string()),
    helperNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);

    const existing = await ctx.db
      .query("medicationLogs")
      .withIndex("by_household_date", (q) =>
        q.eq("householdId", args.householdId).eq("date", args.date)
      )
      .filter((q) => q.eq(q.field("memberName"), args.memberName))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        completedAt: Date.now(),
        photoUrl: args.photoUrl ?? existing.photoUrl,
        helperNotes: args.helperNotes,
      });
      return existing._id;
    }

    return await ctx.db.insert("medicationLogs", {
      householdId: args.householdId,
      date: args.date,
      memberName: args.memberName,
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
      .query("medicationLogs")
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
  args: { householdId: v.id("households"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const logs = await ctx.db
      .query("medicationLogs")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .order("desc")
      .take(100);

    const daysBack = args.days ?? 7;
    const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;
    return logs.filter((l) => l.completedAt >= cutoff);
  },
});
