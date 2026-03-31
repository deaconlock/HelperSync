import { NextRequest, NextResponse } from "next/server";
import { getClaudeClient } from "@/lib/claude";
import { buildGenerateTimetablePrompt } from "@/lib/prompts/generateTimetable";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { homeName, rooms, members, helperDetails, employerAvailability, wifeAvailability, priorities, routines, helperExperience, helperPace, homeSize, deepCleanTasks, refineFeedback, currentSchedule, memberRoutines, memberQuietHours, daysToGenerate } = body;

  if (!rooms?.length || !members?.length) {
    return NextResponse.json({ error: "Missing required data" }, { status: 400 });
  }

  if (process.env.AI_MOCK === "true") {
    // Simulate AI generation time so the progress animation plays
    await new Promise((r) => setTimeout(r, 12000));
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const mockTasks = [
      { time: "06:30", duration: 30, taskName: "Prepare Breakfast", area: "Kitchen", category: "Meal Prep", emoji: "🍳", recurring: true, requiresPhoto: false },
      { time: "07:00", duration: 30, taskName: "Clean Kitchen After Breakfast", area: "Kitchen", category: "Household Chores", emoji: "🧹", recurring: true, requiresPhoto: false },
      { time: "07:30", duration: 45, taskName: "Laundry — Wash & Hang", area: "Yard", category: "Household Chores", emoji: "👕", recurring: true, requiresPhoto: true },
      { time: "08:30", duration: 30, taskName: "Sweep & Mop Living Room", area: "Living Room", category: "Household Chores", emoji: "🧹", recurring: true, requiresPhoto: true },
      { time: "09:00", duration: 30, taskName: "Clean Master Bedroom", area: "Master Bedroom", category: "Household Chores", emoji: "🛏️", recurring: true, requiresPhoto: true },
      { time: "09:30", duration: 30, taskName: "Clean Bathrooms", area: "Bathroom 1", category: "Household Chores", emoji: "🚿", recurring: true, requiresPhoto: true },
      { time: "10:00", duration: 15, taskName: "Morning Break", area: "Kitchen", category: "Break", emoji: "☕", recurring: true, requiresPhoto: false },
      { time: "10:15", duration: 30, taskName: "Check on Grandpa", area: "Common Bedroom 1", category: "Elderly Care", emoji: "💛", recurring: true, requiresPhoto: false },
      { time: "11:00", duration: 60, taskName: "Prepare Lunch", area: "Kitchen", category: "Meal Prep", emoji: "🍲", recurring: true, requiresPhoto: false },
      { time: "12:00", duration: 60, taskName: "Lunch Break", area: "Kitchen", category: "Break", emoji: "🍽️", recurring: true, requiresPhoto: false },
      { time: "13:00", duration: 30, taskName: "Fold & Iron Laundry", area: "Living Room", category: "Household Chores", emoji: "👔", recurring: true, requiresPhoto: false },
      { time: "13:30", duration: 30, taskName: "Vacuum Common Areas", area: "Living Room", category: "Household Chores", emoji: "🧹", recurring: true, requiresPhoto: false },
      { time: "14:00", duration: 15, taskName: "Afternoon Break", area: "Kitchen", category: "Break", emoji: "☕", recurring: true, requiresPhoto: false },
      { time: "14:15", duration: 45, taskName: "Grocery Shopping", area: "Kitchen", category: "Errands", emoji: "🛒", recurring: false, requiresPhoto: false },
      { time: "17:00", duration: 60, taskName: "Prepare Dinner", area: "Kitchen", category: "Meal Prep", emoji: "🍛", recurring: true, requiresPhoto: false },
      { time: "18:00", duration: 30, taskName: "Clean Kitchen After Dinner", area: "Kitchen", category: "Household Chores", emoji: "🧹", recurring: true, requiresPhoto: false },
    ];
    const weeklyTasks = days.map((day) => ({
      day,
      tasks: mockTasks.map((t, i) => ({ ...t, taskId: `${day.toLowerCase()}-${i + 1}` })),
    }));
    return NextResponse.json({ weeklyTasks });
  }

  const { prompt } = buildGenerateTimetablePrompt({
    homeName: homeName ?? undefined,
    rooms,
    members,
    helperDetails: helperDetails ?? { name: "Helper", nationality: "Philippines", language: "en" },
    memberRoutines: memberRoutines ?? undefined,
    memberQuietHours: memberQuietHours ?? undefined,
    employerAvailability: employerAvailability ?? undefined,
    wifeAvailability: wifeAvailability ?? undefined,
    priorities: priorities ?? [],
    routines: routines ?? undefined,
    helperExperience: helperExperience ?? "some",
    helperPace: helperPace ?? "balanced",
    homeSize: homeSize ?? "midsize",
    deepCleanTasks: deepCleanTasks ?? [],
    daysToGenerate: daysToGenerate ?? undefined,
    refineFeedback: refineFeedback ?? undefined,
    currentSchedule: currentSchedule ?? undefined,
  });

  try {
    const claude = getClaudeClient();
    const stream = claude.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 9000,
      messages: [{ role: "user", content: prompt }],
    });

    const encoder = new TextEncoder();

    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              if (
                chunk.type === "content_block_delta" &&
                chunk.delta.type === "text_delta"
              ) {
                controller.enqueue(encoder.encode(chunk.delta.text));
              }
            }
            controller.close();
          } catch (err) {
            console.error("generate-timetable stream error:", err);
            controller.error(err);
          }
        },
      }),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      }
    );
  } catch (err) {
    console.error("generate-timetable error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
