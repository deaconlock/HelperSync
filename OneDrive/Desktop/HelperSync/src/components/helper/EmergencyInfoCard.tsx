"use client";

import { useState } from "react";
import { HouseholdMember } from "@/types/household";
import { Phone, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmergencyInfoCardProps {
  elderlyMembers: HouseholdMember[];
}

export function EmergencyInfoCard({ elderlyMembers }: EmergencyInfoCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Only show if there's meaningful emergency info
  const membersWithInfo = elderlyMembers.filter(
    (m) => m.emergencyContact || m.medicalConditions
  );
  if (membersWithInfo.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3"
      >
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-gray-900">Emergency Info</p>
          <p className="text-xs text-gray-500">
            {membersWithInfo.length} member{membersWithInfo.length !== 1 ? "s" : ""} with care details
          </p>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-400 transition-transform",
          expanded && "rotate-180"
        )} />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-amber-100 pt-3">
          {membersWithInfo.map((member) => (
            <div key={member.name} className="bg-white rounded-xl p-3 border border-amber-100 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">👴</span>
                <p className="text-sm font-medium text-gray-900">
                  {member.name}
                  {member.age ? <span className="text-gray-400 font-normal ml-1">({member.age}y)</span> : null}
                </p>
                {member.mobilityLevel && member.mobilityLevel !== "independent" && (
                  <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                    {member.mobilityLevel.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              {member.medicalConditions && (
                <div className="flex items-start gap-2">
                  <span className="text-xs text-gray-400 w-20 flex-shrink-0 pt-0.5">Medical</span>
                  <p className="text-xs text-gray-700">{member.medicalConditions}</p>
                </div>
              )}

              {member.dietaryRestrictions && (
                <div className="flex items-start gap-2">
                  <span className="text-xs text-gray-400 w-20 flex-shrink-0 pt-0.5">Diet</span>
                  <p className="text-xs text-gray-700">{member.dietaryRestrictions}</p>
                </div>
              )}

              {member.emergencyContact && (
                <a
                  href={`tel:${member.emergencyContact.replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-2 mt-1 px-3 py-2 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
                >
                  <Phone className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">{member.emergencyContact}</span>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
