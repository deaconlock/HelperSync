"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { getTrialPhase, getDaysRemaining } from "@/lib/subscription";
import { X, Zap, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface TrialBannerProps {
  householdId: Id<"households">;
  onUpgradeClick?: () => void;
}

export function TrialBanner({ householdId, onUpgradeClick }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [isFtux, setIsFtux] = useState(true);
  const subscription = useQuery(api.subscriptions.getSubscription, { householdId });

  useEffect(() => {
    setIsFtux(!localStorage.getItem("helpersync-first-run-seen"));
  }, []);

  if (isFtux) return null;
  if (!subscription) return null;

  const phase = getTrialPhase(subscription);
  const daysLeft = getDaysRemaining(subscription);

  // Early trial: dismissible amber banner
  if (phase === "early") {
    if (dismissed) return null;
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>
            <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong> left in your free trial.
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-amber-600 hover:text-amber-800"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Payment wall: escalates from amber (7-4 days) to red (3 days or less)
  if (phase === "payment-wall") {
    const urgent = daysLeft <= 3;
    return (
      <div className={`${urgent ? "bg-red-50 border-b border-red-200" : "bg-amber-50 border-b border-amber-200"} px-4 py-2 flex items-center justify-between`}>
        <div className={`flex items-center gap-2 text-sm ${urgent ? "text-red-800" : "text-amber-800"}`}>
          <Zap className={`w-4 h-4 ${urgent ? "text-red-500" : "text-amber-500"}`} />
          <span>
            {urgent
              ? <><strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong> left — add payment to continue using HelperSync.</>
              : <>Enjoying HelperSync? Add payment details to continue after your trial.</>
            }
          </span>
          <button
            onClick={onUpgradeClick}
            className="font-semibold underline hover:no-underline ml-1"
          >
            {urgent ? "Add payment →" : "Set up →"}
          </button>
        </div>
      </div>
    );
  }

  // Grace: green banner (payment collected, trial still running)
  if (phase === "grace") {
    if (dismissed) return null;
    return (
      <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-emerald-800">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span>
            You&apos;re all set! Your subscription starts in <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong>.
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-emerald-600 hover:text-emerald-800"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // active, canceled, expired — no banner (handled by gating)
  return null;
}
