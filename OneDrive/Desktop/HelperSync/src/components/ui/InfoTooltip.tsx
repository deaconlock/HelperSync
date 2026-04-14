"use client";

import { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: string;
  className?: string;
}

/**
 * Small ⓘ icon that shows a popover on click (mobile-friendly) or hover (desktop).
 * Keyboard accessible: Enter/Space to open, Escape to close.
 */
export function InfoTooltip({ content, className }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-flex items-center", className)}>
      <button
        type="button"
        aria-label="More information"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-4 h-4 rounded-full text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
      >
        <Info className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-56 bg-gray-900 text-white text-xs leading-relaxed rounded-xl px-3 py-2.5 shadow-lg"
        >
          {/* Arrow */}
          <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-gray-900 rotate-45 rounded-sm" />
          {content}
        </div>
      )}
    </div>
  );
}
