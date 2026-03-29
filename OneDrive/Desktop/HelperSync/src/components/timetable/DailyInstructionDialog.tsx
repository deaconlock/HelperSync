"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { TaskItem } from "@/types/timetable";
import { getTaskEmoji } from "@/lib/utils";
import { X, Trash2, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface DailyInstructionDialogProps {
  task: TaskItem;
  date: string;
  householdId: Id<"households">;
  existing?: {
    instruction: string;
    photoStorageId?: string | null;
    photoUrl?: string | null;
  } | null;
  onClose: () => void;
}

export function DailyInstructionDialog({
  task,
  date,
  householdId,
  existing,
  onClose,
}: DailyInstructionDialogProps) {
  const [instruction, setInstruction] = useState(existing?.instruction ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    existing?.photoUrl ?? null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setInstructionMut = useMutation(api.taskInstructions.set);
  const removeInstructionMut = useMutation(api.taskInstructions.remove);
  const generateUploadUrl = useMutation(api.taskLogs.generateUploadUrl);

  const emoji = task.emoji ?? getTaskEmoji(task.taskName, task.category);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!instruction.trim()) return;
    setIsSaving(true);
    try {
      let photoStorageId: string | undefined;

      if (photoFile) {
        const uploadUrl = await generateUploadUrl({});
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": photoFile.type },
          body: photoFile,
        });
        const { storageId } = await result.json();
        photoStorageId = storageId;
      }

      await setInstructionMut({
        householdId,
        date,
        taskId: task.taskId,
        instruction: instruction.trim(),
        ...(photoStorageId ? { photoStorageId } : {}),
      });

      toast.success("Instruction saved!");
      onClose();
    } catch {
      toast.error("Failed to save instruction");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await removeInstructionMut({
        householdId,
        date,
        taskId: task.taskId,
      });
      toast.success("Instruction removed");
      onClose();
    } catch {
      toast.error("Failed to remove instruction");
    } finally {
      setIsRemoving(false);
    }
  };

  const formattedDate = format(new Date(date + "T00:00:00"), "EEEE, d MMM");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-card-hover w-full max-w-md">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">Daily Instruction</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Task context */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="text-2xl">{emoji}</span>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{task.taskName}</p>
              <p className="text-xs text-text-muted">{task.time} · {formattedDate}</p>
            </div>
          </div>

          {/* Permanent notes hint */}
          {task.notes && (
            <div className="px-3 py-2 bg-gray-50 rounded-lg border border-border">
              <p className="text-[10px] uppercase tracking-wide text-text-muted font-medium mb-0.5">Permanent note</p>
              <p className="text-xs text-text-secondary italic">{task.notes}</p>
            </div>
          )}

          {/* Instruction textarea */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Instruction for this day
            </label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Make chicken rice with the ingredients in the fridge"
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-colors"
              autoFocus
            />
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Reference Photo <span className="text-gray-400">(optional)</span>
            </label>
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Reference"
                  className="w-full h-36 object-cover rounded-xl border border-border"
                />
                <button
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg shadow-sm hover:bg-white transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-gray-600" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-gray-200 text-text-muted hover:border-gray-300 hover:text-text-secondary transition-colors"
              >
                <ImagePlus className="w-5 h-5" />
                <span className="text-xs font-medium">Add a recipe or reference photo</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          {existing && (
            <button
              onClick={handleRemove}
              disabled={isRemoving}
              className="p-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isRemoving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!instruction.trim() || isSaving}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {existing ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
