"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Sparkles, CheckCircle2, CalendarDays } from "lucide-react";
import { WizardData } from "@/app/onboarding/employer/page";
import { DayTasks } from "@/types/timetable";
import { toast } from "sonner";

const PROGRESS_STEPS = [
  "Analyzing household layout...",
  "Understanding family routines...",
  "Planning daily schedules...",
  "Assigning tasks to rooms...",
  "Optimizing time slots...",
  "Finalizing your schedule...",
];

interface Step6Props {
  data: WizardData;
  onTimetableGenerated: (tasks: DayTasks[]) => void;
}

export function Step6Review({ data, onTimetableGenerated }: Step6Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(data.weeklyTasks !== null);
  const [taskCount, setTaskCount] = useState(
    data.weeklyTasks?.reduce((sum, d) => sum + d.tasks.length, 0) ?? 0
  );
  const [progressStep, setProgressStep] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Animate progress during generation
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
        setProgressPercent((prev) => Math.min(prev + Math.random() * 12 + 5, 90));
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
          employerAvailability: data.employerAvailability,
          wifeAvailability: data.wifeAvailability,
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
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <CalendarDays className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-1">
          Review & Generate Schedule
        </h2>
        <p className="text-gray-500 text-sm max-w-md">
          Everything looks good! Let our AI create a personalized schedule for your helper.
        </p>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl shadow-card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Rooms & Areas</p>
            <p className="font-semibold text-gray-900">{data.rooms.length} areas</p>
            <p className="text-xs text-gray-400 mt-0.5">{data.rooms.slice(0, 3).join(", ")}{data.rooms.length > 3 ? ` +${data.rooms.length - 3} more` : ""}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Household Members</p>
            <p className="font-semibold text-gray-900">{data.members.length} members</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {data.members.map((m) => m.name || m.role).join(", ")}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Helper</p>
            <p className="font-semibold text-gray-900">
              {data.helperDetails?.name || "—"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {data.helperDetails?.nationality} · Invite: {data.inviteCode}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Schedules</p>
            <p className="font-semibold text-gray-900">Both configured</p>
            <p className="text-xs text-gray-400 mt-0.5">AI will schedule accordingly</p>
          </div>
        </div>
      </div>

      {/* Generate button / Progress / Result */}
      {isGenerating ? (
        <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {PROGRESS_STEPS[progressStep]}
              </span>
              <span className="text-sm font-semibold text-primary">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-primary-400 h-2.5 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Animated dots */}
          <div className="flex items-center justify-center gap-3 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-sm text-gray-500">AI is building your schedule</span>
            </div>
          </div>

          {/* Step indicators */}
          <div className="grid grid-cols-3 gap-2">
            {PROGRESS_STEPS.map((label, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg transition-all duration-300 ${
                  i <= progressStep
                    ? "bg-primary/10 text-primary"
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
          className="w-full py-4 bg-primary text-white rounded-2xl font-semibold text-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-3 shadow-card hover:shadow-card-hover"
        >
          <Sparkles className="w-5 h-5" />
          <span>Generate Schedule with AI</span>
        </button>
      ) : (
        <div className="bg-green-50 rounded-2xl p-5 flex items-start gap-3 border border-green-100">
          <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-700">Schedule ready!</p>
            <p className="text-sm text-green-600/80 mt-0.5">
              Generated <strong>{taskCount} tasks</strong> across 7 days. You can edit everything from the dashboard.
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
