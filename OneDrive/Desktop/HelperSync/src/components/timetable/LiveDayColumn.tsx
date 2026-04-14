"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import type { DraggableAttributes } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { TaskItem, CATEGORY_COLORS } from "@/types/timetable";
import { getTaskEmoji, cn } from "@/lib/utils";
import {
  CheckCircle2,
  Camera,
  MessageSquareText,
  Plus,
  EyeOff,
  Undo2,
  Pencil,
  Trash2,
  GripVertical,
} from "lucide-react";
import { SwipeableTaskItem } from "./SwipeableTaskItem";
import { BottomSheet } from "./BottomSheet";
import { useIsMobile } from "@/hooks/useIsMobile";

interface DragHandleProps {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
}

interface DailyInstructionData {
  instruction: string;
  photoUrl?: string | null;
}

interface LiveDayColumnProps {
  day: string;
  date: Date;
  tasks: TaskItem[];
  completedIds: Set<string>;
  dayOff: { type: string; note?: string } | null;
  isToday: boolean;
  isPast: boolean;
  dailyInstructions?: Record<string, DailyInstructionData>;
  onTaskClick?: (task: TaskItem) => void;
  onAddOneOff?: () => void;
  onSkipTask?: (taskId: string) => void;
  onUnskipTask?: (taskId: string) => void;
  onEditTask?: (task: TaskItem) => void;
  onDeleteTask?: (taskId: string) => void;
  skippedTaskIds?: Set<string>;
  oneOffTaskIds?: Set<string>;
  sortableEnabled?: boolean;
}

function SortableTaskWrapper({
  id,
  enabled,
  children,
}: {
  id: string;
  enabled: boolean;
  children: (dragProps: DragHandleProps) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !enabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && "opacity-50 scale-105 shadow-card-hover z-30"
      )}
    >
      {children({ attributes, listeners })}
    </div>
  );
}

export function LiveDayColumn({
  day,
  date,
  tasks,
  completedIds,
  dayOff,
  isToday,
  isPast,
  dailyInstructions,
  onTaskClick,
  onAddOneOff,
  onSkipTask,
  onUnskipTask,
  onEditTask,
  onDeleteTask,
  skippedTaskIds,
  oneOffTaskIds,
  sortableEnabled = false,
}: LiveDayColumnProps) {
  const { setNodeRef } = useDroppable({ id: `live::${day}` });
  const isMobile = useIsMobile();
  const [swipedOpenId, setSwipedOpenId] = useState<string | null>(null);
  const [bottomSheetTask, setBottomSheetTask] = useState<TaskItem | null>(null);

  const completedCount = tasks.filter((t) => completedIds.has(t.taskId)).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const activeTasks = tasks.filter((t) => !skippedTaskIds?.has(t.taskId));
  const skippedTasks = tasks.filter((t) => skippedTaskIds?.has(t.taskId));

  const handleTaskTap = (task: TaskItem) => {
    if (isMobile) {
      // Mobile: open bottom sheet with all actions
      setBottomSheetTask(task);
    } else {
      // Desktop: open edit dialog directly
      onEditTask?.(task);
    }
  };

  const handleDeleteTask = (task: TaskItem) => {
    const isOneOff = oneOffTaskIds?.has(task.taskId);
    if (isOneOff) {
      // Remove one-off override
      onUnskipTask?.(task.taskId);
    } else if (onDeleteTask) {
      onDeleteTask(task.taskId);
    } else {
      // Fallback: skip the task (soft delete for template tasks)
      onSkipTask?.(task.taskId);
    }
  };

  const renderTaskContent = (
    task: TaskItem,
    dragProps?: DragHandleProps
  ) => {
    const isDone = completedIds.has(task.taskId);
    const isOneOff = oneOffTaskIds?.has(task.taskId);
    const emoji = task.emoji ?? getTaskEmoji(task.taskName, task.category);
    const categoryColor = CATEGORY_COLORS[task.category] ?? "bg-gray-100 text-gray-600";
    const hasInstruction = !!dailyInstructions?.[task.taskId];
    const hasNotes = !!task.notes;

    return (
      <div
        className={cn(
          "group px-2 py-1.5 rounded-xl text-[11px] border transition-colors relative",
          isDone
            ? "bg-green-50 border-green-100"
            : categoryColor,
          isOneOff && !isDone && "border-dashed",
          "cursor-pointer hover:shadow-xs"
        )}
      >
        <div className="flex items-start gap-1">
          {/* Drag handle (visible when sortable) */}
          {sortableEnabled && dragProps && !isDone && (
            <div
              {...dragProps.attributes}
              {...dragProps.listeners}
              className="flex-shrink-0 mt-0.5 p-0.5 cursor-grab active:cursor-grabbing rounded hover:bg-black/5 touch-none"
            >
              <GripVertical className="w-2.5 h-2.5 text-gray-400" />
            </div>
          )}

          {/* Tappable content area */}
          <div
            className="flex items-start gap-1 flex-1 min-w-0"
            onClick={() => handleTaskTap(task)}
          >
            <span className="text-xs flex-shrink-0">{emoji}</span>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "font-medium leading-tight truncate",
                  isDone ? "text-green-600 line-through" : ""
                )}
              >
                {task.taskName}
                {isOneOff && (
                  <span className="ml-1 text-[9px] text-gray-400 font-normal">one-off</span>
                )}
              </p>
              <p className="text-xs opacity-60">{task.time}</p>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {hasInstruction && (
                <MessageSquareText className="w-2.5 h-2.5 text-blue-500" />
              )}
              {!hasInstruction && hasNotes && (
                <MessageSquareText className="w-2.5 h-2.5 opacity-30" />
              )}
              {task.requiresPhoto && !isDone && (
                <Camera className="w-2.5 h-2.5 opacity-40" />
              )}
              {isDone && (
                <CheckCircle2 className="w-3 h-3 text-green-500" />
              )}
            </div>
          </div>
        </div>

        {/* Desktop hover actions */}
        {!isMobile && (
          <>
            {onSkipTask && !isOneOff && !isDone && (
              <button
                onClick={(e) => { e.stopPropagation(); onSkipTask(task.taskId); }}
                className="absolute top-0.5 right-0.5 hidden group-hover:flex items-center gap-0.5 text-[9px] text-gray-400 hover:text-gray-600 px-1 py-0.5 rounded bg-white/90 border border-gray-200 shadow-xs"
                title="Skip for this day"
              >
                <EyeOff className="w-2.5 h-2.5" />
              </button>
            )}
            {onUnskipTask && isOneOff && !isDone && (
              <button
                onClick={(e) => { e.stopPropagation(); onUnskipTask(task.taskId); }}
                className="absolute top-0.5 right-0.5 hidden group-hover:flex items-center gap-0.5 text-[9px] text-red-400 hover:text-red-600 px-1 py-0.5 rounded bg-white/90 border border-gray-200 shadow-xs"
                title="Remove one-off task"
              >
                ✕
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-h-64 rounded-2xl p-2 transition-colors duration-200 border",
        isToday
          ? "bg-white ring-1 ring-gray-200 border-transparent shadow-sm"
          : isPast
            ? "bg-gray-50/50 opacity-60 border-transparent"
            : "bg-gray-50/50 border-transparent"
      )}
    >
      {/* Day header with date */}
      <div className="mb-2 px-1">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-xs font-medium",
              isToday ? "text-gray-900" : "text-text-secondary"
            )}
          >
            {format(date, "EEE")}
          </span>
          <div className="flex items-center gap-1">
            {onAddOneOff && (
              <button
                onClick={onAddOneOff}
                title="Add one-off task"
                className="w-5 h-5 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
            <span
              className={cn(
                "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                isToday
                  ? "bg-gray-900 text-white"
                  : "text-text-muted"
              )}
            >
              {format(date, "d")}
            </span>
          </div>
        </div>
        <p className="text-xs text-text-muted mt-0.5">{format(date, "MMM yyyy")}</p>

        {/* Progress bar */}
        {!dayOff && tasks.length > 0 && (
          <div className="mt-1.5">
            <div className="w-full bg-gray-100 rounded-full h-1">
              <div
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  progress === 100 ? "bg-green-500" : "bg-gray-400"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {completedCount}/{tasks.length}
            </p>
          </div>
        )}
      </div>

      {/* Day off notice */}
      {dayOff ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
          <p className="text-2xl mb-1">
            {dayOff.type === "RestDay" ? "😴" : dayOff.type === "PublicHoliday" ? "🎉" : "🏖️"}
          </p>
          <p className="text-xs font-semibold text-gray-500">
            {dayOff.type === "RestDay"
              ? "Rest Day"
              : dayOff.type === "PublicHoliday"
                ? "Holiday"
                : "Leave"}
          </p>
          {dayOff.note && (
            <p className="text-xs text-gray-400 mt-0.5">{dayOff.note}</p>
          )}
        </div>
      ) : (
        /* Tasks */
        <SortableContext
          items={activeTasks.map((t) => `live::${day}::${t.taskId}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex-1 space-y-1">
            {/* Active tasks */}
            {activeTasks.map((task) => {
              const isDone = completedIds.has(task.taskId);

              if (isMobile && !isDone) {
                return (
                  <SortableTaskWrapper
                    key={task.taskId}
                    id={`live::${day}::${task.taskId}`}
                    enabled={sortableEnabled && !isDone}
                  >
                    {(dragProps) => (
                      <SwipeableTaskItem
                        isSwipeOpen={swipedOpenId === task.taskId}
                        onSwipeOpen={() => setSwipedOpenId(task.taskId)}
                        onSwipeClose={() => setSwipedOpenId(null)}
                        onMorePress={() => {
                          setSwipedOpenId(null);
                          setBottomSheetTask(task);
                        }}
                        onDeletePress={() => {
                          setSwipedOpenId(null);
                          handleDeleteTask(task);
                        }}
                      >
                        {renderTaskContent(task, dragProps)}
                      </SwipeableTaskItem>
                    )}
                  </SortableTaskWrapper>
                );
              }

              return (
                <SortableTaskWrapper
                  key={task.taskId}
                  id={`live::${day}::${task.taskId}`}
                  enabled={sortableEnabled && !isDone}
                >
                  {(dragProps) => renderTaskContent(task, dragProps)}
                </SortableTaskWrapper>
              );
            })}

            {/* Skipped tasks */}
            {skippedTasks.map((task, idx) => (
              <div
                key={`${task.taskId}-skipped-${idx}`}
                className="group px-2 py-1.5 rounded-xl text-[11px] border border-dashed border-gray-200 bg-gray-50/50 opacity-50"
              >
                <div className="flex items-center gap-1">
                  <EyeOff className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" />
                  <p className="font-medium leading-tight truncate text-gray-400 line-through flex-1">
                    {task.taskName}
                  </p>
                  {onUnskipTask && (
                    <button
                      onClick={() => onUnskipTask(task.taskId)}
                      className="hidden group-hover:flex items-center gap-0.5 text-[9px] text-gray-500 hover:text-gray-700 px-1 py-0.5 rounded bg-white border border-gray-200"
                      title="Restore task"
                    >
                      <Undo2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {tasks.length === 0 && (
              <div className="flex-1 flex items-center justify-center py-4">
                <p className="text-xs text-gray-300">No tasks</p>
              </div>
            )}

            {/* Add one-off task button */}
            {onAddOneOff && (
              <button
                onClick={onAddOneOff}
                className="mt-1 w-full flex items-center justify-center gap-1 py-1.5 rounded-xl border border-dashed border-gray-200 text-text-muted hover:border-gray-400 hover:text-text-secondary text-xs transition-all duration-200"
              >
                <Plus className="w-2.5 h-2.5" /> Add
              </button>
            )}
          </div>
        </SortableContext>
      )}

      {/* Bottom sheet for mobile actions */}
      <BottomSheet
        open={!!bottomSheetTask}
        onClose={() => setBottomSheetTask(null)}
      >
        {bottomSheetTask && (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-900 mb-3 px-1">
              {bottomSheetTask.emoji ?? getTaskEmoji(bottomSheetTask.taskName, bottomSheetTask.category)}{" "}
              {bottomSheetTask.taskName}
            </p>

            {/* Edit task */}
            {onEditTask && (
              <button
                onClick={() => {
                  onEditTask(bottomSheetTask);
                  setBottomSheetTask(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <Pencil className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Edit Task</span>
              </button>
            )}

            {/* Daily instruction */}
            {onTaskClick && (
              <button
                onClick={() => {
                  onTaskClick(bottomSheetTask);
                  setBottomSheetTask(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <MessageSquareText className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-700">Daily Instruction</span>
              </button>
            )}

            {/* Skip task */}
            {onSkipTask && !oneOffTaskIds?.has(bottomSheetTask.taskId) && (
              <button
                onClick={() => {
                  onSkipTask(bottomSheetTask.taskId);
                  setBottomSheetTask(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <EyeOff className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Skip Task</span>
              </button>
            )}

            {/* Delete / Remove */}
            <button
              onClick={() => {
                handleDeleteTask(bottomSheetTask);
                setBottomSheetTask(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 transition-colors text-left"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-600">
                {oneOffTaskIds?.has(bottomSheetTask.taskId) ? "Remove Task" : "Delete Task"}
              </span>
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
