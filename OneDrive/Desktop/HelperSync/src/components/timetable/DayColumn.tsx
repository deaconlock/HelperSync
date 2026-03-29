"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { TaskItem } from "@/types/timetable";
import { TaskChip } from "./TaskChip";
import { SwipeableTaskItem } from "./SwipeableTaskItem";
import { BottomSheet } from "./BottomSheet";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";

interface DayColumnProps {
  day: string;
  label: string;
  tasks: TaskItem[];
  onAddTask: () => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
}

export function DayColumn({
  day,
  label,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: day });
  const isMobile = useIsMobile();
  const [swipedOpenId, setSwipedOpenId] = useState<string | null>(null);
  const [bottomSheetTask, setBottomSheetTask] = useState<TaskItem | null>(null);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-h-64 rounded-2xl p-2 transition-colors duration-200 border",
        isOver ? "bg-primary-50/50 border-primary/20" : "bg-gray-50/50 border-transparent"
      )}
    >
      {/* Day header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        <span className="text-[10px] text-text-muted">{tasks.length}</span>
      </div>

      {/* Tasks */}
      <SortableContext
        items={tasks.map((t) => `${day}::${t.taskId}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-1.5">
          {tasks.map((task) => {
            if (isMobile) {
              return (
                <SwipeableTaskItem
                  key={task.taskId}
                  isSwipeOpen={swipedOpenId === task.taskId}
                  onSwipeOpen={() => setSwipedOpenId(task.taskId)}
                  onSwipeClose={() => setSwipedOpenId(null)}
                  onMorePress={() => {
                    setSwipedOpenId(null);
                    setBottomSheetTask(task);
                  }}
                  onDeletePress={() => {
                    setSwipedOpenId(null);
                    onDeleteTask(task.taskId);
                  }}
                >
                  <TaskChip
                    id={`${day}::${task.taskId}`}
                    task={task}
                    onEdit={() => onEditTask(task)}
                    onDelete={() => onDeleteTask(task.taskId)}
                  />
                </SwipeableTaskItem>
              );
            }
            return (
              <TaskChip
                key={task.taskId}
                id={`${day}::${task.taskId}`}
                task={task}
                onEdit={() => onEditTask(task)}
                onDelete={() => onDeleteTask(task.taskId)}
              />
            );
          })}
        </div>
      </SortableContext>

      {/* Add task button */}
      <button
        onClick={onAddTask}
        className="mt-2 w-full flex items-center justify-center gap-1 py-2 rounded-xl border border-dashed border-gray-200 text-text-muted hover:border-gray-400 hover:text-text-secondary text-xs transition-all duration-200"
      >
        <Plus className="w-3 h-3" /> Add
      </button>

      {/* Bottom sheet for mobile actions */}
      <BottomSheet
        open={!!bottomSheetTask}
        onClose={() => setBottomSheetTask(null)}
      >
        {bottomSheetTask && (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-900 mb-3 px-1">
              {bottomSheetTask.emoji} {bottomSheetTask.taskName}
            </p>
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
            <button
              onClick={() => {
                onDeleteTask(bottomSheetTask.taskId);
                setBottomSheetTask(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 transition-colors text-left"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-600">Delete Task</span>
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
