"use client";

import { useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { Shield, Loader2, X } from "lucide-react";

interface PaymentWallModalProps {
  householdId: Id<"households">;
  daysLeft: number;
}

export function PaymentWallModal({ householdId, daysLeft }: PaymentWallModalProps) {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (dismissed) return null;

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
        setLoading(false);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 relative animate-fade-in-up">
        {/* Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Shield className="w-7 h-7 text-gray-700" />
          </div>
        </div>

        {/* Header */}
        <h2 className="text-xl font-display font-bold text-gray-900 text-center mb-2">
          Add payment to continue
        </h2>
        <p className="text-sm text-text-muted text-center mb-6">
          You have <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong> left in your trial.
          Add your payment details now to keep using HelperSync without interruption.
        </p>

        {/* Pricing card */}
        <div className="border border-border rounded-2xl p-5 mb-4">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">HelperSync Pro</h3>
              <p className="text-xs text-text-muted">Everything you need to manage your helper</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-gray-900">$9.90</span>
              <span className="text-sm text-text-muted">/mo</span>
            </div>
          </div>

          <ul className="space-y-2 text-sm text-gray-600 mb-4">
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
          </ul>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Add payment details"
            )}
          </button>
          <p className="text-[10px] text-text-muted text-center mt-2">
            You won&apos;t be charged until your trial ends. Cancel anytime.
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="w-full text-center text-sm text-text-muted hover:text-gray-600 transition-colors"
        >
          Remind me later
        </button>
      </div>
    </div>
  );
}
