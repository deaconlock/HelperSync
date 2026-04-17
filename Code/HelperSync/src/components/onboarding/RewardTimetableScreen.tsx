"use client";

import { useMemo } from "react";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { WizardData } from "@/app/onboarding/employer/page";
import { HouseholdMember } from "@/types/household";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type TaskCategory = "cooking" | "cleaning" | "laundry" | "care" | "break" | "prep" | "walk";

interface DraftTask {
  time: number;        // minutes from midnight
  label: string;
  category: TaskCategory;
  room?: string;
  hint?: string;       // reasoning hint shown under label
  soft?: boolean;      // if true, show softLabel instead of precise time
  softLabel?: string;  // e.g. "Morning", "Afternoon"
}

// ── Category styles ────────────────────────────────────────────────────────────

const CAT: Record<TaskCategory, { bg: string; text: string; border: string; emoji: string }> = {
  cooking:  { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200", emoji: "🍳" },
  cleaning: { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",   emoji: "🧹" },
  laundry:  { bg: "bg-cyan-50",    text: "text-cyan-700",    border: "border-cyan-200",   emoji: "👕" },
  care:     { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200", emoji: "🤝" },
  break:    { bg: "bg-gray-50",    text: "text-gray-400",    border: "border-gray-200",   emoji: "☕" },
  prep:     { bg: "bg-green-50",   text: "text-green-700",   border: "border-green-200",  emoji: "✅" },
  walk:     { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200",emoji: "🐾" },
};

// ── Time helpers ───────────────────────────────────────────────────────────────

const T = (h: number, m = 0) => h * 60 + m;

function fmt(mins: number): string {
  const h  = Math.floor(mins / 60) % 24;
  const m  = mins % 60;
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function fmtHint(mins: number): string {
  const h  = Math.floor(mins / 60) % 24;
  const m  = mins % 60;
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${m.toString().padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
}

// ── Member helpers ─────────────────────────────────────────────────────────────

function hasBaby(members: HouseholdMember[])    { return members.some(m => m.role === "Child" && m.age === 0); }
function hasChild(members: HouseholdMember[])   { return members.some(m => m.role === "Child" && (m.age ?? 0) > 0 && m.age !== 15); }
function hasElderly(members: HouseholdMember[]) { return members.some(m => m.role === "Elderly"); }
function hasPets(members: HouseholdMember[])    { return members.some(m => m.role === "Pets"); }

// ── Intelligence line ──────────────────────────────────────────────────────────

function buildIntelligenceLine(
  answers: Record<string, string | string[]>,
  members: HouseholdMember[],
): string {
  const parts: string[] = [];
  if (hasBaby(members) || hasChild(members)) parts.push("childcare needs");
  if (hasElderly(members)) parts.push("elderly care");
  if (hasPets(members)) parts.push("your pet's routine");
  if ((answers.dinner_time as string) >= "1830") parts.push("late evenings");
  if (answers.leave_time === "700") parts.push("early mornings");

  if (parts.length === 0) return "Balances cleaning and meals across your day";
  return `Built around your ${parts.slice(0, 2).join(" and ")}`;
}

// ── Draft builder ──────────────────────────────────────────────────────────────

function buildDraft(
  answers: Record<string, string | string[]>,
  members: HouseholdMember[],
  rooms: string[],
  homeSize: "compact" | "midsize" | "spacious",
): DraftTask[] {
  const helperStart = answers.helper_hours === "630_830" ? T(6, 30) : T(7, 0);

  const leaveMap: Record<string, number> = {
    "700": T(7, 15), "800": T(8, 0), "900": T(9, 0), "1000": T(10, 0),
  };
  const leave: number | null =
    !answers.leave_time || answers.leave_time === "home"
      ? null
      : (leaveMap[answers.leave_time as string] ?? T(8, 0));

  const dinnerMap: Record<string, number> = {
    "1800": T(18, 0), "1830": T(18, 30), "1900": T(19, 0),
    "1930": T(19, 30), "2000": T(20, 0),
  };
  const dinner = dinnerMap[answers.dinner_time as string] ?? T(19, 0);

  const petWalks = hasPets(members) ? parseInt(String(answers.pets_walks ?? "2"), 10) : 0;

  const r = rooms.map(x => x.toLowerCase());
  const hasKitchen  = r.some(x => x.includes("kitchen"));
  const hasBath     = r.some(x => x.includes("bathroom"));
  const hasLiving   = r.some(x => x.includes("living"));
  const hasBedrooms = r.some(x => x.includes("bedroom"));

  const tasks: DraftTask[] = [];

  // ── Morning ────────────────────────────────────────────────
  tasks.push({
    time: helperStart,
    label: "Morning kitchen setup & breakfast prep",
    category: "cooking",
    room: hasKitchen ? "Kitchen" : undefined,
    hint: `Based on your ${fmtHint(helperStart)} start`,
  });
  if (hasBaby(members))    tasks.push({ time: helperStart + 10, label: "Morning baby feed & settle",   category: "care",    hint: "Based on your baby's routine" });
  if (hasElderly(members)) tasks.push({ time: helperStart + 15, label: "Assist with morning routine",  category: "care" });
  if (petWalks >= 1)       tasks.push({ time: helperStart + 20, label: "Morning pet walk",             category: "walk",    hint: "Based on your pets" });
  if (hasChild(members) && leave)
    tasks.push({ time: leave - 25, label: "School run prep", category: "prep", hint: "Based on your morning schedule" });

  // ── Cleaning block ─────────────────────────────────────────
  const cleanStart = leave ? leave + 15 : helperStart + 75;
  if (hasBedrooms) tasks.push({ time: cleanStart,      label: "Bedrooms — make beds & tidy",  category: "cleaning", room: "Bedrooms" });
  if (hasLiving)   tasks.push({ time: cleanStart + 40, label: "Living room — dust & vacuum",   category: "cleaning", room: "Living Room" });
  tasks.push({
    time: cleanStart + (homeSize === "compact" ? 60 : 80),
    label: "Floors & common areas",
    category: "cleaning",
    soft: true,
    softLabel: "Midday",
  });

  // ── Laundry ────────────────────────────────────────────────
  tasks.push({
    time: cleanStart + 30,
    label: "Laundry — wash & hang",
    category: "laundry",
    soft: true,
    softLabel: "Morning",
  });

  // ── Midday ─────────────────────────────────────────────────
  tasks.push({ time: T(12, 0),  label: "Lunch prep & serve",  category: "cooking" });
  tasks.push({ time: T(12, 30), label: "Helper lunch break",  category: "break" });

  // ── Afternoon ──────────────────────────────────────────────
  if (hasBaby(members)) tasks.push({ time: T(14, 0), label: "Afternoon baby feed", category: "care", hint: "Based on your baby's routine" });
  tasks.push({
    time: T(14, 15),
    label: "Ironing & folding",
    category: "laundry",
    soft: true,
    softLabel: "Afternoon",
  });
  if (hasBath) tasks.push({
    time: T(15, 0),
    label: "Bathroom clean",
    category: "cleaning",
    room: "Bathrooms",
    soft: true,
    softLabel: "Afternoon",
  });
  if (petWalks >= 2) tasks.push({ time: T(16, 30), label: "Evening pet walk", category: "walk", hint: "Based on your pets" });

  // ── Evening ────────────────────────────────────────────────
  tasks.push({
    time: dinner - 75,
    label: "Dinner prep",
    category: "cooking",
    room: hasKitchen ? "Kitchen" : undefined,
    hint: `Planned around your ${fmtHint(dinner)} dinner`,
  });
  tasks.push({ time: dinner,      label: "Dinner served",                     category: "cooking" });
  tasks.push({ time: dinner + 30, label: "Kitchen & dining cleanup",           category: "cleaning", room: hasKitchen ? "Kitchen" : undefined });
  tasks.push({ time: dinner + 60, label: "Evening reset & prep for tomorrow",  category: "prep" });

  return tasks
    .filter(task => task.time >= helperStart)
    .sort((a, b) => a.time - b.time);
}

// ── Summary facts ──────────────────────────────────────────────────────────────

function buildFacts(data: WizardData): { emoji: string; label: string }[] {
  const a = data.dailyLifeAnswers ?? {};
  const facts: { emoji: string; label: string }[] = [];

  const sizeLabel = { compact: "Compact", midsize: "Mid-size", spacious: "Spacious" }[data.homeSize];
  facts.push({ emoji: "🏠", label: `${sizeLabel} · ${data.rooms.length} area${data.rooms.length !== 1 ? "s" : ""}` });

  const adults  = data.members.filter(m => ["Me", "Spouse", "Relative"].includes(m.role ?? "")).length;
  const kids    = data.members.filter(m => m.role === "Child").length;
  const elderly = data.members.filter(m => m.role === "Elderly").length;
  const pets    = data.members.filter(m => m.role === "Pets").length;
  const parts   = [
    adults  > 0 && `${adults} adult${adults > 1 ? "s" : ""}`,
    kids    > 0 && `${kids} child${kids > 1 ? "ren" : ""}`,
    elderly > 0 && `${elderly} elderly`,
    pets    > 0 && `${pets} pet${pets > 1 ? "s" : ""}`,
  ].filter(Boolean) as string[];
  if (parts.length) facts.push({ emoji: "👥", label: parts.join(" · ") });

  const hoursLabel: Record<string, string> = {
    "630_830":  "Helper 6:30 AM – 8:30 PM",
    "700_900":  "Helper 7:00 AM – 9:00 PM",
    "700_1000": "Helper 7:00 AM – 10:00 PM",
  };
  if (a.helper_hours) facts.push({ emoji: "⏰", label: hoursLabel[a.helper_hours as string] ?? "Working hours set" });

  return facts;
}

// ── Ghost card ─────────────────────────────────────────────────────────────────

function GhostCard({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-[52px] flex-shrink-0 pt-2.5">
        <div className="h-2 w-8 bg-gray-200 rounded" />
      </div>
      <div className="flex-shrink-0 pt-3">
        <div className="w-2 h-2 rounded-full bg-gray-200" />
      </div>
      <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50">
        <div className="w-5 h-5 rounded-full bg-gray-200 flex-shrink-0" />
        <div className={cn("h-2 bg-gray-200 rounded", wide ? "w-3/4" : "w-1/2")} />
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  data: WizardData;
  onContinue: () => void;
  onBack?: () => void;
}

export function RewardTimetableScreen({ data, onContinue, onBack }: Props) {
  const answers = data.dailyLifeAnswers ?? {};

  const tasks = useMemo(
    () => buildDraft(answers, data.members, data.rooms, data.homeSize),
    [answers, data.members, data.rooms, data.homeSize],
  );

  const facts = useMemo(() => buildFacts(data), [data]);
  const intelligenceLine = useMemo(() => buildIntelligenceLine(answers, data.members), [answers, data.members]);

  const homeName = data.homeName || "your home";

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background px-6 pt-8 pb-8">
        <div className="text-3xl mb-3">✨</div>
        <h1 className="text-2xl font-display font-bold text-gray-900 leading-snug mb-2">
          Your Monday, planned
        </h1>
        <p className="text-sm text-text-secondary mb-5">
          Built around your {homeName} routine
        </p>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          {facts.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-border text-xs font-medium text-gray-700"
            >
              <span>{f.emoji}</span>
              <span>{f.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Intelligence line ── */}
      <p className="text-xs text-gray-400 italic px-6 pt-4 pb-1">{intelligenceLine}</p>

      {/* ── Timeline ── */}
      <div className="flex-1 px-6 pb-2 overflow-y-auto">
        <div className="relative">
          <div className="absolute left-[52px] top-0 bottom-0 w-px bg-gray-100" />

          <div className="space-y-2">
            {tasks.map((task, i) => {
              const cfg = CAT[task.category];
              return (
                <div key={i} className="flex items-start gap-3">
                  {/* Time */}
                  <div className="w-[52px] flex-shrink-0 pt-2.5">
                    <span className="text-[10px] font-medium text-gray-400 leading-none">
                      {task.soft ? task.softLabel : fmt(task.time)}
                    </span>
                  </div>

                  {/* Dot */}
                  <div className="flex-shrink-0 pt-3 z-10">
                    <div className={cn("w-2 h-2 rounded-full", cfg.bg, "border", cfg.border)} />
                  </div>

                  {/* Card */}
                  <div className={cn(
                    "flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border text-sm",
                    cfg.bg, cfg.border,
                  )}>
                    <span className="text-base leading-none flex-shrink-0">{cfg.emoji}</span>
                    <div className="min-w-0">
                      <p className={cn("font-medium text-xs leading-snug", cfg.text)}>{task.label}</p>
                      {task.room && !task.hint && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{task.room}</p>
                      )}
                      {task.hint && (
                        <p className="text-[10px] text-primary/60 mt-0.5">{task.hint}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Peek + lock (Tue–Sun) ── */}
      <div className="relative overflow-hidden px-6 mt-2" style={{ minHeight: 110 }}>
        {/* Ghost cards */}
        <div className="space-y-2 blur-sm opacity-30 pointer-events-none select-none">
          <GhostCard wide />
          <GhostCard />
        </div>
        {/* Gradient fade + overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white flex flex-col items-center justify-end pb-3 gap-1">
          <Lock className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-semibold text-gray-800">Unlock your full week</p>
          <p className="text-xs text-gray-400 text-center px-8">AI-generated schedule across all 7 days</p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-6 pb-8 pt-4 border-t border-border bg-background">
        <button
          onClick={onContinue}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gray-900 text-white font-semibold text-base hover:bg-gray-800 transition-colors"
        >
          Get my full schedule
          <ArrowRight className="w-4 h-4" />
        </button>
        {onBack && (
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
