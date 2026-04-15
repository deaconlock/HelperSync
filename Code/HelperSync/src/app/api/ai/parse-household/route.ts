import { NextRequest, NextResponse } from "next/server";
import { getClaudeClient, MODEL } from "@/lib/claude";
import { buildParseHouseholdPrompt } from "@/lib/prompts/parseHousehold";

export async function POST(request: NextRequest) {
  const { description } = await request.json();

  if (!description?.trim()) {
    return NextResponse.json({ error: "Description required" }, { status: 400 });
  }

  if (process.env.AI_MOCK === "true") {
    return NextResponse.json({
      rooms: ["Master Bedroom", "Common Bedroom 1", "Common Bedroom 2", "Living Room", "Kitchen", "Bathroom 1", "Bathroom 2", "Yard"],
    });
  }

  try {
    const claude = getClaudeClient();
    const message = await claude.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: buildParseHouseholdPrompt(description),
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse response" }, { status: 500 });
    }

    const rooms: string[] = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ rooms });
  } catch (err) {
    console.error("parse-household error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
