"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowRight,
  Loader2,
  Camera,
  CheckCircle,
  Pencil,
  HelpCircle,
  X as XIcon,
} from "lucide-react";
import {
  DayTasks,
  TaskItem,
  DAYS_OF_WEEK,
  DAY_LABELS,
  DayOfWeek,
} from "@/types/timetable";
import { DayTimelineView } from "@/components/timetable/DayTimelineView";
import { AddTaskDialog } from "@/components/timetable/AddTaskDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// --- Types ---

interface WizardContext {
  homeName?: string;
  rooms: string[];
  members: Array<{ name: string; role: string; age?: number }>;
  helperDetails: { name: string; nationality: string; language: string } | null;
  memberRoutines: Record<string, string>;
  memberSchedules: Record<string, unknown>;
  priorities: string[];
  helperExperience: string | null;
  helperPace?: string;
  homeSize?: string;
  deepCleanTasks?: string[];
}

interface Step9Props {
  weeklyTasks: DayTasks[];
  rooms: string[];
  onUpdate: (tasks: DayTasks[]) => void;
  onComplete: () => void | Promise<void>;
  wizardData: WizardContext;
}

interface SlideData {
  id: string;
  emoji: string;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
  bgClass: string;
}

type Phase = "slideshow" | "editor";

const REFINE_STEPS = [
  "Reading your feedback...",
  "Adjusting task priorities...",
  "Rescheduling time slots...",
  "Rebalancing room coverage...",
  "Optimizing the new plan...",
  "Finalizing changes...",
];

// --- Help Tooltip ---

function HelpTooltip({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Hide help" : "Show help"}
        aria-expanded={open}
        className="text-white/50 hover:text-white/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-full"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute left-6 top-0 z-50 w-64 rounded-xl bg-white/95 text-gray-700 text-xs shadow-xl p-3 leading-relaxed"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close help"
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            <XIcon className="w-3 h-3" />
          </button>
          {content}
        </div>
      )}
    </div>
  );
}

// --- Helpers ---

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatFrequency(count: number): string {
  if (count >= 7) return "Daily";
  if (count >= 5) return `${count}x/week`;
  if (count >= 3) return `${count}x/week`;
  if (count === 2) return "2x/week";
  if (count === 1) return "Weekly";
  return "";
}

function getCoverageVerdict(
  actual: number,
  total: number
): { label: string; status: "full" | "partial" | "none" } {
  if (actual >= total) return { label: "Every day", status: "full" };
  if (actual >= Math.ceil(total * 0.5))
    return { label: `${actual} of ${total} days`, status: "partial" };
  return { label: "Not scheduled", status: "none" };
}

const STATUS_COLORS = {
  full: "text-emerald-300",
  partial: "text-amber-300",
  none: "text-white/40",
} as const;

const GLASS_CARD = "backdrop-blur-sm bg-white/10 border border-white/20 rounded-2xl p-4";

function StaggerChild({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

function CoverageBadge({ label, met }: { label: string; met: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-white/90">
      {met ? (
        <CheckCircle className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
      ) : (
        <div className="w-3.5 h-3.5 rounded-full border border-white/30 flex-shrink-0" />
      )}
      {label}
    </span>
  );
}

function TruncatedPills({ items, max = 4 }: { items: string[]; max?: number }) {
  const shown = items.slice(0, max);
  const remaining = items.length - max;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((name) => (
        <span
          key={name}
          className="px-2.5 py-1 backdrop-blur-sm bg-white/10 border border-white/15 rounded-lg text-xs text-white/90"
        >
          {name}
        </span>
      ))}
      {remaining > 0 && (
        <span className="px-2.5 py-1 text-xs text-white/40">+{remaining} more</span>
      )}
    </div>
  );
}

// --- Slide Builder ---

function SlideFeedbackInput({
  slideId,
  categoryFeedback,
  onCategoryFeedbackChange,
  placeholder,
}: {
  slideId: string;
  categoryFeedback: Record<string, string>;
  onCategoryFeedbackChange: (id: string, value: string) => void;
  placeholder: string;
}) {
  const value = categoryFeedback[slideId] ?? "";
  const hasContent = value.trim().length > 0;
  const [isExpanded, setIsExpanded] = useState(hasContent);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) inputRef.current.focus();
  }, [isExpanded]);

  return (
    <StaggerChild delay={0.5}>
      <div className="border-t border-white/10 pt-4 mt-6">
        <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-2">
          Any feedback for this plan?
        </p>
        <motion.div
          onClick={() => { if (!isExpanded) setIsExpanded(true); }}
          className={cn(
            "flex items-center gap-2.5 border cursor-pointer overflow-hidden",
            isExpanded
              ? "bg-white/15 border-white/25 px-3 py-2.5"
              : "bg-white/10 border-white/20 px-4 py-2"
          )}
          animate={{
            borderRadius: isExpanded ? 12 : 9999,
          }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          {/* Icon crossfade */}
          <AnimatePresence mode="wait" initial={false}>
            {hasContent ? (
              <motion.div
                key="check"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
              </motion.div>
            ) : (
              <motion.div
                key="pencil"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <Pencil className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content crossfade: hint label ↔ text input */}
          <AnimatePresence mode="wait" initial={false}>
            {!isExpanded ? (
              <motion.span
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-xs text-white/50 truncate select-none"
              >
                {placeholder}
              </motion.span>
            ) : (
              <motion.div
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={value}
                  onChange={(e) => onCategoryFeedbackChange(slideId, e.target.value)}
                  placeholder={placeholder}
                  onBlur={() => { if (!value.trim()) setIsExpanded(false); }}
                  className="w-full bg-transparent text-xs text-white placeholder:text-white/40 outline-none"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </StaggerChild>
  );
}

function buildSlides(
  tasks: DayTasks[],
  wizardData: WizardContext,
  categoryFeedback: Record<string, string>,
  onCategoryFeedbackChange: (id: string, value: string) => void,
  hasRefined: boolean
): SlideData[] {
  const allTasks = tasks.flatMap((d) => d.tasks);
  const slides: SlideData[] = [];

  // ---- Shared analysis ----
  const activeTasks = allTasks.filter((t) => t.category !== "Break");
  const mealTasks = allTasks.filter((t) => t.category === "Meal Prep");
  const choreTasks = allTasks.filter((t) => t.category === "Household Chores");
  const babyTasks = allTasks.filter((t) => t.category === "Baby Care");
  const elderlyTasks = allTasks.filter((t) => t.category === "Elderly Care");
  const errandTasks = allTasks.filter((t) => t.category === "Errands");
  const uniqueRooms = [...new Set(activeTasks.map((t) => t.area).filter(Boolean))];
  const breakCount = allTasks.length - activeTasks.length;
  const careCount = babyTasks.length + elderlyTasks.length;

  // Coverage scoring
  const hasMeals = mealTasks.length > 0;
  const hasChores = choreTasks.length > 0;

  // Hero stats for overview
  const heroStats: { emoji: string; value: number; label: string }[] = [];
  if (mealTasks.length > 0) heroStats.push({ emoji: "🍳", value: mealTasks.length, label: "Meals Planned" });
  heroStats.push({ emoji: "🏠", value: uniqueRooms.length, label: "Rooms Covered" });
  if (careCount > 0) heroStats.push({ emoji: "💛", value: careCount, label: "Care Sessions" });
  if (breakCount > 0) heroStats.push({ emoji: "☕", value: breakCount, label: "Rest Breaks" });
  if (errandTasks.length > 0 && heroStats.length < 4) heroStats.push({ emoji: "🛍️", value: errandTasks.length, label: "Errands Scheduled" });

  // ---- SLIDE 1: Overview ----
  slides.push({
    id: "overview",
    emoji: "✨",
    title: wizardData.homeName ? `${wizardData.homeName}'s timetable is ready` : "Your timetable is ready",
    subtitle: "Personalized for your household",
    bgClass: "bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900",
    content: (
      <div className="space-y-7 text-white">
        <StaggerChild delay={0.1}>
          <div className={cn(
            "grid gap-4",
            heroStats.length <= 2 ? "grid-cols-2" : heroStats.length === 3 ? "grid-cols-3" : "grid-cols-2"
          )}>
            {heroStats.map((stat, i) => (
              <div key={i} className="text-center bg-white/5 rounded-2xl py-4 px-2 border border-white/10">
                <span className="text-2xl">{stat.emoji}</span>
                <p className="text-2xl font-display font-bold text-white mt-1">{stat.value}</p>
                <p className="text-[10px] text-white/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </StaggerChild>

        <StaggerChild delay={0.3}>
          <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center">
            {[
              hasMeals && { key: "meals", label: "Meals covered" },
              hasChores && { key: "chores", label: "Daily cleaning" },
              babyTasks.length > 0 && { key: "baby", label: "Child care" },
              elderlyTasks.length > 0 && { key: "elderly", label: "Elderly care" },
            ]
              .filter((x): x is { key: string; label: string } => !!x)
              .map((badge) => (
                <CoverageBadge key={badge.key} label={badge.label} met />
              ))}
          </div>
        </StaggerChild>
      </div>
    ),
  });

  // ---- SLIDE 2: Meals & Cooking ----
  if (mealTasks.length > 0) {
    const breakfastDays = new Set(
      tasks.filter((d) => d.tasks.some((t) => t.category === "Meal Prep" && timeToMinutes(t.time) < 660)).map((d) => d.day)
    ).size;
    const lunchDays = new Set(
      tasks.filter((d) => d.tasks.some((t) => {
        const m = timeToMinutes(t.time);
        return t.category === "Meal Prep" && m >= 660 && m < 900;
      })).map((d) => d.day)
    ).size;
    const dinnerDays = new Set(
      tasks.filter((d) => d.tasks.some((t) => t.category === "Meal Prep" && timeToMinutes(t.time) >= 900)).map((d) => d.day)
    ).size;
    const snackCount = mealTasks.filter((t) => {
      const m = timeToMinutes(t.time);
      return (m >= 540 && m < 660) || (m >= 840 && m < 960);
    }).length;

    const bVerdict = getCoverageVerdict(breakfastDays, 7);
    const lVerdict = getCoverageVerdict(lunchDays, 7);
    const dVerdict = getCoverageVerdict(dinnerDays, 7);

    // Hero verdict
    const allMealsFull = bVerdict.status === "full" && dVerdict.status === "full";
    const mealHero = allMealsFull
      ? "Full meal coverage"
      : bVerdict.status === "full"
        ? "Breakfast every day, dinner most days"
        : "Meals scheduled throughout the week";

    const uniqueMealNames = [...new Set(mealTasks.map((t) => t.taskName))];

    const mealRows: Array<{ emoji: string; name: string; verdict: { label: string; status: "full" | "partial" | "none" } }> = [
      { emoji: "🌅", name: "Breakfast", verdict: bVerdict },
      { emoji: "☀️", name: "Lunch", verdict: lVerdict },
      { emoji: "🌙", name: "Dinner", verdict: dVerdict },
    ];
    if (snackCount > 0) mealRows.push({ emoji: "🍪", name: "Snacks & prep", verdict: { label: `${snackCount}x/week`, status: snackCount >= 5 ? "full" : "partial" } });

    slides.push({
      id: "meals",
      emoji: "🍳",
      title: mealHero,
      subtitle: "Breakfast through dinner",
      bgClass: "bg-gradient-to-br from-amber-600 via-orange-500 to-rose-500",
      content: (
        <div className="space-y-6 text-white">
          <StaggerChild delay={0.1}>
            <div className="space-y-2.5">
              {mealRows.map((row) => (
                <div key={row.name} className={cn(GLASS_CARD, "flex items-center justify-between !p-3")}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{row.emoji}</span>
                    <span className="text-sm font-medium text-white/90">{row.name}</span>
                  </div>
                  <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", STATUS_COLORS[row.verdict.status])}>
                    {row.verdict.status === "full" && <CheckCircle className="w-3.5 h-3.5" />}
                    {row.verdict.label}
                  </span>
                </div>
              ))}
            </div>
          </StaggerChild>

          <StaggerChild delay={0.3}>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">What&apos;s cooking</p>
              <TruncatedPills items={uniqueMealNames} max={4} />
            </div>
          </StaggerChild>

          {!hasRefined && (
            <SlideFeedbackInput
              slideId="meals"
              categoryFeedback={categoryFeedback}
              onCategoryFeedbackChange={onCategoryFeedbackChange}
              placeholder={
                lVerdict.status === "none"
                  ? `No lunch scheduled yet — want to add it?`
                  : lVerdict.status === "partial"
                    ? `Lunch only covered ${lunchDays} of 7 days — want more?`
                    : bVerdict.status === "partial"
                      ? `Add breakfast on more days?`
                      : `All meals covered — adjust timing or dishes?`
              }
            />
          )}
        </div>
      ),
    });
  }

  // ---- SLIDE 3: Home & Cleaning ----
  if (choreTasks.length > 0) {
    const roomDays: Record<string, Set<string>> = {};
    tasks.forEach((d) => {
      d.tasks
        .filter((t) => t.category === "Household Chores")
        .forEach((t) => {
          if (!roomDays[t.area]) roomDays[t.area] = new Set();
          roomDays[t.area].add(d.day);
        });
    });

    const roomFrequencies = Object.entries(roomDays)
      .map(([room, days]) => ({ room, count: days.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const allRoomsScheduled = roomFrequencies.length >= uniqueRooms.length;
    const hasWeekendDeepClean = tasks
      .filter((d) => d.day === "saturday" || d.day === "sunday")
      .some((d) => d.tasks.some((t) => t.category === "Household Chores" && (t.duration ?? 30) >= 45));

    const choreHero = allRoomsScheduled
      ? "Every room has a cleaning schedule"
      : `${roomFrequencies.length} rooms covered`;

    const uniqueChoreNames = [...new Set(choreTasks.map((t) => t.taskName))];

    slides.push({
      id: "chores",
      emoji: "🧹",
      title: choreHero,
      subtitle: `${choreTasks.length} cleaning tasks weekly`,
      bgClass: "bg-gradient-to-br from-slate-700 via-slate-600 to-cyan-800",
      content: (
        <div className="space-y-6 text-white">
          <StaggerChild delay={0.1}>
            <div className="grid grid-cols-2 gap-2.5">
              {roomFrequencies.map(({ room, count }) => (
                <div key={room} className={cn(GLASS_CARD, "!p-3 flex items-center gap-2.5")}>
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      count >= 7 ? "bg-emerald-400" : count >= 3 ? "bg-amber-400" : "bg-white/40"
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/90 truncate">{room}</p>
                    <p className="text-[10px] text-white/50">{formatFrequency(count)}</p>
                  </div>
                </div>
              ))}
            </div>
          </StaggerChild>

          <StaggerChild delay={0.3}>
            {hasWeekendDeepClean && (
              <div className={cn(GLASS_CARD, "!p-3 flex items-center gap-2")}>
                <Sparkles className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />
                <span className="text-xs text-white/80">Weekend deep clean included</span>
              </div>
            )}
          </StaggerChild>

          <StaggerChild delay={0.4}>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Tasks covered</p>
              <TruncatedPills items={uniqueChoreNames} max={4} />
            </div>
          </StaggerChild>

          {!hasRefined && (
            <SlideFeedbackInput
              slideId="chores"
              categoryFeedback={categoryFeedback}
              onCategoryFeedbackChange={onCategoryFeedbackChange}
              placeholder={
                !hasWeekendDeepClean
                  ? "No weekend deep clean — want to add one?"
                  : roomFrequencies.some(({ count }) => count <= 1)
                    ? `${roomFrequencies.find(({ count }) => count <= 1)!.room} is only cleaned weekly — increase?`
                    : "Every room scheduled — adjust frequency or focus areas?"
              }
            />
          )}
        </div>
      ),
    });
  }

  // ---- SLIDE 4: Baby/Child Care ----
  const children = wizardData.members.filter((m) => m.role === "Child");
  if (babyTasks.length > 0) {
    const childNames = children.map((c) => c.name).filter(Boolean);
    const perDay = Math.round(babyTasks.length / 7);
    const photoRequired = babyTasks.filter((t) => t.requiresPhoto).length;

    const morningActivities = [...new Set(
      babyTasks.filter((t) => timeToMinutes(t.time) < 720).map((t) => t.taskName)
    )].slice(0, 3);
    const afternoonActivities = [...new Set(
      babyTasks.filter((t) => timeToMinutes(t.time) >= 720).map((t) => t.taskName)
    )].slice(0, 3);

    const babyHero = childNames.length > 0
      ? `${perDay} activities daily for ${childNames.join(" & ")}`
      : `${perDay} care activities every day`;

    slides.push({
      id: "baby",
      emoji: "🍼",
      title: babyHero,
      subtitle: children.length > 0
        ? children.map((c) => `${c.name}${c.age ? ` (${c.age}y)` : ""}`).join(", ")
        : undefined,
      bgClass: "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600",
      content: (
        <div className="space-y-6 text-white">
          <StaggerChild delay={0.1}>
            <div className="grid grid-cols-2 gap-3">
              <div className={GLASS_CARD}>
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-2">Morning</p>
                <div className="space-y-1.5">
                  {morningActivities.map((name) => (
                    <span key={name} className="text-xs text-white/80 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-300 flex-shrink-0 inline-block" />
                      {name}
                    </span>
                  ))}
                  {morningActivities.length === 0 && (
                    <p className="text-xs text-white/40">—</p>
                  )}
                </div>
              </div>
              <div className={GLASS_CARD}>
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-2">Afternoon</p>
                <div className="space-y-1.5">
                  {afternoonActivities.map((name) => (
                    <span key={name} className="text-xs text-white/80 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-cyan-300 flex-shrink-0 inline-block" />
                      {name}
                    </span>
                  ))}
                  {afternoonActivities.length === 0 && (
                    <p className="text-xs text-white/40">—</p>
                  )}
                </div>
              </div>
            </div>
          </StaggerChild>

          {photoRequired > 0 && (
            <StaggerChild delay={0.3}>
              <div className={cn(GLASS_CARD, "!p-3 flex items-center gap-2")}>
                <Camera className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                <span className="text-xs text-white/80">
                  {photoRequired} photo check-ins for peace of mind
                </span>
              </div>
            </StaggerChild>
          )}

          {!hasRefined && (
            <SlideFeedbackInput
              slideId="baby"
              categoryFeedback={categoryFeedback}
              onCategoryFeedbackChange={onCategoryFeedbackChange}
              placeholder={
                morningActivities.length === 0
                  ? "Mornings are light — add more activities?"
                  : photoRequired === 0
                    ? "Want photo check-ins for peace of mind?"
                    : childNames.length > 0
                      ? `Adjust activity types or timing for ${childNames[0]}?`
                      : "Adjust activity types or timing?"
              }
            />
          )}
        </div>
      ),
    });
  }

  // ---- SLIDE 5: Elderly Care ----
  const elderlyMembers = wizardData.members.filter((m) => m.role === "Elderly");
  if (elderlyTasks.length > 0) {
    const elderlyNames = elderlyMembers.map((e) => e.name).filter(Boolean);
    const perDay = Math.round(elderlyTasks.length / 7);
    const uniqueElderlyNames = [...new Set(elderlyTasks.map((t) => t.taskName))];

    const elderlyHero = elderlyNames.length > 0
      ? `Daily care for ${elderlyNames.join(" & ")}`
      : "Daily elderly care routine";

    slides.push({
      id: "elderly",
      emoji: "👴",
      title: elderlyHero,
      subtitle: `${perDay} activities per day`,
      bgClass: "bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700",
      content: (
        <div className="space-y-6 text-white">
          <StaggerChild delay={0.1}>
            <div className={GLASS_CARD}>
              <p className="text-[10px] text-white/50 uppercase tracking-wider mb-3">Care activities</p>
              <div className="space-y-2">
                {uniqueElderlyNames.slice(0, 6).map((name) => (
                  <span key={name} className="text-sm text-white/85 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-300 flex-shrink-0 inline-block" />
                    {name}
                  </span>
                ))}
                {uniqueElderlyNames.length > 6 && (
                  <p className="text-xs text-white/40 pl-3.5">+{uniqueElderlyNames.length - 6} more</p>
                )}
              </div>
            </div>
          </StaggerChild>

          {elderlyTasks.some((t) => t.requiresPhoto) && (
            <StaggerChild delay={0.3}>
              <div className={cn(GLASS_CARD, "!p-3 flex items-center gap-2")}>
                <Camera className="w-3.5 h-3.5 text-violet-300 flex-shrink-0" />
                <span className="text-xs text-white/80">Photo verification for care tasks</span>
              </div>
            </StaggerChild>
          )}

          {!hasRefined && (
            <SlideFeedbackInput
              slideId="elderly"
              categoryFeedback={categoryFeedback}
              onCategoryFeedbackChange={onCategoryFeedbackChange}
              placeholder={
                !elderlyTasks.some((t) => t.requiresPhoto)
                  ? "Add photo verification for care tasks?"
                  : "Adjust care routine timing or add activities?"
              }
            />
          )}
        </div>
      ),
    });
  }

  // ---- SLIDE 6: Errands ----
  if (errandTasks.length > 0) {
    const uniqueErrandNames = [...new Set(errandTasks.map((t) => t.taskName))];
    const errandDayNames = [...new Set(
      tasks
        .filter((d) => d.tasks.some((t) => t.category === "Errands"))
        .map((d) => DAY_LABELS[d.day as DayOfWeek])
    )];

    const errandHero = errandDayNames.length <= 2
      ? `Errands batched on ${errandDayNames.join(" & ")}`
      : `Errands across ${errandDayNames.length} days`;

    slides.push({
      id: "errands",
      emoji: "🛍️",
      title: errandHero,
      subtitle: errandDayNames.length <= 2 ? "Grouped for efficiency" : `${errandTasks.length} errands weekly`,
      bgClass: "bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400",
      content: (
        <div className="space-y-6 text-white">
          <StaggerChild delay={0.1}>
            <div className={GLASS_CARD}>
              <p className="text-[10px] text-white/50 uppercase tracking-wider mb-2">Scheduled days</p>
              <div className="flex flex-wrap gap-2">
                {errandDayNames.map((day) => (
                  <span key={day} className="px-3 py-1.5 bg-white/15 rounded-xl text-sm font-medium text-white/90">
                    {day}
                  </span>
                ))}
              </div>
            </div>
          </StaggerChild>

          <StaggerChild delay={0.3}>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">What&apos;s planned</p>
              <TruncatedPills items={uniqueErrandNames} max={4} />
            </div>
          </StaggerChild>

          {!hasRefined && (
            <SlideFeedbackInput
              slideId="errands"
              categoryFeedback={categoryFeedback}
              onCategoryFeedbackChange={onCategoryFeedbackChange}
              placeholder={
                errandDayNames.length > 3
                  ? `Errands on ${errandDayNames.length} days — consolidate to fewer?`
                  : errandDayNames.length === 1
                    ? `All errands on ${errandDayNames[0]} — spread across the week?`
                    : "Add or move errand days?"
              }
            />
          )}
        </div>
      ),
    });
  }

  return slides;
}

// --- Final Slide with Progress ---

const CATEGORY_EMOJI: Record<string, string> = {
  meals: "🍳",
  chores: "🧹",
  baby: "🍼",
  elderly: "👴",
  errands: "🛍️",
};

const CATEGORY_LABEL: Record<string, string> = {
  meals: "Meals",
  chores: "Cleaning",
  baby: "Child Care",
  elderly: "Elderly Care",
  errands: "Errands",
};

function FinalSlide({
  feedback,
  onFeedbackChange,
  onRefine,
  isRefining,
  onFinish,
  hasRefined,
  categoryFeedback,
}: {
  feedback: string;
  onFeedbackChange: (v: string) => void;
  onRefine: () => void;
  isRefining: boolean;
  onFinish: () => void;
  hasRefined: boolean;
  categoryFeedback: Record<string, string>;
}) {
  const [progressStep, setProgressStep] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRefining) {
      setProgressStep(0);
      setProgressPercent(0);
      let step = 0;

      intervalRef.current = setInterval(() => {
        step++;
        if (step < REFINE_STEPS.length) {
          setProgressStep(step);
        }
        setProgressPercent((prev) => Math.min(prev + Math.random() * 10 + 4, 90));
      }, 2500);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setProgressPercent(0);
      setProgressStep(0);
    }
  }, [isRefining]);

  if (isRefining) {
    return (
      <div className="rounded-2xl bg-white border border-border p-6 min-h-[420px] flex flex-col items-center justify-center">
        <div className="w-full max-w-xs space-y-6">
          {/* Pulsing sparkle */}
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center animate-pulse">
              <Sparkles className="w-7 h-7 text-amber-500" />
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-lg font-display font-semibold text-gray-900">
              Refining your schedule
            </h3>
            <p className="text-xs text-text-muted mt-1">
              AI is adjusting based on your feedback
            </p>
          </div>

          {/* Progress bar */}
          <div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-2 bg-gray-900 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <p className="text-[10px] text-text-muted text-right mt-1">
              {Math.round(progressPercent)}%
            </p>
          </div>

          {/* Progress steps */}
          <div className="space-y-2">
            {REFINE_STEPS.map((stepLabel, i) => (
              <div
                key={stepLabel}
                className={cn(
                  "flex items-center gap-2 text-xs transition-all duration-300",
                  i < progressStep
                    ? "text-green-600"
                    : i === progressStep
                      ? "text-gray-900 font-medium"
                      : "text-gray-300"
                )}
              >
                {i < progressStep ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                ) : i === progressStep ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-gray-200 flex-shrink-0" />
                )}
                {stepLabel}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-border p-6 min-h-[420px] flex flex-col">
      <div className="mb-4 text-center">
        <span className="text-3xl mb-2 block">{hasRefined ? "✅" : "🎯"}</span>
        <h3 className="text-xl font-display font-bold text-gray-900">
          {hasRefined ? "Schedule refined!" : "Your schedule, your way"}
        </h3>
        <p className="text-sm text-text-muted mt-1">
          {hasRefined
            ? "Swipe back through the slides to see what changed."
            : "Happy with the plan? Or tell AI what to change."}
        </p>
      </div>

      {!hasRefined && (() => {
        const categoryEntries = Object.entries(categoryFeedback).filter(
          ([, v]) => v.trim().length > 0
        );
        const hasAnyFeedback = categoryEntries.length > 0 || feedback.trim().length > 0;

        return (
          <div className="flex-1 space-y-4">
            {/* Consolidated category feedback summary */}
            {categoryEntries.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Your feedback</p>
                {categoryEntries.map(([id, text]) => (
                  <div key={id} className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-border">
                    <span className="text-sm flex-shrink-0">{CATEGORY_EMOJI[id]}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-gray-500">{CATEGORY_LABEL[id]}</p>
                      <p className="text-xs text-gray-700 line-clamp-2">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <textarea
              value={feedback}
              onChange={(e) => onFeedbackChange(e.target.value)}
              placeholder={categoryEntries.length > 0
                ? "Anything else to adjust?"
                : "e.g. Move cleaning to mornings, add more baby activities in the afternoon..."}
              className="w-full rounded-xl border border-border bg-gray-50 px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 outline-none transition-all"
              rows={2}
            />

            {/* Single primary CTA */}
            <button
              onClick={hasAnyFeedback ? onRefine : onFinish}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-all shadow-sm"
            >
              {hasAnyFeedback ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Re-balance schedule
                </>
              ) : (
                <>
                  Looks good, review my schedule
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        );
      })()}

      {hasRefined && (
        <div className="flex-1 flex flex-col justify-end">
          <button
            onClick={onFinish}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-all shadow-sm"
          >
            Review & Edit my schedule
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// --- Slideshow Component ---

function ScheduleSlideshow({
  slides,
  onFinish,
  feedback,
  onFeedbackChange,
  onRefine,
  isRefining,
  hasRefined,
  resetKey,
  categoryFeedback,
}: {
  slides: SlideData[];
  onFinish: () => void;
  feedback: string;
  onFeedbackChange: (v: string) => void;
  onRefine: () => void;
  isRefining: boolean;
  hasRefined: boolean;
  resetKey: number;
  categoryFeedback: Record<string, string>;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const totalSlides = slides.length + 1; // +1 for final "refine" slide
  const isLastSlide = currentIndex === totalSlides - 1;

  // Reset to first slide when resetKey changes (after AI refine)
  useEffect(() => {
    if (resetKey > 0) {
      setDirection(-1);
      setCurrentIndex(0);
    }
  }, [resetKey]);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalSlides) return;
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
    },
    [currentIndex, totalSlides]
  );

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <div className="space-y-4">
      {/* Slide container */}
      <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: 420 }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full"
          >
            {currentIndex < slides.length ? (
              // Content slides
              <div
                className={cn(
                  "relative rounded-2xl p-7 min-h-[420px] flex flex-col",
                  slides[currentIndex].bgClass
                )}
              >
                {/* Radial light overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)] pointer-events-none rounded-2xl" />

                {/* Slide header */}
                <div className="relative mb-8">
                  <div className="w-10 h-10 rounded-full backdrop-blur-sm bg-white/10 border border-white/20 flex items-center justify-center mb-3">
                    <span className="text-lg">{slides[currentIndex].emoji}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-display font-bold text-white">
                      {slides[currentIndex].title}
                    </h3>
                    <HelpTooltip content="This summary shows how well your helper's schedule covers each area. 'Daily' means every day, 'Most days' means 5–6 days, 'Some days' means 1–4 days. Tap any category to give feedback and refine the plan." />
                  </div>
                  {slides[currentIndex].subtitle && (
                    <p className="text-sm text-white/60 mt-1">{slides[currentIndex].subtitle}</p>
                  )}
                  <div className="w-8 h-0.5 bg-white/20 rounded-full mt-3" />
                </div>

                {/* Slide content */}
                <div className="relative flex-1">{slides[currentIndex].content}</div>
              </div>
            ) : (
              // Final slide: Refine + Continue
              <FinalSlide
                feedback={feedback}
                onFeedbackChange={onFeedbackChange}
                onRefine={onRefine}
                isRefining={isRefining}
                onFinish={onFinish}
                hasRefined={hasRefined}
                categoryFeedback={categoryFeedback}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Tap zones for navigation */}
        <button
          className="absolute left-0 top-0 bottom-0 w-1/4 z-10"
          onClick={() => goTo(currentIndex - 1)}
          aria-label="Previous slide"
        />
        <button
          className="absolute right-0 top-0 bottom-0 w-1/4 z-10"
          onClick={() => !isLastSlide && goTo(currentIndex + 1)}
          aria-label="Next slide"
        />
      </div>

      {/* Dot indicators — spring-animated */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <motion.button
            key={i}
            onClick={() => goTo(i)}
            className={cn(
              "h-2 rounded-full",
              i === currentIndex ? "bg-gray-900" : "bg-gray-300 hover:bg-gray-400"
            )}
            animate={{ width: i === currentIndex ? 28 : 8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          />
        ))}
      </div>

      {/* Navigation hint */}
      {currentIndex === 0 ? (
        <motion.p
          className="text-center text-xs text-text-muted font-medium"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: [0, 4, 0] }}
          transition={{ opacity: { duration: 0.4 }, x: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }}
        >
          Swipe to explore your schedule →
        </motion.p>
      ) : (
        <p className="text-center text-[10px] text-text-muted">
          {currentIndex + 1} of {totalSlides}
        </p>
      )}
    </div>
  );
}

// --- Main Component ---

export function Step9ScheduleReview({ weeklyTasks, rooms, onUpdate, onComplete, wizardData }: Step9Props) {
  const [phase, setPhase] = useState<Phase>("slideshow");
  const [localTasks, setLocalTasks] = useState<DayTasks[]>(weeklyTasks);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>("monday");
  const [addDialog, setAddDialog] = useState<{ day: string; task?: TaskItem } | null>(null);
  const [feedback, setFeedback] = useState("");
  const [categoryFeedback, setCategoryFeedback] = useState<Record<string, string>>({});
  const [isRefining, setIsRefining] = useState(false);
  const [hasRefined, setHasRefined] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const handleCategoryFeedbackChange = useCallback((id: string, value: string) => {
    setCategoryFeedback((prev) => ({ ...prev, [id]: value }));
  }, []);

  const slides = useMemo(
    () => buildSlides(localTasks, wizardData, categoryFeedback, handleCategoryFeedbackChange, hasRefined),
    [localTasks, wizardData, categoryFeedback, handleCategoryFeedbackChange, hasRefined]
  );

  const updateAndSync = (updated: DayTasks[]) => {
    setLocalTasks(updated);
    onUpdate(updated);
  };

  const handleRefineWithAI = async () => {
    const categoryEntries = Object.entries(categoryFeedback).filter(([, v]) => v.trim());
    const hasAnyFeedback = categoryEntries.length > 0 || feedback.trim();
    if (!hasAnyFeedback) return;

    // Build consolidated feedback string
    const parts: string[] = [];
    for (const [id, text] of categoryEntries) {
      parts.push(`${CATEGORY_LABEL[id]}: ${text.trim()}`);
    }
    if (feedback.trim()) parts.push(`Additional: ${feedback.trim()}`);
    const consolidatedFeedback = parts.join("\n");

    setIsRefining(true);

    try {
      const res = await fetch("/api/ai/generate-timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rooms: wizardData.rooms,
          members: wizardData.members,
          helperDetails: wizardData.helperDetails,
          memberRoutines: wizardData.memberRoutines,
          memberSchedules: wizardData.memberSchedules,
          priorities: wizardData.priorities,
          helperExperience: wizardData.helperExperience ?? "some",
          helperPace: wizardData.helperPace ?? "balanced",
          homeSize: wizardData.homeSize ?? "midsize",
          deepCleanTasks: wizardData.deepCleanTasks ?? [],
          refineFeedback: consolidatedFeedback,
          currentSchedule: localTasks.map((d) => ({
            day: d.day,
            tasks: d.tasks.map((t) => ({
              taskName: t.taskName,
              time: t.time,
              category: t.category,
              area: t.area,
            })),
          })),
        }),
      });

      if (res.ok) {
        const { weeklyTasks: newTasks } = await res.json();
        setLocalTasks(newTasks);
        onUpdate(newTasks);
        setFeedback("");
        setCategoryFeedback({});
        setHasRefined(true);
        // Small delay so progress animation completes visually before resetting
        setTimeout(() => {
          setResetKey((k) => k + 1);
          toast.success("Schedule refined! Swipe through to see changes.");
        }, 600);
      }
    } catch {
      // Silent fail — user can retry
    } finally {
      setIsRefining(false);
    }
  };

  // --- PHASE 1: Slideshow ---
  if (phase === "slideshow") {
    return (
      <ScheduleSlideshow
        slides={slides}
        onFinish={() => setPhase("editor")}
        feedback={feedback}
        onFeedbackChange={setFeedback}
        onRefine={handleRefineWithAI}
        isRefining={isRefining}
        hasRefined={hasRefined}
        resetKey={resetKey}
        categoryFeedback={categoryFeedback}
      />
    );
  }

  // --- PHASE 2: Timeline Editor ---
  const selectedDayData = localTasks.find((d) => d.day === selectedDay);
  const dayIdx = DAYS_OF_WEEK.indexOf(selectedDay);
  const prevDay = dayIdx > 0 ? DAYS_OF_WEEK[dayIdx - 1] : null;
  const nextDay = dayIdx < 6 ? DAYS_OF_WEEK[dayIdx + 1] : null;
  const totalTasks = localTasks.reduce((sum, d) => sum + d.tasks.filter(t => t.category !== "Break").length, 0);

  const handleTimelineUpdate = (taskId: string, updates: Partial<TaskItem>) => {
    const updated = localTasks.map((d) => {
      if (d.day !== selectedDay) return d;
      return {
        ...d,
        tasks: d.tasks
          .map((t) => (t.taskId === taskId ? { ...t, ...updates } : t))
          .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)),
      };
    });
    updateAndSync(updated);
  };

  const handleAddTask = async (task: TaskItem) => {
    if (!addDialog) return;
    const updated = localTasks.map((d) => {
      if (d.day !== addDialog.day) return d;
      if (addDialog.task) {
        return { ...d, tasks: d.tasks.map((t) => (t.taskId === task.taskId ? task : t)) };
      }
      const newTasks = [...d.tasks, task].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
      return { ...d, tasks: newTasks };
    });
    updateAndSync(updated);
    setAddDialog(null);
  };

  const handleDeleteTask = (taskId: string) => {
    const updated = localTasks.map((d) => {
      if (d.day !== selectedDay) return d;
      return { ...d, tasks: d.tasks.filter((t) => t.taskId !== taskId) };
    });
    updateAndSync(updated);
  };

  return (
    <div className="space-y-4">
      {/* Header with back to slideshow */}
      <div className="flex flex-col items-center text-center">
        <button
          onClick={() => setPhase("slideshow")}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-gray-600 mb-3 transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
          Back to overview
        </button>
        <h2 className="text-xl font-display font-semibold tracking-tight text-gray-900 mb-1">
          Review & Edit
        </h2>
        <p className="text-text-secondary text-xs max-w-sm">
          Drag tasks to change times. Resize from the bottom. Tap to edit.
        </p>
      </div>

      {/* Day selector strip */}
      <div className="flex gap-1">
        {DAYS_OF_WEEK.map((day) => {
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={cn(
                "flex-1 min-w-0 flex items-center justify-center py-2 rounded-xl text-xs font-medium transition-all",
                isSelected
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              )}
            >
              {DAY_LABELS[day].slice(0, 3)}
            </button>
          );
        })}
      </div>

      {/* Day nav + actions */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => prevDay && setSelectedDay(prevDay)}
            disabled={!prevDay}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-semibold text-gray-900">
            {DAY_LABELS[selectedDay]}
          </h3>
          <button
            onClick={() => nextDay && setSelectedDay(nextDay)}
            disabled={!nextDay}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">
            {selectedDayData?.tasks.length ?? 0} tasks
          </span>
          <button
            onClick={() => setAddDialog({ day: selectedDay })}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-border transition-colors"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden" style={{ height: "min(70vh, 640px)" }}>
        <DayTimelineView
          tasks={selectedDayData?.tasks ?? []}
          dayLabel={DAY_LABELS[selectedDay]}
          onUpdateTask={handleTimelineUpdate}
          onEditTask={(task) => setAddDialog({ day: selectedDay, task })}
          onDeleteTask={handleDeleteTask}
          showHeader={false}
          showCurrentTime={false}
        />
      </div>

      {/* Week summary + Finish */}
      <div className="flex flex-col items-center gap-3 py-2">
        <span className="text-xs text-text-muted">
          {totalTasks} activities across 7 days
        </span>
        <button
          onClick={onComplete}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-all shadow-sm"
        >
          Finish Setup
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Add/Edit dialog */}
      {addDialog && (
        <AddTaskDialog
          day={addDialog.day}
          rooms={rooms}
          existingTasks={
            localTasks.find((d) => d.day === addDialog.day)?.tasks ?? []
          }
          initialTask={addDialog.task}
          onAdd={handleAddTask}
          onClose={() => setAddDialog(null)}
        />
      )}
    </div>
  );
}
