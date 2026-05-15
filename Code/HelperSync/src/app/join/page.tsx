"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useSignUp } from "@clerk/nextjs";
import { useConvex, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import Link from "next/link";
import bcrypt from "bcryptjs";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { en } from "@/lib/i18n/en";
import { my } from "@/lib/i18n/my";
import { tl } from "@/lib/i18n/tl";
import { id } from "@/lib/i18n/id";
import { LANGUAGES, Language } from "@/lib/i18n";
import { Id } from "../../../convex/_generated/dataModel";

const dictionaries: Record<Language, Record<string, string>> = { en, my, tl, id };

type Step = "code" | "pin";

function JoinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const { signUp, setActive, isLoaded: signUpLoaded } = useSignUp();
  const convex = useConvex();
  const createSession = useMutation(api.helperSessions.createOrUpdateSession);

  const [step, setStep] = useState<Step>("code");
  const [inviteCode, setInviteCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [autoDetected, setAutoDetected] = useState(false);
  const [householdInfo, setHouseholdInfo] = useState<{
    householdId: Id<"households">;
    homeName: string;
  } | null>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const t = (key: string) => dictionaries[language][key] ?? dictionaries.en[key] ?? key;

  // Pre-fill from URL param (/join?code=ABC123)
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      const formatted = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
      setInviteCode(formatted.length > 3 ? `${formatted.slice(0, 3)}-${formatted.slice(3, 6)}` : formatted);
    }
  }, [searchParams]);

  // Auto-detect language + advance to PIN step when code is valid
  useEffect(() => {
    if (autoDetected) return;
    const rawCode = inviteCode.replace("-", "");
    if (rawCode.length !== 6) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/invite/validate?code=${rawCode.toUpperCase()}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (data.valid && data.householdId) {
          if (data.helperLanguage && ["en", "my", "tl", "id"].includes(data.helperLanguage)) {
            setLanguage(data.helperLanguage as Language);
          }
          setAutoDetected(true);
          setHouseholdInfo({ householdId: data.householdId, homeName: data.homeName ?? "" });
          setStep("pin");
          // Focus PIN input on next tick
          setTimeout(() => pinInputRef.current?.focus(), 50);
        }
      } catch {
        // Silent — user can still submit manually
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [inviteCode, autoDetected]);

  const [isValidating, setIsValidating] = useState(false);

  const handleCodeSubmit = async () => {
    const rawCode = inviteCode.replace("-", "").toUpperCase();
    if (rawCode.length !== 6) {
      setError(t("join_invalid_format"));
      return;
    }

    setIsValidating(true);
    setError("");

    try {
      const response = await fetch(`/api/invite/validate?code=${rawCode}`);
      const data = await response.json();

      if (!data.valid || !data.householdId) {
        setError(t("join_invalid_code"));
        return;
      }

      if (data.helperLanguage && ["en", "my", "tl", "id"].includes(data.helperLanguage)) {
        setLanguage(data.helperLanguage as Language);
      }
      setHouseholdInfo({ householdId: data.householdId, homeName: data.homeName ?? "" });
      setAutoDetected(true);
      setStep("pin");
      setTimeout(() => pinInputRef.current?.focus(), 50);
    } catch {
      setError(t("join_invalid_code"));
    } finally {
      setIsValidating(false);
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4) {
      setError(t("pin_invalid"));
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      const rawCode = inviteCode.replace("-", "").toUpperCase();
      const result = await convex.query(api.households.verifyHelperPin, {
        inviteCode: rawCode,
        pin,
      });

      if (!result.valid) {
        if (result.reason === "no_pin_set") {
          setError(t("pin_no_pin_set"));
        } else {
          setError(t("pin_invalid"));
        }
        return;
      }

      // PIN is correct. Now ensure we have a Clerk session.
      // If already signed in (returning helper on same device), reuse it.
      // Otherwise, silently create a fresh anonymous Clerk account.
      if (!isSignedIn) {
        if (!signUpLoaded || !signUp || !setActive) {
          setError("Sign-in not ready. Please refresh.");
          return;
        }
        const username = `helper_${nanoid(16).toLowerCase().replace(/[^a-z0-9]/g, "x")}`;
        const password = `Hs!${nanoid(20)}`; // Strong random password — never shown
        try {
          const created = await signUp.create({ username, password });
          if (created.status !== "complete") {
            setError(`Sign-up incomplete (status: ${created.status}). Check Clerk dashboard.`);
            return;
          }
          if (!created.createdSessionId) {
            setError("Sign-up succeeded but no session was created. Check Clerk dashboard.");
            return;
          }
          await setActive({ session: created.createdSessionId });
          // Wait for Convex client to pick up the new Clerk identity.
          // setActive resolves before the Convex client's auth listener fires,
          // so calling a mutation immediately after gets "Not authenticated".
          await new Promise((r) => setTimeout(r, 500));
        } catch (err) {
          const e = err as { errors?: Array<{ longMessage?: string; message?: string }> };
          const msg = e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || "Sign-up failed.";
          setError(msg);
          return;
        }
      }

      // Link this Clerk user to the household. Retry on auth-not-yet-propagated.
      const pinHash = await bcrypt.hash(pin, 10);
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await createSession({
            householdId: result.householdId,
            language,
            pinHash,
          });
          lastError = null;
          break;
        } catch (e) {
          lastError = e;
          await new Promise((r) => setTimeout(r, 400));
        }
      }
      if (lastError) {
        const msg = lastError instanceof Error ? lastError.message : "Could not link helper to household.";
        setError(msg);
        return;
      }

      toast.success(`Welcome to ${result.homeName || "HelperSync"}!`);
      router.push("/helper");
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("pin_invalid");
      setError(msg);
    } finally {
      setIsJoining(false);
    }
  };

  const goBackToCode = () => {
    setStep("code");
    setPin("");
    setError("");
    setAutoDetected(false);
    setHouseholdInfo(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex items-center gap-1 bg-white rounded-full p-1 shadow-sm border border-gray-100">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setAutoDetected(true);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                language === lang.code
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              aria-label={lang.label}
            >
              {lang.code.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">
          {step === "code" && (
            <>
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">👋</div>
                <h1 className="text-2xl font-display font-semibold text-gray-900 mb-2 leading-snug">
                  {t("join_title")}
                </h1>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t("join_subtitle")}
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
                    setInviteCode(val);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                  placeholder="ABC-123"
                  maxLength={7}
                  inputMode="text"
                  autoCapitalize="characters"
                  className="w-full px-4 py-4 rounded-2xl border border-gray-200 text-center text-3xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                />

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <button
                  onClick={handleCodeSubmit}
                  disabled={isValidating || inviteCode.replace("-", "").length < 6}
                  className="w-full py-4 bg-gray-900 text-white rounded-xl font-display font-semibold text-base hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> {t("join_joining")}
                    </>
                  ) : (
                    t("join_button")
                  )}
                </button>
              </div>

              <p className="text-center text-sm text-gray-400 mt-8">
                {t("join_employer_question")}{" "}
                <Link href="/onboarding/employer" className="text-primary font-medium hover:underline">
                  {t("join_employer_link")} →
                </Link>
              </p>
            </>
          )}

          {step === "pin" && (
            <>
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🔢</div>
                <h1 className="text-2xl font-display font-semibold text-gray-900 mb-2 leading-snug">
                  {t("pin_title")}
                </h1>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {householdInfo?.homeName
                    ? `${householdInfo.homeName} • ${t("pin_subtitle")}`
                    : t("pin_subtitle")}
                </p>
              </div>

              <div className="space-y-3">
                <input
                  ref={pinInputRef}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
                    setPin(val);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && pin.length === 4 && handlePinSubmit()}
                  placeholder="••••"
                  maxLength={4}
                  className="w-full px-4 py-4 rounded-2xl border border-gray-200 text-center text-4xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                />

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <button
                  onClick={handlePinSubmit}
                  disabled={isJoining || pin.length !== 4}
                  className="w-full py-4 bg-gray-900 text-white rounded-xl font-display font-semibold text-base hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> {t("pin_verifying")}
                    </>
                  ) : (
                    t("pin_continue")
                  )}
                </button>

                <button
                  onClick={goBackToCode}
                  disabled={isJoining}
                  className="w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition-colors"
                >
                  ← {inviteCode}
                </button>
              </div>
            </>
          )}

          {/* CAPTCHA mount point — Clerk auto-injects bot protection here */}
          <div id="clerk-captcha" className="flex justify-center mt-4" />
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
