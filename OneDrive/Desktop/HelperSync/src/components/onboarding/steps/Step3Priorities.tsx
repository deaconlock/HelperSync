"use client";

import { useState } from "react";
import { Heart, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Priority } from "@/app/onboarding/employer/page";

const PRIORITY_OPTIONS: { value: Priority; label: string; emoji: string; description: string }[] = [
  { value: "meals", label: "Meals & Cooking", emoji: "🍳", description: "Breakfast, lunch, dinner prep and planning" },
  { value: "cleanliness", label: "Cleanliness", emoji: "✨", description: "Daily cleaning, deep cleaning, tidying up" },
  { value: "childcare", label: "Childcare", emoji: "👶", description: "Feeding, bathing, play, school prep" },
  { value: "elderlycare", label: "Elderly Care", emoji: "🧓", description: "Medication, mobility, companionship" },
  { value: "laundry", label: "Laundry & Ironing", emoji: "👕", description: "Washing, drying, folding, ironing" },
  { value: "grocery", label: "Grocery & Errands", emoji: "🛒", description: "Shopping, market runs, restocking" },
  { value: "organizing", label: "Organizing", emoji: "📦", description: "Decluttering, storage, seasonal rotation" },
];

// --- Deep clean suggestions ---

interface DeepCleanSuggestion {
  id: string;
  label: string;
  frequency: string;
  rooms: string[];
  defaultChecked: boolean;
}

const DEEP_CLEAN_SUGGESTIONS: DeepCleanSuggestion[] = [
  { id: "curtains", label: "Curtain washing", frequency: "Every 6 months", rooms: ["living", "bedroom", "dining", "master"], defaultChecked: true },
  { id: "aircon", label: "Aircon filter cleaning", frequency: "Every 3 months", rooms: ["bedroom", "living", "master"], defaultChecked: true },
  { id: "carpet", label: "Carpet / rug shampooing", frequency: "Every 3 months", rooms: ["living", "bedroom", "master"], defaultChecked: false },
  { id: "windows", label: "Window & track cleaning", frequency: "Every 3 months", rooms: ["*"], defaultChecked: false },
  { id: "mattress", label: "Mattress vacuuming", frequency: "Every 6 months", rooms: ["bedroom", "master"], defaultChecked: false },
  { id: "hood", label: "Kitchen hood degreasing", frequency: "Monthly", rooms: ["kitchen"], defaultChecked: true },
  { id: "grout", label: "Bathroom grout scrubbing", frequency: "Monthly", rooms: ["bathroom", "toilet", "shower"], defaultChecked: false },
  { id: "fridge", label: "Fridge deep clean", frequency: "Every 3 months", rooms: ["kitchen"], defaultChecked: true },
  { id: "fan", label: "Ceiling fan cleaning", frequency: "Every 3 months", rooms: ["bedroom", "living", "master"], defaultChecked: false },
  { id: "sofa", label: "Sofa / upholstery vacuuming", frequency: "Every 3 months", rooms: ["living"], defaultChecked: false },
];

function getMatchingSuggestions(rooms: string[]): DeepCleanSuggestion[] {
  const lowerRooms = rooms.map((r) => r.toLowerCase());
  return DEEP_CLEAN_SUGGESTIONS.filter((s) =>
    s.rooms.includes("*") || s.rooms.some((keyword) => lowerRooms.some((r) => r.includes(keyword)))
  );
}

export function getDefaultDeepClean(rooms: string[]): string[] {
  return getMatchingSuggestions(rooms).filter((s) => s.defaultChecked).map((s) => s.id);
}

// --- Component ---

interface Step3Props {
  priorities: Priority[];
  rooms: string[];
  deepCleanTasks: string[];
  onUpdate: (priorities: Priority[], deepCleanTasks: string[]) => void;
}

export function Step3Priorities({ priorities, rooms, deepCleanTasks, onUpdate }: Step3Props) {
  const [selected, setSelected] = useState<Priority[]>(priorities);
  const [localDeepClean, setLocalDeepClean] = useState<string[]>(deepCleanTasks);
  const [deepCleanOpen, setDeepCleanOpen] = useState(deepCleanTasks.length > 0);

  const suggestions = getMatchingSuggestions(rooms);
  const showDeepClean = selected.includes("cleanliness") && suggestions.length > 0;

  const toggle = (value: Priority) => {
    let updated: Priority[];
    if (selected.includes(value)) {
      updated = selected.filter((p) => p !== value);
    } else if (selected.length < 3) {
      updated = [...selected, value];
    } else {
      return; // max 3
    }
    setSelected(updated);

    // Auto-populate deep clean defaults when cleanliness is first selected
    if (value === "cleanliness" && !selected.includes("cleanliness") && localDeepClean.length === 0) {
      const defaults = getDefaultDeepClean(rooms);
      setLocalDeepClean(defaults);
      setDeepCleanOpen(true);
      onUpdate(updated, defaults);
    } else {
      // Clear deep clean if cleanliness is deselected
      if (value === "cleanliness" && selected.includes("cleanliness")) {
        setLocalDeepClean([]);
        onUpdate(updated, []);
      } else {
        onUpdate(updated, localDeepClean);
      }
    }
  };

  const toggleDeepClean = (id: string) => {
    const updated = localDeepClean.includes(id)
      ? localDeepClean.filter((x) => x !== id)
      : [...localDeepClean, id];
    setLocalDeepClean(updated);
    onUpdate(selected, updated);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 text-gray-700" />
        </div>
        <h2 className="text-2xl font-display font-semibold tracking-tight text-gray-900 mb-2">
          What matters most to you?
        </h2>
        <p className="text-text-secondary text-sm max-w-md">
          Pick up to 3 priorities. This helps us focus your helper&apos;s schedule on what&apos;s most important to your family.
        </p>
      </div>

      <div className="space-y-2.5">
        {PRIORITY_OPTIONS.map((option) => {
          const isSelected = selected.includes(option.value);
          const isDisabled = !isSelected && selected.length >= 3;

          return (
            <button
              key={option.value}
              onClick={() => toggle(option.value)}
              disabled={isDisabled}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200",
                isSelected
                  ? "border-gray-900 bg-gray-50 shadow-sm"
                  : isDisabled
                    ? "border-border bg-gray-50 opacity-50 cursor-not-allowed"
                    : "border-border bg-white hover:border-gray-300"
              )}
            >
              <span className="text-2xl flex-shrink-0">{option.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">
                  {option.label}
                </p>
                <p className="text-xs text-text-muted mt-0.5">{option.description}</p>
              </div>
              {isSelected && (
                <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 animate-checkmark">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="text-center">
        <p className={cn(
          "text-sm font-medium transition-colors",
          selected.length === 0
            ? "text-gray-400"
            : selected.length === 3
              ? "text-gray-900"
              : "text-gray-500"
        )}>
          {selected.length}/3 selected
        </p>
      </div>

      {/* Deep clean suggestions — only when cleanliness is selected */}
      {showDeepClean && (
        <div className="space-y-2 border-t border-border pt-6">
          <button
            onClick={() => setDeepCleanOpen(!deepCleanOpen)}
            className="flex items-center gap-2 w-full text-left"
          >
            <span className="text-base">🧽</span>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 text-sm">
                Periodic deep cleaning
              </h3>
              <p className="text-xs text-gray-400">
                Tasks most people forget — we&apos;ll rotate them into the weekly schedule
              </p>
            </div>
            {localDeepClean.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {localDeepClean.length}
              </span>
            )}
            <ChevronDown
              className={cn(
                "w-4 h-4 text-gray-400 transition-transform duration-200",
                deepCleanOpen && "rotate-180"
              )}
            />
          </button>

          {deepCleanOpen && (
            <div className="space-y-1 pt-1">
              {suggestions.map((s) => {
                const isChecked = localDeepClean.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleDeepClean(s.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-150",
                      isChecked
                        ? "border-gray-300 bg-gray-50"
                        : "border-transparent bg-white hover:bg-gray-50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                        isChecked
                          ? "bg-gray-900 border-gray-900"
                          : "border-gray-300"
                      )}
                    >
                      {isChecked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{s.label}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{s.frequency}</span>
                  </button>
                );
              })}
              <p className="text-[10px] text-gray-400 pt-1">
                Frequencies can be adjusted anytime in your timetable
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
