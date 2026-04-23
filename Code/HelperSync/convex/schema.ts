import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  households: defineTable({
    employerUserId: v.string(), // Clerk userId
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
    helperDetails: v.optional(
      v.object({
        name: v.string(),
        nationality: v.string(),
        phone: v.string(),
        language: v.string(), // 'en' | 'my' | 'tl' | 'id'
      })
    ),
    inviteCode: v.string(), // 6-char uppercase alphanumeric
    inviteQrData: v.string(), // full URL for QR
    createdAt: v.number(),
  })
    .index("by_employer", ["employerUserId"])
    .index("by_invite_code", ["inviteCode"]),

  schedules: defineTable({
    householdId: v.id("households"),
    employerAvailability: v.object({
      monday: v.array(v.object({ start: v.string(), end: v.string(), label: v.optional(v.string()) })),
      tuesday: v.array(v.object({ start: v.string(), end: v.string(), label: v.optional(v.string()) })),
      wednesday: v.array(v.object({ start: v.string(), end: v.string(), label: v.optional(v.string()) })),
      thursday: v.array(v.object({ start: v.string(), end: v.string(), label: v.optional(v.string()) })),
      friday: v.array(v.object({ start: v.string(), end: v.string(), label: v.optional(v.string()) })),
      saturday: v.array(v.object({ start: v.string(), end: v.string(), label: v.optional(v.string()) })),
      sunday: v.array(v.object({ start: v.string(), end: v.string(), label: v.optional(v.string()) })),
    }),
    wifeAvailability: v.object({
      monday: v.array(v.object({ start: v.string(), end: v.string(), label: v.optional(v.string()) })),
      tuesday: v.array(v.object({ start: v.string(), end: v.string(), label: v.optional(v.string()) })),
      wednesday: v.array(v.object({ start: v.string(), end: v.string(), label: v.optional(v.string()) })),
      thursday: v.array(v.object({ start: v.string(), end: v.string(), label: v.optional(v.string()) })),
      friday: v.array(v.object({ start: v.string(), end: v.string(), label: v.optional(v.string()) })),
      saturday: v.array(v.object({ start: v.string(), end: v.string(), label: v.optional(v.string()) })),
      sunday: v.array(v.object({ start: v.string(), end: v.string(), label: v.optional(v.string()) })),
    }),
    generatedAt: v.number(),
  }).index("by_household", ["householdId"]),

  timetable: defineTable({
    householdId: v.id("households"),
    appliedRulesSnapshot: v.optional(v.array(v.object({
      id: v.string(),
      title: v.string(),
    }))),
    weeklyTasks: v.array(
      v.object({
        day: v.string(), // 'monday', 'tuesday', etc.
        tasks: v.array(
          v.object({
            taskId: v.string(),
            time: v.string(), // '08:00'
            taskName: v.string(),
            area: v.string(),
            category: v.string(), // 'Household Chores' | 'Baby Care' | 'Elderly Care' | 'Meal Prep' | 'Errands'
            recurring: v.boolean(),
            requiresPhoto: v.boolean(),
            emoji: v.optional(v.string()),
            notes: v.optional(v.string()),
            duration: v.optional(v.number()),
            passive: v.optional(v.boolean()),
          })
        ),
      })
    ),
  }).index("by_household", ["householdId"]),

  taskInstructions: defineTable({
    householdId: v.id("households"),
    date: v.string(),
    taskId: v.string(),
    instruction: v.string(),
    photoStorageId: v.optional(v.string()),
  })
    .index("by_household_date", ["householdId", "date"])
    .index("by_household_date_task", ["householdId", "date", "taskId"]),

  taskOverrides: defineTable({
    householdId: v.id("households"),
    date: v.string(), // ISO date 'YYYY-MM-DD'
    type: v.union(v.literal("add"), v.literal("skip")),
    taskId: v.string(), // for "skip": references template taskId; for "add": a new nanoid
    // Full task data for "add" type overrides
    taskName: v.optional(v.string()),
    time: v.optional(v.string()),
    area: v.optional(v.string()),
    category: v.optional(v.string()),
    emoji: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_household_date", ["householdId", "date"]),

  taskLogs: defineTable({
    householdId: v.id("households"),
    date: v.string(), // ISO date 'YYYY-MM-DD'
    taskId: v.string(),
    taskName: v.string(),
    completedAt: v.number(),
    photoUrl: v.optional(v.string()), // Convex storage ID
    helperNotes: v.optional(v.string()),
  })
    .index("by_household_date", ["householdId", "date"])
    .index("by_household", ["householdId"]),

  daysOff: defineTable({
    householdId: v.id("households"),
    date: v.string(), // ISO date 'YYYY-MM-DD'
    type: v.union(
      v.literal("RestDay"),
      v.literal("PublicHoliday"),
      v.literal("Leave")
    ),
    note: v.optional(v.string()),
  }).index("by_household", ["householdId"]),

  medicationLogs: defineTable({
    householdId: v.id("households"),
    date: v.string(), // ISO date 'YYYY-MM-DD'
    memberName: v.string(), // elderly member name
    completedAt: v.number(),
    photoUrl: v.optional(v.string()), // Convex storage ID
    helperNotes: v.optional(v.string()),
  })
    .index("by_household_date", ["householdId", "date"])
    .index("by_household", ["householdId"]),

  helperSessions: defineTable({
    helperUserId: v.string(), // Clerk userId
    householdId: v.id("households"),
    language: v.string(), // 'en' | 'my' | 'tl' | 'id'
    pinHash: v.string(),
    onboardedAt: v.number(),
  })
    .index("by_helper", ["helperUserId"])
    .index("by_household", ["householdId"]),

  householdRules: defineTable({
    householdId: v.id("households"),
    type: v.union(
      v.literal("FIXED_TASK"),
      v.literal("TIME_BLOCK"),
      v.literal("CUSTOM_RULE"),
    ),
    title: v.string(),
    days: v.array(v.string()),        // ["monday","tuesday",...] — empty = all days
    startTime: v.optional(v.string()), // "13:00"
    endTime: v.optional(v.string()),   // "14:00" — TIME_BLOCK only
    duration: v.optional(v.number()),  // minutes — FIXED_TASK only
    constraint: v.optional(v.string()), // "No cooking" — RECURRING_CONSTRAINT
    notes: v.optional(v.string()),     // free text — CUSTOM_RULE
    requiresPhoto: v.optional(v.boolean()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_household", ["householdId"]),

  subscriptions: defineTable({
    householdId: v.id("households"),
    polarSubscriptionId: v.optional(v.string()),
    status: v.union(
      v.literal("trialing"),
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due")
    ),
    trialEndsAt: v.number(),
    paymentCollectedAt: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
  }).index("by_household", ["householdId"]),
});
