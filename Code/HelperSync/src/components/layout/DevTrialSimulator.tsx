"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { getDaysInTrial, getTrialPhase } from "@/lib/subscription";
import { Calendar, ChevronDown } from "lucide-react";

const TRIAL_DAYS = [
  { day: 1, label: "Day 1", desc: "Early trial" },
  { day: 5, label: "Day 5", desc: "Before wall" },
  { day: 7, label: "Day 7", desc: "Payment wall" },
  { day: 10, label: "Day 10", desc: "Mid-wall" },
  { day: 14, label: "Day 14", desc: "Last day" },
  { day: 15, label: "Day 15", desc: "Expired" },
];

interface Props {
  householdId: Id<"households">;
}

export function DevTrialSimulator({ householdId }: Props) {
  const [open, setOpen] = useState(false);
  const [hasPayment, setHasPayment] = useState(false);
  const subscription = useQuery(api.subscriptions.getSubscription, { householdId });
  const setTrialDay = useMutation(api.subscriptions.devSetTrialDay);

  // Only show in development
  if (process.env.NODE_ENV !== "development") return null;

  const currentDay = subscription ? getDaysInTrial(subscription) : 0;
  const phase = getTrialPhase(subscription);

  const handleSetDay = async (day: number) => {
    await setTrialDay({ householdId, trialDay: day, hasPayment });
  };

  return (
    <div className="fixed bottom-20 left-32 md:bottom-4 md:left-36 z-40">
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-all"
      >
        <Calendar className="w-3.5 h-3.5" />
        Day {currentDay} ({phase})
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 min-w-[200px]">
            <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Simulate Trial Day
            </p>
            {TRIAL_DAYS.map(({ day, label, desc }) => (
              <button
                key={day}
                onClick={() => handleSetDay(day)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                  currentDay === day ? "text-indigo-600 font-semibold" : "text-gray-700"
                }`}
              >
                <span>{label}</span>
                <span className="text-xs text-gray-400">{desc}</span>
              </button>
            ))}
            <div className="border-t border-gray-100 mt-1 pt-1 px-3 py-2">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPayment}
                  onChange={(e) => setHasPayment(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Simulate payment collected
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
