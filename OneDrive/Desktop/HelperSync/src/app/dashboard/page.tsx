"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { format } from "date-fns";
import { toISODate, getTaskEmoji } from "@/lib/utils";
import { CheckCircle2, Camera, X, Sparkles, ArrowRight, ChevronRight, Pill } from "lucide-react";
import { useAi } from "@/lib/ai-context";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import Link from "next/link";

const AI_CHIPS = [
  { label: "What's pending?", prompt: "What tasks are still pending for today?" },
  { label: "Reschedule", prompt: "Reschedule tasks for " },
  { label: "Add a task", prompt: "Add a new task: " },
  { label: "Weekly summary", prompt: "Give me a summary of how the week is going so far." },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Circular progress ring component
function ProgressRing({
  progress,
  size = 100,
  strokeWidth = 8,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-gray-200 dark:text-gray-700"
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={progress === 100 ? "#10b981" : "#0D9488"}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

export default function DashboardPage() {
  const { openAi } = useAi();
  const { user } = useUser();
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const household = useQuery(api.households.getMyHousehold);
  const today = new Date();
  const todayStr = toISODate(today);
  const todayDay = format(today, "EEEE").toLowerCase();

  const timetable = useQuery(
    api.timetable.getTimetable,
    household ? { householdId: household._id } : "skip"
  );
  const taskLogs = useQuery(
    api.taskLogs.getLogsForDate,
    household ? { householdId: household._id, date: todayStr } : "skip"
  );

  const medLogs = useQuery(
    api.medicationLogs.getLogsForDate,
    household ? { householdId: household._id, date: todayStr } : "skip"
  );

  const elderlyMembers = household?.members.filter((m) => m.role === "Elderly" && m.medications?.trim()) ?? [];

  const todayTasks =
    timetable?.weeklyTasks.find((d) => d.day === todayDay)?.tasks ?? [];

  const completedIds = new Set(taskLogs?.map((l) => l.taskId) ?? []);
  const completed = todayTasks.filter((t) => completedIds.has(t.taskId)).length;
  const pending = todayTasks.length - completed;
  const withPhoto = taskLogs?.filter((l) => l.photoUrl && l.photoUrl !== "upload").length ?? 0;
  const progressPercent = todayTasks.length > 0 ? Math.round((completed / todayTasks.length) * 100) : 0;

  const firstName = user?.firstName ?? "there";
  const helperName = household?.helperDetails?.name ?? "Helper";

  if (!household) {
    return <DashboardSkeleton />;
  }

  // Split tasks into completed and pending for better display
  const pendingTasks = todayTasks.filter((t) => !completedIds.has(t.taskId));
  const completedTasks = todayTasks.filter((t) => completedIds.has(t.taskId));

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in-up">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-gray-900">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {format(today, "EEEE, d MMMM yyyy")}
        </p>
      </div>

      {/* Hero progress card */}
      <div className="bg-white rounded-2xl shadow-card p-5 sm:p-6 animate-fade-in-up">
        <div className="flex items-center gap-5 sm:gap-6">
          {/* Progress ring */}
          <div className="relative flex-shrink-0">
            <ProgressRing progress={progressPercent} size={96} strokeWidth={8} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold text-gray-900">{progressPercent}%</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-semibold tracking-tight text-gray-900 text-base mb-3">
              {helperName}&apos;s Progress
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-xl font-semibold text-gray-900">{todayTasks.length}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wide">Total</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-green-600">{completed}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wide">Done</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-amber-500">{pending}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wide">Pending</p>
              </div>
            </div>
            {withPhoto > 0 && (
              <div className="flex items-center gap-1.5 mt-3">
                <Camera className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-text-secondary">{withPhoto} photo proof{withPhoto !== 1 ? "s" : ""} uploaded</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Medication adherence card */}
      {elderlyMembers.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
              <Pill className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Medication Adherence</h3>
              <p className="text-xs text-gray-500">Today&apos;s status</p>
            </div>
            {medLogs && elderlyMembers.length > 0 && medLogs.length >= elderlyMembers.length && (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />
            )}
          </div>
          <div className="space-y-2">
            {elderlyMembers.map((member) => {
              const log = medLogs?.find((l) => l.memberName === member.name);
              return (
                <div key={member.name} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-gray-50">
                  <span className="text-base">👴</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                    <p className="text-xs text-gray-500 truncate">{member.medications}</p>
                  </div>
                  {log ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {log.photoDisplayUrl && (
                        <img
                          src={log.photoDisplayUrl}
                          alt="Proof"
                          className="w-8 h-8 rounded-lg object-cover cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          onClick={() => setExpandedPhoto(log.photoDisplayUrl)}
                        />
                      )}
                      <div className="text-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <p className="text-[10px] text-gray-400">
                          {format(new Date(log.completedAt), "h:mma")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-amber-500 bg-amber-50 px-2 py-1 rounded-full">
                      Pending
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Assistant card */}
      <div className="bg-gray-50 rounded-2xl shadow-card-flat p-4 border border-border">
        <button
          onClick={() => openAi()}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-border text-left hover:border-gray-300 hover:shadow-xs transition-all duration-200 group mb-3"
        >
          <Sparkles className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
          <span className="flex-1 text-sm text-text-muted">Ask AI to help manage the schedule...</span>
          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
        </button>
        <div className="flex flex-wrap gap-1.5">
          {AI_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => openAi(chip.prompt)}
              className="px-2.5 py-1 bg-white border border-border rounded-full text-[11px] font-medium text-text-secondary hover:border-gray-300 hover:text-primary transition-all duration-200"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pending tasks */}
      {pendingTasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold tracking-tight text-gray-900 text-sm">
              Up Next ({pendingTasks.length})
            </h3>
            <Link
              href="/dashboard/timetable"
              className="flex items-center gap-1 text-xs text-text-secondary font-medium hover:text-primary transition-colors"
            >
              Full timetable
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="relative space-y-2 stagger-list">
            {/* Timeline line */}
            {pendingTasks.length > 1 && (
              <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gray-100 z-0" />
            )}
            {pendingTasks.map((task) => {
              const emoji = task.emoji ?? getTaskEmoji(task.taskName, task.category);
              return (
                <div
                  key={task.taskId}
                  className="relative z-10 bg-white rounded-xl border border-border p-3 flex items-center gap-3 hover:shadow-card transition-all duration-200 group"
                >
                  {/* Left accent bar */}
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary/60" />
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0 ring-1 ring-border">
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.taskName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-text-muted">{task.time}</span>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-text-muted">{task.area}</span>
                      {task.category && (
                        <>
                          <span className="text-gray-200">·</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-text-secondary rounded-full font-medium">
                            {task.category}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {task.requiresPhoto && (
                    <div className="flex items-center gap-1 text-text-muted flex-shrink-0">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <div>
          <h3 className="font-semibold tracking-tight text-gray-900 text-sm mb-3">
            Completed ({completedTasks.length})
          </h3>
          <div className="space-y-2 stagger-list">
            {completedTasks.map((task) => {
              const log = taskLogs?.find((l) => l.taskId === task.taskId);
              const emoji = task.emoji ?? getTaskEmoji(task.taskName, task.category);

              return (
                <div
                  key={task.taskId}
                  className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 border border-border opacity-70"
                >
                  {/* Left accent bar — completed */}
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-gray-300" />
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-secondary line-through truncate">{task.taskName}</p>
                    <p className="text-xs text-text-muted">{task.time} · {task.area}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {log?.photoDisplayUrl && (
                      <img
                        src={log.photoDisplayUrl}
                        alt="Proof"
                        className="w-9 h-9 rounded-lg object-cover cursor-pointer hover:ring-2 hover:ring-primary transition-all duration-200"
                        onClick={() => setExpandedPhoto(log.photoDisplayUrl)}
                      />
                    )}
                    <CheckCircle2 className="w-5 h-5 text-green-500 animate-checkmark" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {todayTasks.length === 0 && (
        <div className="bg-white rounded-2xl border border-border p-8 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold text-gray-800 mb-1">No tasks for today</p>
          <p className="text-sm text-text-muted mb-4">
            {helperName} has nothing scheduled. Add tasks via the timetable.
          </p>
          <Link
            href="/dashboard/timetable"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors duration-200"
          >
            Go to Timetable
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* All done state */}
      {todayTasks.length > 0 && pending === 0 && (
        <div className="bg-green-50/60 rounded-2xl p-5 text-center border border-green-100/60">
          <p className="text-3xl mb-2">🎉</p>
          <p className="font-semibold text-green-700">All tasks completed!</p>
          <p className="text-sm text-green-600/70 mt-1">
            {helperName} has finished everything for today.
          </p>
        </div>
      )}

      {/* Photo lightbox */}
      {expandedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setExpandedPhoto(null)}
        >
          <div className="relative max-w-2xl max-h-[80vh]">
            <button
              onClick={() => setExpandedPhoto(null)}
              className="absolute -top-3 -right-3 bg-white rounded-full p-1.5 shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
            <img
              src={expandedPhoto}
              alt="Task proof"
              className="rounded-2xl max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
