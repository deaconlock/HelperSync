"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import Link from "next/link";
import bcrypt from "bcryptjs";
import { toast } from "sonner";

function JoinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const createSession = useMutation(api.helperSessions.createOrUpdateSession);

  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Pre-fill from URL param (/join?code=ABC123)
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      const formatted = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
      setInviteCode(formatted.length > 3 ? `${formatted.slice(0, 3)}-${formatted.slice(3, 6)}` : formatted);
    }
  }, [searchParams]);

  const handleJoin = async () => {
    const rawCode = inviteCode.replace("-", "");
    if (rawCode.length !== 6) {
      setInviteError("Please enter a valid 6-character code");
      return;
    }

    if (!isSignedIn) {
      const code = rawCode.toUpperCase();
      router.push(`/sign-in?redirect_url=/join?code=${code}`);
      toast("Please sign in to join a household");
      return;
    }

    setIsJoining(true);
    setInviteError("");

    try {
      const code = rawCode.toUpperCase();
      const response = await fetch(`/api/invite/validate?code=${code}`);
      const data = await response.json();

      if (!data.valid || !data.householdId) {
        setInviteError("Invalid invite code. Please check and try again.");
        return;
      }

      const pinHash = await bcrypt.hash("0000", 10);
      await createSession({
        householdId: data.householdId,
        language: data.helperLanguage ?? "en",
        pinHash,
      });

      toast.success("Welcome to HelperSync!");
      router.push("/helper");
    } catch {
      setInviteError("Something went wrong. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5">
        <Logo size="sm" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">
          {/* Icon + heading */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">👋</div>
            <h1 className="text-2xl font-display font-semibold text-gray-900 mb-2 leading-snug">
              Your employer has invited you
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              Enter the 6-character code they shared with you to get started.
            </p>
          </div>

          {/* Invite code input */}
          <div className="space-y-3">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => {
                const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
                setInviteCode(val);
                setInviteError("");
              }}
              placeholder="ABC-123"
              maxLength={7}
              className="w-full px-4 py-4 rounded-2xl border border-gray-200 text-center text-3xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
            />

            {inviteError && (
              <p className="text-red-500 text-sm text-center">{inviteError}</p>
            )}

            <button
              onClick={handleJoin}
              disabled={isJoining || inviteCode.replace("-", "").length < 6}
              className="w-full py-4 bg-gray-900 text-white rounded-xl font-display font-semibold text-base hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Joining...
                </>
              ) : (
                "Join Household"
              )}
            </button>
          </div>

          {/* Employer link */}
          <p className="text-center text-sm text-gray-400 mt-8">
            Are you an employer?{" "}
            <Link href="/onboarding/employer" className="text-primary font-medium hover:underline">
              Set up your household →
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinPageInner />
    </Suspense>
  );
}
