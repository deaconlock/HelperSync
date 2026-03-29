"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useTranslation } from "@/lib/i18n";
import { format, addDays, isBefore, startOfDay, isSameDay } from "date-fns";
import { toISODate } from "@/lib/utils";
import { timeToMinutes } from "@/lib/timeUtils";
import { TaskCard } from "@/components/helper/TaskCard";
import { DaySelectorStrip } from "@/components/helper/DaySelectorStrip";
import { useTaskTranslations } from "@/hooks/useTaskTranslations";
import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { HelperHomeSkeleton } from "@/components/ui/Skeleton";
import { MedicationCard } from "@/components/helper/MedicationCard";
import { EmergencyInfoCard } from "@/components/helper/EmergencyInfoCard";
import { HouseholdMember } from "@/types/household";

export default function HelperHomePage() {
  const { t, language } = useTranslation();
  const session = useQuery(api.helperSessions.getMySession);
  const household = useQuery(api.households.getMyHousehold);

  // Use session's householdId if helper, or household's _id if employer preview
  const householdId = session?.householdId ?? household?._id;

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const selectedDateStr = toISODate(selectedDate);
  const selectedDay = format(selectedDate, "EEEE").toLowerCase();
  const isToday = isSameDay(selectedDate, today);
  const isPastDay = isBefore(startOfDay(selectedDate), startOfDay(today));

  // 5-day window dates for completion queries
  const day0 = addDays(today, -2);
  const day1 = addDays(today, -1);
  const day2 = today;
  const day3 = addDays(today, 1);
  const day4 = addDays(today, 2);

  const timetable = useQuery(
    api.timetable.getTimetable,
    householdId ? { householdId } : "skip"
  );

  const taskLogs = useQuery(
    api.taskLogs.getLogsForDate,
    householdId ? { householdId, date: selectedDateStr } : "skip"
  );

  // Fetch logs for all 5 days to show completion indicators on the date strip
  const logs0 = useQuery(api.taskLogs.getLogsForDate, householdId ? { householdId, date: toISODate(day0) } : "skip");
  const logs1 = useQuery(api.taskLogs.getLogsForDate, householdId ? { householdId, date: toISODate(day1) } : "skip");
  const logs2 = useQuery(api.taskLogs.getLogsForDate, householdId ? { householdId, date: toISODate(day2) } : "skip");
  const logs3 = useQuery(api.taskLogs.getLogsForDate, householdId ? { householdId, date: toISODate(day3) } : "skip");
  const logs4 = useQuery(api.taskLogs.getLogsForDate, householdId ? { householdId, date: toISODate(day4) } : "skip");

  const daysOff = useQuery(
    api.daysOff.getDaysOff,
    householdId ? { householdId } : "skip"
  );

  const dailyInstructions = useQuery(
    api.taskInstructions.getForDate,
    householdId ? { householdId, date: selectedDateStr } : "skip"
  );

  const dailyOverrides = useQuery(
    api.taskOverrides.getForDate,
    householdId ? { householdId, date: selectedDateStr } : "skip"
  );

  // Collect all task names for translation — must be before any early return
  const allTaskNames = useMemo(() => {
    if (!timetable) return [];
    const names = new Set<string>();
    timetable.weeklyTasks.forEach((day) =>
      day.tasks.forEach((task) => names.add(task.taskName))
    );
    return Array.from(names);
  }, [timetable]);

  const { translateTask, isTranslating } = useTaskTranslations(allTaskNames, language);

  // Build completion map for the date strip
  const completionMap = useMemo(() => {
    if (!timetable) return {};
    const map: Record<string, { done: number; total: number }> = {};
    const days = [day0, day1, day2, day3, day4];
    const allLogs = [logs0, logs1, logs2, logs3, logs4];

    days.forEach((date, i) => {
      const dayName = format(date, "EEEE").toLowerCase();
      const tasks = timetable.weeklyTasks.find((d) => d.day === dayName)?.tasks ?? [];
      const logs = allLogs[i];
      const completedIds = new Set(logs?.map((l) => l.taskId) ?? []);
      const done = tasks.filter((t) => completedIds.has(t.taskId)).length;
      map[toISODate(date)] = { done, total: tasks.length };
    });

    return map;
  }, [timetable, logs0, logs1, logs2, logs3, logs4, day0, day1, day2, day3, day4]);

  // Build instruction map keyed by taskId
  const instructionMap = useMemo(() => {
    const map: Record<string, { instruction: string; photoUrl?: string | null }> = {};
    dailyInstructions?.forEach((di) => {
      map[di.taskId] = { instruction: di.instruction, photoUrl: di.photoUrl };
    });
    return map;
  }, [dailyInstructions]);

  if (!session && !household) return <HelperHomeSkeleton />;

  // Merge template tasks with overrides
  const templateTasks = timetable?.weeklyTasks.find((d) => d.day === selectedDay)?.tasks ?? [];
  const skippedIds = new Set<string>();
  const addedTasks: typeof templateTasks = [];
  dailyOverrides?.forEach((o) => {
    if (o.type === "skip") {
      skippedIds.add(o.taskId);
    } else if (o.type === "add" && o.taskName && o.time && o.area && o.category) {
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
  const tasks = [...templateTasks.filter((t) => !skippedIds.has(t.taskId)), ...addedTasks]
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  const completedIds = new Set(taskLogs?.map((l) => l.taskId) ?? []);

  const isRestDay = daysOff?.some((d) => d.date === selectedDateStr);

  const helperName = household?.helperDetails?.name ?? "there";

  const completedCount = tasks.filter((t) => completedIds.has(t.taskId)).length;

  const elderlyMembers = (household?.members ?? []).filter(
    (m): m is HouseholdMember & { role: "Elderly" } => m.role === "Elderly"
  );

  return (
    <div className="pt-6 space-y-5 animate-fade-in-up">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-display font-semibold tracking-tight text-gray-900">
          {t("greeting")}, {helperName}! 👋
        </h1>
        <p className="text-text-secondary mt-1 text-sm">{format(today, "EEEE, d MMMM yyyy")}</p>
      </div>

      {/* Emergency info + Medication checklist for elderly members */}
      {elderlyMembers.length > 0 && (
        <>
          <EmergencyInfoCard elderlyMembers={elderlyMembers} />
          {householdId && isToday && (
            <MedicationCard
              elderlyMembers={elderlyMembers}
              householdId={householdId}
              date={selectedDateStr}
            />
          )}
        </>
      )}

      {/* Translation loading indicator */}
      {isTranslating && language !== "en" && (
        <div className="flex items-center gap-2 text-sm text-gray-400 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("translating") || "Translating tasks..."}
        </div>
      )}

      {/* Date selector strip */}
      <DaySelectorStrip
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        completionMap={completionMap}
      />

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {completedCount} {t("of")} {tasks.length} {t("tasks_completed")}
          </span>
          <span className="text-sm text-primary font-medium">
            {tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }}
          />
        </div>
        {/* Context label for non-today */}
        {!isToday && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            {isPastDay
              ? `${format(selectedDate, "EEEE, d MMM")} — ${t("completed") || "completed"}`
              : `${format(selectedDate, "EEEE, d MMM")} — ${t("upcoming") || "upcoming"}`
            }
          </p>
        )}
      </div>

      {/* Tasks or rest day */}
      {isRestDay ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-xl font-semibold text-gray-700">{t("rest_day")}</p>
          <p className="text-gray-400 text-sm mt-1">Enjoy your day off!</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-400">{t("no_tasks")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.taskId}
              task={task}
              isDone={completedIds.has(task.taskId)}
              householdId={householdId!}
              date={selectedDateStr}
              translatedName={translateTask(task.taskName)}
              readOnly={isPastDay}
              permanentNotes={task.notes}
              dailyInstruction={instructionMap[task.taskId]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
