"use client";

import { useState } from "react";
import { Plus, Trash2, Users2, ChevronDown, ChevronUp } from "lucide-react";
import { HouseholdMember, MemberRole } from "@/types/household";
import { cn } from "@/lib/utils";
import type { SetupFor } from "@/app/onboarding/employer/page";

// --- Role config ---

const ROLE_OPTIONS: {
  value: MemberRole;
  label: string;
  emoji: string;
  color: string;
  selectedColor: string;
}[] = [
  { value: "Me", label: "Me", emoji: "🏠", color: "bg-gray-100 text-gray-600 border-gray-200", selectedColor: "bg-orange-100 text-orange-700 border-orange-300" },
  { value: "Spouse",   label: "Spouse",   emoji: "💑", color: "bg-gray-100 text-gray-600 border-gray-200", selectedColor: "bg-teal-100 text-teal-700 border-teal-300" },
  { value: "Child",    label: "Child",    emoji: "👶", color: "bg-gray-100 text-gray-600 border-gray-200", selectedColor: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "Elderly",  label: "Elderly",  emoji: "👴", color: "bg-gray-100 text-gray-600 border-gray-200", selectedColor: "bg-purple-100 text-purple-700 border-purple-300" },
  { value: "Pets",     label: "Pets",     emoji: "🐾", color: "bg-gray-100 text-gray-600 border-gray-200", selectedColor: "bg-amber-100 text-amber-700 border-amber-300" },
  { value: "Relative", label: "Relative", emoji: "👤", color: "bg-gray-100 text-gray-600 border-gray-200", selectedColor: "bg-rose-100 text-rose-700 border-rose-300" },
];

const ROLE_BADGE: Record<MemberRole, string> = {
  Me:       "bg-orange-100 text-orange-700",
  Spouse:   "bg-teal-100 text-teal-700",
  Child:    "bg-blue-100 text-blue-700",
  Elderly:  "bg-purple-100 text-purple-700",
  Pets:     "bg-amber-100 text-amber-700",
  Relative: "bg-rose-100 text-rose-700",
};

// --- Age config ---

const AGE_RANGES: { label: string; emoji: string; value: number; roles: MemberRole[] }[] = [
  { label: "Baby",   emoji: "👶", value: 0,  roles: ["Child"] },
  { label: "Child",  emoji: "🧒", value: 8,  roles: ["Child"] },
  { label: "Teen",   emoji: "🧑", value: 15, roles: ["Child"] },
  { label: "Senior", emoji: "👴", value: 68, roles: ["Elderly"] },
];

function ageLabel(age: number | undefined): string | null {
  if (age === undefined) return null;
  const r = AGE_RANGES.find((a) => a.value === age);
  return r?.label ?? null;
}

function ageEmoji(age: number | undefined): string | null {
  if (age === undefined) return null;
  const r = AGE_RANGES.find((a) => a.value === age);
  return r?.emoji ?? null;
}

// --- Helpers ---

function showAgeFor(role: MemberRole): boolean {
  return role === "Child" || role === "Elderly";
}

function ageRangesFor(role: MemberRole) {
  if (role === "Child") return AGE_RANGES.filter((a) => a.roles.includes("Child"));
  return AGE_RANGES.filter((a) => a.roles.includes("Elderly"));
}

// --- Props ---

interface Step2Props {
  members: HouseholdMember[];
  setupFor: SetupFor | null;
  onUpdate: (members: HouseholdMember[]) => void;
}

// --- Component ---

export function Step2Members({ members, setupFor, onUpdate }: Step2Props) {
  const isOwn = setupFor !== "family";
  const [localMembers, setLocalMembers] = useState<HouseholdMember[]>(members);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    members.length === 0 ? null : 0
  );

  const update = (updated: HouseholdMember[]) => {
    setLocalMembers(updated);
    onUpdate(updated);
  };

  const addMember = () => {
    const isFirst = localMembers.length === 0;
    const newMember: HouseholdMember = {
      name: "",
      role: isFirst ? "Me" : "Spouse",
      age: undefined,
      timePresets: [],
    };
    const updated = [...localMembers, newMember];
    update(updated);
    setExpandedIndex(updated.length - 1);
  };

  const removeMember = (index: number) => {
    const updated = localMembers.filter((_, i) => i !== index);
    update(updated);
    if (expandedIndex === index) setExpandedIndex(null);
  };

  const updateMember = (index: number, patch: Partial<HouseholdMember>) => {
    const updated = localMembers.map((m, i) => {
      if (i !== index) return m;
      const copy = { ...m, ...patch };
      // Clear elderly-specific fields when switching away from Elderly
      if (patch.role && patch.role !== "Elderly") {
        delete copy.mobilityLevel;
        delete copy.medicalConditions;
        delete copy.medications;
        delete copy.dietaryRestrictions;
        delete copy.napSchedule;
        delete copy.emergencyContact;
      }
      // Clear age when switching to Employer or Spouse (implied adult)
      if (patch.role && (patch.role === "Me" || patch.role === "Spouse")) {
        delete copy.age;
      }
      return copy;
    });
    update(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Users2 className="w-8 h-8 text-gray-700" />
        </div>
        <h2 className="text-2xl font-display font-semibold tracking-tight text-gray-900 mb-1">
          Who lives here?
        </h2>
        <p className="text-text-secondary text-sm max-w-md">
          {isOwn
            ? "Building your family portrait helps us personalise the schedule."
            : "Add the people the helper will be caring for."}
        </p>
      </div>

      {/* Member cards */}
      <div className="space-y-3">
        {localMembers.map((member, i) => {
          const isExpanded = expandedIndex === i;
          const role = ROLE_OPTIONS.find((r) => r.value === member.role);
          const al = ageLabel(member.age);
          const ae = ageEmoji(member.age);

          return (
            <div
              key={i}
              className="bg-white rounded-2xl border border-border overflow-hidden"
            >
              {/* Summary row — tap to expand/collapse */}
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              >
                <span className="text-xl">{role?.emoji ?? "🧑"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {member.name || <span className="text-gray-400 font-normal">Add name…</span>}
                    {al && ae && (
                      <span className="text-gray-400 font-normal ml-1">({ae} {al})</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", ROLE_BADGE[member.role])}>
                      {member.role}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {localMembers.length > 1 && (
                    <span
                      onClick={(e) => { e.stopPropagation(); removeMember(i); }}
                      className="p-1.5 text-gray-300 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {/* Expanded edit panel */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-4 space-y-5">

                  {/* Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Name</label>
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => updateMember(i, { name: e.target.value })}
                      placeholder="e.g. Sarah"
                      className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Role chips */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">Role</label>
                    <div className="flex flex-wrap gap-2">
                      {ROLE_OPTIONS.map((r) => {
                        const isSelected = member.role === r.value;
                        return (
                          <button
                            key={r.value}
                            onClick={() => updateMember(i, { role: r.value })}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-150",
                              isSelected ? r.selectedColor : r.color
                            )}
                          >
                            <span>{r.emoji}</span>
                            <span>{r.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Age pills — only for Child, Elderly, Other */}
                  {showAgeFor(member.role) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">Age range</label>
                      <div className="flex flex-wrap gap-2">
                        {ageRangesFor(member.role).map((a) => {
                          const isSelected = member.age === a.value;
                          return (
                            <button
                              key={a.value}
                              onClick={() => updateMember(i, { age: isSelected ? undefined : a.value })}
                              className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all duration-150",
                                isSelected
                                  ? "bg-gray-900 text-white border-gray-900"
                                  : "bg-gray-100 text-gray-500 border-gray-200 hover:border-gray-400"
                              )}
                            >
                              <span className="text-sm">{a.emoji}</span>
                              <span>{a.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>

      {localMembers.length === 0 && (
        <p className="text-center text-sm text-gray-400">
          {isOwn ? "Add at least one household member to continue." : "Add at least one person to continue."}
        </p>
      )}

      {/* Add member button */}
      <button
        onClick={addMember}
        className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 text-text-secondary hover:border-gray-400 hover:text-gray-900 transition-all duration-200 w-full justify-center"
      >
        <Plus className="w-4 h-4" /> Add another member
      </button>

    </div>
  );
}
