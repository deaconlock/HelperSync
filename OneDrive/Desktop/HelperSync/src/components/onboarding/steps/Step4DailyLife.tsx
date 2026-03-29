"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  CheckCircle,
  Users,
} from "lucide-react";
import { HouseholdMember } from "@/types/household";
import { DayAvailability } from "@/types/schedule";
import { cn } from "@/lib/utils";

// --- Constants ---


const ROLE_EMOJIS: Record<string, string> = {
  Husband: "👨",
  Wife: "👩",
  Child: "👶",
  Elderly: "👴",
  Other: "🧑",
};


// --- Quick-add chips per role ---

function getChipsForRole(role: string, age?: number): string[] {
  switch (role) {
    case "Husband":
    case "Wife":
      return [
        "Works Mon–Fri 9am to 6pm",
        "Gym in the morning",
        "Dinner must be ready by 7pm",
        "WFH on Wednesdays",
      ];
    case "Child":
      if (age && age <= 3) {
        return [
          "Naps at 1pm",
          "Feed every 3 hours",
          "Bath at 6pm",
          "No screen time",
        ];
      }
      return [
        "School pickup at 2pm",
        "Homework after school",
        "Bedtime at 9pm",
        "Tuition on Saturdays",
      ];
    case "Elderly":
      return [
        "Morning walk at 7am",
        "Doctor visit on Tuesdays",
        "Likes to watch TV at 4pm",
        "Prefers warm meals only",
      ];
    default:
      return [
        "Usually away during the day",
        "Home on weekends",
      ];
  }
}

function getRoutinePlaceholder(role: string, name: string, age?: number): string {
  switch (role) {
    case "Husband":
    case "Wife":
      return `e.g. ${name} prefers dinner by 7pm, gym clothes washed daily...`;
    case "Child":
      if (age && age <= 3)
        return `e.g. ${name} naps at 1pm, allergic to nuts, no screen time...`;
      return `e.g. ${name} needs school lunch packed, homework help at 4pm...`;
    case "Elderly":
      return `e.g. ${name} enjoys morning walks, has a doctor visit on Tuesdays...`;
    default:
      return `e.g. Any routines the helper should know about ${name}...`;
  }
}


// --- Types ---

interface Step4Props {
  members: HouseholdMember[];
  memberRoutines: Record<string, string>;
  memberSchedules: Record<string, DayAvailability>;
  onUpdate: (
    routines: Record<string, string>,
    schedules: Record<string, DayAvailability>
  ) => void;
}

/** Build a pre-filled summary from elderly fields entered in Step 2 */
function buildElderlySummary(m: HouseholdMember): string {
  const lines: string[] = [];
  if (m.medications) lines.push(`Medication: ${m.medications}`);
  if (m.napSchedule) lines.push(`Nap: ${m.napSchedule}`);
  if (m.dietaryRestrictions) lines.push(`Diet: ${m.dietaryRestrictions}`);
  if (m.mobilityLevel && m.mobilityLevel !== "independent") {
    const label = m.mobilityLevel.replace(/_/g, " ");
    lines.push(`Mobility: ${label}`);
  }
  return lines.join("\n");
}

interface MemberEntry {
  key: string;
  name: string;
  role: string;
  age?: number;
}

// --- Sub-components ---

function MemberCard({
  entry,
  routine,
  onRoutineChange,
  defaultExpanded,
}: {
  entry: MemberEntry;
  routine: string;
  onRoutineChange: (value: string) => void;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const chips = getChipsForRole(entry.role, entry.age);
  const isDone = routine.trim().length > 0;

  const handleChipClick = (chip: string) => {
    const updated = routine ? `${routine}\n${chip}` : chip;
    onRoutineChange(updated);
  };

  const roleLabel = ` (${entry.role}${entry.age ? `, ${entry.age}y` : ""})`;

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden transition-all">
      {/* Card header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <span className="text-lg">
          {ROLE_EMOJIS[entry.role] ?? "🧑"}
        </span>
        <div className="flex-1 text-left">
          <span className="text-sm font-medium text-gray-900">
            {entry.name}
          </span>
          <span className="text-xs text-text-muted ml-1">{roleLabel}</span>
        </div>
        {isDone && (
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        )}
        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* Card body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
          <p className="text-xs font-medium text-gray-700">
            {entry.role === "Elderly"
              ? `We've included ${entry.name}'s care details — add anything else about their day`
              : `What should the helper know about ${entry.name}'s day?`}
          </p>
          <textarea
            value={routine}
            onChange={(e) => onRoutineChange(e.target.value)}
            rows={3}
            placeholder={getRoutinePlaceholder(entry.role, entry.name, entry.age)}
            className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none text-sm leading-relaxed transition-colors"
          />
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                className="px-2.5 py-1.5 bg-gray-50 border border-border rounded-xl text-xs text-text-secondary hover:border-gray-300 hover:text-gray-900 transition-all duration-200"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

export function Step4DailyLife({
  members,
  memberRoutines,
  memberSchedules,
  onUpdate,
}: Step4Props) {
  // Build the list of member entries
  const entries: MemberEntry[] = members.map((m, i) => ({
    key: `member-${i}`,
    name: m.name,
    role: m.role,
    age: m.age,
  }));

  // Auto-populate elderly routines from Step 2 care details (once)
  const didAutoPopulate = useRef(false);
  useEffect(() => {
    if (didAutoPopulate.current) return;
    didAutoPopulate.current = true;
    let changed = false;
    const updated = { ...memberRoutines };
    members.forEach((m, i) => {
      const key = `member-${i}`;
      if (m.role === "Elderly" && !updated[key]?.trim()) {
        const summary = buildElderlySummary(m);
        if (summary) {
          updated[key] = summary;
          changed = true;
        }
      }
    });
    if (changed) onUpdate(updated, memberSchedules);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRoutineChange = (key: string, value: string) => {
    const updated = { ...memberRoutines, [key]: value };
    onUpdate(updated, memberSchedules);
  };

  const filledCount = entries.filter((e) =>
    (memberRoutines[e.key] ?? "").trim().length > 0
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-gray-700" />
        </div>
        <h2 className="text-2xl font-display font-semibold tracking-tight text-gray-900 mb-2">
          Tell us about everyone&apos;s day
        </h2>
        <p className="text-text-secondary text-sm max-w-md">
          Routines and schedules help us build the perfect timetable for your helper. This is optional but makes a big difference.
        </p>
      </div>

      {/* Member cards */}
      <div className="space-y-3">
        {entries.map((entry, i) => (
          <MemberCard
            key={entry.key}
            entry={entry}
            routine={memberRoutines[entry.key] ?? ""}
            onRoutineChange={(v) => handleRoutineChange(entry.key, v)}
            defaultExpanded={i === 0}
          />
        ))}
      </div>

      {/* Progress summary */}
      {filledCount > 0 && (
        <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3 border border-border">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-gray-900">
              {filledCount} of {entries.length}
            </span>
          </div>
          <p className="text-xs text-text-secondary ml-auto">
            {filledCount === entries.length
              ? "All members covered!"
              : "Fill in as many as you'd like"}
          </p>
        </div>
      )}
    </div>
  );
}
