"use client";

import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SurveyOption {
  value: string;
  emoji: string;
  label: string;
  sub?: string;
}

interface SurveyQuestionScreenProps {
  question: string;
  options: SurveyOption[];
  selected: string | string[] | null;
  multiSelect?: boolean;
  onSelect: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function SurveyQuestionScreen({
  question,
  options,
  selected,
  multiSelect = false,
  onSelect,
  onContinue,
  onBack,
}: SurveyQuestionScreenProps) {
  const isSelected = (value: string) =>
    Array.isArray(selected) ? selected.includes(value) : selected === value;

  const canProceed = Array.isArray(selected) ? selected.length > 0 : selected !== null;

  return (
    <div
      className="min-h-screen bg-background flex flex-col px-6"
      style={{ animation: "screen-fade-in 0.4s ease-out both" }}
    >
      {/* Back button */}
      <div className="w-full max-w-sm mx-auto pt-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-gray-900 transition-colors duration-150"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="w-full max-w-sm mx-auto flex flex-col flex-1 pt-16 pb-12">

        {/* Question */}
        <h1
          className="text-3xl font-display font-semibold tracking-tight text-gray-900 mb-8 leading-snug"
          style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both" }}
        >
          {question}
        </h1>

        {/* Options */}
        <div
          className="space-y-3 flex-1"
          style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.22s both" }}
        >
          {options.map((opt) => {
            const sel = isSelected(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => onSelect(opt.value)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 text-left transition-all duration-150 bg-white",
                  sel ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                )}
              >
                <span className="text-3xl leading-none flex-shrink-0">{opt.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold leading-snug", sel ? "text-primary" : "text-gray-900")}>
                    {opt.label}
                  </p>
                  {opt.sub && (
                    <p className="text-xs text-text-muted mt-0.5">{opt.sub}</p>
                  )}
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150",
                  sel ? "border-primary bg-primary" : "border-gray-300"
                )}>
                  {sel && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Continue */}
        <div
          className="mt-8"
          style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.36s both" }}
        >
          <button
            onClick={onContinue}
            disabled={!canProceed}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-4 rounded-xl font-display font-semibold text-base transition-all duration-200 shadow-sm",
              canProceed
                ? "bg-gray-900 text-white hover:bg-gray-800 hover:shadow-md"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
