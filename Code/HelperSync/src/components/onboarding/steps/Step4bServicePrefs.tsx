"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { HouseholdMember } from "@/types/household";
import { cn } from "@/lib/utils";
import type { Priority } from "@/app/onboarding/employer/page";

// ── Types ─────────────────────────────────────────────────────────────────────

type Answers = Record<string, string | string[]>;

interface QOption {
  value: string;
  emoji: string;
  label: string;
  sub?: string;
}

interface Question {
  id: string;
  sectionLabel: string;
  text: string;
  options: QOption[];
  multi?: boolean;
  skippable?: boolean;
  showIf?: (answers: Answers, members: HouseholdMember[], focus: Priority[]) => boolean;
  toLines: (answer: string | string[]) => string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasChild(members: HouseholdMember[])   { return members.some(m => m.role === "Child" && m.age !== 0 && m.age !== 15); }
function hasElderly(members: HouseholdMember[]) { return members.some(m => m.role === "Elderly"); }

// ── Questions ─────────────────────────────────────────────────────────────────

const ALL_QUESTIONS: Question[] = [

  // Meals — always shown if meals is in focus (or as a default)
  {
    id: "cuisine",
    sectionLabel: "Meals",
    text: "What cuisine style does your household prefer?",
    options: [
      { value: "chinese",  emoji: "🥢", label: "Chinese" },
      { value: "malay",    emoji: "🍛", label: "Malay" },
      { value: "indian",   emoji: "🫓", label: "Indian" },
      { value: "western",  emoji: "🍝", label: "Western" },
      { value: "mix",      emoji: "🌏", label: "Mix it up" },
    ],
    toLines: (a) => {
      const map: Record<string, string> = {
        chinese: "Cook Chinese-style meals",
        malay:   "Cook Malay-style meals",
        indian:  "Cook Indian-style meals",
        western: "Cook Western-style meals",
        mix:     "Vary cuisine — mix of Chinese, Malay, and Western meals",
      };
      return [map[a as string]];
    },
  },

  {
    id: "dietary",
    sectionLabel: "Meals",
    text: "Any dietary requirements?",
    options: [
      { value: "halal",       emoji: "🌙", label: "Halal" },
      { value: "nopork",      emoji: "🚫", label: "No pork" },
      { value: "vegetarian",  emoji: "🥦", label: "Vegetarian" },
      { value: "noseafood",   emoji: "🦐", label: "No seafood" },
      { value: "nutfree",     emoji: "🥜", label: "Nut-free" },
    ],
    multi: true,
    skippable: true,
    toLines: (a) => {
      const arr = a as string[];
      if (arr.length === 0) return [];
      const map: Record<string, string> = {
        halal:      "All meals must be Halal",
        nopork:     "No pork in any meals",
        vegetarian: "Vegetarian meals only",
        noseafood:  "No seafood",
        nutfree:    "Nut-free kitchen — no nuts in any dish",
      };
      return arr.map(v => map[v]).filter(Boolean);
    },
  },

  // Cleaning — shown if cleanliness in focus
  {
    id: "cleaning_freq",
    sectionLabel: "Cleaning",
    text: "How often should floors be mopped?",
    options: [
      { value: "daily",       emoji: "🧹", label: "Every day" },
      { value: "alternate",   emoji: "🧹", label: "Every other day" },
      { value: "twice_week",  emoji: "🧹", label: "Twice a week" },
      { value: "weekly",      emoji: "🧹", label: "Once a week" },
    ],
    showIf: (_, __, focus) => focus.includes("cleanliness"),
    toLines: (a) => {
      const map: Record<string, string> = {
        daily:      "Mop floors daily",
        alternate:  "Mop floors every other day",
        twice_week: "Mop floors twice a week",
        weekly:     "Mop floors once a week",
      };
      return [map[a as string]];
    },
  },

  // Laundry — shown if laundry in focus
  {
    id: "laundry_freq",
    sectionLabel: "Laundry",
    text: "How often should laundry be done?",
    options: [
      { value: "daily",       emoji: "👕", label: "Daily" },
      { value: "alternate",   emoji: "👕", label: "Every 2 days" },
      { value: "twice_week",  emoji: "👕", label: "Twice a week" },
      { value: "weekly",      emoji: "👕", label: "Weekly" },
    ],
    showIf: (_, __, focus) => focus.includes("laundry"),
    toLines: (a) => {
      const map: Record<string, string> = {
        daily:      "Do laundry daily",
        alternate:  "Do laundry every 2 days",
        twice_week: "Do laundry twice a week",
        weekly:     "Do laundry once a week",
      };
      return [map[a as string]];
    },
  },

  {
    id: "laundry_care",
    sectionLabel: "Laundry",
    text: "What are your ironing and drying preferences?",
    options: [
      { value: "airdry_iron_all",    emoji: "🌬️", label: "Air dry + iron everything" },
      { value: "airdry_iron_formal", emoji: "🌬️", label: "Air dry + iron formals only" },
      { value: "airdry_no_iron",     emoji: "🌬️", label: "Air dry, no ironing" },
      { value: "tumble_no_iron",     emoji: "🌀", label: "Tumble dry, no ironing" },
    ],
    showIf: (_, __, focus) => focus.includes("laundry"),
    toLines: (a) => {
      const map: Record<string, string> = {
        airdry_iron_all:    "Air dry all clothes and iron everything",
        airdry_iron_formal: "Air dry and iron formal wear only",
        airdry_no_iron:     "Air dry clothes — no ironing required",
        tumble_no_iron:     "Tumble dry is fine — no ironing needed",
      };
      return [map[a as string]];
    },
  },

  // Childcare — if child in household
  {
    id: "childcare_tasks",
    sectionLabel: "Childcare",
    text: "What should the helper handle for your child?",
    options: [
      { value: "schoolbag",  emoji: "🎒", label: "Pack school bag daily" },
      { value: "lunchbox",   emoji: "🍱", label: "Prepare school lunch box" },
      { value: "homework",   emoji: "📚", label: "Homework supervision" },
      { value: "tuition",    emoji: "✏️",  label: "Accompany to tuition" },
      { value: "activities", emoji: "⚽",  label: "Accompany to activities" },
    ],
    multi: true,
    skippable: true,
    showIf: (_, members) => hasChild(members),
    toLines: (a) => {
      const arr = a as string[];
      const map: Record<string, string> = {
        schoolbag:  "Pack child's school bag every night",
        lunchbox:   "Prepare school lunch box daily",
        homework:   "Supervise child's homework after school",
        tuition:    "Accompany child to tuition classes",
        activities: "Accompany child to extracurricular activities",
      };
      return arr.map(v => map[v]).filter(Boolean);
    },
  },

  // Elderly — if elderly in household
  {
    id: "elderly_daily",
    sectionLabel: "Elderly Care",
    text: "What daily routines should the helper maintain?",
    options: [
      { value: "bp_check",    emoji: "💉", label: "Blood pressure check" },
      { value: "small_meals", emoji: "🍽️", label: "Small meals 4–5× daily" },
      { value: "walk",        emoji: "🚶", label: "Daily outdoor walk" },
      { value: "companion",   emoji: "🤝", label: "Sit with during meals" },
    ],
    multi: true,
    skippable: true,
    showIf: (_, members) => hasElderly(members),
    toLines: (a) => {
      const arr = a as string[];
      const map: Record<string, string> = {
        bp_check:    "Check elderly member's blood pressure daily",
        small_meals: "Serve small meals 4–5 times a day for elderly member",
        walk:        "Daily outdoor walk with elderly member",
        companion:   "Sit with elderly member during meals",
      };
      return arr.map(v => map[v]).filter(Boolean);
    },
  },

  // Grocery — if grocery in focus
  {
    id: "grocery_freq",
    sectionLabel: "Grocery",
    text: "How should grocery runs be handled?",
    options: [
      { value: "daily",   emoji: "🛒", label: "Fresh groceries daily",   sub: "Wet market or local shop" },
      { value: "twice",   emoji: "🛒", label: "Shop twice a week" },
      { value: "weekly",  emoji: "🛒", label: "Weekly bulk shop",         sub: "Supermarket" },
      { value: "online",  emoji: "📱", label: "Online delivery top-up" },
    ],
    showIf: (_, __, focus) => focus.includes("grocery"),
    toLines: (a) => {
      const map: Record<string, string> = {
        daily:  "Buy fresh groceries daily from wet market or local shop",
        twice:  "Shop for groceries twice a week",
        weekly: "Do a weekly bulk grocery run at the supermarket",
        online: "Use online grocery delivery for top-up shopping",
      };
      return [map[a as string]];
    },
  },
];

// ── Utilities ─────────────────────────────────────────────────────────────────

function buildServicePrefsRoutine(questions: Question[], answers: Answers): string {
  return questions
    .flatMap(q => {
      const ans = answers[q.id];
      if (!ans || (Array.isArray(ans) && ans.length === 0)) return [];
      return q.toLines(ans);
    })
    .filter(Boolean)
    .join("\n");
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Step4bProps {
  members: HouseholdMember[];
  householdFocus: Priority[];
  onComplete: (servicePrefsRoutine: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Step4bServicePrefs({ members, householdFocus, onComplete }: Step4bProps) {
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers]         = useState<Answers>({});

  const visibleQuestions = useMemo(
    () => ALL_QUESTIONS.filter(q => !q.showIf || q.showIf(answers, members, householdFocus)),
    [answers, members, householdFocus]
  );

  if (visibleQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] gap-4">
        <p className="text-text-secondary text-sm">No additional preferences needed.</p>
        <button
          onClick={() => onComplete("")}
          className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold"
        >
          Continue
        </button>
      </div>
    );
  }

  const currentQ   = visibleQuestions[Math.min(questionIdx, visibleQuestions.length - 1)];
  const currentAns = answers[currentQ.id];
  const hasAnswer  = Array.isArray(currentAns) ? currentAns.length > 0 : !!currentAns;
  const canContinue = hasAnswer || !!currentQ.skippable;
  const isLast      = questionIdx >= visibleQuestions.length - 1;

  function toggleAnswer(value: string) {
    setAnswers(prev => {
      const existing = prev[currentQ.id];
      let updated: string | string[];
      if (currentQ.multi) {
        const arr = (existing as string[] | undefined) ?? [];
        updated = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      } else {
        updated = value;
      }
      return { ...prev, [currentQ.id]: updated };
    });
  }

  function handleContinue() {
    if (isLast) {
      onComplete(buildServicePrefsRoutine(visibleQuestions, answers));
    } else {
      setQuestionIdx(i => i + 1);
    }
  }

  function handleBack() {
    if (questionIdx === 0) {
      onComplete(buildServicePrefsRoutine(visibleQuestions, answers));
    } else {
      setQuestionIdx(i => i - 1);
    }
  }

  const isSelected = (value: string) => {
    if (!currentAns) return false;
    return Array.isArray(currentAns) ? currentAns.includes(value) : currentAns === value;
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-10rem)]">

      {/* Progress bar */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${((questionIdx + 1) / visibleQuestions.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 tabular-nums flex-shrink-0">
          {questionIdx + 1} / {visibleQuestions.length}
        </span>
      </div>

      {/* Question */}
      <div
        key={currentQ.id}
        className="flex-1 flex flex-col"
        style={{ animation: "fade-in-up 0.35s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
          {currentQ.sectionLabel}
        </p>
        <h2 className="text-2xl font-display font-semibold text-gray-900 leading-snug mb-6">
          {currentQ.text}
        </h2>

        <div className="space-y-2.5 flex-1">
          {currentQ.options.map(opt => {
            const sel = isSelected(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggleAnswer(opt.value)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 text-left transition-all duration-150 bg-white",
                  sel ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                )}
              >
                <span className="text-2xl leading-none flex-shrink-0">{opt.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold leading-snug", sel ? "text-primary" : "text-gray-900")}>
                    {opt.label}
                  </p>
                  {opt.sub && <p className="text-xs text-text-muted mt-0.5">{opt.sub}</p>}
                </div>
                {currentQ.multi ? (
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    sel ? "bg-primary border-primary" : "border-gray-300"
                  )}>
                    {sel && <Check className="w-3 h-3 text-white" />}
                  </div>
                ) : (
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    sel ? "border-primary" : "border-gray-300"
                  )}>
                    {sel && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="pt-6 space-y-3">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base transition-all duration-200",
            canContinue
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          {isLast ? "All done" : "Continue"}
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {currentQ.skippable && !hasAnswer && (
            <button
              onClick={handleContinue}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
