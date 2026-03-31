"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ArrowRight, Loader2, Check } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import bcrypt from "bcryptjs";
import { toast } from "sonner";

type Role = "employer" | "helper" | null;
type SplashPhase = "logo" | "slogan" | "content" | "done";

const EMPLOYER_BULLETS = [
  "I manage a live-in or part-time helper",
  "I coordinate tasks, schedules & leave",
  "I want my helper to work independently, without constant reminders",
];

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

  // Splash animation sequence
  useEffect(() => {
    const timers = [
      setTimeout(() => setSplashPhase("slogan"), 1000),
      setTimeout(() => setSplashPhase("content"), 3800),
      setTimeout(() => setSplashPhase("done"), 5000),
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

  // Resume in-progress wizard after OAuth
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
      const code = inviteCode.replace("-", "").toUpperCase();
      router.push(`/sign-in?redirect_url=/onboarding&code=${code}`);
      toast("Please sign in to join a household");
      return;
    }

    setIsJoining(true);
    setInviteError("");

    try {
      const code = inviteCode.replace("-", "").toUpperCase();
      const response = await fetch(`/api/invite/validate?code=${code}`);
      const data = await response.json();

      if (!data.valid || !data.householdId) {
        setInviteError("Invalid invite code. Please check and try again.");
        setIsJoining(false);
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
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, #0F172A 0.5px, transparent 0.5px)",
            backgroundSize: "24px 24px",
          }}
        />
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
        <div
          className={cn(
            "absolute bottom-16 left-1/2 -translate-x-1/2 transition-all duration-1000",
            splashPhase === "slogan" ? "opacity-100 w-16" : "opacity-0 w-0"
          )}
        >
          <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
      </div>

      {/* Main content */}
      <div
        className={cn(
          "min-h-screen flex flex-col items-center justify-center px-4 py-12 transition-all duration-500",
          showSplash ? "opacity-0 scale-98" : "opacity-100 scale-100"
        )}
      >
        {/* Logo + headline */}
        <div
          className="text-center mb-10"
          style={{ animation: showSplash ? "none" : "fade-in-up 0.4s ease-out 0.1s both" }}
        >
          <div className="flex justify-center mb-5">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-gray-900 mb-2">
            How will you use HelperSync?
          </h1>
          <p className="text-gray-400 text-sm">
            Choose the option that describes you best
          </p>
        </div>

        <div className="w-full max-w-2xl space-y-4">
          {/* Employer card — primary, full width, image */}
          <button
            onClick={handleEmployerSelect}
            className={cn(
              "group w-full rounded-3xl border-2 bg-white text-left transition-all duration-200 overflow-hidden",
              "shadow-card hover:shadow-card-hover hover:border-primary",
              selectedRole === "employer" ? "border-primary" : "border-transparent"
            )}
            style={{ animation: showSplash ? "none" : "fade-in-up 0.4s ease-out 0.2s both" }}
          >
            <div className="flex flex-col sm:flex-row">
              {/* Text side */}
              <div className="flex-1 p-7 sm:p-8 flex flex-col justify-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
                  Employer / Manager
                </p>
                <h2 className="text-xl sm:text-2xl font-display font-semibold text-gray-900 mb-2 leading-snug">
                  &ldquo;I want the household to run itself so I can focus on what matters&rdquo;
                </h2>
                <ul className="space-y-2 mt-4 mb-6">
                  {EMPLOYER_BULLETS.map((b: string) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <span className="mt-0.5 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 text-primary" />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 text-primary text-sm font-semibold group-hover:gap-3 transition-all duration-200">
                  Set up my household <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Illustration side */}
              <div className="relative w-full sm:w-56 h-48 sm:h-auto bg-gray-50 flex-shrink-0 overflow-hidden">
                <Image
                  src="/images/persona-employer.png"
                  alt="Household manager reviewing a schedule"
                  fill
                  className="object-contain object-center p-4"
                  priority
                />
              </div>
            </div>
          </button>

          {/* Helper card — secondary, compact */}
          <div
            style={{ animation: showSplash ? "none" : "fade-in-up 0.4s ease-out 0.35s both" }}
          >
            <button
              onClick={() => setSelectedRole(selectedRole === "helper" ? null : "helper")}
              className={cn(
                "group w-full rounded-3xl border-2 bg-white text-left transition-all duration-200 overflow-hidden",
                "shadow-card hover:shadow-card-hover",
                selectedRole === "helper" ? "border-primary" : "border-transparent hover:border-gray-200"
              )}
            >
              <div className="flex items-center gap-4 px-6 py-5">
                {/* Illustration thumbnail */}
                <div className="relative w-16 h-16 rounded-2xl bg-gray-50 flex-shrink-0 overflow-hidden">
                  <Image
                    src="/images/persona-helper.png"
                    alt="Helper joining a household"
                    fill
                    className="object-contain object-center p-1.5"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-0.5">
                    Domestic Helper
                  </p>
                  <h2 className="text-base font-display font-semibold text-gray-900">
                    &ldquo;My employer sent me an invite code&rdquo;
                  </h2>
                </div>

                <ArrowRight
                  className={cn(
                    "w-4 h-4 text-gray-400 flex-shrink-0 transition-all duration-200",
                    selectedRole === "helper" ? "rotate-90 text-primary" : "group-hover:text-gray-600"
                  )}
                />
              </div>
            </button>

            {/* Invite code panel — expands on tap */}
            {selectedRole === "helper" && (
              <div className="mt-2 bg-white rounded-3xl border border-border shadow-card p-6 animate-fade-in-up">
                <p className="text-sm font-medium text-gray-700 mb-1">Enter your invite code</p>
                <p className="text-xs text-gray-400 mb-4">
                  Your employer shared a 6-character code with you.
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
          </div>
        </div>

        {/* Sign-in link */}
        {!isSignedIn && (
          <div
            className="text-center mt-8"
            style={{ animation: showSplash ? "none" : "fade-in-up 0.4s ease-out 0.5s both" }}
          >
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
  );
}
