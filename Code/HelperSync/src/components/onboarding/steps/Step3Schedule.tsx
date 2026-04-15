"use client";

import { useState } from "react";
import { Loader2, Sparkles, Clock } from "lucide-react";
import { DayAvailability } from "@/types/schedule";
import { toast } from "sonner";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

interface Step3Props {
  person: "employer" | "wife";
  availability: DayAvailability;
  onUpdate: (av: DayAvailability) => void;
}

export function Step3Schedule({ person, availability, onUpdate }: Step3Props) {
  const [scheduleText, setScheduleText] = useState(
    person === "employer"
      ? "I work Mon–Fri 9am to 6pm, work from home on Wednesdays"
      : "She works Mon–Fri 9am to 5pm, takes Fridays off"
  );
  const [localAv, setLocalAv] = useState<DayAvailability>(availability);
  const [isParsing, setIsParsing] = useState(false);
  const [hasParsed, setHasParsed] = useState(
    Object.values(availability).some((v) => v.length > 0)
  );

  const handleParse = async () => {
    if (!scheduleText.trim()) return;
    setIsParsing(true);

    try {
      const res = await fetch("/api/ai/parse-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleText, person }),
      });
      const data = await res.json();

      if (data.availability) {
        setLocalAv(data.availability);
        onUpdate(data.availability);
        setHasParsed(true);
      } else {
        toast.error("Could not parse schedule. Please try again.");
      }
    } catch {
      toast.error("Failed to connect. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const isHome = (day: string) => {
    const slots = localAv[day as keyof DayAvailability] ?? [];
    return slots.length === 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-1">
          {person === "employer" ? "Your" : "Your partner's"} weekly schedule
        </h2>
        <p className="text-gray-500 text-sm max-w-md">
          Describe when {person === "employer" ? "you are" : "your partner is"} away from home. Our AI will parse it.
        </p>
      </div>

      <div>
        <textarea
          value={scheduleText}
          onChange={(e) => setScheduleText(e.target.value)}
          rows={3}
          placeholder="e.g. I work Mon–Fri 9am to 6pm, work from home on Wednesdays, sometimes travel on Thursdays"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
        />
      </div>

      <button
        onClick={handleParse}
        disabled={isParsing || !scheduleText.trim()}
        className={`flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isParsing ? "animate-shimmer bg-gradient-to-r from-primary via-primary-400 to-primary bg-[length:200%_100%]" : ""}`}
      >
        {isParsing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Working on it...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" /> Let&apos;s go
          </>
        )}
      </button>

      {hasParsed && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Parsed Schedule</h3>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((day) => (
              <div key={day} className="text-center">
                <div className="text-xs font-medium text-gray-500 mb-1">
                  {DAY_LABELS[day]}
                </div>
                <div
                  className={`rounded-xl py-2 px-1 text-xs font-medium ${
                    isHome(day)
                      ? "bg-primary-50 text-primary"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {isHome(day) ? "🏠 Home" : "🏢 Away"}
                </div>
                {!isHome(day) && (
                  <div className="text-xs text-gray-400 mt-1">
                    {localAv[day as keyof DayAvailability]
                      .map((s) => `${s.start}-${s.end}`)
                      .join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            ✅ Confirmed! You can adjust this later.
          </p>
        </div>
      )}
    </div>
  );
}
