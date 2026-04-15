"use client";

import { Zap, Check } from "lucide-react";

const FEATURES = [
  "Unlimited AI schedule generation",
  "Real-time task tracking for helper",
  "Multi-language helper interface",
  "Photo proof of task completion",
  "Leave and days-off management",
  "AI assistant chat & suggestions",
  "WhatsApp notifications",
];

interface PaywallModalProps {
  onUpgrade: () => void;
}

export function PaywallModal({ onUpgrade }: PaywallModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-card-hover max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-amber-500" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Free Trial Ended
        </h2>
        <p className="text-gray-500 mb-6">
          Subscribe to continue managing your household with HelperSync.
        </p>

        {/* Pricing card */}
        <div className="bg-primary-50 rounded-2xl p-5 mb-6 text-left">
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-3xl font-bold text-primary">$6.99</span>
            <span className="text-gray-500">/month SGD</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">Cancel anytime · No commitment</p>
          <ul className="space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={onUpgrade}
          className="w-full py-3.5 bg-primary text-white rounded-2xl font-semibold text-base hover:bg-primary-700 transition-colors"
        >
          Subscribe Now
        </button>

        <p className="mt-3 text-xs text-gray-400">
          Your helper&apos;s view is always available — this only affects employer features.
        </p>
      </div>
    </div>
  );
}
