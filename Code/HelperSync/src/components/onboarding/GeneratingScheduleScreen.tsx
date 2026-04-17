"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { WizardData } from "@/app/onboarding/employer/page";
import { createInviteData } from "@/lib/invite";
import { DayTasks } from "@/types/timetable";
import { cn } from "@/lib/utils";
import { AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";

// ── Shared fetch logic ────────────────────────────────────────────────────────

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
    tasks: dayObj.tasks.map(({ passive: _passive, ...t }) => ({
      ...t,
      recurring: t.recurring ?? (t.category !== "Break" && t.category !== "Errands"),
      requiresPhoto: t.requiresPhoto ?? ["Elderly Care", "Baby Care"].includes(t.category),
    })),
  }));
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ANIMATE_DURATION_MS = 18_000;
const DAY_REVEAL_INTERVAL_MS = 800;

const DAY_LABELS: Record<string, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

const REASSURANCE_MESSAGES = [
  "Using your inputs to tailor each part of your day",
  "Balancing tasks across your home and schedule",
  "Finalising your week so everything flows smoothly",
  "Designed to be clear and easy for your helper to follow",
  "Almost ready — putting the final pieces together",
  "Keeping workloads balanced across the week",
  "Structured for a fair and sustainable daily routine",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCheckmarks(data: WizardData): string[] {
  const items: string[] = ["Setting up your household"];

  const roomCount = data.rooms.length;
  if (roomCount > 0) items.push(`Mapping your ${roomCount}-room home`);

  const hours = data.dailyLifeAnswers?.helper_hours as string | undefined;
  const hoursMap: Record<string, string> = {
    "630_830": "6:30 AM – 8:30 PM", "700_900": "7:00 AM – 9:00 PM", "700_1000": "7:00 AM – 10:00 PM",
  };
  if (hours && hoursMap[hours]) items.push(`Fitting tasks into your helper's ${hoursMap[hours]} day`);

  const leave = data.dailyLifeAnswers?.leave_time as string | undefined;
  const ret   = data.dailyLifeAnswers?.return_time as string | undefined;
  const retMap: Record<string, string> = {
    "1730": "5:30 PM", "1800": "6:00 PM", "1830": "6:30 PM", "1900": "7:00 PM", "2000": "8:00 PM",
  };
  if (leave && leave !== "home") items.push(`Scheduling noisy tasks before the house fills up`);
  else if (leave === "home")     items.push(`Adjusting for a home that's occupied all day`);
  if (ret && retMap[ret])        items.push(`Timing dinner prep for your ${retMap[ret]} return`);

  const dinner = data.dailyLifeAnswers?.dinner_time as string | undefined;
  const dinnerMap: Record<string, string> = {
    "1800": "6:00 pm", "1830": "6:30 pm", "1900": "7:00 pm", "1930": "7:30 pm", "2000": "8:00 pm",
  };
  if (dinner && dinnerMap[dinner] && !(ret && retMap[ret ?? ""]))
    items.push(`Scheduling around your ${dinnerMap[dinner]} dinner`);

  const hasChild   = data.members.some(m => m.role === "Child");
  const hasElderly = data.members.some(m => m.role === "Elderly");
  const hasPets    = data.members.some(m => m.role === "Pets");
  const childSchool = data.dailyLifeAnswers?.child_school as string | undefined;

  if (hasChild && childSchool === "fullday") items.push(`Planning around school pickup and after-care`);
  else if (hasChild)                         items.push(`Building in childcare tasks throughout the day`);
  if (hasElderly) items.push(`Scheduling care check-ins for your elderly family member`);
  if (hasPets)    items.push(`Adding walk and feeding tasks for your pet`);

  items.push("Building your full 7-day schedule");
  return items;
}

function buildRevealSubtitle(data: WizardData): string {
  const parts: string[] = [];
  if (data.rooms.length > 0) parts.push(`your ${data.rooms.length}-room home`);

  const ret = data.dailyLifeAnswers?.return_time as string | undefined;
  const dinner = data.dailyLifeAnswers?.dinner_time as string | undefined;
  const retMap: Record<string, string> = {
    "1730": "5:30 PM", "1800": "6:00 PM", "1830": "6:30 PM", "1900": "7:00 PM", "2000": "8:00 PM",
  };
  const dinnerMap: Record<string, string> = {
    "1800": "6:00 PM", "1830": "6:30 PM", "1900": "7:00 PM", "1930": "7:30 PM", "2000": "8:00 PM",
  };
  if (ret && retMap[ret]) parts.push(`your ${retMap[ret]} return`);
  else if (dinner && dinnerMap[dinner]) parts.push(`your ${dinnerMap[dinner]} dinner`);

  if (parts.length === 0) return "Built around your household";
  if (parts.length === 1) return `Built around ${parts[0]}`;
  return `Built around ${parts.join(" and ")}`;
}

function buildInsights(data: WizardData): string[] {
  const insights: string[] = [];
  const hasChild   = data.members.some(m => m.role === "Child");
  const hasElderly = data.members.some(m => m.role === "Elderly");
  const ret        = data.dailyLifeAnswers?.return_time as string | undefined;
  const retMap     = { "1730":1,"1800":1,"1830":1,"1900":1,"2000":1 } as Record<string,number>;

  if (hasChild)                     insights.push("Childcare tasks placed around school hours");
  if (ret && retMap[ret])           insights.push("Dinner prep timed before your return home");
  if (data.rooms.length >= 3)       insights.push("Cleaning spread across the week to avoid overload");
  if (hasElderly)                   insights.push("Care check-ins scheduled throughout the day");

  return insights.slice(0, 2);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  data: WizardData;
  preGenPromise?: Promise<DayTasks[]>;
}

export function GeneratingScheduleScreen({ data, preGenPromise }: Props) {
  const router = useRouter();
  const createHousehold = useMutation(api.households.createHousehold);
  const setTimetable    = useMutation(api.timetable.setTimetable);

  const checkmarks = buildCheckmarks(data);

  const [visibleCount, setVisibleCount]   = useState(0);
  const [messageIndex, setMessageIndex]   = useState(0);
  const [revealedDays, setRevealedDays]   = useState<DayTasks[]>([]);
  const [showDayReveal, setShowDayReveal] = useState(false);
  const [weekComplete, setWeekComplete]   = useState(false);
  const [error, setError]                 = useState(false);
  const [retrying, setRetrying]           = useState(false);
  const hasRun = useRef(false);

  // Rotate reassurance messages during phase 1
  useEffect(() => {
    const id = setInterval(() => setMessageIndex(i => (i + 1) % REASSURANCE_MESSAGES.length), 3500);
    return () => clearInterval(id);
  }, []);

  const run = async (overridePreGen?: Promise<DayTasks[]>) => {
    setError(false);
    setVisibleCount(0);
    setRevealedDays([]);
    setShowDayReveal(false);
    setWeekComplete(false);

    const animateIn = async () => {
      const stepsBeforeLast = checkmarks.length - 1;
      const interval = stepsBeforeLast > 1
        ? (ANIMATE_DURATION_MS - 400) / (stepsBeforeLast - 1)
        : ANIMATE_DURATION_MS;
      for (let i = 0; i < stepsBeforeLast; i++) {
        await new Promise(r => setTimeout(r, i === 0 ? 400 : interval));
        setVisibleCount(i + 1);
      }
    };

    try {
      const genPromise = overridePreGen ?? preGenPromise ?? fetchTimetable(data);
      const { code, url } = createInviteData();

      const [weeklyTasks, householdId] = await Promise.all([
        genPromise.then(r => { setVisibleCount(checkmarks.length); return r; }),
        createHousehold({
          homeName: data.homeName || "My Household",
          rooms: data.rooms,
          members: data.members.filter((m): m is typeof m & { role: NonNullable<typeof m.role> } => !!m.role).map(({ timePresets: _tp, ...m }) => m),
          helperDetails: { name: "Helper", nationality: "", phone: "", language: "en" },
          inviteCode: code,
          inviteQrData: url,
        }),
        animateIn(),
        new Promise(r => setTimeout(r, 2000)),
      ]);

      await setTimetable({ householdId, weeklyTasks: weeklyTasks as never });

      localStorage.removeItem("helpersync-wizard");
      localStorage.removeItem("helpersync-wizard-step");

      // ── Phase 2: progressive day reveal ──────────────────────────────────
      await new Promise(r => setTimeout(r, 400));
      setShowDayReveal(true);

      // Monday appears immediately, remaining days stagger
      for (let i = 0; i < weeklyTasks.length; i++) {
        await new Promise(r => setTimeout(r, i === 0 ? 0 : DAY_REVEAL_INTERVAL_MS));
        setRevealedDays(weeklyTasks.slice(0, i + 1));
      }

      // Completion moment
      await new Promise(r => setTimeout(r, 600));
      setWeekComplete(true);
      await new Promise(r => setTimeout(r, 1400));
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
    run(fetchTimetable(data));
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
          <p className="text-sm text-gray-500">We couldn't generate your schedule. Please try again.</p>
          <button onClick={handleRetry} disabled={retrying}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors">
            <RefreshCw className={cn("w-4 h-4", retrying && "animate-spin")} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Phase 2: day reveal ───────────────────────────────────────────────────
  if (showDayReveal) {
    const subtitle  = buildRevealSubtitle(data);
    const insights  = buildInsights(data);
    const allShown  = revealedDays.length === 7;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-xs flex flex-col gap-3">

          {/* Header */}
          <div className="text-center mb-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
              Based on your inputs
            </p>
            <p className="text-base font-semibold text-gray-700">{subtitle}</p>
          </div>

          {/* Insight chips */}
          {insights.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mb-1">
              {insights.map((ins, i) => (
                <span key={i} className="text-xs bg-primary/8 text-primary px-3 py-1 rounded-full font-medium">
                  {ins}
                </span>
              ))}
            </div>
          )}

          {/* Day cards */}
          {["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].map((day, idx) => {
            const dayData   = revealedDays.find(d => d.day === day);
            const isVisible = !!dayData;
            const taskCount = dayData?.tasks.filter(t => t.category !== "Break").length ?? 0;
            const firstTask = dayData?.tasks.find(t => t.category !== "Break");

            return (
              <div
                key={day}
                className="flex items-center justify-between px-4 py-3 rounded-xl border bg-white transition-all duration-500"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.97)",
                  borderColor: isVisible ? "rgb(229 231 235)" : "transparent",
                  boxShadow: isVisible ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  transitionDelay: `${idx * 30}ms`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900 w-24">{DAY_LABELS[day]}</span>
                  {firstTask && (
                    <span className="text-xs text-gray-400 truncate max-w-[110px]">
                      {firstTask.emoji} {firstTask.time} · {firstTask.taskName}
                    </span>
                  )}
                </div>
                {isVisible && (
                  <span className="text-xs font-medium text-primary tabular-nums flex-shrink-0">
                    {taskCount} tasks
                  </span>
                )}
              </div>
            );
          })}

          {/* Completion moment */}
          <div className={cn(
            "flex items-center justify-center gap-2 mt-2 transition-all duration-500",
            allShown && weekComplete ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          )}>
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-gray-800">Your full week is ready</span>
          </div>

        </div>
      </div>
    );
  }

  // ── Phase 1: checklist ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8">
      <div className="flex flex-col items-center gap-8 w-full max-w-xs">
        <div className="text-5xl" style={{ animation: "float 3s ease-in-out infinite" }}>✨</div>

        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-gray-900 mb-1">
            Building your schedule…
          </h2>
          <p className="text-sm text-gray-400">Personalising your full 7-day plan (~20 seconds)</p>
        </div>

        <div className="w-full space-y-3">
          {checkmarks.map((label, i) => {
            const isVisible  = i < visibleCount;
            const isLast     = i === checkmarks.length - 1;
            const isSpinning = isLast && visibleCount === checkmarks.length - 1 && !error;

            return (
              <div key={i}
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

        {/* Rotating reassurance message */}
        <div className="h-5 overflow-hidden w-full text-center">
          <p
            key={messageIndex}
            className="text-xs text-gray-400 italic"
            style={{ animation: "fade-in-up 0.4s ease-out both" }}
          >
            {REASSURANCE_MESSAGES[messageIndex]}
          </p>
        </div>

        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${(visibleCount / checkmarks.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
