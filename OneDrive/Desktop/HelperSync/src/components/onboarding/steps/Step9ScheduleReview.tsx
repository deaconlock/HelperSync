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
  CATEGORY_EMOJIS,
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
  seg2Result: DayTasks[] | null;
  seg3Result: DayTasks[] | null;
  seg23Error: boolean;
  onSegmentsArrived: (days: DayTasks[]) => void;
  onRetrySeg23: () => void;
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

// --- Day Slide Builder ---

const DAY_THEMES: Record<string, string> = {
  monday: "Deep clean + laundry",
  tuesday: "Bedrooms + ironing",
  wednesday: "Kitchen + errands",
  thursday: "Bathrooms + windows",
  friday: "Vacuum + weekend prep",
  saturday: "Lighter chores + special meal",
  sunday: "Rest day + weekly reset",
};

const DAY_BG: Record<string, string> = {
  monday:    "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900",
  tuesday:   "bg-gradient-to-br from-violet-700 via-purple-800 to-slate-900",
  wednesday: "bg-gradient-to-br from-amber-600 via-orange-700 to-slate-900",
  thursday:  "bg-gradient-to-br from-teal-600 via-cyan-700 to-slate-900",
  friday:    "bg-gradient-to-br from-emerald-600 via-green-700 to-slate-900",
  saturday:  "bg-gradient-to-br from-rose-500 via-pink-600 to-slate-900",
  sunday:    "bg-gradient-to-br from-sky-600 via-blue-700 to-slate-900",
};

const DAY_EMOJIS: Record<string, string> = {
  monday: "🧹", tuesday: "🛏️", wednesday: "🍳",
  thursday: "🚿", friday: "🌿", saturday: "✨", sunday: "☀️",
};

function buildDaySlides(
  tasks: DayTasks[],
  pendingDays: Set<string>,
): SlideData[] {
  const dayMap = Object.fromEntries(tasks.map((d) => [d.day, d]));

  return (["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const).map((day) => {
    const dayData = dayMap[day];
    const isPending = pendingDays.has(day);
    const theme = DAY_THEMES[day];
    const bgClass = DAY_BG[day];
    const emoji = DAY_EMOJIS[day];
    const label = DAY_LABELS[day];

    let content: React.ReactNode;

    if (isPending) {
      content = (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/60">
          <Loader2 className="w-8 h-8 animate-spin text-white/30" />
          <p className="text-sm">Building {label}&apos;s schedule...</p>
        </div>
      );
    } else if (!dayData || dayData.tasks.length === 0) {
      content = (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-white/40">
          <p className="text-sm">No tasks scheduled</p>
        </div>
      );
    } else {
      // Special tasks: passive (washing machine, oven), deep-clean, non-daily care, errands
      const specialTasks = dayData.tasks.filter((t) =>
        t.category !== "Break" && (
          t.passive ||
          t.category === "Errands" ||
          t.category === "Elderly Care" ||
          t.category === "Baby Care" ||
          // One-off or infrequent names (contains "deep", "clean", "iron", "grocery", "scrub", "degrease", "shampoo", "wash curtain", "aircon")
          /deep|iron|grocery|scrub|degrease|shampoo|curtain|aircon|mattress|fridge|ceiling fan|sofa/i.test(t.taskName)
        )
      ).slice(0, 4);

      // Category summary: unique categories present (excluding Break)
      const categories = [...new Set(
        dayData.tasks.filter((t) => t.category !== "Break").map((t) => t.category)
      )];

      const totalWork = dayData.tasks.filter((t) => t.category !== "Break").length;

      content = (
        <div className="space-y-5 text-white">
          {/* Focus theme */}
          <StaggerChild delay={0.05}>
            <div className="rounded-xl bg-white/10 border border-white/15 px-4 py-3">
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-1">Focus</p>
              <p className="text-sm font-semibold text-white/90">{theme}</p>
            </div>
          </StaggerChild>

          {/* Special / notable tasks */}
          {specialTasks.length > 0 && (
            <StaggerChild delay={0.2}>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-2">Notable tasks</p>
                <div className="space-y-2">
                  {specialTasks.map((task) => (
                    <div key={task.taskId} className="flex items-center gap-3">
                      <span className="text-base flex-shrink-0">
                        {task.emoji ?? CATEGORY_EMOJIS[task.category] ?? "✅"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/90 truncate">{task.taskName}</p>
                        <p className="text-[11px] text-white/40">
                          {task.time}{task.passive ? " · runs unattended" : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </StaggerChild>
          )}

          {/* Category pills + task count */}
          <StaggerChild delay={0.35}>
            <div className="flex flex-wrap gap-1.5 items-center">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60"
                >
                  {CATEGORY_EMOJIS[cat] ?? "📋"} {cat}
                </span>
              ))}
              <span className="text-[10px] text-white/30 ml-auto">{totalWork} tasks</span>
            </div>
          </StaggerChild>
        </div>
      );
    }

    return {
      id: day,
      emoji,
      title: label,
      subtitle: theme,
      bgClass,
      content,
    };
  });
}

// --- Final Slide with Progress ---

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
  const touchStartX = useRef<number | null>(null);

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
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ minHeight: 420 }}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const delta = touchStartX.current - e.changedTouches[0].clientX;
          touchStartX.current = null;
          if (Math.abs(delta) < 40) return;
          if (delta > 0) goTo(currentIndex + 1);
          else goTo(currentIndex - 1);
        }}
      >
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

const PENDING_DAYS_INITIAL = new Set(["thursday", "friday", "saturday", "sunday"]);
const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function Step9ScheduleReview({ weeklyTasks, rooms, onUpdate, onComplete, wizardData, seg2Result, seg3Result, seg23Error, onSegmentsArrived, onRetrySeg23 }: Step9Props) {
  const [phase, setPhase] = useState<Phase>("slideshow");
  const [localTasks, setLocalTasks] = useState<DayTasks[]>(weeklyTasks);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>("monday");
  const [pendingDays, setPendingDays] = useState<Set<string>>(new Set(PENDING_DAYS_INITIAL));
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
    () => buildDaySlides(localTasks, pendingDays),
    [localTasks, pendingDays]
  );

  // Merge incoming segments into localTasks as they arrive
  useEffect(() => {
    const arrived: DayTasks[] = [];
    if (seg2Result) arrived.push(...seg2Result);
    if (seg3Result) arrived.push(...seg3Result);
    if (arrived.length === 0) return;
    setLocalTasks((prev) => {
      const existing = prev.filter((d) => !arrived.find((a) => a.day === d.day));
      return [...existing, ...arrived].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
    });
    setPendingDays((prev) => {
      const next = new Set(prev);
      arrived.forEach((d) => next.delete(d.day));
      return next;
    });
    onSegmentsArrived(arrived);
  }, [seg2Result, seg3Result]); // eslint-disable-line react-hooks/exhaustive-deps

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

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
        }
        const jsonMatch = accumulated.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const newTasks = JSON.parse(jsonMatch[0]);
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

      {/* Seg 2+3 error banner */}
      {seg23Error && pendingDays.size > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          <p className="text-xs text-red-600">Thu–Sun couldn&apos;t be generated.</p>
          <button onClick={onRetrySeg23} className="text-xs font-semibold text-red-600 underline ml-2">Retry</button>
        </div>
      )}

      {/* Day selector strip */}
      <div className="flex gap-1">
        {DAYS_OF_WEEK.map((day) => {
          const isSelected = selectedDay === day;
          const isPending = pendingDays.has(day);
          return (
            <button
              key={day}
              onClick={() => !isPending && setSelectedDay(day)}
              disabled={isPending}
              className={cn(
                "flex-1 min-w-0 flex items-center justify-center py-2 rounded-xl text-xs font-medium transition-all",
                isSelected
                  ? "bg-gray-900 text-white shadow-sm"
                  : isPending
                  ? "bg-gray-50 text-gray-300 cursor-wait"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              )}
            >
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : DAY_LABELS[day].slice(0, 3)}
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
        {pendingDays.has(selectedDay) ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
            <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                Building {DAY_LABELS[selectedDay]}&apos;s schedule...
              </p>
              <p className="text-xs text-text-muted mt-1">Select Mon–Wed to review while you wait</p>
            </div>
          </div>
        ) : (
          <DayTimelineView
            tasks={selectedDayData?.tasks ?? []}
            dayLabel={DAY_LABELS[selectedDay]}
            onUpdateTask={handleTimelineUpdate}
            onEditTask={(task) => setAddDialog({ day: selectedDay, task })}
            onDeleteTask={handleDeleteTask}
            showHeader={false}
            showCurrentTime={false}
          />
        )}
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
