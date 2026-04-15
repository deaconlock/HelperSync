"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTED_CHIPS = [
  "Make mornings less rushed",
  "Lighter Sundays",
  "My helper needs a proper lunch break",
  "Keep evenings free of heavy chores",
  "More focus on the kitchen",
  "Shift vacuuming to afternoons",
  "Helper should rest when baby sleeps",
  "Weekend cooking is a priority",
];

interface Step3RefinementProps {
  initialValue: string;
  onComplete: (refinement: string) => void;
  onBack: () => void;
}

export function Step3Refinement({ initialValue, onComplete, onBack }: Step3RefinementProps) {
  const [text, setText] = useState(initialValue);

  function appendChip(chip: string) {
    setText(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}, ${chip}` : chip;
    });
  }

  return (
    <div
      className="min-h-screen bg-background flex flex-col px-6"
      style={{ animation: "screen-fade-in 0.4s ease-out both" }}
    >
      {/* Back */}
      <div className="w-full max-w-sm mx-auto pt-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-gray-900 transition-colors duration-150"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="w-full max-w-sm mx-auto flex flex-col flex-1 pt-12 pb-12">

        {/* Heading */}
        <div style={{ animation: "fade-in-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both" }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
            Almost there
          </p>
          <h1 className="text-3xl font-display font-semibold tracking-tight text-gray-900 mb-2 leading-snug">
            Anything you'd like to adjust?
          </h1>
          <p className="text-sm text-text-muted mb-8">
            Describe in plain English — we'll factor it in. This is optional.
          </p>
        </div>

        {/* Textarea */}
        <div style={{ animation: "fade-in-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.2s both" }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            placeholder="e.g. Make mornings less rushed, helper needs a break after lunch..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
        </div>

        {/* Suggested chips */}
        <div
          className="mt-4 flex-1"
          style={{ animation: "fade-in-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.3s both" }}
        >
          <p className="text-xs font-medium text-gray-400 mb-3">Suggestions — tap to add</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_CHIPS.map(chip => {
              const isAdded = text.includes(chip);
              return (
                <button
                  key={chip}
                  onClick={() => !isAdded && appendChip(chip)}
                  disabled={isAdded}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150",
                    isAdded
                      ? "border-primary/30 bg-primary/5 text-primary cursor-default"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900"
                  )}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>

        {/* Continue */}
        <div
          className="mt-8"
          style={{ animation: "fade-in-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.4s both" }}
        >
          <button
            onClick={() => onComplete(text.trim())}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-display font-semibold text-base bg-gray-900 text-white hover:bg-gray-800 transition-all duration-200 shadow-sm"
          >
            {text.trim() ? "Apply & continue" : "Skip & continue"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
