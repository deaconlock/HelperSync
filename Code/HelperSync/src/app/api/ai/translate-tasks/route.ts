import { NextRequest, NextResponse } from "next/server";
import { getClaudeClient, MODEL } from "@/lib/claude";

const LANGUAGE_NAMES: Record<string, string> = {
  my: "Burmese (Myanmar)",
  tl: "Tagalog (Filipino)",
  id: "Bahasa Indonesia",
  en: "English",
};

export async function POST(request: NextRequest) {
  const { taskNames, language } = await request.json();

  if (!taskNames?.length || !language || language === "en") {
    return NextResponse.json({ translations: {} });
  }

  const langName = LANGUAGE_NAMES[language] ?? language;

  if (process.env.AI_MOCK === "true") {
    const translations: Record<string, string> = {};
    for (const name of taskNames) {
      translations[name] = name; // Return English names as-is
    }
    return NextResponse.json({ translations });
  }

  try {
    const claude = getClaudeClient();
    const message = await claude.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Translate these household task names to ${langName}. Return ONLY a JSON object mapping English task names to translated names. Keep translations short and natural.

Task names:
${taskNames.map((n: string) => `- "${n}"`).join("\n")}

Return format (no markdown, no explanation):
{"English task name": "Translated name", ...}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ translations: {} });
    }

    const translations = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ translations });
  } catch (err) {
    console.error("translate-tasks error:", err);
    return NextResponse.json({ translations: {} });
  }
}
