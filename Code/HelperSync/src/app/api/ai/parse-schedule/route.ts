import { NextRequest, NextResponse } from "next/server";
import { getClaudeClient, MODEL } from "@/lib/claude";
import { buildParseSchedulePrompt } from "@/lib/prompts/parseSchedule";

export async function POST(request: NextRequest) {
  const { scheduleText, person } = await request.json();

  if (!scheduleText?.trim()) {
    return NextResponse.json({ error: "Schedule text required" }, { status: 400 });
  }

  if (process.env.AI_MOCK === "true") {
    const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const schedule: Record<string, { start: string; end: string; label: string }[]> = {};
    for (const day of weekdays) {
      schedule[day] = [{ start: "09:00", end: "17:00", label: "Work" }];
    }
    schedule["Saturday"] = [];
    schedule["Sunday"] = [];
    return NextResponse.json({ availability: schedule });
  }

  try {
    const claude = getClaudeClient();
    const message = await claude.messages.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: buildParseSchedulePrompt(scheduleText, person ?? "employer"),
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse response" }, { status: 500 });
    }

    const availability = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ availability });
  } catch (err) {
    console.error("parse-schedule error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
