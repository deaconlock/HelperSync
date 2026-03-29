"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { useState, useEffect, useMemo } from "react";
import { DAYS_OF_WEEK, DAY_LABELS, TaskItem, DayOfWeek } from "@/types/timetable";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TimetableSkeleton } from "@/components/ui/Skeleton";

type ViewMode = "template" | "live";

function getWeekDates(weekOffset: number) {
  const now = new Date();
  const start = startOfWeek(addDays(now, weekOffset * 7), { weekStartsOn: 1 }); // Monday start
  return DAYS_OF_WEEK.map((_, i) => addDays(start, i));
}

export default function TimetablePage() {
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

  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const [weekOffset, setWeekOffset] = useState(0);
  const [addDialogDay, setAddDialogDay] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<{ day: string; task: TaskItem } | null>(null);
  const [selectedMobileDay, setSelectedMobileDay] = useState<DayOfWeek>(
    format(new Date(), "EEEE").toLowerCase() as DayOfWeek
  );
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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

  const totalTasks = timetable.weeklyTasks.reduce((sum, d) => sum + d.tasks.length, 0);

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header with toggle */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-display font-semibold tracking-tight text-gray-900">Timetable</h1>
          <p className="text-sm text-text-muted sm:hidden">{totalTasks} tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-text-muted hidden sm:block">{totalTasks} tasks</p>
          <div className="flex bg-gray-100 rounded-xl p-0.5 w-full sm:w-auto">
            <button
              onClick={() => setViewMode("template")}
              className={cn(
                "flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                viewMode === "template"
                  ? "bg-white text-gray-900 shadow-xs"
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
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-text-secondary hover:text-gray-700"
              )}
            >
              Live Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Mobile day selector */}
      {isMobile && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
          {DAYS_OF_WEEK.map((day, i) => {
            const isSelected = selectedMobileDay === day;
            const dayDate = weekDates[i];
            const isToday = isSameDay(dayDate, new Date());
            const isPast = dayDate < new Date() && !isToday;
            const taskCount = getTasksForDay(day).length;

            return (
              <button
                key={day}
                onClick={() => setSelectedMobileDay(day)}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 min-w-[48px]",
                  isSelected
                    ? "bg-gray-900 text-white shadow-sm scale-105"
                    : isToday
                      ? "bg-white text-gray-900 ring-1 ring-gray-200 shadow-sm"
                      : isPast
                        ? "bg-gray-50 text-text-muted"
                        : "bg-white text-text-secondary border border-border hover:bg-gray-50"
                )}
              >
                <span>{DAY_LABELS[day].slice(0, 3)}</span>
                {taskCount > 0 && (
                  <span className={cn(
                    "text-[9px] font-semibold rounded-full px-1 leading-none",
                    isSelected ? "text-white/70" : isToday ? "text-gray-400" : "text-text-muted"
                  )}>
                    {taskCount}
                  </span>
                )}
                {isToday && !isSelected && (
                  <div className="w-1 h-1 rounded-full bg-gray-900" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Week navigator (live mode only) */}
      {viewMode === "live" && (
        <div className="flex items-center justify-between bg-white rounded-2xl border border-border px-4 py-2.5">
          <button
            onClick={() => { setWeekOffset((w) => w - 1); setSelectedMobileDay("monday" as DayOfWeek); }}
            className="p-1.5 text-text-muted hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors duration-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">
              {format(weekDates[0], "d MMM")} — {format(weekDates[6], "d MMM yyyy")}
            </p>
            {weekOffset === 0 && (
              <p className="text-xs text-primary font-medium">This week</p>
            )}
            {weekOffset === 1 && (
              <p className="text-xs text-text-muted">Next week</p>
            )}
            {weekOffset === -1 && (
              <p className="text-xs text-text-muted">Last week</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {weekOffset !== 0 && (
              <button
                onClick={() => { setWeekOffset(0); setSelectedMobileDay(format(new Date(), "EEEE").toLowerCase() as DayOfWeek); }}
                className="px-2 py-1 text-xs text-primary hover:bg-gray-50 rounded-lg transition-colors duration-200 font-medium"
              >
                Today
              </button>
            )}
            <button
              onClick={() => { setWeekOffset((w) => w + 1); setSelectedMobileDay("monday" as DayOfWeek); }}
              className="p-1.5 text-text-muted hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors duration-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {viewMode === "template" ? (
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
                onAddOneOff={() => setAddOneOffDay({ day: selectedMobileDay, dayIdx })}
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
                sortableEnabled
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
                  onAddOneOff={() => setAddOneOffDay({ day, dayIdx: i })}
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
                  sortableEnabled
                />
              );
            })}
          </div>
        </DndContext>
      )}

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
    </div>
  );
}
