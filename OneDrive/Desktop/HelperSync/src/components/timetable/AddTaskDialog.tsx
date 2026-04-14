"use client";

import { useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { TaskItem } from "@/types/timetable";
import { getTaskEmoji } from "@/lib/utils";
import { nanoid } from "nanoid";

const CATEGORIES = [
  "Household Chores",
  "Baby Care",
  "Elderly Care",
  "Meal Prep",
  "Errands",
];

interface AddTaskDialogProps {
  day: string;
  rooms: string[];
  existingTasks: TaskItem[];
  initialTask?: TaskItem;
  onAdd: (task: TaskItem) => Promise<void>;
  onClose: () => void;
}

export function AddTaskDialog({
  day,
  rooms,
  existingTasks,
  initialTask,
  onAdd,
  onClose,
}: AddTaskDialogProps) {
  const [form, setForm] = useState<Omit<TaskItem, "taskId">>({
    time: initialTask?.time ?? "08:00",
    duration: initialTask?.duration ?? 30,
    taskName: initialTask?.taskName ?? "",
    area: initialTask?.area ?? rooms[0] ?? "",
    category: initialTask?.category ?? "Household Chores",
    recurring: initialTask?.recurring ?? true,
    requiresPhoto: initialTask?.requiresPhoto ?? false,
    emoji: initialTask?.emoji ?? "",
    notes: initialTask?.notes ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleSave = async () => {
    if (!form.taskName.trim()) return;
    setIsSaving(true);
    try {
      await onAdd({
        ...form,
        taskId: initialTask?.taskId ?? nanoid(),
        emoji: form.emoji || getTaskEmoji(form.taskName, form.category),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiSuggest = async () => {
    setIsSuggesting(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Suggest 5 tasks for ${day} that are missing from this schedule: ${JSON.stringify(existingTasks.map((t) => t.taskName))}. Return just a JSON array of task name strings.`,
            },
          ],
        }),
      });
      const text = await res.text();
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        setSuggestions(JSON.parse(match[0]));
      }
    } catch {
      // ignore
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-card-hover w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            {initialTask ? "Edit Task" : "Add Task"}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
              <select
                value={form.duration ?? 30}
                onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hr</option>
                <option value={90}>1.5 hr</option>
                <option value={120}>2 hr</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Area</label>
              <select
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                {rooms.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Task Name</label>
            <input
              type="text"
              value={form.taskName}
              onChange={(e) => setForm({ ...form, taskName: e.target.value })}
              placeholder="e.g. Mop living room floor"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Permanent Notes <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. No peanuts — allergy, use blue sippy cup"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-colors"
            />
            <p className="text-xs text-gray-400 mt-0.5">Shows every time this task appears</p>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.recurring}
                onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
                className="rounded accent-primary"
              />
              <span className="text-sm text-gray-700">Recurring</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requiresPhoto}
                onChange={(e) => setForm({ ...form, requiresPhoto: e.target.checked })}
                className="rounded accent-primary"
              />
              <span className="text-sm text-gray-700">Requires Photo</span>
            </label>
          </div>

          {/* AI suggestions */}
          {!initialTask && (
            <div>
              <button
                onClick={handleAiSuggest}
                disabled={isSuggesting}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                {isSuggesting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                Suggest with AI
              </button>
              {suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setForm({ ...form, taskName: s })}
                      className="text-xs px-2.5 py-1 bg-primary-50 text-primary rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.taskName.trim() || isSaving}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {initialTask ? "Save Changes" : "Add Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
