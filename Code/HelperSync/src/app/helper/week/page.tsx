"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useTranslation } from "@/lib/i18n";
import { format, isBefore, startOfDay } from "date-fns";
import { toISODate } from "@/lib/utils";
import { TaskCard } from "@/components/helper/TaskCard";
import { DaySelectorStrip } from "@/components/helper/DaySelectorStrip";
import { useState, useMemo } from "react";
import { HelperHomeSkeleton } from "@/components/ui/Skeleton";

export default function HelperWeekPage() {
  const { t } = useTranslation();
  const session = useQuery(api.helperSessions.getMySession);
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const selectedDateStr = toISODate(selectedDate);
  const selectedDay = format(selectedDate, "EEEE").toLowerCase();
  const isPastDay = isBefore(startOfDay(selectedDate), startOfDay(today));

  const timetable = useQuery(
    api.timetable.getTimetable,
    session ? { householdId: session.householdId } : "skip"
  );

  const taskLogs = useQuery(
    api.taskLogs.getLogsForDate,
    session ? { householdId: session.householdId, date: selectedDateStr } : "skip"
  );

  const daysOff = useQuery(
    api.daysOff.getDaysOff,
    session ? { householdId: session.householdId } : "skip"
  );

  const dailyInstructions = useQuery(
    api.taskInstructions.getForDate,
    session ? { householdId: session.householdId, date: selectedDateStr } : "skip"
  );

  const instructionMap = useMemo(() => {
    const map: Record<string, { instruction: string; photoUrl?: string | null }> = {};
    dailyInstructions?.forEach((di) => {
      map[di.taskId] = { instruction: di.instruction, photoUrl: di.photoUrl };
    });
    return map;
  }, [dailyInstructions]);

  if (!session) return <HelperHomeSkeleton />;

  const tasks = timetable?.weeklyTasks.find((d) => d.day === selectedDay)?.tasks ?? [];
  const completedIds = new Set(taskLogs?.map((l) => l.taskId) ?? []);

  const isRestDay = daysOff?.some((d) => d.date === selectedDateStr);

  return (
    <div className="pt-6 space-y-5 animate-fade-in-up">
      <h1 className="text-2xl font-display font-semibold tracking-tight text-gray-900">{t("week")}</h1>

      <DaySelectorStrip selectedDate={selectedDate} onSelect={setSelectedDate} />

      {isRestDay ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-xl font-semibold text-gray-700">{t("rest_day")}</p>
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
              householdId={session.householdId}
              date={selectedDateStr}
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
