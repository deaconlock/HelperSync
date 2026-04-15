"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { getTrialPhase, getDaysRemaining } from "@/lib/subscription";
import { Shield, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  "AI-powered timetable generation",
  "Real-time task tracking with photos",
  "Helper mobile dashboard",
  "AI chat assistant for schedule changes",
  "Medication & elderly care tracking",
];

export default function AccountPage() {
  const household = useQuery(api.households.getMyHousehold);
  const subscription = useQuery(
    api.subscriptions.getSubscription,
    household ? { householdId: household._id } : "skip"
  );
  const [loading, setLoading] = useState(false);

  const phase = getTrialPhase(subscription);
  const daysRemaining = subscription ? getDaysRemaining(subscription) : 0;

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
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const isTrialing = phase === "early" || phase === "payment-wall" || phase === "grace";
  const isActive = phase === "active";
  const isExpiredOrCanceled = phase === "expired" || phase === "canceled";

  const statusBadge = isActive
    ? { label: "Active", className: "bg-emerald-100 text-emerald-700" }
    : isTrialing
    ? { label: "Free Trial", className: "bg-amber-100 text-amber-700" }
    : { label: phase === "canceled" ? "Canceled" : "Expired", className: "bg-red-100 text-red-700" };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Account</h1>
        <p className="text-sm text-text-muted mt-1">Manage your HelperSync subscription</p>
      </div>

      {/* Subscription Card */}
      <div className="border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">HelperSync Pro</h2>
                <p className="text-xs text-text-muted">$9.90 / month</p>
              </div>
            </div>
            <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", statusBadge.className)}>
              {statusBadge.label}
            </span>
          </div>

          {/* Status detail */}
          <div className="mt-4">
            {isTrialing && phase !== "grace" && (
              <p className="text-sm text-gray-600">
                {daysRemaining > 0
                  ? <><strong>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""}</strong> remaining in your free trial</>
                  : "Your trial ends today"}
              </p>
            )}
            {phase === "grace" && (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle className="w-4 h-4" />
                Payment saved — you won&apos;t be charged until your trial ends ({daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left)
              </div>
            )}
            {isActive && subscription?.currentPeriodEnd && (
              <p className="text-sm text-gray-600">
                Next billing date: <strong>{new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>
              </p>
            )}
            {isActive && !subscription?.currentPeriodEnd && (
              <p className="text-sm text-gray-600">Your subscription is active.</p>
            )}
            {isExpiredOrCanceled && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                {phase === "canceled" ? "Your subscription has been canceled." : "Your trial has ended."}
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="p-6 border-b border-border">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-3">What&apos;s included</p>
          <ul className="space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-emerald-500">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="p-6">
          {(isTrialing && phase !== "grace") && (
            <>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Subscribe Now"}
              </button>
              <p className="text-xs text-text-muted text-center mt-2">
                You won&apos;t be charged until your trial ends. Cancel anytime.
              </p>
            </>
          )}
          {phase === "grace" && (
            <p className="text-sm text-center text-text-muted">
              Your subscription will begin automatically when your trial ends.
            </p>
          )}
          {isActive && (
            <p className="text-sm text-center text-text-muted">
              To manage or cancel your subscription, contact us at{" "}
              <a href="mailto:support@helpersync.app" className="text-gray-900 underline">
                support@helpersync.app
              </a>
            </p>
          )}
          {isExpiredOrCanceled && (
            <>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Subscribe to Reactivate"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
