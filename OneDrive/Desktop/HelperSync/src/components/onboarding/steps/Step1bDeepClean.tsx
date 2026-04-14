"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDeepCleanSuggestions } from "./Step1Household";

interface Step1bDeepCleanProps {
  rooms: string[];
  deepCleanTasks: string[];
  onUpdate: (tasks: string[]) => void;
}

export function Step1bDeepClean({ rooms, deepCleanTasks, onUpdate }: Step1bDeepCleanProps) {
  const [local, setLocal] = useState<string[]>(deepCleanTasks);
  const suggestions = getDeepCleanSuggestions(rooms);

  const toggle = (id: string) => {
    const updated = local.includes(id) ? local.filter((x) => x !== id) : [...local, id];
    setLocal(updated);
    onUpdate(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="text-4xl mb-4">🧽</div>
        <h2 className="text-2xl font-display font-semibold tracking-tight text-gray-900 mb-1">
          Periodic deep cleaning
        </h2>
        <p className="text-text-secondary text-sm max-w-md">
          These are tasks most people forget — we&apos;ll rotate them into the weekly schedule automatically. Skip any that don&apos;t apply.
        </p>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {suggestions.map((s) => {
          const isChecked = local.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all duration-150 bg-white",
                isChecked ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                isChecked ? "bg-primary border-primary" : "border-gray-300"
              )}>
                {isChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
              <p className={cn("flex-1 text-sm font-medium", isChecked ? "text-primary" : "text-gray-900")}>
                {s.label}
              </p>
              <span className="text-xs text-gray-400 flex-shrink-0">{s.frequency}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Frequencies can be adjusted anytime in your timetable.
      </p>
    </div>
  );
}
