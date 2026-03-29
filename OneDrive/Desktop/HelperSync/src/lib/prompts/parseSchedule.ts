export function buildParseSchedulePrompt(
  scheduleText: string,
  person: "employer" | "wife"
): string {
  return `You are a scheduling assistant. Parse the following ${person === "employer" ? "employer's" : "wife/partner's"} weekly schedule into structured JSON.

Return ONLY a JSON object with days of the week as keys. Each day should have an array of time slots when this person is AWAY from home or UNAVAILABLE to supervise. If they are home all day, return an empty array for that day.

Each slot: { "start": "HH:MM", "end": "HH:MM", "label": "optional description" }

Example output:
{
  "monday": [{"start": "09:00", "end": "18:00", "label": "Office"}],
  "tuesday": [{"start": "09:00", "end": "18:00", "label": "Office"}],
  "wednesday": [],
  "thursday": [{"start": "09:00", "end": "14:00", "label": "Office"}, {"start": "16:00", "end": "20:00", "label": "Travel"}],
  "friday": [{"start": "09:00", "end": "18:00", "label": "Office"}],
  "saturday": [],
  "sunday": []
}

Schedule description:
${scheduleText}

Return only the JSON object, no explanation.`;
}
