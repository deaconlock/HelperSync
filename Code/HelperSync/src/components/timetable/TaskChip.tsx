"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Camera } from "lucide-react";
import { TaskItem, CATEGORY_COLORS, CATEGORY_EMOJIS } from "@/types/timetable";
import { cn } from "@/lib/utils";

interface TaskChipProps {
  id: string;
  task: TaskItem;
  onEdit: () => void;
  onDelete: () => void;
}

export function TaskChip({ id, task, onEdit }: TaskChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const colorClass =
    CATEGORY_COLORS[task.category] ?? "bg-gray-100 text-gray-700 border-gray-200";
  const emoji = task.emoji ?? CATEGORY_EMOJIS[task.category] ?? "✅";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border px-2.5 py-2 transition-all duration-200",
        colorClass,
        isDragging ? "shadow-card-hover opacity-70 scale-105" : "hover:shadow-card"
      )}
    >
      <div className="flex items-start gap-1.5">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 mt-1 p-0.5 cursor-grab active:cursor-grabbing rounded hover:bg-black/5 touch-none"
        >
          <GripVertical className="w-3 h-3 text-gray-400" />
        </div>

        {/* Tappable content area — opens edit dialog */}
        <div
          className="flex items-start gap-2 flex-1 min-w-0 cursor-pointer"
          onClick={onEdit}
        >
          <span className="text-base flex-shrink-0 mt-0.5">{emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-text-secondary tracking-wide mb-0.5">
              {task.time}
            </p>
            <p className="text-xs font-medium truncate leading-tight">{task.taskName}</p>
            <p className="text-xs text-text-muted mt-0.5">{task.area}</p>
          </div>
          {task.requiresPhoto && (
            <Camera className="w-3 h-3 text-text-muted flex-shrink-0 mt-1" />
          )}
        </div>
      </div>
    </div>
  );
}
