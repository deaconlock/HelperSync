import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { timeToMinutes } from "@/lib/timeUtils";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ScheduleChange {
  day: string;
  summary: string;
  remove?: string[];
  add?: Array<{
    taskId: string;
    time: string;
    taskName: string;
    area: string;
    category: string;
    recurring: boolean;
    requiresPhoto: boolean;
    emoji?: string;
  }>;
  update?: Array<{
    taskId: string;
    time?: string;
    taskName?: string;
    area?: string;
    category?: string;
    recurring?: boolean;
    requiresPhoto?: boolean;
    emoji?: string;
  }>;
}

export async function POST(request: NextRequest) {
  const { householdId, changes, token } = await request.json();

  if (!householdId || !changes) {
    return NextResponse.json({ error: "Missing required data" }, { status: 400 });
  }

  try {
    // Set auth token for Convex
    if (token) {
      convex.setAuth(token);
    }

    const timetable = await convex.query(api.timetable.getTimetable, {
      householdId: householdId as Id<"households">,
    });

    if (!timetable) {
      return NextResponse.json({ error: "No timetable found" }, { status: 404 });
    }

    const updatedWeeklyTasks = timetable.weeklyTasks.map((dayData) => {
      const change = (changes as ScheduleChange[]).find((c) => c.day === dayData.day);
      if (!change) return dayData;

      let tasks = [...dayData.tasks];

      // Remove tasks
      if (change.remove?.length) {
        tasks = tasks.filter((t) => !change.remove!.includes(t.taskId));
      }

      // Update tasks
      if (change.update?.length) {
        tasks = tasks.map((t) => {
          const upd = change.update!.find((u) => u.taskId === t.taskId);
          if (upd) {
            const { taskId: _taskId, ...updates } = upd;
            return { ...t, ...updates };
          }
          return t;
        });
      }

      // Add tasks (deduplicate IDs)
      if (change.add?.length) {
        const existingIds = new Set(tasks.map((t) => t.taskId));
        for (const newTask of change.add) {
          let taskId = newTask.taskId;
          // Ensure unique ID
          while (existingIds.has(taskId)) {
            taskId = `ai-${Math.random().toString(36).slice(2, 10)}`;
          }
          existingIds.add(taskId);
          tasks.push({
            taskId,
            time: newTask.time,
            taskName: newTask.taskName,
            area: newTask.area,
            category: newTask.category,
            recurring: newTask.recurring,
            requiresPhoto: newTask.requiresPhoto,
            emoji: newTask.emoji,
          });
        }
      }

      // Sort by time
      tasks.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

      return { ...dayData, tasks };
    });

    await convex.mutation(api.timetable.setTimetable, {
      householdId: householdId as Id<"households">,
      weeklyTasks: updatedWeeklyTasks,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("apply-schedule-change error:", err);
    return NextResponse.json({ error: "Failed to apply changes" }, { status: 500 });
  }
}
