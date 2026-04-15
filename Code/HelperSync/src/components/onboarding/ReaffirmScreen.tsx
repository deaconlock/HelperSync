"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";

interface ReaffirmScreenProps {
  onContinue: () => void;
}

export function ReaffirmScreen({ onContinue }: ReaffirmScreenProps) {
  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-6"
      style={{ animation: "screen-fade-in 0.4s ease-out both" }}
    >
      <div className="w-full max-w-sm text-center">

        <div
          className="rounded-3xl overflow-hidden mb-6 shadow-md"
          style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both" }}
        >
          <Image
            src="/images/reaffirm-hero2.jpg.png"
            alt="HelperSync AI schedule setup on a phone"
            width={600}
            height={750}
            className="w-full object-cover"
            priority
            quality={90}
          />
        </div>

        <h1
          className="text-3xl font-display font-semibold tracking-tight text-gray-900 mb-4 leading-snug"
          style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.22s both" }}
        >
          You&apos;re one step closer to a stress-free home.
        </h1>

        <p
          className="text-sm text-text-secondary leading-relaxed mb-10"
          style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.36s both" }}
        >
          HelperSync builds your helper&apos;s full weekly timetable in under 5 minutes — no templates, no guesswork.
        </p>

        <div style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.48s both" }}>
          <button
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-xl font-display font-semibold text-base hover:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
