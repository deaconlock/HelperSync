"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { useState, useEffect, useMemo } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { AddTaskDialog } from "@/components/timetable/AddTaskDialog";
import { DayColumn } from "@/components/timetable/DayColumn";
import { LiveDayColumn } from "@/components/timetable/LiveDayColumn";
import { DailyInstructionDialog } from "@/components/timetable/DailyInstructionDialog";
import { toast } from "sonner";
import { toISODate, cn } from "@/lib/utils";
import { timeToMinutes } from "@/lib/timeUtils";
import {
  addDays,
  startOfWeek,
  format,
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { TimetableSkeleton } from "@/components/ui/Skeleton";
import { DAYS_OF_WEEK, DAY_LABELS, TaskItem, DayOfWeek } from "@/types/timetable";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { QuickRefineSheet } from "@/components/timetable/QuickRefineSheet";

type ViewMode = "template" | "live" | "dashboard";

function getWeekDates(weekOffset: number) {
  const now = new Date();
  const start = startOfWeek(addDays(now, weekOffset * 7), { weekStartsOn: 1 }); // Monday start
  return DAYS_OF_WEEK.map((_, i) => addDays(start, i));
}

export default function TimetablePage() {
  const { track } = useAnalytics();
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => { track("timetable_opened", {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const household = useQuery(api.households.getMyHousehold);
  const timetable = useQuery(
    api.timetable.getTimetable,
    household ? { householdId: household._id } : "skip"
  );
  const daysOff = useQuery(
    api.daysOff.getDaysOff,
    household ? { householdId: household._id } : "skip"
  );
  const moveTask = useMutation(api.timetable.moveTask);
  const addTask = useMutation(api.timetable.addTask);
  const deleteTask = useMutation(api.timetable.deleteTask);
  const updateTask = useMutation(api.timetable.updateTask);
  const setTimetable = useMutation(api.timetable.setTimetable);

  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const [weekOffset, setWeekOffset] = useState(0);
  const [addDialogDay, setAddDialogDay] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<{ day: string; task: TaskItem } | null>(null);
  const [selectedMobileDay, setSelectedMobileDay] = useState<DayOfWeek>(
    format(new Date(), "EEEE").toLowerCase() as DayOfWeek
  );
  const [isMobile, setIsMobile] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [showQuickRefine, setShowQuickRefine] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("helpersync-first-run-seen")) {
      setShowWelcomeBanner(true);
    }
  }, []);

  const dismissWelcome = () => {
    localStorage.setItem("helpersync-first-run-seen", "1");
    setShowWelcomeBanner(false);
  };

  const handleRegenerate = async (feedback: string) => {
    if (!household || !timetable) return;
    const currentSchedule = timetable.weeklyTasks.map((d) => ({
      day: d.day,
      tasks: d.tasks.map((t) => ({ taskName: t.taskName, time: t.time, category: t.category, area: t.area })),
    }));
    const res = await fetch("/api/ai/generate-timetable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rooms: household.rooms,
        members: household.members,
        helperDetails: household.helperDetails ?? { name: "Helper", nationality: "Philippines", language: "en" },
        priorities: [],
        helperExperience: "some",
        refineFeedback: feedback,
        currentSchedule,
      }),
    });
    if (!res.ok || !res.body) { toast.error("Regeneration failed"); return; }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let raw = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      raw += decoder.decode(value, { stream: true });
    }
    try {
      const parsed = JSON.parse(raw);
      const weeklyTasks = Array.isArray(parsed) ? parsed : parsed.weeklyTasks ?? [];
      await setTimetable({ householdId: household._id, weeklyTasks });
      dismissWelcome();
      toast.success("Timetable updated!");
    } catch {
      toast.error("Could not parse updated timetable");
    }
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ?add=1 from the + nav button — open add dialog for today then clear param
  useEffect(() => {
    if (searchParams.get("add") === "1") {
      const todayDay = format(new Date(), "EEEE").toLowerCase();
      setViewMode("live");
      setWeekOffset(0);
      setAddDialogDay(todayDay);
      router.replace("/dashboard/timetable");
    }
  }, [searchParams, router]);

  const weekDates = getWeekDates(weekOffset);
  const today = new Date();

  // Fetch task logs for the visible week in live mode
  // We'll fetch logs for each day individually since that's the query we have
  const mondayLogs = useQuery(
    api.taskLogs.getLogsForDate,
    household && viewMode === "live"
      ? { householdId: household._id, date: toISODate(weekDates[0]) }
      : "skip"
  );
  const tuesdayLogs = useQuery(
    api.taskLogs.getLogsForDate,
    household && viewMode === "live"
      ? { householdId: household._id, date: toISODate(weekDates[1]) }
      : "skip"
  );
  const wednesdayLogs = useQuery(
    api.taskLogs.getLogsForDate,
    household && viewMode === "live"
      ? { householdId: household._id, date: toISODate(weekDates[2]) }
      : "skip"
  );
  const thursdayLogs = useQuery(
    api.taskLogs.getLogsForDate,
    household && viewMode === "live"
      ? { householdId: household._id, date: toISODate(weekDates[3]) }
      : "skip"
  );
  const fridayLogs = useQuery(
    api.taskLogs.getLogsForDate,
    household && viewMode === "live"
      ? { householdId: household._id, date: toISODate(weekDates[4]) }
      : "skip"
  );
  const saturdayLogs = useQuery(
    api.taskLogs.getLogsForDate,
    household && viewMode === "live"
      ? { householdId: household._id, date: toISODate(weekDates[5]) }
      : "skip"
  );
  const sundayLogs = useQuery(
    api.taskLogs.getLogsForDate,
    household && viewMode === "live"
      ? { householdId: household._id, date: toISODate(weekDates[6]) }
      : "skip"
  );

  const logsPerDay = [mondayLogs, tuesdayLogs, wednesdayLogs, thursdayLogs, fridayLogs, saturdayLogs, sundayLogs];

  // Fetch daily instructions for the visible week in live mode
  const monInstructions = useQuery(
    api.taskInstructions.getForDate,
    household && viewMode === "live"
      ? { householdId: household._id, date: toISODate(weekDates[0]) }
      : "skip"
  );
  const tueInstructions = useQuery(
    api.taskInstructions.getForDate,
    household && viewMode === "live"
      ? { householdId: household._id, date: toISODate(weekDates[1]) }
      : "skip"
  );
  const wedInstructions = useQuery(
    api.taskInstructions.getForDate,
    household && viewMode === "live"
      ? { householdId: household._id, date: toISODate(weekDates[2]) }
      : "skip"
  );
  const thuInstructions = useQuery(
    api.taskInstructions.getForDate,
    household && viewMode === "live"
      ? { householdId: household._id, date: toISODate(weekDates[3]) }
      : "skip"
  );
  const friInstructions = useQuery(
    api.taskInstructions.getForDate,
    household && viewMode === "live"
      ? { householdId: household._id, date: toISODate(weekDates[4]) }
      : "skip"
  );
  const satInstructions = useQuery(
    api.taskInstructions.getForDate,
    household && viewMode === "live"
      ? { householdId: household._id, date: toISODate(weekDates[5]) }
      : "skip"
  );
  const sunInstructions = useQuery(
    api.taskInstructions.getForDate,
    household && viewMode === "live"
      ? { householdId: household._id, date: toISODate(weekDates[6]) }
      : "skip"
  );

  const instructionsPerDay = [monInstructions, tueInstructions, wedInstructions, thuInstructions, friInstructions, satInstructions, sunInstructions];

  // Fetch task overrides for each day in live mode
  const monOverrides = useQuery(api.taskOverrides.getForDate, household && viewMode === "live" ? { householdId: household._id, date: toISODate(weekDates[0]) } : "skip");
  const tueOverrides = useQuery(api.taskOverrides.getForDate, household && viewMode === "live" ? { householdId: household._id, date: toISODate(weekDates[1]) } : "skip");
  const wedOverrides = useQuery(api.taskOverrides.getForDate, household && viewMode === "live" ? { householdId: household._id, date: toISODate(weekDates[2]) } : "skip");
  const thuOverrides = useQuery(api.taskOverrides.getForDate, household && viewMode === "live" ? { householdId: household._id, date: toISODate(weekDates[3]) } : "skip");
  const friOverrides = useQuery(api.taskOverrides.getForDate, household && viewMode === "live" ? { householdId: household._id, date: toISODate(weekDates[4]) } : "skip");
  const satOverrides = useQuery(api.taskOverrides.getForDate, household && viewMode === "live" ? { householdId: household._id, date: toISODate(weekDates[5]) } : "skip");
  const sunOverrides = useQuery(api.taskOverrides.getForDate, household && viewMode === "live" ? { householdId: household._id, date: toISODate(weekDates[6]) } : "skip");
  const overridesPerDay = [monOverrides, tueOverrides, wedOverrides, thuOverrides, friOverrides, satOverrides, sunOverrides];

  const addOneOffTask = useMutation(api.taskOverrides.addOneOffTask);
  const skipTaskMutation = useMutation(api.taskOverrides.skipTask);
  const removeOverrideMutation = useMutation(api.taskOverrides.removeOverride);

  const [instructionTask, setInstructionTask] = useState<{ task: TaskItem; date: string; dayIdx: number } | null>(null);
  const [addOneOffDay, setAddOneOffDay] = useState<{ day: string; dayIdx: number } | null>(null);

  // Build instruction maps keyed by taskId for each day
  const instructionMaps = useMemo(() => {
    return instructionsPerDay.map((dayInstructions) => {
      const map: Record<string, { instruction: string; photoUrl?: string | null; photoStorageId?: string | null }> = {};
      dayInstructions?.forEach((di) => {
        map[di.taskId] = { instruction: di.instruction, photoUrl: di.photoUrl, photoStorageId: di.photoStorageId };
      });
      return map;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monInstructions, tueInstructions, wedInstructions, thuInstructions, friInstructions, satInstructions, sunInstructions]);

  // Build override data per day: skipped IDs, one-off tasks, one-off IDs
  const overrideData = useMemo(() => {
    return overridesPerDay.map((dayOverrides) => {
      const skippedIds = new Set<string>();
      const oneOffIds = new Set<string>();
      const addedTasks: TaskItem[] = [];

      dayOverrides?.forEach((o) => {
        if (o.type === "skip") {
          skippedIds.add(o.taskId);
        } else if (o.type === "add" && o.taskName && o.time && o.area && o.category) {
          oneOffIds.add(o.taskId);
          addedTasks.push({
            taskId: o.taskId,
            taskName: o.taskName,
            time: o.time,
            area: o.area,
            category: o.category,
            recurring: false,
            requiresPhoto: false,
            emoji: o.emoji,
            notes: o.notes,
          });
        }
      });

      return { skippedIds, oneOffIds, addedTasks };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monOverrides, tueOverrides, wedOverrides, thuOverrides, friOverrides, satOverrides, sunOverrides]);

  if (!household || !timetable) {
    return <TimetableSkeleton />;
  }

  const getTasksForDay = (day: string): TaskItem[] => {
    return timetable.weeklyTasks.find((d) => d.day === day)?.tasks ?? [];
  };

  // Merge template tasks with overrides for live view
  const getMergedTasksForDay = (day: string, dayIdx: number): TaskItem[] => {
    const templateTasks = getTasksForDay(day);
    const { addedTasks } = overrideData[dayIdx];
    // Don't filter out skipped — we'll show them as muted. Merge added tasks.
    const merged = [...templateTasks, ...addedTasks];
    return merged.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    // Parse IDs: template format "day::taskId", live format "live::day::taskId"
    const activeParts = String(active.id).split("::");
    const overParts = String(over.id).split("::");

    const isLive = activeParts[0] === "live";
    const fromDay = isLive ? activeParts[1] : activeParts[0];
    const taskId = isLive ? activeParts[2] : activeParts[1];
    const toDay = isLive ? overParts[1] : overParts[0];
    const overTaskId = isLive ? overParts[2] : overParts[1];

    if (!fromDay || !taskId || !toDay) return;
    if (active.id === over.id) return;

    if (fromDay === toDay && overTaskId) {
      // Within-day reorder: swap the times of the two tasks
      const dayTasks = getTasksForDay(fromDay);
      const draggedTask = dayTasks.find((t) => t.taskId === taskId);
      const targetTask = dayTasks.find((t) => t.taskId === overTaskId);

      if (draggedTask && targetTask && draggedTask.time !== targetTask.time) {
        try {
          await Promise.all([
            updateTask({
              householdId: household._id,
              day: fromDay,
              taskId: taskId,
              updates: { time: targetTask.time },
            }),
            updateTask({
              householdId: household._id,
              day: fromDay,
              taskId: overTaskId,
              updates: { time: draggedTask.time },
            }),
          ]);
        } catch {
          toast.error("Failed to reorder tasks");
        }
      }
    } else {
      // Cross-day move
      const overIndex = overTaskId
        ? getTasksForDay(toDay).findIndex((t) => t.taskId === overTaskId)
        : 0;

      try {
        await moveTask({
          householdId: household._id,
          fromDay,
          toDay,
          taskId,
          newIndex: Math.max(0, overIndex),
        });
      } catch {
        toast.error("Failed to move task");
      }
    }
  };

  const isDayOff = (date: Date) => {
    const dateStr = toISODate(date);
    return daysOff?.find((d) => d.date === dateStr);
  };

  return (
    <div className="space-y-4 animate-fade-in-up pt-0.5">
      {/* FTUX welcome card */}
      {showWelcomeBanner && (
        <div className="rounded-2xl bg-gray-900 text-white px-4 py-4 flex flex-col gap-3 relative">
          <button
            onClick={dismissWelcome}
            className="absolute top-3 right-3 text-white/50 hover:text-white/80 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          <div>
            <p className="text-base font-semibold leading-snug">Your week is ready</p>
            <p className="text-xs text-white/60 mt-0.5">Built from your home, your routine, your family. Just tune it.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuickRefine(true)}
              className="flex-1 py-2.5 rounded-xl bg-white text-gray-900 text-sm font-semibold transition-opacity hover:opacity-90 text-center"
            >
              Quick Refine
            </button>
            <button
              onClick={dismissWelcome}
              className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium transition-colors hover:bg-white/20 text-center"
            >
              Looks good
            </button>
          </div>
        </div>
      )}

      <QuickRefineSheet
        open={showQuickRefine}
        onClose={() => setShowQuickRefine(false)}
        onRegenerate={handleRegenerate}
        household={household ?? null}
      />

      {/* Header with toggle */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-gray-900">Timetable</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-xl p-0.5 w-full sm:w-auto">
            <button
              onClick={() => setViewMode("template")}
              className={cn(
                "flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                viewMode === "template"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "text-text-secondary hover:text-gray-700"
              )}
            >
              Weekly Plan
            </button>
            <button
              onClick={() => setViewMode("live")}
              className={cn(
                "flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                viewMode === "live"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "text-text-secondary hover:text-gray-700"
              )}
            >
              Live Schedule
            </button>
            <button
              onClick={() => setViewMode("dashboard")}
              className={cn(
                "flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                viewMode === "dashboard"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "text-text-secondary hover:text-gray-700"
              )}
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>


      {/* Mobile day selector */}
      {isMobile && viewMode !== "dashboard" && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1 -mx-1 px-1">
          {DAYS_OF_WEEK.map((day, i) => {
            const isSelected = selectedMobileDay === day;
            const dayDate = weekDates[i];
            const isToday = isSameDay(dayDate, new Date());

            return (
              <button
                key={day}
                onClick={() => setSelectedMobileDay(day)}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 min-w-[48px]",
                  isSelected
                    ? "bg-gray-900 text-white shadow-sm scale-105"
                    : isToday
                      ? "bg-white text-gray-900 border-2 border-gray-900 shadow-sm"
                      : "bg-white text-text-secondary border border-border hover:bg-gray-50"
                )}
              >
                <span>{DAY_LABELS[day].slice(0, 3)}</span>
                <span className={cn(
                  "text-[10px] font-medium leading-none",
                  isSelected ? "text-white/80" : isToday ? "text-gray-900" : "text-text-muted"
                )}>
                  {format(dayDate, "d")}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Week navigator (live mode only) */}
      {viewMode === "live" && household && (
        <div className="flex items-center justify-between bg-white rounded-2xl border border-border px-4 py-2.5">
          <button
            onClick={() => { setWeekOffset((w) => w - 1); setSelectedMobileDay("monday" as DayOfWeek); }}
            className="p-1.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">
              {format(weekDates[0], "d MMM")} — {format(weekDates[6], "d MMM yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {weekOffset !== 0 && (
              <button
                onClick={() => { setWeekOffset(0); setSelectedMobileDay(format(new Date(), "EEEE").toLowerCase() as DayOfWeek); }}
                className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200 font-medium"
              >
                Today
              </button>
            )}
            <button
              onClick={() => { setWeekOffset((w) => w + 1); setSelectedMobileDay("monday" as DayOfWeek); }}
              className="p-1.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Dashboard view */}
      {viewMode === "dashboard" && household && (
        <DashboardView householdId={household._id} />
      )}

      {/* Grid */}
      {viewMode !== "dashboard" && (viewMode === "template" ? (
        isMobile ? (
          /* Mobile: single day column — no DnD needed */
          <DayColumn
            day={selectedMobileDay}
            label={DAY_LABELS[selectedMobileDay]}
            tasks={getTasksForDay(selectedMobileDay)}
            onAddTask={() => setAddDialogDay(selectedMobileDay)}
            onEditTask={(task) => setEditTask({ day: selectedMobileDay, task })}
            onDeleteTask={async (taskId) => {
              try {
                await deleteTask({ householdId: household._id, day: selectedMobileDay, taskId });
              } catch {
                toast.error("Failed to delete task");
              }
            }}
          />
        ) : (
          /* Desktop: 7-column grid with drag & drop */
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-7 gap-2 min-w-0">
              {DAYS_OF_WEEK.map((day) => (
                <DayColumn
                  key={day}
                  day={day}
                  label={DAY_LABELS[day]}
                  tasks={getTasksForDay(day)}
                  onAddTask={() => setAddDialogDay(day)}
                  onEditTask={(task) => setEditTask({ day, task })}
                  onDeleteTask={async (taskId) => {
                    try {
                      await deleteTask({ householdId: household._id, day, taskId });
                    } catch {
                      toast.error("Failed to delete task");
                    }
                  }}
                />
              ))}
            </div>
          </DndContext>
        )
      ) : isMobile ? (
        /* Mobile: single live day */
        (() => {
          const dayIdx = DAYS_OF_WEEK.indexOf(selectedMobileDay);
          const date = weekDates[dayIdx];
          const dayOff = isDayOff(date);
          const isToday = isSameDay(date, today);
          const isPast = date < today && !isToday;
          const tasks = getMergedTasksForDay(selectedMobileDay, dayIdx);
          const logs = logsPerDay[dayIdx];
          const completedIds = new Set(logs?.map((l) => l.taskId) ?? []);
          const { skippedIds, oneOffIds } = overrideData[dayIdx];

          return (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <LiveDayColumn
                day={selectedMobileDay}
                date={date}
                tasks={tasks}
                completedIds={completedIds}
                dayOff={dayOff ?? null}
                isToday={isToday}
                isPast={isPast}
                dailyInstructions={instructionMaps[dayIdx]}
                onTaskClick={(task) => setInstructionTask({ task, date: toISODate(date), dayIdx })}
                onEditTask={(task) => setEditTask({ day: selectedMobileDay, task })}
                onDeleteTask={async (taskId) => {
                  try {
                    await deleteTask({ householdId: household._id, day: selectedMobileDay, taskId });
                  } catch { toast.error("Failed to delete task"); }
                }}
                onSkipTask={async (taskId) => {
                  try {
                    await skipTaskMutation({ householdId: household._id, date: toISODate(date), taskId });
                  } catch { toast.error("Failed to skip task"); }
                }}
                onUnskipTask={async (taskId) => {
                  try {
                    await removeOverrideMutation({ householdId: household._id, date: toISODate(date), taskId });
                  } catch { toast.error("Failed to restore task"); }
                }}
                skippedTaskIds={skippedIds}
                oneOffTaskIds={oneOffIds}
                sortableEnabled={!showWelcomeBanner}
              />
            </DndContext>
          );
        })()
      ) : (
        /* Desktop: 7-column live grid */
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-7 gap-2 min-w-0">
            {DAYS_OF_WEEK.map((day, i) => {
              const date = weekDates[i];
              const dateStr = toISODate(date);
              const dayOff = isDayOff(date);
              const isToday = isSameDay(date, today);
              const isPast = date < today && !isToday;
              const tasks = getMergedTasksForDay(day, i);
              const logs = logsPerDay[i];
              const completedIds = new Set(logs?.map((l) => l.taskId) ?? []);
              const { skippedIds, oneOffIds } = overrideData[i];

              return (
                <LiveDayColumn
                  key={dateStr}
                  day={day}
                  date={date}
                  tasks={tasks}
                  completedIds={completedIds}
                  dayOff={dayOff ?? null}
                  isToday={isToday}
                  isPast={isPast}
                  dailyInstructions={instructionMaps[i]}
                  onTaskClick={(task) => setInstructionTask({ task, date: dateStr, dayIdx: i })}
                  onEditTask={(task) => setEditTask({ day, task })}
                  onDeleteTask={async (taskId) => {
                    try {
                      await deleteTask({ householdId: household._id, day, taskId });
                    } catch { toast.error("Failed to delete task"); }
                  }}
                  onSkipTask={async (taskId) => {
                    try {
                      await skipTaskMutation({ householdId: household._id, date: dateStr, taskId });
                    } catch { toast.error("Failed to skip task"); }
                  }}
                  onUnskipTask={async (taskId) => {
                    try {
                      await removeOverrideMutation({ householdId: household._id, date: dateStr, taskId });
                    } catch { toast.error("Failed to restore task"); }
                  }}
                  skippedTaskIds={skippedIds}
                  oneOffTaskIds={oneOffIds}
                  sortableEnabled={!showWelcomeBanner}
                />
              );
            })}
          </div>
        </DndContext>
      ))}

      {/* Add task dialog */}
      {addDialogDay && (
        <AddTaskDialog
          day={addDialogDay}
          rooms={household.rooms}
          existingTasks={getTasksForDay(addDialogDay)}
          onAdd={async (task) => {
            try {
              await addTask({ householdId: household._id, day: addDialogDay, task });
              setAddDialogDay(null);
              toast.success("Task added!");
            } catch {
              toast.error("Failed to add task");
            }
          }}
          onClose={() => setAddDialogDay(null)}
        />
      )}

      {/* Edit task dialog */}
      {editTask && (
        <AddTaskDialog
          day={editTask.day}
          rooms={household.rooms}
          existingTasks={getTasksForDay(editTask.day)}
          initialTask={editTask.task}
          onAdd={async (task) => {
            try {
              await updateTask({
                householdId: household._id,
                day: editTask.day,
                taskId: editTask.task.taskId,
                updates: {
                  time: task.time,
                  duration: task.duration,
                  taskName: task.taskName,
                  area: task.area,
                  category: task.category,
                  recurring: task.recurring,
                  requiresPhoto: task.requiresPhoto,
                  emoji: task.emoji,
                  notes: task.notes,
                },
              });
              setEditTask(null);
              toast.success("Task updated!");
            } catch {
              toast.error("Failed to update task");
            }
          }}
          onClose={() => setEditTask(null)}
        />
      )}

      {/* Daily instruction dialog */}
      {instructionTask && (
        <DailyInstructionDialog
          task={instructionTask.task}
          date={instructionTask.date}
          householdId={household._id}
          existing={instructionMaps[instructionTask.dayIdx]?.[instructionTask.task.taskId] ?? null}
          onClose={() => setInstructionTask(null)}
        />
      )}

      {/* Add one-off task dialog */}
      {addOneOffDay && (
        <AddTaskDialog
          day={addOneOffDay.day}
          rooms={household.rooms}
          existingTasks={getMergedTasksForDay(addOneOffDay.day, addOneOffDay.dayIdx)}
          onAdd={async (task) => {
            try {
              const dateStr = toISODate(weekDates[addOneOffDay.dayIdx]);
              await addOneOffTask({
                householdId: household._id,
                date: dateStr,
                taskId: task.taskId,
                taskName: task.taskName,
                time: task.time,
                area: task.area,
                category: task.category,
                emoji: task.emoji,
                notes: task.notes,
              });
              setAddOneOffDay(null);
              toast.success("One-off task added!");
            } catch {
              toast.error("Failed to add task");
            }
          }}
          onClose={() => setAddOneOffDay(null)}
        />
      )}

      {/* Sticky floating refine button */}
      <div className="fixed bottom-24 right-4 z-30 sm:bottom-6">
        <button
          onClick={() => setShowQuickRefine(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gray-900 text-white text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Refine plan
        </button>
      </div>
    </div>
  );
}
