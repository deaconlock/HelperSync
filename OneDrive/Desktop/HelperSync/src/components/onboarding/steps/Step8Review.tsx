"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Sparkles, CheckCircle2, CalendarDays } from "lucide-react";
import { WizardData } from "@/app/onboarding/employer/page";
import { DayTasks } from "@/types/timetable";
import { toast } from "sonner";

const PRIORITY_LABELS: Record<string, string> = {
  meals: "Meals & Cooking",
  cleanliness: "Cleanliness",
  childcare: "Childcare",
  elderlycare: "Elderly Care",
  laundry: "Laundry & Ironing",
  grocery: "Grocery & Errands",
  organizing: "Organizing",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  new: "New helper",
  some: "Some experience",
  experienced: "Very experienced",
};

const PROGRESS_STEPS = [
  "Analyzing your home layout...",
  "Understanding your priorities...",
  "Applying your routines...",
  "Planning daily schedules...",
  "Assigning tasks to rooms...",
  "Optimizing time slots...",
  "Finalizing your schedule...",
];

interface Step8Props {
  data: WizardData;
  onTimetableGenerated: (tasks: DayTasks[]) => void;
}

export function Step8Review({ data, onTimetableGenerated }: Step8Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(data.weeklyTasks !== null);
  const [taskCount, setTaskCount] = useState(
    data.weeklyTasks?.reduce((sum, d) => sum + d.tasks.length, 0) ?? 0
  );
  const [progressStep, setProgressStep] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isGenerating) {
      setProgressStep(0);
      setProgressPercent(0);
      let step = 0;

      intervalRef.current = setInterval(() => {
        step++;
        if (step < PROGRESS_STEPS.length) {
          setProgressStep(step);
        }
        setProgressPercent((prev) => Math.min(prev + Math.random() * 10 + 4, 90));
      }, 2500);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (hasGenerated) setProgressPercent(100);
    }
  }, [isGenerating, hasGenerated]);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const res = await fetch("/api/ai/generate-timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rooms: data.rooms,
          members: data.members,
          helperDetails: data.helperDetails,
          memberRoutines: data.memberRoutines,
          memberSchedules: data.memberSchedules,
          priorities: data.priorities,
          helperExperience: data.helperExperience,
          helperPace: data.helperPace,
          homeSize: data.homeSize,
          deepCleanTasks: data.deepCleanTasks,
        }),
      });

      const result = await res.json();

      if (result.weeklyTasks && Array.isArray(result.weeklyTasks)) {
        onTimetableGenerated(result.weeklyTasks);
        const count = result.weeklyTasks.reduce(
          (sum: number, d: DayTasks) => sum + d.tasks.filter((t: { category: string }) => t.category !== "Break").length,
          0
        );
        setTaskCount(count);
        setHasGenerated(true);
        toast.success(`${count} activities planned for the week!`);
      } else {
        toast.error("Failed to generate schedule. Please try again.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step illustration */}
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <CalendarDays className="w-8 h-8 text-gray-700" />
        </div>
        <h2 className="text-2xl font-display font-semibold tracking-tight text-gray-900 mb-2">
          Ready to generate your schedule
        </h2>
        <p className="text-text-secondary text-sm max-w-md">
          We&apos;ll create a personalized 7-day schedule based on everything you&apos;ve told us.
        </p>
      </div>

      {/* Summary cards */}
      <div className="space-y-3">
        <div className="bg-white rounded-2xl border border-border p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Home</p>
              <p className="text-sm font-medium text-gray-900">{data.rooms.length} areas</p>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                {data.rooms.slice(0, 3).join(", ")}{data.rooms.length > 3 ? ` +${data.rooms.length - 3}` : ""}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Family</p>
              <p className="text-sm font-medium text-gray-900">{data.members.length} members</p>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                {data.members.map((m) => m.name || m.role).join(", ")}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Priorities</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {data.priorities.map((p) => (
                  <span key={p} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full font-medium">
                    {PRIORITY_LABELS[p]}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Helper</p>
              <p className="text-sm font-medium text-gray-900">
                {data.helperDetails?.name || "—"}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {data.helperExperience ? EXPERIENCE_LABELS[data.helperExperience] : "—"}
              </p>
            </div>
          </div>
        </div>

        {data.memberRoutines && Object.values(data.memberRoutines).some((v) => v.trim()) && (
          <div className="bg-white rounded-2xl border border-border p-4">
            <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Routines</p>
            <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
              {Object.values(data.memberRoutines).filter((v) => v.trim()).join("; ").slice(0, 120) || "—"}
              {Object.values(data.memberRoutines).filter((v) => v.trim()).join("; ").length > 120 ? "..." : ""}
            </p>
          </div>
        )}
      </div>

      {/* Generate button / Progress / Result */}
      {isGenerating ? (
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {PROGRESS_STEPS[progressStep]}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-gray-800 to-gray-500 h-2.5 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 py-4">
            <Sparkles className="w-5 h-5 text-gray-700 animate-pulse" />
            <span className="text-sm text-gray-500">AI is building your schedule</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {PROGRESS_STEPS.map((label, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 text-[10px] px-2 py-1.5 rounded-lg transition-all duration-300 ${
                  i <= progressStep
                    ? "bg-gray-100 text-gray-900"
                    : "bg-gray-50 text-gray-400"
                }`}
              >
                {i < progressStep ? (
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                ) : i === progressStep ? (
                  <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" />
                )}
                <span className="truncate">{label.replace("...", "")}</span>
              </div>
            ))}
          </div>
        </div>
      ) : !hasGenerated ? (
        <button
          onClick={handleGenerate}
          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-display font-semibold text-lg hover:bg-gray-800 transition-all duration-200 flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
        >
          <Sparkles className="w-5 h-5" />
          <span>Generate my schedule</span>
        </button>
      ) : (
        <div className="bg-green-50 rounded-2xl p-5 flex items-start gap-3 border border-green-100">
          <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5 animate-checkmark" />
          <div>
            <p className="font-display font-semibold text-green-700">Schedule ready!</p>
            <p className="text-sm text-green-600/80 mt-0.5">
              Generated <strong>{taskCount} tasks</strong> across 7 days, tailored to your priorities. You can edit everything from the dashboard.
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="mt-2 text-sm text-green-600 underline hover:no-underline"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
