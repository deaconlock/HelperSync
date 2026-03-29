"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { TaskItem } from "@/types/timetable";
import { useTranslation } from "@/lib/i18n";
import { getTaskEmoji, cn } from "@/lib/utils";
import { Camera, CheckCircle2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { PhotoUpload } from "./PhotoUpload";
import { toast } from "sonner";

interface TaskCardProps {
  task: TaskItem;
  isDone: boolean;
  householdId: Id<"households">;
  date: string;
  translatedName?: string;
  readOnly?: boolean;
  permanentNotes?: string;
  dailyInstruction?: { instruction: string; photoUrl?: string | null };
}

export function TaskCard({ task, isDone, householdId, date, translatedName, readOnly, permanentNotes, dailyInstruction }: TaskCardProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showFullPhoto, setShowFullPhoto] = useState(false);

  const logComplete = useMutation(api.taskLogs.logTaskComplete);
  const generateUploadUrl = useMutation(api.taskLogs.generateUploadUrl);

  const emoji = task.emoji ?? getTaskEmoji(task.taskName, task.category);

  const handleMarkDone = async (photoUrl?: string) => {
    setIsCompleting(true);
    try {
      await logComplete({
        householdId,
        date,
        taskId: task.taskId,
        taskName: task.taskName,
        photoUrl,
      });
      toast.success(t("task_done_toast"));
      setIsExpanded(false);
      setShowPhotoUpload(false);
    } catch {
      toast.error("Failed to mark task as done");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleComplete = () => {
    if (task.requiresPhoto) {
      setShowPhotoUpload(true);
    } else {
      handleMarkDone();
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl shadow-card transition-all duration-200",
        isDone ? "bg-green-50 border border-green-100" : "bg-white"
      )}
    >
      <div
        className={cn("p-4 flex items-center gap-4", !isDone && !readOnly && "cursor-pointer")}
        onClick={() => !isDone && !readOnly && setIsExpanded((e) => !e)}
      >
        {/* Emoji */}
        <div className="w-12 h-12 flex items-center justify-center text-3xl flex-shrink-0">
          {emoji}
        </div>

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "font-semibold text-base leading-tight",
              isDone ? "text-green-700 line-through" : "text-gray-900"
            )}
          >
            {translatedName ?? task.taskName}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-gray-400">{task.time}</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-400">{task.area}</span>
          </div>
          {permanentNotes && !dailyInstruction && (
            <p className="text-xs text-gray-400 mt-1 italic leading-snug">{permanentNotes}</p>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {task.requiresPhoto && !isDone && (
            <Camera className="w-4 h-4 text-gray-400" />
          )}
          {isDone ? (
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          ) : readOnly ? (
            <div className="w-2 h-2 rounded-full bg-gray-300" />
          ) : (
            <div className="text-gray-300">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          )}
        </div>
      </div>

      {/* Daily instruction from employer */}
      {dailyInstruction && (
        <div className="mx-4 mb-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-xs font-medium text-blue-700 leading-relaxed">{dailyInstruction.instruction}</p>
          {permanentNotes && (
            <p className="text-[10px] text-blue-500/70 mt-1 italic">{permanentNotes}</p>
          )}
          {dailyInstruction.photoUrl && (
            <img
              src={dailyInstruction.photoUrl}
              alt="Reference"
              className="mt-2 w-full h-28 object-cover rounded-lg cursor-pointer border border-blue-100"
              onClick={(e) => { e.stopPropagation(); setShowFullPhoto(true); }}
            />
          )}
        </div>
      )}

      {/* Expanded actions */}
      {isExpanded && !isDone && !readOnly && (
        <div className="px-4 pb-4 space-y-3">
          {showPhotoUpload ? (
            <PhotoUpload
              onUpload={async (file) => {
                try {
                  const uploadUrl = await generateUploadUrl({});
                  const result = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": file.type },
                    body: file,
                  });
                  const { storageId } = await result.json();
                  await handleMarkDone(storageId);
                } catch {
                  toast.error("Failed to upload photo");
                }
              }}
              onSkip={() => handleMarkDone()}
              label={t("take_photo")}
            />
          ) : (
            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className="w-full py-3 bg-primary text-white rounded-2xl font-semibold text-base hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {isCompleting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  {t("mark_done")}
                </>
              )}
            </button>
          )}
        </div>
      )}
      {/* Photo lightbox */}
      {showFullPhoto && dailyInstruction?.photoUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullPhoto(false)}
        >
          <img
            src={dailyInstruction.photoUrl}
            alt="Reference"
            className="max-w-full max-h-[80vh] rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
