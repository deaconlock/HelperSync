"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { HouseholdMember } from "@/types/household";
import { cn } from "@/lib/utils";
import type { SetupFor } from "@/app/onboarding/employer/page";

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
  section: 1 | 2 | 3 | 4;
  sectionLabel: string;
  text: string;
  options: QOption[];
  multi?: boolean;
  skippable?: boolean;
  showIf?: (answers: Answers, members: HouseholdMember[]) => boolean;
  toLines: (answer: string | string[]) => string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasBaby(members: HouseholdMember[])    { return members.some(m => m.role === "Child" && m.age === 0); }
function hasChild(members: HouseholdMember[])   { return members.some(m => m.role === "Child" && m.age !== 0 && m.age !== 15); }
function hasTeen(members: HouseholdMember[])    { return members.some(m => m.role === "Child" && m.age === 15); }
function hasElderly(members: HouseholdMember[]) { return members.some(m => m.role === "Elderly"); }
function hasPets(members: HouseholdMember[])    { return members.some(m => m.role === "Pets"); }

// ── All questions ─────────────────────────────────────────────────────────────

const ALL_QUESTIONS: Question[] = [

  // ── Section 1: Household Setup ───────────────────────────────────────────

  {
    id: "helper_hours",
    section: 1,
    sectionLabel: "Household Setup",
    text: "What are your helper's working hours?",
    options: [
      { value: "630_830",  emoji: "🌅", label: "6:30 AM – 8:30 PM" },
      { value: "700_900",  emoji: "☀️", label: "7:00 AM – 9:00 PM" },
      { value: "700_1000", emoji: "🌙", label: "7:00 AM – 10:00 PM" },
    ],
    toLines: (a) => {
      const map: Record<string, string> = {
        "630_830":  "Helper works 6:30 AM – 8:30 PM",
        "700_900":  "Helper works 7:00 AM – 9:00 PM",
        "700_1000": "Helper works 7:00 AM – 10:00 PM",
      };
      return [map[a as string]];
    },
  },

  {
    id: "busyness",
    section: 1,
    sectionLabel: "Household Setup",
    text: "How busy is your home on weekdays?",
    options: [
      { value: "calm",     emoji: "🧘", label: "Calm",     sub: "Light upkeep" },
      { value: "moderate", emoji: "🧼", label: "Moderate", sub: "Daily cleaning + some care" },
      { value: "busy",     emoji: "🔥", label: "Busy",     sub: "Kids / baby / high workload" },
    ],
    toLines: (a) => {
      const map: Record<string, string> = {
        "calm":     "Light workload — calm household",
        "moderate": "Moderate workload — daily cleaning and some care",
        "busy":     "High workload — busy household with children or dependents",
      };
      return [map[a as string]];
    },
  },

  // ── Section 2: Daily Anchors ─────────────────────────────────────────────

  {
    id: "dinner_time",
    section: 2,
    sectionLabel: "Daily Anchors",
    text: "When does your household usually have dinner?",
    options: [
      { value: "1800", emoji: "🍽️", label: "6:00 PM" },
      { value: "1830", emoji: "🍽️", label: "6:30 PM" },
      { value: "1900", emoji: "🍽️", label: "7:00 PM" },
      { value: "1930", emoji: "🍽️", label: "7:30 PM" },
      { value: "2000", emoji: "🍽️", label: "8:00 PM" },
    ],
    toLines: (a) => {
      const map: Record<string, string> = {
        "1800": "Dinner ready by 6:00 PM",
        "1830": "Dinner ready by 6:30 PM",
        "1900": "Dinner ready by 7:00 PM",
        "1930": "Dinner ready by 7:30 PM",
        "2000": "Dinner ready by 8:00 PM",
      };
      return [map[a as string]];
    },
  },

  {
    id: "leave_time",
    section: 2,
    sectionLabel: "Daily Anchors",
    text: "What time do adults usually leave home?",
    options: [
      { value: "700",  emoji: "🚶", label: "7:00 AM" },
      { value: "730",  emoji: "🚶", label: "7:30 AM" },
      { value: "800",  emoji: "🚶", label: "8:00 AM" },
      { value: "830",  emoji: "🚶", label: "8:30 AM" },
      { value: "home", emoji: "🏠", label: "Mostly at home" },
    ],
    toLines: (a) => {
      if (a === "home") return ["Adults mostly at home during the day"];
      const map: Record<string, string> = {
        "700": "Adults leave home by 7:00 AM",
        "730": "Adults leave home by 7:30 AM",
        "800": "Adults leave home by 8:00 AM",
        "830": "Adults leave home by 8:30 AM",
      };
      return [map[a as string]];
    },
  },

  {
    id: "return_time",
    section: 2,
    sectionLabel: "Daily Anchors",
    text: "What time do adults usually return home?",
    options: [
      { value: "1730", emoji: "🌆", label: "5:30 PM" },
      { value: "1800", emoji: "🌇", label: "6:00 PM" },
      { value: "1830", emoji: "🌃", label: "6:30 PM" },
      { value: "1900", emoji: "🌙", label: "7:00 PM" },
      { value: "2000", emoji: "🌙", label: "8:00 PM+" },
    ],
    showIf: (a) => a.leave_time !== "home",
    toLines: (a) => {
      const map: Record<string, string> = {
        "1730": "Adults return home around 5:30 PM",
        "1800": "Adults return home around 6:00 PM",
        "1830": "Adults return home around 6:30 PM",
        "1900": "Adults return home around 7:00 PM",
        "2000": "Adults return home after 8:00 PM",
      };
      return [map[a as string]];
    },
  },

  // ── Section 3: Dependents (dynamic) ─────────────────────────────────────

  {
    id: "baby_routine",
    section: 3,
    sectionLabel: "Baby",
    text: "Which best describes your baby's routine?",
    options: [
      { value: "structured",  emoji: "⏱️", label: "Structured",     sub: "Predictable naps & feeds" },
      { value: "semi",        emoji: "🔁", label: "Semi-structured", sub: "Roughly consistent" },
      { value: "on_demand",   emoji: "🎲", label: "On-demand",       sub: "Flexible, baby-led" },
    ],
    showIf: (_, m) => hasBaby(m),
    toLines: (a) => {
      const map: Record<string, string> = {
        "structured": "Baby is on a structured feeding and nap schedule — plan tasks around quiet windows",
        "semi":       "Baby has a semi-structured routine — allow flexible gaps in helper's schedule",
        "on_demand":  "Baby is on-demand — helper should be available to assist at any time",
      };
      return [map[a as string]];
    },
  },

  {
    id: "baby_bedtime",
    section: 3,
    sectionLabel: "Baby",
    text: "What time is your baby's bedtime?",
    options: [
      { value: "1830", emoji: "🌆", label: "6:30 PM" },
      { value: "1900", emoji: "🌇", label: "7:00 PM" },
      { value: "1930", emoji: "🌙", label: "7:30 PM" },
      { value: "2000", emoji: "🌙", label: "8:00 PM+" },
    ],
    showIf: (_, m) => hasBaby(m),
    toLines: (a) => {
      const map: Record<string, string> = {
        "1830": "Baby bedtime at 6:30 PM — begin wind-down routine 30 min before",
        "1900": "Baby bedtime at 7:00 PM — begin wind-down routine 30 min before",
        "1930": "Baby bedtime at 7:30 PM — begin wind-down routine 30 min before",
        "2000": "Baby bedtime after 8:00 PM — begin wind-down routine 30 min before",
      };
      return [map[a as string]];
    },
  },

  {
    id: "baby_tasks",
    section: 3,
    sectionLabel: "Baby",
    text: "What does the helper handle for the baby?",
    options: [
      { value: "feeding",  emoji: "🍼", label: "Feeding" },
      { value: "bath",     emoji: "🛁", label: "Bath" },
      { value: "sleep",    emoji: "💤", label: "Putting to sleep" },
      { value: "cleaning", emoji: "🧺", label: "Bottles & laundry" },
    ],
    multi: true,
    showIf: (_, m) => hasBaby(m),
    toLines: (a) => {
      const arr = a as string[];
      return arr.map(v =>
        v === "feeding"  ? "Helper assists with baby feeding" :
        v === "bath"     ? "Helper gives baby bath" :
        v === "sleep"    ? "Helper puts baby to sleep" :
        "Helper washes and sterilises bottles and baby laundry"
      );
    },
  },

  {
    id: "child_school",
    section: 3,
    sectionLabel: "Child",
    text: "What is your child's school schedule?",
    options: [
      { value: "fullday", emoji: "🏫", label: "Full-day school" },
      { value: "halfday", emoji: "🏫", label: "Half-day school" },
      { value: "none",    emoji: "🏠", label: "Not in school" },
    ],
    showIf: (_, m) => hasChild(m),
    toLines: (a) =>
      a === "fullday" ? ["Child attends full-day school"] :
      a === "halfday" ? ["Child attends half-day school — home by early afternoon"] :
                        ["Child not in school — home full-time"],
  },

  {
    id: "child_afterschool",
    section: 3,
    sectionLabel: "Child",
    text: "Does your child need after-school care?",
    options: [
      { value: "full",        emoji: "👀", label: "Full supervision" },
      { value: "some",        emoji: "🔁", label: "Some supervision" },
      { value: "independent", emoji: "👍", label: "Independent" },
    ],
    showIf: (a, m) => hasChild(m) && a.child_school !== "none",
    toLines: (a) =>
      a === "full"        ? ["Child needs full supervision after school"] :
      a === "some"        ? ["Check in on child periodically after school"] :
                            ["Child is independent after school"],
  },

  {
    id: "teen_help",
    section: 3,
    sectionLabel: "Teen",
    text: "Does your teen need help with anything?",
    options: [
      { value: "meals",   emoji: "🍽️", label: "Meals" },
      { value: "laundry", emoji: "🧺", label: "Laundry" },
      { value: "privacy", emoji: "🚪", label: "Privacy — minimal involvement" },
      { value: "none",    emoji: "❌", label: "No help needed" },
    ],
    multi: true,
    showIf: (_, m) => hasTeen(m),
    toLines: (a) => {
      const arr = a as string[];
      if (arr.includes("none"))    return ["Teen needs no helper assistance"];
      if (arr.includes("privacy")) return ["Minimal involvement with teen — respect privacy"];
      return arr.map(v =>
        v === "meals"   ? "Prepare meals for teen" :
        v === "laundry" ? "Laundry for teen" :
        ""
      ).filter(Boolean);
    },
  },

  {
    id: "elderly_care",
    section: 3,
    sectionLabel: "Elderly",
    text: "What level of care does your elderly family member need?",
    options: [
      { value: "independent", emoji: "👍",    label: "Independent" },
      { value: "some",        emoji: "🤝",    label: "Some help" },
      { value: "full",        emoji: "🧑‍⚕️", label: "Full care" },
    ],
    showIf: (_, m) => hasElderly(m),
    toLines: (a) =>
      a === "independent" ? ["Elderly family member is largely independent"] :
      a === "some"        ? ["Elderly family member needs daily assistance"] :
                            ["Elderly family member requires full-time care"],
  },

  {
    id: "elderly_medication",
    section: 3,
    sectionLabel: "Elderly",
    text: "Does the helper need to manage medication?",
    options: [
      { value: "fixed",    emoji: "💊", label: "Yes — fixed times",    sub: "Must not be missed" },
      { value: "flexible", emoji: "💊", label: "Yes — flexible timing" },
      { value: "no",       emoji: "❌", label: "No" },
    ],
    showIf: (_, m) => hasElderly(m),
    toLines: (a) =>
      a === "fixed"    ? ["Medication at fixed times — do not miss or delay"] :
      a === "flexible" ? ["Assist elderly member with daily medication"] :
                         [],
  },

  {
    id: "pets_walks",
    section: 3,
    sectionLabel: "Pets",
    text: "How many walks does your pet need per day?",
    options: [
      { value: "0", emoji: "🏠", label: "0 — indoor only" },
      { value: "1", emoji: "🚶", label: "1 walk" },
      { value: "2", emoji: "🚶", label: "2 walks" },
      { value: "3", emoji: "🚶", label: "3+ walks" },
    ],
    showIf: (_, m) => hasPets(m),
    toLines: (a) =>
      a === "0" ? ["Pet is indoor only — no walks needed"] :
      [`Walk pet ${a === "1" ? "once" : a === "2" ? "twice" : "3+"} daily`],
  },

  // ── Section 4: Preferences & Constraints ────────────────────────────────

  {
    id: "priority",
    section: 4,
    sectionLabel: "Preferences",
    text: "What should the helper prioritise when things overlap?",
    options: [
      { value: "childcare", emoji: "👶", label: "Childcare first" },
      { value: "meals",     emoji: "🍽️", label: "Meals first" },
      { value: "cleaning",  emoji: "🧹", label: "Cleaning first" },
      { value: "balance",   emoji: "⚖️", label: "Balance everything equally" },
    ],
    toLines: (a) => {
      const map: Record<string, string> = {
        "childcare": "Top priority: childcare over cleaning or errands",
        "meals":     "Top priority: meals ready on time over other tasks",
        "cleaning":  "Top priority: keep home clean and tidy",
        "balance":   "Balance all tasks equally — no single priority",
      };
      return [map[a as string]];
    },
  },

  {
    id: "cleaning_standard",
    section: 4,
    sectionLabel: "Preferences",
    text: "What cleaning standard do you expect?",
    options: [
      { value: "light",    emoji: "✨", label: "Light",    sub: "Tidy and presentable" },
      { value: "moderate", emoji: "🧼", label: "Moderate", sub: "Clean and organised" },
      { value: "high",     emoji: "🧽", label: "High",     sub: "Spotless and thorough" },
    ],
    toLines: (a) => {
      const map: Record<string, string> = {
        "light":    "Cleaning standard: light — tidy and presentable daily",
        "moderate": "Cleaning standard: moderate — clean and organised throughout",
        "high":     "Cleaning standard: high — spotless and thorough",
      };
      return [map[a as string]];
    },
  },
];

// ── Section metadata ──────────────────────────────────────────────────────────

const SECTION_META: Record<number, { label: string; emoji: string }> = {
  1: { label: "Household Setup",  emoji: "🏠" },
  2: { label: "Daily Anchors",    emoji: "⏰" },
  3: { label: "Dependents",       emoji: "👨‍👩‍👧" },
  4: { label: "Preferences",      emoji: "⚖️" },
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function buildHouseholdRoutine(questions: Question[], answers: Answers): string {
  return questions
    .filter(q => !q.showIf || q.showIf(answers, []))
    .flatMap(q => {
      const ans = answers[q.id];
      if (!ans || (Array.isArray(ans) && ans.length === 0)) return [];
      return q.toLines(ans);
    })
    .filter(Boolean)
    .join("\n");
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Step4Props {
  members: HouseholdMember[];
  memberRoutines: Record<string, string>;
  memberQuietHours: Record<string, string>;
  setupFor: SetupFor | null;
  showReward: boolean;
  onUpdate: (routines: Record<string, string>, schedules?: unknown) => void;
  onQuietHoursUpdate: (quietHours: Record<string, string>) => void;
  onComplete: (householdRoutine: string) => void;
  onDismissReward: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Step4DailyLife({
  members,
  onComplete,
  onDismissReward,
}: Step4Props) {
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers]         = useState<Answers>({});

  // Build visible question list based on current answers + members
  const visibleQuestions = useMemo(
    () => ALL_QUESTIONS.filter(q => !q.showIf || q.showIf(answers, members)),
    [answers, members]
  );

  const currentQ    = visibleQuestions[questionIdx] ?? visibleQuestions[0];
  const currentAns  = answers[currentQ?.id];
  const hasAnswer   = Array.isArray(currentAns) ? currentAns.length > 0 : !!currentAns;
  const canContinue = hasAnswer || !!currentQ?.skippable;
  const isLast      = questionIdx >= visibleQuestions.length - 1;

  // Section progress
  const currentSection = currentQ?.section ?? 1;
  const sections = [1, 2, 3, 4].filter(s =>
    s !== 3 || ALL_QUESTIONS.some(q => q.section === 3 && (!q.showIf || q.showIf(answers, members)))
  );

  function toggleAnswer(value: string) {
    setAnswers(prev => {
      const q = currentQ;
      const existing = prev[q.id];
      let updated: string | string[];
      if (q.multi) {
        const arr = (existing as string[] | undefined) ?? [];
        updated = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      } else {
        updated = value;
      }
      return { ...prev, [q.id]: updated };
    });
  }

  function handleContinue() {
    if (isLast) {
      const routine = buildHouseholdRoutine(visibleQuestions, answers);
      onComplete(routine);
    } else {
      setQuestionIdx(i => i + 1);
    }
  }

  function handleBack() {
    if (questionIdx === 0) {
      onDismissReward();
    } else {
      setQuestionIdx(i => i - 1);
    }
  }

  const isSelected = (value: string) => {
    if (!currentAns) return false;
    return Array.isArray(currentAns) ? currentAns.includes(value) : currentAns === value;
  };

  if (!currentQ) return null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-10rem)]">

      {/* Section progress */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          {sections.map(s => {
            const meta    = SECTION_META[s];
            const isDone  = s < currentSection;
            const isActive = s === currentSection;
            return (
              <div
                key={s}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-300 flex-shrink-0",
                  isActive ? "border-primary bg-primary/5 text-primary" :
                  isDone   ? "border-green-200 bg-green-50 text-green-600" :
                             "border-gray-200 bg-gray-50 text-gray-400"
                )}
              >
                <span>{meta.emoji}</span>
                {(isActive || isDone) && <span>{meta.label}</span>}
                {isDone && <Check className="w-3 h-3" />}
              </div>
            );
          })}
        </div>

        {/* Question progress bar within current section */}
        <div className="flex items-center gap-3">
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
