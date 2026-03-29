interface TimetableContext {
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
  // New per-member data
  memberRoutines?: Record<string, string>;
  memberSchedules?: Record<string, Record<string, Array<{ start: string; end: string; label?: string }>>>;
  // Legacy fields (backward compat)
  employerAvailability?: Record<string, Array<{ start: string; end: string; label?: string }>>;
  wifeAvailability?: Record<string, Array<{ start: string; end: string; label?: string }>>;
  routines?: string;
  priorities: string[];
  helperExperience: string;
  helperPace?: string;
  homeSize?: string;
  deepCleanTasks?: string[];
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
  new: "The helper is BRAND NEW (first job). Use detailed, step-by-step task names so she knows exactly what to do. For example, instead of 'Clean kitchen' use 'Wipe kitchen counters & stovetop'. Include more tasks broken into smaller steps.",
  some: "The helper has 1-2 years of experience. Use clear but not overly detailed task names. She knows the basics but may need guidance on specific household preferences.",
  experienced: "The helper is VERY EXPERIENCED (3+ years). Use concise task names — she knows how to get things done. Focus on timing and priorities rather than step-by-step instructions.",
};

const HOME_SIZE_GUIDANCE: Record<string, string> = {
  compact: "This is a SMALL home (~700 sqft / 65 sqm). Adjust cleaning durations accordingly: quick tasks 10-15min, standard cleaning 20-25min, full room clean 30-40min. Vacuuming the whole home should take ~20min.",
  midsize: "This is a MEDIUM home (~1,200 sqft / 110 sqm). Use standard durations: quick tasks 15min, standard cleaning 30min, full room clean 45-60min.",
  spacious: "This is a LARGE home (1,500+ sqft / 140+ sqm). Cleaning takes longer: quick tasks 15-20min, standard cleaning 35-45min, full room clean 60-90min. Vacuuming the whole home may take 45-60min.",
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

const PACE_CONFIG: Record<string, { window: string; breaks: string; tasksPerDay: string; restNote: string }> = {
  relaxed: {
    window: "8:00 AM to 6:00 PM",
    breaks: "Include a 1-hour lunch break (12:00–1:00 PM) AND two 20-minute rest breaks (one mid-morning around 10:15, one mid-afternoon around 3:00). No tasks during breaks.",
    tasksPerDay: "6-8",
    restNote: "This employer prefers a lighter schedule. Space tasks generously — leave 10-15 min gaps between tasks for the helper to transition and rest. Prioritize quality over quantity.",
  },
  balanced: {
    window: "7:00 AM to 7:00 PM",
    breaks: "Include a 1-hour lunch break (12:00–1:00 PM) AND two 15-minute rest breaks (one mid-morning around 10:15, one mid-afternoon around 3:00). No tasks during breaks.",
    tasksPerDay: "8-10",
    restNote: "Aim for a steady, sustainable pace. Leave short gaps between tasks where possible.",
  },
  intensive: {
    window: "7:00 AM to 8:00 PM",
    breaks: "Include a 1-hour lunch break (12:00–1:00 PM) AND one 15-minute afternoon break around 3:00 PM. No tasks during breaks.",
    tasksPerDay: "10-12",
    restNote: "This is a packed schedule. Ensure the break times are strictly protected — no tasks should overlap with rest periods.",
  },
};

export function buildGenerateTimetablePrompt(ctx: TimetableContext): string {
  const priorityList = ctx.priorities.length > 0
    ? ctx.priorities.map((p) => PRIORITY_LABELS[p] ?? p).join(", ")
    : "General household management";

  const experienceNote = EXPERIENCE_GUIDANCE[ctx.helperExperience] ?? EXPERIENCE_GUIDANCE.some;
  const pace = PACE_CONFIG[ctx.helperPace ?? "balanced"];
  const sizeNote = HOME_SIZE_GUIDANCE[ctx.homeSize ?? "midsize"];

  // Build deep clean section
  let deepCleanSection = "";
  if (ctx.deepCleanTasks && ctx.deepCleanTasks.length > 0) {
    const taskList = ctx.deepCleanTasks
      .map((id) => DEEP_CLEAN_LABELS[id])
      .filter(Boolean)
      .join("\n- ");
    deepCleanSection = `\nPERIODIC DEEP CLEANING TASKS:
The employer has selected these periodic deep-clean tasks. Distribute 1-2 of these across the week as bonus tasks, rotating through them. Label their category as "Household Chores". Add a note in the task name indicating frequency (e.g. "Deep clean: kitchen hood [monthly]").
- ${taskList}`;
  }

  // Build per-member schedules & routines section
  let memberSection = "";
  if (ctx.memberSchedules || ctx.memberRoutines) {
    const lines: string[] = [];
    // Employer
    const empSchedule = ctx.memberSchedules?.["employer"] ?? ctx.employerAvailability;
    const empRoutine = ctx.memberRoutines?.["employer"] ?? ctx.routines ?? "";
    lines.push(`You (Employer)${empSchedule ? `\n  Away schedule: ${JSON.stringify(empSchedule)}` : ""}${empRoutine ? `\n  Routines: "${empRoutine}"` : ""}`);

    // Other members
    if (ctx.memberSchedules || ctx.memberRoutines) {
      ctx.members.forEach((m, i) => {
        const key = `member-${i}`;
        const schedule = ctx.memberSchedules?.[key];
        const routine = ctx.memberRoutines?.[key] ?? "";
        const ageStr = m.age ? `, ${m.age} years old` : "";
        lines.push(`${m.name} (${m.role}${ageStr})${schedule ? `\n  Away schedule: ${JSON.stringify(schedule)}` : ""}${routine ? `\n  Routines: "${routine}"` : ""}`);
      });
    }
    memberSection = `\nMEMBER SCHEDULES & ROUTINES:\n${lines.join("\n\n")}\n\nYou MUST respect these routines when scheduling. For example, if someone says "no vacuuming during nap time", do not schedule vacuuming during that window. If they say "dinner ready by 7pm", schedule dinner prep to finish by 6:45pm.`;
  } else {
    // Legacy fallback
    const routinesText = ctx.routines
      ? `\nSPECIFIC ROUTINES & PREFERENCES:\n${ctx.routines}\n\nYou MUST respect these routines when scheduling.`
      : "";
    memberSection = `
EMPLOYER AWAY SCHEDULE (times when employer is not home):
${JSON.stringify(ctx.employerAvailability ?? {}, null, 2)}

WIFE/PARTNER AWAY SCHEDULE:
${JSON.stringify(ctx.wifeAvailability ?? {}, null, 2)}
${routinesText}`;
  }

  // Build elderly care details section
  const elderlyMembers = ctx.members.filter(m => m.role === "Elderly");
  let elderlySection = "";
  if (elderlyMembers.length > 0) {
    elderlySection = `\nELDERLY CARE DETAILS:\n${elderlyMembers.map(m => {
      const lines = [`${m.name} (${m.age ? m.age + ' years old' : 'age not specified'})`];
      if (m.mobilityLevel) lines.push(`  Mobility: ${m.mobilityLevel.replace(/_/g, " ")}`);
      if (m.medicalConditions) lines.push(`  Medical conditions: ${m.medicalConditions}`);
      if (m.medications) lines.push(`  Medications: ${m.medications}`);
      if (m.dietaryRestrictions) lines.push(`  Dietary restrictions: ${m.dietaryRestrictions}`);
      if (m.napSchedule) lines.push(`  Nap schedule: ${m.napSchedule}`);
      return lines.join("\n");
    }).join("\n\n")}`;
  }

  const elderlyRules = elderlyMembers.length > 0 ? `
17. ELDERLY CARE RULES:
  a. Medication tasks MUST be scheduled at the EXACT times specified by the employer. These are non-negotiable — never move or skip them.
  b. If a nap schedule is specified, do NOT schedule noisy tasks (vacuuming, laundry machine, blender) during nap times.
  c. Meal prep for elderly with dietary restrictions must account for their specific needs (separate prep if needed).
  d. For members with limited mobility ("needs_assistance", "wheelchair", "bedridden"): schedule regular check-in tasks (every 2-3 hours), and include mobility exercises or assisted walks if they are not bedridden.
  e. Do NOT stack multiple physically demanding tasks back-to-back when the helper also has elderly care duties — they need energy reserves for care tasks.
  f. Schedule a dedicated "Elderly care check-in" task in the morning and evening at minimum.` : "";

  return `You are an expert household management consultant specialising in Singapore domestic helper schedules.

Create a realistic, practical 7-day weekly timetable for a domestic helper based on the household context below.

HOUSEHOLD CONTEXT:
- Rooms/Areas: ${ctx.rooms.join(", ")}
- Household Members: ${ctx.members.map((m) => `${m.name} (${m.role}${m.age ? `, ${m.age} years old` : ""})`).join(", ")}
- Helper: ${ctx.helperDetails.name} from ${ctx.helperDetails.nationality}
${elderlySection}
HOME SIZE:
${sizeNote}

EMPLOYER'S TOP PRIORITIES: ${priorityList}
These are what the employer cares about MOST. Allocate more time and frequency to priority areas. For example, if "Meals & Cooking" is a priority, include detailed meal prep for all three meals, not just breakfast and dinner.

HELPER EXPERIENCE LEVEL:
${experienceNote}
${memberSection}
${deepCleanSection}

SCHEDULING RULES:
1. Schedule tasks from ${pace.window}
2. ${pace.breaks}
3. ${pace.restNote}
4. Baby/child care tasks must be scheduled appropriately for their age
5. Tasks should cover all rooms over the course of the week
6. Rotate cleaning tasks sensibly (not every room every day)
7. Schedule noisy tasks (vacuuming, washing machine) when the family is OUT
8. Schedule meals to be ready BEFORE the family arrives home
9. Use these categories: "Household Chores", "Baby Care", "Elderly Care", "Meal Prep", "Errands", "Break"
14. Use category "Break" for lunch breaks and rest breaks. Break tasks should have names like "Lunch break", "Afternoon rest". These MUST appear in the schedule as real tasks with proper time and duration
10. Mark tasks as requiresPhoto: true if they involve high-value items, elderly care, or baby care
11. Set recurring: true for daily tasks, false for weekly/periodic tasks
12. Choose appropriate emojis for each task
13. Tasks related to the employer's TOP PRIORITIES should appear more frequently and with more detail
15. CRITICAL: Spread tasks EVENLY across the ENTIRE work window (morning, midday, and afternoon). Do NOT cluster all tasks in the morning. There should be tasks scheduled after lunch and into the late afternoon. Leave natural gaps (15-30 min) between tasks — the helper is not a machine. Not every time slot needs to be filled.
16. A realistic daily flow should look like: morning chores → mid-morning break → cooking/prep → lunch break → afternoon tasks → afternoon break → evening prep. Distribute accordingly.${elderlyRules}

Return ONLY a JSON array with this exact structure (no explanation, no markdown):
[
  {
    "day": "monday",
    "tasks": [
      {
        "taskId": "unique-id-here",
        "time": "07:00",
        "duration": 30,
        "taskName": "Prepare breakfast",
        "area": "Kitchen",
        "category": "Meal Prep",
        "recurring": true,
        "requiresPhoto": false,
        "emoji": "🍳"
      }
    ]
  }
]

DURATION GUIDELINES (in minutes):
- Quick tasks (wiping, tidying): 15
- Standard tasks (mopping, laundry load, meal prep): 30
- Medium tasks (cooking a full meal, ironing, deep clean one room): 45-60
- Long tasks (weekly deep clean, grocery shopping): 90-120
- Tasks can overlap if they happen simultaneously (e.g. "Monitor washing machine" while doing other tasks)

Days must be: monday, tuesday, wednesday, thursday, friday, saturday, sunday
Generate ${pace.tasksPerDay} entries per day (this count INCLUDES break entries). Make it realistic. Keep task names short (under 30 characters).${ctx.refineFeedback && ctx.currentSchedule ? `

USER FEEDBACK ON CURRENT PROPOSAL:
The user reviewed the schedule you previously generated and wants these changes:
"${ctx.refineFeedback}"

Current schedule for reference:
${ctx.currentSchedule.map((d) => `${d.day}: ${d.tasks.map((t) => `${t.time} ${t.taskName} (${t.category}, ${t.area})`).join("; ")}`).join("\n")}

IMPORTANT: Incorporate the user's feedback while keeping the parts of the schedule they didn't mention. Only change what they asked for.` : ""}`;
}
