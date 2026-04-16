import { NextRequest, NextResponse } from "next/server";
import { getClaudeClient } from "@/lib/claude";
import { buildGenerateTimetablePrompt } from "@/lib/prompts/generateTimetable";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { homeName, rooms, members, helperDetails, employerAvailability, wifeAvailability, priorities, routines, helperExperience, helperPace, homeSize, deepCleanTasks, refineFeedback, currentSchedule, memberRoutines, memberQuietHours, daysToGenerate } = body;

    if (!rooms?.length || !members?.length) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 });
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
    return NextResponse.json({ error: "AI request failed", details: String(err) }, { status: 500 });
  }
}
