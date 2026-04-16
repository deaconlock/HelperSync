"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { WizardData } from "@/app/onboarding/employer/page";
import { createInviteData } from "@/lib/invite";
import { DayTasks } from "@/types/timetable";
import { cn } from "@/lib/utils";
import { AlertCircle, RefreshCw } from "lucide-react";

// ── Shared fetch logic (also exported for pre-generation in page.tsx) ──────────

export async function fetchTimetable(data: WizardData): Promise<DayTasks[]> {
  const res = await fetch("/api/ai/generate-timetable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      homeName: data.homeName,
      rooms: data.rooms,
      members: data.members,
      routines: data.householdRoutine,
      memberRoutines: data.memberRoutines,
      priorities: data.priorities,
      homeSize: data.homeSize,
      daysToGenerate: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    }),
  });

  if (!res.ok || !res.body) throw new Error("Generation failed");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    accumulated += decoder.decode(value, { stream: true });
  }

  const arrMatch = accumulated.trim().match(/\[[\s\S]*\]/);
  if (!arrMatch) throw new Error("Invalid response format");

  const parsed: DayTasks[] = JSON.parse(arrMatch[0]);
  if (!Array.isArray(parsed) || !parsed[0]?.day) throw new Error("Invalid timetable data");

  return parsed.map((dayObj: DayTasks) => ({
    ...dayObj,
    tasks: dayObj.tasks.map((t) => ({
      ...t,
      recurring: t.recurring ?? (t.category !== "Break" && t.category !== "Errands"),
      requiresPhoto: t.requiresPhoto ?? ["Elderly Care", "Baby Care"].includes(t.category),
    })),
  }));
}

// ── Checkmark copy ─────────────────────────────────────────────────────────────

function buildCheckmarks(data: WizardData): string[] {
  const items: string[] = ["Setting up your household"];

  const dinner = data.dailyLifeAnswers?.dinner_time as string | undefined;
  const dinnerMap: Record<string, string> = {
    "1800": "6:00 pm", "1830": "6:30 pm", "1900": "7:00 pm",
    "1930": "7:30 pm", "2000": "8:00 pm",
  };
  if (dinner && dinnerMap[dinner]) {
    items.push(`Scheduling around your ${dinnerMap[dinner]} dinner`);
  }

  const parts: string[] = [];
  if (data.members.some(m => m.role === "Child")) parts.push("children");
  if (data.members.some(m => m.role === "Elderly")) parts.push("elderly care");
  if (data.members.some(m => m.role === "Pets")) parts.push("pets");
  if (parts.length) items.push(`Planning around your ${parts.join(" and ")}`);

  items.push("Building your full 7-day schedule");
  return items;
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  data: WizardData;
  /** Pre-started generation promise — avoids re-calling the API if already in flight */
  preGenPromise?: Promise<DayTasks[]>;
}

export function GeneratingScheduleScreen({ data, preGenPromise }: Props) {
  const router = useRouter();
  const createHousehold = useMutation(api.households.createHousehold);
  const setTimetable    = useMutation(api.timetable.setTimetable);

  const checkmarks = buildCheckmarks(data);
  const [visibleCount, setVisibleCount] = useState(0);
  const [error, setError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const hasRun = useRef(false);

  const run = async (overridePreGen?: Promise<DayTasks[]>) => {
    setError(false);
    setVisibleCount(0);

    // Animate checkmarks in while generation runs in background
    const animateIn = async () => {
      for (let i = 0; i < checkmarks.length; i++) {
        await new Promise(r => setTimeout(r, i === 0 ? 400 : 700));
        setVisibleCount(i + 1);
      }
    };

    try {
      const genPromise = overridePreGen ?? preGenPromise ?? fetchTimetable(data);

      const [weeklyTasks] = await Promise.all([
        genPromise,
        animateIn(),
        new Promise(r => setTimeout(r, 2000)), // minimum display time
      ]);

      const { code, url } = createInviteData();
      const householdId = await createHousehold({
        homeName: data.homeName || "My Household",
        rooms: data.rooms,
        members: data.members,
        helperDetails: { name: "Helper", nationality: "", phone: "", language: "en" },
        inviteCode: code,
        inviteQrData: url,
      });

      await setTimetable({ householdId, weeklyTasks: weeklyTasks as never });

      localStorage.removeItem("helpersync-wizard");
      localStorage.removeItem("helpersync-wizard-step");

      router.push("/dashboard/timetable");
    } catch (err) {
      console.error("Schedule generation failed:", err);
      setError(true);
    }
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => {
    setRetrying(true);
    hasRun.current = false;
    setRetrying(false);
    run(fetchTimetable(data)); // fresh fetch on retry
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8">
      {error ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
          <p className="text-sm text-gray-500">We couldn't generate your schedule. Please try again.</p>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", retrying && "animate-spin")} />
            Try again
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-8 w-full max-w-xs">
          <div className="text-5xl" style={{ animation: "float 3s ease-in-out infinite" }}>✨</div>

          <div className="text-center">
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-1">
              Finishing your schedule…
            </h2>
            <p className="text-sm text-gray-400">This only takes a moment</p>
          </div>

          <div className="w-full space-y-3">
            {checkmarks.map((label, i) => {
              const isVisible  = i < visibleCount;
              const isLast     = i === checkmarks.length - 1;
              const isSpinning = isLast && isVisible && !error;

              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 transition-all duration-500",
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
                  )}
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs",
                    isSpinning
                      ? "border-2 border-primary border-t-transparent animate-spin"
                      : isVisible ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-300",
                  )}>
                    {!isSpinning && isVisible && "✓"}
                  </div>
                  <span className={cn(
                    "text-sm",
                    isVisible ? "text-gray-700" : "text-gray-300",
                    isLast && isVisible && "font-medium text-gray-900",
                  )}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
              style={{ width: `${(visibleCount / checkmarks.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
