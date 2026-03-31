"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { WizardData } from "@/app/onboarding/employer/page";
import { DayTasks, DAYS_OF_WEEK, DAY_LABELS } from "@/types/timetable";

const PRIORITY_LABELS: Record<string, string> = {
  meals: "Meals & Cooking",
  cleanliness: "Cleanliness & Tidying",
  childcare: "Childcare",
  elderlycare: "Elderly Care",
  laundry: "Laundry & Ironing",
  grocery: "Grocery Shopping & Errands",
  organizing: "Organizing & Decluttering",
};

function buildClientSummary(data: WizardData): string {
  const helperName = data.helperDetails?.name || "Your helper";
  const priorities = data.priorities.slice(0, 2).map((p) => PRIORITY_LABELS[p] ?? p);
  const priorityStr = priorities.length > 0 ? priorities.join(" and ") : "general household management";
  const childCount = data.members.filter((m) => ["Baby", "Young Child", "School Child"].includes(m.role)).length;
  const elderlyCount = data.members.filter((m) => m.role === "Elderly").length;
  const careNote = childCount > 0 ? " with childcare routines built in" : elderlyCount > 0 ? " with elderly care checkpoints" : "";
  const paceNote = data.helperPace === "intensive" ? "a packed, full-day schedule" : data.helperPace === "relaxed" ? "a relaxed, quality-focused schedule" : "a steady, balanced schedule";
  return `I built ${helperName}'s week around ${priorityStr}${careNote}. Each day has a different focus to avoid repetition, and I've spread tasks across the full day with proper breaks. This is ${paceNote} tailored to your home.`;
}

// Labels that cycle during the passive progress animation
const PROGRESS_LABELS = [
  "Analyzing your home layout...",
  "Understanding your priorities...",
  "Applying your routines...",
  "Planning daily schedules...",
  "Assigning tasks to rooms...",
  "Optimizing time slots...",
  "Finalizing your schedule...",
];

// How long we expect generation to take (ms) — used for the fake progress bar
const ESTIMATED_MS = 50000;

// Category colour bars for the week-at-a-glance strip
const STRIP_COLORS: Record<string, string> = {
  "Meal Prep": "bg-amber-400",
  "Household Chores": "bg-slate-400",
  "Break": "bg-teal-400",
  "Baby Care": "bg-emerald-400",
  "Elderly Care": "bg-violet-400",
  "Errands": "bg-rose-400",
};

function WeekStrip({
  seg1Days,
  pending,
}: {
  seg1Days: DayTasks[];
  pending: boolean; // Thu–Sun still loading
}) {
  const dayMap = Object.fromEntries(seg1Days.map((d) => [d.day, d]));

  return (
    <div className="flex gap-1.5">
      {DAYS_OF_WEEK.map((day) => {
        const dayData = dayMap[day];
        const isPending = !dayData && pending;
        const shortLabel = DAY_LABELS[day].slice(0, 3);

        return (
          <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
            {isPending ? (
              <div className="w-full h-10 rounded-lg border border-dashed border-white/20 flex items-center justify-center">
                <Loader2 className="w-3 h-3 text-white/30 animate-spin" />
              </div>
            ) : dayData ? (
              <div className="w-full h-10 rounded-lg overflow-hidden flex flex-col gap-px">
                {Object.entries(
                  dayData.tasks.reduce<Record<string, number>>((acc, t) => {
                    acc[t.category] = (acc[t.category] ?? 0) + 1;
                    return acc;
                  }, {})
                )
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 4)
                  .map(([cat]) => (
                    <div
                      key={cat}
                      className={`flex-1 ${STRIP_COLORS[cat] ?? "bg-gray-400"} opacity-80`}
                    />
                  ))}
              </div>
            ) : (
              <div className="w-full h-10 rounded-lg bg-white/5" />
            )}
            <span className="text-[9px] text-white/40 font-medium">{shortLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

interface Step8Props {
  data: WizardData;
  preGenResult: DayTasks[] | null;
  preGenError: boolean;
  onTimetableGenerated: (tasks: DayTasks[]) => void;
  onRetry: () => void;
}

export function Step8Review({
  data,
  preGenResult,
  preGenError,
  onTimetableGenerated,
  onRetry,
}: Step8Props) {
  const [hasGenerated, setHasGenerated] = useState(data.weeklyTasks !== null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLabel, setProgressLabel] = useState(0);
  const progressStart = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const helperName = data.helperDetails?.name || null;

  // Start progress animation on mount
  useEffect(() => {
    if (hasGenerated) return;
    progressStart.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - (progressStart.current ?? Date.now());
      const pct = Math.min((elapsed / ESTIMATED_MS) * 90, 90);
      setProgressPercent(pct);
      setProgressLabel(
        Math.min(
          Math.floor((pct / 90) * PROGRESS_LABELS.length),
          PROGRESS_LABELS.length - 1
        )
      );
      if (pct < 90) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Commit result when it arrives
  useEffect(() => {
    if (preGenResult && !hasGenerated) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setProgressPercent(100);
      onTimetableGenerated(preGenResult);
      setHasGenerated(true);
    }
  }, [preGenResult]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="min-h-[calc(100vh-8rem)] rounded-3xl flex flex-col"
      style={{
        background: "linear-gradient(160deg, #111827 0%, #1f2937 60%, #111827 100%)",
      }}
    >
      <AnimatePresence mode="wait">

        {/* ── Error state ── */}
        {preGenError && !hasGenerated && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-6"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">Generation failed</p>
              <p className="text-white/50 text-sm mt-1">Something went wrong building your schedule.</p>
            </div>
            <button
              onClick={onRetry}
              className="px-6 py-2.5 rounded-xl bg-white text-gray-900 text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              Try again
            </button>
          </motion.div>
        )}

        {/* ── Loading state ── */}
        {!hasGenerated && !preGenError && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-between px-6 py-12"
          >
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                className="w-20 h-20 rounded-3xl bg-white/8 border border-white/10 flex items-center justify-center"
              >
                <Sparkles className="w-9 h-9 text-white/70" />
              </motion.div>

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-display font-semibold text-white tracking-tight">
                  {helperName ? `Building ${helperName}'s week` : "Building your schedule"}
                </h2>
                <p className="text-white/50 text-sm animate-pulse">
                  {PROGRESS_LABELS[progressLabel]}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs text-white/30">
                <span>Generating</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                <div
                  className="h-1 rounded-full bg-white/60 transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Success state ── */}
        {hasGenerated && (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col px-5 py-8 gap-6"
          >
            {/* Checkmark + headline */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 20 }}
              className="flex flex-col items-center text-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-semibold text-white tracking-tight">
                  {helperName ? `${helperName}'s week is ready` : "Your schedule is ready"}
                </h2>
                <p className="text-white/50 text-sm mt-1">7 days built around your family</p>
              </div>
            </motion.div>

            {/* AI summary card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2"
            >
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                Here&apos;s what I built
              </p>
              <p className="text-sm text-white/75 leading-relaxed italic">{buildClientSummary(data)}</p>
            </motion.div>

            {/* Week at a glance */}
            {data.weeklyTasks && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="space-y-2"
              >
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                  Week at a glance
                </p>
                <WeekStrip
                  seg1Days={data.weeklyTasks}
                  pending={data.weeklyTasks.length < 7}
                />
                {data.weeklyTasks.length < 7 && (
                  <p className="text-[10px] text-white/30 text-center">
                    Thu–Sun loading in the background...
                  </p>
                )}
              </motion.div>
            )}

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="flex flex-col items-center gap-3 mt-auto pt-2"
            >
              <p className="text-xs text-white/40 text-center">
                Hit <strong className="text-white/60">Continue</strong> below to review and edit the full schedule
              </p>
              <button
                onClick={onRetry}
                className="text-xs text-white/30 underline hover:text-white/50 transition-colors"
              >
                Regenerate schedule
              </button>
            </motion.div>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
