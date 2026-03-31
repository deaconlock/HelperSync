"use client";

import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";

interface WizardShellProps {
  step: number;
  totalSteps: number;
  stepLabels?: string[];
  onNext: () => void | Promise<void>;
  onBack: () => void;
  onStepClick?: (step: number) => void;
  canProceed: boolean;
  isLastStep?: boolean;
  wide?: boolean;
  hideFooter?: boolean;
  children: ReactNode;
}

export function WizardShell({
  step,
  totalSteps,
  stepLabels,
  onNext,
  onBack,
  onStepClick,
  canProceed,
  isLastStep,
  wide,
  hideFooter,
  children,
}: WizardShellProps) {
  const currentLabel = stepLabels?.[step - 1];
  const contentMaxW = wide ? "max-w-6xl" : "max-w-xl";
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-border px-4 py-4 sticky top-0 z-10">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <Logo size="sm" />
            <div className="text-right">
              {currentLabel && (
                <p className="text-xs font-semibold text-gray-700 leading-none mb-0.5">
                  {currentLabel}
                </p>
              )}
              <span className="text-xs text-text-muted">
                Step {step} of {totalSteps}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => {
              const stepNum = i + 1;
              const isPast = stepNum < step;
              const isCurrent = stepNum === step;
              if (isPast) {
                return (
                  <button
                    key={i}
                    onClick={() => onStepClick?.(stepNum)}
                    className="h-1 flex-1 rounded-full bg-gray-900 hover:bg-gray-500 transition-colors"
                    aria-label={`Go back to step ${stepNum}`}
                  />
                );
              }
              return (
                <div
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-500",
                    isCurrent ? "bg-gray-900 animate-progress-fill" : "bg-gray-200"
                  )}
                />
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className={cn(contentMaxW, "mx-auto px-4 py-10")}>{children}</div>
      </main>

      {/* Footer navigation */}
      {!hideFooter && <footer className="bg-white/80 backdrop-blur-md border-t border-border px-4 py-4">
        <div className="max-w-xl mx-auto flex gap-3">
          {step > 1 && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          <button
            onClick={onNext}
            disabled={!canProceed}
            className={cn(
              "flex-1 py-3.5 rounded-xl font-display font-semibold transition-all duration-200",
              canProceed
                ? "bg-gray-900 text-white hover:bg-gray-800 shadow-sm hover:shadow-md"
                : "bg-gray-100 text-text-muted cursor-not-allowed"
            )}
          >
            {isLastStep ? "Finish Setup" : "Continue"}
          </button>
        </div>
      </footer>}
    </div>
  );
}
