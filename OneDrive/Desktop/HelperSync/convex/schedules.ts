import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertHouseholdAccess } from "./auth.helpers";

const daySlots = v.array(
  v.object({
    start: v.string(),
    end: v.string(),
    label: v.optional(v.string()),
  })
);

const availabilitySchema = v.object({
  monday: daySlots,
  tuesday: daySlots,
  wednesday: daySlots,
  thursday: daySlots,
  friday: daySlots,
  saturday: daySlots,
  sunday: daySlots,
});

export const getSchedule = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    return await ctx.db
      .query("schedules")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .first();
  },
});

export const setSchedule = mutation({
  args: {
    householdId: v.id("households"),
    employerAvailability: availabilitySchema,
    wifeAvailability: availabilitySchema,
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);

    const existing = await ctx.db
      .query("schedules")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .first();

    const data = {
      householdId: args.householdId,
      employerAvailability: args.employerAvailability,
      wifeAvailability: args.wifeAvailability,
      generatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("schedules", data);
    }
  },
});
