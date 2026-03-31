"use client";

import { useState } from "react";
import { Plus, Trash2, Users2 } from "lucide-react";
import { HouseholdMember, MemberRole } from "@/types/household";
import type { SetupFor } from "@/app/onboarding/employer/page";

const AGE_RANGES: { label: string; value: number }[] = [
  { label: "Under 1", value: 0 },
  { label: "1–3", value: 2 },
  { label: "4–12", value: 8 },
  { label: "13–17", value: 15 },
  { label: "18–60", value: 35 },
  { label: "61–75", value: 68 },
  { label: "76+", value: 80 },
];


const ROLE_OPTIONS: { value: MemberRole; label: string; emoji: string }[] = [
  { value: "Husband", label: "Husband", emoji: "👨" },
  { value: "Wife", label: "Wife", emoji: "👩" },
  { value: "Child", label: "Child", emoji: "👶" },
  { value: "Elderly", label: "Elderly", emoji: "👴" },
  { value: "Other", label: "Other", emoji: "🧑" },
];

interface Step2Props {
  members: HouseholdMember[];
  setupFor: SetupFor | null;
  onUpdate: (members: HouseholdMember[]) => void;
}

export function Step2Members({ members, setupFor, onUpdate }: Step2Props) {
  const isOwn = setupFor !== "family";
  const [localMembers, setLocalMembers] = useState<HouseholdMember[]>(members);

  const update = (updated: HouseholdMember[]) => {
    setLocalMembers(updated);
    onUpdate(updated);
  };

  const addMember = () => {
    update([...localMembers, { name: "", role: "Other", age: undefined }]);
  };

  const removeMember = (index: number) => {
    update(localMembers.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: keyof HouseholdMember, value: string | number | undefined) => {
    const updated = localMembers.map((m, i) => {
      if (i !== index) return m;
      const copy = { ...m, [field]: value };
      // Clear elderly fields when switching away from Elderly role
      if (field === "role" && value !== "Elderly") {
        delete copy.mobilityLevel;
        delete copy.medicalConditions;
        delete copy.medications;
        delete copy.dietaryRestrictions;
        delete copy.napSchedule;
        delete copy.emergencyContact;
      }
      return copy;
    });
    update(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Users2 className="w-8 h-8 text-gray-700" />
        </div>
        <h2 className="text-2xl font-display font-semibold tracking-tight text-gray-900 mb-1">
          {isOwn ? "Who does your helper care for?" : "Who does the helper care for?"}
        </h2>
        <p className="text-text-secondary text-sm max-w-md">
          {isOwn
            ? "Add the people in your home — your helper will plan their day around everyone's routine."
            : "Add the people they'll be caring for — the helper will plan their day around everyone's needs."}
        </p>
      </div>

      <div className="space-y-3">
        {localMembers.map((member, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-border p-4 space-y-0"
          >
            <div className="flex gap-3 items-start">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={member.name}
                  onChange={(e) => updateMember(i, "name", e.target.value)}
                  placeholder="Name"
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Role
                </label>
                <select
                  value={member.role}
                  onChange={(e) => updateMember(i, "role", e.target.value as MemberRole)}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.emoji} {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Age (optional)
                </label>
                <select
                  value={member.age ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateMember(i, "age", val === "" ? undefined : Number(val));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-white"
                >
                  <option value="">Select age range</option>
                  {AGE_RANGES.map((r) => (
                    <option key={r.label} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={() => removeMember(i)}
              disabled={localMembers.length === 1}
              className="mt-6 p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            </div>

          </div>
        ))}
      </div>

      {localMembers.length === 0 && (
        <p className="text-center text-sm text-gray-400">
          {isOwn ? "Add at least one household member to continue." : "Add at least one person to continue."}
        </p>
      )}

      <button
        onClick={addMember}
        className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-200 text-text-secondary hover:border-gray-400 hover:text-gray-900 transition-all duration-200 w-full justify-center"
      >
        <Plus className="w-4 h-4" /> Add Member
      </button>

      {localMembers.some((m) => m.role === "Child" || m.role === "Elderly") && (
        <div className="bg-gray-50 rounded-2xl p-4 text-sm text-text-secondary border border-border flex items-start gap-2">
          <span>💛</span>
          <p>You can add care details — medications, dietary needs, and routines — from the dashboard after setup.</p>
        </div>
      )}
    </div>
  );
}
