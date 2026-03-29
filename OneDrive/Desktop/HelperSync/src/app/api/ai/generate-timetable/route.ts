import { NextRequest, NextResponse } from "next/server";
import { getClaudeClient, MODEL } from "@/lib/claude";
import { buildGenerateTimetablePrompt } from "@/lib/prompts/generateTimetable";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { rooms, members, helperDetails, employerAvailability, wifeAvailability, priorities, routines, helperExperience, helperPace, homeSize, deepCleanTasks, refineFeedback, currentSchedule, memberRoutines, memberSchedules } = body;

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

  try {
    const claude = getClaudeClient();
    const message = await claude.messages.create({
      model: MODEL,
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: buildGenerateTimetablePrompt({
            rooms,
            members,
            helperDetails: helperDetails ?? { name: "Helper", nationality: "Philippines", language: "en" },
            memberRoutines: memberRoutines ?? undefined,
            memberSchedules: memberSchedules ?? undefined,
            employerAvailability: employerAvailability ?? {},
            wifeAvailability: wifeAvailability ?? {},
            priorities: priorities ?? [],
            routines: routines ?? "",
            helperExperience: helperExperience ?? "some",
            helperPace: helperPace ?? "balanced",
            homeSize: homeSize ?? "midsize",
            deepCleanTasks: deepCleanTasks ?? [],
            refineFeedback: refineFeedback ?? undefined,
            currentSchedule: currentSchedule ?? undefined,
          }),
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse timetable" }, { status: 500 });
    }

    const weeklyTasks = JSON.parse(jsonMatch[0]);

    // Validate basic structure
    if (!Array.isArray(weeklyTasks) || !weeklyTasks[0]?.day || !weeklyTasks[0]?.tasks) {
      return NextResponse.json({ error: "Invalid timetable structure" }, { status: 500 });
    }

    return NextResponse.json({ weeklyTasks });
  } catch (err) {
    console.error("generate-timetable error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
