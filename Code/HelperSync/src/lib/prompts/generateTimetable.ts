interface TimetableContext {
  homeName?: string;
  rooms: string[];
  members: Array<{
    name: string;
    role: string;
    age?: number;
    mobilityLevel?: string;
    medicalConditions?: string;
    medications?: string;
    dietaryRestrictions?: string;
    napSchedule?: string;
  }>;
  helperDetails: { name: string; nationality: string; language: string };
  memberRoutines?: Record<string, string>;
  memberQuietHours?: Record<string, string>;
  // Legacy fields (backward compat)
  employerAvailability?: Record<string, Array<{ start: string; end: string; label?: string }>>;
  wifeAvailability?: Record<string, Array<{ start: string; end: string; label?: string }>>;
  routines?: string;
  priorities: string[];
  helperExperience: string;
  helperPace?: string;
  homeSize?: string;
  deepCleanTasks?: string[];
  daysToGenerate?: string[];
  refineFeedback?: string;
  currentSchedule?: Array<{ day: string; tasks: Array<{ taskName: string; time: string; category: string; area: string }> }>;
}

const PRIORITY_LABELS: Record<string, string> = {
  meals: "Meals & Cooking",
  cleanliness: "Cleanliness & Tidying",
  childcare: "Childcare",
  elderlycare: "Elderly Care",
  laundry: "Laundry & Ironing",
  grocery: "Grocery Shopping & Errands",
  organizing: "Organizing & Decluttering",
};

const EXPERIENCE_GUIDANCE: Record<string, string> = {
  new: "BRAND NEW helper (first job). Use very detailed task names so she knows exactly what to do — e.g. 'Wipe kitchen counters & stovetop' not 'Clean kitchen'. Break tasks into small steps.",
  some: "Helper has 1–2 years experience. Use clear task names. She knows the basics but benefits from specific preferences being named.",
  experienced: "VERY EXPERIENCED helper (3+ years). Use concise task names. She knows how to work — focus on timing and priorities.",
};

const HOME_SIZE_GUIDANCE: Record<string, string> = {
  compact: "Small home (~65 sqm). Quick tasks: 10–15 min. Standard cleaning: 20–25 min. Full room: 30 min. Whole-home vacuum: ~20 min.",
  midsize: "Medium home (~110 sqm). Quick tasks: 15 min. Standard cleaning: 30 min. Full room: 45–60 min. Whole-home vacuum: ~35 min.",
  spacious: "Large home (~140+ sqm). Quick tasks: 15–20 min. Standard cleaning: 35–45 min. Full room: 60–90 min. Whole-home vacuum: 45–60 min.",
};

const DEEP_CLEAN_LABELS: Record<string, string> = {
  curtains: "Curtain washing (every 6 months)",
  aircon: "Aircon filter cleaning (every 3 months)",
  carpet: "Carpet/rug shampooing (every 3 months)",
  windows: "Window & track cleaning (every 3 months)",
  mattress: "Mattress vacuuming (every 6 months)",
  hood: "Kitchen hood degreasing (monthly)",
  grout: "Bathroom grout scrubbing (monthly)",
  fridge: "Fridge deep clean (every 3 months)",
  fan: "Ceiling fan cleaning (every 3 months)",
  sofa: "Sofa/upholstery vacuuming (every 3 months)",
};

const PACE_CONFIG: Record<string, {
  window: string;
  workStart: string;
  workEnd: string;
  breaks: string;
  realTasksPerDay: string;
  totalEntriesPerDay: string;
  restNote: string;
}> = {
  relaxed: {
    window: "8:00 AM – 6:00 PM",
    workStart: "08:00",
    workEnd: "18:00",
    breaks: "1-hour lunch (12:00–13:00) + one 20-min morning break (~10:15)",
    realTasksPerDay: "4–5",
    totalEntriesPerDay: "6",
    restNote: "Lighter schedule — space tasks with 10–15 min gaps. Quality over quantity.",
  },
  balanced: {
    window: "7:00 AM – 7:00 PM",
    workStart: "07:00",
    workEnd: "19:00",
    breaks: "1-hour lunch (12:00–13:00) + one 15-min afternoon break (~15:00)",
    realTasksPerDay: "5–6",
    totalEntriesPerDay: "7–8",
    restNote: "Steady, sustainable pace. Short gaps between tasks where possible.",
  },
  intensive: {
    window: "7:00 AM – 8:00 PM",
    workStart: "07:00",
    workEnd: "20:00",
    breaks: "1-hour lunch (12:00–13:00) + one 15-min afternoon break (~15:00)",
    realTasksPerDay: "7–8",
    totalEntriesPerDay: "9–10",
    restNote: "Packed schedule. Protect break times strictly — no task overlap with rests.",
  },
};

// Week variation themes — gives each day a distinct focus
const WEEK_THEMES = [
  { day: "monday",    focus: "Deep clean living areas + laundry" },
  { day: "tuesday",   focus: "Bedrooms + ironing + organising" },
  { day: "wednesday", focus: "Kitchen deep clean + grocery/errands" },
  { day: "thursday",  focus: "Bathrooms + windows + light tidying" },
  { day: "friday",    focus: "Full vacuum + mop + prep for weekend" },
  { day: "saturday",  focus: "Lighter chores + special family meal prep" },
  { day: "sunday",    focus: "Rest-day light duties + weekly reset" },
];

export function buildGenerateTimetablePrompt(ctx: TimetableContext): { prompt: string } {
  const pace = PACE_CONFIG[ctx.helperPace ?? "balanced"];
  const priorityList = ctx.priorities.length > 0
    ? ctx.priorities.map((p) => `"${PRIORITY_LABELS[p] ?? p}"`).join(", ")
    : '"General household management"';
  const roomList = ctx.rooms.join(", ");

  // Filter to only the requested days (segment mode), or all 7
  const activeThemes = ctx.daysToGenerate
    ? WEEK_THEMES.filter((t) => ctx.daysToGenerate!.includes(t.day))
    : WEEK_THEMES;

  // ── Member constraints section ──
  const memberLines: string[] = [];
  const hasRoutines = ctx.memberRoutines && Object.values(ctx.memberRoutines).some((v) => v?.trim());

  if (hasRoutines) {
    ctx.members.forEach((m, i) => {
      const key = `member-${i}`;
      const routine = ctx.memberRoutines?.[key]?.trim() ?? "";
      const quietHours = ctx.memberQuietHours?.[key]?.trim() ?? "";
      if (!routine && !quietHours) return;
      const ageStr = m.age !== undefined ? `, age ${m.age}` : "";
      const label = `${m.name || m.role} (${m.role}${ageStr})`;
      const constraints: string[] = [];
      if (routine) {
        routine.split("\n").filter((l) => l.trim()).forEach((l) => constraints.push(l.trim()));
      }
      if (quietHours) {
        constraints.push(`QUIET HOURS ${quietHours}: no vacuuming, mopping, blender, or washing machine`);
      }
      if (constraints.length > 0) {
        memberLines.push(`${label}:\n${constraints.map((c) => `  • ${c}`).join("\n")}`);
      }
    });
  } else if (ctx.routines) {
    memberLines.push(ctx.routines);
  }

  // ── Elderly care section ──
  const elderlyMembers = ctx.members.filter((m) => m.role === "Elderly");
  let elderlySection = "";
  if (elderlyMembers.length > 0) {
    const details = elderlyMembers.map((m) => {
      const lines = [`${m.name || "Elderly member"} (${m.age ? m.age + " yrs" : "age unknown"})`];
      if (m.mobilityLevel) lines.push(`  Mobility: ${m.mobilityLevel.replace(/_/g, " ")}`);
      if (m.medicalConditions) lines.push(`  Medical: ${m.medicalConditions}`);
      if (m.medications) lines.push(`  Medications: ${m.medications}`);
      if (m.dietaryRestrictions) lines.push(`  Diet: ${m.dietaryRestrictions}`);
      if (m.napSchedule) lines.push(`  Nap: ${m.napSchedule}`);
      return lines.join("\n");
    }).join("\n");
    elderlySection = `\nELDERLY CARE DETAILS:\n${details}\n`;
  }

  // ── Deep clean tasks ──
  let deepCleanSection = "";
  if (ctx.deepCleanTasks && ctx.deepCleanTasks.length > 0) {
    const taskList = ctx.deepCleanTasks.map((id) => DEEP_CLEAN_LABELS[id]).filter(Boolean);
    deepCleanSection = `\nPERIODIC TASKS (add 1–2 across the week, rotate, category "Household Chores"):\n${taskList.map((t) => `  • ${t}`).join("\n")}\n`;
  }

  // ── Week themes ──
  const weekThemes = activeThemes.map((t) => `  ${t.day}: ${t.focus}`).join("\n");
  const daysClause = ctx.daysToGenerate
    ? `Generate ONLY these days: ${ctx.daysToGenerate.join(", ")}. Output exactly ${activeThemes.length} day object${activeThemes.length !== 1 ? "s" : ""} in the array.`
    : `Generate all 7 days.`;

  // ── Constraint translation examples ──
  const constraintExamples = `
Translate member constraints into real tasks. Examples:
  "Dinner ready by 7pm"        → add "Prepare dinner" task ending at 19:00
  "Breakfast ready by 7am"     → add "Prepare breakfast" starting at 06:30–06:45
  "Out Mon–Fri, back by 6pm"   → schedule noisy tasks (vacuum, mop, washing) 9am–5pm on weekdays
  "WFH on Wednesdays"          → NO noisy tasks Wednesday; light work only
  "School pickup at 3pm"       → no task for helper at 15:00; prep snack before pickup
  "Medication at 8am and 8pm"  → add medication task at exactly 08:00 and 20:00 every day
  "Packed lunch daily"         → add "Pack school lunch" task morning
  "Afternoon nap 1–3pm"        → QUIET ZONE 13:00–15:00; no vacuum, mopping, or loud tasks`;

  const outputFormat = `Return ONLY a valid JSON array. No explanation. No markdown fences. Start directly with [

[
  {
    "day": "monday",
    "tasks": [
      {"taskId":"mon-1","time":"07:00","duration":30,"taskName":"Prepare breakfast","area":"Kitchen","category":"Meal Prep","emoji":"🍳"},
      {"taskId":"mon-2","time":"09:00","duration":60,"taskName":"Washing machine cycle","area":"Utility Room","category":"Household Chores","emoji":"🫧","passive":true},
      {"taskId":"mon-3","time":"09:00","duration":20,"taskName":"Wipe kitchen counters","area":"Kitchen","category":"Household Chores","emoji":"🧽"}
    ]
  }
]`;

  const prompt = `You are a Singapore household scheduling expert. Generate a practical 7-day domestic helper timetable.

═══════════════════════════════
HOUSEHOLD
═══════════════════════════════
${ctx.homeName ? `Home name: ${ctx.homeName}\n` : ""}Rooms: ${roomList}
Members: ${ctx.members.map((m) => `${m.name || m.role} (${m.role}${m.age !== undefined ? `, ${m.age}yrs` : ""})`).join(" | ")}
Helper: ${ctx.helperDetails.name} from ${ctx.helperDetails.nationality}
${elderlySection}
═══════════════════════════════
HOME SIZE
═══════════════════════════════
${HOME_SIZE_GUIDANCE[ctx.homeSize ?? "midsize"]}

═══════════════════════════════
PRIORITIES (allocate most time here)
═══════════════════════════════
${priorityList}
Priority tasks must appear EVERY DAY with specific detail. If "Meals & Cooking" is a priority → include breakfast prep, lunch prep, AND dinner prep daily with exact times. If "Cleanliness" → daily vacuum/mop rotation across rooms.

═══════════════════════════════
HELPER
═══════════════════════════════
Experience: ${EXPERIENCE_GUIDANCE[ctx.helperExperience] ?? EXPERIENCE_GUIDANCE.some}
Work window: ${pace.window}
Breaks: ${pace.breaks}
${pace.restNote}

═══════════════════════════════
MEMBER ROUTINES & HARD CONSTRAINTS
═══════════════════════════════
${memberLines.length > 0 ? memberLines.join("\n\n") : "No specific constraints provided."}
${constraintExamples}
${deepCleanSection}
═══════════════════════════════
WEEK VARIATION (each day has a different focus)
═══════════════════════════════
${weekThemes}
Daily chores (breakfast, tidy, dinner prep) repeat every day. The FOCUS task changes.

═══════════════════════════════
TASK RULES
═══════════════════════════════
1. Use EXACT room names from the list: ${roomList}
2. Work window: ${pace.workStart}–${pace.workEnd}. No tasks outside this window.
3. Breaks are MANDATORY and must appear as tasks (category "Break").
4. Generate EXACTLY ${pace.totalEntriesPerDay} tasks per day total (work tasks + breaks combined). IMPORTANT: stay within this limit — the output must fit within a strict token budget.
5. Spread tasks across the FULL day: morning, midday, AND afternoon/evening. Do NOT cluster tasks only in the morning.
6. Noisy tasks (vacuum, mop, washing machine, blender) only when family is OUT. Check member constraints.
7. Meal tasks: use specific times derived from member constraints. Default: breakfast 07:00, lunch 11:30, dinner 17:30.
8. Categories: "Household Chores", "Meal Prep", "Baby Care", "Elderly Care", "Errands", "Break"
9. Days must differ — do NOT copy Monday across all 7 days. Use the week variation themes above. Each day's FOCUS task must be different.
10. PASSIVE TASKS: Some tasks run unattended — mark these passive:true. Examples:
    • Washing machine cycle (30–90 min): start it, then do other tasks while it runs — schedule other tasks at the same time
    • Oven cooking / slow cooker (30–120 min): set it, then clean or prep while it cooks
    • Soaking dishes / laundry pre-soak: mark passive, can overlap with tidying tasks
    • DO NOT mark passive: vacuuming, mopping, ironing, childcare, elderly care (require helper presence)
    • Passive tasks DO count toward the daily task total.
11. MULTI-ROOM SPLITTING: If the home has multiple rooms of the same type, create SEPARATE tasks for each — do NOT combine them.
    • Each bathroom = its own task, 25–35 min each. Name specifically: "Clean master bathroom", "Clean kids bathroom".
    • Each bedroom = its own task, 30–45 min each. Name specifically: "Tidy master bedroom", "Tidy kids bedroom".
    • Schedule them back-to-back (sequential is fine for same-category tasks).
    • NEVER write "Clean all bathrooms" or "Clean 3 bathrooms" as a single task.
${elderlyMembers.length > 0 ? `12. ELDERLY RULES: medication at EXACT times specified. Quiet during naps. Check-in tasks morning AND evening. For limited mobility: check-in every 2–3 hours. No back-to-back physical tasks when helper has care duties.` : ""}

═══════════════════════════════
OUTPUT FORMAT
═══════════════════════════════
${outputFormat}

${daysClause}
Compact format — one task per line. Duration guide: quick tidy=15, standard clean=30, full room=45, cooking=30–45, grocery=60. Per bathroom=25–35 min (separate task each). Per bedroom=30–45 min (separate task each).
Task names: under 30 characters. Specific ("Vacuum living room" not "Clean room").
taskId format: first 3 letters of day + sequence number (e.g. mon-1, tue-2).
${ctx.refineFeedback && ctx.currentSchedule ? `
═══════════════════════════════
USER FEEDBACK — APPLY THESE CHANGES
═══════════════════════════════
"${ctx.refineFeedback}"

Current schedule:
${ctx.currentSchedule.map((d) => `${d.day}: ${d.tasks.map((t) => `${t.time} ${t.taskName} (${t.area})`).join("; ")}`).join("\n")}

Keep everything not mentioned in the feedback unchanged.` : ""}`;

  return { prompt };
}
