"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Shield, Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export default function SubscribePage() {
  const household = useQuery(api.households.getMyHousehold);
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!household) return;
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId: household._id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo size="md" />
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Shield className="w-8 h-8 text-gray-700" />
          </div>
        </div>

        <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">
          Your free trial has ended
        </h1>
        <p className="text-sm text-text-muted mb-8">
          Subscribe to keep managing your helper with HelperSync.
        </p>

        {/* Pricing card */}
        <div className="border border-border rounded-2xl p-6 bg-white text-left mb-6">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">HelperSync Pro</h3>
              <p className="text-xs text-text-muted">Everything you need</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-gray-900">$9.90</span>
              <span className="text-sm text-text-muted">/mo</span>
            </div>
          </div>

          <ul className="space-y-2.5 text-sm text-gray-600 mb-6">
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              AI-powered timetable generation
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              Real-time task tracking with photos
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              Helper mobile dashboard
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              AI chat assistant for schedule changes
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              Medication & elderly care tracking
            </li>
          </ul>

          <button
            onClick={handleCheckout}
            disabled={loading || !household}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Subscribe now"
            )}
          </button>
          <p className="text-xs text-text-muted text-center mt-2">
            Cancel anytime. No long-term commitment.
          </p>
        </div>
      </div>
    </div>
  );
}
