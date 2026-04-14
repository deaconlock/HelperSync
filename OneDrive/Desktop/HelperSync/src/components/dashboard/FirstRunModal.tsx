"use client";

import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    emoji: "👋",
    title: "Welcome to HelperSync",
    body: "Your command centre for managing your household helper — tasks, schedules, and daily routines all in one place.",
  },
  {
    emoji: "📅",
    title: "Your helper's week, planned for you",
    body: "HelperSync generated a personalised weekly task schedule based on your home and priorities. Head to the Timetable to review and adjust it.",
  },
  {
    emoji: "✅",
    title: "Track progress in real time",
    body: "Your helper marks tasks done from their phone. You see live completion rates, photos, and a daily summary right here on your dashboard.",
  },
  {
    emoji: "📲",
    title: "Invite your helper to get started",
    body: "Share the invite code or QR from Settings → Helper Profile so they can log in and see today's tasks on their phone.",
  },
  {
    emoji: "🚀",
    title: "You're all set",
    body: "Explore your dashboard. You can always edit the timetable, add members, or update preferences from Settings.",
    cta: "Go to my dashboard",
  },
];

interface FirstRunModalProps {
  onDismiss: () => void;
}

export function FirstRunModal({ onDismiss }: FirstRunModalProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const slide = SLIDES[slideIndex];
  const isLast = slideIndex === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      onDismiss();
    } else {
      setSlideIndex((i) => i + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div
        className="bg-white rounded-3xl w-full max-w-sm shadow-xl overflow-hidden"
        style={{ animation: "fade-in-up 0.35s ease-out both" }}
      >
        {/* Skip */}
        <div className="flex justify-end px-5 pt-4">
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Skip intro"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slide content */}
        <div className="px-7 pb-8 pt-2 flex flex-col items-center text-center">
          <div className="text-6xl mb-5 leading-none">{slide.emoji}</div>
          <h2 className="text-xl font-display font-semibold text-gray-900 mb-2 leading-snug">
            {slide.title}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            {slide.body}
          </p>

          {/* Dot indicators */}
          <div className="flex gap-1.5 mb-6">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideIndex(i)}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === slideIndex
                    ? "w-5 h-2 bg-gray-900"
                    : "w-2 h-2 bg-gray-200 hover:bg-gray-300"
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={next}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white rounded-xl font-display font-semibold hover:bg-gray-800 transition-all duration-200 shadow-sm"
          >
            {slide.cta ?? "Next"}
            {!isLast && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
