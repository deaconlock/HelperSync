"use client";

import { useState } from "react";
import { Plus, Trash2, Users2, Heart } from "lucide-react";
import { HouseholdMember, MemberRole } from "@/types/household";

const MOBILITY_OPTIONS: { value: NonNullable<HouseholdMember["mobilityLevel"]>; label: string }[] = [
  { value: "independent", label: "Independent" },
  { value: "needs_assistance", label: "Needs Assistance" },
  { value: "wheelchair", label: "Wheelchair" },
  { value: "bedridden", label: "Bedridden" },
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
  onUpdate: (members: HouseholdMember[]) => void;
}

export function Step2Members({ members, onUpdate }: Step2Props) {
  const [localMembers, setLocalMembers] = useState<HouseholdMember[]>(
    members.length > 0
      ? members
      : [{ name: "Baby", role: "Child", age: 1 }]
  );

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
          Who lives in your home?
        </h2>
        <p className="text-text-secondary text-sm max-w-md">
          Add all household members. This helps us tailor the helper&apos;s schedule.
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
                <input
                  type="text"
                  inputMode="numeric"
                  value={member.age ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    if (raw === "") {
                      updateMember(i, "age", undefined);
                    } else {
                      const num = Math.min(120, Math.max(0, parseInt(raw, 10)));
                      updateMember(i, "age", num);
                    }
                  }}
                  placeholder="Age"
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
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

            {/* Elderly-specific detail fields */}
            {member.role === "Elderly" && (
              <div className="col-span-full mt-3 pt-3 border-t border-gray-100 space-y-3 animate-fade-in-up">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <Heart className="w-4 h-4 text-rose-400" />
                  Care details for {member.name || "this member"} (all optional)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Mobility Level</label>
                    <select
                      value={member.mobilityLevel ?? ""}
                      onChange={(e) => updateMember(i, "mobilityLevel", e.target.value || undefined)}
                      className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                    >
                      <option value="">Select...</option>
                      {MOBILITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Medical Conditions</label>
                    <input
                      type="text"
                      value={member.medicalConditions ?? ""}
                      onChange={(e) => updateMember(i, "medicalConditions", e.target.value)}
                      placeholder="e.g. diabetes, arthritis"
                      className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Medications & Schedule</label>
                    <input
                      type="text"
                      value={member.medications ?? ""}
                      onChange={(e) => updateMember(i, "medications", e.target.value)}
                      placeholder="e.g. insulin at 8am & 8pm"
                      className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Dietary Restrictions</label>
                    <input
                      type="text"
                      value={member.dietaryRestrictions ?? ""}
                      onChange={(e) => updateMember(i, "dietaryRestrictions", e.target.value)}
                      placeholder="e.g. low sodium, soft food only"
                      className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nap Schedule</label>
                    <input
                      type="text"
                      value={member.napSchedule ?? ""}
                      onChange={(e) => updateMember(i, "napSchedule", e.target.value)}
                      placeholder="e.g. naps 2-4pm daily"
                      className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      value={member.emergencyContact ?? ""}
                      onChange={(e) => updateMember(i, "emergencyContact", e.target.value)}
                      placeholder="e.g. Dr. Lee 9123-4567"
                      className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addMember}
        className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-200 text-text-secondary hover:border-gray-400 hover:text-gray-900 transition-all duration-200 w-full justify-center"
      >
        <Plus className="w-4 h-4" /> Add Member
      </button>

      {localMembers.some((m) => m.role === "Child" || m.role === "Elderly") && (
        <div className="bg-gray-50 rounded-2xl p-4 text-sm text-text-secondary border border-border">
          We&apos;ll include care-related tasks for your household members in the schedule.
        </div>
      )}
    </div>
  );
}
