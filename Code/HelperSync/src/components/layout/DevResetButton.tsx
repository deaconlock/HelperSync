"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { RotateCcw, Loader2 } from "lucide-react";

export function DevResetButton() {
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const resetHousehold = useMutation(api.households.devResetHousehold);
  const router = useRouter();
  const { user } = useUser();

  // Only show in development
  if (process.env.NODE_ENV !== "development") return null;

  const handleReset = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setResetting(true);
    try {
      // 1. Clear Convex data (only if signed in)
      if (user) {
        try { await resetHousehold({}); } catch { /* may fail if no household */ }
      }

      // 2. Clear all localStorage
      localStorage.removeItem("helpersync-wizard");
      localStorage.removeItem("helpersync-wizard-step");

      // 3. Delete Clerk account via server-side API (bypasses client verification)
      try {
        await fetch("/api/dev-reset", { method: "POST" });
      } catch { /* may fail if not signed in */ }

      // 4. Redirect to fresh start (account is deleted, user is effectively signed out)
      window.location.href = "/onboarding";
    } catch (err) {
      console.error("Reset failed:", err);
      window.location.href = "/onboarding";
    }
  };

  return (
    <div className="fixed bottom-20 left-3 md:bottom-4 md:left-4 z-40">
      <button
        onClick={handleReset}
        onBlur={() => !resetting && setConfirming(false)}
        disabled={resetting}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all ${
          confirming
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
        } disabled:opacity-50`}
        title="Factory reset: delete all data + Clerk account"
      >
        {resetting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RotateCcw className="w-3.5 h-3.5" />
        )}
        {confirming ? "Factory reset everything?" : "DEV: Reset"}
      </button>
    </div>
  );
}
