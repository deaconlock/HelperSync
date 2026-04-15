"use client";

import { ArrowRight } from "lucide-react";
import type { Priority, SetupFor } from "@/app/onboarding/employer/page";

interface Persona {
  name: string;
  tagline: string;
  emoji: string;
}

// Value mapping from Step0Qualification:
//   firstTimeEmployer = true  → "Yes, I've had a helper before" (experienced)
//   firstTimeEmployer = false → "No, this is my first time"     (first-timer)
//   setupFor = "own"          → "My own home"
//   setupFor = "family"       → "A family member's home"
//
// Ordering logic: family context wins over first-timer status — if you're setting
// up for a parent or relative, that's more defining than whether it's your first time.
// First-timer persona only applies to own-home cases.

export function derivePersona(
  setupFor: SetupFor | null,
  householdFocus: Priority[],
  firstTimeEmployer: boolean | null
): Persona {
  // 1. Family home — most specific cases first
  if (setupFor === "family" && householdFocus.includes("elderlycare")) {
    return {
      name: "The Caring Organiser",
      tagline: "Keeping your loved ones comfortable and well looked after",
      emoji: "💛",
    };
  }
  if (setupFor === "family") {
    return {
      name: "The Family Supporter",
      tagline: "Making sure the household runs smoothly, even when you're not there",
      emoji: "👨‍👩‍👧",
    };
  }

  // 2. Own home, first-timer — acknowledge before anything else
  if (firstTimeEmployer === false) {
    return {
      name: "The First-Time Employer",
      tagline: "Building your household rhythm for the very first time",
      emoji: "🌱",
    };
  }

  // 3. Own home, experienced — persona driven by what matters most to them
  if (householdFocus.includes("childcare")) {
    return {
      name: "The Family Manager",
      tagline: "Keeping the whole family on track — meals, kids, and everything in between",
      emoji: "👨‍👩‍👦",
    };
  }
  if (householdFocus.includes("meals") && householdFocus.includes("cleanliness")) {
    return {
      name: "The Home Keeper",
      tagline: "A well-run home, from a clean kitchen to a tidy living room",
      emoji: "🏠",
    };
  }
  if (householdFocus.includes("cleanliness") && householdFocus.includes("laundry")) {
    return {
      name: "The Clean Home Keeper",
      tagline: "A spotless space and fresh laundry — every single week",
      emoji: "✨",
    };
  }

  // 4. Fallback
  return {
    name: "The Household Manager",
    tagline: "Running a smooth, organised home with the right help",
    emoji: "🏡",
  };
}

interface PersonaCardProps {
  setupFor: SetupFor | null;
  householdFocus: Priority[];
  firstTimeEmployer: boolean | null;
  onContinue: () => void;
}

export function PersonaCard({ setupFor, householdFocus, firstTimeEmployer, onContinue }: PersonaCardProps) {
  const persona = derivePersona(setupFor, householdFocus, firstTimeEmployer);

  return (
    <div
      className="fixed inset-0 z-40 bg-background flex flex-col items-center justify-center px-6"
      style={{ animation: "fade-in-up 0.4s ease-out both" }}
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-[0.06] blur-[100px]"
          style={{
            background: "radial-gradient(circle, #0D9488, transparent 70%)",
            top: "20%",
            left: "30%",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        {/* Emoji */}
        <div className="text-6xl mb-6 leading-none">{persona.emoji}</div>

        {/* Label */}
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
          Your employer profile
        </p>

        {/* Persona name */}
        <h2 className="text-2xl sm:text-3xl font-display font-semibold text-gray-900 mb-3 leading-snug">
          {persona.name}
        </h2>

        {/* Tagline */}
        <p className="text-gray-500 text-sm leading-relaxed mb-4">
          {persona.tagline}
        </p>

        {/* Social proof */}
        <p className="text-xs text-gray-400 mb-10">
          Join 2,400+ families who&apos;ve streamlined their household with HelperSync
        </p>

        {/* CTA */}
        <button
          onClick={onContinue}
          className="w-full max-w-xs flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white rounded-xl font-display font-semibold hover:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200"
        >
          That&apos;s me — let&apos;s go <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
