"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircle, Users, Check, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { HouseholdMember } from "@/types/household";
import { DayAvailability } from "@/types/schedule";
import { cn } from "@/lib/utils";
import type { SetupFor } from "@/app/onboarding/employer/page";

// --- Constants ---

const ROLE_EMOJIS: Record<string, string> = {
  Husband: "👨",
  Wife: "👩",
  Child: "👶",
  Elderly: "👴",
  Other: "🧑",
};

const AGE_LABEL: Record<number, string> = {
  0: "Under 1",
  2: "1–3",
  8: "4–12",
  15: "13–17",
  35: "18–60",
  68: "61–75",
  80: "76+",
};

// Chips that benefit from a specific time so the AI can schedule prep beforehand
const TIME_SENSITIVE_CHIPS = new Set([
  "Swimming on Fridays",
  "Music lessons on Thursdays",
  "Tuition Mon & Wed",
  "Tuition on Saturdays",
  "Doctor visit on Tuesdays",
  "Physiotherapy on Thursdays",
  "Gym in the morning",
]);

// Maps nap chips → quiet hour window so the system auto-derives without asking again
const NAP_TO_QUIET: Record<string, string> = {
  "Morning nap 9–10am":   "9:00 AM – 10:00 AM",
  "Morning nap 10–11am":  "10:00 AM – 11:00 AM",
  "Afternoon nap 12–2pm": "12:00 PM – 2:00 PM",
  "Afternoon nap 1–3pm":  "1:00 PM – 3:00 PM",
  "Afternoon nap 2–4pm":  "2:00 PM – 4:00 PM",
  "Catnap at 4pm":        "4:00 PM – 5:00 PM",
};

// Mutually exclusive: selecting one auto-deselects the rest in the same group
const CONFLICT_GROUPS: string[][] = [
  ["Out Mon–Fri, back by 6pm", "Out Mon–Fri, back by 7pm", "Out Mon–Fri, back by 8pm"],
  ["WFH on Wednesdays", "WFH full week"],
  ["Breakfast ready by 7am", "Breakfast ready by 7:30am"],
  ["Dinner ready by 6:30pm", "Dinner ready by 7pm", "Dinner ready by 7:30pm"],
  ["Formula every 3 hours", "Formula every 4 hours", "Breastfeeding — prepare bottles"],
  ["Morning nap 9–10am", "Morning nap 10–11am"],
  ["Afternoon nap 12–2pm", "Afternoon nap 1–3pm", "Afternoon nap 2–4pm"],
  ["Bedtime at 7pm", "Bedtime at 7:30pm", "Bedtime at 8pm"],
  ["Bath at 6pm", "Bath at 7pm"],
  ["School pickup at 1pm", "School pickup at 2pm", "School pickup at 3pm"],
  ["Bedtime at 8:30pm", "Bedtime at 9pm"],
  ["Morning walk at 7am", "Morning walk at 8am"],
  ["Medication at 8am and 8pm", "Medication after every meal"],
  ["Lunch ready by 12pm", "Lunch ready by 1pm"],
  ["Dinner ready by 6pm", "Dinner ready by 6:30pm"],
];

// Soft incompatibility: when key chip is selected, listed chips become greyed-out (not deselected)
const INCOMPATIBLE: Record<string, string[]> = {
  "WFH full week": [
    "Out Mon–Fri, back by 6pm", "Out Mon–Fri, back by 7pm", "Out Mon–Fri, back by 8pm",
    "Clean rooms while I'm out",
  ],
  "Small meals, 4–5 times a day": [
    "Lunch ready by 12pm", "Lunch ready by 1pm",
    "Dinner ready by 6pm", "Dinner ready by 6:30pm",
  ],
};

// Contextual suggestions surfaced from a helper's POV after a chip is selected
const SUGGESTIONS: Record<string, string[]> = {
  "Out Mon–Fri, back by 7pm":         ["Tidy common areas before owner returns"],
  "Out Mon–Fri, back by 6pm":         ["Tidy common areas before owner returns"],
  "Out Mon–Fri, back by 8pm":         ["Light dinner warming duty for late return"],
  "Gym mornings — wash kit same day": ["Hang dry gym kit — do not tumble dry"],
  "WFH on Wednesdays":                ["Quiet tasks on Wednesdays — no vacuum/blender"],
  "WFH full week":                    ["Prepare mid-morning coffee or snack"],
  "School pickup at 1pm":             ["Lunch ready by 1:30pm after pickup"],
  "School pickup at 2pm":             ["After-school snack ready by 2:30pm"],
  "School pickup at 3pm":             ["After-school snack ready by 3:30pm"],
  "Homework help after school":       ["Clear dining table and prepare stationery"],
  "Formula every 3 hours":            ["Sterilise bottles after each feed"],
  "Solids 3× daily":                  ["Prepare fresh purée — no salt or sugar"],
  "Morning nap 9–10am":               ["Morning chores during nap window"],
  "Afternoon nap 1–3pm":              ["Quiet tasks 1–3pm — no vacuum or loud noise"],
  "Morning walk at 7am":              ["Accompany on morning walk if needed"],
  "Medication at 8am and 8pm":        ["Set medication reminder — do not skip"],
  "Doctor visit on Tuesdays":         ["Accompany to clinic if family requests"],
  "Blood sugar check before meals":   ["Prepare low-GI meal options"],
};

const MAX_PER_GROUP = 3;

function getChipState(
  chip: string,
  selectedChips: string[],
  groupChips: string[],
): "selected" | "available" | "conflicted" | "limit" {
  if (selectedChips.includes(chip)) return "selected";

  const conflictGroup = CONFLICT_GROUPS.find((g) => g.includes(chip));
  if (conflictGroup && conflictGroup.some((c) => selectedChips.includes(c))) return "conflicted";

  const isIncompatible = Object.entries(INCOMPATIBLE).some(
    ([trigger, blocked]) => selectedChips.includes(trigger) && blocked.includes(chip)
  );
  if (isIncompatible) return "conflicted";

  const groupSelected = groupChips.filter((c) => selectedChips.includes(c)).length;
  if (groupSelected >= MAX_PER_GROUP) return "limit";

  return "available";
}

function formatTime12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

interface ChipGroup { label: string; chips: string[]; variant?: "morning" | "afternoon" | "evening" | "additional"; }

function getChipGroups(role: string, age?: number, workStatus?: "working" | "home" | null): ChipGroup[] {
  switch (role) {
    case "Husband":
    case "Wife": {
      const morningGroups: ChipGroup[] = workStatus === "home"
        ? [
            {
              label: "🌅 Morning",
              variant: "morning",
              chips: [
                "Breakfast ready by 8am",
                "Breakfast ready by 8:30am",
                "School run at 8am",
                "School run at 8:30am",
                "Morning errands — back by noon",
              ],
            },
            {
              label: "☀️ Afternoon",
              variant: "afternoon",
              chips: [
                "Home all day — coordinate tasks together",
                "Grocery run in the afternoon",
                "Nap 1–3pm — keep noise down",
                "Out for errands 2–4pm",
              ],
            },
          ]
        : [
            {
              label: "🌅 Morning",
              variant: "morning",
              chips: [
                "Breakfast ready by 7am",
                "Breakfast ready by 7:30am",
                "Out Mon–Fri, back by 6pm",
                "Out Mon–Fri, back by 7pm",
                "Out Mon–Fri, back by 8pm",
              ],
            },
            {
              label: "☀️ Afternoon",
              variant: "afternoon",
              chips: [
                "WFH on Wednesdays",
                "WFH full week",
              ],
            },
          ];

      return [
        ...morningGroups,
        {
          label: "🌙 Evening",
          variant: "evening",
          chips: [
            "Dinner ready by 6:30pm",
            "Dinner ready by 7pm",
            "Dinner ready by 7:30pm",
          ],
        },
        {
          label: "📋 Additional",
          variant: "additional",
          chips: workStatus === "home"
            ? [
                "Gym in the morning",
                "Deep clean Fridays — guests on weekends",
                "Weekend afternoon quiet — nap 1–3pm",
                "Early riser — up by 6am",
                "No vacuuming before 9am",
              ]
            : [
                "Gym in the morning",
                "Packed lunch daily",
                "Work clothes ironed Mon & Thu",
                "Gym mornings — wash kit same day",
                "Deep clean Fridays — guests on weekends",
                "Weekend afternoon quiet — nap 1–3pm",
                "Early riser — up by 6am",
                "Clean rooms while I'm out",
                "No vacuuming before 9am",
              ],
        },
      ];
    }
    case "Child":
      if (age !== undefined && age <= 2) {
        return [
          {
            label: "🌅 Morning",
            variant: "morning",
            chips: [
              "Morning nap 9–10am",
              "Morning nap 10–11am",
            ],
          },
          {
            label: "☀️ Afternoon",
            variant: "afternoon",
            chips: [
              "Afternoon nap 12–2pm",
              "Afternoon nap 1–3pm",
              "Afternoon nap 2–4pm",
              "Catnap at 4pm",
            ],
          },
          {
            label: "🌙 Evening",
            variant: "evening",
            chips: [
              "Bath at 6pm",
              "Bath at 7pm",
              "Bedtime at 7pm",
              "Bedtime at 7:30pm",
              "Bedtime at 8pm",
            ],
          },
        ];
      }
      return [
        {
          label: "🌅 Morning",
          variant: "morning",
          chips: [
            "Breakfast before 7:30am",
          ],
        },
        {
          label: "☀️ Afternoon",
          variant: "afternoon",
          chips: [
            "School pickup at 1pm",
            "School pickup at 2pm",
            "School pickup at 3pm",
          ],
        },
        {
          label: "🌙 Evening",
          variant: "evening",
          chips: [
            "Bedtime at 8:30pm",
            "Bedtime at 9pm",
          ],
        },
      ];
    case "Elderly":
      return [
        {
          label: "🌅 Morning",
          variant: "morning",
          chips: [
            "Morning walk at 7am",
            "Morning walk at 8am",
            "Medication at 8am and 8pm",
            "Medication after every meal",
          ],
        },
        {
          label: "☀️ Afternoon",
          variant: "afternoon",
          chips: [
            "Lunch ready by 12pm",
            "Lunch ready by 1pm",
            "Snack ready for 4pm TV time",
            "Doctor visit on Tuesdays",
            "Physiotherapy on Thursdays",
          ],
        },
        {
          label: "🌙 Evening",
          variant: "evening",
          chips: [
            "Dinner ready by 6pm",
            "Dinner ready by 6:30pm",
            "Warm drink before bed",
          ],
        },
      ];
    default:
      return [
        {
          label: "📅 Schedule",
          chips: [
            "Usually away during the day",
            "Home on weekends",
            "Night shift — home by 7am",
            "Works from home",
          ],
        },
      ];
  }
}

function buildRoutineText(chips: string[], notes: string, times: Record<string, string> = {}): string {
  const parts = chips.map((c) => {
    const t = times[c];
    return t ? `${c} at ${formatTime12(t)}` : c;
  });
  if (notes.trim()) parts.push(notes.trim());
  return parts.join("\n");
}

// --- Types ---

interface MemberEntry {
  key: string;
  name: string;
  role: string;
  age?: number;
}

interface Step4Props {
  members: HouseholdMember[];
  memberRoutines: Record<string, string>;
  memberSchedules: Record<string, DayAvailability>;
  memberQuietHours: Record<string, string>;
  setupFor: SetupFor | null;
  showReward: boolean;
  onUpdate: (routines: Record<string, string>, schedules: Record<string, DayAvailability>) => void;
  onQuietHoursUpdate: (quietHours: Record<string, string>) => void;
  onComplete: () => void;
}

// --- MemberCard ---

function MemberCard({
  entry,
  quietHours,
  initialRoutine,
  onRoutineChange,
  onQuietHoursChange,
}: {
  entry: MemberEntry;
  quietHours: string;
  initialRoutine: string;
  onRoutineChange: (value: string) => void;
  onQuietHoursChange: (value: string) => void;
}) {
  const isAdult = entry.role === "Husband" || entry.role === "Wife";

  const [workStatus, setWorkStatus] = useState<"working" | "home" | null>(() => {
    if (!isAdult) return null;
    if (!initialRoutine) return null;
    const lines = initialRoutine.split("\n");
    if (lines.some((l) => l.startsWith("Out Mon–Fri") || l.includes("WFH"))) return "working";
    if (lines.some((l) => l.startsWith("Home all day") || l.startsWith("School run") || l.startsWith("Morning errands") || l.startsWith("Grocery run") || l.startsWith("Out for errands") || l.startsWith("Nap 1–3pm"))) return "home";
    return null;
  });

  const allKnownChips = getChipGroups(entry.role, entry.age, workStatus).flatMap((g) => g.chips);

  const [selectedChips, setSelectedChips] = useState<string[]>(() => {
    if (!initialRoutine) return [];
    return initialRoutine.split("\n").filter(Boolean).flatMap((line) => {
      const m = line.match(/^(.+) at \d+:\d+ [AP]M$/);
      const chipText = m ? m[1] : line;
      return allKnownChips.includes(chipText) ? [chipText] : [];
    });
  });
  const [chipTimes, setChipTimes] = useState<Record<string, string>>(() => {
    if (!initialRoutine) return {};
    const times: Record<string, string> = {};
    for (const line of initialRoutine.split("\n").filter(Boolean)) {
      const m = line.match(/^(.+) at (\d+):(\d+) ([AP]M)$/);
      if (m && allKnownChips.includes(m[1])) {
        let h = parseInt(m[2]);
        const min = m[3];
        const period = m[4];
        if (period === "PM" && h !== 12) h += 12;
        if (period === "AM" && h === 12) h = 0;
        times[m[1]] = `${String(h).padStart(2, "0")}:${min}`;
      }
    }
    return times;
  });
  const [customChips, setCustomChips] = useState<Record<string, string[]>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [addingGroup, setAddingGroup] = useState<string | null>(null);
  const [addingValue, setAddingValue] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  const chipGroups = getChipGroups(entry.role, entry.age, workStatus);

  useEffect(() => {
    if (addingGroup) addInputRef.current?.focus();
  }, [addingGroup]);

  const toggleChip = (chip: string) => {
    const isSelected = selectedChips.includes(chip);
    let next: string[];
    if (isSelected) {
      next = selectedChips.filter((c) => c !== chip);
    } else {
      // Auto-deselect chips in the same mutual-exclusivity group
      const conflictGroup = CONFLICT_GROUPS.find((g) => g.includes(chip));
      const withoutConflicts = conflictGroup
        ? selectedChips.filter((c) => !conflictGroup.includes(c))
        : selectedChips;
      next = [...withoutConflicts, chip];
    }
    setSelectedChips(next);
    onRoutineChange(buildRoutineText(next, "", chipTimes));

    // Auto-derive quiet hours from nap chip — no manual step needed
    if (chip in NAP_TO_QUIET) {
      if (!isSelected) {
        onQuietHoursChange(NAP_TO_QUIET[chip]);
      } else {
        const remainingNap = next.find((c) => c in NAP_TO_QUIET);
        onQuietHoursChange(remainingNap ? NAP_TO_QUIET[remainingNap] : "");
      }
    }
  };

  const commitSuggestionChip = (groupLabel: string, chip: string) => {
    const updatedCustom = { ...customChips, [groupLabel]: [...(customChips[groupLabel] ?? []), chip] };
    setCustomChips(updatedCustom);
    const next = [...selectedChips, chip];
    setSelectedChips(next);
    onRoutineChange(buildRoutineText(next, "", chipTimes));
  };

  const handleTimeChange = (chip: string, time: string) => {
    const updated = { ...chipTimes, [chip]: time };
    setChipTimes(updated);
    onRoutineChange(buildRoutineText(selectedChips, "", updated));
  };

  const commitCustomChip = (groupLabel: string) => {
    const val = addingValue.trim();
    if (val) {
      const updated = { ...customChips, [groupLabel]: [...(customChips[groupLabel] ?? []), val] };
      setCustomChips(updated);
      const next = [...selectedChips, val];
      setSelectedChips(next);
      onRoutineChange(buildRoutineText(next, "", chipTimes));
    }
    setAddingGroup(null);
    setAddingValue("");
  };

  const removeCustomChip = (groupLabel: string, chip: string) => {
    const updated = { ...customChips, [groupLabel]: (customChips[groupLabel] ?? []).filter((c) => c !== chip) };
    setCustomChips(updated);
    const next = selectedChips.filter((c) => c !== chip);
    setSelectedChips(next);
    onRoutineChange(buildRoutineText(next, "", chipTimes));
  };

  const ageLabel = entry.age !== undefined ? AGE_LABEL[entry.age] : undefined;
  const roleLabel = `${entry.role}${ageLabel ? `, ${ageLabel}` : ""}`;

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden transition-all duration-500",
      selectedChips.length > 0 ? "border-emerald-200 bg-emerald-50/20" : "border-border bg-white"
    )}>
      {/* Static header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
        <span className="text-2xl">{ROLE_EMOJIS[entry.role] ?? "🧑"}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-900">{entry.name || entry.role}</span>
          <span className="text-xs text-text-muted ml-1.5">({roleLabel})</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {quietHours && (
            <span className="text-xs font-medium text-primary bg-primary-50 border border-primary/20 rounded-full px-2 py-0.5">
              🤫 {quietHours.split(" – ")[0]}
            </span>
          )}
          {selectedChips.length > 0 && (
            <span
              key={selectedChips.length}
              className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 animate-fade-in-up"
            >
              {selectedChips.length} selected
            </span>
          )}
          {selectedChips.length > 0 && (
            <CheckCircle className="w-4 h-4 text-emerald-500 animate-checkmark" />
          )}
        </div>
      </div>

      {/* Body — always visible */}
      <div className="px-4 pb-4 space-y-4 pt-4">

        {/* Work status toggle — adults only */}
        {isAdult && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 tracking-wide">How does {entry.name || entry.role}&apos;s day typically look?</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setWorkStatus("working");
                  setSelectedChips([]);
                  setChipTimes({});
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-150",
                  workStatus === "working"
                    ? "border-primary bg-primary-50 text-primary"
                    : "border-border bg-white text-gray-600 hover:border-gray-300"
                )}
              >
                💼 Goes out to work
              </button>
              <button
                onClick={() => {
                  setWorkStatus("home");
                  setSelectedChips([]);
                  setChipTimes({});
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-150",
                  workStatus === "home"
                    ? "border-primary bg-primary-50 text-primary"
                    : "border-border bg-white text-gray-600 hover:border-gray-300"
                )}
              >
                🏠 Home full-time
              </button>
            </div>
          </div>
        )}

        {/* Chip groups — shown once work status chosen (or always for non-adults) */}
        {(!isAdult || workStatus !== null) && chipGroups.map((group) => {
          const hasTimeSensitive = group.chips.some((c) => TIME_SENSITIVE_CHIPS.has(c));
          const isGroupExpanded = expandedGroups.has(group.label);
          const VISIBLE = 4;
          const selectedInGroup = group.chips.filter((c) => selectedChips.includes(c));
          const unselectedInGroup = group.chips.filter((c) => !selectedChips.includes(c));
          const visibleUnselected = isGroupExpanded
            ? unselectedInGroup
            : unselectedInGroup.slice(0, Math.max(0, VISIBLE - selectedInGroup.length));
          const visibleChips = [...selectedInGroup, ...visibleUnselected];
          const hiddenCount = unselectedInGroup.length - visibleUnselected.length;
          const groupSelectedCount = group.chips.filter((c) => selectedChips.includes(c)).length;

          // Suggestions triggered by selected chips in this group
          const groupSuggestions = group.chips
            .filter((c) => selectedChips.includes(c) && SUGGESTIONS[c])
            .flatMap((c) => SUGGESTIONS[c]!)
            .filter((s, i, arr) =>
              arr.indexOf(s) === i && // dedupe
              !selectedChips.includes(s) &&
              !(customChips[group.label] ?? []).includes(s)
            );

          const variantLabelClass =
            group.variant === "morning"    ? "border-l-2 border-amber-300 pl-2 text-amber-700" :
            group.variant === "afternoon"  ? "border-l-2 border-sky-400 pl-2 text-sky-700" :
            group.variant === "evening"    ? "border-l-2 border-indigo-300 pl-2 text-indigo-700" :

            "text-gray-500";

          return (
            <div key={group.label} className="space-y-2">
              {group.variant && chipGroups.indexOf(group) > 0 && (
                <div className="border-t border-gray-100 -mx-4 pt-1" />
              )}
              <div className="flex items-center gap-2">
                <p className={cn("text-xs font-semibold tracking-wide", variantLabelClass)}>{group.label}</p>
                {hasTimeSensitive && (
                  <p className="text-xs text-gray-400">— set a time for auto-prep</p>
                )}
                {groupSelectedCount > 0 && (
                  <span className={cn(
                    "ml-auto text-xs font-medium tabular-nums",
                    groupSelectedCount >= MAX_PER_GROUP ? "text-amber-500" : "text-gray-400"
                  )}>
                    {groupSelectedCount} / {MAX_PER_GROUP}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {visibleChips.map((chip) => {
                  const state = getChipState(chip, selectedChips, group.chips);
                  const isSelected = state === "selected";
                  const isDisabled = state === "conflicted" || state === "limit";
                  const isTimeSensitive = TIME_SENSITIVE_CHIPS.has(chip);

                  if (isSelected && isTimeSensitive) {
                    return (
                      <span
                        key={chip}
                        className="flex items-center gap-1 pl-2.5 pr-2 py-1.5 rounded-xl border-2 border-primary bg-primary-50 text-primary text-xs font-medium"
                      >
                        <button onClick={() => toggleChip(chip)} className="flex items-center gap-1">
                          <Check className="w-3 h-3 flex-shrink-0" />
                          {chip}
                        </button>
                        <span className="mx-1 text-primary/40">·</span>
                        <input
                          type="time"
                          value={chipTimes[chip] ?? ""}
                          onChange={(e) => handleTimeChange(chip, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs bg-transparent outline-none text-primary w-[4.5rem] cursor-pointer"
                        />
                      </span>
                    );
                  }

                  return (
                    <button
                      key={chip}
                      onClick={() => !isDisabled && toggleChip(chip)}
                      disabled={isDisabled}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all duration-150",
                        isSelected
                          ? "border-primary bg-primary-50 text-primary active:scale-95"
                          : state === "conflicted"
                            ? "border-gray-100 bg-gray-50 text-gray-300 line-through decoration-gray-300 cursor-not-allowed"
                            : state === "limit"
                              ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed opacity-50"
                              : "border-border bg-white text-gray-600 hover:border-gray-300 active:scale-95"
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 flex-shrink-0" />}
                      {chip}
                    </button>
                  );
                })}

                {/* Show more / less toggle */}
                {hiddenCount > 0 && (
                  <button
                    onClick={() => setExpandedGroups((prev) => {
                      const next = new Set(prev);
                      next.add(group.label);
                      return next;
                    })}
                    className="px-3 py-1.5 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-all duration-150"
                  >
                    +{hiddenCount} more
                  </button>
                )}
                {isGroupExpanded && unselectedInGroup.length > VISIBLE - selectedInGroup.length && (
                  <button
                    onClick={() => setExpandedGroups((prev) => {
                      const next = new Set(prev);
                      next.delete(group.label);
                      return next;
                    })}
                    className="px-3 py-1.5 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-all duration-150"
                  >
                    Show less
                  </button>
                )}

                {/* Custom chips for this group */}
                {(customChips[group.label] ?? []).map((chip) => {
                  const selected = selectedChips.includes(chip);
                  return (
                    <span
                      key={chip}
                      className={cn(
                        "flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-xl border-2 text-xs font-medium transition-all duration-150",
                        selected
                          ? "border-primary bg-primary-50 text-primary"
                          : "border-border bg-white text-gray-600"
                      )}
                    >
                      <button onClick={() => toggleChip(chip)} className="flex items-center gap-1">
                        {selected && <Check className="w-3 h-3 flex-shrink-0" />}
                        {chip}
                      </button>
                      <button
                        onClick={() => removeCustomChip(group.label, chip)}
                        className="ml-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}

                {/* Add chip inline input or button */}
                {addingGroup === group.label ? (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-xl border-2 border-primary bg-primary-50">
                    <input
                      ref={addInputRef}
                      type="text"
                      value={addingValue}
                      onChange={(e) => setAddingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitCustomChip(group.label);
                        if (e.key === "Escape") { setAddingGroup(null); setAddingValue(""); }
                      }}
                      onBlur={() => commitCustomChip(group.label)}
                      placeholder="Type and press Enter"
                      className="text-xs text-gray-700 bg-transparent outline-none w-32 placeholder:text-gray-400"
                    />
                    <button
                      onMouseDown={(e) => { e.preventDefault(); commitCustomChip(group.label); }}
                      className="text-primary hover:text-primary/70"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => { setAddingGroup(group.label); setAddingValue(""); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-all duration-150"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                )}
              </div>

              {/* Helper-POV suggestions */}
              {groupSuggestions.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                    💡 Consider for your helper
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {groupSuggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => commitSuggestionChip(group.label, s)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500 hover:border-gray-400 hover:bg-white hover:text-gray-700 transition-all"
                      >
                        <Plus className="w-3 h-3 flex-shrink-0" />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

      </div>
    </div>
  );
}

// --- Family Photo Card ---

function deriveFamilyPersona(entries: MemberEntry[]): { name: string; tagline: string; praise: string } {
  const hasElderly = entries.some((e) => e.role === "Elderly");
  const infants = entries.filter((e) => e.role === "Child" && (e.age ?? 99) <= 2);
  const kids = entries.filter((e) => e.role === "Child" && (e.age ?? 0) > 2);
  const adults = entries.filter((e) => e.role === "Husband" || e.role === "Wife");

  if (hasElderly && kids.length > 0)
    return {
      name: "The Multi-Gen Household",
      tagline: `${entries.length} people across three generations — one home, one plan`,
      praise: "Coordinating a household like this takes real love and dedication. The detail you've shared here will make every day smoother for everyone.",
    };
  if (hasElderly)
    return {
      name: "The Caring Household",
      tagline: "Every routine you've shared means one less thing your loved one has to worry about",
      praise: "Taking care of someone you love takes quiet strength. What you've set up here shows exactly that.",
    };
  if (infants.length > 0 && kids.length > 0)
    return {
      name: "The Growing Family",
      tagline: "From nap windows to school pickups — every moment is accounted for",
      praise: "Managing little ones at different life stages is no small feat. You've clearly thought about every person in this home.",
    };
  if (infants.length > 0)
    return {
      name: "The New Family",
      tagline: "Every feed, every nap, every quiet window — your helper will be ready",
      praise: "You're doing an incredible job. The details you've added here mean your baby's day will run exactly the way you've planned it.",
    };
  if (kids.length >= 2)
    return {
      name: "The Busy Family",
      tagline: "School runs, activities, meals — all mapped out so nothing slips through",
      praise: "Keeping up with this many schedules is a superpower. Your helper will hit the ground running.",
    };
  if (kids.length === 1)
    return {
      name: "The Family Home",
      tagline: "A schedule built entirely around your child's rhythm",
      praise: "The care you've put into these details speaks for itself. Your child is lucky to have a home run this thoughtfully.",
    };
  if (adults.length >= 2)
    return {
      name: "The Household Team",
      tagline: "Two busy lives, one well-run home",
      praise: "You've set this up beautifully. Your helper will know exactly how to support both of you.",
    };
  return {
    name: "The Household",
    tagline: "A home that runs exactly the way you want it",
    praise: "You've done the hard part. Every detail you shared here becomes a task your helper will take care of.",
  };
}

function FamilyPhotoCard({ entries, memberRoutines, onContinue }: { entries: MemberEntry[]; memberRoutines: Record<string, string>; onContinue: () => void }) {
  const { name, tagline, praise } = deriveFamilyPersona(entries);
  const totalRoutines = entries.reduce((sum, e) => {
    const lines = (memberRoutines[e.key] ?? "").split("\n").filter((l) => l.trim());
    return sum + lines.length;
  }, 0);

  // Split into two rows like a real group photo: adults back row, kids/elderly front
  const backRow = entries.filter((e) => e.role === "Husband" || e.role === "Wife" || e.role === "Other");
  const frontRow = entries.filter((e) => e.role === "Child" || e.role === "Elderly");
  const singleRow = frontRow.length === 0 || backRow.length === 0;
  const rows = singleRow ? [entries] : [backRow, frontRow];

  return (
    <div
      className="fixed inset-0 z-40 bg-background flex flex-col items-center justify-center px-6"
      style={{ animation: "fade-in-up 0.4s ease-out both" }}
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-[0.05] blur-[120px]"
          style={{ background: "radial-gradient(circle, #10b981, transparent 70%)", top: "10%", left: "20%" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        {/* Label */}
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-5">
          Your household
        </p>

        {/* Photo frame */}
        <div className="relative bg-white rounded-2xl shadow-lg border border-gray-100 px-6 pt-6 pb-4 mb-6 w-full">
          {/* Polaroid texture line */}
          <div className="absolute top-3 left-4 right-4 h-px bg-gray-100" />

          <div className="flex flex-col items-center gap-3 pt-1">
            {rows.map((row, ri) => (
              <div key={ri} className="flex items-end justify-center gap-2">
                {row.map((entry, ei) => (
                  <div key={entry.key} className="flex flex-col items-center gap-1">
                    <div
                      className="flex items-center justify-center rounded-full bg-gray-50 border border-gray-100"
                      style={{
                        width: ri === 0 || singleRow ? 52 : 44,
                        height: ri === 0 || singleRow ? 52 : 44,
                        fontSize: ri === 0 || singleRow ? 26 : 22,
                        animationDelay: `${(ri * row.length + ei) * 80}ms`,
                        animation: "fade-in-up 0.35s ease-out both",
                      }}
                    >
                      {ROLE_EMOJIS[entry.role] ?? "🧑"}
                    </div>
                    <span className="text-[9px] text-gray-400 font-medium truncate max-w-[44px]">
                      {entry.name || entry.role}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Photo caption strip */}
          <p className="text-xs text-gray-300 text-center mt-3 font-medium tracking-wide uppercase">
            {entries.length} member{entries.length !== 1 ? "s" : ""} · all set
          </p>
        </div>

        {/* Persona name */}
        <h2 className="text-2xl sm:text-3xl font-display font-semibold text-gray-900 mb-2 leading-snug">
          {name}
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-4">
          {tagline}
        </p>

        {/* Praise */}
        <p className="text-gray-400 text-xs leading-relaxed mb-6 max-w-xs">
          {praise}
        </p>

        {/* Confirmation summary */}
        <div className="w-full bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 mb-6 flex items-center justify-around text-center">
          <div>
            <p className="text-lg font-display font-bold text-gray-900">{entries.length}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wide">people</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <p className="text-lg font-display font-bold text-gray-900">{totalRoutines}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wide">routines</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <p className="text-lg font-display font-bold text-emerald-500">✓</p>
            <p className="text-xs text-gray-400 uppercase tracking-wide">all set</p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onContinue}
          className="w-full max-w-xs flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white rounded-xl font-display font-semibold hover:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200"
        >
          Perfect — let&apos;s keep going
        </button>
      </div>
    </div>
  );
}

// --- Main Component ---

export function Step4DailyLife({
  members,
  memberRoutines,
  memberSchedules,
  memberQuietHours,
  setupFor,
  showReward,
  onUpdate,
  onQuietHoursUpdate,
  onComplete,
}: Step4Props) {
  const isOwn = setupFor !== "family";
  const [activeIndex, setActiveIndex] = useState(0);

  const entries: MemberEntry[] = members.map((m, i) => ({
    key: `member-${i}`,
    name: m.name,
    role: m.role,
    age: m.age,
  }));

  const handleRoutineChange = (key: string, value: string) => {
    onUpdate({ ...memberRoutines, [key]: value }, memberSchedules);
  };

  const handleQuietHoursChange = (key: string, value: string) => {
    onQuietHoursUpdate({ ...memberQuietHours, [key]: value });
  };

  const filledCount = entries.filter((e) => (memberRoutines[e.key] ?? "").trim().length > 0).length;
  const allDone = filledCount === entries.length;

  const prevEntry = activeIndex > 0 ? entries[activeIndex - 1] : null;
  const nextEntry = activeIndex < entries.length - 1 ? entries[activeIndex + 1] : null;

  return (
    <div className="space-y-6">
      {showReward && (
        <FamilyPhotoCard entries={entries} memberRoutines={memberRoutines} onContinue={onComplete} />
      )}

      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-gray-700" />
        </div>
        <h2 className="text-2xl font-display font-semibold tracking-tight text-gray-900 mb-2">
          Share each person&apos;s daily routines &amp; timings
        </h2>
        <p className="text-text-secondary text-sm max-w-md">
          {isOwn
            ? "The times you add here shape the entire schedule — prep before activities, meals ready when needed, and quiet during naps."
            : "The more specific the times, the smarter the schedule — prep before activities, meal timing, and quiet windows are all built from this."}
        </p>
      </div>

      {/* Avatar strip */}
      {entries.length > 1 && (
        <div className="flex gap-3 overflow-x-auto py-2 -mx-1 px-1">
          {entries.map((entry, i) => {
            const isFilled = (memberRoutines[entry.key] ?? "").trim().length > 0;
            const isActive = i === activeIndex;
            return (
              <button
                key={entry.key}
                onClick={() => setActiveIndex(i)}
                className="flex flex-col items-center gap-1 flex-shrink-0 focus:outline-none"
              >
                <div className={cn(
                  "relative w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-gray-50 transition-all duration-200",
                  isActive
                    ? "ring-2 ring-primary ring-offset-2"
                    : isFilled
                    ? "ring-2 ring-emerald-400 ring-offset-1"
                    : "ring-1 ring-gray-200"
                )}>
                  {ROLE_EMOJIS[entry.role] ?? "🧑"}
                  {isFilled && !isActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium truncate max-w-[48px]",
                  isActive ? "text-primary" : "text-gray-500"
                )}>
                  {entry.name || entry.role}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* All member cards mounted together; only active one is visible — preserves chip state across navigation */}
      {entries.map((entry, i) => (
        <div key={entry.key} className={i === activeIndex ? "" : "hidden"}>
          <MemberCard
            entry={entry}
            quietHours={memberQuietHours[entry.key] ?? ""}
            initialRoutine={memberRoutines[entry.key] ?? ""}
            onRoutineChange={(v) => handleRoutineChange(entry.key, v)}
            onQuietHoursChange={(v) => handleQuietHoursChange(entry.key, v)}
          />
        </div>
      ))}

      {/* Prev / Next navigation — only for multi-member */}
      {entries.length > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            disabled={!prevEntry}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150",
              prevEntry
                ? "border-border text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                : "border-transparent text-transparent pointer-events-none"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            {prevEntry ? (prevEntry.name || prevEntry.role) : ""}
          </button>

          {nextEntry ? (
            <button
              onClick={() => setActiveIndex((i) => Math.min(entries.length - 1, i + 1))}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-150"
            >
              {nextEntry.name || nextEntry.role}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-gray-500">
              {allDone ? "All covered!" : `${filledCount} of ${entries.length} covered`}
            </div>
          )}
        </div>
      )}


    </div>
  );
}
