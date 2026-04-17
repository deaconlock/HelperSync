"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Camera } from "lucide-react";
import { TaskItem, CATEGORY_ACCENT_BG, CATEGORY_ICON_BG, CATEGORY_EMOJIS } from "@/types/timetable";
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

  const accentBg = CATEGORY_ACCENT_BG[task.category] ?? "bg-gray-300";
  const iconBg = CATEGORY_ICON_BG[task.category] ?? "bg-gray-100";
  const emoji = task.emoji ?? CATEGORY_EMOJIS[task.category] ?? "✅";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group flex items-center gap-3 px-3 py-3 rounded-2xl border border-gray-100 bg-white transition-all duration-200 relative overflow-hidden cursor-grab active:cursor-grabbing",
        isDragging ? "shadow-card-hover opacity-70 scale-105" : "hover:shadow-sm"
      )}
      onClick={onEdit}
    >
      {/* Category accent bar */}
      <div className={cn("absolute left-0 inset-y-0 w-1", accentBg)} />

      {/* Emoji container */}
      <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ml-1", iconBg)}>
        {emoji}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium">{task.time}</p>
        <p className="text-sm font-semibold text-gray-900 truncate leading-snug mt-0.5">{task.taskName}</p>
      </div>

      {/* Right side indicators */}
      {task.requiresPhoto && (
        <div className="flex-shrink-0">
          <Camera className="w-3.5 h-3.5 text-gray-300" />
        </div>
      )}
    </div>
  );
}
