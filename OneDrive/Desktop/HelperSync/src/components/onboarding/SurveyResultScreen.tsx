"use client";

import { ArrowRight } from "lucide-react";
import type { Priority, SetupFor, MiscommunicationFrequency, TimeReexplainingTasks } from "@/app/onboarding/employer/page";

const PRIORITY_LABELS: Record<Priority, string> = {
  meals: "meals & cooking",
  cleanliness: "cleaning",
  childcare: "childcare",
  elderlycare: "elderly care",
  laundry: "laundry",
  grocery: "grocery runs",
  organizing: "organising",
};

const TIME_LABELS: Record<TimeReexplainingTasks, string> = {
  under30: "under 30 min / week",
  "30to60": "30–60 min / week",
  over60: "1+ hour / week",
  toomuch: "way too much time",
};

const MISCOMMUNICATION_LABELS: Record<MiscommunicationFrequency, string> = {
  never: "rarely frustrated",
  sometimes: "frustrated sometimes",
  often: "frustrated often",
  always: "constantly frustrated",
};

interface SurveyResultScreenProps {
  setupFor: SetupFor | null;
  householdFocus: Priority[];
  experienceAnswer: string | null;
  timeReexplainingTasks: TimeReexplainingTasks | null;
  miscommunicationFrequency: MiscommunicationFrequency | null;
  onContinue: () => void;
}

export function SurveyResultScreen({
  setupFor,
  householdFocus,
  experienceAnswer,
  timeReexplainingTasks,
  miscommunicationFrequency,
  onContinue,
}: SurveyResultScreenProps) {
  const topNeeds = householdFocus.slice(0, 3).map((p) => PRIORITY_LABELS[p]).join(", ");
  const timeLabel = timeReexplainingTasks ? TIME_LABELS[timeReexplainingTasks] : null;
  const miscLabel = miscommunicationFrequency ? MISCOMMUNICATION_LABELS[miscommunicationFrequency] : null;
  const isNewUser = experienceAnswer === "new";

  const rows: { emoji: string; label: string; value: string }[] = [
    {
      emoji: setupFor === "family" ? "👵" : "🏠",
      label: "Setting up for",
      value: setupFor === "family" ? "A family member's home" : "My own home",
    },
    ...(topNeeds ? [{
      emoji: "📋",
      label: "Top needs",
      value: topNeeds,
    }] : []),
    ...(timeLabel ? [{
      emoji: isNewUser ? "⏱️" : "🔁",
      label: isNewUser ? "Time managing tasks" : "Time re-explaining",
      value: timeLabel,
    }] : []),
    ...(miscLabel && !isNewUser ? [{
      emoji: "💬",
      label: "Miscommunication",
      value: miscLabel,
    }] : []),
  ];

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-6"
      style={{ animation: "screen-fade-in 0.4s ease-out both" }}
    >
      <div className="w-full max-w-sm">

        {/* Icon */}
        <div
          className="text-5xl text-center mb-6"
          style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both" }}
        >
          🎉
        </div>

        {/* Headline */}
        <h1
          className="text-3xl font-display font-semibold tracking-tight text-gray-900 mb-2 leading-snug text-center"
          style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both" }}
        >
          Your profile is taking shape.
        </h1>

        {/* Subtext */}
        <p
          className="text-sm text-text-secondary text-center leading-relaxed mb-8"
          style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.3s both" }}
        >
          Here&apos;s what we know so far. Next, we&apos;ll fill in your household details to build your helper&apos;s timetable.
        </p>

        {/* Summary card */}
        <div
          className="bg-white rounded-2xl p-5 shadow-sm space-y-4 mb-8"
          style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.4s both" }}
        >
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 text-xl">
                {row.emoji}
              </div>
              <div>
                <p className="text-xs text-text-muted">{row.label}</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.5s both" }}>
          <button
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-xl font-display font-semibold text-base hover:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200"
          >
            Let&apos;s build it <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
