import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertHouseholdAccess } from "./auth.helpers";

const taskSchema = v.object({
  taskId: v.string(),
  time: v.string(),
  duration: v.optional(v.number()),
  taskName: v.string(),
  area: v.string(),
  category: v.string(),
  recurring: v.boolean(),
  requiresPhoto: v.boolean(),
  emoji: v.optional(v.string()),
  notes: v.optional(v.string()),
  passive: v.optional(v.boolean()),
});

export const getTimetable = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    return await ctx.db
      .query("timetable")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .first();
  },
});

export const setTimetable = mutation({
  args: {
    householdId: v.id("households"),
    weeklyTasks: v.array(
      v.object({
        day: v.string(),
        tasks: v.array(taskSchema),
      })
    ),
    appliedRulesSnapshot: v.optional(v.array(v.object({
      id: v.string(),
      title: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const existing = await ctx.db
      .query("timetable")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .first();

    const patch = {
      weeklyTasks: args.weeklyTasks,
      ...(args.appliedRulesSnapshot !== undefined && { appliedRulesSnapshot: args.appliedRulesSnapshot }),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("timetable", {
        householdId: args.householdId,
        ...patch,
      });
    }
  },
});

export const addTask = mutation({
  args: {
    householdId: v.id("households"),
    day: v.string(),
    task: taskSchema,
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const timetable = await ctx.db
      .query("timetable")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .first();

    if (!timetable) throw new Error("No timetable found");

    const updated = timetable.weeklyTasks.map((d) => {
      if (d.day === args.day) {
        const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
        return { ...d, tasks: [...d.tasks, args.task].sort((a, b) => toMin(a.time) - toMin(b.time)) };
      }
      return d;
    });

    await ctx.db.patch(timetable._id, { weeklyTasks: updated });
  },
});

export const updateTask = mutation({
  args: {
    householdId: v.id("households"),
    day: v.string(),
    taskId: v.string(),
    updates: v.object({
      time: v.optional(v.string()),
      duration: v.optional(v.number()),
      taskName: v.optional(v.string()),
      area: v.optional(v.string()),
      category: v.optional(v.string()),
      recurring: v.optional(v.boolean()),
      requiresPhoto: v.optional(v.boolean()),
      emoji: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const timetable = await ctx.db
      .query("timetable")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .first();

    if (!timetable) throw new Error("No timetable found");

    const updated = timetable.weeklyTasks.map((d) => {
      if (d.day === args.day) {
        return {
          ...d,
          tasks: d.tasks.map((t) =>
            t.taskId === args.taskId ? { ...t, ...args.updates } : t
          ),
        };
      }
      return d;
    });

    await ctx.db.patch(timetable._id, { weeklyTasks: updated });
  },
});

export const deleteTask = mutation({
  args: {
    householdId: v.id("households"),
    day: v.string(),
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const timetable = await ctx.db
      .query("timetable")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .first();

    if (!timetable) throw new Error("No timetable found");

    const updated = timetable.weeklyTasks.map((d) => {
      if (d.day === args.day) {
        return { ...d, tasks: d.tasks.filter((t) => t.taskId !== args.taskId) };
      }
      return d;
    });

    await ctx.db.patch(timetable._id, { weeklyTasks: updated });
  },
});

export const moveTask = mutation({
  args: {
    householdId: v.id("households"),
    fromDay: v.string(),
    toDay: v.string(),
    taskId: v.string(),
    newIndex: v.number(),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const timetable = await ctx.db
      .query("timetable")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .first();

    if (!timetable) throw new Error("No timetable found");

    let movedTask: (typeof timetable.weeklyTasks)[0]["tasks"][0] | undefined;

    const updated = timetable.weeklyTasks.map((d) => {
      if (d.day === args.fromDay) {
        movedTask = d.tasks.find((t) => t.taskId === args.taskId);
        return { ...d, tasks: d.tasks.filter((t) => t.taskId !== args.taskId) };
      }
      return d;
    });

    if (!movedTask) throw new Error("Task not found");

    const final = updated.map((d) => {
      if (d.day === args.toDay) {
        const tasks = [...d.tasks];
        tasks.splice(args.newIndex, 0, movedTask!);
        return { ...d, tasks };
      }
      return d;
    });

    await ctx.db.patch(timetable._id, { weeklyTasks: final });
  },
});

export const deduplicateTasks = mutation({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const timetable = await ctx.db
      .query("timetable")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .first();

    if (!timetable) throw new Error("No timetable found");

    const cleaned = timetable.weeklyTasks.map((d) => {
      const seen = new Set<string>();
      const seenNames = new Map<string, number>();
      const uniqueTasks = d.tasks.filter((t) => {
        if (seen.has(t.taskId)) return false;
        seen.add(t.taskId);
        const key = `${t.taskName}::${t.time}`;
        const count = seenNames.get(key) ?? 0;
        seenNames.set(key, count + 1);
        if (count > 0) return false;
        return true;
      });
      return { ...d, tasks: uniqueTasks };
    });

    await ctx.db.patch(timetable._id, { weeklyTasks: cleaned });
    return { cleaned: true };
  },
});
