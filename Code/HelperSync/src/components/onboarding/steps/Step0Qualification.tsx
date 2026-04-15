"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { Priority, SetupFor, MiscommunicationFrequency, TimeReexplainingTasks } from "@/app/onboarding/employer/page";

interface QualificationData {
  setupFor: SetupFor | null;
  firstTimeEmployer: boolean | null;
  householdFocus: Priority[];
  helperHasPhone: boolean | null;
  miscommunicationFrequency: MiscommunicationFrequency | null;
  timeReexplainingTasks: TimeReexplainingTasks | null;
}

interface Step0Props {
  data: QualificationData;
  onUpdate: (updates: Partial<QualificationData>) => void;
}

// ── Q0 options ──────────────────────────────────────────────────────────────

const SETUP_FOR_OPTIONS: { value: SetupFor; emoji: string; label: string; sub: string }[] = [
  { value: "own", emoji: "🏠", label: "My own home", sub: "I live where the helper works" },
  { value: "family", emoji: "👵", label: "A family member's home", sub: "e.g. parents, in-laws, relatives" },
];

// ── Q1 options ──────────────────────────────────────────────────────────────

const EXPERIENCE_OPTIONS: { value: boolean; emoji: string; label: string; sub: string }[] = [
  { value: true, emoji: "✅", label: "Yes, I've had a helper before", sub: "I know the basics" },
  { value: false, emoji: "🌱", label: "No, this is my first time", sub: "I'd appreciate some guidance" },
];

// ── Q2 options ──────────────────────────────────────────────────────────────

const FOCUS_OPTIONS: { value: Priority; emoji: string; label: string }[] = [
  { value: "meals", emoji: "🍳", label: "Meals & cooking" },
  { value: "cleanliness", emoji: "🧹", label: "Cleaning & chores" },
  { value: "childcare", emoji: "👶", label: "Childcare" },
  { value: "elderlycare", emoji: "👴", label: "Elderly care" },
  { value: "laundry", emoji: "👕", label: "Laundry" },
  { value: "grocery", emoji: "🛒", label: "Errands & grocery" },
];

// ── Q3 options ──────────────────────────────────────────────────────────────

const PHONE_OPTIONS: { value: boolean; emoji: string; label: string; sub: string }[] = [
  { value: true, emoji: "📱", label: "Yes, they'll have the app", sub: "They'll see tasks on their phone" },
  { value: false, emoji: "🖨️", label: "No, I'll manage it for them", sub: "I'll share a printed checklist" },
];

// ── Q4 options (priming) ─────────────────────────────────────────────────────

const MISCOMMUNICATION_OPTIONS: { value: MiscommunicationFrequency; emoji: string; label: string }[] = [
  { value: "never",     emoji: "😌", label: "Never — it runs smoothly" },
  { value: "sometimes", emoji: "🤔", label: "Sometimes" },
  { value: "often",     emoji: "😩", label: "Often" },
  { value: "always",    emoji: "😤", label: "Almost every week" },
];

// ── Q5 options (priming) ─────────────────────────────────────────────────────

const TIME_REEXPLAINING_OPTIONS: { value: TimeReexplainingTasks; emoji: string; label: string }[] = [
  { value: "under30", emoji: "⚡", label: "Under 30 minutes" },
  { value: "30to60",  emoji: "⏳", label: "30–60 minutes" },
  { value: "over60",  emoji: "😮‍💨", label: "Over an hour" },
];

// ── Component ────────────────────────────────────────────────────────────────

export function Step0Qualification({ data, onUpdate }: Step0Props) {
  const toggleFocus = (value: Priority) => {
    const current = data.householdFocus;
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onUpdate({ householdFocus: next });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 text-3xl">
          👋
        </div>
        <h2 className="text-2xl font-display font-semibold tracking-tight text-gray-900 mb-1">
          Tell us about your situation
        </h2>
        <p className="text-text-secondary text-sm max-w-sm">
          Four quick questions so we can tailor everything to you.
        </p>
      </div>

      {/* Q0 — Whose home */}
      <QuestionGroup label="Who are you setting this up for?">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SETUP_FOR_OPTIONS.map((opt) => (
            <SelectCard
              key={opt.value}
              selected={data.setupFor === opt.value}
              onClick={() => onUpdate({ setupFor: opt.value })}
              emoji={opt.emoji}
              label={opt.label}
              sub={opt.sub}
            />
          ))}
        </div>
      </QuestionGroup>

      {/* Q1 — Experience */}
      <QuestionGroup label="Have you managed household help before?">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {EXPERIENCE_OPTIONS.map((opt) => (
            <SelectCard
              key={String(opt.value)}
              selected={data.firstTimeEmployer === opt.value}
              onClick={() => onUpdate({ firstTimeEmployer: opt.value })}
              emoji={opt.emoji}
              label={opt.label}
              sub={opt.sub}
            />
          ))}
        </div>
      </QuestionGroup>

      {/* Q2 — Household focus (multi-select) */}
      <QuestionGroup label="What does the household need most?" hint="Pick all that apply">
        <div className="flex flex-wrap gap-2">
          {FOCUS_OPTIONS.map((opt) => {
            const selected = data.householdFocus.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggleFocus(opt.value)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-150",
                  selected
                    ? "border-primary bg-primary-50 text-primary"
                    : "border-border bg-white text-gray-700 hover:border-gray-300"
                )}
              >
                <span>{opt.emoji}</span>
                {opt.label}
                {selected && <Check className="w-3.5 h-3.5 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </QuestionGroup>

      {/* Q3 — Phone access */}
      <QuestionGroup label="Will your helper use HelperSync on their phone?">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PHONE_OPTIONS.map((opt) => (
            <SelectCard
              key={String(opt.value)}
              selected={data.helperHasPhone === opt.value}
              onClick={() => onUpdate({ helperHasPhone: opt.value })}
              emoji={opt.emoji}
              label={opt.label}
              sub={opt.sub}
            />
          ))}
        </div>
      </QuestionGroup>

      {/* Q4 — Miscommunication frequency (priming) */}
      <QuestionGroup
        label="How often do miscommunications with your helper cause frustration?"
        hint="Optional — helps us tailor your schedule"
      >
        <div className="flex flex-wrap gap-2">
          {MISCOMMUNICATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ miscommunicationFrequency: data.miscommunicationFrequency === opt.value ? null : opt.value })}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-150",
                data.miscommunicationFrequency === opt.value
                  ? "border-primary bg-primary-50 text-primary"
                  : "border-border bg-white text-gray-700 hover:border-gray-300"
              )}
            >
              <span>{opt.emoji}</span>
              {opt.label}
              {data.miscommunicationFrequency === opt.value && <Check className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          ))}
        </div>
      </QuestionGroup>

      {/* Q5 — Time re-explaining tasks (priming) */}
      <QuestionGroup
        label="How much time do you spend each week re-explaining tasks to your helper?"
        hint="Optional — helps us tailor your schedule"
      >
        <div className="flex flex-wrap gap-2">
          {TIME_REEXPLAINING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ timeReexplainingTasks: data.timeReexplainingTasks === opt.value ? null : opt.value })}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-150",
                data.timeReexplainingTasks === opt.value
                  ? "border-primary bg-primary-50 text-primary"
                  : "border-border bg-white text-gray-700 hover:border-gray-300"
              )}
            >
              <span>{opt.emoji}</span>
              {opt.label}
              {data.timeReexplainingTasks === opt.value && <Check className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          ))}
        </div>
      </QuestionGroup>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function QuestionGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        {hint && <p className="text-xs text-text-muted mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function SelectCard({
  selected,
  onClick,
  emoji,
  label,
  sub,
}: {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3.5 rounded-2xl border-2 transition-all duration-150",
        selected
          ? "border-primary bg-primary-50"
          : "border-border bg-white hover:border-gray-300"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5 leading-none">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium leading-snug", selected ? "text-primary" : "text-gray-900")}>
            {label}
          </p>
          <p className="text-xs text-text-muted mt-0.5">{sub}</p>
        </div>
        {selected && (
          <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-white" />
          </span>
        )}
      </div>
    </button>
  );
}
