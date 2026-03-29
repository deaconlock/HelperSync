"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Building2, User, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import bcrypt from "bcryptjs";
import { toast } from "sonner";

type Role = "employer" | "helper" | null;
type SplashPhase = "logo" | "slogan" | "content" | "done";

export default function OnboardingPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const household = useQuery(api.households.getMyHousehold, isSignedIn ? undefined : "skip");
  const helperSession = useQuery(api.helperSessions.getMySession, isSignedIn ? undefined : "skip");

  const createSession = useMutation(api.helperSessions.createOrUpdateSession);

  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [splashPhase, setSplashPhase] = useState<SplashPhase>("logo");

  // Splash animation sequence — cinematic pacing
  useEffect(() => {
    const timers = [
      setTimeout(() => setSplashPhase("slogan"), 1000),   // logo breathes for 1s
      setTimeout(() => setSplashPhase("content"), 3800),   // slogan lingers 2.8s
      setTimeout(() => setSplashPhase("done"), 5000),      // slow 1.2s fade-out
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Redirect if already set up
  useEffect(() => {
    if (household !== undefined && household !== null) {
      router.replace("/dashboard");
    } else if (helperSession !== undefined && helperSession !== null) {
      router.replace("/helper");
    }
  }, [household, helperSession, router]);

  // If user lands here after OAuth but has wizard data in progress, resume the wizard
  useEffect(() => {
    if (!isSignedIn) return;
    const wizardData = localStorage.getItem("helpersync-wizard");
    if (wizardData) {
      router.replace("/onboarding/employer?completing=true");
    }
  }, [isSignedIn, router]);

  const handleEmployerSelect = () => {
    setSelectedRole("employer");
    router.push("/onboarding/employer");
  };

  const handleHelperJoin = async () => {
    if (inviteCode.replace("-", "").length !== 6) {
      setInviteError("Please enter a valid 6-character code");
      return;
    }

    if (!isSignedIn) {
      // Helpers need to sign in first — save code and redirect
      const code = inviteCode.replace("-", "").toUpperCase();
      router.push(`/sign-in?redirect_url=/onboarding&code=${code}`);
      toast("Please sign in to join a household");
      return;
    }

    setIsJoining(true);
    setInviteError("");

    try {
      const code = inviteCode.replace("-", "").toUpperCase();
      const response = await fetch(
        `/api/invite/validate?code=${code}`
      );
      const data = await response.json();

      if (!data.valid || !data.householdId) {
        setInviteError("Invalid invite code. Please check and try again.");
        setIsJoining(false);
        return;
      }

      // Create helper session with default PIN "0000"
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

  // Splash overlay — shows logo animation then fades out
  const showSplash = splashPhase !== "done";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Splash overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-background flex flex-col items-center justify-center transition-all duration-[1200ms] ease-out",
          splashPhase === "content" || splashPhase === "done"
            ? "opacity-0 scale-[1.02] pointer-events-none"
            : "opacity-100 scale-100"
        )}
      >
        {/* Animated gradient orbs — teal/primary tones on light bg */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute w-[500px] h-[500px] rounded-full opacity-[0.07] blur-[120px]"
            style={{
              background: "radial-gradient(circle, #0D9488, transparent 70%)",
              top: "15%",
              left: "25%",
              animation: "splash-orb-1 4s ease-in-out infinite alternate",
            }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full opacity-[0.05] blur-[100px]"
            style={{
              background: "radial-gradient(circle, #0D9488, transparent 70%)",
              bottom: "20%",
              right: "20%",
              animation: "splash-orb-2 5s ease-in-out infinite alternate",
            }}
          />
        </div>

        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, #0F172A 0.5px, transparent 0.5px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Logo entrance */}
        <div
          className="relative z-10"
          style={{
            animation: "splash-logo 1s cubic-bezier(0.22, 1, 0.36, 1) 0.15s forwards",
            opacity: 0,
          }}
        >
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="absolute -inset-8 rounded-full bg-primary/5 blur-2xl animate-pulse" />
              <Logo size="lg" className="scale-150" />
            </div>
          </div>
        </div>

        {/* Slogan */}
        <div
          className={cn(
            "relative z-10 mt-8 text-center transition-all duration-[900ms] ease-out",
            splashPhase === "slogan" ? "opacity-100 translate-y-0" : splashPhase === "logo" ? "opacity-0 translate-y-3" : "opacity-0 -translate-y-1"
          )}
        >
          <p className="text-gray-900 font-display text-2xl sm:text-3xl tracking-wide font-medium">
            One home. One team. In sync.
          </p>
        </div>

        {/* Bottom decorative line */}
        <div
          className={cn(
            "absolute bottom-16 left-1/2 -translate-x-1/2 transition-all duration-1000",
            splashPhase === "slogan" ? "opacity-100 w-16" : "opacity-0 w-0"
          )}
        >
          <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
      </div>

      {/* Main content — fades in after splash */}
      <div
        className={cn(
          "min-h-screen flex items-center justify-center p-4 transition-all duration-500",
          showSplash ? "opacity-0 scale-98" : "opacity-100 scale-100"
        )}
      >
        <div className="w-full max-w-xl">
          {/* Header with logo */}
          <div
            className="text-center mb-10"
            style={{ animation: showSplash ? "none" : "fade-in-up 0.4s ease-out 0.1s both" }}
          >
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <p className="text-gray-500 text-lg font-display">
              How will you use HelperSync?
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Employer Card */}
            <button
              onClick={handleEmployerSelect}
              className={cn(
                "group p-8 rounded-2xl shadow-card border-2 text-left transition-all duration-200 hover:shadow-card-hover hover:border-primary bg-white",
                selectedRole === "employer" ? "border-primary" : "border-transparent"
              )}
              style={{ animation: showSplash ? "none" : "fade-in-up 0.4s ease-out 0.25s both" }}
            >
              <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-display font-semibold text-gray-900 mb-1">
                I manage a household
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Set up schedules, tasks &amp; communication
              </p>
              <div className="mt-4 flex items-center text-primary text-sm font-medium">
                Get started <ArrowRight className="ml-1 w-4 h-4" />
              </div>
            </button>

            {/* Helper Card */}
            <button
              onClick={() => setSelectedRole("helper")}
              className={cn(
                "group p-8 rounded-2xl shadow-card border-2 text-left transition-all duration-200 hover:shadow-card-hover hover:border-primary bg-white",
                selectedRole === "helper" ? "border-primary" : "border-transparent"
              )}
              style={{ animation: showSplash ? "none" : "fade-in-up 0.4s ease-out 0.4s both" }}
            >
              <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mb-4 group-hover:bg-orange-100 transition-colors">
                <User className="w-7 h-7 text-orange-500" />
              </div>
              <h2 className="text-xl font-display font-semibold text-gray-900 mb-1">
                I work in a household
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                View your daily tasks &amp; updates
              </p>
              <div className="mt-4 flex items-center text-orange-500 text-sm font-medium">
                Join household <ArrowRight className="ml-1 w-4 h-4" />
              </div>
            </button>
          </div>

          {/* Helper invite code input */}
          {selectedRole === "helper" && (
            <div className="mt-6 bg-white rounded-2xl shadow-card p-6 animate-fade-in-up">
              <h3 className="font-display font-semibold text-gray-900 mb-4">
                Enter your invite code
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Your employer should have shared a 6-character code with you.
              </p>
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
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {inviteError && (
                <p className="mt-2 text-red-500 text-sm">{inviteError}</p>
              )}
              <button
                onClick={handleHelperJoin}
                disabled={isJoining || inviteCode.replace("-", "").length < 6}
                className="mt-4 w-full py-3 bg-primary text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
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
          )}
          {/* Sign-in link for returning users */}
          {!isSignedIn && (
            <div className="text-center mt-8" style={{ animation: showSplash ? "none" : "fade-in-up 0.4s ease-out 0.6s both" }}>
              <Link
                href="/sign-in"
                className="text-sm text-gray-400 hover:text-primary transition-colors"
              >
                Already have an account? <span className="font-medium">Sign in</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
