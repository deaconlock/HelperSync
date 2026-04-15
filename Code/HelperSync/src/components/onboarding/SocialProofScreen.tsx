"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";

const TESTIMONIALS = [
  {
    avatar: "/images/avatar-priya.png",
    quote: "We stopped arguing about household tasks the first week.",
    name: "Priya T.",
    location: "Bukit Timah",
  },
  {
    avatar: "/images/avatar-jason.png",
    quote: "My mum's helper now has a clear routine without me calling every day.",
    name: "Jason L.",
    location: "Novena",
  },
  {
    avatar: "/images/avatar-michelle.png",
    quote: "I used to spend Sunday nights writing instructions. Now it takes 30 seconds.",
    name: "Michelle K.",
    location: "East Coast",
  },
];

interface SocialProofScreenProps {
  onContinue: () => void;
}

export function SocialProofScreen({ onContinue }: SocialProofScreenProps) {
  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12"
      style={{ animation: "screen-fade-in 0.4s ease-out both" }}
    >
      <div className="w-full max-w-sm">

        {/* Headline */}
        <h1
          className="text-3xl font-display font-semibold tracking-tight text-gray-900 mb-8 leading-snug text-center"
          style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both" }}
        >
          Here&apos;s what a stress-free home looks like.
        </h1>

        {/* Testimonials */}
        <div className="space-y-3 mb-6">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              className="bg-white rounded-2xl p-5 flex items-start gap-4 shadow-sm"
              style={{ animation: `fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) ${0.2 + i * 0.12}s both` }}
            >
              <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={t.avatar}
                  alt={t.name}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm text-gray-800 leading-relaxed mb-2">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {t.name} <span className="font-normal text-text-muted">· {t.location}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Fine print */}
        <p
          className="text-xs text-center text-text-muted mb-6"
          style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.56s both" }}
        >
          Available on web and mobile · No credit card needed to start
        </p>

        {/* CTA */}
        <div style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.66s both" }}>
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
