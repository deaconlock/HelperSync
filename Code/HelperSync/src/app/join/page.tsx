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
import { en } from "@/lib/i18n/en";
import { my } from "@/lib/i18n/my";
import { tl } from "@/lib/i18n/tl";
import { id } from "@/lib/i18n/id";
import { LANGUAGES, Language } from "@/lib/i18n";

const dictionaries: Record<Language, Record<string, string>> = { en, my, tl, id };

function JoinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const createSession = useMutation(api.helperSessions.createOrUpdateSession);

  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [autoDetected, setAutoDetected] = useState(false);

  const t = (key: string) => dictionaries[language][key] ?? dictionaries.en[key] ?? key;

  // Pre-fill from URL param (/join?code=ABC123)
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      const formatted = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
      setInviteCode(formatted.length > 3 ? `${formatted.slice(0, 3)}-${formatted.slice(3, 6)}` : formatted);
    }
  }, [searchParams]);

  // Auto-detect language from household when code is valid
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
        if (data.valid && data.helperLanguage) {
          const detected = data.helperLanguage as Language;
          if (["en", "my", "tl", "id"].includes(detected)) {
            setLanguage(detected);
            setAutoDetected(true);
          }
        }
      } catch {
        // Silent — manual toggle still works
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [inviteCode, autoDetected]);

  const handleJoin = async () => {
    const rawCode = inviteCode.replace("-", "");
    if (rawCode.length !== 6) {
      setInviteError(t("join_invalid_format"));
      return;
    }

    if (!isSignedIn) {
      const code = rawCode.toUpperCase();
      router.push(`/sign-in?redirect_url=/join?code=${code}`);
      toast(t("join_signin_required"));
      return;
    }

    setIsJoining(true);
    setInviteError("");

    try {
      const code = rawCode.toUpperCase();
      const response = await fetch(`/api/invite/validate?code=${code}`);
      const data = await response.json();

      if (!data.valid || !data.householdId) {
        setInviteError(t("join_invalid_code"));
        return;
      }

      const pinHash = await bcrypt.hash("0000", 10);
      await createSession({
        householdId: data.householdId,
        language: language ?? data.helperLanguage ?? "en",
        pinHash,
      });

      toast.success("Welcome to HelperSync!");
      router.push("/helper");
    } catch {
      setInviteError(t("join_invalid_code"));
    } finally {
      setIsJoining(false);
    }
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
          {/* Icon + heading */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">👋</div>
            <h1 className="text-2xl font-display font-semibold text-gray-900 mb-2 leading-snug">
              {t("join_title")}
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              {t("join_subtitle")}
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
                  <Loader2 className="w-4 h-4 animate-spin" /> {t("join_joining")}
                </>
              ) : (
                t("join_button")
              )}
            </button>
          </div>

          {/* Employer link */}
          <p className="text-center text-sm text-gray-400 mt-8">
            {t("join_employer_question")}{" "}
            <Link href="/onboarding/employer" className="text-primary font-medium hover:underline">
              {t("join_employer_link")} →
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
