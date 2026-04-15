import { NextRequest } from "next/server";
import { getClaudeClient, MODEL } from "@/lib/claude";
import { buildSystemPrompt } from "@/lib/prompts/system";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { messages, householdId, token } = await request.json();

  // Create a fresh Convex client with auth
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  if (token) {
    convex.setAuth(token);
  }

  // Fetch household context from Convex
  let systemPrompt = "You are HelperSync AI, a helpful household management assistant.";

  if (householdId) {
    try {
      const household = await convex.query(api.households.getMyHousehold);
      const timetable = household
        ? await convex.query(api.timetable.getTimetable, {
            householdId: householdId as Id<"households">,
          })
        : null;
      const schedule = household
        ? await convex.query(api.schedules.getSchedule, {
            householdId: householdId as Id<"households">,
          })
        : null;

      // Fetch today's task completion logs
      const todayStr = new Date().toISOString().split("T")[0];
      const todayLogs = household
        ? await convex.query(api.taskLogs.getLogsForDate, {
            householdId: householdId as Id<"households">,
            date: todayStr,
          })
        : null;

      if (household) {
        systemPrompt = buildSystemPrompt({
          rooms: household.rooms,
          members: household.members,
          helperDetails: household.helperDetails,
          employerAvailability: schedule?.employerAvailability,
          wifeAvailability: schedule?.wifeAvailability,
          currentTimetable: timetable?.weeklyTasks,
          todayCompletionLogs: todayLogs,
        });
      }
    } catch (err) {
      console.error("Failed to fetch household context:", err);
    }
  }

  if (process.env.AI_MOCK === "true") {
    const mockText = "Mock mode is active — AI chat is disabled to save API credits. Set AI_MOCK=false in .env.local to enable real responses.";
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(mockText));
        controller.close();
      },
    });
    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const claude = getClaudeClient();

  const stream = await claude.messages.stream({
    model: MODEL,
    max_tokens: 4000,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(
            new TextEncoder().encode(chunk.delta.text)
          );
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
