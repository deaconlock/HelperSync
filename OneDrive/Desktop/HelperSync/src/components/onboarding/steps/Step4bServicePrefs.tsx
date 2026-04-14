"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Plus, X, Settings2 } from "lucide-react";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { HouseholdMember } from "@/types/household";
import { cn } from "@/lib/utils";
import type { Priority } from "@/app/onboarding/employer/page";

// --- Constants ---

const TIME_SENSITIVE_CHIPS = new Set([
  "Tuition Mon & Wed",
  "Tuition on Saturdays",
  "Swimming on Fridays",
  "Music lessons on Thursdays",
  "Football on weekends",
  "Dance class on Wednesdays",
]);

const MAX_PER_GROUP = 3;

function formatTime12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

// --- Section definitions ---

interface PrefGroup {
  label: string;
  chips: string[];
}

interface PrefSection {
  key: string;
  title: string;
  tooltip?: string;
  groups: PrefGroup[];
}

const SECTION_TOOLTIPS: Record<string, string> = {
  infant: "These preferences are added as notes to childcare tasks in the schedule — your helper sees them alongside each task.",
  childcare: "Applies to school-age children. Selections are attached to recurring childcare tasks.",
  elderly: "Elderly care preferences appear as care notes on daily check-in and medication tasks.",
  meals: "Meal preferences shape how cooking tasks are described — e.g., cuisine style, dietary restrictions.",
  cleaning: "Cleaning preferences let your helper know your standards and any areas that need extra care.",
  laundry: "Laundry preferences are added as notes to washing and ironing tasks each week.",
  errands: "Errand preferences help your helper understand timing and approach for grocery and shopping trips.",
};

function getSections(
  members: HouseholdMember[],
  householdFocus: Priority[],
): PrefSection[] {
  const sections: PrefSection[] = [];

  const hasInfant = members.some((m) => m.role === "Child" && (m.age ?? 99) <= 2);
  const hasChild = members.some((m) => m.role === "Child" && (m.age ?? 0) > 2);
  const hasElderly = members.some((m) => m.role === "Elderly");
  const hasAdult = members.some((m) => m.role === "Husband" || m.role === "Wife");

  if (hasInfant) {
    sections.push({
      key: "infant",
      title: "👶 Infant Care",
      groups: [
        {
          label: "Feeding",
          chips: [
            "Formula every 3 hours",
            "Formula every 4 hours",
            "Breastfeeding — prepare bottles",
            "Solids 3× daily",
            "Milk top-up after meals",
          ],
        },
        {
          label: "Daily Care",
          chips: [
            "Morning sponge bath",
            "Tummy time 3× daily",
            "Outdoor walk in pram daily",
            "Sensory play after nap",
          ],
        },
        {
          label: "Routine",
          chips: [
            "Diaper changed every 2–3 hrs",
            "Bedtime routine starts 30min early",
          ],
        },
      ],
    });
  }

  if (hasChild) {
    sections.push({
      key: "childcare",
      title: "🧒 Childcare",
      groups: [
        {
          label: "School Prep",
          chips: [
            "School bag packed night before",
            "School lunch box packed daily",
            "School snack packed daily",
          ],
        },
        {
          label: "Activities",
          chips: [
            "Tuition Mon & Wed",
            "Tuition on Saturdays",
            "Swimming on Fridays",
            "Music lessons on Thursdays",
            "Football on weekends",
            "Dance class on Wednesdays",
          ],
        },
        {
          label: "After School",
          chips: [
            "Homework help after school",
            "Outdoor play after school",
            "Dinner ready before homework",
            "Bath before dinner",
            "Bedtime routine starts 30min early",
          ],
        },
      ],
    });
  }

  if (hasElderly) {
    sections.push({
      key: "elderly",
      title: "👴 Elderly Care",
      groups: [
        {
          label: "Health",
          chips: [
            "Blood pressure check daily",
            "Blood sugar check before meals",
            "Small meals, 4–5 times a day",
          ],
        },
        {
          label: "Companionship",
          chips: [
            "Outdoor walk with helper daily",
            "Sit with during meals",
          ],
        },
        {
          label: "Household Rules",
          chips: [
            "Religious prayers — do not disturb",
          ],
        },
      ],
    });
  }

  if (householdFocus.includes("meals")) {
    sections.push({
      key: "meals",
      title: "🍳 Meals & Cooking",
      groups: [
        {
          label: "Cuisine",
          chips: [
            "Chinese meals",
            "Malay meals",
            "Indian meals",
            "Western meals",
            "Mix it up",
          ],
        },
        {
          label: "Dietary",
          chips: [
            "Halal",
            "No pork",
            "Vegetarian",
            "No seafood",
            "Nut-free",
          ],
        },
        {
          label: "Style",
          chips: [
            "Cook fresh daily",
            "Meal prep in advance",
            "Simple home food",
            "Follow my recipes",
          ],
        },
      ],
    });
  }

  if (householdFocus.includes("cleanliness")) {
    sections.push({
      key: "cleaning",
      title: "🧹 Cleaning Standards",
      groups: [
        {
          label: "Frequency",
          chips: [
            "Wipe surfaces daily",
            "Mop daily",
            "Mop every other day",
          ],
        },
        {
          label: "Products",
          chips: [
            "Use my preferred products",
            "Eco-friendly products only",
            "No bleach",
          ],
        },
      ],
    });
  }

  if (householdFocus.includes("laundry")) {
    sections.push({
      key: "laundry",
      title: "👕 Laundry",
      groups: [
        {
          label: "Frequency",
          chips: [
            "Laundry daily",
            "Every 2 days",
            "Twice a week",
            "Weekly",
          ],
        },
        {
          label: "Drying",
          chips: [
            "Air dry preferred",
            "Tumble dry is fine",
            "Hang indoors only",
          ],
        },
        {
          label: "Care",
          chips: [
            "Separate colours always",
            "Delicates hand-washed",
            "No ironing needed",
            "Iron formal wear only",
            "Iron everything",
          ],
        },
      ],
    });
  }

  if (householdFocus.includes("grocery")) {
    sections.push({
      key: "grocery",
      title: "🛒 Grocery & Errands",
      groups: [
        {
          label: "Frequency",
          chips: [
            "Fresh groceries daily",
            "Shop twice a week",
            "Weekly bulk shop",
          ],
        },
        {
          label: "Where",
          chips: [
            "Wet market preferred",
            "Supermarket (NTUC / Cold Storage)",
            "Online delivery top-up",
          ],
        },
        {
          label: "How",
          chips: [
            "Helper shops alone",
            "I accompany for big shops",
            "Use a shopping list I provide",
          ],
        },
      ],
    });
  }

  if (hasAdult) {
    sections.push({
      key: "personal",
      title: "✨ Personal Standards",
      groups: [
        {
          label: "Clothing & Appearance",
          chips: [
            "Iron & hang clothes the night before",
            "Shirt & trousers ironed daily",
            "Shoes polished weekly",
            "Suit sent for dry-clean fortnightly",
          ],
        },
        {
          label: "Room & Comfort",
          chips: [
            "Bed made before 9am",
            "Fresh towels every 2 days",
            "Bedroom tidied daily",
            "Coffee ready before I wake",
          ],
        },
        {
          label: "Household Rules",
          chips: [
            "Laundry done twice a week",
            "No strong cooking smells before 9am",
          ],
        },
      ],
    });
  }

  return sections;
}

// --- SectionCard ---

function SectionCard({
  section,
  prefs,
  chipTimes,
  customChips,
  onToggle,
  onTimeChange,
  onAddCustom,
  onRemoveCustom,
}: {
  section: PrefSection;
  prefs: string[];
  chipTimes: Record<string, string>;
  customChips: Record<string, string[]>;
  onToggle: (chip: string) => void;
  onTimeChange: (chip: string, time: string) => void;
  onAddCustom: (groupLabel: string, chip: string) => void;
  onRemoveCustom: (groupLabel: string, chip: string) => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [addingGroup, setAddingGroup] = useState<string | null>(null);
  const [addingValue, setAddingValue] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingGroup) addInputRef.current?.focus();
  }, [addingGroup]);

  const commitCustom = (groupLabel: string) => {
    const val = addingValue.trim();
    if (val) onAddCustom(groupLabel, val);
    setAddingGroup(null);
    setAddingValue("");
  };

  const totalSelected = prefs.length;

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden transition-all duration-300",
      totalSelected > 0 ? "border-emerald-200 bg-emerald-50/20" : "border-border bg-white"
    )}>
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
        <span className="text-sm font-semibold text-gray-900 flex-1 flex items-center gap-1.5">
          {section.title}
          {SECTION_TOOLTIPS[section.key] && (
            <InfoTooltip content={SECTION_TOOLTIPS[section.key]!} />
          )}
        </span>
        {totalSelected > 0 && (
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 animate-fade-in-up">
            {totalSelected} selected
          </span>
        )}
      </div>

      <div className="px-4 pb-4 pt-4 space-y-4">
        {section.groups.map((group, groupIndex) => {
          const isGroupExpanded = expandedGroups.has(group.label);
          const VISIBLE = 4;
          const allGroupChips = [...group.chips, ...(customChips[group.label] ?? [])];
          const selectedInGroup = allGroupChips.filter((c) => prefs.includes(c));
          const unselectedInGroup = group.chips.filter((c) => !prefs.includes(c));
          const visibleUnselected = isGroupExpanded
            ? unselectedInGroup
            : unselectedInGroup.slice(0, Math.max(0, VISIBLE - selectedInGroup.length));
          const visibleChips = [...selectedInGroup, ...visibleUnselected];
          const hiddenCount = unselectedInGroup.length - visibleUnselected.length;
          const groupSelectedCount = allGroupChips.filter((c) => prefs.includes(c)).length;
          const atLimit = groupSelectedCount >= MAX_PER_GROUP;

          return (
            <div key={group.label} className="space-y-2">
              {groupIndex > 0 && <div className="border-t border-gray-100 -mx-4 pt-1" />}
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-gray-500 tracking-wide">{group.label}</p>
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
                  const isSelected = prefs.includes(chip);
                  const isDisabled = !isSelected && atLimit;
                  const isTimeSensitive = TIME_SENSITIVE_CHIPS.has(chip);

                  if (isSelected && isTimeSensitive) {
                    return (
                      <span
                        key={chip}
                        className="flex items-center gap-1 pl-2.5 pr-2 py-1.5 rounded-xl border-2 border-primary bg-primary-50 text-primary text-xs font-medium"
                      >
                        <button onClick={() => onToggle(chip)} className="flex items-center gap-1">
                          <Check className="w-3 h-3 flex-shrink-0" />
                          {chip}
                        </button>
                        <span className="mx-1 text-primary/40">·</span>
                        <input
                          type="time"
                          value={chipTimes[chip] ?? ""}
                          onChange={(e) => onTimeChange(chip, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs bg-transparent outline-none text-primary w-[4.5rem] cursor-pointer"
                        />
                      </span>
                    );
                  }

                  return (
                    <button
                      key={chip}
                      onClick={() => !isDisabled && onToggle(chip)}
                      disabled={isDisabled}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all duration-150",
                        isSelected
                          ? "border-primary bg-primary-50 text-primary active:scale-95"
                          : isDisabled
                            ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed opacity-50"
                            : "border-border bg-white text-gray-600 hover:border-gray-300 active:scale-95"
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 flex-shrink-0" />}
                      {chip}
                    </button>
                  );
                })}

                {/* Custom chips */}
                {(customChips[group.label] ?? []).map((chip) => {
                  const isSelected = prefs.includes(chip);
                  return (
                    <span
                      key={chip}
                      className={cn(
                        "flex items-center gap-1 pl-2.5 pr-1.5 py-1.5 rounded-xl border-2 text-xs font-medium",
                        isSelected
                          ? "border-primary bg-primary-50 text-primary"
                          : "border-border bg-white text-gray-600"
                      )}
                    >
                      <button onClick={() => onToggle(chip)} className="flex items-center gap-1">
                        {isSelected && <Check className="w-3 h-3 flex-shrink-0" />}
                        {chip}
                      </button>
                      <button
                        onClick={() => onRemoveCustom(group.label, chip)}
                        className="ml-0.5 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}

                {/* Show more / less */}
                {hiddenCount > 0 && (
                  <button
                    onClick={() => setExpandedGroups((prev) => {
                      const next = new Set(prev);
                      next.add(group.label);
                      return next;
                    })}
                    className="px-2.5 py-1.5 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-all"
                  >
                    +{hiddenCount} more
                  </button>
                )}
                {isGroupExpanded && (
                  <button
                    onClick={() => setExpandedGroups((prev) => {
                      const next = new Set(prev);
                      next.delete(group.label);
                      return next;
                    })}
                    className="px-2.5 py-1.5 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400 hover:border-gray-300 transition-all"
                  >
                    Show less
                  </button>
                )}

                {/* Add custom chip */}
                {addingGroup === group.label ? (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-xl border-2 border-primary bg-primary-50">
                    <input
                      ref={addInputRef}
                      type="text"
                      value={addingValue}
                      onChange={(e) => setAddingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitCustom(group.label);
                        if (e.key === "Escape") { setAddingGroup(null); setAddingValue(""); }
                      }}
                      onBlur={() => commitCustom(group.label)}
                      placeholder="Type and press Enter"
                      className="text-xs text-gray-700 bg-transparent outline-none w-32 placeholder:text-gray-400"
                    />
                    <button
                      onMouseDown={(e) => { e.preventDefault(); commitCustom(group.label); }}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Component ---

interface Step4bProps {
  members: HouseholdMember[];
  householdFocus: Priority[];
  servicePrefs: Record<string, string[]>;
  onUpdate: (prefs: Record<string, string[]>) => void;
  onComplete: () => void;
}

export function Step4bServicePrefs({
  members,
  householdFocus,
  servicePrefs,
  onUpdate,
  onComplete,
}: Step4bProps) {
  const sections = getSections(members, householdFocus);

  // Flat selected chips across all sections, keyed by section key
  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    // Restore from servicePrefs on mount
    const restored: Record<string, string[]> = {};
    for (const s of sections) {
      restored[s.key] = servicePrefs[s.key] ?? [];
    }
    return restored;
  });

  const [chipTimes, setChipTimes] = useState<Record<string, string>>({});

  const [customChips, setCustomChips] = useState<Record<string, Record<string, string[]>>>(() => {
    // customChips[sectionKey][groupLabel] = string[]
    return {};
  });

  const totalSelected = Object.values(selected).flat().length;

  const handleToggle = (sectionKey: string, chip: string) => {
    setSelected((prev) => {
      const current = prev[sectionKey] ?? [];
      const next = current.includes(chip)
        ? current.filter((c) => c !== chip)
        : [...current, chip];
      const updated = { ...prev, [sectionKey]: next };
      onUpdate(updated);
      return updated;
    });
  };

  const handleTimeChange = (chip: string, time: string) => {
    setChipTimes((prev) => ({ ...prev, [chip]: time }));
  };

  const handleAddCustom = (sectionKey: string, groupLabel: string, chip: string) => {
    setCustomChips((prev) => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] ?? {}),
        [groupLabel]: [...((prev[sectionKey] ?? {})[groupLabel] ?? []), chip],
      },
    }));
    handleToggle(sectionKey, chip);
  };

  const handleRemoveCustom = (sectionKey: string, groupLabel: string, chip: string) => {
    setCustomChips((prev) => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] ?? {}),
        [groupLabel]: ((prev[sectionKey] ?? {})[groupLabel] ?? []).filter((c) => c !== chip),
      },
    }));
    setSelected((prev) => {
      const updated = { ...prev, [sectionKey]: (prev[sectionKey] ?? []).filter((c) => c !== chip) };
      onUpdate(updated);
      return updated;
    });
  };

  if (sections.length === 0) {
    // Nothing to show — skip straight through
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center py-12">
          <p className="text-text-secondary text-sm">No additional preferences needed.</p>
          <button onClick={onComplete} className="mt-4 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium">
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Settings2 className="w-8 h-8 text-gray-700" />
        </div>
        <h2 className="text-2xl font-display font-semibold tracking-tight text-gray-900 mb-2">
          How should things be done?
        </h2>
        <p className="text-text-secondary text-sm max-w-md">
          Tell your helper your preferences — from childcare style to laundry habits. Select what applies, add anything specific.
        </p>
        {totalSelected > 0 && (
          <span className="mt-3 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
            {totalSelected} preference{totalSelected !== 1 ? "s" : ""} noted
          </span>
        )}
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <SectionCard
          key={section.key}
          section={section}
          prefs={selected[section.key] ?? []}
          chipTimes={chipTimes}
          customChips={(customChips[section.key] ?? {})}
          onToggle={(chip) => handleToggle(section.key, chip)}
          onTimeChange={handleTimeChange}
          onAddCustom={(groupLabel, chip) => handleAddCustom(section.key, groupLabel, chip)}
          onRemoveCustom={(groupLabel, chip) => handleRemoveCustom(section.key, groupLabel, chip)}
        />
      ))}

      {/* Footer */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          onClick={onComplete}
          className="w-full max-w-sm px-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          {totalSelected > 0 ? "Save & continue" : "Continue"}
        </button>
        <button
          onClick={onComplete}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
