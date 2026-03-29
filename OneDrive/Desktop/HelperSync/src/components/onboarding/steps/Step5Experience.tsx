"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HelperExperience, HelperPace } from "@/app/onboarding/employer/page";

const EXPERIENCE_OPTIONS: {
  value: HelperExperience;
  label: string;
  description: string;
  detail: string;
  emoji: string;
}[] = [
  {
    value: "new",
    label: "Brand new",
    description: "First time as a domestic helper",
    detail: "We'll create detailed, step-by-step task descriptions so your helper knows exactly what to do.",
    emoji: "🌱",
  },
  {
    value: "some",
    label: "Some experience",
    description: "1–2 years of experience",
    detail: "We'll include clear instructions but assume basic knowledge of household tasks.",
    emoji: "📋",
  },
  {
    value: "experienced",
    label: "Very experienced",
    description: "3+ years as a domestic helper",
    detail: "We'll keep tasks concise — your helper likely knows how to get things done.",
    emoji: "⭐",
  },
];

const PACE_OPTIONS: {
  value: HelperPace;
  emoji: string;
  label: string;
  summary: string;
  detail: string;
}[] = [
  {
    value: "relaxed",
    emoji: "🌿",
    label: "Relaxed",
    summary: "8am–6pm · 2 breaks · 6–8 tasks/day",
    detail: "Marathon, not sprint. More downtime means a happier helper who stays longer.",
  },
  {
    value: "balanced",
    emoji: "⚖️",
    label: "Balanced",
    summary: "7am–7pm · 2 breaks · 8–10 tasks/day",
    detail: "Steady and sustainable. The sweet spot for most households.",
  },
  {
    value: "intensive",
    emoji: "⚡",
    label: "Intensive",
    summary: "7am–8pm · 1 break · 10–12 tasks/day",
    detail: "Gets more done, but higher chance of burnout over time.",
  },
];

interface Step5Props {
  experience: HelperExperience | null;
  pace: HelperPace;
  onUpdate: (experience: HelperExperience, pace: HelperPace) => void;
}

export function Step5Experience({ experience, pace, onUpdate }: Step5Props) {
  const [selected, setSelected] = useState<HelperExperience | null>(experience);
  const [selectedPace, setSelectedPace] = useState<HelperPace>(pace);

  const handleSelect = (value: HelperExperience) => {
    setSelected(value);
    onUpdate(value, selectedPace);
  };

  const handlePaceSelect = (value: HelperPace) => {
    setSelectedPace(value);
    if (selected) onUpdate(selected, value);
  };

  return (
    <div className="space-y-10">
      {/* Experience section */}
      <div>
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-gray-700" />
          </div>
          <h2 className="text-2xl font-display font-semibold tracking-tight text-gray-900 mb-2">
            How experienced is your helper?
          </h2>
          <p className="text-text-secondary text-sm max-w-md">
            This helps us set the right level of detail in the schedule. More guidance for newer helpers, less for experienced ones.
          </p>
        </div>

        <div className="space-y-3">
          {EXPERIENCE_OPTIONS.map((option) => {
            const isSelected = selected === option.value;

            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "w-full flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-200",
                  isSelected
                    ? "border-gray-900 bg-gray-50 shadow-sm"
                    : "border-border bg-white hover:border-gray-300"
                )}
              >
                <span className="text-3xl flex-shrink-0 mt-0.5">{option.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-base text-gray-900">
                    {option.label}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
                  {isSelected && (
                    <p className="text-xs text-gray-500 mt-2 animate-fade-in-up">
                      {option.detail}
                    </p>
                  )}
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 mt-1 animate-checkmark">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pace section */}
      <div>
        <div className="flex flex-col items-center text-center mb-6">
          <h3 className="text-lg font-display font-semibold tracking-tight text-gray-900 mb-1">
            Schedule pace
          </h3>
          <p className="text-text-secondary text-xs max-w-sm">
            How packed should the helper&apos;s day be? All options include a lunch break and at least one rest day per week.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {PACE_OPTIONS.map((option) => {
            const isSelected = selectedPace === option.value;

            return (
              <button
                key={option.value}
                onClick={() => handlePaceSelect(option.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-4 rounded-2xl border text-center transition-all duration-200",
                  isSelected
                    ? "border-gray-900 bg-gray-50 shadow-sm"
                    : "border-border bg-white hover:border-gray-300"
                )}
              >
                <span className="text-2xl">{option.emoji}</span>
                <p className="font-display font-semibold text-sm text-gray-900">
                  {option.label}
                </p>
                <p className="text-[10px] leading-tight text-gray-400">
                  {option.summary}
                </p>
              </button>
            );
          })}
        </div>

        {/* Detail text for selected pace */}
        {PACE_OPTIONS.map((option) =>
          selectedPace === option.value ? (
            <p key={option.value} className="text-xs text-gray-500 text-center mt-3 animate-fade-in-up">
              {option.detail}
            </p>
          ) : null
        )}

        <p className="text-[10px] text-gray-400 text-center mt-3">
          A well-rested helper performs better long-term
        </p>
      </div>
    </div>
  );
}
