"use client";

import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">

      {/* Splash overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 overflow-hidden pointer-events-none transition-opacity duration-[1000ms] ease-in-out",
          showSplash ? "opacity-100 pointer-events-auto" : "opacity-0"
        )}
      >
        {/* Splash — logo + tagline on pure white */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white gap-6"
          style={{ animation: "splash-fade-in 0.8s cubic-bezier(0.22,1,0.36,1) forwards" }}
        >
          <Logo size="xl" showText={false} />
          <div className="text-center">
            <p className="text-3xl font-display tracking-tight mt-1">
              <span className="font-semibold text-gray-900">Helper</span><span className="font-normal text-text-secondary">Sync</span>
            </p>
            <p className="text-sm text-gray-400 mt-1">One home. One team. In sync.</p>
          </div>
        </div>
      </div>

      {/* Main content — fades in after splash */}
      <div
        className="flex flex-col flex-1"
        style={!showSplash ? { animation: "screen-fade-in 0.5s ease-out both" } : { opacity: 0 }}
      >
        <header className="px-6 py-5">
          <Logo size="sm" />
        </header>

        <main className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full pb-12">

          {/* Headline — staggered reveal */}
          <div className="text-center mb-6">
            <h1
              className="text-3xl font-display font-semibold tracking-tight text-gray-900 mb-3 leading-snug"
              style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both" }}
            >
              Finally, a helper that always knows what to do.
            </h1>
            <p
              className="text-xs font-medium text-text-muted uppercase tracking-widest mb-3"
              style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.25s both" }}
            >
              Built by a Singapore family who lived this problem.
            </p>
          </div>

          {/* Hero photo — floats gently */}
          <div
            className="rounded-3xl overflow-hidden mb-8 shadow-md"
            style={{
              animation: "fade-in-up 0.7s cubic-bezier(0.22,1,0.36,1) 0.5s both, welcome-float 6s ease-in-out 1.2s infinite",
            }}
          >
            <Image
              src="/images/welcome-hero.jpg.jpeg"
              alt="Family relaxing at home while helper works in the background"
              width={800}
              height={534}
              className="w-full object-cover"
              priority
            />
          </div>

          {/* CTA — shimmer sweep */}
          <div style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.7s both" }}>
            <button
              onClick={onStart}
              className="relative w-full flex items-center justify-center gap-2 py-4 rounded-xl font-display font-semibold text-base shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
              style={{
                background: "linear-gradient(105deg, #111827 0%, #1f2937 40%, #374151 50%, #1f2937 60%, #111827 100%)",
                backgroundSize: "200% auto",
                color: "white",
                animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.7s both, cta-shimmer 3.5s linear 1.5s infinite",
              }}
            >
              Start free — 30 days on us <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p
            className="text-xs text-center text-gray-400 mt-4"
            style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.85s both" }}
          >
            1 month free · No credit card required · Cancel anytime
          </p>
          <p
            className="text-xs text-center text-gray-400 mt-2"
            style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 1s both" }}
          >
            Designed for first-time employers · Fair, balanced workloads
          </p>
        </main>
      </div>
    </div>
  );
}
