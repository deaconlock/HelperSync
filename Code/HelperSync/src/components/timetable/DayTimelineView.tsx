"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { TaskItem, CATEGORY_COLORS, CATEGORY_EMOJIS } from "@/types/timetable";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Timeline config
const START_HOUR = 6; // 6 AM
const END_HOUR = 22; // 10 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_HEIGHT = 72; // px per hour
const SLOT_MINUTES = 15;
const TOTAL_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function minutesToY(minutes: number): number {
  return ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
}

function formatTimeLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

// Detect overlapping groups for side-by-side rendering
// Passive tasks (runs unattended) are excluded from column-splitting — they always render full-width
function getOverlapGroups(tasks: TaskItem[]): Map<string, { column: number; totalColumns: number }> {
  const activeTasks = tasks.filter((t) => !t.passive);
  const sorted = [...activeTasks].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  const result = new Map<string, { column: number; totalColumns: number }>();
  const groups: TaskItem[][] = [];

  for (const task of sorted) {
    const taskStart = timeToMinutes(task.time);
    const taskEnd = taskStart + (task.duration ?? 30);

    // Find if this task overlaps with any existing group
    let placed = false;
    for (const group of groups) {
      const overlaps = group.some((g) => {
        const gStart = timeToMinutes(g.time);
        const gEnd = gStart + (g.duration ?? 30);
        return taskStart < gEnd && taskEnd > gStart;
      });
      if (overlaps) {
        group.push(task);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push([task]);
    }
  }

  for (const group of groups) {
    const totalColumns = group.length;
    group.forEach((task, col) => {
      result.set(task.taskId, { column: col, totalColumns });
    });
  }

  // Passive tasks are always full-width (column 0 of 1)
  tasks.filter((t) => t.passive).forEach((t) => {
    result.set(t.taskId, { column: 0, totalColumns: 1 });
  });

  return result;
}

interface DayTimelineViewProps {
  tasks: TaskItem[];
  dayLabel: string;
  onUpdateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  showHeader?: boolean;
  showCurrentTime?: boolean;
}

export function DayTimelineView({
  tasks,
  dayLabel,
  onUpdateTask,
  onEditTask,
  onDeleteTask,
  showHeader = true,
  showCurrentTime = false,
}: DayTimelineViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    taskId: string;
    type: "move" | "resize";
    startY: number;
    startMinutes: number;
    startDuration: number;
  } | null>(null);
  const [previewMinutes, setPreviewMinutes] = useState<number | null>(null);
  const [previewDuration, setPreviewDuration] = useState<number | null>(null);

  const overlapMap = getOverlapGroups(tasks);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, task: TaskItem, type: "move" | "resize") => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      setDragState({
        taskId: task.taskId,
        type,
        startY: e.clientY,
        startMinutes: timeToMinutes(task.time),
        startDuration: task.duration ?? 30,
      });
      setPreviewMinutes(timeToMinutes(task.time));
      setPreviewDuration(task.duration ?? 30);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;
      const deltaY = e.clientY - dragState.startY;
      const deltaMinutes = Math.round((deltaY / HOUR_HEIGHT) * 60 / SLOT_MINUTES) * SLOT_MINUTES;

      if (dragState.type === "move") {
        const newMinutes = Math.max(
          START_HOUR * 60,
          Math.min(END_HOUR * 60 - dragState.startDuration, dragState.startMinutes + deltaMinutes)
        );
        setPreviewMinutes(newMinutes);
      } else {
        const newDuration = Math.max(15, dragState.startDuration + deltaMinutes);
        setPreviewDuration(newDuration);
      }
    },
    [dragState]
  );

  const handlePointerUp = useCallback(() => {
    if (!dragState) return;

    if (dragState.type === "move" && previewMinutes !== null) {
      onUpdateTask(dragState.taskId, { time: minutesToTime(previewMinutes) });
    } else if (dragState.type === "resize" && previewDuration !== null) {
      onUpdateTask(dragState.taskId, { duration: previewDuration });
    }

    setDragState(null);
    setPreviewMinutes(null);
    setPreviewDuration(null);
  }, [dragState, previewMinutes, previewDuration, onUpdateTask]);

  // Scroll to 6:30 AM area on mount
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Day header */}
      {showHeader && (
        <div className="px-4 py-3 border-b border-border bg-white sticky top-0 z-10">
          <h3 className="text-sm font-semibold text-gray-900">{dayLabel}</h3>
          <p className="text-xs text-text-muted">{tasks.length} tasks</p>
        </div>
      )}

      {/* Timeline */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto relative"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="relative pr-2" style={{ height: TOTAL_HEIGHT }}>
          {/* Hour lines */}
          {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => {
            const hour = START_HOUR + i;
            return (
              <div
                key={hour}
                className="absolute left-0 right-0 flex items-start"
                style={{ top: i * HOUR_HEIGHT }}
              >
                <div className="w-14 flex-shrink-0 text-right pr-2 -mt-2">
                  <span className="text-xs text-gray-400 font-medium">
                    {formatTimeLabel(hour)}
                  </span>
                </div>
                <div className="flex-1 border-t border-gray-100" />
              </div>
            );
          })}

          {/* Half-hour lines */}
          {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
            <div
              key={`half-${i}`}
              className="absolute left-14 right-0 border-t border-dashed border-gray-100/50"
              style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
            />
          ))}

          {/* Current time indicator */}
          {showCurrentTime && (() => {
            const now = new Date();
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            if (nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60) {
              const top = minutesToY(nowMinutes);
              return (
                <div className="absolute left-12 right-0 z-20 pointer-events-none" style={{ top }}>
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <div className="flex-1 h-px bg-red-500" />
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Task blocks */}
          {tasks.map((task) => {
            const isDragging = dragState?.taskId === task.taskId;
            const taskMinutes = isDragging && dragState.type === "move" && previewMinutes !== null
              ? previewMinutes
              : timeToMinutes(task.time);
            const taskDuration = isDragging && dragState.type === "resize" && previewDuration !== null
              ? previewDuration
              : (task.duration ?? 30);

            const top = minutesToY(taskMinutes);
            const height = Math.max(20, (taskDuration / 60) * HOUR_HEIGHT);

            const overlap = overlapMap.get(task.taskId) ?? { column: 0, totalColumns: 1 };
            const columnWidth = 100 / overlap.totalColumns;
            const leftPercent = overlap.column * columnWidth;

            const emoji = task.emoji ?? CATEGORY_EMOJIS[task.category] ?? "✅";
            const categoryColor = CATEGORY_COLORS[task.category] ?? "bg-slate-50 text-slate-700 border-slate-200";
            // Extract just the bg and border colors for the block
            const bgClass = categoryColor.split(" ").find((c) => c.startsWith("bg-")) ?? "bg-gray-50";
            const textClass = categoryColor.split(" ").find((c) => c.startsWith("text-")) ?? "text-gray-700";
            const borderClass = categoryColor.split(" ").find((c) => c.startsWith("border-")) ?? "border-gray-200";

            const isPassive = task.passive === true;

            return (
              <div
                key={task.taskId}
                className={cn(
                  "absolute group rounded-lg border transition-shadow",
                  bgClass,
                  isPassive ? "border-dashed opacity-70 cursor-default z-0" : cn(borderClass, "cursor-grab active:cursor-grabbing"),
                  !isPassive && (isDragging ? "shadow-card-hover z-30 opacity-90 ring-2 ring-gray-900/20" : "hover:shadow-card z-10")
                )}
                style={{
                  top,
                  height,
                  left: `calc(3.5rem + (100% - 3.5rem - 0.5rem) * ${leftPercent / 100})`,
                  width: `calc((100% - 3.5rem - 0.5rem) * ${columnWidth / 100})`,
                  ...(isPassive ? {
                    backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.04) 5px, rgba(0,0,0,0.04) 10px)",
                  } : {}),
                }}
                onPointerDown={isPassive ? undefined : (e) => handlePointerDown(e, task, "move")}
              >
                <div className="px-2 py-1 h-full flex flex-col overflow-hidden">
                  <div className="flex items-start gap-1 flex-1 min-h-0">
                    <span className="text-xs flex-shrink-0">{emoji}</span>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className={cn("text-[11px] font-medium truncate leading-tight", textClass)}>
                        {task.taskName}
                      </p>
                      {height >= 40 && (
                        <p className="text-xs opacity-60 truncate">
                          {minutesToTime(taskMinutes)} – {minutesToTime(taskMinutes + taskDuration)}
                        </p>
                      )}
                      {height >= 55 && task.area && (
                        <p className="text-[9px] opacity-50 truncate">{task.area}</p>
                      )}
                    </div>
                  </div>
                  {/* "running" badge for passive tasks */}
                  {isPassive && height >= 28 && (
                    <p className="text-[9px] text-gray-400 self-end leading-none mt-auto">⟳ running</p>
                  )}
                </div>

                {/* Action buttons on hover */}
                <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5 bg-white/90 backdrop-blur-sm rounded-md p-0.5 shadow-xs border border-border z-20">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Pencil className="w-2.5 h-2.5 text-gray-500" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteTask(task.taskId); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-0.5 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-2.5 h-2.5 text-red-400" />
                  </button>
                </div>

                {/* Resize handle — only for active tasks */}
                {!isPassive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, task, "resize"); }}
                >
                  <div className="w-8 h-1 bg-gray-300 rounded-full" />
                </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
