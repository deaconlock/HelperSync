"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      router.replace("/dashboard");
    }
  }, [countdown, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
        <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">
          Payment details saved!
        </h1>
        <p className="text-sm text-text-muted mb-6">
          Your free trial continues. You won&apos;t be charged until it ends.
        </p>
        <p className="text-xs text-text-muted">
          Redirecting to dashboard in {countdown}...
        </p>
      </div>
    </div>
  );
}
