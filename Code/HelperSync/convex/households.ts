import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export const createHousehold = mutation({
  args: {
    homeName: v.string(),
    rooms: v.array(v.string()),
    members: v.array(
      v.object({
        name: v.string(),
        role: v.union(
          v.literal("Me"),
          v.literal("Spouse"),
          v.literal("Child"),
          v.literal("Elderly"),
          v.literal("Pets"),
          v.literal("Relative")
        ),
        age: v.optional(v.number()),
        mobilityLevel: v.optional(v.union(
          v.literal("independent"),
          v.literal("needs_assistance"),
          v.literal("wheelchair"),
          v.literal("bedridden")
        )),
        medicalConditions: v.optional(v.string()),
        medications: v.optional(v.string()),
        dietaryRestrictions: v.optional(v.string()),
        napSchedule: v.optional(v.string()),
        emergencyContact: v.optional(v.string()),
      })
    ),
    helperDetails: v.object({
      name: v.string(),
      nationality: v.string(),
      phone: v.string(),
      language: v.string(),
    }),
    inviteCode: v.string(),
    inviteQrData: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if household already exists for this user
    const existing = await ctx.db
      .query("households")
      .withIndex("by_employer", (q) => q.eq("employerUserId", identity.subject))
      .first();

    if (existing) {
      // Update instead of create — preserve existing PIN, generate one if missing
      await ctx.db.patch(existing._id, {
        homeName: args.homeName,
        rooms: args.rooms,
        members: args.members,
        helperDetails: args.helperDetails,
        inviteCode: args.inviteCode,
        inviteQrData: args.inviteQrData,
        helperPin: existing.helperPin ?? generatePin(),
      });

      // Delete old subscription and create a fresh 14-day trial
      const oldSub = await ctx.db
        .query("subscriptions")
        .withIndex("by_household", (q) => q.eq("householdId", existing._id))
        .first();
      if (oldSub) {
        await ctx.db.delete(oldSub._id);
      }
      const trialEndsAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
      await ctx.db.insert("subscriptions", {
        householdId: existing._id,
        status: "trialing",
        trialEndsAt,
      });

      return existing._id;
    }

    const householdId = await ctx.db.insert("households", {
      employerUserId: identity.subject,
      homeName: args.homeName,
      rooms: args.rooms,
      members: args.members,
      helperDetails: args.helperDetails,
      inviteCode: args.inviteCode,
      inviteQrData: args.inviteQrData,
      helperPin: generatePin(),
      createdAt: Date.now(),
    });

    // Create trial subscription
    const trialEndsAt = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 days
    await ctx.db.insert("subscriptions", {
      householdId,
      status: "trialing",
      trialEndsAt,
    });

    return householdId;
  },
});

export const getMyHousehold = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("households")
      .withIndex("by_employer", (q) => q.eq("employerUserId", identity.subject))
      .first();
  },
});

export const getHouseholdByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("households")
      .withIndex("by_invite_code", (q) =>
        q.eq("inviteCode", args.inviteCode.toUpperCase())
      )
      .first();
  },
});

export const updateHousehold = mutation({
  args: {
    householdId: v.id("households"),
    rooms: v.optional(v.array(v.string())),
    members: v.optional(
      v.array(
        v.object({
          name: v.string(),
          role: v.union(
            v.literal("Me"),
            v.literal("Spouse"),
            v.literal("Child"),
            v.literal("Elderly"),
            v.literal("Pets"),
            v.literal("Relative")
          ),
          age: v.optional(v.number()),
        })
      )
    ),
    helperDetails: v.optional(
      v.object({
        name: v.string(),
        nationality: v.string(),
        phone: v.string(),
        language: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify ownership
    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found");
    if (household.employerUserId !== identity.subject) {
      throw new Error("Not authorized to modify this household");
    }

    const { householdId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(householdId, filtered);
  },
});

// DEV ONLY: Delete household and all related data to re-test onboarding
export const devResetHousehold = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const household = await ctx.db
      .query("households")
      .withIndex("by_employer", (q) => q.eq("employerUserId", identity.subject))
      .first();

    if (!household) return { deleted: false };

    const hId = household._id;

    // Delete timetable
    const timetable = await ctx.db.query("timetable").withIndex("by_household", (q) => q.eq("householdId", hId)).first();
    if (timetable) await ctx.db.delete(timetable._id);

    // Delete schedule
    const schedule = await ctx.db.query("schedules").withIndex("by_household", (q) => q.eq("householdId", hId)).first();
    if (schedule) await ctx.db.delete(schedule._id);

    // Delete task logs
    const logs = await ctx.db.query("taskLogs").withIndex("by_household", (q) => q.eq("householdId", hId)).collect();
    for (const log of logs) await ctx.db.delete(log._id);

    // Delete days off
    const daysOff = await ctx.db.query("daysOff").withIndex("by_household", (q) => q.eq("householdId", hId)).collect();
    for (const d of daysOff) await ctx.db.delete(d._id);

    // Delete medication logs
    const medLogs = await ctx.db.query("medicationLogs").withIndex("by_household", (q) => q.eq("householdId", hId)).collect();
    for (const log of medLogs) await ctx.db.delete(log._id);

    // Delete task overrides
    const overrides = await ctx.db.query("taskOverrides").withIndex("by_household_date", (q) => q.eq("householdId", hId)).collect();
    for (const o of overrides) await ctx.db.delete(o._id);

    // Delete task instructions
    const instructions = await ctx.db.query("taskInstructions").withIndex("by_household_date", (q) => q.eq("householdId", hId)).collect();
    for (const i of instructions) await ctx.db.delete(i._id);

    // Delete helper sessions
    const sessions = await ctx.db.query("helperSessions").withIndex("by_household", (q) => q.eq("householdId", hId)).collect();
    for (const s of sessions) await ctx.db.delete(s._id);

    // Delete subscription
    const sub = await ctx.db.query("subscriptions").withIndex("by_household", (q) => q.eq("householdId", hId)).first();
    if (sub) await ctx.db.delete(sub._id);

    // Delete household itself
    await ctx.db.delete(hId);

    return { deleted: true };
  },
});

// Idempotent: returns existing PIN, or generates and stores one if missing.
// Called from the employer-side helper-profile page so old households
// (created before helperPin was added) get a PIN on first view.
export const ensureHelperPin = mutation({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found");
    if (household.employerUserId !== identity.subject) {
      throw new Error("Not authorized");
    }

    if (household.helperPin) return household.helperPin;

    const pin = generatePin();
    await ctx.db.patch(args.householdId, { helperPin: pin });
    return pin;
  },
});

export const regenerateHelperPin = mutation({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found");
    if (household.employerUserId !== identity.subject) {
      throw new Error("Not authorized");
    }

    const pin = generatePin();
    await ctx.db.patch(args.householdId, { helperPin: pin });
    return pin;
  },
});

// Server-side PIN verification for the helper join flow.
// Returns householdId + language only when invite code AND PIN both match.
export const verifyHelperPin = query({
  args: { inviteCode: v.string(), pin: v.string() },
  handler: async (ctx, args) => {
    const household = await ctx.db
      .query("households")
      .withIndex("by_invite_code", (q) =>
        q.eq("inviteCode", args.inviteCode.toUpperCase())
      )
      .first();

    if (!household) return { valid: false as const };
    if (!household.helperPin) {
      return { valid: false as const, reason: "no_pin_set" as const };
    }
    if (household.helperPin !== args.pin) {
      return { valid: false as const, reason: "wrong_pin" as const };
    }

    return {
      valid: true as const,
      householdId: household._id,
      helperLanguage: household.helperDetails?.language ?? "en",
      homeName: household.homeName,
    };
  },
});

export const regenerateInviteCode = mutation({
  args: {
    householdId: v.id("households"),
    newCode: v.string(),
    newQrData: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify ownership
    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found");
    if (household.employerUserId !== identity.subject) {
      throw new Error("Not authorized to modify this household");
    }

    await ctx.db.patch(args.householdId, {
      inviteCode: args.newCode,
      inviteQrData: args.newQrData,
    });
  },
});
